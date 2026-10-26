import { ComponentInstance, PinType, PinDefinition } from './types';
import {
  analog,
  i2c,
  spi,
  usart,
  GND,
  VCC,
  PWM,
} from './wokwi/wokwiElements';
import { WOKWI_TO_MAGIC_PIN_MAP, ESP32_GPIO_TO_WOKWI_MAP } from './wokwi/pinAliasMapper';

export function createESP32DevKit(id = 'esp32_1', pos = { x: 50, y: 70 }): ComponentInstance {
  // Wokwi ESP32 DevKit V1 authentic physical footprint:
  // Local SVG viewBox: 0 0 107 201. At 1.5x scale: width = 160.5, height = 301.5.
  // Physical pitch: 2.54mm header pitch with gold castellated solder pads on left (x = 7.5) and right (x = 152).
  const espPins: Record<string, PinDefinition> = {
    // Left Column (x = 7.5; normal exits left -X)
    'EN': { id: 'EN', name: 'EN (RST)', type: PinType.DIGITAL_INPUT, description: 'Enable / Active-Low Reset (CHIP_PU)', offset: { x: 7.5, y: 36 }, side: 'left', exitNormal: { x: -1, y: 0 }, aliases: ['EN', 'RST'] },
    'VP': { id: 'VP', name: 'VP (D36)', type: PinType.ANALOG_INPUT, description: 'Sensor VP (GPIO 36 / ADC1_CH0)', nominalVoltage: 3.3, offset: { x: 7.5, y: 51 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(0)], aliases: ['VP', 'D36', 'GPIO36'] },
    'VN': { id: 'VN', name: 'VN (D39)', type: PinType.ANALOG_INPUT, description: 'Sensor VN (GPIO 39 / ADC1_CH3)', nominalVoltage: 3.3, offset: { x: 7.5, y: 66 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(3)], aliases: ['VN', 'D39', 'GPIO39'] },
    'D34': { id: 'D34', name: 'D34', type: PinType.ANALOG_INPUT, description: 'GPIO 34 (ADC1_CH6 / Input Only)', offset: { x: 7.5, y: 79.6 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(6)], aliases: ['D34', 'GPIO34'] },
    'D35': { id: 'D35', name: 'D35', type: PinType.ANALOG_INPUT, description: 'GPIO 35 (ADC1_CH7 / Input Only)', offset: { x: 7.5, y: 94.4 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(7)], aliases: ['D35', 'GPIO35'] },
    'D32': { id: 'D32', name: 'D32', type: PinType.PWM_OUTPUT, description: 'GPIO 32 (ADC1_CH4 / Touch 9 / PWM)', offset: { x: 7.5, y: 108.3 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(4), PWM()], aliases: ['D32', 'GPIO32'] },
    'D33': { id: 'D33', name: 'D33', type: PinType.PWM_OUTPUT, description: 'GPIO 33 (ADC1_CH5 / Touch 8 / PWM)', offset: { x: 7.5, y: 122.6 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [analog(5), PWM()], aliases: ['D33', 'GPIO33'] },
    'D25': { id: 'D25', name: 'D25 (PWMA)', type: PinType.PWM_OUTPUT, description: 'GPIO 25 (Left Motor Speed PWM / DAC1)', offset: { x: 7.5, y: 137 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [PWM()], aliases: ['D25', 'GPIO25'] },
    'D26': { id: 'D26', name: 'D26 (AIN1)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 26 (Left Motor Dir 1 / DAC2)', offset: { x: 7.5, y: 151.5 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [PWM()], aliases: ['D26', 'GPIO26'] },
    'D27': { id: 'D27', name: 'D27 (AIN2)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 27 (Left Motor Dir 2 / Touch 7)', offset: { x: 7.5, y: 166.2 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [PWM()], aliases: ['D27', 'GPIO27'] },
    'D14': { id: 'D14', name: 'D14 (PWMB)', type: PinType.PWM_OUTPUT, description: 'GPIO 14 (Right Motor Speed PWM / HSPI_CLK)', offset: { x: 7.5, y: 180 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [spi('SCK', 0), PWM()], aliases: ['D14', 'GPIO14'] },
    'D12': { id: 'D12', name: 'D12', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 12 (HSPI_MISO / Touch 5 / PWM)', offset: { x: 7.5, y: 195.6 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [spi('MISO', 0), PWM()], aliases: ['D12', 'GPIO12'] },
    'D13': { id: 'D13', name: 'D13', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 13 (HSPI_MOSI / Touch 4 / PWM)', offset: { x: 7.5, y: 209.3 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [spi('MOSI', 0), PWM()], aliases: ['D13', 'GPIO13'] },
    'GND2': { id: 'GND2', name: 'GND', type: PinType.GROUND, description: 'System Ground (Port 2)', nominalVoltage: 0, offset: { x: 7.5, y: 223.5 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [GND()], aliases: ['GND.2', 'GND'] },
    'VIN': { id: 'VIN', name: 'VIN (5V)', type: PinType.POWER_VM, description: 'External 5V DC Supply Input', nominalVoltage: 5.0, offset: { x: 7.5, y: 237.8 }, side: 'left', exitNormal: { x: -1, y: 0 }, signals: [VCC(5.0)], aliases: ['VIN', '5V'] },

    // Right Column (x = 152; normal exits right +X)
    'D23': { id: 'D23', name: 'D23 (STBY)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 23 (Motor Driver STBY / VSPI_MOSI)', offset: { x: 152, y: 36 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [spi('MOSI', 1), PWM()], aliases: ['D23', 'GPIO23'] },
    'D22': { id: 'D22', name: 'D22 (SCL)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 22 (I2C SCL / PWM)', offset: { x: 152, y: 51 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [i2c('SCL'), PWM()], aliases: ['D22', 'GPIO22'] },
    'TX0': { id: 'TX0', name: 'TX0 (D1)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 1 (UART0 TXD)', offset: { x: 152, y: 66 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [usart('TX', 0), PWM()], aliases: ['TX0', 'TX', 'D1', 'GPIO1'] },
    'RX0': { id: 'RX0', name: 'RX0 (D3)', type: PinType.DIGITAL_INPUT, description: 'GPIO 3 (UART0 RXD)', offset: { x: 152, y: 79.6 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [usart('RX', 0), PWM()], aliases: ['RX0', 'RX', 'D3', 'GPIO3'] },
    'D21': { id: 'D21', name: 'D21 (SDA)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 21 (I2C SDA / PWM)', offset: { x: 152, y: 94.4 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [i2c('SDA'), PWM()], aliases: ['D21', 'GPIO21'] },
    'D19': { id: 'D19', name: 'D19 (BIN2)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 19 (Right Motor Dir 2 / VSPI_MISO)', offset: { x: 152, y: 108.3 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [spi('MISO', 1), PWM()], aliases: ['D19', 'GPIO19'] },
    'D18': { id: 'D18', name: 'D18 (BIN1)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 18 (Right Motor Dir 1 / VSPI_CLK)', offset: { x: 152, y: 122.6 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [spi('SCK', 1), PWM()], aliases: ['D18', 'GPIO18'] },
    'D5': { id: 'D5', name: 'D5', type: PinType.PWM_OUTPUT, description: 'GPIO 5 (VSPI_CS0 / PWM)', offset: { x: 152, y: 137 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [spi('SS', 1), PWM()], aliases: ['D5', 'GPIO5'] },
    'TX2': { id: 'TX2', name: 'TX2 (D17)', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 17 (UART2 TXD)', offset: { x: 152, y: 151.5 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [usart('TX', 2), PWM()], aliases: ['TX2', 'D17', 'GPIO17'] },
    'RX2': { id: 'RX2', name: 'RX2 (D16)', type: PinType.DIGITAL_INPUT, description: 'GPIO 16 (UART2 RXD)', offset: { x: 152, y: 166.2 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [usart('RX', 2), PWM()], aliases: ['RX2', 'D16', 'GPIO16'] },
    'D4': { id: 'D4', name: 'D4', type: PinType.PWM_OUTPUT, description: 'GPIO 4 (Touch 0 / ADC2_CH0 / PWM)', offset: { x: 152, y: 180 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [PWM()], aliases: ['D4', 'GPIO4'] },
    'D2': { id: 'D2', name: 'D2 (LED)', type: PinType.PWM_OUTPUT, description: 'GPIO 2 (Built-in Blue LED / Touch 2)', offset: { x: 152, y: 195.6 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [PWM()], aliases: ['D2', 'GPIO2'] },
    'D15': { id: 'D15', name: 'D15', type: PinType.DIGITAL_OUTPUT, description: 'GPIO 15 (HSPI_CS0 / Touch 3 / PWM)', offset: { x: 152, y: 209.3 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [spi('SS', 0), PWM()], aliases: ['D15', 'GPIO15'] },
    'GND1': { id: 'GND1', name: 'GND', type: PinType.GROUND, description: 'System Ground (Port 1)', nominalVoltage: 0, offset: { x: 152, y: 223.5 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [GND()], aliases: ['GND.1', 'GND'] },
    '3V3': { id: '3V3', name: '3V3', type: PinType.POWER_VCC, description: '3.3V Regulated Output Rail', nominalVoltage: 3.3, offset: { x: 152, y: 237.8 }, side: 'right', exitNormal: { x: 1, y: 0 }, signals: [VCC(3.3)], aliases: ['3V3', '3.3V'] },
  };

  // Attach non-enumerable getters for legacy aliases so existing projects access GPIO25, GND, etc. without error
  for (const [legacyId, canonicalId] of Object.entries(ESP32_GPIO_TO_WOKWI_MAP)) {
    if (!espPins[legacyId] && espPins[canonicalId]) {
      Object.defineProperty(espPins, legacyId, {
        get() {
          return espPins[canonicalId];
        },
        enumerable: false,
        configurable: true,
      });
    }
  }

  // Also attach Wokwi dot-notation aliases (e.g. 'GND.1', 'GND.2')
  if (!espPins['GND.1'] && espPins['GND1']) {
    Object.defineProperty(espPins, 'GND.1', { get: () => espPins['GND1'], enumerable: false, configurable: true });
  }
  if (!espPins['GND.2'] && espPins['GND2']) {
    Object.defineProperty(espPins, 'GND.2', { get: () => espPins['GND2'], enumerable: false, configurable: true });
  }

  return {
    id,
    type: 'ESP32_DEVKIT_V1',
    name: 'ESP32 DevKit V1',
    position: pos,
    dimensions: { width: 160.5, height: 301.5 },
    pins: espPins,
  };
}

export function createArduinoUno(id = 'uno_1', pos = { x: 50, y: 70 }): ComponentInstance {
  const canonicalPins: Record<string, PinDefinition> = {
    // Bottom Power Header (y = 213, normal exits downwards +Y)
    'IOREF': {
      id: 'IOREF',
      name: 'IOREF',
      type: PinType.POWER_VCC,
      description: 'I/O Voltage Reference (5V)',
      nominalVoltage: 5.0,
      offset: { x: 169, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [],
      aliases: ['IOREF'],
    },
    'RESET': {
      id: 'RESET',
      name: 'RESET',
      type: PinType.DIGITAL_INPUT,
      description: 'Active-Low Reset',
      offset: { x: 179.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [],
      aliases: ['RESET'],
    },
    '3V3': {
      id: '3V3',
      name: '3.3V',
      type: PinType.POWER_VCC,
      description: '3.3V Regulated Output',
      nominalVoltage: 3.3,
      offset: { x: 190, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [VCC(3.3)],
      aliases: ['3.3V'],
    },
    '5V': {
      id: '5V',
      name: '5V',
      type: PinType.POWER_VCC,
      description: '5V Regulated Output',
      nominalVoltage: 5.0,
      offset: { x: 200.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [VCC(5.0)],
      aliases: ['5V'],
    },
    'GND1': {
      id: 'GND1',
      name: 'GND',
      type: PinType.GROUND,
      description: 'Power Header System Ground 1',
      nominalVoltage: 0,
      offset: { x: 211, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [GND()],
      aliases: ['GND.2', 'GND'],
    },
    'GND2': {
      id: 'GND2',
      name: 'GND',
      type: PinType.GROUND,
      description: 'Power Header System Ground 2',
      nominalVoltage: 0,
      offset: { x: 221.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [GND()],
      aliases: ['GND.3'],
    },
    'VIN': {
      id: 'VIN',
      name: 'VIN',
      type: PinType.POWER_VM,
      description: 'External DC Input (7-12V)',
      nominalVoltage: 9.0,
      offset: { x: 232, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [VCC(9.0)],
      aliases: ['VIN'],
    },

    // Bottom Analog Header (y = 213, normal exits downwards +Y)
    'A0': {
      id: 'A0',
      name: 'A0 (D14)',
      type: PinType.ANALOG_INPUT,
      description: 'Analog In 0 / Digital 14',
      offset: { x: 257.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(0)],
      aliases: ['A0'],
    },
    'A1': {
      id: 'A1',
      name: 'A1 (D15)',
      type: PinType.ANALOG_INPUT,
      description: 'Analog In 1 / Digital 15',
      offset: { x: 268, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(1)],
      aliases: ['A1'],
    },
    'A2': {
      id: 'A2',
      name: 'A2 (D16)',
      type: PinType.ANALOG_INPUT,
      description: 'Analog In 2 / Digital 16',
      offset: { x: 278.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(2)],
      aliases: ['A2'],
    },
    'A3': {
      id: 'A3',
      name: 'A3 (D17)',
      type: PinType.ANALOG_INPUT,
      description: 'Analog In 3 / Digital 17',
      offset: { x: 289, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(3)],
      aliases: ['A3'],
    },
    'A4': {
      id: 'A4',
      name: 'A4 (SDA)',
      type: PinType.DIGITAL_INPUT,
      description: 'Analog In 4 / I2C SDA',
      offset: { x: 299.5, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(4), i2c('SDA')],
      aliases: ['A4', 'A4.2'],
    },
    'A5': {
      id: 'A5',
      name: 'A5 (SCL)',
      type: PinType.DIGITAL_INPUT,
      description: 'Analog In 5 / I2C SCL',
      offset: { x: 310, y: 213 },
      side: 'bottom',
      exitNormal: { x: 0, y: 1 },
      signals: [analog(5), i2c('SCL')],
      aliases: ['A5', 'A5.2'],
    },

    // Top Digital & PWM Header (y = 17, normal exits upwards -Y)
    'AREF': {
      id: 'AREF',
      name: 'AREF',
      type: PinType.POWER_VCC,
      description: 'Analog Reference Voltage',
      nominalVoltage: 5.0,
      offset: { x: 144.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [],
      aliases: ['AREF'],
    },
    'GND3': {
      id: 'GND3',
      name: 'GND',
      type: PinType.GROUND,
      description: 'Digital Header System Ground 3',
      nominalVoltage: 0,
      offset: { x: 155, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [GND()],
      aliases: ['GND.1'],
    },
    'D13': {
      id: 'D13',
      name: 'D13 (SCK)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 13 / Built-in LED / SPI SCK',
      offset: { x: 165.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [spi('SCK')],
      aliases: ['13'],
    },
    'D12': {
      id: 'D12',
      name: 'D12 (MISO)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 12 / SPI MISO',
      offset: { x: 176, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [spi('MISO')],
      aliases: ['12'],
    },
    'D11': {
      id: 'D11',
      name: '~D11 (MOSI)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 11 (~PWM Timer 2A) / SPI MOSI',
      offset: { x: 186.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [spi('MOSI'), PWM()],
      aliases: ['11'],
    },
    'D10': {
      id: 'D10',
      name: '~D10 (SS)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 10 (~PWM Timer 1B) / SPI SS',
      offset: { x: 197, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [spi('SS'), PWM()],
      aliases: ['10'],
    },
    'D9': {
      id: 'D9',
      name: '~D9 (AIN1)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 9 (~PWM Timer 1A)',
      offset: { x: 207.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [PWM()],
      aliases: ['9'],
    },
    'D8': {
      id: 'D8',
      name: 'D8 (IR4)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 8 / Center Left IR',
      offset: { x: 218, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [],
      aliases: ['8'],
    },
    'D7': {
      id: 'D7',
      name: 'D7 (IR3)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 7',
      offset: { x: 236.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [],
      aliases: ['7'],
    },
    'D6': {
      id: 'D6',
      name: '~D6 (PWMB)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 6 (~PWM Timer 0A, Right Speed)',
      offset: { x: 247, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [PWM()],
      aliases: ['6'],
    },
    'D5': {
      id: 'D5',
      name: '~D5 (PWMA)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 5 (~PWM Timer 0B, Left Speed)',
      offset: { x: 257.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [PWM()],
      aliases: ['5'],
    },
    'D4': {
      id: 'D4',
      name: 'D4 (IR2)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 4 / IR Sensor 2',
      offset: { x: 268, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [],
      aliases: ['4'],
    },
    'D3': {
      id: 'D3',
      name: '~D3 (STBY)',
      type: PinType.PWM_OUTPUT,
      description: 'Digital Pin 3 (~PWM Timer 2B / STBY)',
      offset: { x: 278.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [PWM()],
      aliases: ['3'],
    },
    'D2': {
      id: 'D2',
      name: 'D2 (IR1)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 2 / IR Sensor 1 (Far Left)',
      offset: { x: 289, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [],
      aliases: ['2'],
    },
    'D1': {
      id: 'D1',
      name: 'D1 (TX)',
      type: PinType.DIGITAL_OUTPUT,
      description: 'Digital Pin 1 / USART TX',
      offset: { x: 299.5, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [usart('TX')],
      aliases: ['1'],
    },
    'D0': {
      id: 'D0',
      name: 'D0 (RX)',
      type: PinType.DIGITAL_INPUT,
      description: 'Digital Pin 0 / USART RX',
      offset: { x: 310, y: 17 },
      side: 'top',
      exitNormal: { x: 0, y: -1 },
      signals: [usart('RX')],
      aliases: ['0'],
    },
  };

  // Attach non-enumerable getters for Wokwi pin name aliases
  // This allows pins['13'] or pins['GND.1'] to resolve directly without polluting Object.keys/values
  for (const [wokwiName, magicId] of Object.entries(WOKWI_TO_MAGIC_PIN_MAP)) {
    if (!canonicalPins[wokwiName] && canonicalPins[magicId]) {
      Object.defineProperty(canonicalPins, wokwiName, {
        get() {
          return canonicalPins[magicId];
        },
        enumerable: false,
        configurable: true,
      });
    }
  }

  return {
    id,
    type: 'ARDUINO_UNO_R3',
    name: 'Arduino Uno R3',
    position: pos,
    dimensions: { width: 330, height: 230 },
    pins: canonicalPins,
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
      'VCC': { id: 'VCC', name: 'VCC (5V)', type: PinType.POWER_VCC, description: '5V Power Supply Input', nominalVoltage: 5.0, offset: { x: 0, y: 35 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Common Ground Reference (0V)', nominalVoltage: 0, offset: { x: 0, y: 65 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'D1': { id: 'D1', name: 'D1 (Far Left)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 1 (Far Left)', offset: { x: 220, y: 25 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D2': { id: 'D2', name: 'D2', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 2', offset: { x: 220, y: 48 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D3': { id: 'D3', name: 'D3', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 3', offset: { x: 220, y: 71 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D4': { id: 'D4', name: 'D4 (Center L)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 4 (Center Left)', offset: { x: 220, y: 94 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D5': { id: 'D5', name: 'D5 (Center R)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 5 (Center Right)', offset: { x: 220, y: 117 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D6': { id: 'D6', name: 'D6', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 6', offset: { x: 220, y: 140 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D7': { id: 'D7', name: 'D7', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 7', offset: { x: 220, y: 163 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'D8': { id: 'D8', name: 'D8 (Far Right)', type: PinType.DIGITAL_OUTPUT, description: 'IR Channel 8 (Far Right)', offset: { x: 220, y: 186 }, side: 'right', exitNormal: { x: 1, y: 0 } },
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
      'VM': { id: 'VM', name: 'VM', type: PinType.POWER_VM, description: 'Motor Power Supply (4.5V-15V)', offset: { x: 0, y: 45 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'VCC': { id: 'VCC', name: 'VCC', type: PinType.POWER_VCC, description: 'Logic Power (2.7V-5.5V)', offset: { x: 0, y: 70 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'Common Ground', offset: { x: 0, y: 95 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'PWMA': { id: 'PWMA', name: 'PWMA', type: PinType.DIGITAL_INPUT, description: 'Motor A Speed PWM', offset: { x: 0, y: 120 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'AIN1': { id: 'AIN1', name: 'AIN1', type: PinType.DIGITAL_INPUT, description: 'Motor A In 1', offset: { x: 0, y: 145 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'AIN2': { id: 'AIN2', name: 'AIN2', type: PinType.DIGITAL_INPUT, description: 'Motor A In 2', offset: { x: 0, y: 170 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'STBY': { id: 'STBY', name: 'STBY', type: PinType.DIGITAL_INPUT, description: 'Standby Pin (Active High)', offset: { x: 0, y: 195 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'BIN1': { id: 'BIN1', name: 'BIN1', type: PinType.DIGITAL_INPUT, description: 'Motor B In 1', offset: { x: 0, y: 220 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'BIN2': { id: 'BIN2', name: 'BIN2', type: PinType.DIGITAL_INPUT, description: 'Motor B In 2', offset: { x: 0, y: 245 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'PWMB': { id: 'PWMB', name: 'PWMB', type: PinType.DIGITAL_INPUT, description: 'Motor B Speed PWM', offset: { x: 0, y: 270 }, side: 'left', exitNormal: { x: -1, y: 0 } },

      // Right / Motor Output side
      'AO1': { id: 'AO1', name: 'AO1', type: PinType.MOTOR_OUT, description: 'Motor A Output 1 (+)', offset: { x: 180, y: 120 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'AO2': { id: 'AO2', name: 'AO2', type: PinType.MOTOR_OUT, description: 'Motor A Output 2 (-)', offset: { x: 180, y: 145 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'BO1': { id: 'BO1', name: 'BO1', type: PinType.MOTOR_OUT, description: 'Motor B Output 1 (+)', offset: { x: 180, y: 220 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'BO2': { id: 'BO2', name: 'BO2', type: PinType.MOTOR_OUT, description: 'Motor B Output 2 (-)', offset: { x: 180, y: 245 }, side: 'right', exitNormal: { x: 1, y: 0 } },
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
      'POS': { id: 'POS', name: 'V+ (7.4V)', type: PinType.POWER_VM, description: '+7.4V Power Output', nominalVoltage: 7.4, offset: { x: 140, y: 45 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'NEG': { id: 'NEG', name: 'GND (-)', type: PinType.GROUND, description: 'Battery Negative Ground', nominalVoltage: 0, offset: { x: 140, y: 75 }, side: 'right', exitNormal: { x: 1, y: 0 } },
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
      'M_POS': { id: 'M_POS', name: 'IN+', type: PinType.MOTOR_OUT, description: 'Motor Terminal +', offset: { x: 0, y: 45 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'M_NEG': { id: 'M_NEG', name: 'IN-', type: PinType.MOTOR_OUT, description: 'Motor Terminal -', offset: { x: 0, y: 75 }, side: 'left', exitNormal: { x: -1, y: 0 } },
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
      'GND1': { id: 'GND1', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 1', nominalVoltage: 0, offset: { x: 25, y: 55 }, side: 'bottom', exitNormal: { x: 0, y: 1 } },
      'GND2': { id: 'GND2', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 2', nominalVoltage: 0, offset: { x: 55, y: 55 }, side: 'bottom', exitNormal: { x: 0, y: 1 } },
      'GND3': { id: 'GND3', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 3', nominalVoltage: 0, offset: { x: 85, y: 55 }, side: 'bottom', exitNormal: { x: 0, y: 1 } },
      'GND4': { id: 'GND4', name: 'GND', type: PinType.GROUND, description: 'Common Ground Port 4', nominalVoltage: 0, offset: { x: 115, y: 55 }, side: 'bottom', exitNormal: { x: 0, y: 1 } },
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
      'VCC': { id: 'VCC', name: 'VCC (5V)', type: PinType.POWER_VCC, description: '5V Power Supply Input', nominalVoltage: 5.0, offset: { x: 0, y: 35 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'TRIG': { id: 'TRIG', name: 'TRIG', type: PinType.DIGITAL_INPUT, description: 'Ultrasonic Trigger Input (10µs pulse)', offset: { x: 0, y: 60 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'ECHO': { id: 'ECHO', name: 'ECHO', type: PinType.DIGITAL_OUTPUT, description: 'Ultrasonic Echo Output Pulse', offset: { x: 0, y: 85 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'GND': { id: 'GND', name: 'GND', type: PinType.GROUND, description: 'System Ground (0V)', nominalVoltage: 0, offset: { x: 170, y: 60 }, side: 'right', exitNormal: { x: 1, y: 0 } },
    },
  };
}

export function createSG90Servo(id = 'servo_sg90_1', name = 'SG90 Micro Servo', pos = { x: 580, y: 70 }): ComponentInstance {
  return {
    id,
    type: 'SERVO_SG90',
    name,
    position: pos,
    dimensions: { width: 140, height: 100 },
    pins: {
      'SIG': { id: 'SIG', name: 'SIG (Orange)', type: PinType.DIGITAL_INPUT, description: 'PWM Signal Input (50Hz / 1-2ms pulse)', offset: { x: 0, y: 35 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'VCC': { id: 'VCC', name: 'VCC (Red)', type: PinType.POWER_VCC, description: 'Power Supply Input (4.8V-6.0V)', nominalVoltage: 5.0, offset: { x: 0, y: 60 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'GND': { id: 'GND', name: 'GND (Brown)', type: PinType.GROUND, description: 'Ground Reference (0V)', nominalVoltage: 0, offset: { x: 0, y: 85 }, side: 'left', exitNormal: { x: -1, y: 0 } },
    },
  };
}

export function createMG996RServo(id = 'servo_mg996r_1', name = 'MG996R Metal Gear Servo', pos = { x: 580, y: 200 }): ComponentInstance {
  return {
    id,
    type: 'SERVO_MG996R',
    name,
    position: pos,
    dimensions: { width: 150, height: 110 },
    pins: {
      'SIG': { id: 'SIG', name: 'SIG (White)', type: PinType.DIGITAL_INPUT, description: 'PWM Signal Input (50Hz / 1-2ms pulse)', offset: { x: 0, y: 40 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'VCC': { id: 'VCC', name: 'VCC (Red)', type: PinType.POWER_VCC, description: 'High-Torque Power Supply (5V-7.2V)', nominalVoltage: 6.0, offset: { x: 0, y: 65 }, side: 'left', exitNormal: { x: -1, y: 0 } },
      'GND': { id: 'GND', name: 'GND (Black)', type: PinType.GROUND, description: 'Common Ground (0V)', nominalVoltage: 0, offset: { x: 0, y: 90 }, side: 'left', exitNormal: { x: -1, y: 0 } },
    },
  };
}

export function createServoPowerSupply(id = 'servo_psu_1', pos = { x: 340, y: 440 }): ComponentInstance {
  return {
    id,
    type: 'SERVO_POWER_SUPPLY',
    name: '5V/6V 3A DC Servo PSU',
    position: pos,
    dimensions: { width: 160, height: 100 },
    pins: {
      'POS': { id: 'POS', name: 'VOUT (+6V)', type: PinType.POWER_VCC, description: 'Regulated Servo Power Rail (+6V 3A)', nominalVoltage: 6.0, offset: { x: 160, y: 40 }, side: 'right', exitNormal: { x: 1, y: 0 } },
      'NEG': { id: 'NEG', name: 'GND (-)', type: PinType.GROUND, description: 'Power Supply DC Return (0V)', nominalVoltage: 0, offset: { x: 160, y: 75 }, side: 'right', exitNormal: { x: 1, y: 0 } },
    },
  };
}

export function createBreadboardMini(id = 'bb_mini_1', pos = { x: 340, y: 560 }): ComponentInstance {
  return {
    id,
    type: 'BREADBOARD',
    name: 'Mini Solderless Breadboard',
    position: pos,
    dimensions: { width: 180, height: 100 },
    pins: {
      'VCC1': { id: 'VCC1', name: '+ Rail', type: PinType.POWER_VCC, description: 'Positive Power Distribution Bus', nominalVoltage: 5.0, offset: { x: 30, y: 25 } },
      'VCC2': { id: 'VCC2', name: '+ Rail', type: PinType.POWER_VCC, description: 'Positive Power Distribution Bus', nominalVoltage: 5.0, offset: { x: 70, y: 25 } },
      'VCC3': { id: 'VCC3', name: '+ Rail', type: PinType.POWER_VCC, description: 'Positive Power Distribution Bus', nominalVoltage: 5.0, offset: { x: 110, y: 25 } },
      'VCC4': { id: 'VCC4', name: '+ Rail', type: PinType.POWER_VCC, description: 'Positive Power Distribution Bus', nominalVoltage: 5.0, offset: { x: 150, y: 25 } },
      'GND1': { id: 'GND1', name: '- Rail', type: PinType.GROUND, description: 'Common Ground Return Bus', nominalVoltage: 0, offset: { x: 30, y: 75 } },
      'GND2': { id: 'GND2', name: '- Rail', type: PinType.GROUND, description: 'Common Ground Return Bus', nominalVoltage: 0, offset: { x: 70, y: 75 } },
      'GND3': { id: 'GND3', name: '- Rail', type: PinType.GROUND, description: 'Common Ground Return Bus', nominalVoltage: 0, offset: { x: 110, y: 75 } },
      'GND4': { id: 'GND4', name: '- Rail', type: PinType.GROUND, description: 'Common Ground Return Bus', nominalVoltage: 0, offset: { x: 150, y: 75 } },
    },
  };
}
