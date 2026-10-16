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

    // Find Ground net
    const espGndConnected = this.getConnectedPins('esp32_1', 'GND');
    const tbGndConnected = this.getConnectedPins('tb6612_1', 'GND');
    const battGndConnected = this.getConnectedPins('batt_1', 'NEG');

    const tbSharesEspGnd = espGndConnected.some((p) => p.compId === 'tb6612_1' && p.pinId === 'GND');
    const tbSharesBattGnd = battGndConnected.some((p) => p.compId === 'tb6612_1' && p.pinId === 'GND');
    const hasCommonGround = tbSharesEspGnd && tbSharesBattGnd;

    if (!tbSharesEspGnd) {
      warnings.push('TB6612FNG GND is not connected to ESP32 GND (missing common logic ground).');
    }
    if (!tbSharesBattGnd) {
      warnings.push('TB6612FNG GND is not connected to Battery GND (missing motor return ground).');
    }

    // Check VCC (Logic Power)
    const tbVccConnected = this.getConnectedPins('tb6612_1', 'VCC');
    const logicPowered = tbVccConnected.some((p) => p.compId === 'esp32_1' && p.pinId === '3V3');
    if (!logicPowered) {
      warnings.push('TB6612FNG VCC is not connected to 3.3V (driver logic is unpowered).');
    }

    // Check VM (Motor Power)
    const tbVmConnected = this.getConnectedPins('tb6612_1', 'VM');
    const motorPowered = tbVmConnected.some((p) => p.compId === 'batt_1' && p.pinId === 'POS');
    if (!motorPowered) {
      warnings.push('TB6612FNG VM is not connected to Battery V+ (motors have no drive power).');
    }

    // Check Motor wiring
    const ao1Connected = this.getConnectedPins('tb6612_1', 'AO1');
    const ao2Connected = this.getConnectedPins('tb6612_1', 'AO2');
    const motorAConnected = ao1Connected.some(p => p.compId === 'motor_left') && ao2Connected.some(p => p.compId === 'motor_left');
    if (!motorAConnected) {
      warnings.push('Left motor (AO1/AO2) leads are incomplete or disconnected.');
    }

    const bo1Connected = this.getConnectedPins('tb6612_1', 'BO1');
    const bo2Connected = this.getConnectedPins('tb6612_1', 'BO2');
    const motorBConnected = bo1Connected.some(p => p.compId === 'motor_right') && bo2Connected.some(p => p.compId === 'motor_right');
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
