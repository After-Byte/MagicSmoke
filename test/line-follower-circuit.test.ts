import { describe, it, expect } from 'vitest';
import { createLineFollowerProject, LINE_FOLLOWER_PIN_MAPPING, LINE_FOLLOWER_SKETCH } from '../src/project/lineFollowerProject';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { validateProjectDocument } from '../src/project/types';

describe('Canonical Starter Project: Line Follower Robot (PHASE 3)', () => {
  const project = createLineFollowerProject();

  it('validates against ProjectDocument schema v1.0.0', () => {
    const val = validateProjectDocument(project);
    expect(val.valid).toBe(true);
    expect(val.errors).toEqual([]);
    expect(project.board).toBe('arduino-uno-r3');
    expect(project.name).toBe('Line Follower Robot — Arduino Uno + 8-Channel IR + TB6612FNG');
  });

  it('contains all required hardware components with valid pin definitions', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));

    const uno = circuit.getComponent('uno_1');
    const irArray = circuit.getComponent('ir_array_1');
    const tb = circuit.getComponent('tb6612_1');
    const batt = circuit.getComponent('batt_1');
    const gndBus = circuit.getComponent('gnd_bus_1');
    const motorL = circuit.getComponent('motor_left');
    const motorR = circuit.getComponent('motor_right');

    expect(uno).toBeDefined();
    expect(uno?.type).toBe('ARDUINO_UNO_R3');

    expect(irArray).toBeDefined();
    expect(irArray?.type).toBe('IR_SENSOR_ARRAY_8CH');

    expect(tb).toBeDefined();
    expect(tb?.type).toBe('TB6612FNG');

    expect(batt).toBeDefined();
    expect(batt?.type).toBe('BATTERY_PACK');

    expect(gndBus).toBeDefined();
    expect(gndBus?.type).toBe('GROUND_BUS');

    expect(motorL).toBeDefined();
    expect(motorL?.type).toBe('N20_MOTOR');

    expect(motorR).toBeDefined();
    expect(motorR?.type).toBe('N20_MOTOR');

    expect(circuit.getAllComponents()).toHaveLength(7);
  });

  it('validates that all 26 wires connect to real, existing pin endpoints without errors', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));

    expect(project.wires).toHaveLength(26);

    for (const wire of project.wires) {
      const check = circuit.validateConnection(
        wire.fromComponentId,
        wire.fromPinId,
        wire.toComponentId,
        wire.toPinId
      );
      expect(check.valid).toBe(true);
      const added = circuit.addWire(wire);
      expect(added).toBe(true);
    }

    expect(circuit.getAllWires()).toHaveLength(26);
  });

  it('verifies common ground, logic power, and motor power electrical integrity', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));
    project.wires.forEach((w) => circuit.addWire(w));

    const evalResult = circuit.evaluateCircuit();

    expect(evalResult.hasCommonGround).toBe(true);
    expect(evalResult.logicPowered).toBe(true);
    expect(evalResult.motorPowered).toBe(true);
    expect(evalResult.circuitErrors).toEqual([]);
    expect(evalResult.circuitWarnings).toEqual([]);
  });

  it('verifies that sensor output channels D1-D8 reach expected Arduino Uno MCU inputs', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));
    project.wires.forEach((w) => circuit.addWire(w));

    const expectedSensorToUno = [
      { sensorPin: 'D1', unoPin: 'D2' },
      { sensorPin: 'D2', unoPin: 'D4' },
      { sensorPin: 'D3', unoPin: 'D7' },
      { sensorPin: 'D4', unoPin: 'D8' },
      { sensorPin: 'D5', unoPin: 'D12' },
      { sensorPin: 'D6', unoPin: 'D13' },
      { sensorPin: 'D7', unoPin: 'A0' },
      { sensorPin: 'D8', unoPin: 'A1' },
    ];

    for (const mapping of expectedSensorToUno) {
      const connected = circuit.getConnectedPins('ir_array_1', mapping.sensorPin);
      const foundUnoPin = connected.some((p) => p.compId === 'uno_1' && p.pinId === mapping.unoPin);
      expect(foundUnoPin).toBe(true);
    }
  });

  it('verifies that TB6612 control inputs reach expected Arduino Uno MCU outputs', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));
    project.wires.forEach((w) => circuit.addWire(w));

    const expectedDriverToUno = [
      { tbPin: 'STBY', unoPin: 'D3' },
      { tbPin: 'PWMA', unoPin: 'D5' },
      { tbPin: 'AIN1', unoPin: 'D9' },
      { tbPin: 'AIN2', unoPin: 'D10' },
      { tbPin: 'PWMB', unoPin: 'D6' },
      { tbPin: 'BIN1', unoPin: 'D11' },
      { tbPin: 'BIN2', unoPin: 'A2' },
    ];

    for (const mapping of expectedDriverToUno) {
      const connected = circuit.getConnectedPins('tb6612_1', mapping.tbPin);
      const foundUnoPin = connected.some((p) => p.compId === 'uno_1' && p.pinId === mapping.unoPin);
      expect(foundUnoPin).toBe(true);
    }
  });

  it('verifies that TB6612 motor driver outputs connect to left and right N20 motors', () => {
    const circuit = new CircuitEngine();
    project.components.forEach((c) => circuit.addComponent(c));
    project.wires.forEach((w) => circuit.addWire(w));

    const ao1Conn = circuit.getConnectedPins('tb6612_1', 'AO1');
    const ao2Conn = circuit.getConnectedPins('tb6612_1', 'AO2');
    expect(ao1Conn.some((p) => p.compId === 'motor_left' && p.pinId === 'M_POS')).toBe(true);
    expect(ao2Conn.some((p) => p.compId === 'motor_left' && p.pinId === 'M_NEG')).toBe(true);

    const bo1Conn = circuit.getConnectedPins('tb6612_1', 'BO1');
    const bo2Conn = circuit.getConnectedPins('tb6612_1', 'BO2');
    expect(bo1Conn.some((p) => p.compId === 'motor_right' && p.pinId === 'M_POS')).toBe(true);
    expect(bo2Conn.some((p) => p.compId === 'motor_right' && p.pinId === 'M_NEG')).toBe(true);
  });

  it('verifies that starter circuit survives full JSON serialization and deserialization round trip', () => {
    const serialized = JSON.stringify(project);
    const parsed = JSON.parse(serialized);

    const check = validateProjectDocument(parsed);
    expect(check.valid).toBe(true);

    const circuit2 = new CircuitEngine();
    parsed.components.forEach((c: any) => circuit2.addComponent(c));
    parsed.wires.forEach((w: any) => circuit2.addWire(w));

    expect(circuit2.getAllComponents()).toHaveLength(7);
    expect(circuit2.getAllWires()).toHaveLength(26);
    expect(circuit2.evaluateCircuit().hasCommonGround).toBe(true);
    expect(circuit2.evaluateCircuit().logicPowered).toBe(true);
    expect(circuit2.evaluateCircuit().motorPowered).toBe(true);
  });
});
