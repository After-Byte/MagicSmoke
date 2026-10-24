import { ComponentInstance } from './types';
import {
  createESP32DevKit,
  createArduinoUno,
  createTB6612FNG,
  createN20Motor,
  createBatteryPack,
  createGroundBus,
  createHCSR04Sensor,
  createIRSensorArray8CH,
} from './components';

export type CatalogCategory = 'all' | 'mcu' | 'driver' | 'actuator' | 'power' | 'sensor' | 'passive';

export interface CatalogItem {
  id: string;
  type: ComponentInstance['type'];
  name: string;
  category: CatalogCategory;
  description: string;
  specs: {
    voltage?: string;
    current?: string;
    interfaces?: string;
    dimensions?: string;
  };
  simulationStatus: 'fully_simulated' | 'schematic_only';
  instantiate: (customId?: string, pos?: { x: number; y: number }) => ComponentInstance;
}

export const COMPONENT_CATALOG: CatalogItem[] = [
  {
    id: 'catalog_arduino_uno',
    type: 'ARDUINO_UNO_R3',
    name: 'Arduino Uno R3',
    category: 'mcu',
    description: 'ATmega328P 8-bit AVR RISC microcontroller board with 14 digital I/O pins (6 PWM), 6 analog inputs, and 16MHz crystal.',
    specs: {
      voltage: '5V Logic / 7-12V Vin',
      interfaces: '14 GPIO (6 PWM), 6 ADC, UART, SPI, I2C',
      dimensions: '220 × 350 px',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createArduinoUno(customId || `uno_${Date.now()}`, pos || { x: 50, y: 70 }),
  },
  {
    id: 'catalog_esp32',
    type: 'ESP32_DEVKIT_V1',
    name: 'ESP32 DevKit V1',
    category: 'mcu',
    description: 'Tensilica Xtensa Dual-Core 32-bit MCU with native FreeRTOS, hardware PWM (LEDC), GPIOs, and serial monitor.',
    specs: {
      voltage: '3.3V Logic / 5V USB',
      interfaces: 'GPIO, PWM (20kHz), Serial (115200)',
      dimensions: '200 × 235 px',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createESP32DevKit(customId || `esp32_${Date.now()}`, pos || { x: 60, y: 80 }),
  },
  {
    id: 'catalog_ir_array',
    type: 'IR_SENSOR_ARRAY_8CH',
    name: '8-Channel Digital IR Sensor Array',
    category: 'sensor',
    description: 'Precision 8-channel infrared reflectance array (TCRT5000/QTR-8RC compatible) for line following with active digital outputs.',
    specs: {
      voltage: '3.3V–5.0V VCC',
      current: '100mA total IR array',
      interfaces: '8 × Digital Channels (D1-D8), VCC, GND',
      dimensions: '220 × 210 px',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createIRSensorArray8CH(customId || `ir_array_${Date.now()}`, pos || { x: 50, y: 440 }),
  },
  {
    id: 'catalog_tb6612fng',
    type: 'TB6612FNG',
    name: 'TB6612FNG Motor Driver',
    category: 'driver',
    description: 'Dual H-bridge MOSFET driver IC for bi-directional speed control of 2 DC motors up to 1.2A continuous (3.2A peak).',
    specs: {
      voltage: 'VM 4.5V–15V, VCC 2.7V–5.5V',
      current: '1.2A continuous / channel',
      interfaces: 'PWMA, PWMB, AIN1/2, BIN1/2, STBY',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createTB6612FNG(customId || `tb6612_${Date.now()}`, pos || { x: 300, y: 80 }),
  },
  {
    id: 'catalog_n20_motor',
    type: 'N20_MOTOR',
    name: 'N20 Micro Metal Gearmotor',
    category: 'actuator',
    description: 'High-torque micro DC gearmotor with all-metal spur gearbox and physical electro-mechanical model.',
    specs: {
      voltage: '6.0V–12.0V',
      current: '60mA no-load, 650mA stall',
      interfaces: 'Dual terminal (IN+ / IN-)',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createN20Motor(
        customId || `motor_${Date.now()}`,
        'N20 DC Gearmotor',
        pos || { x: 550, y: 100 }
      ),
  },
  {
    id: 'catalog_battery_pack',
    type: 'BATTERY_PACK',
    name: '7.4V LiPo Battery Pack (2S)',
    category: 'power',
    description: 'Rechargeable 2S Lithium Polymer battery delivering 7.4V nominal voltage for high-current motor drive rails.',
    specs: {
      voltage: '7.4V nominal (8.4V max)',
      current: '1500mAh 20C rating',
      interfaces: 'V+ (POS) & GND (NEG)',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createBatteryPack(customId || `batt_${Date.now()}`, pos || { x: 300, y: 400 }),
  },
  {
    id: 'catalog_ground_bus',
    type: 'GROUND_BUS',
    name: 'Common Ground Bus (4-Port)',
    category: 'passive',
    description: 'Shared 0V ground distribution terminal ensuring low-impedance common ground reference between logic and power.',
    specs: {
      voltage: '0.0V System Ground',
      interfaces: '4 × Common GND Nodes',
    },
    simulationStatus: 'fully_simulated',
    instantiate: (customId, pos) =>
      createGroundBus(customId || `gnd_bus_${Date.now()}`, pos || { x: 300, y: 520 }),
  },
  {
    id: 'catalog_hc_sr04',
    type: 'HC_SR04',
    name: 'HC-SR04 Ultrasonic Distance Sensor',
    category: 'sensor',
    description: 'Acoustic distance measuring transceiver providing 2cm–400cm non-contact distance ranging at 40kHz.',
    specs: {
      voltage: '5.0V VCC',
      current: '15mA active',
      interfaces: 'TRIG (In), ECHO (Out), VCC, GND',
    },
    simulationStatus: 'schematic_only',
    instantiate: (customId, pos) =>
      createHCSR04Sensor(customId || `sonar_${Date.now()}`, pos || { x: 550, y: 360 }),
  },
];
