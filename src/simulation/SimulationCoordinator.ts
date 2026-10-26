import { CircuitEngine } from '../circuit/CircuitEngine';
import { TB6612FNGDriver, TB6612State } from '../circuit/TB6612FNGDriver';
import { N20MotorModel } from '../robot/MotorModel';
import { DifferentialDriveChassis, RobotPose } from '../robot/DifferentialDriveChassis';
import { ESP32BehavioralRuntime } from '../runtime/ESP32BehavioralRuntime';
import { ArduinoUnoBehavioralRuntime } from '../runtime/ArduinoUnoBehavioralRuntime';
import { TrackEnvironment, SensorArrayReadings, TrackType } from '../robot/TrackEnvironment';
import { ProjectDocument } from '../project/types';
import { createDefaultProject } from '../project/defaultProject';
import { MultiLayerDiagnosticSnapshot, SimulationDiagnosticsCollector } from './Diagnostics';

export class SimulationCoordinator {
  public circuit: CircuitEngine;
  public driver: TB6612FNGDriver;
  public leftMotor: N20MotorModel;
  public rightMotor: N20MotorModel;
  public chassis: DifferentialDriveChassis;
  public runtime: ESP32BehavioralRuntime | ArduinoUnoBehavioralRuntime;
  public diagnostics: SimulationDiagnosticsCollector;
  public track: TrackEnvironment;

  // Configurable physical parameters
  public motorMismatchRatio = 1.0; // 1.0 = balanced, >1.0 = left faster, <1.0 = right faster

  private isRunning = false;
  private isPaused = false;
  private lastTimeSeconds?: number;
  private onStateChangeCallbacks: Array<() => void> = [];
  private onSerialLogCallbacks: Array<(text: string) => void> = [];
  private latestSnapshot?: MultiLayerDiagnosticSnapshot;
  private latestSensorReadings?: SensorArrayReadings;

  constructor() {
    this.circuit = new CircuitEngine();
    this.driver = new TB6612FNGDriver('tb6612_1');
    this.leftMotor = new N20MotorModel();
    this.rightMotor = new N20MotorModel();
    this.chassis = new DifferentialDriveChassis();
    this.runtime = new ESP32BehavioralRuntime();
    this.diagnostics = new SimulationDiagnosticsCollector();
    this.track = new TrackEnvironment();

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

  public getActiveMcuInfo(): { id: string; isUno: boolean; voltage: number } {
    const uno = this.circuit.getAllComponents().find((c) => c.type === 'ARDUINO_UNO_R3');
    if (uno) {
      return { id: uno.id, isUno: true, voltage: 5.0 };
    }
    const esp = this.circuit.getAllComponents().find((c) => c.type === 'ESP32_DEVKIT_V1');
    return { id: esp?.id || 'esp32_1', isUno: false, voltage: 3.3 };
  }

  public mapPinToId(pinNumber: number, isUno: boolean): string {
    if (isUno) {
      if (pinNumber >= 14 && pinNumber <= 19) {
        return `A${pinNumber - 14}`;
      }
      return `D${pinNumber}`;
    }
    return `GPIO${pinNumber}`;
  }

  public loadProject(project: ProjectDocument) {
    this.stop();
    this.circuit = new CircuitEngine();
    project.components.forEach((c) => this.circuit.addComponent(c));
    project.wires.forEach((w) => this.circuit.addWire(w));

    // Choose runtime according to project board
    if (project.board === 'arduino-uno-r3') {
      this.runtime = new ArduinoUnoBehavioralRuntime();
    } else {
      this.runtime = new ESP32BehavioralRuntime();
    }

    if (project.track) {
      this.track.setTrackData(project.track);
      const start = this.track.getStartPose();
      this.chassis.reset(start);
    } else if (project.board === 'arduino-uno-r3') {
      this.track.setTrackType('closed_loop');
      const start = this.track.getStartPose();
      this.chassis.reset(start);
    }

    this.setupRuntimeBridges();
    this.notify();
  }

  public exportProject(code: string): ProjectDocument {
    const mcu = this.getActiveMcuInfo();
    return {
      schemaVersion: '1.0.0',
      name: mcu.isUno
        ? 'Line Follower Robot — Arduino Uno + 8-Channel IR + TB6612FNG'
        : 'MagicSmoke Project',
      board: mcu.isUno ? 'arduino-uno-r3' : 'esp32-devkit-v1',
      code,
      components: this.circuit.getAllComponents(),
      wires: this.circuit.getAllWires(),
      track: this.track.getTrackData(),
    };
  }

  public setupRuntimeBridges() {
    this.circuit.registerResetHandler(() => {
      this.resetMcu();
    });

    this.runtime.setEvents({
      onPinStateChange: (pin: number, state: 0 | 1) => {
        const mcu = this.getActiveMcuInfo();
        const pinId = this.mapPinToId(pin, mcu.isUno);
        this.circuit.setPinOutput(mcu.id, pinId, {
          digital: state,
          voltage: state === 1 ? mcu.voltage : 0,
        });
      },
      onPWMChange: (pin: number, dutyCycle: number, frequency: number) => {
        const mcu = this.getActiveMcuInfo();
        const pinId = this.mapPinToId(pin, mcu.isUno);
        this.circuit.setPinOutput(mcu.id, pinId, {
          digital: dutyCycle > 0 ? 1 : 0,
          dutyCycle,
          frequency,
          voltage: dutyCycle * mcu.voltage,
        });
      },
      onSerialOutput: (text: string) => {
        const mcu = this.getActiveMcuInfo();
        this.circuit.setPinOutput(mcu.id, 'D1', { digital: 1, voltage: mcu.voltage });
        setTimeout(() => {
          this.circuit.setPinOutput(mcu.id, 'D1', { digital: 0, voltage: 0 });
        }, 80);
        for (const cb of this.onSerialLogCallbacks) cb(text);
      },
    });

    (this.runtime as any).setPinInputReader((pin: number) => {
      const mcu = this.getActiveMcuInfo();
      const pinId = this.mapPinToId(pin, mcu.isUno);
      return this.circuit.readNetSignal(mcu.id, pinId).digital;
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
    this.lastTimeSeconds = undefined;
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
    this.lastTimeSeconds = undefined;
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

  public resetMcu() {
    if (this.runtime && typeof (this.runtime as any).hardwareReset === 'function') {
      (this.runtime as any).hardwareReset();
    }
    this.notify();
  }

  public reset(pose?: Partial<RobotPose>) {
    this.stop();
    this.lastTimeSeconds = undefined;
    const defaultStart = this.track.getStartPose();
    this.chassis.reset({
      x: pose?.x ?? defaultStart.x,
      y: pose?.y ?? 0,
      z: pose?.z ?? defaultStart.z,
      yawRad: pose?.yawRad ?? defaultStart.yawRad,
    });
    this.track.resetLineMemory();
    this.notify();
  }

  public setMotorMismatch(ratio: number) {
    this.motorMismatchRatio = Math.max(0.5, Math.min(2.0, ratio));
  }

  public getMotorMismatch(): number {
    return this.motorMismatchRatio;
  }

  public getRunningState(): boolean {
    return this.isRunning;
  }

  public getPausedState(): boolean {
    return this.isPaused;
  }

  public getLatestDiagnostics(): MultiLayerDiagnosticSnapshot | undefined {
    return this.latestSnapshot;
  }

  public getLatestSensorReadings(): SensorArrayReadings | undefined {
    return this.latestSensorReadings;
  }

  /**
   * Main simulation step (called in requestAnimationFrame or deterministically in tests)
   */
  public tick(currentTimeSeconds?: number): {
    driverState: TB6612State;
    leftRPM: number;
    rightRPM: number;
    pose: RobotPose;
    diagnostics: MultiLayerDiagnosticSnapshot;
    sensorReadings?: SensorArrayReadings;
  } {
    const now = currentTimeSeconds ?? performance.now() / 1000;
    const rawDt = this.lastTimeSeconds !== undefined ? now - this.lastTimeSeconds : 0.016;
    const dt = (rawDt > 0 && rawDt <= 0.1) ? rawDt : (rawDt > 0.1 ? 0.1 : 0.016);
    this.lastTimeSeconds = now;

    // 0. Propagate Optical Sensors into Circuit Nets before firmware step
    let sensorReadings: SensorArrayReadings | undefined;
    const irSensorComp = this.circuit.getAllComponents().find((c) => c.type === 'IR_SENSOR_ARRAY_8CH');
    if (irSensorComp) {
      sensorReadings = this.track.evaluateSensors(this.chassis.getPose());
      this.latestSensorReadings = sensorReadings;

      // Update IR Sensor Array component output pins in the circuit netlist
      for (let i = 0; i < 8; i++) {
        const pinId = `D${i + 1}`;
        const digVal = sensorReadings.digitalChannels[i];
        this.circuit.setPinOutput(irSensorComp.id, pinId, {
          digital: digVal,
          voltage: digVal * 5.0,
        });
      }
    }

    // 1. Step Firmware Execution
    if (this.isRunning && !this.isPaused) {
      this.runtime.step(dt);
    }

    // 2. Evaluate TB6612 Driver based on physical circuit nets
    const driverState = this.driver.evaluate(this.circuit);

    // 3. Update Motor models (only rotate if not paused, apply optional mismatch)
    const effectiveTargetA = this.isPaused ? 0 : driverState.channelA.targetRPM * this.motorMismatchRatio;
    const effectiveTargetB = this.isPaused ? 0 : driverState.channelB.targetRPM;

    const leftRes = this.leftMotor.update(effectiveTargetA, dt, driverState.channelA.diagnostic);
    const rightRes = this.rightMotor.update(effectiveTargetB, dt, driverState.channelB.diagnostic);

    // 4. Update Robot Kinematics
    const pose = this.chassis.update(leftRes.linearVelocity, rightRes.linearVelocity, dt);

    // 5. Capture multi-layer diagnostic snapshot
    const snapshot = this.diagnostics.captureSnapshot(
      this.runtime,
      this.circuit,
      this.driver,
      driverState,
      this.leftMotor,
      this.rightMotor,
      this.chassis
    );
    this.latestSnapshot = snapshot;

    return {
      driverState,
      leftRPM: leftRes.currentRPM,
      rightRPM: rightRes.currentRPM,
      pose,
      diagnostics: snapshot,
      sensorReadings,
    };
  }
}
