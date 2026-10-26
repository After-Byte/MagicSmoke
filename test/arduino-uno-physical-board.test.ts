import { describe, it, expect, beforeEach } from 'vitest';
import { createArduinoUno } from '../src/circuit/components';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { ArduinoInterpreter, PinMode } from '../src/runtime/ArduinoInterpreter';
import { ArduinoUnoBehavioralRuntime } from '../src/runtime/ArduinoUnoBehavioralRuntime';
import { SimulationCoordinator } from '../src/simulation/SimulationCoordinator';
import { createLineFollowerProject, LINE_FOLLOWER_SKETCH } from '../src/project/lineFollowerProject';

describe('High-Fidelity Physical Arduino Uno R3 Board & On-Board Logic', () => {
  let uno = createArduinoUno('uno_1', { x: 50, y: 70 });

  it('exposes all physical board dimensions and accurate pin layout matching hardware reference', () => {
    expect(uno.type).toBe('ARDUINO_UNO_R3');
    expect(uno.dimensions?.width).toBe(330);
    expect(uno.dimensions?.height).toBe(230);

    // Verify top header pins (y = 17)
    const topPins = ['AREF', 'GND3', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
    for (const pinId of topPins) {
      const pin = uno.pins[pinId];
      expect(pin).toBeDefined();
      expect(pin.offset.y).toBe(17);
    }

    // Verify bottom header pins (y = 213)
    const bottomPins = ['IOREF', 'RESET', '3V3', '5V', 'GND1', 'GND2', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
    for (const pinId of bottomPins) {
      const pin = uno.pins[pinId];
      expect(pin).toBeDefined();
      expect(pin.offset.y).toBe(213);
    }
  });

  it('guarantees duplicate GND pins (GND1, GND2, GND3) connect to the internal common ground plane', () => {
    const circuit = new CircuitEngine();
    circuit.addComponent(uno);

    // Verify that traversing from any GND pin reaches all other GND pins
    const connectedFromGnd1 = circuit.getConnectedPins('uno_1', 'GND1');
    expect(connectedFromGnd1.some((p) => p.compId === 'uno_1' && p.pinId === 'GND2')).toBe(true);
    expect(connectedFromGnd1.some((p) => p.compId === 'uno_1' && p.pinId === 'GND3')).toBe(true);

    const connectedFromGnd3 = circuit.getConnectedPins('uno_1', 'GND3');
    expect(connectedFromGnd3.some((p) => p.compId === 'uno_1' && p.pinId === 'GND1')).toBe(true);
  });

  it('verifies that hardwareReset() re-executes setup() and pulses D13 on ArduinoInterpreter', async () => {
    const interp = new ArduinoInterpreter();
    let setupRunCount = 0;
    let d13HighObserved = false;

    interp.setEvents({
      onPinStateChange: (pin, state) => {
        if (pin === 13 && state === 1) {
          d13HighObserved = true;
        }
      },
    });

    const sketch = `
      int bootCounter = 0;
      void setup() {
        bootCounter = bootCounter + 1;
        pinMode(13, OUTPUT);
        digitalWrite(13, HIGH);
      }
      void loop() {
        delay(10);
      }
    `;

    const comp = interp.compile(sketch);
    expect(comp.success).toBe(true);

    interp.start();
    expect(interp.getGlobalVariable('bootCounter')).toBe(1);

    // Trigger Hardware Reset on MCU
    interp.hardwareReset();

    // Verify that setup was executed again
    expect(interp.getGlobalVariable('bootCounter')).toBe(2);
    expect(d13HighObserved).toBe(true);
  });

  it('verifies SimulationCoordinator.resetMcu() resets runtime without clearing project wires', async () => {
    const coordinator = new SimulationCoordinator();
    const project = createLineFollowerProject();
    coordinator.loadProject(project);

    expect(coordinator.circuit.getAllWires()).toHaveLength(26);

    const comp = await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);
    expect(comp.success).toBe(true);

    coordinator.tick(0.02);

    // Trigger hardware MCU reset
    coordinator.resetMcu();

    // Wires and components must remain 100% intact
    expect(coordinator.circuit.getAllWires()).toHaveLength(26);
    expect(coordinator.circuit.getAllComponents()).toHaveLength(7);
  });

  it('verifies all 4 Hardware Electrical Integrity checks pass for Line Follower Lab', () => {
    const circuit = new CircuitEngine();
    const project = createLineFollowerProject();
    project.components.forEach((c) => circuit.addComponent(c));
    project.wires.forEach((w) => circuit.addWire(w));

    const evalResult = circuit.evaluateCircuit();
    expect(evalResult.hasCommonGround).toBe(true);
    expect(evalResult.logicPowered).toBe(true);
    expect(evalResult.motorPowered).toBe(true);
    expect(evalResult.circuitErrors).toHaveLength(0);
    expect(evalResult.circuitWarnings).toHaveLength(0);
  });
});
