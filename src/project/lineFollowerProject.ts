import {
  createArduinoUno,
  createIRSensorArray8CH,
  createTB6612FNG,
  createBatteryPack,
  createGroundBus,
  createN20Motor,
} from '../circuit/components';
import { ProjectDocument } from './types';
import { WireConnection } from '../circuit/types';
import { StoredProject } from './projectStorage';
import { createDefaultTrack } from '../robot/TrackModel';

export const LINE_FOLLOWER_PIN_MAPPING = {
  // Motor Driver TB6612FNG Control
  STBY: 3,
  PWMA: 5,
  AIN1: 9,
  AIN2: 10,
  PWMB: 6,
  BIN1: 11,
  BIN2: 16, // A2 as digital pin 16

  // 8-Channel Digital IR Reflectance Array (Left to Right)
  IR1: 2,   // Far Left
  IR2: 4,
  IR3: 7,
  IR4: 8,   // Center Left
  IR5: 12,  // Center Right
  IR6: 13,
  IR7: 14,  // A0 as digital pin 14
  IR8: 15,  // A1 as digital pin 15 / Far Right
} as const;

export const LINE_FOLLOWER_SKETCH = `// MagicSmoke — Autonomous Line Follower Robot
// Hardware: Arduino Uno R3 + 8-Channel IR Reflectance Array + TB6612FNG Motor Driver
// Controller: Discrete Proportional-Integral-Derivative (PID) with Anti-Windup & Lost Line Recovery

#include <Arduino.h>

// -------------------------------------------------------------
// Pin Assignments (Arduino Uno R3)
// -------------------------------------------------------------
constexpr int PIN_STBY = ${LINE_FOLLOWER_PIN_MAPPING.STBY};
constexpr int PIN_PWMA = ${LINE_FOLLOWER_PIN_MAPPING.PWMA}; // Left Motor Speed (PWM)
constexpr int PIN_AIN1 = ${LINE_FOLLOWER_PIN_MAPPING.AIN1}; // Left Motor Direction 1
constexpr int PIN_AIN2 = ${LINE_FOLLOWER_PIN_MAPPING.AIN2}; // Left Motor Direction 2
constexpr int PIN_PWMB = ${LINE_FOLLOWER_PIN_MAPPING.PWMB}; // Right Motor Speed (PWM)
constexpr int PIN_BIN1 = ${LINE_FOLLOWER_PIN_MAPPING.BIN1}; // Right Motor Direction 1
constexpr int PIN_BIN2 = ${LINE_FOLLOWER_PIN_MAPPING.BIN2}; // Right Motor Direction 2 (A2)

// 8-Channel Reflectance Array Pins (Left to Right: Channel 1 to Channel 8)
constexpr int PIN_IR1 = ${LINE_FOLLOWER_PIN_MAPPING.IR1}; // CH1 (Far Left, -35mm)
constexpr int PIN_IR2 = ${LINE_FOLLOWER_PIN_MAPPING.IR2}; // CH2 (-25mm)
constexpr int PIN_IR3 = ${LINE_FOLLOWER_PIN_MAPPING.IR3}; // CH3 (-15mm)
constexpr int PIN_IR4 = ${LINE_FOLLOWER_PIN_MAPPING.IR4}; // CH4 (Center Left, -5mm)
constexpr int PIN_IR5 = ${LINE_FOLLOWER_PIN_MAPPING.IR5}; // CH5 (Center Right, +5mm)
constexpr int PIN_IR6 = ${LINE_FOLLOWER_PIN_MAPPING.IR6}; // CH6 (+15mm)
constexpr int PIN_IR7 = ${LINE_FOLLOWER_PIN_MAPPING.IR7}; // CH7 (+25mm)
constexpr int PIN_IR8 = ${LINE_FOLLOWER_PIN_MAPPING.IR8}; // CH8 (Far Right, +35mm)

// Line Polarity: Active HIGH (1 when detecting dark tape on light background)
constexpr int LINE_DETECTED = 1;

// -------------------------------------------------------------
// Configurable Controller Parameters
// -------------------------------------------------------------
int baseSpeed = 160;          // Base forward PWM (0-255)
int maxSpeed = 230;           // Saturation speed limit
float Kp = 2.4;               // Proportional gain (steering responsiveness)
float Ki = 0.01;              // Integral gain (steady-state curve compensation)
float Kd = 0.6;               // Derivative gain (oscillation damping)

// PID State Variables
float integralTerm = 0.0;
float maxIntegral = 40.0;     // Anti-windup limit
float lastError = 0.0;
bool isFirstLoop = true;
unsigned long lastTimeMs = 0;

// Line Lost State Management
bool isLineLost = false;
bool recoveryTimedOut = false;
unsigned long lineLostTimestampMs = 0;
constexpr unsigned long LINE_LOST_TIMEOUT_MS = 600; // Stop if line lost > 0.6s

// -------------------------------------------------------------
// Low-Level Motor Control via TB6612FNG H-Bridge Driver
// -------------------------------------------------------------
void setLeftMotor(int speed) {
  speed = constrain(speed, -255, 255);
  if (speed > 0) {
    digitalWrite(PIN_AIN1, HIGH);
    digitalWrite(PIN_AIN2, LOW);
    analogWrite(PIN_PWMA, speed);
  } else if (speed < 0) {
    digitalWrite(PIN_AIN1, LOW);
    digitalWrite(PIN_AIN2, HIGH);
    analogWrite(PIN_PWMA, abs(speed));
  } else {
    digitalWrite(PIN_AIN1, LOW);
    digitalWrite(PIN_AIN2, LOW);
    analogWrite(PIN_PWMA, 0);
  }
}

void setRightMotor(int speed) {
  speed = constrain(speed, -255, 255);
  if (speed > 0) {
    digitalWrite(PIN_BIN1, HIGH);
    digitalWrite(PIN_BIN2, LOW);
    analogWrite(PIN_PWMB, speed);
  } else if (speed < 0) {
    digitalWrite(PIN_BIN1, LOW);
    digitalWrite(PIN_BIN2, HIGH);
    analogWrite(PIN_PWMB, abs(speed));
  } else {
    digitalWrite(PIN_BIN1, LOW);
    digitalWrite(PIN_BIN2, LOW);
    analogWrite(PIN_PWMB, 0);
  }
}

void drive(int leftSpeed, int rightSpeed) {
  setLeftMotor(leftSpeed);
  setRightMotor(rightSpeed);
}

// -------------------------------------------------------------
// Sensor Interpretation & Weighted Centroid Calculation
// -------------------------------------------------------------
// Returns weighted line position error in millimeters (-35.0 to +35.0)
// Returns 999.0 if line is lost (no sensors active)
float computeLinePosition() {
  int s1 = digitalRead(PIN_IR1);
  int s2 = digitalRead(PIN_IR2);
  int s3 = digitalRead(PIN_IR3);
  int s4 = digitalRead(PIN_IR4);
  int s5 = digitalRead(PIN_IR5);
  int s6 = digitalRead(PIN_IR6);
  int s7 = digitalRead(PIN_IR7);
  int s8 = digitalRead(PIN_IR8);

  int activeCount = s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8;
  if (activeCount == 0) {
    return 999.0;
  }

  float weightedSum = s1 * -35.0 + s2 * -25.0 + s3 * -15.0 + s4 * -5.0 + s5 * 5.0 + s6 * 15.0 + s7 * 25.0 + s8 * 35.0;
  return weightedSum / activeCount;
}

// -------------------------------------------------------------
// Arduino Setup: Hardware Initialization
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  // Configure Motor Driver Control Pins
  pinMode(PIN_STBY, OUTPUT);
  pinMode(PIN_AIN1, OUTPUT);
  pinMode(PIN_AIN2, OUTPUT);
  pinMode(PIN_BIN1, OUTPUT);
  pinMode(PIN_BIN2, OUTPUT);
  pinMode(PIN_PWMA, OUTPUT);
  pinMode(PIN_PWMB, OUTPUT);

  // Configure Sensor Array Input Pins
  pinMode(PIN_IR1, INPUT);
  pinMode(PIN_IR2, INPUT);
  pinMode(PIN_IR3, INPUT);
  pinMode(PIN_IR4, INPUT);
  pinMode(PIN_IR5, INPUT);
  pinMode(PIN_IR6, INPUT);
  pinMode(PIN_IR7, INPUT);
  pinMode(PIN_IR8, INPUT);

  // Wake TB6612FNG driver from standby mode
  digitalWrite(PIN_STBY, HIGH);

  lastTimeMs = millis();
  Serial.println("Line Follower Robot online. PID controller initialized.");
}

// -------------------------------------------------------------
// Main Real-Time Control Loop
// -------------------------------------------------------------
void loop() {
  unsigned long now = millis();
  float dt = (now - lastTimeMs) / 1000.0;
  if (dt <= 0.001) dt = 0.010;
  lastTimeMs = now;

  // 1. Read IR Sensors & Estimate Centerline Error
  float linePos = computeLinePosition();

  // 2. Handle Line Lost Condition
  if (linePos > 900.0) {
    if (!isLineLost) {
      isLineLost = true;
      recoveryTimedOut = false;
      lineLostTimestampMs = now;
      Serial.println("STATUS: LINE_LOST — Entering last-known recovery search.");
    }

    // Safety timeout: stop if line cannot be found
    if (now - lineLostTimestampMs > LINE_LOST_TIMEOUT_MS) {
      drive(0, 0);
      if (!recoveryTimedOut) {
        recoveryTimedOut = true;
        Serial.println("STATUS: RECOVERY_TIMEOUT — Motors halted for safety.");
      }
    } else {
      // Recovery strategy: rotate towards last known direction of the line
      if (lastError > 0) {
        drive(baseSpeed, -baseSpeed / 2);
      } else {
        drive(-baseSpeed / 2, baseSpeed);
      }
    }
  } else {
    // Line is actively detected
    if (isLineLost) {
      isLineLost = false;
      recoveryTimedOut = false;
      integralTerm = 0.0;
      Serial.println("STATUS: LINE_REACQUIRED — Resuming nominal PID tracking.");
    }

    float error = linePos;

    // 3. Discrete PID Calculation
    // Proportional term: direct response to displacement from center
    float P = Kp * error;

    // Integral term with anti-windup clamping
    integralTerm = integralTerm + Ki * error * dt;
    integralTerm = constrain(integralTerm, -maxIntegral, maxIntegral);
    float I = integralTerm;

    // Derivative term with first-loop protection
    float D = 0.0;
    if (isFirstLoop) {
      isFirstLoop = false;
    } else {
      D = Kd * ((error - lastError) / dt);
    }
    lastError = error;

    // Bound the steering differential to prevent excessive wheel reversal
    float turn = constrain(P + I + D, -80.0, 80.0);

    // 4. Differential Drive Motor Commands
    int leftCmd = constrain(baseSpeed + turn, -maxSpeed, maxSpeed);
    int rightCmd = constrain(baseSpeed - turn, -maxSpeed, maxSpeed);

    drive(leftCmd, rightCmd);
  }

  delay(10); // 100Hz control loop sampling cadence
}
`;

export function createLineFollowerProject(): ProjectDocument {
  const components = [
    createArduinoUno('uno_1', { x: 40, y: 50 }),
    createIRSensorArray8CH('ir_array_1', { x: 40, y: 440 }),
    createTB6612FNG('tb6612_1', { x: 380, y: 50 }),
    createBatteryPack('batt_1', { x: 380, y: 390 }),
    createGroundBus('gnd_bus_1', { x: 380, y: 510 }),
    createN20Motor('motor_left', 'Left N20 Motor', { x: 670, y: 60 }),
    createN20Motor('motor_right', 'Right N20 Motor', { x: 670, y: 240 }),
  ];

  const wires: WireConnection[] = [
    // 1. Power Distribution (5V Logic from Uno to TB6612 VCC & IR Array VCC)
    { id: 'w_uno_5v_tb', fromComponentId: 'uno_1', fromPinId: '5V', toComponentId: 'tb6612_1', toPinId: 'VCC', color: '#06b6d4' },
    { id: 'w_uno_5v_ir', fromComponentId: 'uno_1', fromPinId: '5V', toComponentId: 'ir_array_1', toPinId: 'VCC', color: '#06b6d4' },

    // 2. High-Current Motor Power (7.4V Battery to TB6612 VM)
    { id: 'w_batt_pos_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM', color: '#f59e0b' },

    // 3. Common Ground Reference Star Topology (Battery NEG, Uno GND, TB6612 GND, IR GND)
    { id: 'w_batt_neg_gnd', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'gnd_bus_1', toPinId: 'GND1', color: '#64748b' },
    { id: 'w_uno_gnd_bus', fromComponentId: 'uno_1', fromPinId: 'GND1', toComponentId: 'gnd_bus_1', toPinId: 'GND2', color: '#64748b' },
    { id: 'w_tb_gnd_bus', fromComponentId: 'tb6612_1', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND3', color: '#64748b' },
    { id: 'w_ir_gnd_bus', fromComponentId: 'ir_array_1', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND4', color: '#64748b' },

    // 4. TB6612FNG Control Signals from Arduino Uno
    { id: 'w_uno_d3_stby', fromComponentId: 'uno_1', fromPinId: 'D3', toComponentId: 'tb6612_1', toPinId: 'STBY', color: '#10b981' },
    { id: 'w_uno_d5_pwma', fromComponentId: 'uno_1', fromPinId: 'D5', toComponentId: 'tb6612_1', toPinId: 'PWMA', color: '#a855f7' },
    { id: 'w_uno_d9_ain1', fromComponentId: 'uno_1', fromPinId: 'D9', toComponentId: 'tb6612_1', toPinId: 'AIN1', color: '#3b82f6' },
    { id: 'w_uno_d10_ain2', fromComponentId: 'uno_1', fromPinId: 'D10', toComponentId: 'tb6612_1', toPinId: 'AIN2', color: '#3b82f6' },
    { id: 'w_uno_d6_pwmb', fromComponentId: 'uno_1', fromPinId: 'D6', toComponentId: 'tb6612_1', toPinId: 'PWMB', color: '#a855f7' },
    { id: 'w_uno_d11_bin1', fromComponentId: 'uno_1', fromPinId: 'D11', toComponentId: 'tb6612_1', toPinId: 'BIN1', color: '#3b82f6' },
    { id: 'w_uno_a2_bin2', fromComponentId: 'uno_1', fromPinId: 'A2', toComponentId: 'tb6612_1', toPinId: 'BIN2', color: '#3b82f6' },

    // 5. 8-Channel Reflectance Sensor Signals to Arduino Uno Inputs
    { id: 'w_ir_d1_uno', fromComponentId: 'ir_array_1', fromPinId: 'D1', toComponentId: 'uno_1', toPinId: 'D2', color: '#00f0ff' },
    { id: 'w_ir_d2_uno', fromComponentId: 'ir_array_1', fromPinId: 'D2', toComponentId: 'uno_1', toPinId: 'D4', color: '#00f0ff' },
    { id: 'w_ir_d3_uno', fromComponentId: 'ir_array_1', fromPinId: 'D3', toComponentId: 'uno_1', toPinId: 'D7', color: '#00f0ff' },
    { id: 'w_ir_d4_uno', fromComponentId: 'ir_array_1', fromPinId: 'D4', toComponentId: 'uno_1', toPinId: 'D8', color: '#00f0ff' },
    { id: 'w_ir_d5_uno', fromComponentId: 'ir_array_1', fromPinId: 'D5', toComponentId: 'uno_1', toPinId: 'D12', color: '#00f0ff' },
    { id: 'w_ir_d6_uno', fromComponentId: 'ir_array_1', fromPinId: 'D6', toComponentId: 'uno_1', toPinId: 'D13', color: '#00f0ff' },
    { id: 'w_ir_d7_uno', fromComponentId: 'ir_array_1', fromPinId: 'D7', toComponentId: 'uno_1', toPinId: 'A0', color: '#00f0ff' },
    { id: 'w_ir_d8_uno', fromComponentId: 'ir_array_1', fromPinId: 'D8', toComponentId: 'uno_1', toPinId: 'A1', color: '#00f0ff' },

    // 6. TB6612 Motor Driver High-Current H-Bridge Outputs to N20 Motors
    { id: 'w_ao1', fromComponentId: 'tb6612_1', fromPinId: 'AO1', toComponentId: 'motor_left', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_ao2', fromComponentId: 'tb6612_1', fromPinId: 'AO2', toComponentId: 'motor_left', toPinId: 'M_NEG', color: '#1e293b' },
    { id: 'w_bo1', fromComponentId: 'tb6612_1', fromPinId: 'BO1', toComponentId: 'motor_right', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_bo2', fromComponentId: 'tb6612_1', fromPinId: 'BO2', toComponentId: 'motor_right', toPinId: 'M_NEG', color: '#1e293b' },
  ];

  return {
    schemaVersion: '1.0.0',
    name: 'Line Follower Robot — Arduino Uno + 8-Channel IR + TB6612FNG',
    board: 'arduino-uno-r3',
    code: LINE_FOLLOWER_SKETCH,
    components,
    wires,
    track: createDefaultTrack(),
    simulationConfig: {
      stepTimeSeconds: 0.010,
      nominalVoltage: 7.4,
      maxRPM: 300,
    },
  };
}

export function createStarterLineFollower(): StoredProject {
  const doc = createLineFollowerProject();
  return {
    id: 'starter_line_follower_robot',
    name: 'Line Follower Robot — Arduino Uno + 8-Channel IR + TB6612FNG',
    description: 'Autonomous PID line-following robot with ATmega328P Arduino Uno, 8-channel IR reflectance sensor array, TB6612FNG driver, and dual N20 gearmotors.',
    createdAt: 1718000300000,
    updatedAt: 1718000300000,
    isStarter: true,
    document: doc,
  };
}
