/**
 * MagicSmoke — Servo Motor Models & Electrical Validation Engine
 */

import { ComponentInstance, WireConnection, PinType } from '../../circuit/types';
import { RobotArmJointAngles } from './RobotArmModel';

export type ServoModelType = 'SG90' | 'MG996R';

export interface ServoSpec {
  type: ServoModelType;
  name: string;
  gearType: 'Nylon Plastic' | 'Hardened Metal';
  minAngleDeg: number;
  maxAngleDeg: number;
  voltageRange: { min: number; max: number; recommended: number };
  stallTorqueKgCm: number;
  speedSecPer60Deg: number;
  currentConsumption: {
    idleMa: number;
    operatingMa: number;
    stallMa: number;
  };
  weightGrams: number;
  description: string;
}

export const SERVO_SPECS: Record<ServoModelType, ServoSpec> = {
  SG90: {
    type: 'SG90',
    name: 'TowerPro SG90 9g Micro Servo',
    gearType: 'Nylon Plastic',
    minAngleDeg: 0,
    maxAngleDeg: 180,
    voltageRange: { min: 4.8, max: 6.0, recommended: 5.0 },
    stallTorqueKgCm: 1.8,
    speedSecPer60Deg: 0.12, // 500 deg/sec
    currentConsumption: {
      idleMa: 10,
      operatingMa: 150,
      stallMa: 650,
    },
    weightGrams: 9,
    description: 'Lightweight micro servo for delicate wrist pitch and gripper jaws actuation.',
  },
  MG996R: {
    type: 'MG996R',
    name: 'TowerPro MG996R Metal Gear High-Torque Servo',
    gearType: 'Hardened Metal',
    minAngleDeg: 0,
    maxAngleDeg: 180,
    voltageRange: { min: 4.8, max: 7.2, recommended: 6.0 },
    stallTorqueKgCm: 10.0,
    speedSecPer60Deg: 0.17, // 350 deg/sec
    currentConsumption: {
      idleMa: 15,
      operatingMa: 500,
      stallMa: 2500,
    },
    weightGrams: 55,
    description: 'Heavy-duty all-metal geartrain servo providing 10kg-cm holding torque for base pan, shoulder, and elbow loads.',
  },
};

export interface ServoJointMapping {
  joint: keyof RobotArmJointAngles;
  servoComponentId: string;
  model: ServoModelType;
  signalPinNumber: number; // e.g. 3, 5, 6, 9, 10
  nominalAngleOffset?: number;
}

export const ROBOT_ARM_SERVO_MAPPINGS: ServoJointMapping[] = [
  { joint: 'base', servoComponentId: 'servo_base', model: 'MG996R', signalPinNumber: 3 },
  { joint: 'shoulder', servoComponentId: 'servo_shoulder', model: 'MG996R', signalPinNumber: 5 },
  { joint: 'elbow', servoComponentId: 'servo_elbow', model: 'MG996R', signalPinNumber: 6 },
  { joint: 'wrist', servoComponentId: 'servo_wrist', model: 'SG90', signalPinNumber: 9 },
  { joint: 'gripper', servoComponentId: 'servo_gripper', model: 'SG90', signalPinNumber: 10 },
];

export interface ServoElectricalStatus {
  joint: keyof RobotArmJointAngles;
  servoComponentId: string;
  model: ServoModelType;
  signalConnected: boolean;
  signalSource: string | null;     // e.g. "uno_1:D3"
  powerConnected: boolean;
  powerSource: 'EXTERNAL_SUPPLY' | 'ARDUINO_5V' | 'UNKNOWN' | 'NONE';
  groundConnected: boolean;
  isReady: boolean;
  warnings: string[];
}

export interface RobotArmWiringReport {
  overallStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
  servos: Record<keyof RobotArmJointAngles, ServoElectricalStatus>;
  commonGroundVerified: boolean;
  externalSupplyUsed: boolean;
  arduinoBrownoutRisk: boolean;
  totalOperatingCurrentMa: number;
  totalStallCurrentMa: number;
  diagnostics: string[];
}

/**
 * Validates circuit schematic wiring for all robot arm servos.
 * Traces physical net connections between Arduino Uno, external power supply,
 * common ground bus, and each servo's 3-pin connector (SIG, VCC, GND).
 */
export function validateRobotArmWiring(
  components: ComponentInstance[],
  wires: WireConnection[],
  mappings: ServoJointMapping[]
): RobotArmWiringReport {
  const diagnostics: string[] = [];
  const componentMap = new Map<string, ComponentInstance>();
  components.forEach((c) => componentMap.set(c.id, c));

  // Find system controller (Arduino Uno)
  const mcu = components.find((c) => c.type === 'ARDUINO_UNO_R3');
  const externalSupply = components.find(
    (c) => c.type === 'SERVO_POWER_SUPPLY' || c.type === 'BATTERY_PACK'
  );

  // Build net connectivity graph (adjacency list of { componentId, pinId })
  type NodeId = string; // "comp:pin"
  const adj = new Map<NodeId, NodeId[]>();

  const addEdge = (u: NodeId, v: NodeId) => {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  };

  wires.forEach((w) => {
    const u: NodeId = `${w.fromComponentId}:${w.fromPinId}`;
    const v: NodeId = `${w.toComponentId}:${w.toPinId}`;
    addEdge(u, v);
  });

  // Helper: check if two pins are electrically connected via wires
  const areConnected = (startNode: NodeId, targetCheck: (node: NodeId) => boolean): boolean => {
    if (!adj.has(startNode)) return false;
    const visited = new Set<NodeId>();
    const queue: NodeId[] = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (targetCheck(curr)) return true;

      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return false;
  };

  // Check Common Ground between Arduino GND and Power Supply GND
  let commonGroundVerified = false;
  if (mcu) {
    const mcuGndNodes = ['GND1', 'GND2'].map((p) => `${mcu.id}:${p}`);
    commonGroundVerified = mcuGndNodes.some((gndNode) =>
      areConnected(gndNode, (node) => {
        if (externalSupply) {
          if (node === `${externalSupply.id}:GND` || node === `${externalSupply.id}:NEG`) return true;
        }
        // Also check if connected to any GROUND_BUS
        const [cId] = node.split(':');
        const c = componentMap.get(cId);
        return c?.type === 'GROUND_BUS';
      })
    );
  }

  const servosStatus: Record<string, ServoElectricalStatus> = {};
  let totalOperatingCurrentMa = 0;
  let totalStallCurrentMa = 0;
  let servosPoweredFromMcuCount = 0;
  let mg996rPoweredFromMcuCount = 0;

  for (const m of mappings) {
    const servoComp = componentMap.get(m.servoComponentId);
    const spec = SERVO_SPECS[m.model];
    const warnings: string[] = [];

    let signalConnected = false;
    let signalSource: string | null = null;
    let powerSource: 'EXTERNAL_SUPPLY' | 'ARDUINO_5V' | 'UNKNOWN' | 'NONE' = 'NONE';
    let groundConnected = false;

    if (!servoComp) {
      warnings.push(`Servo component '${m.servoComponentId}' not found on circuit schematic.`);
    } else {
      // 1. Signal Wire Check
      const sigNode = `${servoComp.id}:SIG`;
      if (mcu) {
        areConnected(sigNode, (node) => {
          if (node.startsWith(`${mcu.id}:`)) {
            const [, pinId] = node.split(':');
            signalConnected = true;
            signalSource = `${mcu.name || mcu.id}:${pinId}`;
            return true;
          }
          return false;
        });
      }

      if (!signalConnected) {
        warnings.push(`Signal pin (SIG) is not wired to an Arduino PWM output.`);
      }

      // 2. Power Wire Check
      const vccNode = `${servoComp.id}:VCC`;
      const detectedExt = areConnected(vccNode, (node) => {
        return Boolean(externalSupply && (node === `${externalSupply.id}:POS` || node === `${externalSupply.id}:VOUT` || node === `${externalSupply.id}:5V` || node === `${externalSupply.id}:6V`));
      });

      const detectedMcu = areConnected(vccNode, (node) => {
        return Boolean(mcu && (node === `${mcu.id}:5V` || node === `${mcu.id}:3V3`));
      });

      if (detectedExt) {
        powerSource = 'EXTERNAL_SUPPLY';
      } else if (detectedMcu) {
        powerSource = 'ARDUINO_5V';
      } else {
        powerSource = 'NONE';
      }

      const powerConnected = powerSource !== 'NONE';

      if (!powerConnected) {
        warnings.push(`Power pin (VCC) is disconnected. Connect to 5V/6V DC supply rail.`);
      } else if (powerSource === 'ARDUINO_5V') {
        servosPoweredFromMcuCount++;
        if (m.model === 'MG996R') {
          mg996rPoweredFromMcuCount++;
          warnings.push(
            `High-torque MG996R servo powered directly from Arduino 5V pin! Can cause brownout resets under load.`
          );
        }
      }

      // 3. Ground Wire Check
      const gndNode = `${servoComp.id}:GND`;
      groundConnected = areConnected(gndNode, (node) => {
        const [cId, pId] = node.split(':');
        const c = componentMap.get(cId);
        if (c?.pins[pId]?.type === PinType.GROUND) return true;
        return false;
      });

      if (!groundConnected) {
        warnings.push(`Ground pin (GND) is disconnected. Must be tied to common 0V ground.`);
      }

      // Tally current
      totalOperatingCurrentMa += spec.currentConsumption.operatingMa;
      totalStallCurrentMa += spec.currentConsumption.stallMa;
    }

    const isReady = signalConnected && powerSource !== 'NONE' && groundConnected;
    servosStatus[m.joint] = {
      joint: m.joint,
      servoComponentId: m.servoComponentId,
      model: m.model,
      signalConnected,
      signalSource,
      powerConnected: powerSource !== 'NONE',
      powerSource,
      groundConnected,
      isReady,
      warnings,
    };
  }

  // Brownout Risk Calculation
  const arduinoBrownoutRisk =
    mg996rPoweredFromMcuCount >= 1 || servosPoweredFromMcuCount >= 3;

  if (arduinoBrownoutRisk) {
    diagnostics.push(
      `BROWNOUT WARNING: Multiple servos drawing current from Arduino internal 5V regulator (max 500mA). Use external 5V/6V 3A supply.`
    );
  }

  if (!commonGroundVerified && externalSupply) {
    diagnostics.push(
      `GROUND FAULT: Missing common ground between Arduino GND and External Power GND. Signals may jitter or fail.`
    );
  }

  // Determine overall status
  const allReady = Object.values(servosStatus).every((s) => s.isReady);
  let overallStatus: 'HEALTHY' | 'WARNING' | 'ERROR' = 'HEALTHY';
  if (!allReady) {
    overallStatus = 'ERROR';
  } else if (arduinoBrownoutRisk || !commonGroundVerified) {
    overallStatus = 'WARNING';
  }

  return {
    overallStatus,
    servos: servosStatus as Record<keyof RobotArmJointAngles, ServoElectricalStatus>,
    commonGroundVerified,
    externalSupplyUsed: Boolean(externalSupply),
    arduinoBrownoutRisk,
    totalOperatingCurrentMa,
    totalStallCurrentMa,
    diagnostics,
  };
}
