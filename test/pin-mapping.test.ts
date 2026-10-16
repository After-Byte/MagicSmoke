import { describe, it, expect } from 'vitest';
import { CANONICAL_PIN_MAPPING, DEFAULT_SKETCH, createDefaultProject } from '../src/project/defaultProject';

describe('Authoritative Pin Mapping Regression Test (Issue #5 & Phase 5)', () => {
  it('guarantees that DEFAULT_SKETCH constants match CANONICAL_PIN_MAPPING', () => {
    for (const [pinName, pinNum] of Object.entries(CANONICAL_PIN_MAPPING)) {
      const regex = new RegExp(`constexpr\\s+int\\s+${pinName}\\s*=\\s*${pinNum}\\s*;`);
      expect(DEFAULT_SKETCH).toMatch(regex);
    }
  });

  it('guarantees that default schematic wires connect to the exact pins declared in firmware', () => {
    const project = createDefaultProject();
    const espWires = project.wires.filter((w) => w.fromComponentId === 'esp32_1');

    for (const [pinName, pinNum] of Object.entries(CANONICAL_PIN_MAPPING)) {
      const expectedEspPin = `GPIO${pinNum}`;
      const matchingWire = espWires.find((w) => w.fromPinId === expectedEspPin && w.toPinId === pinName);
      expect(matchingWire).toBeDefined();
      expect(matchingWire?.fromPinId).toBe(expectedEspPin);
      expect(matchingWire?.toPinId).toBe(pinName);
    }
  });

  it('validates that default project passes schema validation', () => {
    const project = createDefaultProject();
    expect(project.schemaVersion).toBe('1.0.0');
    expect(project.components.length).toBe(5);
    expect(project.wires.length).toBeGreaterThan(10);
  });
});
