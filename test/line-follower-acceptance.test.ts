import { describe, it, expect } from 'vitest';
import { SimulationCoordinator } from '../src/simulation/SimulationCoordinator';
import { createLineFollowerProject, LINE_FOLLOWER_SKETCH } from '../src/project/lineFollowerProject';
import { MotorMode } from '../src/circuit/TB6612FNGDriver';

describe('Line Follower Lab: End-to-End Robotics Acceptance Scenarios (PHASE 10)', () => {
  it('Scenario 1: Follows straight track autonomously via closed-loop sensor-to-motor feedback', async () => {
    const coordinator = new SimulationCoordinator();
    const project = createLineFollowerProject();
    coordinator.loadProject(project);

    coordinator.track.setTrackType('straight');
    coordinator.chassis.reset({ x: 0, y: 0, z: 0, yawRad: 0 });

    const compRes = await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);
    if (!compRes.success) {
      console.log('COMPILER ERRORS:', compRes.errors);
    }
    expect(compRes.success).toBe(true);

    // Initial step at t=0
    let sim = coordinator.tick(0.01);
    expect(sim.sensorReadings).toBeDefined();
    expect(sim.sensorReadings?.lineLost).toBe(false);

    // Step forward 1.0 second in discrete 10ms steps (100 steps)
    for (let t = 0.02; t <= 1.0; t += 0.01) {
      sim = coordinator.tick(t);
    }

    // Robot should have moved forward down the track (positive Z)
    expect(sim.pose.z).toBeGreaterThan(0.15); // traveled forward
    // Robot should remain closely centered on straight track (|x| < 15mm)
    expect(Math.abs(sim.pose.x)).toBeLessThan(0.015);
    // Motors should be actively rotating forward
    expect(sim.leftRPM).toBeGreaterThan(100);
    expect(sim.rightRPM).toBeGreaterThan(100);
    expect(sim.driverState.channelA.mode).toBe(MotorMode.FORWARD_CW);
    expect(sim.driverState.channelB.mode).toBe(MotorMode.FORWARD_CW);
  });

  it('Scenario 2: Senses rightward displacement and steers back towards center', async () => {
    const coordinator = new SimulationCoordinator();
    coordinator.loadProject(createLineFollowerProject());
    coordinator.track.setTrackType('straight');

    // Robot starts offset 15mm to the right of the centerline
    coordinator.chassis.reset({ x: 0.015, y: 0, z: 0.1, yawRad: 0 });

    await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);

    // Initial tick
    let sim = coordinator.tick(0.01);
    expect(sim.sensorReadings?.linePositionEstimateMeters).toBeLessThan(0); // line is to the left of robot center

    let peakDiffObserved = false;
    // Step 0.5s: Controller must command right motor faster than left motor (to turn left)
    for (let t = 0.02; t <= 0.5; t += 0.01) {
      sim = coordinator.tick(t);
      if (sim.rightRPM > sim.leftRPM + 10) {
        peakDiffObserved = true;
      }
    }

    // Right wheel speed must have exceeded left wheel speed to correct leftward towards line
    expect(peakDiffObserved).toBe(true);
    // Robot position must have corrected back towards centerline
    expect(Math.abs(sim.pose.x)).toBeLessThan(0.010);
  });

  it('Scenario 3: Senses leftward displacement and steers back towards center', async () => {
    const coordinator = new SimulationCoordinator();
    coordinator.loadProject(createLineFollowerProject());
    coordinator.track.setTrackType('straight');

    // Robot starts offset 15mm to the left of the centerline
    coordinator.chassis.reset({ x: -0.015, y: 0, z: 0.1, yawRad: 0 });

    await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);

    // Initial tick
    let sim = coordinator.tick(0.01);
    expect(sim.sensorReadings?.linePositionEstimateMeters).toBeGreaterThan(0); // line is to the right of robot center

    let peakDiffObserved = false;
    // Step 0.5s: Controller must command left motor faster than right motor (to turn right)
    for (let t = 0.02; t <= 0.5; t += 0.01) {
      sim = coordinator.tick(t);
      if (sim.leftRPM > sim.rightRPM + 10) {
        peakDiffObserved = true;
      }
    }

    // Left wheel speed must have exceeded right wheel speed to correct rightward towards line
    expect(peakDiffObserved).toBe(true);
    // Robot position must have corrected back towards centerline
    expect(Math.abs(sim.pose.x)).toBeLessThan(0.010);
  });

  it('Scenario 4: Disconnecting a sensor wire stops signal propagation and reports fault', async () => {
    const coordinator = new SimulationCoordinator();
    coordinator.loadProject(createLineFollowerProject());
    coordinator.track.setTrackType('straight');
    coordinator.chassis.reset({ x: 0, y: 0, z: 0.1, yawRad: 0 });

    await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);
    let sim = coordinator.tick(0.01);

    // Center sensors (D4 and D5) are active
    expect(sim.sensorReadings?.digitalChannels[3]).toBe(1);

    // Disconnect wire connecting IR Sensor 4 to Arduino Uno D8
    const removed = coordinator.circuit.removeWire('w_ir_d4_uno');
    expect(removed).toBe(true);

    // Read the MCU pin D8 directly from circuit net: signal must now be 0 (no floating fake value)
    const mcuPinVal = coordinator.circuit.readNetSignal('uno_1', 'D8');
    expect(mcuPinVal.digital).toBe(0);
  });

  it('Scenario 5: Putting TB6612 motor driver into standby immediately cuts drive power', async () => {
    const coordinator = new SimulationCoordinator();
    coordinator.loadProject(createLineFollowerProject());
    coordinator.track.setTrackType('straight');

    // Custom sketch that puts STBY LOW
    const standbySketch = `
      void setup() {
        pinMode(3, OUTPUT);
        digitalWrite(3, LOW); // Force STANDBY
        pinMode(5, OUTPUT);
        analogWrite(5, 200);  // Commanded speed
      }
      void loop() {
        delay(100);
      }
    `;

    await coordinator.compileAndRun(standbySketch);
    const sim = coordinator.tick(0.05);

    expect(sim.driverState.standby).toBe(true);
    expect(sim.driverState.channelA.mode).toBe(MotorMode.STANDBY);
    expect(sim.driverState.channelA.terminalVoltage).toBe(0);
    expect(sim.driverState.channelA.targetRPM).toBe(0);
  });

  it('Scenario 6: Reports LINE_LOST and triggers safe recovery timeout when off track', async () => {
    const coordinator = new SimulationCoordinator();
    coordinator.loadProject(createLineFollowerProject());
    coordinator.track.setTrackType('straight');

    // Place robot completely off track (60cm away)
    coordinator.chassis.reset({ x: 0.60, y: 0, z: 0.1, yawRad: 0 });

    // coordinator.onSerial((msg) => console.log('ARDUINO SERIAL:', msg));
    await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);

    let sim = coordinator.tick(0.01);
    expect(sim.sensorReadings?.lineLost).toBe(true);
    expect(sim.sensorReadings?.activeSensorCount).toBe(0);

    // Step past timeout (LINE_LOST_TIMEOUT_MS = 600ms) and allow motors to brake to stop
    for (let t = 0.05; t <= 1.4; t += 0.05) {
      sim = coordinator.tick(t);
    }

    // Safety timeout must have brought motors to halt
    expect(sim.leftRPM).toBeLessThan(10);
    expect(sim.rightRPM).toBeLessThan(10);
  });

  it('Scenario 7: Firmware parameter adjustments directly alter physical driving dynamics', async () => {
    // Test that higher base speed produces higher forward velocity
    const coordLow = new SimulationCoordinator();
    coordLow.loadProject(createLineFollowerProject());
    coordLow.track.setTrackType('straight');
    coordLow.chassis.reset({ x: 0, y: 0, z: 0, yawRad: 0 });

    const slowSketch = LINE_FOLLOWER_SKETCH.replace('int baseSpeed = 160;', 'int baseSpeed = 80;');
    await coordLow.compileAndRun(slowSketch);
    let simLow = coordLow.tick(0.01);
    for (let t = 0.02; t <= 0.5; t += 0.01) {
      simLow = coordLow.tick(t);
    }

    const coordFast = new SimulationCoordinator();
    coordFast.loadProject(createLineFollowerProject());
    coordFast.track.setTrackType('straight');
    coordFast.chassis.reset({ x: 0, y: 0, z: 0, yawRad: 0 });

    const fastSketch = LINE_FOLLOWER_SKETCH.replace('int baseSpeed = 160;', 'int baseSpeed = 240;');
    await coordFast.compileAndRun(fastSketch);
    let simFast = coordFast.tick(0.01);
    for (let t = 0.02; t <= 0.5; t += 0.01) {
      simFast = coordFast.tick(t);
    }

    expect(simFast.pose.z).toBeGreaterThan(simLow.pose.z * 1.5);
  });

  it('Scenario 8: Deterministic repeatability across identical runs', async () => {
    const runSim = async () => {
      const coordinator = new SimulationCoordinator();
      coordinator.loadProject(createLineFollowerProject());
      coordinator.track.setTrackType('straight');
      coordinator.chassis.reset({ x: 0.01, y: 0, z: 0, yawRad: 0 });
      await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);

      let sim = coordinator.tick(0.01);
      for (let t = 0.02; t <= 0.5; t += 0.01) {
        sim = coordinator.tick(t);
      }
      return { x: sim.pose.x, z: sim.pose.z, yaw: sim.pose.yawRad };
    };

    const res1 = await runSim();
    const res2 = await runSim();

    expect(res1.x).toBeCloseTo(res2.x, 5);
    expect(res1.z).toBeCloseTo(res2.z, 5);
    expect(res1.yaw).toBeCloseTo(res2.yaw, 5);
  });
});
