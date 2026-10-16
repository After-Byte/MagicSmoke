import { CircuitEngine } from '../circuit/CircuitEngine';
import { TB6612FNGDriver, TB6612State } from '../circuit/TB6612FNGDriver';
import { N20MotorModel } from '../robot/MotorModel';
import { DifferentialDriveChassis, RobotPose } from '../robot/DifferentialDriveChassis';
import { FirmwareRuntime } from '../runtime/FirmwareRuntime';
import { ESP32BehavioralRuntime } from '../runtime/ESP32BehavioralRuntime';
import { WireConnection } from '../circuit/types';
import { ProjectDocument, validateProjectDocument } from '../project/types';
import { createDefaultProject } from '../project/defaultProject';

export class SimulationCoordinator {
  public circuit: CircuitEngine;
  public driver: TB6612FNGDriver;
  public leftMotor: N20MotorModel;
  public rightMotor: N20MotorModel;
  public chassis: DifferentialDriveChassis;
  public runtime: FirmwareRuntime;

  private isRunning = false;
  private isPaused = false;
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

    this.loadProject(createDefaultProject());
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

  public loadProject(project: ProjectDocument) {
    this.stop();
    this.circuit = new CircuitEngine();
    project.components.forEach((c) => this.circuit.addComponent(c));
    project.wires.forEach((w) => this.circuit.addWire(w));
    this.notify();
  }

  public exportProject(code: string): ProjectDocument {
    return {
      schemaVersion: '1.0.0',
      name: 'MagicSmoke Project',
      board: 'esp32-devkit-v1',
      code,
      components: this.circuit.getAllComponents(),
      wires: this.circuit.getAllWires(),
    };
  }

  private setupRuntimeBridges() {
    this.runtime.setEvents({
      onPinStateChange: (pin: number, state: 0 | 1) => {
        // Dynamically resolve pin ID on ESP32
        const pinId = `GPIO${pin}`;
        this.circuit.setPinOutput('esp32_1', pinId, {
          digital: state,
          voltage: state === 1 ? 3.3 : 0,
        });
      },
      onPWMChange: (pin: number, dutyCycle: number, frequency: number) => {
        const pinId = `GPIO${pin}`;
        this.circuit.setPinOutput('esp32_1', pinId, {
          digital: dutyCycle > 0 ? 1 : 0,
          dutyCycle,
          frequency,
          voltage: dutyCycle * 3.3,
        });
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
    this.isPaused = false;
    this.lastTimeSeconds = performance.now() / 1000;
    this.runtime.start();
    this.notify();
  }

  public pause() {
    this.isPaused = true;
    this.runtime.pause();
    this.notify();
  }

  public resume() {
    this.isPaused = false;
    this.lastTimeSeconds = performance.now() / 1000;
    this.runtime.resume();
    this.notify();
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
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

  public getPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Main simulation step (called in requestAnimationFrame)
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

    if (this.isRunning && !this.isPaused) {
      this.runtime.step(dt);
    }

    // 1. Evaluate Driver based on physical circuit nets
    const driverState = this.driver.evaluate(this.circuit);

    // 2. Update Motor models (only rotate if not paused)
    const effectiveTargetA = this.isPaused ? 0 : driverState.channelA.targetRPM;
    const effectiveTargetB = this.isPaused ? 0 : driverState.channelB.targetRPM;

    const leftRes = this.leftMotor.update(effectiveTargetA, dt);
    const rightRes = this.rightMotor.update(effectiveTargetB, dt);

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
