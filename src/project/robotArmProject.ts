import {
  createArduinoUno,
  createMG996RServo,
  createSG90Servo,
  createServoPowerSupply,
  createGroundBus,
} from '../circuit/components';
import { ProjectDocument } from './types';
import { WireConnection } from '../circuit/types';
import { StoredProject } from './projectStorage';
import { createDefaultRobotArmData } from '../robot/arm/RobotArmModel';
import { ServoJointMapping } from '../robot/arm/ServoModels';

export const ROBOT_ARM_PIN_MAPPING = {
  BASE_SERVO_PIN: 3,     // Arduino Uno D3 (PWM Timer 2B)
  SHOULDER_SERVO_PIN: 5, // Arduino Uno D5 (PWM Timer 0B)
  ELBOW_SERVO_PIN: 6,    // Arduino Uno D6 (PWM Timer 0A)
  WRIST_SERVO_PIN: 9,    // Arduino Uno D9 (PWM Timer 1A)
  GRIPPER_SERVO_PIN: 10, // Arduino Uno D10 (PWM Timer 1B)
} as const;

export const ROBOT_ARM_SERVO_MAPPINGS: ServoJointMapping[] = [
  { joint: 'base', servoComponentId: 'servo_base', model: 'MG996R', signalPinNumber: 3 },
  { joint: 'shoulder', servoComponentId: 'servo_shoulder', model: 'MG996R', signalPinNumber: 5 },
  { joint: 'elbow', servoComponentId: 'servo_elbow', model: 'MG996R', signalPinNumber: 6 },
  { joint: 'wrist', servoComponentId: 'servo_wrist', model: 'SG90', signalPinNumber: 9 },
  { joint: 'gripper', servoComponentId: 'servo_gripper', model: 'SG90', signalPinNumber: 10 },
];

export const ROBOT_ARM_SKETCH = `// MagicSmoke — 5-Axis Articulated Servo Robot Arm
// Hardware: Arduino Uno R3 + 3x MG996R Servos + 2x SG90 Servos + External 6V 3A PSU
// Controls: Base (D3), Shoulder (D5), Elbow (D6), Wrist (D9), Gripper (D10)

#include <Arduino.h>

constexpr int PIN_BASE     = ${ROBOT_ARM_PIN_MAPPING.BASE_SERVO_PIN};
constexpr int PIN_SHOULDER = ${ROBOT_ARM_PIN_MAPPING.SHOULDER_SERVO_PIN};
constexpr int PIN_ELBOW    = ${ROBOT_ARM_PIN_MAPPING.ELBOW_SERVO_PIN};
constexpr int PIN_WRIST    = ${ROBOT_ARM_PIN_MAPPING.WRIST_SERVO_PIN};
constexpr int PIN_GRIPPER  = ${ROBOT_ARM_PIN_MAPPING.GRIPPER_SERVO_PIN};

// Current joint command angles (degrees)
int angleBase     = 90;
int angleShoulder = 60;
int angleElbow    = 75;
int angleWrist    = 90;
int angleGripper  = 20;

void setup() {
  Serial.begin(115200);
  Serial.println("[ROBOT_ARM] Initializing 5-axis servo controller...");

  pinMode(PIN_BASE, OUTPUT);
  pinMode(PIN_SHOULDER, OUTPUT);
  pinMode(PIN_ELBOW, OUTPUT);
  pinMode(PIN_WRIST, OUTPUT);
  pinMode(PIN_GRIPPER, OUTPUT);

  // Set initial home pose
  setJoints(90, 60, 75, 90, 20);
  Serial.println("[ROBOT_ARM] Home position calibrated. Ready for motion commands.");
}

void loop() {
  // Demonstration: Pick and Place trajectory sequence
  Serial.println("[SEQUENCE] Pose 1: Reach Forward");
  smoothMove(90, 40, 45, 85, 35, 1200);
  delay(500);

  Serial.println("[SEQUENCE] Pose 2: Pick Low");
  smoothMove(90, 28, 25, 55, 12, 1000);
  delay(500);

  Serial.println("[SEQUENCE] Grip Object (Close Jaws)");
  smoothMove(90, 28, 25, 55, 5, 400);
  delay(400);

  Serial.println("[SEQUENCE] Pose 3: Lift High");
  smoothMove(90, 105, 85, 90, 5, 1200);
  delay(500);

  Serial.println("[SEQUENCE] Pose 4: Sweep Left");
  smoothMove(45, 55, 65, 85, 5, 1000);
  delay(400);

  Serial.println("[SEQUENCE] Release Object (Open Jaws)");
  smoothMove(45, 55, 65, 85, 30, 400);
  delay(500);

  Serial.println("[SEQUENCE] Return to Home");
  smoothMove(90, 60, 75, 90, 20, 1500);
  delay(1000);
}

void setJoints(int b, int s, int e, int w, int g) {
  angleBase = b;
  angleShoulder = s;
  angleElbow = e;
  angleWrist = w;
  angleGripper = g;

  analogWrite(PIN_BASE, map(b, 0, 180, 25, 125));
  analogWrite(PIN_SHOULDER, map(s, 0, 180, 25, 125));
  analogWrite(PIN_ELBOW, map(e, 0, 180, 25, 125));
  analogWrite(PIN_WRIST, map(w, 0, 180, 25, 125));
  analogWrite(PIN_GRIPPER, map(g, 0, 40, 25, 125));
}

void smoothMove(int targetB, int targetS, int targetE, int targetW, int targetG, int durationMs) {
  int steps = 20;
  int delayPerStep = durationMs / steps;
  float startB = angleBase;
  float startS = angleShoulder;
  float startE = angleElbow;
  float startW = angleWrist;
  float startG = angleGripper;

  for (int i = 1; i <= steps; i++) {
    float t = (float)i / steps;
    int b = startB + (targetB - startB) * t;
    int s = startS + (targetS - startS) * t;
    int e = startE + (targetE - startE) * t;
    int w = startW + (targetW - startW) * t;
    int g = startG + (targetG - startG) * t;
    setJoints(b, s, e, w, g);
    delay(delayPerStep);
  }
}
`;

export function createRobotArmProject(): ProjectDocument {
  const components = [
    // 1. Arduino Uno R3 Controller
    createArduinoUno('uno_1', { x: 50, y: 70 }),

    // 2. Heavy-Duty MG996R Servos for High Load Axis
    createMG996RServo('servo_base', 'Base MG996R Servo', { x: 420, y: 60 }),
    createMG996RServo('servo_shoulder', 'Shoulder MG996R Servo', { x: 420, y: 200 }),
    createMG996RServo('servo_elbow', 'Elbow MG996R Servo', { x: 420, y: 340 }),

    // 3. Lightweight SG90 Micro Servos for Wrist & Gripper
    createSG90Servo('servo_wrist', 'Wrist SG90 Servo', { x: 630, y: 100 }),
    createSG90Servo('servo_gripper', 'Gripper SG90 Servo', { x: 630, y: 240 }),

    // 4. External Dedicated 6V 3A Power Supply (Prevents Brownouts!)
    createServoPowerSupply('psu_servos', { x: 50, y: 460 }),

    // 5. Common Ground Bus Terminal
    createGroundBus('gnd_bus_1', { x: 300, y: 490 }),
  ];

  const wires: WireConnection[] = [
    // --- Signal Wiring (Arduino PWM to Servo SIG) ---
    { id: 'w_sig_base', fromComponentId: 'uno_1', fromPinId: 'D3', toComponentId: 'servo_base', toPinId: 'SIG', color: '#a855f7' },
    { id: 'w_sig_shoulder', fromComponentId: 'uno_1', fromPinId: 'D5', toComponentId: 'servo_shoulder', toPinId: 'SIG', color: '#a855f7' },
    { id: 'w_sig_elbow', fromComponentId: 'uno_1', fromPinId: 'D6', toComponentId: 'servo_elbow', toPinId: 'SIG', color: '#a855f7' },
    { id: 'w_sig_wrist', fromComponentId: 'uno_1', fromPinId: 'D9', toComponentId: 'servo_wrist', toPinId: 'SIG', color: '#a855f7' },
    { id: 'w_sig_gripper', fromComponentId: 'uno_1', fromPinId: 'D10', toComponentId: 'servo_gripper', toPinId: 'SIG', color: '#a855f7' },

    // --- High-Current Power Rail (+6V from External PSU to Servos) ---
    { id: 'w_psu_base', fromComponentId: 'psu_servos', fromPinId: 'POS', toComponentId: 'servo_base', toPinId: 'VCC', color: '#f59e0b' },
    { id: 'w_psu_shoulder', fromComponentId: 'psu_servos', fromPinId: 'POS', toComponentId: 'servo_shoulder', toPinId: 'VCC', color: '#f59e0b' },
    { id: 'w_psu_elbow', fromComponentId: 'psu_servos', fromPinId: 'POS', toComponentId: 'servo_elbow', toPinId: 'VCC', color: '#f59e0b' },
    { id: 'w_psu_wrist', fromComponentId: 'psu_servos', fromPinId: 'POS', toComponentId: 'servo_wrist', toPinId: 'VCC', color: '#f59e0b' },
    { id: 'w_psu_gripper', fromComponentId: 'psu_servos', fromPinId: 'POS', toComponentId: 'servo_gripper', toPinId: 'VCC', color: '#f59e0b' },

    // --- Common Ground Distribution ---
    // Connect External PSU GND to Common Ground Bus
    { id: 'w_gnd_psu', fromComponentId: 'psu_servos', fromPinId: 'NEG', toComponentId: 'gnd_bus_1', toPinId: 'GND1', color: '#64748b' },
    // Connect Arduino GND to Common Ground Bus
    { id: 'w_gnd_uno', fromComponentId: 'uno_1', fromPinId: 'GND1', toComponentId: 'gnd_bus_1', toPinId: 'GND2', color: '#64748b' },
    // Connect Servos to Common Ground
    { id: 'w_gnd_base', fromComponentId: 'servo_base', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND3', color: '#64748b' },
    { id: 'w_gnd_shoulder', fromComponentId: 'servo_shoulder', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND4', color: '#64748b' },
    { id: 'w_gnd_elbow', fromComponentId: 'servo_elbow', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND4', color: '#64748b' },
    { id: 'w_gnd_wrist', fromComponentId: 'servo_wrist', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND3', color: '#64748b' },
    { id: 'w_gnd_gripper', fromComponentId: 'servo_gripper', fromPinId: 'GND', toComponentId: 'gnd_bus_1', toPinId: 'GND3', color: '#64748b' },
  ];

  return {
    schemaVersion: '1.0.0',
    name: '5-Axis Servo Robotic Arm',
    board: 'arduino-uno-r3',
    code: ROBOT_ARM_SKETCH,
    components,
    wires,
    robotArm: createDefaultRobotArmData(),
    simulationConfig: {
      nominalVoltage: 6.0,
      stepTimeSeconds: 0.016,
    },
  };
}

export function createStarterRobotArm(): StoredProject {
  const doc = createRobotArmProject();
  return {
    id: 'starter_servo_robot_arm',
    name: '5-Axis Servo Robotic Arm',
    description: 'Articulated 5-axis servo-powered robotic arm with rotating base, shoulder, elbow, wrist pitch, and two-finger parallel gripper.',
    createdAt: 1718000300000,
    updatedAt: 1718000300000,
    isStarter: true,
    document: doc,
  };
}
