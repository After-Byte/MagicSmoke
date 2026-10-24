import { describe, it, expect } from 'vitest';
import { validatePartManifest } from '../src/parts/schema';
import fs from 'fs';
import path from 'path';

describe('Hardware Component Schema & Manifest Validation (Issue #3)', () => {
  const partsToTest = [
    { name: 'ESP32 DevKit V1', filePath: 'parts/mcu/esp32-devkit-v1/part.json' },
    { name: 'TB6612FNG Driver', filePath: 'parts/drivers/tb6612fng/part.json' },
    { name: 'N20 Motor', filePath: 'parts/actuators/n20-motor/part.json' },
    { name: '7.4V Battery Pack', filePath: 'parts/power/battery-pack-7v4/part.json' },
    { name: 'HC-SR04 Sensor', filePath: 'parts/sensors/hc-sr04/part.json' },
    { name: 'Arduino Uno R3', filePath: 'parts/mcu/arduino-uno-r3/part.json' },
    { name: '8-Channel IR Sensor Array', filePath: 'parts/sensors/ir-sensor-array-8ch/part.json' },
  ];

  for (const part of partsToTest) {
    it(`validates ${part.name} against schema v1.0.0 with 0 errors`, () => {
      const fullPath = path.resolve(part.filePath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf-8');
      const json = JSON.parse(content);

      const result = validatePartManifest(json);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }

  it('rejects an invalid manifest with missing fields or duplicate pins', () => {
    const invalidManifest = {
      schema_version: '0.9.0', // wrong version
      id: 'bad-part',
      category: 'unknown_cat', // wrong category
      pins: [
        { name: 'PIN1', type: 'invalid_type' },
        { name: 'PIN1', type: 'power' }, // duplicate name
      ],
    };

    const result = validatePartManifest(invalidManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('schema_version'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Duplicate pin name'))).toBe(true);
  });
});
