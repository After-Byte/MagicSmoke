import { ComponentInstance, PinType } from './types';

export function createESP32DevKit(id = 'esp32_1', pos = { x: 50, y: 100 }): ComponentInstance {
  return {
    id,
    type: 'ESP32_DEVKIT_V1',
    name: 'ESP32 DevKit V1',
    position: pos,
    pins: {
      '3V3': { id: '3V3', name: '3V3', type: PinType.POWER_VCC, description: '3.3V Logic Rail Out', nominalVoltage: 3.3, offset: { x: 0, y: 20 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Ground', nominalVoltage: 0, offset: { x: 0, y: 40 } },
      'GPIO23': { id: 'GPIO23', name: 'D23', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 23 (STBY)', offset: { x: 140, y: 20 } },
      'GPIO25': { id: 'GPIO25', name: 'D25', type: PinType.PWM_OUTPUT, description: 'GPIO 25 (PWMA)', offset: { x: 140, y: 40 } },
      'GPIO26': { id: 'GPIO26', name: 'D26', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 26 (AIN1)', offset: { x: 140, y: 60 } },
      'GPIO27': { id: 'GPIO27', name: 'D27', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 27 (AIN2)', offset: { x: 140, y: 80 } },
      'GPIO14': { id: 'GPIO14', name: 'D14', type: PinType.PWM_OUTPUT, description: 'GPIO 14 (PWMB)', offset: { x: 140, y: 100 } },
      'GPIO18': { id: 'GPIO18', name: 'D18', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 18 (BIN1)', offset: { x: 140, y: 120 } },
      'GPIO19': { id: 'GPIO19', name: 'D19', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 19 (BIN2)', offset: { x: 140, y: 140 } },
    },
  };
}

export function createTB6612FNG(id = 'tb6612_1', pos = { x: 260, y: 100 }): ComponentInstance {
  return {
    id,
    type: 'TB6612FNG',
    name: 'TB6612FNG Motor Driver',
    position: pos,
    pins: {
      // Left / Control side
      'VM': { id: 'VM', name: 'VM', type: PinType.POWER_VM, description: 'Motor Power Supply (4.5V-15V)', offset: { x: 0, y: 20 } },
      'VCC': { id: 'VCC', name: 'VCC', type: PinType.POWER_VCC, description: 'Logic Power (2.7V-5.5V)', offset: { x: 0, y: 40 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Common Ground', offset: { x: 0, y: 60 } },
      'PWMA': { id: 'PWMA', name: 'PWMA', type: PinType.DIGITAL_INPUT, description: 'Motor A Speed PWM', offset: { x: 0, y: 80 } },
      'AIN1': { id: 'AIN1', name: 'AIN1', type: PinType.DIGITAL_INPUT, description: 'Motor A In 1', offset: { x: 0, y: 100 } },
      'AIN2': { id: 'AIN2', name: 'AIN2', type: PinType.DIGITAL_INPUT, description: 'Motor A In 2', offset: { x: 0, y: 120 } },
      'STBY': { id: 'STBY', name: 'STBY', type: PinType.DIGITAL_INPUT, description: 'Standby Pin (Active High)', offset: { x: 0, y: 140 } },
      'BIN1': { id: 'BIN1', name: 'BIN1', type: PinType.DIGITAL_INPUT, description: 'Motor B In 1', offset: { x: 0, y: 160 } },
      'BIN2': { id: 'BIN2', name: 'BIN2', type: PinType.DIGITAL_INPUT, description: 'Motor B In 2', offset: { x: 0, y: 180 } },
      'PWMB': { id: 'PWMB', name: 'PWMB', type: PinType.DIGITAL_INPUT, description: 'Motor B Speed PWM', offset: { x: 0, y: 200 } },

      // Right / Output side
      'AO1': { id: 'AO1', name: 'AO1', type: PinType.MOTOR_OUT, description: 'Motor A Output 1', offset: { x: 130, y: 60 } },
      'AO2': { id: 'AO2', name: 'AO2', type: PinType.MOTOR_OUT, description: 'Motor A Output 2', offset: { x: 130, y: 80 } },
      'BO1': { id: 'BO1', name: 'BO1', type: PinType.MOTOR_OUT, description: 'Motor B Output 1', offset: { x: 130, y: 140 } },
      'BO2': { id: 'BO2', name: 'BO2', type: PinType.MOTOR_OUT, description: 'Motor B Output 2', offset: { x: 130, y: 160 } },
    },
  };
}

export function createBatteryPack(id = 'batt_1', pos = { x: 260, y: 10 }): ComponentInstance {
  return {
    id,
    type: 'BATTERY_PACK',
    name: '7.4V LiPo Battery Pack',
    position: pos,
    pins: {
      'POS': { id: 'POS', name: 'V+', type: PinType.POWER_VM, description: '+7.4V Power', nominalVoltage: 7.4, offset: { x: 90, y: 20 } },
      'NEG': { id: 'NEG', name: 'GND', type: PinType.GROUND, description: 'Battery Ground', nominalVoltage: 0, offset: { x: 90, y: 40 } },
    },
  };
}

export function createN20Motor(id: string, name: string, pos: { x: number; y: number }): ComponentInstance {
  return {
    id,
    type: 'N20_MOTOR',
    name,
    position: pos,
    pins: {
      'M_POS': { id: 'M_POS', name: 'IN+', type: PinType.MOTOR_OUT, description: 'Motor Lead +', offset: { x: 0, y: 25 } },
      'M_NEG': { id: 'M_NEG', name: 'IN-', type: PinType.MOTOR_OUT, description: 'Motor Lead -', offset: { x: 0, y: 45 } },
    },
  };
}
