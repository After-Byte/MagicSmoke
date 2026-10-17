import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllStoredProjects,
  getStoredProject,
  saveStoredProject,
  duplicateStoredProject,
  deleteStoredProject,
  renameStoredProject,
  createNewBlankCircuit,
} from '../src/project/projectStorage';
import { COMPONENT_CATALOG } from '../src/circuit/ComponentCatalog';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { createDefaultProject } from '../src/project/defaultProject';

// Mock localStorage in Vitest environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => {
    mockStorage[k] = v;
  },
  removeItem: (k: string) => {
    delete mockStorage[k];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

describe('Tinkercad Dashboard Project Persistence & Component Catalog (Phase 3 & 4)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('initializes default starter projects when storage is empty', () => {
    const projects = getAllStoredProjects();
    expect(projects.length).toBeGreaterThanOrEqual(3);

    const starter2wd = projects.find((p) => p.id === 'starter_2wd_robot');
    expect(starter2wd).toBeDefined();
    expect(starter2wd?.name).toContain('ESP32 2WD Robot');
    expect(starter2wd?.document.components.length).toBe(5);
    expect(starter2wd?.document.wires.length).toBe(15);
  });

  it('creates a new blank circuit with clean default configuration', () => {
    const newProj = createNewBlankCircuit();
    expect(newProj.id).toBeDefined();
    expect(newProj.name).toBe('New Circuit');
    expect(newProj.document.components.length).toBe(1);
    expect(newProj.document.wires.length).toBe(0);

    const retrieved = getStoredProject(newProj.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(newProj.id);
  });

  it('safely duplicates an existing project with independent ID and deep copy', () => {
    const initial = getAllStoredProjects();
    const target = initial[0];

    const copy = duplicateStoredProject(target.id);
    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(target.id);
    expect(copy?.name).toBe(`${target.name} (Copy)`);

    // Verify deep copy: modifying copy does not mutate original
    copy!.document.components[0].position = { x: 9999, y: 8888 };
    const reloadedOriginal = getStoredProject(target.id);
    expect(reloadedOriginal?.document.components[0].position.x).not.toBe(9999);
  });

  it('renames an existing project in storage', () => {
    const newProj = createNewBlankCircuit();
    const renamed = renameStoredProject(newProj.id, 'Obstacle Avoidance Robot V2');
    expect(renamed?.name).toBe('Obstacle Avoidance Robot V2');
    expect(renamed?.document.name).toBe('Obstacle Avoidance Robot V2');

    const retrieved = getStoredProject(newProj.id);
    expect(retrieved?.name).toBe('Obstacle Avoidance Robot V2');
  });

  it('deletes an existing project from storage', () => {
    const newProj = createNewBlankCircuit();
    const deleted = deleteStoredProject(newProj.id);
    expect(deleted).toBe(true);

    const retrieved = getStoredProject(newProj.id);
    expect(retrieved).toBeNull();
  });

  it('verifies all component catalog items instantiate valid components with non-empty pins', () => {
    expect(COMPONENT_CATALOG.length).toBeGreaterThanOrEqual(5);

    for (const item of COMPONENT_CATALOG) {
      expect(item.id).toBeDefined();
      expect(item.name).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.specs).toBeDefined();

      const instance = item.instantiate(`test_${item.id}`, { x: 100, y: 150 });
      expect(instance.id).toBe(`test_${item.id}`);
      expect(instance.position).toEqual({ x: 100, y: 150 });
      expect(Object.keys(instance.pins).length).toBeGreaterThan(0);
      expect(instance.dimensions).toBeDefined();
      expect(instance.dimensions!.width).toBeGreaterThan(0);
      expect(instance.dimensions!.height).toBeGreaterThan(0);
    }
  });

  it('dynamically adds a component from catalog to CircuitEngine without mutating existing connections', () => {
    const circuit = new CircuitEngine();
    const defaultDoc = createDefaultProject();
    defaultDoc.components.forEach((c) => circuit.addComponent(c));
    defaultDoc.wires.forEach((w) => circuit.addWire(w));

    const initialCompCount = circuit.getAllComponents().length;
    const initialWireCount = circuit.getAllWires().length;

    // Find Ground Bus catalog item
    const gndBusItem = COMPONENT_CATALOG.find((c) => c.type === 'GROUND_BUS')!;
    const gndInstance = gndBusItem.instantiate('gnd_bus_custom', { x: 400, y: 400 });
    circuit.addComponent(gndInstance);

    expect(circuit.getAllComponents().length).toBe(initialCompCount + 1);
    expect(circuit.getComponent('gnd_bus_custom')).toBeDefined();
    // Existing wires must remain intact
    expect(circuit.getAllWires().length).toBe(initialWireCount);
  });
});
