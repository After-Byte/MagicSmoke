import { CircuitEngine } from '../circuit/CircuitEngine';
import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../circuit/components';
import { TB6612FNGDriver, TB6612State } from '../circuit/TB6612FNGDriver';
import { N20MotorModel } from '../robot/MotorModel';
import { DifferentialDriveChassis, RobotPose } from '../robot/DifferentialDriveChassis';
import { FirmwareRuntime } from '../runtime/FirmwareRuntime';
import { ESP32BehavioralRuntime } from '../runtime/ESP32BehavioralRuntime';
import { WireConnection } from '../circuit/types';

export interface ProjectState {
  code: string;
  wires: WireConnection[];
}

export class SimulationCoordinator {
  public circuit: CircuitEngine;
  public driver: TB6612FNGDriver;
  public leftMotor: N20MotorModel;
  public rightMotor: N20MotorModel;
  public chassis: DifferentialDriveChassis;
  public runtime: FirmwareRuntime;

  private isRunning = false;
  private lastTimeSeconds = 0;
  private onStateChangeCallbacks: Array<() => void> = [];
  private onSerialLogCallbacks: Array<(text: string) => void> = [];

  constructor() {
    this.circuit = new CircuitEngine();
    this.driver = new TB6612FNGDriver('tb6612_1');
    this.leftMotor = new N20MotorModel();
    this.rightMotor = new N20MotorModel();
    this.chassis = new DifferentialDriveChassis();
    this.runtime = new ESP32BehavioralRuntime();

    this.setupDefaultHardware();
    this.setupRuntimeBridges();
  }

  public subscribe(cb: () => void) {
    this.onStateChangeCallbacks.push(cb);
  }

  public onSerial(cb: (t: string) => void) {
    this.onSerialLogCallbacks.push(cb);
  }

  private notify() {
    for (const cb of this.onStateChangeCallbacks) cb();
  }

  public setupDefaultHardware() {
    this.circuit = new CircuitEngine();
    this.circuit.addComponent(createESP32DevKit('esp32_1', { x: 40, y: 80 }));
    this.circuit.addComponent(createTB6612FNG('tb6612_1', { x: 300, y: 80 }));
    this.circuit.addComponent(createBatteryPack('batt_1', { x: 300, y: 10 }));
    this.circuit.addComponent(createN20Motor('motor_left', 'Left N20 Motor', { x: 560, y: 40 }));
    this.circuit.addComponent(createN20Motor('motor_right', 'Right N20 Motor', { x: 560, y: 160 }));

    // Connect standard default wires:
    const defaultWires: WireConnection[] = [
      // Common grounds
      { id: 'w_gnd_esp', fromComponentId: 'esp32_1', fromPinId: 'GND', toComponentId: 'tb6612_1', toPinId: 'GND', color: '#64748b' },
      { id: 'w_gnd_batt', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'tb6612_1', toPinId: 'GND', color: '#64748b' },

      // Power rails
      { id: 'w_vcc', fromComponentId: 'esp32_1', fromPinId: '3V3', toComponentId: 'tb6612_1', toPinId: 'VCC', color: '#06b6d4' },
      { id: 'w_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM', color: '#f59e0b' },

      // Control signals
      { id: 'w_stby', fromComponentId: 'esp32_1', fromPinId: 'GPIO23', toComponentId: 'tb6612_1', toPinId: 'STBY', color: '#10b981' },
      { id: 'w_pwma', fromComponentId: 'esp32_1', fromPinId: 'GPIO25', toComponentId: 'tb6612_1', toPinId: 'PWMA', color: '#a855f7' },
      { id: 'w_ain1', fromComponentId: 'esp32_1', fromPinId: 'GPIO26', toComponentId: 'tb6612_1', toPinId: 'AIN1', color: '#3b82f6' },
      { id: 'w_ain2', fromComponentId: 'esp32_1', fromPinId: 'GPIO27', toComponentId: 'tb6612_1', toPinId: 'AIN2', color: '#3b82f6' },
      { id: 'w_pwmb', fromComponentId: 'esp32_1', fromPinId: 'GPIO14', toComponentId: 'tb6612_1', toPinId: 'PWMB', color: '#a855f7' },
      { id: 'w_bin1', fromComponentId: 'esp32_1', fromPinId: 'GPIO18', toComponentId: 'tb6612_1', toPinId: 'BIN1', color: '#3b82f6' },
      { id: 'w_bin2', fromComponentId: 'esp32_1', fromPinId: 'GPIO19', toComponentId: 'tb6612_1', toPinId: 'BIN2', color: '#3b82f6' },

      // Motor leads
      { id: 'w_ao1', fromComponentId: 'tb6612_1', fromPinId: 'AO1', toComponentId: 'motor_left', toPinId: 'M_POS', color: '#ef4444' },
      { id: 'w_ao2', fromComponentId: 'tb6612_1', fromPinId: 'AO2', toComponentId: 'motor_left', toPinId: 'M_NEG', color: '#1e293b' },
      { id: 'w_bo1', fromComponentId: 'tb6612_1', fromPinId: 'BO1', toComponentId: 'motor_right', toPinId: 'M_POS', color: '#ef4444' },
      { id: 'w_bo2', fromComponentId: 'tb6612_1', fromPinId: 'BO2', toComponentId: 'motor_right', toPinId: 'M_NEG', color: '#1e293b' },
    ];

    defaultWires.forEach((w) => this.circuit.addWire(w));
  }

  private setupRuntimeBridges() {
    this.runtime.setEvents({
      onPinStateChange: (pin: number, state: 0 | 1) => {
        // Map numeric pin to ESP32 component pin ID
        const pinMap: Record<number, string> = {
          23: 'GPIO23',
          25: 'GPIO25',
          26: 'GPIO26',
          27: 'GPIO27',
          14: 'GPIO14',
          18: 'GPIO18',
          19: 'GPIO19',
        };
        const pinId = pinMap[pin];
        if (pinId) {
          this.circuit.setPinOutput('esp32_1', pinId, { digital: state, voltage: state === 1 ? 3.3 : 0 });
        }
      },
      onPWMChange: (pin: number, dutyCycle: number, frequency: number) => {
        const pinMap: Record<number, string> = {
          25: 'GPIO25',
          14: 'GPIO14',
        };
        const pinId = pinMap[pin];
        if (pinId) {
          this.circuit.setPinOutput('esp32_1', pinId, {
            digital: dutyCycle > 0 ? 1 : 0,
            dutyCycle,
            frequency,
            voltage: dutyCycle * 3.3,
          });
        }
      },
      onSerialOutput: (text: string) => {
        for (const cb of this.onSerialLogCallbacks) cb(text);
      },
    });
  }

  public async compileAndRun(sketch: string): Promise<{ success: boolean; errors?: string[] }> {
    this.stop();
    const result = await this.runtime.compile(sketch);
    if (result.success) {
      this.start();
    }
    return result;
  }

  public start() {
    this.isRunning = true;
    this.lastTimeSeconds = performance.now() / 1000;
    this.runtime.start();
    this.notify();
  }

  public stop() {
    this.isRunning = false;
    this.runtime.stop();
    this.leftMotor.reset();
    this.rightMotor.reset();
    this.notify();
  }

  public reset() {
    this.stop();
    this.chassis.reset();
    this.notify();
  }

  public getRunningState(): boolean {
    return this.isRunning;
  }

  /**
   * Main simulation tick (e.g. called in requestAnimationFrame)
   */
  public tick(currentTimeSeconds?: number): {
    driverState: TB6612State;
    leftRPM: number;
    rightRPM: number;
    pose: RobotPose;
  } {
    const now = currentTimeSeconds ?? performance.now() / 1000;
    const dt = Math.min(0.1, this.lastTimeSeconds ? now - this.lastTimeSeconds : 0.016);
    this.lastTimeSeconds = now;

    if (this.isRunning) {
      this.runtime.step(dt);
    }

    // 1. Evaluate Driver based on circuit
    const driverState = this.driver.evaluate(this.circuit);

    // 2. Update Motor models
    const leftRes = this.leftMotor.update(driverState.channelA.targetRPM, dt);
    const rightRes = this.rightMotor.update(driverState.channelB.targetRPM, dt);

    // 3. Update Robot Kinematics
    const pose = this.chassis.update(leftRes.linearVelocity, rightRes.linearVelocity, dt);

    return {
      driverState,
      leftRPM: leftRes.currentRPM,
      rightRPM: rightRes.currentRPM,
      pose,
    };
  }
}
