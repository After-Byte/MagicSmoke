import { CircuitEngine } from './CircuitEngine';

export enum MotorMode {
  STANDBY = 'STANDBY',
  SHORT_BRAKE = 'SHORT_BRAKE',
  FORWARD_CW = 'FORWARD_CW',
  REVERSE_CCW = 'REVERSE_CCW',
  STOP_COAST = 'STOP_COAST',
  UNPOWERED = 'UNPOWERED',
}

export interface TB6612ChannelState {
  mode: MotorMode;
  speedFraction: number; // -1.0 to 1.0 (negative for reverse)
  targetRPM: number;
  terminalVoltage: number;
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

    // Check Logic Power and Common Ground
    if (!circuitStatus.logicPowered) {
      return this.unpoweredState('Logic VCC unpowered');
    }
    if (!circuitStatus.hasCommonGround) {
      return this.unpoweredState('Common Ground missing or broken');
    }

    // Read STBY pin state from connected net
    const stbySignal = circuit.readNetSignal(this.componentId, 'STBY');
    const isStandbyActive = stbySignal.digital === 1;

    if (!isStandbyActive) {
      return {
        standby: true,
        channelA: { mode: MotorMode.STANDBY, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
        channelB: { mode: MotorMode.STANDBY, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
        hasLogicPower: circuitStatus.logicPowered,
        hasMotorPower: circuitStatus.motorPowered,
        diagnostic: 'STBY pin is LOW or disconnected: outputs high-impedance.',
      };
    }

    // Check Motor Supply (VM)
    if (!circuitStatus.motorPowered) {
      return {
        standby: false,
        channelA: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
        channelB: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
        hasLogicPower: true,
        hasMotorPower: false,
        diagnostic: 'VM power supply absent: motor outputs receive 0V.',
      };
    }

    // Evaluate Channel A (Left)
    const in1A = circuit.readNetSignal(this.componentId, 'AIN1').digital === 1;
    const in2A = circuit.readNetSignal(this.componentId, 'AIN2').digital === 1;
    const pwmA = circuit.readNetSignal(this.componentId, 'PWMA').dutyCycle;
    const channelA = this.evaluateChannel(in1A, in2A, pwmA);

    // Evaluate Channel B (Right)
    const in1B = circuit.readNetSignal(this.componentId, 'BIN1').digital === 1;
    const in2B = circuit.readNetSignal(this.componentId, 'BIN2').digital === 1;
    const pwmB = circuit.readNetSignal(this.componentId, 'PWMB').dutyCycle;
    const channelB = this.evaluateChannel(in1B, in2B, pwmB);

    return {
      standby: false,
      channelA,
      channelB,
      hasLogicPower: true,
      hasMotorPower: true,
      diagnostic: 'Operating nominally.',
    };
  }

  private evaluateChannel(in1: boolean, in2: boolean, dutyCycle: number): TB6612ChannelState {
    const clampedDuty = Math.max(0, Math.min(1, dutyCycle));

    if (in1 && !in2) {
      // Forward (CW)
      const speedFraction = clampedDuty;
      return {
        mode: MotorMode.FORWARD_CW,
        speedFraction,
        targetRPM: speedFraction * this.maxRPM,
        terminalVoltage: speedFraction * this.nominalVoltage,
      };
    } else if (!in1 && in2) {
      // Reverse (CCW)
      const speedFraction = -clampedDuty;
      return {
        mode: MotorMode.REVERSE_CCW,
        speedFraction,
        targetRPM: speedFraction * this.maxRPM,
        terminalVoltage: speedFraction * this.nominalVoltage,
      };
    } else if (in1 && in2) {
      // Short brake: active low-side braking via back-EMF
      return {
        mode: MotorMode.SHORT_BRAKE,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
      };
    } else {
      // Both LOW: Stop / Coast
      return {
        mode: MotorMode.STOP_COAST,
        speedFraction: 0,
        targetRPM: 0,
        terminalVoltage: 0,
      };
    }
  }

  private unpoweredState(diag: string): TB6612State {
    return {
      standby: true,
      channelA: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
      channelB: { mode: MotorMode.UNPOWERED, speedFraction: 0, targetRPM: 0, terminalVoltage: 0 },
      hasLogicPower: false,
      hasMotorPower: false,
      diagnostic: diag,
    };
  }
}
