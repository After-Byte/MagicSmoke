import { CircuitEngine } from '../circuit/CircuitEngine';
import { TB6612FNGDriver, TB6612State } from '../circuit/TB6612FNGDriver';
import { N20MotorModel } from '../robot/MotorModel';
import { DifferentialDriveChassis, RobotPose } from '../robot/DifferentialDriveChassis';
import { ESP32BehavioralRuntime } from '../runtime/ESP32BehavioralRuntime';

export interface MultiLayerDiagnosticSnapshot {
  timestampMs: number;
  virtualTimeMs: number;
  tickNumber: number;

  firmware: {
    running: boolean;
    paused: boolean;
    gpioStates: Record<number, { mode: string; digital: 0 | 1; dutyFraction: number; frequency: number; resolutionBits: number }>;
    recentErrors: string[];
  };

  circuit: {
    hasCommonGround: boolean;
    logicPowered: boolean;
    motorPowered: boolean;
    motorAConnected: boolean;
    motorBConnected: boolean;
    controlNets: Record<string, { digital: 0 | 1; dutyCycle: number; voltage: number }>;
    warnings: string[];
  };

  driver: {
    standby: boolean;
    hasLogicPower: boolean;
    hasMotorPower: boolean;
    diagnostic: string;
    channelA: {
      mode: string;
      speedFraction: number;
      targetRPM: number;
      terminalVoltage: number;
      diagnostic: string;
    };
    channelB: {
      mode: string;
      speedFraction: number;
      targetRPM: number;
      terminalVoltage: number;
      diagnostic: string;
    };
  };

  motors: {
    left: {
      targetRPM: number;
      currentRPM: number;
      linearVelocity: number;
      angleRad: number;
      stopReason?: string;
    };
    right: {
      targetRPM: number;
      currentRPM: number;
      linearVelocity: number;
      angleRad: number;
      stopReason?: string;
    };
  };

  chassis: {
    vLeft: number;
    vRight: number;
    linearVelocity: number;
    headingRad: number;
    headingDeg: number;
    pose: RobotPose;
  };
}

export class SimulationDiagnosticsCollector {
  private tickCount = 0;

  public captureSnapshot(
    runtime: ESP32BehavioralRuntime,
    circuit: CircuitEngine,
    driver: TB6612FNGDriver,
    driverState: TB6612State,
    leftMotor: N20MotorModel,
    rightMotor: N20MotorModel,
    chassis: DifferentialDriveChassis
  ): MultiLayerDiagnosticSnapshot {
    this.tickCount++;
    const circuitEval = circuit.evaluateCircuit();

    // Sample key control nets connected to driver
    const sampledNets: Record<string, { digital: 0 | 1; dutyCycle: number; voltage: number }> = {};
    const driverPins = ['STBY', 'PWMA', 'AIN1', 'AIN2', 'PWMB', 'BIN1', 'BIN2', 'VCC', 'VM', 'GND'];
    for (const p of driverPins) {
      sampledNets[p] = circuit.readNetSignal('tb6612_1', p);
    }

    const pose = chassis.getPose();
    const wheelRadius = 0.032;
    const vLeft = ((leftMotor.getRPM() * 2 * Math.PI) / 60) * wheelRadius;
    const vRight = ((rightMotor.getRPM() * 2 * Math.PI) / 60) * wheelRadius;
    const vChassis = (vLeft + vRight) / 2.0;

    const ao1Connected = circuit.getConnectedPins('tb6612_1', 'AO1');
    const ao2Connected = circuit.getConnectedPins('tb6612_1', 'AO2');
    const motorAConnected = ao1Connected.some(p => p.compId === 'motor_left') && ao2Connected.some(p => p.compId === 'motor_left');

    const bo1Connected = circuit.getConnectedPins('tb6612_1', 'BO1');
    const bo2Connected = circuit.getConnectedPins('tb6612_1', 'BO2');
    const motorBConnected = bo1Connected.some(p => p.compId === 'motor_right') && bo2Connected.some(p => p.compId === 'motor_right');

    return {
      timestampMs: performance.now(),
      virtualTimeMs: runtime.getVirtualTimeMs(),
      tickNumber: this.tickCount,

      firmware: {
        running: runtime.isRunning(),
        paused: runtime.isPaused(),
        gpioStates: runtime.getAllPinStates(),
        recentErrors: runtime.getDiagnosticLogs(),
      },

      circuit: {
        hasCommonGround: circuitEval.hasCommonGround,
        logicPowered: circuitEval.logicPowered,
        motorPowered: circuitEval.motorPowered,
        motorAConnected,
        motorBConnected,
        controlNets: sampledNets,
        warnings: circuitEval.circuitWarnings,
      },

      driver: {
        standby: driverState.standby,
        hasLogicPower: driverState.hasLogicPower,
        hasMotorPower: driverState.hasMotorPower,
        diagnostic: driverState.diagnostic,
        channelA: {
          mode: driverState.channelA.mode,
          speedFraction: driverState.channelA.speedFraction,
          targetRPM: driverState.channelA.targetRPM,
          terminalVoltage: driverState.channelA.terminalVoltage,
          diagnostic: driverState.channelA.diagnostic,
        },
        channelB: {
          mode: driverState.channelB.mode,
          speedFraction: driverState.channelB.speedFraction,
          targetRPM: driverState.channelB.targetRPM,
          terminalVoltage: driverState.channelB.terminalVoltage,
          diagnostic: driverState.channelB.diagnostic,
        },
      },

      motors: {
        left: {
          targetRPM: leftMotor.getTargetRPM(),
          currentRPM: leftMotor.getRPM(),
          linearVelocity: vLeft,
          angleRad: leftMotor.getAngle(),
          stopReason: leftMotor.getStopReason(),
        },
        right: {
          targetRPM: rightMotor.getTargetRPM(),
          currentRPM: rightMotor.getRPM(),
          linearVelocity: vRight,
          angleRad: rightMotor.getAngle(),
          stopReason: rightMotor.getStopReason(),
        },
      },

      chassis: {
        vLeft,
        vRight,
        linearVelocity: vChassis,
        headingRad: pose.yawRad,
        headingDeg: (pose.yawRad * 180) / Math.PI,
        pose,
      },
    };
  }
}
