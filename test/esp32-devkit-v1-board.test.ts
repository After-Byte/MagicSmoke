import { describe, it, expect } from 'vitest';
import { createESP32DevKit } from '../src/circuit/components';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { resolveComponentPin, getPinExitVector } from '../src/circuit/wokwi/pinAliasMapper';
import { WOKWI_ESP32_DEVKIT_V1_PINS, ESP32_DEVKIT_V1_ELEMENT_VIEWBOX } from '../src/circuit/wokwi/wokwiElements';
import { ESP32_PIN_SEMANTIC_ROLES } from '../src/circuit/ESP32DevKitV1Board';

describe('High-Fidelity ESP32 DevKit V1 Board (Wokwi Reverse-Engineered)', () => {
  const esp32 = createESP32DevKit('esp32_1', { x: 50, y: 70 });

  it('matches Wokwi exact physical geometry and 1.5x scaled coordinate space', () => {
    expect(esp32.type).toBe('ESP32_DEVKIT_V1');
    expect(esp32.dimensions?.width).toBe(160.5);
    expect(esp32.dimensions?.height).toBe(301.5);
    expect(ESP32_DEVKIT_V1_ELEMENT_VIEWBOX).toBe('0 0 107 201');

    // 30 pins total
    expect(Object.keys(esp32.pins).length).toBe(30);
    expect(WOKWI_ESP32_DEVKIT_V1_PINS.length).toBe(30);
  });

  it('aligns all 15 left-column pins with x = 7.5 and exits left (-X)', () => {
    const leftPins = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND2', 'VIN'];
    for (const pinId of leftPins) {
      const pin = esp32.pins[pinId];
      expect(pin).toBeDefined();
      expect(pin.offset.x).toBe(7.5);
      expect(pin.side).toBe('left');
      expect(pin.exitNormal?.x).toBe(-1);
      expect(pin.exitNormal?.y).toBe(0);

      const exitVec = getPinExitVector(esp32, pin);
      expect(exitVec.x).toBe(-1);
      expect(exitVec.y).toBe(0);
      expect(exitVec.side).toBe('left');
    }
  });

  it('aligns all 15 right-column pins with x = 152 and exits right (+X)', () => {
    const rightPins = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND1', '3V3'];
    for (const pinId of rightPins) {
      const pin = esp32.pins[pinId];
      expect(pin).toBeDefined();
      expect(pin.offset.x).toBe(152);
      expect(pin.side).toBe('right');
      expect(pin.exitNormal?.x).toBe(1);
      expect(pin.exitNormal?.y).toBe(0);

      const exitVec = getPinExitVector(esp32, pin);
      expect(exitVec.x).toBe(1);
      expect(exitVec.y).toBe(0);
      expect(exitVec.side).toBe('right');
    }
  });

  it('resolves all legacy GPIO aliases transparently without breaking backwards compatibility', () => {
    expect(resolveComponentPin(esp32, 'GPIO25')?.id).toBe('D25');
    expect(resolveComponentPin(esp32, 'GPIO23')?.id).toBe('D23');
    expect(resolveComponentPin(esp32, 'GPIO26')?.id).toBe('D26');
    expect(resolveComponentPin(esp32, 'GPIO27')?.id).toBe('D27');
    expect(resolveComponentPin(esp32, 'GPIO14')?.id).toBe('D14');
    expect(resolveComponentPin(esp32, 'GPIO18')?.id).toBe('D18');
    expect(resolveComponentPin(esp32, 'GPIO19')?.id).toBe('D19');
    expect(resolveComponentPin(esp32, 'GND')?.id).toBe('GND1');
    expect(resolveComponentPin(esp32, '3.3V')?.id).toBe('3V3');

    // Direct non-enumerable property lookup on esp32.pins
    expect((esp32.pins as any)['GPIO25'].id).toBe('D25');
    expect((esp32.pins as any)['GPIO23'].id).toBe('D23');
    expect((esp32.pins as any)['GND'].id).toBe('GND1');
  });

  it('interconnects GND1 and GND2 on the internal common ground plane', () => {
    const circuit = new CircuitEngine();
    circuit.addComponent(esp32);

    const connectedFromGnd1 = circuit.getConnectedPins(esp32.id, 'GND1');
    expect(connectedFromGnd1.some((p) => p.compId === esp32.id && p.pinId === 'GND2')).toBe(true);

    const connectedFromGnd2 = circuit.getConnectedPins(esp32.id, 'GND2');
    expect(connectedFromGnd2.some((p) => p.compId === esp32.id && p.pinId === 'GND1')).toBe(true);
  });

  it('provides semantic roles for all 30 ESP32 pins', () => {
    expect(Object.keys(ESP32_PIN_SEMANTIC_ROLES).length).toBe(30);
    expect(ESP32_PIN_SEMANTIC_ROLES['D25'].role).toContain('PWMA');
    expect(ESP32_PIN_SEMANTIC_ROLES['D23'].role).toContain('STBY');
    expect(ESP32_PIN_SEMANTIC_ROLES['D2'].role).toContain('LED');
  });
});
