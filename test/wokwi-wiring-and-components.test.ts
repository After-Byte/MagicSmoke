import { describe, it, expect } from 'vitest';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { createArduinoUno, createESP32DevKit, createTB6612FNG, createBatteryPack } from '../src/circuit/components';
import {
  WOKWI_ARDUINO_UNO_PINS,
  WOKWI_ESP32_DEVKIT_V1_PINS,
  HEADER_PITCH_MM,
  ARDUINO_UNO_ELEMENT_VIEWBOX,
  ARDUINO_UNO_ELEMENT_DIMENSIONS,
  ESP32_DEVKIT_V1_ELEMENT_VIEWBOX,
  ESP32_DEVKIT_V1_ELEMENT_DIMENSIONS,
} from '../src/circuit/wokwi/wokwiElements';
import {
  normalizeUnoPinId,
  normalizeEsp32PinId,
  canonicalToWokwiUnoPinId,
  resolveComponentPin,
  getPinExitVector,
} from '../src/circuit/wokwi/pinAliasMapper';
import {
  pointsToRoundedCornerPath,
  computeManhattanWireRoute,
  computeSmartWireBezier,
  extractSegmentsFromPoints,
  BoundingBox,
  Point,
} from '../src/circuit/wireRouting';
import { createLineFollowerProject } from '../src/project/lineFollowerProject';

describe('Wokwi Hardware Elements Architecture & Coordinate Contract', () => {
  it('exposes exact 31-pin Wokwi Uno coordinate table with physical 2.54mm pitch', () => {
    expect(WOKWI_ARDUINO_UNO_PINS.length).toBe(31);
    expect(HEADER_PITCH_MM).toBe(2.54);
    expect(ARDUINO_UNO_ELEMENT_VIEWBOX).toBe('-4 0 72.58 53.34');
    expect(ARDUINO_UNO_ELEMENT_DIMENSIONS.widthMm).toBe(72.58);
    expect(ARDUINO_UNO_ELEMENT_DIMENSIONS.heightMm).toBe(53.34);

    const pinNames = WOKWI_ARDUINO_UNO_PINS.map((p) => p.name);
    // Key Wokwi pins present
    expect(pinNames).toContain('13');
    expect(pinNames).toContain('0');
    expect(pinNames).toContain('AREF');
    expect(pinNames).toContain('GND.1');
    expect(pinNames).toContain('GND.2');
    expect(pinNames).toContain('GND.3');
    expect(pinNames).toContain('5V');
    expect(pinNames).toContain('3.3V');
    expect(pinNames).toContain('RESET');
    expect(pinNames).toContain('A0');
    expect(pinNames).toContain('A5');
  });

  it('provides PinSignalInfo metadata for every pin (SPI, PWM, Analog, Power, GND)', () => {
    const pin13 = WOKWI_ARDUINO_UNO_PINS.find((p) => p.name === '13');
    expect(pin13?.signals.some((s) => s.type === 'spi')).toBe(true);

    const pin3 = WOKWI_ARDUINO_UNO_PINS.find((p) => p.name === '3');
    expect(pin3?.signals.some((s) => s.type === 'pwm')).toBe(true);

    const pinA0 = WOKWI_ARDUINO_UNO_PINS.find((p) => p.name === 'A0');
    expect(pinA0?.signals.some((s) => s.type === 'analog')).toBe(true);

    const pin5V = WOKWI_ARDUINO_UNO_PINS.find((p) => p.name === '5V');
    expect(pin5V?.signals.some((s) => s.type === 'power')).toBe(true);

    const gnd1 = WOKWI_ARDUINO_UNO_PINS.find((p) => p.name === 'GND.1');
    expect(gnd1?.signals.some((s) => s.type === 'power' && (s as any).signal === 'GND')).toBe(true);
  });

  it('exposes exact 30-pin Wokwi ESP32 DevKit V1 coordinate table and dimensions', () => {
    expect(WOKWI_ESP32_DEVKIT_V1_PINS.length).toBe(30);
    expect(ESP32_DEVKIT_V1_ELEMENT_VIEWBOX).toBe('0 0 107 201');
    expect(ESP32_DEVKIT_V1_ELEMENT_DIMENSIONS.widthMm).toBe(28.2);
    expect(ESP32_DEVKIT_V1_ELEMENT_DIMENSIONS.heightMm).toBe(54.053);

    const pinNames = WOKWI_ESP32_DEVKIT_V1_PINS.map((p) => p.name);
    // Key Wokwi ESP32 pins
    expect(pinNames).toContain('EN');
    expect(pinNames).toContain('D23');
    expect(pinNames).toContain('D25');
    expect(pinNames).toContain('D26');
    expect(pinNames).toContain('D27');
    expect(pinNames).toContain('D14');
    expect(pinNames).toContain('D18');
    expect(pinNames).toContain('D19');
    expect(pinNames).toContain('3V3');
    expect(pinNames).toContain('VIN');
    expect(pinNames).toContain('GND.1');
    expect(pinNames).toContain('GND.2');

    // Left column pins have x = 5, right column pins have x = 101.3
    const pinEN = WOKWI_ESP32_DEVKIT_V1_PINS.find((p) => p.name === 'EN');
    expect(pinEN?.x).toBe(5);
    expect(pinEN?.y).toBe(24);

    const pinD23 = WOKWI_ESP32_DEVKIT_V1_PINS.find((p) => p.name === 'D23');
    expect(pinD23?.x).toBe(101.3);
    expect(pinD23?.y).toBe(24);
  });
});

describe('Bidirectional Pin Alias Mapper (Backward Compatibility)', () => {
  it('normalizes Wokwi pin names to MagicSmoke canonical IDs and vice-versa', () => {
    expect(normalizeUnoPinId('13')).toBe('D13');
    expect(normalizeUnoPinId('D13')).toBe('D13');
    expect(normalizeUnoPinId('0')).toBe('D0');
    expect(normalizeUnoPinId('3.3V')).toBe('3V3');
    expect(normalizeUnoPinId('3V3')).toBe('3V3');
    expect(normalizeUnoPinId('GND.1')).toBe('GND3');
    expect(normalizeUnoPinId('GND.2')).toBe('GND1');
    expect(normalizeUnoPinId('GND.3')).toBe('GND2');
    expect(normalizeUnoPinId('RESET')).toBe('RESET');
    expect(normalizeUnoPinId('A2')).toBe('A2');

    expect(canonicalToWokwiUnoPinId('D13')).toBe('13');
    expect(canonicalToWokwiUnoPinId('D0')).toBe('0');
    expect(canonicalToWokwiUnoPinId('3V3')).toBe('3.3V');
    expect(canonicalToWokwiUnoPinId('GND3')).toBe('GND.1');
    expect(canonicalToWokwiUnoPinId('GND1')).toBe('GND.2');
    expect(canonicalToWokwiUnoPinId('GND2')).toBe('GND.3');
  });

  it('resolves component pins transparently via canonical IDs and Wokwi aliases', () => {
    const uno = createArduinoUno('uno_1', { x: 0, y: 0 });

    // Lookup via canonical ID
    const pinD13 = resolveComponentPin(uno, 'D13');
    expect(pinD13).toBeDefined();
    expect(pinD13?.id).toBe('D13');

    // Lookup via Wokwi alias
    const pin13 = resolveComponentPin(uno, '13');
    expect(pin13).toBeDefined();
    expect(pin13?.id).toBe('D13');

    // Non-enumerable direct access on comp.pins
    expect((uno.pins as any)['13']).toBeDefined();
    expect((uno.pins as any)['GND.1']).toBeDefined();
    expect((uno.pins as any)['3.3V']).toBeDefined();

    // Enumerable keys count remains pristine 29 pins
    expect(Object.keys(uno.pins).length).toBe(29);
  });

  it('assigns directional exit normal vectors (top for Digital bank, bottom for Power/Analog bank)', () => {
    const uno = createArduinoUno('uno_1', { x: 0, y: 0 });

    // Digital pins exit upward (-Y)
    const vecD13 = getPinExitVector(uno, uno.pins['D13']);
    expect(vecD13.x).toBe(0);
    expect(vecD13.y).toBe(-1);
    expect(vecD13.side).toBe('top');

    const vecGndTop = getPinExitVector(uno, (uno.pins as any)['GND.1']);
    expect(vecGndTop.x).toBe(0);
    expect(vecGndTop.y).toBe(-1);
    expect(vecGndTop.side).toBe('top');

    // Power and Analog pins exit downward (+Y)
    const vec5V = getPinExitVector(uno, uno.pins['5V']);
    expect(vec5V.x).toBe(0);
    expect(vec5V.y).toBe(1);
    expect(vec5V.side).toBe('bottom');

    const vecA0 = getPinExitVector(uno, uno.pins['A0']);
    expect(vecA0.x).toBe(0);
    expect(vecA0.y).toBe(1);
    expect(vecA0.side).toBe('bottom');

    // TB6612 inputs exit left (-X) and outputs exit right (+X)
    const tb = createTB6612FNG('tb_1', { x: 400, y: 0 });
    const vecPWMA = getPinExitVector(tb, tb.pins['PWMA']);
    expect(vecPWMA.x).toBe(-1);
    expect(vecPWMA.y).toBe(0);
    expect(vecPWMA.side).toBe('left');

    const vecAO1 = getPinExitVector(tb, tb.pins['AO1']);
    expect(vecAO1.x).toBe(1);
    expect(vecAO1.y).toBe(0);
    expect(vecAO1.side).toBe('right');
  });

  it('supports ESP32 DevKit V1 30-pin table with legacy GPIO aliases and directional exits', () => {
    const esp32 = createESP32DevKit('esp32_1', { x: 0, y: 0 });
    expect(Object.keys(esp32.pins).length).toBe(30);

    // Resolves both canonical Wokwi names and legacy GPIO aliases
    expect(resolveComponentPin(esp32, 'D25')?.id).toBe('D25');
    expect(resolveComponentPin(esp32, 'GPIO25')?.id).toBe('D25');
    expect(resolveComponentPin(esp32, 'GPIO23')?.id).toBe('D23');
    expect(resolveComponentPin(esp32, 'GPIO14')?.id).toBe('D14');
    expect(resolveComponentPin(esp32, 'GND')?.id).toBe('GND1');
    expect(resolveComponentPin(esp32, '3.3V')?.id).toBe('3V3');

    // Direct non-enumerable access
    expect((esp32.pins as any)['GPIO25']).toBeDefined();
    expect((esp32.pins as any)['GND']).toBeDefined();

    // Directional exits: left column exits -X, right column exits +X
    const exitD25 = getPinExitVector(esp32, esp32.pins['D25']);
    expect(exitD25.x).toBe(-1);
    expect(exitD25.y).toBe(0);
    expect(exitD25.side).toBe('left');

    const exitD23 = getPinExitVector(esp32, esp32.pins['D23']);
    expect(exitD23.x).toBe(1);
    expect(exitD23.y).toBe(0);
    expect(exitD23.side).toBe('right');
  });
});

describe('CircuitEngine Integration & Alias Resolution', () => {
  it('allows connections created with Wokwi pin names and resolves them in the netlist', () => {
    const circuit = new CircuitEngine();
    const uno = createArduinoUno('uno_1', { x: 50, y: 70 });
    const tb = createTB6612FNG('tb_1', { x: 450, y: 70 });
    circuit.addComponent(uno);
    circuit.addComponent(tb);

    // Validate connection using Wokwi names '13' and '5V'
    const valid1 = circuit.validateConnection('uno_1', '13', 'tb_1', 'AIN1');
    expect(valid1.valid).toBe(true);

    const valid2 = circuit.validateConnection('uno_1', '5V', 'tb_1', 'VCC');
    expect(valid2.valid).toBe(true);

    // Add wire with Wokwi pin name
    const added = circuit.addWire({
      id: 'w_test_1',
      fromComponentId: 'uno_1',
      fromPinId: '13',
      toComponentId: 'tb_1',
      toPinId: 'AIN1',
      color: '#3b82f6',
    });
    expect(added).toBe(true);

    // Verify net signals resolve across alias
    circuit.setPinOutput('uno_1', 'D13', 1);
    expect(circuit.readNetSignal('tb_1', 'AIN1').digital).toBe(1);
  });

  it('guarantees Wokwi GND.1, GND.2, GND.3 join the internal common ground plane', () => {
    const circuit = new CircuitEngine();
    const uno = createArduinoUno('uno_1', { x: 50, y: 70 });
    circuit.addComponent(uno);

    const connectedFromGnd1 = circuit.getConnectedPins('uno_1', 'GND.1');
    expect(connectedFromGnd1.some((p) => p.compId === 'uno_1' && (p.pinId === 'GND1' || p.pinId === 'GND.2'))).toBe(true);
    expect(connectedFromGnd1.some((p) => p.compId === 'uno_1' && (p.pinId === 'GND2' || p.pinId === 'GND.3'))).toBe(true);
  });

  it('supports MCU reset callback registration and triggering', () => {
    const circuit = new CircuitEngine();
    let resetCount = 0;
    circuit.registerResetHandler(() => {
      resetCount++;
    });

    circuit.triggerReset();
    circuit.triggerReset();
    expect(resetCount).toBe(2);
  });
});

describe('Wokwi Wire Routing Engine (Manhattan Routing & Rounded Arcs)', () => {
  it('generates smooth rounded corner arcs using quadratic bezier arcs (Q)', () => {
    const orthogonalPoints: Point[] = [
      { x: 100, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 50 },
      { x: 200, y: 150 },
    ];

    const path = pointsToRoundedCornerPath(orthogonalPoints, 6);
    expect(path).toContain('M 100 100');
    expect(path).toContain('Q 100.00 50.00');
    expect(path).toContain('Q 200.00 50.00');
    expect(path).toContain('L 200 150');
  });

  it('computes Manhattan route with directional pin exit steps', () => {
    const from: Point = { x: 100, y: 100 };
    const fromNormal: Point = { x: 0, y: -1 }; // exiting UP (-Y)
    const to: Point = { x: 300, y: 200 };
    const toNormal: Point = { x: -1, y: 0 }; // entering from LEFT (-X)

    const route = computeManhattanWireRoute(from, fromNormal, to, toNormal);
    expect(route.points.length).toBeGreaterThanOrEqual(4);
    // First step should move upward (-Y)
    expect(route.points[1].y).toBeLessThan(from.y);
    expect(route.path).toMatch(/^M 100 100/);
    expect(route.segments.length).toBe(route.points.length - 1);
  });

  it('routes cleanly around obstacle bounding boxes (component body avoidance)', () => {
    const from: Point = { x: 50, y: 100 };
    const fromNormal: Point = { x: 0, y: -1 };
    const to: Point = { x: 250, y: 100 };
    const toNormal: Point = { x: 0, y: -1 };

    const obstacles: BoundingBox[] = [
      { x: 120, y: 60, width: 60, height: 80 },
    ];

    const route = computeManhattanWireRoute(from, fromNormal, to, toNormal, undefined, obstacles);
    expect(route.points.length).toBeGreaterThan(2);
    // Wire points must not cross inside the obstacle box
    for (const pt of route.points) {
      const insideBox =
        pt.x > obstacles[0].x &&
        pt.x < obstacles[0].x + obstacles[0].width &&
        pt.y > obstacles[0].y &&
        pt.y < obstacles[0].y + obstacles[0].height;
      expect(insideBox).toBe(false);
    }
  });

  it('extracts draggable horizontal and vertical segments with midpoints', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];

    const segments = extractSegmentsFromPoints(points);
    expect(segments.length).toBe(2);

    expect(segments[0].orientation).toBe('vertical');
    expect(segments[0].midpoint).toEqual({ x: 0, y: 25 });
    expect(segments[0].length).toBe(50);

    expect(segments[1].orientation).toBe('horizontal');
    expect(segments[1].midpoint).toEqual({ x: 50, y: 50 });
    expect(segments[1].length).toBe(100);
  });

  it('generates smooth cubic bezier curves respecting exit normals', () => {
    const from: Point = { x: 100, y: 100 };
    const fromNormal: Point = { x: 0, y: -1 };
    const to: Point = { x: 200, y: 200 };
    const toNormal: Point = { x: 0, y: 1 };

    const bezierPath = computeSmartWireBezier(from, fromNormal, to, toNormal);
    expect(bezierPath).toMatch(/^M 100 100 C/);
    expect(bezierPath).toContain('200 200');
  });
});

describe('Line Follower Lab (7 Parts, 26 Wires) Electrical Integrity Verification', () => {
  it('loads canonical Line Follower Lab project with 7 parts, 26 wires and passes all 4 integrity checks', () => {
    const project = createLineFollowerProject();
    expect(project.components.length).toBe(7);
    expect(project.wires.length).toBe(26);

    const circuit = new CircuitEngine();
    for (const comp of project.components) {
      circuit.addComponent(comp);
    }
    for (const wire of project.wires) {
      const added = circuit.addWire(wire);
      expect(added).toBe(true);
    }

    const evalResult = circuit.evaluateCircuit();
    expect(circuit.getAllComponents().length).toBe(7);
    expect(circuit.getAllWires().length).toBe(26);
    // Check 1: Common ground bus
    expect(evalResult.hasCommonGround).toBe(true);
    // Check 2: Independent logic and motor power rails
    expect(evalResult.logicPowered).toBe(true);
    expect(evalResult.motorPowered).toBe(true);
    // Check 3: TB6612 STBY connected to Arduino Uno D3
    const stbyConnected = circuit.getConnectedPins('tb6612_1', 'STBY');
    expect(stbyConnected.some((p) => p.compId === 'uno_1' && p.pinId === 'D3')).toBe(true);
    // Check 4: Zero integrity errors and warnings
    expect(evalResult.circuitErrors).toEqual([]);
    expect(evalResult.circuitWarnings).toEqual([]);
  });

  it('verifies that all Arduino Uno wires attach to physical female header positions', () => {
    const project = createLineFollowerProject();
    const uno = project.components.find((c) => c.type === 'ARDUINO_UNO_R3');
    expect(uno).toBeDefined();

    const unoWires = project.wires.filter(
      (w) => w.fromComponentId === uno!.id || w.toComponentId === uno!.id
    );
    expect(unoWires.length).toBeGreaterThan(10);

    for (const wire of unoWires) {
      const pinId = wire.fromComponentId === uno!.id ? wire.fromPinId : wire.toPinId;
      const pin = resolveComponentPin(uno!, pinId);
      expect(pin).toBeDefined();
      // Socket must be on either top header (y = 17) or bottom header (y = 213)
      expect([17, 213]).toContain(pin!.offset.y);
    }
  });
});
