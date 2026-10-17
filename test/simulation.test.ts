import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../src/circuit/components';
import { TB6612FNGDriver, MotorMode } from '../src/circuit/TB6612FNGDriver';
import { N20MotorModel } from '../src/robot/MotorModel';
import { DifferentialDriveChassis } from '../src/robot/DifferentialDriveChassis';
import { ESP32BehavioralRuntime } from '../src/runtime/ESP32BehavioralRuntime';
import { SimulationCoordinator } from '../src/simulation/SimulationCoordinator';
import { PinMode } from '../src/runtime/ArduinoInterpreter';

describe('MagicSmoke Simulation Engine — Multi-Layer Architecture', () => {
  describe('Test A: GPIO Output Execution & Pin Mode', () => {
    it('configures GPIO as OUTPUT and alternates HIGH and LOW', async () => {
      const runtime = new ESP32BehavioralRuntime();
      const sketch = `
        constexpr int TEST_PIN = 26;
        void setup() {
          pinMode(TEST_PIN, OUTPUT);
          digitalWrite(TEST_PIN, HIGH);
        }
        void loop() {
          digitalWrite(TEST_PIN, LOW);
          delay(100);
          digitalWrite(TEST_PIN, HIGH);
          delay(100);
        }
      `;

      const compileRes = await runtime.compile(sketch);
      expect(compileRes.success).toBe(true);

      const pinLog: Array<{ pin: number; state: 0 | 1 }> = [];
      runtime.setEvents({
        onPinStateChange: (pin, state) => {
          pinLog.push({ pin, state });
        },
      });

      runtime.start();
      // Setup should have set pin 26 to OUTPUT and HIGH
      const pin26 = runtime.getPinState(26);
      expect(pin26.mode).toBe(PinMode.OUTPUT);
      expect(pin26.digital).toBe(1);

      // Step loop: first instruction sets LOW and delays 100ms
      runtime.step(0.05); // t = 50ms (inside first delay)
      expect(runtime.getPinState(26).digital).toBe(0);

      runtime.step(0.06); // t = 110ms (advanced past first delay, sets HIGH)
      expect(runtime.getPinState(26).digital).toBe(1);
    });
  });

  describe('Test B: PWM Output (ledcAttach & ledcWrite / analogWrite)', () => {
    it('configures PWM channel, frequency, resolution and updates duty cycle', async () => {
      const runtime = new ESP32BehavioralRuntime();
      const sketch = `
        constexpr int PWM_PIN = 25;
        void setup() {
          ledcAttach(PWM_PIN, 20000, 8);
          ledcWrite(PWM_PIN, 128); // ~50% duty
        }
        void loop() {
          delay(500);
          ledcWrite(PWM_PIN, 255); // 100% duty
          delay(500);
        }
      `;

      const compileRes = await runtime.compile(sketch);
      expect(compileRes.success).toBe(true);

      let lastPWM = { pin: 0, duty: 0, freq: 0, res: 0 };
      runtime.setEvents({
        onPWMChange: (pin, duty, freq, res) => {
          lastPWM = { pin, duty, freq, res };
        },
      });

      runtime.start();
      const pinState = runtime.getPinState(25);
      expect(pinState.frequency).toBe(20000);
      expect(pinState.resolutionBits).toBe(8);
      expect(pinState.dutyFraction).toBeCloseTo(128 / 255.0, 3);
      expect(lastPWM.pin).toBe(25);
      expect(lastPWM.freq).toBe(20000);

      // Step past 500ms delay to 100% duty
      runtime.step(0.55);
      expect(runtime.getPinState(25).dutyFraction).toBe(1.0);
    });
  });

  describe('Test C: User Helper Functions with Side Effects', () => {
    it('executes user functions containing constrain(), ternary operators, and GPIO/PWM side effects', async () => {
      const runtime = new ESP32BehavioralRuntime();
      const sketch = `
        constexpr int PWMA = 25;
        constexpr int AIN1 = 26;
        constexpr int AIN2 = 27;

        void setMotor(int pwmPin, int in1, int in2, int speed) {
          speed = constrain(speed, -255, 255);
          digitalWrite(in1, speed > 0 ? HIGH : LOW);
          digitalWrite(in2, speed < 0 ? HIGH : LOW);
          ledcWrite(pwmPin, abs(speed));
        }

        void setup() {
          pinMode(AIN1, OUTPUT);
          pinMode(AIN2, OUTPUT);
          ledcAttach(PWMA, 20000, 8);
        }

        void loop() {
          setMotor(PWMA, AIN1, AIN2, -200);
          delay(500);
          setMotor(PWMA, AIN1, AIN2, 150);
          delay(500);
        }
      `;

      const res = await runtime.compile(sketch);
      expect(res.success).toBe(true);

      runtime.start();
      // Step into loop() first command: setMotor with -200 (reverse)
      runtime.step(0.01);
      expect(runtime.getPinState(26).digital).toBe(0); // AIN1 LOW
      expect(runtime.getPinState(27).digital).toBe(1); // AIN2 HIGH
      expect(runtime.getPinState(25).dutyFraction).toBeCloseTo(200 / 255.0, 3);

      // Step past 500ms delay: setMotor with +150 (forward)
      runtime.step(0.55);
      expect(runtime.getPinState(26).digital).toBe(1); // AIN1 HIGH
      expect(runtime.getPinState(27).digital).toBe(0); // AIN2 LOW
      expect(runtime.getPinState(25).dutyFraction).toBeCloseTo(150 / 255.0, 3);
    });
  });

  describe('Test D: Connected Signal Propagation across Circuit Nets', () => {
    let engine: CircuitEngine;

    beforeEach(() => {
      engine = new CircuitEngine();
      engine.addComponent(createESP32DevKit('esp32_1'));
      engine.addComponent(createTB6612FNG('tb6612_1'));
      engine.addComponent(createBatteryPack('batt_1'));
      engine.addComponent(createN20Motor('motor_left', 'Left N20'));
      engine.addComponent(createN20Motor('motor_right', 'Right N20'));
    });

    it('propagates GPIO digital state and PWM duty cycle across nets', () => {
      engine.addWire({
        id: 'w_pwma',
        fromComponentId: 'esp32_1',
        fromPinId: 'GPIO25',
        toComponentId: 'tb6612_1',
        toPinId: 'PWMA',
      });

      engine.setPinOutput('esp32_1', 'GPIO25', { digital: 1, dutyCycle: 0.75, frequency: 20000 });

      const received = engine.readNetSignal('tb6612_1', 'PWMA');
      expect(received.digital).toBe(1);
      expect(received.dutyCycle).toBeCloseTo(0.75, 3);
      expect(received.frequency).toBe(20000);
    });
  });

  describe('Test E: TB6612FNG Motor-Driver Model Behavior', () => {
    let engine: CircuitEngine;
    let driver: TB6612FNGDriver;

    beforeEach(() => {
      engine = new CircuitEngine();
      engine.addComponent(createESP32DevKit('esp32_1'));
      engine.addComponent(createTB6612FNG('tb6612_1'));
      engine.addComponent(createBatteryPack('batt_1'));
      engine.addComponent(createN20Motor('motor_left', 'Left N20'));
      engine.addComponent(createN20Motor('motor_right', 'Right N20'));
      driver = new TB6612FNGDriver('tb6612_1', 300, 7.4);

      // Power & Grounds
      engine.addWire({ id: 'w_gnd1', fromComponentId: 'esp32_1', fromPinId: 'GND', toComponentId: 'tb6612_1', toPinId: 'GND' });
      engine.addWire({ id: 'w_gnd2', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'tb6612_1', toPinId: 'GND' });
      engine.addWire({ id: 'w_vcc', fromComponentId: 'esp32_1', fromPinId: '3V3', toComponentId: 'tb6612_1', toPinId: 'VCC' });
      engine.addWire({ id: 'w_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM' });

      // Control Inputs
      engine.addWire({ id: 'w_stby', fromComponentId: 'esp32_1', fromPinId: 'GPIO23', toComponentId: 'tb6612_1', toPinId: 'STBY' });
      engine.addWire({ id: 'w_pwma', fromComponentId: 'esp32_1', fromPinId: 'GPIO25', toComponentId: 'tb6612_1', toPinId: 'PWMA' });
      engine.addWire({ id: 'w_ain1', fromComponentId: 'esp32_1', fromPinId: 'GPIO26', toComponentId: 'tb6612_1', toPinId: 'AIN1' });
      engine.addWire({ id: 'w_ain2', fromComponentId: 'esp32_1', fromPinId: 'GPIO27', toComponentId: 'tb6612_1', toPinId: 'AIN2' });

      // Motor Leads
      engine.addWire({ id: 'w_ao1', fromComponentId: 'tb6612_1', fromPinId: 'AO1', toComponentId: 'motor_left', toPinId: 'M_POS' });
      engine.addWire({ id: 'w_ao2', fromComponentId: 'tb6612_1', fromPinId: 'AO2', toComponentId: 'motor_left', toPinId: 'M_NEG' });
      engine.addWire({ id: 'w_bo1', fromComponentId: 'tb6612_1', fromPinId: 'BO1', toComponentId: 'motor_right', toPinId: 'M_POS' });
      engine.addWire({ id: 'w_bo2', fromComponentId: 'tb6612_1', fromPinId: 'BO2', toComponentId: 'motor_right', toPinId: 'M_NEG' });
    });

    it('reports STANDBY when STBY pin is LOW or disconnected', () => {
      engine.setPinOutput('esp32_1', 'GPIO23', { digital: 0 }); // STBY LOW
      engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 });
      engine.setPinOutput('esp32_1', 'GPIO27', { digital: 0 });
      engine.setPinOutput('esp32_1', 'GPIO25', { dutyCycle: 0.8 });

      const state = driver.evaluate(engine);
      expect(state.standby).toBe(true);
      expect(state.channelA.mode).toBe(MotorMode.STANDBY);
      expect(state.channelA.targetRPM).toBe(0);
    });

    it('reports UNPOWERED when VM motor power is missing', () => {
      engine.removeWire('w_vm');
      engine.setPinOutput('esp32_1', 'GPIO23', { digital: 1 }); // STBY HIGH

      const state = driver.evaluate(engine);
      expect(state.hasMotorPower).toBe(false);
      expect(state.channelA.mode).toBe(MotorMode.UNPOWERED);
      expect(state.channelA.targetRPM).toBe(0);
    });

    it('evaluates Forward, Reverse, Brake, and Coast truthfully based on input levels and PWM', () => {
      engine.setPinOutput('esp32_1', 'GPIO23', { digital: 1 }); // STBY HIGH
      engine.setPinOutput('esp32_1', 'GPIO25', { dutyCycle: 0.6 });

      // Forward: AIN1=1, AIN2=0
      engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 });
      engine.setPinOutput('esp32_1', 'GPIO27', { digital: 0 });
      let state = driver.evaluate(engine);
      expect(state.channelA.mode).toBe(MotorMode.FORWARD_CW);
      expect(state.channelA.speedFraction).toBeCloseTo(0.6, 2);
      expect(state.channelA.targetRPM).toBeCloseTo(180, 1);
      expect(state.channelA.terminalVoltage).toBeCloseTo(0.6 * 7.4, 2);

      // Reverse: AIN1=0, AIN2=1
      engine.setPinOutput('esp32_1', 'GPIO26', { digital: 0 });
      engine.setPinOutput('esp32_1', 'GPIO27', { digital: 1 });
      state = driver.evaluate(engine);
      expect(state.channelA.mode).toBe(MotorMode.REVERSE_CCW);
      expect(state.channelA.speedFraction).toBeCloseTo(-0.6, 2);
      expect(state.channelA.targetRPM).toBeCloseTo(-180, 1);
      expect(state.channelA.terminalVoltage).toBeCloseTo(-0.6 * 7.4, 2);

      // Short Brake: AIN1=1, AIN2=1
      engine.setPinOutput('esp32_1', 'GPIO26', { digital: 1 });
      engine.setPinOutput('esp32_1', 'GPIO27', { digital: 1 });
      state = driver.evaluate(engine);
      expect(state.channelA.mode).toBe(MotorMode.SHORT_BRAKE);
      expect(state.channelA.targetRPM).toBe(0);

      // Stop/Coast: AIN1=0, AIN2=0
      engine.setPinOutput('esp32_1', 'GPIO26', { digital: 0 });
      engine.setPinOutput('esp32_1', 'GPIO27', { digital: 0 });
      state = driver.evaluate(engine);
      expect(state.channelA.mode).toBe(MotorMode.STOP_COAST);
      expect(state.channelA.targetRPM).toBe(0);
    });
  });

  describe('Test F: Motor Physical Response & Acceleration Model', () => {
    it('ramps motor speed over time and reverses signed velocity', () => {
      const motor = new N20MotorModel({ accelerationRate: 600, decelerationRate: 1200 });

      // Apply positive command: +200 RPM
      motor.update(200, 0.1); // in 0.1s, increases by 60 RPM
      expect(motor.getRPM()).toBeCloseTo(60, 1);

      motor.update(200, 0.3); // +180 RPM -> caps at 200 RPM
      expect(motor.getRPM()).toBe(200);

      // Reverse polarity: -200 RPM
      motor.update(-200, 0.2); // decelerates towards 0, then accelerates negative
      expect(motor.getRPM()).toBeLessThan(200);

      // Advance time until fully reversed
      motor.update(-200, 1.0);
      expect(motor.getRPM()).toBe(-200);
      expect(motor.getTargetRPM()).toBe(-200);
    });
  });

  describe('Test G: Differential Drive Robot Chassis Kinematics', () => {
    it('integrates differential drive kinematics for forward, reverse, and turning', () => {
      const chassis = new DifferentialDriveChassis({ trackWidthMeters: 0.14 });

      // 1. Straight Forward: vLeft = 0.5 m/s, vRight = 0.5 m/s for 1.0s
      let pose = chassis.update(0.5, 0.5, 1.0);
      expect(pose.z).toBeCloseTo(0.5, 3);
      expect(pose.x).toBeCloseTo(0, 3);
      expect(pose.yawRad).toBeCloseTo(0, 3);

      // 2. Straight Reverse: vLeft = -0.3 m/s, vRight = -0.3 m/s for 1.0s
      pose = chassis.update(-0.3, -0.3, 1.0);
      expect(pose.z).toBeCloseTo(0.2, 3);

      // 3. Turn Right: vLeft = 0.2 m/s, vRight = -0.2 m/s (point turn)
      pose = chassis.update(0.2, -0.2, 0.5);
      expect(pose.yawRad).toBeLessThan(0); // rotates clockwise/right
    });
  });

  describe('Test H: End-to-End Firmware Execution Pipeline', () => {
    it('runs sketch that drives forward, stops, and reverses using canonical pin outputs and virtual time', async () => {
      const coordinator = new SimulationCoordinator();

      const sketch = `
        constexpr int PWMA = 25;
        constexpr int AIN1 = 26;
        constexpr int AIN2 = 27;
        constexpr int PWMB = 14;
        constexpr int BIN1 = 18;
        constexpr int BIN2 = 19;
        constexpr int STBY = 23;

        void setMotor(int pwm, int in1, int in2, int speed) {
          digitalWrite(in1, speed > 0 ? HIGH : LOW);
          digitalWrite(in2, speed < 0 ? HIGH : LOW);
          ledcWrite(pwm, abs(speed));
        }

        void drive(int left, int right) {
          setMotor(PWMA, AIN1, AIN2, left);
          setMotor(PWMB, BIN1, BIN2, right);
        }

        void setup() {
          pinMode(AIN1, OUTPUT);
          pinMode(AIN2, OUTPUT);
          pinMode(BIN1, OUTPUT);
          pinMode(BIN2, OUTPUT);
          pinMode(STBY, OUTPUT);
          ledcAttach(PWMA, 20000, 8);
          ledcAttach(PWMB, 20000, 8);
          digitalWrite(STBY, HIGH);
          Serial.println("System initialized");
        }

        void loop() {
          drive(180, 180);
          delay(5000);
          drive(0, 0);
          delay(2000);
          drive(180, -180);
          delay(2000);
        }
      `;

      const compRes = await coordinator.compileAndRun(sketch);
      expect(compRes.success).toBe(true);

      // Step simulation forward over 1 second (10 x 0.1s ticks)
      let sim = coordinator.tick(0.1);
      for (let t = 0.2; t <= 1.0; t += 0.1) {
        sim = coordinator.tick(t);
      }

      expect(sim.driverState.standby).toBe(false);
      expect(sim.driverState.channelA.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.driverState.channelB.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.driverState.channelA.terminalVoltage).toBeGreaterThan(4.5);
      expect(sim.leftRPM).toBeGreaterThan(180);
      expect(sim.pose.z).toBeGreaterThan(0.05); // moving forward in 3D world!

      // Step past 5s: inside drive(0,0) stop window (at t = 5.5s)
      for (let t = 1.1; t <= 5.5; t += 0.1) {
        sim = coordinator.tick(t);
      }
      expect(sim.driverState.channelA.mode).toBe(MotorMode.STOP_COAST);
      expect(sim.driverState.channelA.targetRPM).toBe(0);

      // Step past 7s: inside drive(180, -180) turning window (at t = 7.5s)
      for (let t = 5.6; t <= 7.5; t += 0.1) {
        sim = coordinator.tick(t);
      }
      expect(sim.driverState.channelA.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.driverState.channelB.mode).toBe(MotorMode.REVERSE_CCW);
      expect(sim.driverState.channelB.terminalVoltage).toBeLessThan(0);
    });
  });

  describe('Test I: Failure Diagnostics when Required Wire is Disconnected', () => {
    it('detects disconnected motor lead, cuts power to that channel, and reports explicit diagnostic', async () => {
      const coordinator = new SimulationCoordinator();

      const sketch = `
        void setup() {
          digitalWrite(23, HIGH); // STBY HIGH
          digitalWrite(26, HIGH); // AIN1 HIGH
          digitalWrite(27, LOW);  // AIN2 LOW
          ledcWrite(25, 200);     // PWMA
        }
        void loop() {
          delay(1000);
        }
      `;

      await coordinator.compileAndRun(sketch);
      let sim = coordinator.tick(0.5);
      expect(sim.driverState.channelA.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.leftRPM).toBeGreaterThan(0);

      // Disconnect AO1 motor wire
      coordinator.circuit.removeWire('w_ao1');

      // Tick simulation again
      sim = coordinator.tick(0.6);
      expect(sim.driverState.channelA.mode).toBe(MotorMode.DISCONNECTED);
      expect(sim.driverState.channelA.targetRPM).toBe(0);
      expect(sim.driverState.channelA.terminalVoltage).toBe(0);
      expect(sim.driverState.channelA.diagnostic).toContain('AO1/AO2');
      expect(coordinator.leftMotor.getStopReason()).toContain('AO1/AO2');
    });
  });

  describe('Default Example Sketch Verification', () => {
    it('executes the default user sketch with setMotor(), moveForward(), and moveReverse()', async () => {
      const coordinator = new SimulationCoordinator();
      const { DEFAULT_SKETCH } = await import('../src/project/defaultProject');

      const compRes = await coordinator.compileAndRun(DEFAULT_SKETCH);
      expect(compRes.success).toBe(true);

      // Step forward 1.0s (moveForward 180)
      let sim = coordinator.tick(0.1);
      for (let t = 0.2; t <= 1.0; t += 0.1) {
        sim = coordinator.tick(t);
      }

      expect(sim.driverState.standby).toBe(false);
      expect(sim.driverState.channelA.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.driverState.channelB.mode).toBe(MotorMode.FORWARD_CW);
      expect(sim.leftRPM).toBeGreaterThan(180);
      expect(sim.rightRPM).toBeGreaterThan(180);
      expect(sim.pose.z).toBeGreaterThan(0.05);

      // Step past 2.0s delay to stopMotors() at t = 2.5s
      for (let t = 1.1; t <= 2.5; t += 0.1) {
        sim = coordinator.tick(t);
      }
      expect(sim.driverState.channelA.mode).toBe(MotorMode.STOP_COAST);
      expect(sim.driverState.channelA.targetRPM).toBe(0);

      // Step past 1.0s delay to moveReverse(180) at t = 3.5s
      for (let t = 2.6; t <= 3.5; t += 0.1) {
        sim = coordinator.tick(t);
      }
      expect(sim.driverState.channelA.mode).toBe(MotorMode.REVERSE_CCW);
      expect(sim.driverState.channelB.mode).toBe(MotorMode.REVERSE_CCW);
      expect(sim.driverState.channelA.terminalVoltage).toBeLessThan(-4.5);
    });
  });
});
