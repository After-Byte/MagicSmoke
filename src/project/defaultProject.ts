import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../circuit/components';
import { ProjectDocument } from './types';
import { WireConnection } from '../circuit/types';

export const CANONICAL_PIN_MAPPING = {
  PWMA: 25,
  AIN1: 26,
  AIN2: 27,
  PWMB: 14,
  BIN1: 18,
  BIN2: 19,
  STBY: 23,
} as const;

export const DEFAULT_SKETCH = `// MagicSmoke — ESP32 + TB6612FNG Differential Drive Robot
// Authoritative Pin Mapping:
//   PWMA = 25, AIN1 = 26, AIN2 = 27
//   PWMB = 14, BIN1 = 18, BIN2 = 19
//   STBY = 23

#include <Arduino.h>

constexpr int PWMA = ${CANONICAL_PIN_MAPPING.PWMA};
constexpr int AIN1 = ${CANONICAL_PIN_MAPPING.AIN1};
constexpr int AIN2 = ${CANONICAL_PIN_MAPPING.AIN2};

constexpr int PWMB = ${CANONICAL_PIN_MAPPING.PWMB};
constexpr int BIN1 = ${CANONICAL_PIN_MAPPING.BIN1};
constexpr int BIN2 = ${CANONICAL_PIN_MAPPING.BIN2};

constexpr int STBY = ${CANONICAL_PIN_MAPPING.STBY};

// Helper: Set a motor channel's direction and PWM duty
void setMotor(int pwmPin, int in1, int in2, int speed) {
  speed = constrain(speed, -255, 255);

  digitalWrite(in1, speed > 0 ? HIGH : LOW);
  digitalWrite(in2, speed < 0 ? HIGH : LOW);

  ledcWrite(pwmPin, abs(speed));
}

// Drive both logical channels
void drive(int leftSpeed, int rightSpeed) {
  setMotor(PWMA, AIN1, AIN2, leftSpeed);
  setMotor(PWMB, BIN1, BIN2, rightSpeed);
}

// Action helpers
void moveForward(int speed = 180) {
  drive(speed, speed);
}

void moveReverse(int speed = 180) {
  drive(-speed, -speed);
}

void stopMotors() {
  drive(0, 0);
}

void setup() {
  Serial.begin(115200);

  pinMode(AIN1, OUTPUT);
  pinMode(AIN2, OUTPUT);
  pinMode(BIN1, OUTPUT);
  pinMode(BIN2, OUTPUT);
  pinMode(STBY, OUTPUT);

  ledcAttach(PWMA, 20000, 8);
  ledcAttach(PWMB, 20000, 8);

  // Enable driver by pulling STBY HIGH
  digitalWrite(STBY, HIGH);
  Serial.println("MagicSmoke robot initialized. Starting maneuver cycle...");
}

void loop() {
  Serial.println("Action: Forward");
  moveForward(180);
  delay(2000);

  Serial.println("Action: Stop");
  stopMotors();
  delay(1000);

  Serial.println("Action: Reverse");
  moveReverse(180);
  delay(2000);

  Serial.println("Action: Stop");
  stopMotors();
  delay(1000);
}
`;

export function createDefaultProject(): ProjectDocument {
  const components = [
    createESP32DevKit('esp32_1', { x: 50, y: 70 }),
    createTB6612FNG('tb6612_1', { x: 340, y: 70 }),
    createBatteryPack('batt_1', { x: 340, y: 340 }),
    createN20Motor('motor_left', 'Left N20 Motor', { x: 620, y: 60 }),
    createN20Motor('motor_right', 'Right N20 Motor', { x: 620, y: 220 }),
  ];

  const wires: WireConnection[] = [
    // Common grounds
    { id: 'w_gnd_esp', fromComponentId: 'esp32_1', fromPinId: 'GND', toComponentId: 'tb6612_1', toPinId: 'GND', color: '#64748b' },
    { id: 'w_gnd_batt', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'tb6612_1', toPinId: 'GND', color: '#64748b' },

    // Power rails
    { id: 'w_vcc', fromComponentId: 'esp32_1', fromPinId: '3V3', toComponentId: 'tb6612_1', toPinId: 'VCC', color: '#06b6d4' },
    { id: 'w_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM', color: '#f59e0b' },

    // Control signals directly matching CANONICAL_PIN_MAPPING
    { id: 'w_stby', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.STBY}`, toComponentId: 'tb6612_1', toPinId: 'STBY', color: '#10b981' },
    { id: 'w_pwma', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.PWMA}`, toComponentId: 'tb6612_1', toPinId: 'PWMA', color: '#a855f7' },
    { id: 'w_ain1', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.AIN1}`, toComponentId: 'tb6612_1', toPinId: 'AIN1', color: '#3b82f6' },
    { id: 'w_ain2', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.AIN2}`, toComponentId: 'tb6612_1', toPinId: 'AIN2', color: '#3b82f6' },
    { id: 'w_pwmb', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.PWMB}`, toComponentId: 'tb6612_1', toPinId: 'PWMB', color: '#a855f7' },
    { id: 'w_bin1', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.BIN1}`, toComponentId: 'tb6612_1', toPinId: 'BIN1', color: '#3b82f6' },
    { id: 'w_bin2', fromComponentId: 'esp32_1', fromPinId: `GPIO${CANONICAL_PIN_MAPPING.BIN2}`, toComponentId: 'tb6612_1', toPinId: 'BIN2', color: '#3b82f6' },

    // Motor leads
    { id: 'w_ao1', fromComponentId: 'tb6612_1', fromPinId: 'AO1', toComponentId: 'motor_left', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_ao2', fromComponentId: 'tb6612_1', fromPinId: 'AO2', toComponentId: 'motor_left', toPinId: 'M_NEG', color: '#1e293b' },
    { id: 'w_bo1', fromComponentId: 'tb6612_1', fromPinId: 'BO1', toComponentId: 'motor_right', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_bo2', fromComponentId: 'tb6612_1', fromPinId: 'BO2', toComponentId: 'motor_right', toPinId: 'M_NEG', color: '#1e293b' },
  ];

  return {
    schemaVersion: '1.0.0',
    name: 'ESP32 2WD Robot with TB6612FNG',
    board: 'esp32-devkit-v1',
    code: DEFAULT_SKETCH,
    components,
    wires,
    simulationConfig: {
      nominalVoltage: 7.4,
      maxRPM: 300,
    },
  };
}
