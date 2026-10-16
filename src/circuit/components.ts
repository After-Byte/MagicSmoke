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

