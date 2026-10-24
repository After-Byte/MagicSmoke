import { ComponentInstance, WireConnection, PinState, CircuitStateSnapshot } from './types';

export class CircuitEngine {
  private components: Map<string, ComponentInstance> = new Map();
  private wires: Map<string, WireConnection> = new Map();
  private pinStates: Map<string, PinState> = new Map(); // key = "componentId:pinId"

  constructor(components: ComponentInstance[] = [], wires: WireConnection[] = []) {
    components.forEach((c) => this.addComponent(c));
    wires.forEach((w) => this.addWire(w));
  }

  public addComponent(comp: ComponentInstance) {
    this.components.set(comp.id, comp);
  }

  public removeComponent(id: string) {
    this.components.delete(id);
    // Remove wires associated with component
    for (const [wireId, wire] of this.wires.entries()) {
      if (wire.fromComponentId === id || wire.toComponentId === id) {
        this.wires.delete(wireId);
      }
    }
  }

  public getComponent(id: string): ComponentInstance | undefined {
    return this.components.get(id);
  }

  public getAllComponents(): ComponentInstance[] {
    return Array.from(this.components.values());
  }

  /**
   * Validate a proposed wire connection before adding it to the circuit
   */
  public validateConnection(
    fromCompId: string,
    fromPinId: string,
    toCompId: string,
    toPinId: string
  ): { valid: boolean; reason?: string } {
    const fromComp = this.components.get(fromCompId);
    const toComp = this.components.get(toCompId);

    if (!fromComp) {
      return { valid: false, reason: `Source component '${fromCompId}' does not exist.` };
    }
    if (!toComp) {
      return { valid: false, reason: `Destination component '${toCompId}' does not exist.` };
    }
    if (fromCompId === toCompId) {
      return { valid: false, reason: 'Self-connections are prohibited.' };
    }

    const fromPin = fromComp.pins[fromPinId];
    const toPin = toComp.pins[toPinId];

    if (!fromPin) {
      return { valid: false, reason: `Pin '${fromPinId}' does not exist on '${fromComp.name}'.` };
    }
    if (!toPin) {
      return { valid: false, reason: `Pin '${toPinId}' does not exist on '${toComp.name}'.` };
    }

    // Check for duplicate wire (in either direction)
    const duplicate = Array.from(this.wires.values()).some(
      (w) =>
        (w.fromComponentId === fromCompId && w.fromPinId === fromPinId && w.toComponentId === toCompId && w.toPinId === toPinId) ||
        (w.fromComponentId === toCompId && w.fromPinId === toPinId && w.toComponentId === fromCompId && w.toPinId === fromPinId)
    );

    if (duplicate) {
      return { valid: false, reason: 'Duplicate connection: these pins are already connected.' };
    }

    return { valid: true };
  }

  public addWire(wire: WireConnection): boolean {
    const check = this.validateConnection(
      wire.fromComponentId,
      wire.fromPinId,
      wire.toComponentId,
      wire.toPinId
    );
    if (!check.valid) {
      return false;
    }
    this.wires.set(wire.id, wire);
    return true;
  }

  public removeWire(id: string): boolean {
    return this.wires.delete(id);
  }

  public getWire(id: string): WireConnection | undefined {
    return this.wires.get(id);
  }

  public getAllWires(): WireConnection[] {
    return Array.from(this.wires.values());
  }

  public setPinOutput(componentId: string, pinId: string, state: Partial<PinState>) {
    const key = `${componentId}:${pinId}`;
    const current = this.pinStates.get(key) || { digital: 0, dutyCycle: 0, frequency: 0, voltage: 0 };
    this.pinStates.set(key, { ...current, ...state });
  }

  public getPinState(componentId: string, pinId: string): PinState {
    const key = `${componentId}:${pinId}`;
    return this.pinStates.get(key) || { digital: 0, dutyCycle: 0, frequency: 0, voltage: 0 };
  }

  /**
   * Find all pins connected to a given pin via wires (transitive graph search)
   */
  public getConnectedPins(startCompId: string, startPinId: string): Array<{ compId: string; pinId: string }> {
    const visited = new Set<string>();
    const queue: Array<{ compId: string; pinId: string }> = [{ compId: startCompId, pinId: startPinId }];
    const results: Array<{ compId: string; pinId: string }> = [];

    const keyFor = (c: string, p: string) => `${c}:${p}`;
    visited.add(keyFor(startCompId, startPinId));

    while (queue.length > 0) {
      const current = queue.shift()!;
      results.push(current);

      // Electrical internal buses (e.g. Ground Bus distribution strip & MCU ground planes)
      const currentComp = this.components.get(current.compId);
      if (currentComp) {
        if (currentComp.type === 'GROUND_BUS') {
          for (const busPinId of Object.keys(currentComp.pins)) {
            if (!visited.has(keyFor(current.compId, busPinId))) {
              visited.add(keyFor(current.compId, busPinId));
              queue.push({ compId: current.compId, pinId: busPinId });
            }
          }
        } else if (
          currentComp.type === 'ARDUINO_UNO_R3' &&
          (current.pinId === 'GND1' || current.pinId === 'GND2' || current.pinId === 'GND3')
        ) {
          for (const gPin of ['GND1', 'GND2', 'GND3']) {
            if (!visited.has(keyFor(current.compId, gPin))) {
              visited.add(keyFor(current.compId, gPin));
              queue.push({ compId: current.compId, pinId: gPin });
            }
          }
        }
      }

      for (const wire of this.wires.values()) {
        let neighbor: { compId: string; pinId: string } | null = null;
        if (wire.fromComponentId === current.compId && wire.fromPinId === current.pinId) {
          neighbor = { compId: wire.toComponentId, pinId: wire.toPinId };
        } else if (wire.toComponentId === current.compId && wire.toPinId === current.pinId) {
          neighbor = { compId: wire.fromComponentId, pinId: wire.fromPinId };
        }

        if (neighbor && !visited.has(keyFor(neighbor.compId, neighbor.pinId))) {
          visited.add(keyFor(neighbor.compId, neighbor.pinId));
          queue.push(neighbor);
        }
      }
    }

    return results;
  }

  /**
   * Read the effective signal entering an input pin from its connected net
   */
  public readNetSignal(compId: string, pinId: string): PinState {
    const connected = this.getConnectedPins(compId, pinId);
    let maxDigital: 0 | 1 = 0;
    let maxDuty = 0;
    let maxFreq = 0;
    let maxVoltage = 0;

    for (const node of connected) {
      const state = this.pinStates.get(`${node.compId}:${node.pinId}`);
      if (state) {
        if (state.digital === 1) maxDigital = 1;
        if (state.dutyCycle > maxDuty) maxDuty = state.dutyCycle;
        if (state.frequency > maxFreq) maxFreq = state.frequency;
        if (state.voltage > maxVoltage) maxVoltage = state.voltage;
      }
    }

    return {
      digital: maxDigital,
      dutyCycle: maxDuty,
      frequency: maxFreq,
      voltage: maxVoltage,
    };
  }

  /**
   * Evaluate electrical rules and connectivity
   */
  public evaluateCircuit(): CircuitStateSnapshot {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Find active MCU, Driver, and Power components
    const mcu = Array.from(this.components.values()).find(
      (c) => c.type === 'ESP32_DEVKIT_V1' || c.type === 'ARDUINO_UNO_R3'
    );
    const tbDriver = Array.from(this.components.values()).find((c) => c.type === 'TB6612FNG');
    const battery = Array.from(this.components.values()).find((c) => c.type === 'BATTERY_PACK');
    const irSensor = Array.from(this.components.values()).find((c) => c.type === 'IR_SENSOR_ARRAY_8CH');

    const tbId = tbDriver?.id || 'tb6612_1';
    const battId = battery?.id || 'batt_1';
    const mcuId = mcu?.id || 'esp32_1';

    // Find Ground net
    // MCU ground pins: ESP32 has 'GND'; Uno has 'GND1', 'GND2', 'GND3'
    const mcuGndPins = mcu?.type === 'ARDUINO_UNO_R3' ? ['GND1', 'GND2', 'GND3'] : ['GND'];
    const tbGndConnected = this.getConnectedPins(tbId, 'GND');
    const battGndConnected = this.getConnectedPins(battId, 'NEG');

    const tbSharesMcuGnd = tbGndConnected.some((p) => p.compId === mcuId && mcuGndPins.includes(p.pinId));
    const tbSharesBattGnd = battGndConnected.some((p) => p.compId === tbId && p.pinId === 'GND');
    const hasCommonGround = tbSharesMcuGnd && tbSharesBattGnd;

    if (!tbSharesMcuGnd) {
      warnings.push(`TB6612FNG GND is not connected to ${mcu?.name || 'MCU'} GND (missing common logic ground).`);
    }
    if (!tbSharesBattGnd) {
      warnings.push('TB6612FNG GND is not connected to Battery GND (missing motor return ground).');
    }

    // Check VCC (Logic Power: 3.3V from ESP32 or 5V/3.3V from Arduino Uno)
    const tbVccConnected = this.getConnectedPins(tbId, 'VCC');
    const logicPowered = tbVccConnected.some(
      (p) => p.compId === mcuId && (p.pinId === '3V3' || p.pinId === '5V')
    );
    if (!logicPowered) {
      warnings.push(`TB6612FNG VCC is not connected to ${mcu?.type === 'ARDUINO_UNO_R3' ? '5V' : '3.3V'} (driver logic is unpowered).`);
    }

    // Check VM (Motor Power)
    const tbVmConnected = this.getConnectedPins(tbId, 'VM');
    const motorPowered = tbVmConnected.some((p) => p.compId === battId && p.pinId === 'POS');
    if (!motorPowered) {
      warnings.push('TB6612FNG VM is not connected to Battery V+ (motors have no drive power).');
    }

    // Check IR Sensor Array power & ground if present
    if (irSensor) {
      const irGndConnected = this.getConnectedPins(irSensor.id, 'GND');
      const irSharesCommonGnd = irGndConnected.some(
        (p) =>
          (p.compId === mcuId && mcuGndPins.includes(p.pinId)) ||
          (p.compId === tbId && p.pinId === 'GND') ||
          (p.compId === battId && p.pinId === 'NEG')
      );
      if (!irSharesCommonGnd) {
        warnings.push('8-Channel IR Sensor Array GND is not connected to common ground.');
      }

      const irVccConnected = this.getConnectedPins(irSensor.id, 'VCC');
      const irHasPower = irVccConnected.some(
        (p) => p.compId === mcuId && (p.pinId === '5V' || p.pinId === '3V3')
      );
      if (!irHasPower) {
        warnings.push('8-Channel IR Sensor Array VCC is not connected to 5V power supply.');
      }
    }

    // Check Motor wiring
    const ao1Connected = this.getConnectedPins(tbId, 'AO1');
    const ao2Connected = this.getConnectedPins(tbId, 'AO2');
    const motorAConnected = ao1Connected.some((p) => p.compId === 'motor_left') && ao2Connected.some((p) => p.compId === 'motor_left');
    if (!motorAConnected) {
      warnings.push('Left motor (AO1/AO2) leads are incomplete or disconnected.');
    }

    const bo1Connected = this.getConnectedPins(tbId, 'BO1');
    const bo2Connected = this.getConnectedPins(tbId, 'BO2');
    const motorBConnected = bo1Connected.some((p) => p.compId === 'motor_right') && bo2Connected.some((p) => p.compId === 'motor_right');
    if (!motorBConnected) {
      warnings.push('Right motor (BO1/BO2) leads are incomplete or disconnected.');
    }

    return {
      netStates: Object.fromEntries(this.pinStates.entries()),
      circuitErrors: errors,
      circuitWarnings: warnings,
      hasCommonGround,
      logicPowered,
      motorPowered,
    };
  }
}
