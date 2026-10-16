import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../src/circuit/components';
import { WireConnection } from '../src/circuit/types';

describe('Circuit Editor Data Layer & Wire Lifecycle (Phase 7)', () => {
  let circuit: CircuitEngine;

  beforeEach(() => {
    circuit = new CircuitEngine();
    circuit.addComponent(createESP32DevKit('esp32_1', { x: 50, y: 70 }));
    circuit.addComponent(createTB6612FNG('tb6612_1', { x: 340, y: 70 }));
    circuit.addComponent(createBatteryPack('batt_1', { x: 340, y: 340 }));
    circuit.addComponent(createN20Motor('motor_left', 'Left N20 Motor', { x: 620, y: 60 }));
  });

  it('successfully adds and removes a valid connection', () => {
    const wire: WireConnection = {
      id: 'w_test_1',
      fromComponentId: 'esp32_1',
      fromPinId: 'GPIO25',
      toComponentId: 'tb6612_1',
      toPinId: 'PWMA',
      color: '#a855f7',
    };

    const added = circuit.addWire(wire);
    expect(added).toBe(true);
    expect(circuit.getAllWires()).toHaveLength(1);
    expect(circuit.getWire('w_test_1')).toBeDefined();

    const removed = circuit.removeWire('w_test_1');
    expect(removed).toBe(true);
    expect(circuit.getAllWires()).toHaveLength(0);
    expect(circuit.getWire('w_test_1')).toBeUndefined();
  });

  it('rejects connections to nonexistent pins or components', () => {
    // Nonexistent destination component
    const badComp = circuit.validateConnection('esp32_1', 'GPIO25', 'fake_comp', 'PWMA');
    expect(badComp.valid).toBe(false);
    expect(badComp.reason).toContain("Destination component 'fake_comp' does not exist");

    // Nonexistent pin on source
    const badSrcPin = circuit.validateConnection('esp32_1', 'NONEXISTENT_PIN', 'tb6612_1', 'PWMA');
    expect(badSrcPin.valid).toBe(false);
    expect(badSrcPin.reason).toContain("Pin 'NONEXISTENT_PIN' does not exist");

    // Nonexistent pin on destination
    const badDstPin = circuit.validateConnection('esp32_1', 'GPIO25', 'tb6612_1', 'NONEXISTENT_PIN');
    expect(badDstPin.valid).toBe(false);
    expect(badDstPin.reason).toContain("Pin 'NONEXISTENT_PIN' does not exist");
  });

  it('prohibits self-connections on the same component', () => {
    const selfConn = circuit.validateConnection('esp32_1', 'GPIO25', 'esp32_1', 'GPIO26');
    expect(selfConn.valid).toBe(false);
    expect(selfConn.reason).toContain('Self-connections are prohibited');

    const added = circuit.addWire({
      id: 'w_self',
      fromComponentId: 'esp32_1',
      fromPinId: 'GPIO25',
      toComponentId: 'esp32_1',
      toPinId: 'GPIO26',
    });
    expect(added).toBe(false);
    expect(circuit.getAllWires()).toHaveLength(0);
  });

  it('prevents prohibited duplicate connections between the same pins', () => {
    circuit.addWire({
      id: 'w_orig',
      fromComponentId: 'esp32_1',
      fromPinId: 'GPIO25',
      toComponentId: 'tb6612_1',
      toPinId: 'PWMA',
    });
    expect(circuit.getAllWires()).toHaveLength(1);

    // Duplicate in forward direction
    const dupCheck = circuit.validateConnection('esp32_1', 'GPIO25', 'tb6612_1', 'PWMA');
    expect(dupCheck.valid).toBe(false);
    expect(dupCheck.reason).toContain('Duplicate connection');

    // Duplicate in reverse direction
    const revCheck = circuit.validateConnection('tb6612_1', 'PWMA', 'esp32_1', 'GPIO25');
    expect(revCheck.valid).toBe(false);
    expect(revCheck.reason).toContain('Duplicate connection');

    const addDup = circuit.addWire({
      id: 'w_dup',
      fromComponentId: 'tb6612_1',
      fromPinId: 'PWMA',
      toComponentId: 'esp32_1',
      toPinId: 'GPIO25',
    });
    expect(addDup).toBe(false);
    expect(circuit.getAllWires()).toHaveLength(1);
  });

  it('ensures wire deletion completely removes connectivity from the graph', () => {
    circuit.addWire({
      id: 'w_gnd',
      fromComponentId: 'esp32_1',
      fromPinId: 'GND',
      toComponentId: 'tb6612_1',
      toPinId: 'GND',
    });

    let connected = circuit.getConnectedPins('esp32_1', 'GND');
    expect(connected.some((p) => p.compId === 'tb6612_1' && p.pinId === 'GND')).toBe(true);

    circuit.removeWire('w_gnd');
    connected = circuit.getConnectedPins('esp32_1', 'GND');
    expect(connected.some((p) => p.compId === 'tb6612_1' && p.pinId === 'GND')).toBe(false);
  });

  it('ensures wire count accurately reflects underlying connection collection', () => {
    expect(circuit.getAllWires()).toHaveLength(0);

    circuit.addWire({ id: 'w1', fromComponentId: 'esp32_1', fromPinId: 'GPIO23', toComponentId: 'tb6612_1', toPinId: 'STBY' });
    circuit.addWire({ id: 'w2', fromComponentId: 'esp32_1', fromPinId: '3V3', toComponentId: 'tb6612_1', toPinId: 'VCC' });
    expect(circuit.getAllWires()).toHaveLength(2);

    circuit.removeWire('w1');
    expect(circuit.getAllWires()).toHaveLength(1);
    expect(circuit.getAllWires()[0].id).toBe('w2');
  });

  it('fails safely when attempting to delete nonexistent or stale wires', () => {
    const removed = circuit.removeWire('nonexistent_wire_id');
    expect(removed).toBe(false);
    expect(circuit.getAllWires()).toHaveLength(0);
  });

  it('verifies that component movement does not alter electrical connectivity', () => {
    circuit.addWire({
      id: 'w_signal',
      fromComponentId: 'esp32_1',
      fromPinId: 'GPIO25',
      toComponentId: 'tb6612_1',
      toPinId: 'PWMA',
    });

    circuit.setPinOutput('esp32_1', 'GPIO25', { digital: 1, dutyCycle: 0.8, voltage: 2.64 });

    // Move components to arbitrary canvas positions
    const esp = circuit.getComponent('esp32_1')!;
    esp.position = { x: 999, y: 888 };
    const tb = circuit.getComponent('tb6612_1')!;
    tb.position = { x: 123, y: 456 };

    // Electrical net connectivity must remain completely intact
    const signal = circuit.readNetSignal('tb6612_1', 'PWMA');
    expect(signal.digital).toBe(1);
    expect(signal.dutyCycle).toBeCloseTo(0.8);
    expect(signal.voltage).toBeCloseTo(2.64);
  });
});
