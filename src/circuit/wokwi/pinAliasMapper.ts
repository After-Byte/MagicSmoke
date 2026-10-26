/**
 * Pin ID Alias Mapper & Directional Exit Vector Registry
 * Seamlessly bridges MagicSmoke pin nomenclature with Wokwi.com contracts.
 */

import { ComponentInstance, PinDefinition } from '../types';

/**
 * Mapping table from MagicSmoke canonical pin ID to Wokwi pin name
 */
export const MAGIC_TO_WOKWI_PIN_MAP: Record<string, string> = {
  // Top Digital & Control Header
  'D0': '0',
  'D1': '1',
  'D2': '2',
  'D3': '3',
  'D4': '4',
  'D5': '5',
  'D6': '6',
  'D7': '7',
  'D8': '8',
  'D9': '9',
  'D10': '10',
  'D11': '11',
  'D12': '12',
  'D13': '13',
  'AREF': 'AREF',
  'GND3': 'GND.1',

  // Bottom Power & Analog In Header
  'IOREF': 'IOREF',
  'RESET': 'RESET',
  '3V3': '3.3V',
  '5V': '5V',
  'GND1': 'GND.2',
  'GND2': 'GND.3',
  'VIN': 'VIN',
  'A0': 'A0',
  'A1': 'A1',
  'A2': 'A2',
  'A3': 'A3',
  'A4': 'A4',
  'A5': 'A5',
};

/**
 * Inverse mapping table from Wokwi pin name to MagicSmoke canonical pin ID
 */
export const WOKWI_TO_MAGIC_PIN_MAP: Record<string, string> = {
  '0': 'D0',
  '1': 'D1',
  '2': 'D2',
  '3': 'D3',
  '4': 'D4',
  '5': 'D5',
  '6': 'D6',
  '7': 'D7',
  '8': 'D8',
  '9': 'D9',
  '10': 'D10',
  '11': 'D11',
  '12': 'D12',
  '13': 'D13',
  'AREF': 'AREF',
  'GND.1': 'GND3',
  'IOREF': 'IOREF',
  'RESET': 'RESET',
  '3.3V': '3V3',
  '5V': '5V',
  'GND.2': 'GND1',
  'GND.3': 'GND2',
  'VIN': 'VIN',
  'A0': 'A0',
  'A1': 'A1',
  'A2': 'A2',
  'A3': 'A3',
  'A4': 'A4',
  'A5': 'A5',
  'A4.2': 'A4',
  'A5.2': 'A5',
};

/**
 * Mapping table from ESP32 legacy/GPIO pin name to Wokwi pin name
 */
export const ESP32_GPIO_TO_WOKWI_MAP: Record<string, string> = {
  'GPIO23': 'D23',
  'GPIO25': 'D25',
  'GPIO26': 'D26',
  'GPIO27': 'D27',
  'GPIO14': 'D14',
  'GPIO18': 'D18',
  'GPIO19': 'D19',
  'GPIO21': 'D21',
  'GPIO22': 'D22',
  'GPIO32': 'D32',
  'GPIO33': 'D33',
  'GPIO34': 'D34',
  'GPIO35': 'D35',
  'GPIO12': 'D12',
  'GPIO13': 'D13',
  'GPIO15': 'D15',
  'GPIO2': 'D2',
  'GPIO4': 'D4',
  'GPIO5': 'D5',
  'GPIO0': 'BOOT',
  '3.3V': '3V3',
  'GND': 'GND1',
};

/**
 * Normalizes any pin ID or alias for Arduino Uno to the internal canonical pin ID
 */
export function normalizeUnoPinId(pinId: string): string {
  if (WOKWI_TO_MAGIC_PIN_MAP[pinId]) {
    return WOKWI_TO_MAGIC_PIN_MAP[pinId];
  }
  // Generic GND alias
  if (pinId === 'GND') return 'GND1';
  return pinId;
}

/**
 * Normalizes any pin ID or alias for ESP32 to Wokwi/canonical pin ID
 */
export function normalizeEsp32PinId(pinId: string): string {
  if (ESP32_GPIO_TO_WOKWI_MAP[pinId]) {
    return ESP32_GPIO_TO_WOKWI_MAP[pinId];
  }
  if (pinId === 'GND' || pinId === 'GND.1') return 'GND1';
  if (pinId === 'GND.2') return 'GND2';
  return pinId;
}

/**
 * Maps a MagicSmoke canonical pin ID to the Wokwi pin name
 */
export function canonicalToWokwiUnoPinId(pinId: string): string {
  if (MAGIC_TO_WOKWI_PIN_MAP[pinId]) {
    return MAGIC_TO_WOKWI_PIN_MAP[pinId];
  }
  return pinId;
}

/**
 * Resolves a pin on a component, supporting aliases and normalized names
 */
export function resolveComponentPin(
  comp: ComponentInstance | undefined,
  pinId: string
): PinDefinition | undefined {
  if (!comp) return undefined;

  // Direct match
  if (comp.pins[pinId]) {
    return comp.pins[pinId];
  }

  // Component-specific alias resolution
  if (comp.type === 'ARDUINO_UNO_R3') {
    const canonical = normalizeUnoPinId(pinId);
    if (comp.pins[canonical]) {
      return comp.pins[canonical];
    }
    // Check aliases in pin definitions
    for (const pin of Object.values(comp.pins)) {
      if (pin.aliases?.includes(pinId)) {
        return pin;
      }
    }
  }

  if (comp.type === 'ESP32_DEVKIT_V1') {
    const canonical = normalizeEsp32PinId(pinId);
    if (comp.pins[canonical]) {
      return comp.pins[canonical];
    }
    // Check aliases in pin definitions
    for (const pin of Object.values(comp.pins)) {
      if (pin.aliases?.includes(pinId)) {
        return pin;
      }
    }
  }

  // Generic GND / VCC match for power bus components
  if (pinId === 'GND') {
    for (const gndKey of ['GND', 'GND1', 'GND2', 'GND3', 'GND.1', 'GND.2', 'GND.3']) {
      if (comp.pins[gndKey]) return comp.pins[gndKey];
    }
  }

  return undefined;
}

/**
 * Determines the exit normal vector and side for a pin
 */
export function getPinExitVector(
  comp?: ComponentInstance,
  pin?: PinDefinition
): { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  if (!comp || !pin) {
    return { x: 1, y: 0, side: 'right' };
  }

  // Explicit metadata on pin
  if (pin.exitNormal && pin.side) {
    return { x: pin.exitNormal.x, y: pin.exitNormal.y, side: pin.side };
  }

  if (comp.type === 'ARDUINO_UNO_R3') {
    // Top headers (digital, PWM, AREF, GND3) exit vertically UP (-Y)
    if (pin.offset.y <= 30) {
      return { x: 0, y: -1, side: 'top' };
    }
    // Bottom headers (power, analog) exit vertically DOWN (+Y)
    return { x: 0, y: 1, side: 'bottom' };
  }

  if (comp.type === 'ESP32_DEVKIT_V1') {
    const midX = (comp.dimensions?.width ?? 160.5) / 2;
    if (pin.offset.x <= midX) {
      return { x: -1, y: 0, side: 'left' };
    }
    return { x: 1, y: 0, side: 'right' };
  }

  // Rectangular modules (TB6612FNG, IR Sensor Array, Battery Pack, Motors)
  const w = comp.dimensions?.width ?? 180;
  const h = comp.dimensions?.height ?? 220;

  if (pin.offset.y <= 20) return { x: 0, y: -1, side: 'top' };
  if (pin.offset.y >= h - 20) return { x: 0, y: 1, side: 'bottom' };
  if (pin.offset.x <= 25) return { x: -1, y: 0, side: 'left' };
  if (pin.offset.x >= w - 25) return { x: 1, y: 0, side: 'right' };

  return { x: 1, y: 0, side: 'right' };
}
