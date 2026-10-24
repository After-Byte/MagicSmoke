import { ComponentInstance, PinType } from './types';

export function createESP32DevKit(id = 'esp32_1', pos = { x: 50, y: 70 }): ComponentInstance {
  return {
    id,
    type: 'ESP32_DEVKIT_V1',
    name: 'ESP32 DevKit V1',
    position: pos,
    dimensions: { width: 200, height: 235 },
    pins: {
      '3V3': { id: '3V3', name: '3V3', type: PinType.POWER_VCC, description: '3.3V Regulated Output', nominalVoltage: 3.3, offset: { x: 0, y: 50 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'System Ground', nominalVoltage: 0, offset: { x: 0, y: 80 } },
      'GPIO23': { id: 'GPIO23', name: 'D23 (STBY)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 23 (Motor Driver STBY)', offset: { x: 200, y: 50 } },
      'GPIO25': { id: 'GPIO25', name: 'D25 (PWMA)', type: PinType.PWM_OUTPUT, description: 'GPIO 25 (Left Motor Speed PWM)', offset: { x: 200, y: 75 } },
      'GPIO26': { id: 'GPIO26', name: 'D26 (AIN1)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 26 (Left Motor Dir 1)', offset: { x: 200, y: 100 } },
      'GPIO27': { id: 'GPIO27', name: 'D27 (AIN2)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 27 (Left Motor Dir 2)', offset: { x: 200, y: 125 } },
      'GPIO14': { id: 'GPIO14', name: 'D14 (PWMB)', type: PinType.PWM_OUTPUT, description: 'GPIO 14 (Right Motor Speed PWM)', offset: { x: 200, y: 150 } },
      'GPIO18': { id: 'GPIO18', name: 'D18 (BIN1)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 18 (Right Motor Dir 1)', offset: { x: 200, y: 175 } },
      'GPIO19': { id: 'GPIO19', name: 'D19 (BIN2)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 19 (Right Motor Dir 2)', offset: { x: 200, y: 200 } },
    },
  };
}

export function createArduinoUno(id = 'uno_1', pos = { x: 50, y: 70 }): ComponentInstance {
  return {
    id,
    type: 'ARDUINO_UNO_R3',
    name: 'Arduino Uno R3',
    position: pos,
    dimensions: { width: 220, height: 350 },
    pins: {
      // Left Power / Analog Header
      '5V': { id: '5V', name: '5V', type: PinType.POWER_VCC, description: '5V Regulated Output', nominalVoltage: 5.0, offset: { x: 0, y: 50 } },
      '3V3': { id: '3V3', name: '3.3V', type: PinType.POWER_VCC, description: '3.3V Regulated Output', nominalVoltage: 3.3, offset: { x: 0, y: 75 } },
      'GND1': { id: 'GND1', name: 'GND', type: PinType.GROUND, description: 'Power System Ground 1', nominalVoltage: 0, offset: { x: 0, y: 100 } },
      'GND2': { id: 'GND2', name: 'GND', type: PinType.GROUND, description: 'Power System Ground 2', nominalVoltage: 0, offset: { x: 0, y: 125 } },
      'VIN': { id: 'VIN', name: 'VIN', type: PinType.POWER_VM, description: 'External DC Input (7-12V)', nominalVoltage: 9.0, offset: { x: 0, y: 150 } },
      'A0': { id: 'A0', name: 'A0 (D14)', type: PinType.ANALOG_INPUT, description: 'Analog In 0 / Digital 14', offset: { x: 0, y: 185 } },
      'A1': { id: 'A1', name: 'A1 (D15)', type: PinType.ANALOG_INPUT, description: 'Analog In 1 / Digital 15', offset: { x: 0, y: 210 } },
      'A2': { id: 'A2', name: 'A2 (D16)', type: PinType.ANALOG_INPUT, description: 'Analog In 2 / Digital 16', offset: { x: 0, y: 235 } },
      'A3': { id: 'A3', name: 'A3 (D17)', type: PinType.ANALOG_INPUT, description: 'Analog In 3 / Digital 17', offset: { x: 0, y: 260 } },
      'A4': { id: 'A4', name: 'A4 (SDA)', type: PinType.DIGITAL_INPUT, description: 'Analog In 4 / I2C SDA', offset: { x: 0, y: 285 } },
      'A5': { id: 'A5', name: 'A5 (SCL)', type: PinType.DIGITAL_INPUT, description: 'Analog In 5 / I2C SCL', offset: { x: 0, y: 310 } },

      // Right Digital Header
      'D2': { id: 'D2', name: 'D2 (IR1)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 2 / IR Sensor 1 (Far Left)', offset: { x: 220, y: 35 } },
      'D3': { id: 'D3', name: 'D3 (STBY)', type: PinType.DIGITAL_OUTPUT, description: 'Digital Pin 3 / TB6612 STBY', offset: { x: 220, y: 60 } },
      'D4': { id: 'D4', name: 'D4 (IR2)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 4 / IR Sensor 2', offset: { x: 220, y: 85 } },
      'D5': { id: 'D5', name: 'D5 (PWMA)', type: PinType.PWM_OUTPUT, description: 'Digital Pin 5 (~PWM Timer 0B, Left Speed)', offset: { x: 220, y: 110 } },
      'D6': { id: 'D6', name: 'D6 (PWMB)', type: PinType.PWM_OUTPUT, description: 'Digital Pin 6 (~PWM Timer 0A, Right Speed)', offset: { x: 220, y: 135 } },
      'D7': { id: 'D7', name: 'D7 (IR3)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 7 / IR Sensor 3', offset: { x: 220, y: 160 } },
      'D8': { id: 'D8', name: 'D8 (IR4)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 8 / IR Sensor 4 (Center L)', offset: { x: 220, y: 185 } },
      'D9': { id: 'D9', name: 'D9 (AIN1)', type: PinType.DIGITAL_OUTPUT, description: 'Digital Pin 9 (Left Motor Dir 1)', offset: { x: 220, y: 210 } },
      'D10': { id: 'D10', name: 'D10 (AIN2)', type: PinType.DIGITAL_OUTPUT, description: 'Digital Pin 10 (Left Motor Dir 2)', offset: { x: 220, y: 235 } },
      'D11': { id: 'D11', name: 'D11 (BIN1)', type: PinType.DIGITAL_OUTPUT, description: 'Digital Pin 11 (Right Motor Dir 1)', offset: { x: 220, y: 260 } },
      'D12': { id: 'D12', name: 'D12 (IR5)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 12 / IR Sensor 5 (Center R)', offset: { x: 220, y: 285 } },
      'D13': { id: 'D13', name: 'D13 (IR6)', type: PinType.DIGITAL_INPUT, description: 'Digital Pin 13 / IR Sensor 6', offset: { x: 220, y: 310 } },
    },
  };
}

export function createIRSensorArray8CH(id = 'ir_array_1', pos = { x: 50, y: 440 }): ComponentInstance {
  return {
    id,
    type: 'IR_SENSOR_ARRAY_8CH',
    name: '8-Channel Digital IR Sensor Array',
    position: pos,
    dimensions: { width: 220, height: 210 },
    pins: {
      'VCC': { id: 'VCC', name: 'VCC (5V)', type: PinType.POWER_VCC, description: '5V Power Supply Input', nominalVoltage: 5.0, offset: { x: 0, y: 35 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Common Ground Reference (0V)', nominalVoltage: 0, offset: { x: 0, y: 65 } },
      'D1': { id: 'D1', name: 'D1 (Far Left)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 1 (Far Left)', offset: { x: 220, y: 25 } },
      'D2': { id: 'D2', name: 'D2', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 2', offset: { x: 220, y: 48 } },
      'D3': { id: 'D3', name: 'D3', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 3', offset: { x: 220, y: 71 } },
      'D4': { id: 'D4', name: 'D4 (Center L)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 4 (Center Left)', offset: { x: 220, y: 94 } },
      'D5': { id: 'D5', name: 'D5 (Center R)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 5 (Center Right)', offset: { x: 220, y: 117 } },
      'D6': { id: 'D6', name: 'D6', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 6', offset: { x: 220, y: 140 } },
      'D7': { id: 'D7', name: 'D7', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 7', offset: { x: 220, y: 163 } },
      'D8': { id: 'D8', name: 'D8 (Far Right)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 8 (Far Right)', offset: { x: 220, y: 186 } },
    },
  };
}

export function createTB6612FNG(id = 'tb6612_1', pos = { x: 340, y: 70 }): ComponentInstance {
  return {
    id,
    type: 'TB6612FNG',
    name: 'TB6612FNG Motor Driver',
    position: pos,
    dimensions: { width: 180, height: 295 },
    pins: {
      // Left / Control & Power side
      'VM': { id: 'VM', name: 'VM', type: PinType.POWER_VM, description: 'Motor Power Supply (4.5V-15V)', offset: { x: 0, y: 45 } },
      'VCC': { id: 'VCC', name: 'VCC', type: PinType.POWER_VCC, description: 'Logic Power (2.7V-5.5V)', offset: { x: 0, y: 70 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Common Ground', offset: { x: 0, y: 95 } },
      'PWMA': { id: 'PWMA', name: 'PWMA', type: PinType.DIGITAL_INPUT, description: 'Motor A Speed PWM', offset: { x: 0, y: 120 } },
      'AIN1': { id: 'AIN1', name: 'AIN1', type: PinType.DIGITAL_INPUT, description: 'Motor A In 1', offset: { x: 0, y: 145 } },
      'AIN2': { id: 'AIN2', name: 'AIN2', type: PinType.DIGITAL_INPUT, description: 'Motor A In 2', offset: { x: 0, y: 170 } },
      'STBY': { id: 'STBY', name: 'STBY', type: PinType.DIGITAL_INPUT, description: 'Standby Pin (Active High)', offset: { x: 0, y: 195 } },
      'BIN1': { id: 'BIN1', name: 'BIN1', type: PinType.DIGITAL_INPUT, description: 'Motor B In 1', offset: { x: 0, y: 220 } },
      'BIN2': { id: 'BIN2', name: 'BIN2', type: PinType.DIGITAL_INPUT, description: 'Motor B In 2', offset: { x: 0, y: 245 } },
      'PWMB': { id: 'PWMB', name: 'PWMB', type: PinType.DIGITAL_INPUT, description: 'Motor B Speed PWM', offset: { x: 0, y: 270 } },

      // Right / Motor Output side
      'AO1': { id: 'AO1', name: 'AO1', type: PinType.MOTOR_OUT, description: 'Motor A Output 1 (+)', offset: { x: 180, y: 120 } },
      'AO2': { id: 'AO2', name: 'AO2', type: PinType.MOTOR_OUT, description: 'Motor A Output 2 (-)', offset: { x: 180, y: 145 } },
      'BO1': { id: 'BO1', name: 'BO1', type: PinType.MOTOR_OUT, description: 'Motor B Output 1 (+)', offset: { x: 180, y: 220 } },
      'BO2': { id: 'BO2', name: 'BO2', type: PinType.MOTOR_OUT, description: 'Motor B Output 2 (-)', offset: { x: 180, y: 245 } },
    },
  };
}

export function createBatteryPack(id = 'batt_1', pos = { x: 340, y: 395 }): ComponentInstance {
  return {
    id,
    type: 'BATTERY_PACK',
    name: '7.4V LiPo Battery Pack',
    position: pos,
    dimensions: { width: 140, height: 95 },
    pins: {
      'POS': { id: 'POS', name: 'V+ (7.4V)', type: PinType.POWER_VM, description: '+7.4V Power Output', nominalVoltage: 7.4, offset: { x: 140, y: 45 } },
      'NEG': { id: 'NEG', name: 'GND (-)', type: PinType.GROUND, description: 'Battery Negative Ground', nominalVoltage: 0, offset: { x: 140, y: 75 } },
    },
  };
}

export function createN20Motor(id: string, name: string, pos: { x: number; y: number }): ComponentInstance {
  return {
    id,
    type: 'N20_MOTOR',
    name,
    position: pos,
    dimensions: { width: 140, height: 95 },
    pins: {
      'M_POS': { id: 'M_POS', name: 'IN+', type: PinType.MOTOR_OUT, description: 'Motor Terminal +', offset: { x: 0, y: 45 } },
      'M_NEG': { id: 'M_NEG', name: 'IN-', type: PinType.MOTOR_OUT, description: 'Motor Terminal -', offset: { x: 0, y: 75 } },
    },
  };
}

export function createGroundBus(id = 'gnd_bus_1', pos = { x: 340, y: 510 }): ComponentInstance {
  return {
    id,
    type: 'GROUND_BUS',
    name: 'Common Ground Bus',
    position: pos,
    dimensions: { width: 140, height: 75 },
    pins: {
      'GND1': { id: 'GND1', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 1', nominalVoltage: 0, offset: { x: 25, y: 55 } },
      'GND2': { id: 'GND2', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 2', nominalVoltage: 0, offset: { x: 55, y: 55 } },
      'GND3': { id: 'GND3', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 3', nominalVoltage: 0, offset: { x: 85, y: 55 } },
      'GND4': { id: 'GND4', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 4', nominalVoltage: 0, offset: { x: 115, y: 55 } },
    },
  };
}

export function createHCSR04Sensor(id = 'sonar_1', pos = { x: 620, y: 380 }): ComponentInstance {
  return {
    id,
    type: 'HC_SR04',
    name: 'HC-SR04 Ultrasonic Sensor',
    position: pos,
    dimensions: { width: 170, height: 110 },
    pins: {
      'VCC': { id: 'VCC', name: 'VCC (5V)', type: PinType.POWER_VCC, description: '5V Power Supply Input', nominalVoltage: 5.0, offset: { x: 0, y: 35 } },
      'TRIG': { id: 'TRIG', name: 'TRIG', type: PinType.DIGITAL_INPUT, description: 'Ultrasonic Trigger Input (10µs pulse)', offset: { x: 0, y: 60 } },
      'ECHO': { id: 'ECHO', name: 'ECHO', type: PinType.DIGITAL_OUTPUT, description: 'Ultrasonic Echo Output Pulse', offset: { x: 0, y: 85 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'System Ground (0V)', nominalVoltage: 0, offset: { x: 170, y: 60 } },
    },
  };
}
