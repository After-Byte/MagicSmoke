/**
 * Wokwi Electronic Component Contracts & Specifications
 * Reverse-engineered from @wokwi/elements
 * 
 * Provides ElementPin coordinate tables, physical 2.54mm pitch constants,
 * PinSignalInfo types, and female/male pin header SVG patterns.
 */

export type PinSignalInfo =
  | {
      type: 'i2c';
      signal: 'SDA' | 'SCL';
      bus?: number;
    }
  | {
      type: 'spi';
      signal: 'SCK' | 'MOSI' | 'MISO' | 'SS';
      bus?: number;
    }
  | {
      type: 'usart';
      signal: 'RX' | 'TX';
      bus?: number;
    }
  | {
      type: 'power';
      signal: 'GND' | 'VCC';
      voltage?: number;
    }
  | {
      type: 'pwm';
    }
  | {
      type: 'analog';
      channel?: number;
    };

export interface ElementPin {
  /**
   * Unique pin identifier (e.g., '13', 'AREF', 'GND.1', '5V')
   */
  name: string;

  /**
   * Local X coordinate within the component coordinate space
   */
  x: number;

  /**
   * Local Y coordinate within the component coordinate space
   */
  y: number;

  /**
   * Electrical signals mapped to this pin
   */
  signals: PinSignalInfo[];

  /**
   * Physical header pin number (1-based), if applicable
   */
  number?: number;

  /**
   * Semantic description of the pin's hardware function
   */
  description?: string;

  /**
   * Whether the pin has a default directional exit vector
   */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

// Signal helper creators matching @wokwi/elements
export const analog = (channel: number): PinSignalInfo => ({ type: 'analog', channel });
export const i2c = (signal: 'SCL' | 'SDA', bus = 0): PinSignalInfo => ({ type: 'i2c', signal, bus });
export const spi = (signal: 'SCK' | 'MOSI' | 'MISO' | 'SS', bus = 0): PinSignalInfo => ({ type: 'spi', signal, bus });
export const usart = (signal: 'RX' | 'TX', bus = 0): PinSignalInfo => ({ type: 'usart', signal, bus });
export const GND = (): PinSignalInfo => ({ type: 'power', signal: 'GND', voltage: 0 });
export const VCC = (voltage = 5.0): PinSignalInfo => ({ type: 'power', signal: 'VCC', voltage });
export const PWM = (): PinSignalInfo => ({ type: 'pwm' });

/**
 * Exact Wokwi Arduino Uno R3 Pin Table
 * Reverse-engineered from @wokwi/elements/src/arduino-uno-element.ts
 */
export const WOKWI_ARDUINO_UNO_PINS: ElementPin[] = [
  // Top Digital & Analog Header (y = 9 in Wokwi local coordinates; normal exits -Y)
  { name: 'A5.2', x: 87, y: 9, signals: [analog(5), i2c('SCL')], side: 'top', description: 'Analog In 5 (Alternate SCL)' },
  { name: 'A4.2', x: 97, y: 9, signals: [analog(4), i2c('SDA')], side: 'top', description: 'Analog In 4 (Alternate SDA)' },
  { name: 'AREF', x: 106, y: 9, signals: [], side: 'top', description: 'ADC Analog Reference Voltage' },
  { name: 'GND.1', x: 115.5, y: 9, signals: [GND()], side: 'top', description: 'Digital Header System Ground 1' },
  { name: '13', x: 125, y: 9, signals: [spi('SCK')], side: 'top', description: 'Digital Pin 13 / Built-in LED L / SPI SCK' },
  { name: '12', x: 134.5, y: 9, signals: [spi('MISO')], side: 'top', description: 'Digital Pin 12 / SPI MISO' },
  { name: '11', x: 144, y: 9, signals: [spi('MOSI'), PWM()], side: 'top', description: 'Digital Pin 11 (~PWM Timer 2A) / SPI MOSI' },
  { name: '10', x: 153.5, y: 9, signals: [spi('SS'), PWM()], side: 'top', description: 'Digital Pin 10 (~PWM Timer 1B) / SPI SS' },
  { name: '9', x: 163, y: 9, signals: [PWM()], side: 'top', description: 'Digital Pin 9 (~PWM Timer 1A)' },
  { name: '8', x: 173, y: 9, signals: [], side: 'top', description: 'Digital Pin 8' },
  // Header pitch gap: 160 mil between pin 7 and pin 8
  { name: '7', x: 189, y: 9, signals: [], side: 'top', description: 'Digital Pin 7' },
  { name: '6', x: 198.5, y: 9, signals: [PWM()], side: 'top', description: 'Digital Pin 6 (~PWM Timer 0A)' },
  { name: '5', x: 208, y: 9, signals: [PWM()], side: 'top', description: 'Digital Pin 5 (~PWM Timer 0B)' },
  { name: '4', x: 217.5, y: 9, signals: [], side: 'top', description: 'Digital Pin 4' },
  { name: '3', x: 227, y: 9, signals: [PWM()], side: 'top', description: 'Digital Pin 3 (~PWM Timer 2B)' },
  { name: '2', x: 236.5, y: 9, signals: [], side: 'top', description: 'Digital Pin 2 / External Interrupt 0' },
  { name: '1', x: 246, y: 9, signals: [usart('TX')], side: 'top', description: 'Digital Pin 1 / USART TX' },
  { name: '0', x: 255.5, y: 9, signals: [usart('RX')], side: 'top', description: 'Digital Pin 0 / USART RX' },

  // Bottom Power & Analog In Header (y = 191.5 in Wokwi local coordinates; normal exits +Y)
  { name: 'IOREF', x: 131, y: 191.5, signals: [], side: 'bottom', description: 'Shield I/O Reference Voltage (5.0V)' },
  { name: 'RESET', x: 140.5, y: 191.5, signals: [], side: 'bottom', description: 'Active-Low MCU Hardware Reset' },
  { name: '3.3V', x: 150, y: 191.5, signals: [VCC(3.3)], side: 'bottom', description: '3.3V Regulated Output (50mA)' },
  { name: '5V', x: 160, y: 191.5, signals: [VCC(5.0)], side: 'bottom', description: '5.0V Regulated Main Power Output' },
  { name: 'GND.2', x: 169.5, y: 191.5, signals: [GND()], side: 'bottom', description: 'Power Header System Ground 2' },
  { name: 'GND.3', x: 179, y: 191.5, signals: [GND()], side: 'bottom', description: 'Power Header System Ground 3' },
  { name: 'VIN', x: 188.5, y: 191.5, signals: [VCC(9.0)], side: 'bottom', description: 'External DC Input Rail (7-12V)' },
  // Gap before Analog inputs
  { name: 'A0', x: 208, y: 191.5, signals: [analog(0)], side: 'bottom', description: 'Analog Input 0 / Digital Pin 14' },
  { name: 'A1', x: 217.5, y: 191.5, signals: [analog(1)], side: 'bottom', description: 'Analog Input 1 / Digital Pin 15' },
  { name: 'A2', x: 227, y: 191.5, signals: [analog(2)], side: 'bottom', description: 'Analog Input 2 / Digital Pin 16' },
  { name: 'A3', x: 236.5, y: 191.5, signals: [analog(3)], side: 'bottom', description: 'Analog Input 3 / Digital Pin 17' },
  { name: 'A4', x: 246, y: 191.5, signals: [analog(4), i2c('SDA')], side: 'bottom', description: 'Analog Input 4 / Digital Pin 18 / I2C SDA' },
  { name: 'A5', x: 255.5, y: 191.5, signals: [analog(5), i2c('SCL')], side: 'bottom', description: 'Analog Input 5 / Digital Pin 19 / I2C SCL' },
];

/**
 * Standard Physical Header Pitch in Millimeters
 */
export const HEADER_PITCH_MM = 2.54;

/**
 * Physical Dimensions & SVG ViewBox matching @wokwi/elements
 */
export const ARDUINO_UNO_ELEMENT_VIEWBOX = '-4 0 72.58 53.34';
export const ARDUINO_UNO_ELEMENT_DIMENSIONS = {
  widthMm: 72.58,
  heightMm: 53.34,
};

/**
 * Exact Wokwi ESP32 DevKit V1 Pin Table
 * Reverse-engineered from @wokwi/elements/src/esp32-devkit-v1-element.ts
 * 30 pins total (15 left, 15 right) in local SVG viewBox 0 0 107 201
 */
export const WOKWI_ESP32_DEVKIT_V1_PINS: ElementPin[] = [
  // Left Column (x = 5; normal exits -X left)
  { name: 'EN', x: 5, y: 24, signals: [], side: 'left', description: 'Enable / Active-Low Reset (CHIP_PU)' },
  { name: 'VP', x: 5, y: 34, signals: [analog(0)], side: 'left', description: 'Sensor VP (GPIO 36 / ADC1_CH0)' },
  { name: 'VN', x: 5, y: 44, signals: [analog(3)], side: 'left', description: 'Sensor VN (GPIO 39 / ADC1_CH3)' },
  { name: 'D34', x: 5, y: 53.1, signals: [analog(6)], side: 'left', description: 'GPIO 34 (ADC1_CH6 / Input Only)' },
  { name: 'D35', x: 5, y: 62.9, signals: [analog(7)], side: 'left', description: 'GPIO 35 (ADC1_CH7 / Input Only)' },
  { name: 'D32', x: 5, y: 72.2, signals: [analog(4), PWM()], side: 'left', description: 'GPIO 32 (ADC1_CH4 / Touch 9 / PWM)' },
  { name: 'D33', x: 5, y: 81.7, signals: [analog(5), PWM()], side: 'left', description: 'GPIO 33 (ADC1_CH5 / Touch 8 / PWM)' },
  { name: 'D25', x: 5, y: 91.3, signals: [analog(18), PWM()], side: 'left', description: 'GPIO 25 (DAC1 / ADC2_CH8 / PWM)' },
  { name: 'D26', x: 5, y: 101, signals: [analog(19), PWM()], side: 'left', description: 'GPIO 26 (DAC2 / ADC2_CH9 / PWM)' },
  { name: 'D27', x: 5, y: 110.8, signals: [analog(17), PWM()], side: 'left', description: 'GPIO 27 (ADC2_CH7 / Touch 7 / PWM)' },
  { name: 'D14', x: 5, y: 120, signals: [spi('SCK', 0), PWM()], side: 'left', description: 'GPIO 14 (HSPI_CLK / Touch 6 / PWM)' },
  { name: 'D12', x: 5, y: 130.4, signals: [spi('MISO', 0), PWM()], side: 'left', description: 'GPIO 12 (HSPI_MISO / Touch 5 / PWM)' },
  { name: 'D13', x: 5, y: 139.5, signals: [spi('MOSI', 0), PWM()], side: 'left', description: 'GPIO 13 (HSPI_MOSI / Touch 4 / PWM)' },
  { name: 'GND.2', x: 5, y: 149, signals: [GND()], side: 'left', description: 'System Ground (Port 2)' },
  { name: 'VIN', x: 5, y: 158.5, signals: [VCC(5.0)], side: 'left', description: 'External 5V DC Supply Input' },

  // Right Column (x = 101.3; normal exits +X right)
  { name: 'D23', x: 101.3, y: 24, signals: [spi('MOSI', 1), PWM()], side: 'right', description: 'GPIO 23 (VSPI_MOSI / PWM)' },
  { name: 'D22', x: 101.3, y: 34, signals: [i2c('SCL'), PWM()], side: 'right', description: 'GPIO 22 (I2C SCL / PWM)' },
  { name: 'TX0', x: 101.3, y: 44, signals: [usart('TX', 0), PWM()], side: 'right', description: 'GPIO 1 (UART0 TXD)' },
  { name: 'RX0', x: 101.3, y: 53.1, signals: [usart('RX', 0), PWM()], side: 'right', description: 'GPIO 3 (UART0 RXD)' },
  { name: 'D21', x: 101.3, y: 62.9, signals: [i2c('SDA'), PWM()], side: 'right', description: 'GPIO 21 (I2C SDA / PWM)' },
  { name: 'D19', x: 101.3, y: 72.2, signals: [spi('MISO', 1), PWM()], side: 'right', description: 'GPIO 19 (VSPI_MISO / PWM)' },
  { name: 'D18', x: 101.3, y: 81.7, signals: [spi('SCK', 1), PWM()], side: 'right', description: 'GPIO 18 (VSPI_CLK / PWM)' },
  { name: 'D5', x: 101.3, y: 91.3, signals: [spi('SS', 1), PWM()], side: 'right', description: 'GPIO 5 (VSPI_CS0 / PWM)' },
  { name: 'TX2', x: 101.3, y: 101, signals: [usart('TX', 2), PWM()], side: 'right', description: 'GPIO 17 (UART2 TXD)' },
  { name: 'RX2', x: 101.3, y: 110.8, signals: [usart('RX', 2), PWM()], side: 'right', description: 'GPIO 16 (UART2 RXD)' },
  { name: 'D4', x: 101.3, y: 120, signals: [PWM()], side: 'right', description: 'GPIO 4 (Touch 0 / ADC2_CH0 / PWM)' },
  { name: 'D2', x: 101.3, y: 130.4, signals: [PWM()], side: 'right', description: 'GPIO 2 (Built-in Blue LED / Touch 2 / PWM)' },
  { name: 'D15', x: 101.3, y: 139.5, signals: [spi('SS', 0), PWM()], side: 'right', description: 'GPIO 15 (HSPI_CS0 / Touch 3 / PWM)' },
  { name: 'GND.1', x: 101.3, y: 149, signals: [GND()], side: 'right', description: 'System Ground (Port 1)' },
  { name: '3V3', x: 101.3, y: 158.5, signals: [VCC(3.3)], side: 'right', description: '3.3V Regulated Output Rail' },
];

export const ESP32_DEVKIT_V1_ELEMENT_VIEWBOX = '0 0 107 201';
export const ESP32_DEVKIT_V1_ELEMENT_DIMENSIONS = {
  widthMm: 28.2,
  heightMm: 54.053,
};

/**
 * Wokwi Female Pin Header Strip SVG Pattern Definition
 * 2.54mm square pitch with authentic beveled plastic chamfer and metallic contacts
 */
export const WOKWI_PINS_FEMALE_PATTERN_DEF = `
  <pattern id="wokwi-pins-female" width="10.5" height="10.5" patternUnits="userSpaceOnUse">
    <rect x="0" y="0" width="10.5" height="10.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
    <rect x="3.4" y="3.4" width="3.7" height="3.7" rx="0.5" fill="#09090b" />
    <rect x="4.2" y="4.2" width="2.1" height="2.1" rx="0.3" fill="#cbd5e1" opacity="0.4" />
  </pattern>
`;
