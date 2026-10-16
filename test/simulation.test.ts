import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../src/circuit/components';
import { TB6612FNGDriver, MotorMode } from '../src/circuit/TB6612FNGDriver';
import { N20MotorModel } from '../src/robot/MotorModel';
import { DifferentialDriveChassis } from '../src/robot/DifferentialDriveChassis';
import { ESP32BehavioralRuntime } from '../src/runtime/ESP32BehavioralRuntime';

describe('CircuitEngine & Signal Propagation', () => {
  let engine: CircuitEngine;

  beforeEach(() => {
    engine = new CircuitEngine();
    engine.addComponent(createESP32DevKit('esp32_1'));
    engine.addComponent(createTB6612FNG('tb6612_1'));
    engine.addComponent(createBatteryPack('batt_1'));
    engine.addComponent(createN20Motor('motor_left', 'Left N20', { x: 0, y: 0 }));
    engine.addComponent(createN20Motor('motor_right', 'Right N20', { x: 0, y: 0 }));
  });

  it('correctly tracks wire connections and transitive graph reachability', () => {
    engine.addWire({
      id: 'w_gnd1',
      fromComponentId: 'esp32_1',
      fromPinId: 'GND',
      toComponentId: 'tb6612_1',
      toPinId: 'GND',
    });

    const connected = engine.getConnectedPins('esp32_1', 'GND');
    expect(connected).toContainEqual({ compId: 'tb6612_1', pinId: 'GND' });
    expect(connected).toContainEqual({ compId: 'esp32_1', pinId: 'GND' });
  });

  it('detects missing ground connection between battery and driver', () => {
    // Only connect ESP32 GND, not Battery GND
    engine.addWire({
      id: 'w_gnd1',
      fromComponentId: 'esp32_1',
      fromPinId: 'GND',
      toComponentId: 'tb6612_1',
      toPinId: 'GND',
    });

    const status = engine.evaluateCircuit();
    expect(status.hasCommonGround).toBe(false);
    expect(status.circuitWarnings.some((w) => w.includes('Battery GND'))).toBe(true);
  });

  it('propagates GPIO digital state and PWM duty cycle across nets', () => {
    engine.addWire({
      id: 'w_pwma',
      fromComponentId: 'esp32_1',
      fromPinId: 'GPIO25',
      toComponentId: 'tb6612_1',
      toPinId: 'PWMA',
    });

    // Simulate ESP32 setting GPIO25 PWM output
    engine.setPinOutput('esp32_1', 'GPIO25', { digital: 1, dutyCycle: 0.627, frequency: 20000 });

    const received = engine.readNetSignal('tb6612_1', 'PWMA');
    expect(received.digital).toBe(1);
    expect(received.dutyCycle).toBeCloseTo(0.627, 3);
    expect(received.frequency).toBe(20000);
  });
});

describe('TB6612FNG Driver Model', () => {
  let engine: CircuitEngine;
  let driver: TB6612FNGDriver;

  beforeEach(() => {
    engine = new CircuitEngine();
    engine.addComponent(createESP32DevKit('esp32_1'));
    engine.addComponent(createTB6612FNG('tb6612_1'));
    engine.addComponent(createBatteryPack('batt_1'));
    driver = new TB6612FNGDriver('tb6612_1');

    // Wire Common Grounds
    engine.addWire({ id: 'w_gnd1', fromComponentId: 'esp32_1', fromPinId: 'GND', toComponentId: 'tb6612_1', toPinId: 'GND' });
    engine.addWire({ id: 'w_gnd2', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'tb6612_1', toPinId: 'GND' });

    // Wire Logic and Motor Supplies
    engine.addWire({ id: 'w_vcc', fromComponentId: 'esp32_1', fromPinId: '3V3', toComponentId: 'tb6612_1', toPinId: 'VCC' });
    engine.addWire({ id: 'w_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM' });

    // Wire Control Pins
    engine.addWire({ id: 'w_stby', fromComponentId: 'esp32_1', fromPinId: 'GPIO23', toComponentId: 'tb6612_1', toPinId: 'STBY' });
    engine.addWire({ id: 'w_pwma', fromComponentId: 'esp32_1', fromPinId: 'GPIO25', toComponentId: 'tb6612_1', toPinId: 'PWMA' });
    engine.addWire({ id: 'w_ain1', fromComponentId: 'esp32_1', fromPinId: 'GPIO26', toComponentId: 'tb6612_1', toPinId: 'AIN1' });
    engine.addWire({ id: 'w_ain2', fromComponentId: 'esp32_1', fromPinId: 'GPIO27', toComponentId: 'tb6612_1', toPinId: 'AIN2' });
  });

  it('stays in STANDBY when STBY pin is LOW', () => {
    engine.setPinOutput('esp32_1', 'GPIO23', { digital: 0 });
    engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 });
    engine.setPinOutput('esp32_1', 'GPIO27', { digital: 0 });
    engine.setPinOutput('esp32_1', 'GPIO25', { dutyCycle: 0.8 });

    const state = driver.evaluate(engine);
    expect(state.standby).toBe(true);
    expect(state.channelA.mode).toBe(MotorMode.STANDBY);
    expect(state.channelA.targetRPM).toBe(0);
  });

  it('drives FORWARD_CW when AIN1=HIGH, AIN2=LOW, STBY=HIGH', () => {
    engine.setPinOutput('esp32_1', 'GPIO23', { digital: 1 }); // STBY HIGH
    engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 }); // AIN1 HIGH
    engine.setPinOutput('esp32_1', 'GPIO27', { digital: 0 }); // AIN2 LOW
    engine.setPinOutput('esp32_1', 'GPIO25', { dutyCycle: 0.5 }); // 50% PWM

    const state = driver.evaluate(engine);
    expect(state.standby).toBe(false);
    expect(state.channelA.mode).toBe(MotorMode.FORWARD_CW);
    expect(state.channelA.speedFraction).toBe(0.5);
    expect(state.channelA.targetRPM).toBe(150); // 50% of 300 RPM
  });

  it('stops completely when motor power VM is disconnected', () => {
    engine.removeWire('w_vm'); // disconnect battery
    engine.setPinOutput('esp32_1', 'GPIO23', { digital: 1 });
    engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 });
    engine.setPinOutput('esp32_1', 'GPIO25', { dutyCycle: 0.5 });

    const state = driver.evaluate(engine);
    expect(state.hasMotorPower).toBe(false);
    expect(state.channelA.mode).toBe(MotorMode.UNPOWERED);
    expect(state.channelA.targetRPM).toBe(0);
  });
});

describe('MotorModel & Kinematic Motion', () => {
  it('smoothly accelerates N20 motor according to acceleration rate', () => {
    const motor = new N20MotorModel({ maxRPM: 300, accelerationRate: 600 });
    
    // Step 0.25 seconds with target 300 RPM
    const step1 = motor.update(300, 0.25);
    expect(step1.currentRPM).toBeCloseTo(150, 1);

    // Step another 0.25 seconds
    const step2 = motor.update(300, 0.25);
    expect(step2.currentRPM).toBeCloseTo(300, 1);
  });

  it('moves robot chassis forward when both wheels turn at equal speed', () => {
    const chassis = new DifferentialDriveChassis({ trackWidthMeters: 0.14 });
    const initialPose = chassis.getPose();

    // Both wheels moving forward at 0.5 m/s for 1.0 second
    const nextPose = chassis.update(0.5, 0.5, 1.0);
    expect(nextPose.z).toBeGreaterThan(initialPose.z);
    expect(nextPose.x).toBeCloseTo(0, 3);
    expect(nextPose.yawRad).toBeCloseTo(0, 3);
  });

  it('rotates chassis when left and right wheels rotate oppositely', () => {
    const chassis = new DifferentialDriveChassis({ trackWidthMeters: 0.14 });
    const nextPose = chassis.update(-0.2, 0.2, 1.0);
    expect(nextPose.yawRad).toBeGreaterThan(0); // Rotates right
  });
});

describe('ESP32 Firmware Runtime Compilation & Execution', () => {
  it('compiles user sketch and executes timed state transitions', async () => {
    const runtime = new ESP32BehavioralRuntime();
    const sketch = `
      #include <Arduino.h>
      constexpr int PWMA = 25;
      constexpr int AIN1 = 26;
      constexpr int AIN2 = 27;
      constexpr int STBY = 23;

      void setup() {
        pinMode(STBY, OUTPUT);
        digitalWrite(STBY, HIGH);
      }

      void loop() {
        Serial.println("Forward");
        drive(160, 160);
        delay(500);
        drive(0, 0);
        delay(500);
      }
    `;

    const result = await runtime.compile(sketch);
    expect(result.success).toBe(true);

    const pinStates: Record<number, number> = {};
    const pwms: Record<number, number> = {};
    const serialLogs: string[] = [];

    runtime.setEvents({
      onPinStateChange: (p, s) => { pinStates[p] = s; },
      onPWMChange: (p, d) => { pwms[p] = d; },
      onSerialOutput: (t) => { serialLogs.push(t); },
    });

    runtime.start();
    expect(pinStates[23]).toBe(1); // STBY HIGH

    // Step first cycle: drive(160, 160)
    runtime.step(0.1);
    expect(pinStates[26]).toBe(1); // AIN1 HIGH
    expect(pinStates[27]).toBe(0); // AIN2 LOW
    expect(pwms[25]).toBeCloseTo(160 / 255.0, 2);
    expect(serialLogs.some(l => l.includes('Forward'))).toBe(true);

    // Step past the 500ms delay: drive(0,0)
    runtime.step(0.5);
    expect(pwms[25]).toBe(0);
  });

  it('compiles and executes sketches with custom helper functions like moveForward() and stopMotors()', async () => {
    const runtime = new ESP32BehavioralRuntime();
    const sketch = `
      #include <Arduino.h>
      constexpr int PWMA = 25;
      constexpr int AIN1 = 26;
      constexpr int AIN2 = 27;
      constexpr int STBY = 23;

      void moveForward(int spd = 200) {
        drive(spd, spd);
      }

      void stopMotors() {
        drive(0, 0);
      }

      void setup() {
        pinMode(STBY, OUTPUT);
        digitalWrite(STBY, HIGH);
      }

      void loop() {
        moveForward(180);
        delay(300);
        stopMotors();
        delay(300);
      }
    `;

    const result = await runtime.compile(sketch);
    expect(result.success).toBe(true);

    const pwms: Record<number, number> = {};
    runtime.setEvents({
      onPWMChange: (p, d) => { pwms[p] = d; },
    });

    runtime.start();
    runtime.step(0.05); // inside moveForward(180)
    expect(pwms[25]).toBeCloseTo(180 / 255.0, 2);

    runtime.step(0.35); // inside stopMotors()
    expect(pwms[25]).toBe(0);
  });

  it('allows empty loop() without throwing compiler errors', async () => {
    const runtime = new ESP32BehavioralRuntime();
    const sketch = `
      void setup() {
        Serial.println("Setup only");
      }
      void loop() {
        // empty loop is valid
      }
    `;
    const result = await runtime.compile(sketch);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('correctly pauses and resumes execution without losing state', async () => {
    const runtime = new ESP32BehavioralRuntime();
    const sketch = `
      void setup() {
        digitalWrite(23, HIGH);
      }
      void loop() {
        drive(150, 150);
        delay(500);
      }
    `;
    await runtime.compile(sketch);
    const pwms: Record<number, number> = {};
    runtime.setEvents({ onPWMChange: (p, d) => { pwms[p] = d; } });

    runtime.start();
    runtime.step(0.1);
    expect(pwms[25]).toBeGreaterThan(0);

    runtime.pause();
    expect(runtime.isPaused()).toBe(true);
    runtime.step(1.0); // stepped while paused -> no change

    runtime.resume();
    expect(runtime.isPaused()).toBe(false);
  });
});

