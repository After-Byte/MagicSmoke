import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createArduinoUno, createESP32DevKit } from '../src/circuit/components';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import {
  getAllStoredProjects,
  getStoredProject,
  saveStoredProject,
  createNewBlankCircuit,
  StoredProject,
} from '../src/project/projectStorage';
import { createLineFollowerProject, LINE_FOLLOWER_SKETCH } from '../src/project/lineFollowerProject';
import { CircuitThumbnail, CANONICAL_COMPONENT_DIMENSIONS } from '../src/dashboard/CircuitThumbnail';
import { ArduinoUnoR3Board } from '../src/circuit/ArduinoUnoR3Board';
import { ESP32DevKitV1Board } from '../src/circuit/ESP32DevKitV1Board';
import { SimulationCoordinator } from '../src/simulation/SimulationCoordinator';
import { computeManhattanWireRoute, Point, BoundingBox } from '../src/circuit/wireRouting';

// Mock localStorage for storage tests
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

describe('Hardware Authenticity, Component Rendering & Thumbnail Pipeline (Part 7)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('A. Component Rendering & Board Fidelity', () => {
    it('verifies Arduino Uno R3 canonical dimensions, mounting holes, and rotated pin labels', () => {
      const uno = createArduinoUno('uno_test', { x: 40, y: 50 });
      expect(uno.dimensions?.width).toBe(330);
      expect(uno.dimensions?.height).toBe(230);
      expect(CANONICAL_COMPONENT_DIMENSIONS['ARDUINO_UNO_R3'].width).toBe(330);
      expect(CANONICAL_COMPONENT_DIMENSIONS['ARDUINO_UNO_R3'].height).toBe(230);

      // Verify all 16 top pins are aligned at y = 17
      const topPins = ['AREF', 'GND3', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
      for (const pinId of topPins) {
        expect(uno.pins[pinId]).toBeDefined();
        expect(uno.pins[pinId].offset.y).toBe(17);
      }

      // Verify all 13 bottom pins are aligned at y = 213
      const bottomPins = ['IOREF', 'RESET', '3V3', '5V', 'GND1', 'GND2', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
      for (const pinId of bottomPins) {
        expect(uno.pins[pinId]).toBeDefined();
        expect(uno.pins[pinId].offset.y).toBe(213);
      }
    });

    it('verifies ESP32 DevKit V1 canonical 30-pin geometry and 160.5x301.5 dimensions', () => {
      const esp32 = createESP32DevKit('esp32_test', { x: 50, y: 70 });
      expect(esp32.dimensions?.width).toBe(160.5);
      expect(esp32.dimensions?.height).toBe(301.5);
      expect(CANONICAL_COMPONENT_DIMENSIONS['ESP32_DEVKIT_V1'].width).toBe(160.5);
      expect(CANONICAL_COMPONENT_DIMENSIONS['ESP32_DEVKIT_V1'].height).toBe(301.5);

      const pinKeys = Object.keys(esp32.pins);
      expect(pinKeys).toHaveLength(30);

      // Left column: 15 pins at x = 7.5
      const leftPins = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND2', 'VIN'];
      for (const pinId of leftPins) {
        expect(esp32.pins[pinId]).toBeDefined();
        expect(esp32.pins[pinId].offset.x).toBe(7.5);
      }

      // Right column: 15 pins at x = 152
      const rightPins = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND1', '3V3'];
      for (const pinId of rightPins) {
        expect(esp32.pins[pinId]).toBeDefined();
        expect(esp32.pins[pinId].offset.x).toBe(152);
      }
    });

    it('isolates SVG defs and filters between multiple ESP32 and Arduino boards on the same canvas', () => {
      const uno1 = createArduinoUno('uno_1', { x: 0, y: 0 });
      const uno2 = createArduinoUno('uno_2', { x: 400, y: 0 });
      const esp1 = createESP32DevKit('esp32_1', { x: 0, y: 300 });
      const esp2 = createESP32DevKit('esp32_2', { x: 200, y: 300 });

      expect(uno1.id).not.toBe(uno2.id);
      expect(esp1.id).not.toBe(esp2.id);

      const unoMarkup = renderToStaticMarkup(React.createElement(ArduinoUnoR3Board, { component: uno1 }));
      expect(unoMarkup).toContain('greenLedGlow_uno_1');
      expect(unoMarkup).toContain('pcbTealGrad_uno_1');

      const espMarkup = renderToStaticMarkup(React.createElement(ESP32DevKitV1Board, { component: esp1 }));
      expect(espMarkup).toContain('esp32RedLedFilter_esp32_1');
      expect(espMarkup).toContain('esp32PinPattern_esp32_1');
    });
  });

  describe('B. Dashboard Thumbnail Pipeline & Framing', () => {
    it('calculates balanced bounding box with reasonable padding for isolated single components', () => {
      const esp32 = createESP32DevKit('esp32_1', { x: 100, y: 100 });
      const html = renderToStaticMarkup(React.createElement(CircuitThumbnail, { components: [esp32], wires: [] }));
      expect(html).toContain('viewBox=');

      const match = html.match(/viewBox="([^"]+)"/);
      expect(match).not.toBeNull();
      const [vbX, vbY, vbW, vbH] = (match ? match[1] : '').split(' ').map(Number);

      // Width and height must be at least minFrameW (280) and minFrameH (175)
      expect(vbW).toBeGreaterThanOrEqual(280);
      expect(vbH).toBeGreaterThanOrEqual(175);

      // Component must be fully inside the viewBox bounds
      expect(vbX).toBeLessThanOrEqual(esp32.position.x);
      expect(vbY).toBeLessThanOrEqual(esp32.position.y);
      expect(vbX + vbW).toBeGreaterThanOrEqual(esp32.position.x + 160.5);
      expect(vbY + vbH).toBeGreaterThanOrEqual(esp32.position.y + 301.5);
    });

    it('renders unpopulated canvas blueprint when component list is empty', () => {
      const html = renderToStaticMarkup(React.createElement(CircuitThumbnail, { components: [], wires: [] }));
      expect(html).toContain('Unpopulated Canvas');
      expect(html).toContain('Ready to wire');
    });

    it('renders canonical Arduino Uno board component inside CircuitThumbnail without crude mock shapes', () => {
      const uno = createArduinoUno('uno_1', { x: 40, y: 50 });
      const html = renderToStaticMarkup(React.createElement(CircuitThumbnail, { components: [uno], wires: [] }));

      // Must find real Arduino board group and interactive female header pins
      expect(html).toContain('arduino-uno-physical-board');
      expect(html).toContain('data-testid="pin-uno_1-5V"');
      expect(html).toContain('data-testid="pin-uno_1-D13"');
    });

    it('renders canonical ESP32 DevKit V1 component inside CircuitThumbnail without crude mock shapes', () => {
      const esp32 = createESP32DevKit('esp32_1', { x: 40, y: 50 });
      const html = renderToStaticMarkup(React.createElement(CircuitThumbnail, { components: [esp32], wires: [] }));

      expect(html).toContain('esp32-devkit-v1-physical-board');
      expect(html).toContain('data-testid="pin-esp32_1-D2"');
      expect(html).toContain('data-testid="pin-esp32_1-3V3"');
    });
  });

  describe('C. Storage Migration & Cache Invalidation', () => {
    it('seamlessly migrates legacy stored projects containing outdated 9-pin ESP32 to canonical 30-pin board', () => {
      // Simulate an old project saved before the 30-pin upgrade
      const legacyProject: StoredProject = {
        id: 'proj_legacy_user',
        name: 'Legacy User Circuit',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        isStarter: false,
        document: {
          schemaVersion: '1.0.0',
          name: 'Legacy User Circuit',
          board: 'esp32-devkit-v1',
          code: 'void setup() {} void loop() {}',
          components: [
            {
              id: 'esp32_old',
              type: 'ESP32_DEVKIT_V1',
              name: 'ESP32 DevKit V1',
              position: { x: 50, y: 70 },
              dimensions: { width: 200, height: 235 }, // old dimensions
              pins: {
                '3V3': { id: '3V3', name: '3V3', type: 4 as any, description: '3.3V', offset: { x: 0, y: 50 } },
                'GND': { id: 'GND', name: 'GND', type: 6 as any, description: 'GND', offset: { x: 0, y: 80 } },
              },
            },
          ],
          wires: [],
        },
      };

      localStorage.setItem('magicsmoke_projects_v1', JSON.stringify([legacyProject]));

      // Load projects: migration must run automatically
      const loaded = getAllStoredProjects();
      const migrated = loaded.find((p) => p.id === 'proj_legacy_user');
      expect(migrated).toBeDefined();

      const espComp = migrated?.document.components[0];
      expect(espComp?.dimensions?.width).toBe(160.5);
      expect(espComp?.dimensions?.height).toBe(301.5);
      expect(Object.keys(espComp?.pins || {})).toHaveLength(30);
      expect(espComp?.pins['D2']).toBeDefined();
      expect(espComp?.pins['VIN']).toBeDefined();
    });

    it('automatically keeps starter labs up-to-date with canonical hardware templates', () => {
      // Place a dummy outdated starter in storage
      const outdatedStarter: StoredProject = {
        id: 'starter_line_follower_robot',
        name: 'Old Line Follower',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        isStarter: true,
        document: {
          schemaVersion: '1.0.0',
          name: 'Old Line Follower',
          board: 'arduino-uno-r3',
          code: '',
          components: [],
          wires: [],
        },
      };

      localStorage.setItem('magicsmoke_projects_v1', JSON.stringify([outdatedStarter]));

      const loaded = getAllStoredProjects();
      const refreshed = loaded.find((p) => p.id === 'starter_line_follower_robot');
      expect(refreshed).toBeDefined();
      expect(refreshed?.document.components).toHaveLength(7);
      expect(refreshed?.document.wires).toHaveLength(26);
    });
  });

  describe('D. Wire Routing & Electrical Integrity', () => {
    it('ensures wires approaching Arduino top pins from below route around the board without cutting across PCB', () => {
      const from: Point = { x: 260, y: 465 }; // IR Array pin
      const fromNormal: Point = { x: 1, y: 0 }; // exits right
      const to: Point = { x: 329, y: 67 }; // Uno D2 top pin
      const toNormal: Point = { x: 0, y: -1 }; // exits UP

      const unoBox: BoundingBox = { x: 40, y: 50, width: 330, height: 230 };
      const obstacles = [unoBox];

      const route = computeManhattanWireRoute(from, fromNormal, to, toNormal, undefined, obstacles);
      expect(route.points.length).toBeGreaterThanOrEqual(4);

      // The wire must not cut through the interior of unoBox (between x: 40 and 370, y: 50 and 280)
      for (const pt of route.points.slice(0, -1)) {
        // Points should either be outside the horizontal bounds or above the top edge
        const insideInterior = pt.x > unoBox.x + 10 && pt.x < unoBox.x + unoBox.width - 10 && pt.y > unoBox.y + 10 && pt.y < unoBox.y + unoBox.height - 10;
        expect(insideInterior).toBe(false);
      }
    });

    it('verifies full compile, save, load, and run lifecycle for Line Follower Lab', async () => {
      const coordinator = new SimulationCoordinator();
      const project = createLineFollowerProject();
      coordinator.loadProject(project);

      // Compile firmware
      const compRes = await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);
      expect(compRes.success).toBe(true);

      // Verify electrical connectivity
      const evalResult = coordinator.circuit.evaluateCircuit();
      expect(evalResult.hasCommonGround).toBe(true);
      expect(evalResult.logicPowered).toBe(true);
      expect(evalResult.motorPowered).toBe(true);
      expect(evalResult.circuitErrors).toHaveLength(0);

      // Save project to storage
      const saved = saveStoredProject(project, 'test_lf_lifecycle');
      expect(saved.id).toBe('test_lf_lifecycle');

      // Reload project from storage
      const reloaded = getStoredProject('test_lf_lifecycle');
      expect(reloaded).not.toBeNull();
      expect(reloaded?.document.components).toHaveLength(7);
      expect(reloaded?.document.wires).toHaveLength(26);
    });
  });
});
