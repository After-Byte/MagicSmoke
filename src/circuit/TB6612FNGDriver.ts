import { CircuitEngine } from './CircuitEngine';

export enum MotorMode {
  STANDBY = 'STANDBY',
  SHORT_BRAKE = 'SHORT_BRAKE',
  FORWARD_CW = 'FORWARD_CW',
  REVERSE_CCW = 'REVERSE_CCW',
  STOP_COAST = 'STOP_COAST',
  UNPOWERED = 'UNPOWERED',
  DISCONNECTED = 'DISCONNECTED',
}

export interface TB6612ChannelState {
  mode: MotorMode;
  speedFraction: number; // -1.0 to 1.0 (negative for reverse)
  targetRPM: number;
  terminalVoltage: number;
  diagnostic: string;
}

export interface TB6612State {
  standby: boolean;
  channelA: TB6612ChannelState;
  channelB: TB6612ChannelState;
  hasLogicPower: boolean;
  hasMotorPower: boolean;
  diagnostic: string;
}

export class TB6612FNGDriver {
  private componentId: string;
  private maxRPM: number;
  private nominalVoltage: number;

  constructor(componentId = 'tb6612_1', maxRPM = 300, nominalVoltage = 7.4) {
    this.componentId = componentId;
    this.maxRPM = maxRPM;
    this.nominalVoltage = nominalVoltage;
  }

  /**
   * Evaluate the physical driver state based on the actual circuit nets
   */
  public evaluate(circuit: CircuitEngine): TB6612State {
    const circuitStatus = circuit.evaluateCircuit();

    // 1. Check Logic Power and Common Ground
    if (!circuitStatus.logicPowered) {
      return this.unpoweredState('Logic VCC unpowered (connect ESP32 3.3V to TB6612 VCC).');
    }
    if (!circuitStatus.hasCommonGround) {
      return this.unpoweredState('Common Ground missing or broken (connect ESP32 GND and Battery NEG to TB6612 GND).');
    }

    // 2. Read STBY pin state from connected net
    const stbySignal = circuit.readNetSignal(this.componentId, 'STBY');
    const isStandbyActive = stbySignal.digital === 1;

    if (!isStandbyActive) {
      const standbyDiag = 'STBY pin is LOW or disconnected: driver outputs in high-impedance standby.';
      return {
        standby: true,
        channelA: { mode: MotorMode.STANDBY, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: standbyDiag },
        channelB: { mode: MotorMode.STANDBY, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: standbyDiag },
        hasLogicPower: circuitStatus.logicPowered,
        hasMotorPower: circuitStatus.motorPowered,
        diagnostic: standbyDiag,
      };
    }

    // 3. Check Motor Supply (VM)
    if (!circuitStatus.motorPowered) {
      const vmDiag = 'VM power supply absent: motor outputs receive 0V (connect Battery POS to TB6612 VM).';
      return {
        standby: false,
        channelA: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: vmDiag },
        channelB: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: vmDiag },
        hasLogicPower: true,
        hasMotorPower: false,
        diagnostic: vmDiag,
      };
    }

    // 4. Check Motor Lead Connectivity (AO1/AO2 -> motor_left, BO1/BO2 -> motor_right)
    const ao1Connected = circuit.getConnectedPins(this.componentId, 'AO1');
    const ao2Connected = circuit.getConnectedPins(this.componentId, 'AO2');
    const motorAConnected = ao1Connected.some(p => p.compId === 'motor_left') && ao2Connected.some(p => p.compId === 'motor_left');

    const bo1Connected = circuit.getConnectedPins(this.componentId, 'BO1');
    const bo2Connected = circuit.getConnectedPins(this.componentId, 'BO2');
    const motorBConnected = bo1Connected.some(p => p.compId === 'motor_right') && bo2Connected.some(p => p.compId === 'motor_right');

    // 5. Evaluate Channel A (Left)
    let channelA: TB6612ChannelState;
    if (!motorAConnected) {
      channelA = {
        mode: MotorMode.DISCONNECTED,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
        diagnostic: 'Left motor leads (AO1/AO2) disconnected or incomplete.',
      };
    } else {
      const in1A = circuit.readNetSignal(this.componentId, 'AIN1').digital === 1;
      const in2A = circuit.readNetSignal(this.componentId, 'AIN2').digital === 1;
      const pwmA = circuit.readNetSignal(this.componentId, 'PWMA').dutyCycle;
      channelA = this.evaluateChannel(in1A, in2A, pwmA);
    }

    // 6. Evaluate Channel B (Right)
    let channelB: TB6612ChannelState;
    if (!motorBConnected) {
      channelB = {
        mode: MotorMode.DISCONNECTED,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
        diagnostic: 'Right motor leads (BO1/BO2) disconnected or incomplete.',
      };
    } else {
      const in1B = circuit.readNetSignal(this.componentId, 'BIN1').digital === 1;
      const in2B = circuit.readNetSignal(this.componentId, 'BIN2').digital === 1;
      const pwmB = circuit.readNetSignal(this.componentId, 'PWMB').dutyCycle;
      channelB = this.evaluateChannel(in1B, in2B, pwmB);
    }

    let overallDiag = 'Operating nominally.';
    if (channelA.mode === MotorMode.DISCONNECTED || channelB.mode === MotorMode.DISCONNECTED) {
      overallDiag = 'One or more motor output circuits are disconnected.';
    }

    return {
      standby: false,
      channelA,
      channelB,
      hasLogicPower: true,
      hasMotorPower: true,
      diagnostic: overallDiag,
    };
  }

  private evaluateChannel(in1: boolean, in2: boolean, dutyCycle: number): TB6612ChannelState {
    const clampedDuty = Math.max(0, Math.min(1, dutyCycle));

    if (in1 && !in2) {
      // Forward (CW)
      if (clampedDuty === 0) {
        return {
          mode: MotorMode.STOP_COAST,
          speedFraction: 0,
          targetRPM: 0,
          terminalVoltage: 0,
          diagnostic: 'Direction IN1=HIGH, IN2=LOW but PWM duty is 0% (coasting).',
        };
      }
      const speedFraction = clampedDuty;
      return {
        mode: MotorMode.FORWARD_CW,
        speedFraction,
        targetRPM: speedFraction * this.maxRPM,
        terminalVoltage: speedFraction * this.nominalVoltage,
        diagnostic: `Forward active drive (${Math.round(clampedDuty * 100)}% PWM duty).`,
      };
    } else if (!in1 && in2) {
      // Reverse (CCW)
      if (clampedDuty === 0) {
        return {
          mode: MotorMode.STOP_COAST,
          speedFraction: 0,
          targetRPM: 0,
          terminalVoltage: 0,
          diagnostic: 'Direction IN1=LOW, IN2=HIGH but PWM duty is 0% (coasting).',
        };
      }
      const speedFraction = -clampedDuty;
      return {
        mode: MotorMode.REVERSE_CCW,
        speedFraction,
        targetRPM: speedFraction * this.maxRPM,
        terminalVoltage: speedFraction * this.nominalVoltage,
        diagnostic: `Reverse active drive (${Math.round(clampedDuty * 100)}% PWM duty).`,
      };
    } else if (in1 && in2) {
      // Short brake: active low-side braking via back-EMF
      return {
        mode: MotorMode.SHORT_BRAKE,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
        diagnostic: 'Braking: IN1=HIGH and IN2=HIGH shorts motor terminals.',
      };
    } else {
      // Both LOW: Stop / Coast
      return {
        mode: MotorMode.STOP_COAST,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
        diagnostic: 'Coasting: IN1=LOW and IN2=LOW puts H-bridge in high-Z.',
      };
    }
  }

  private unpoweredState(diag: string): TB6612State {
    return {
      standby: true,
      channelA: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: diag },
      channelB: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0, diagnostic: diag },
      hasLogicPower: false,
      hasMotorPower: false,
      diagnostic: diag,
    };
  }
}
