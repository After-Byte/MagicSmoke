import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_ARM_DIMENSIONS,
  DEFAULT_JOINT_LIMITS,
  DEFAULT_ARM_POSES,
  calculateForwardKinematics,
  clampJointAngles,
  RobotArmJointAngles,
} from '../src/robot/arm/RobotArmModel';
import {
  SERVO_SPECS,
  ROBOT_ARM_SERVO_MAPPINGS,
  validateRobotArmWiring,
} from '../src/robot/arm/ServoModels';
import {
  createRobotArmProject,
  ROBOT_ARM_PIN_MAPPING,
  ROBOT_ARM_SKETCH,
} from '../src/project/robotArmProject';
import { validateProjectDocument } from '../src/project/types';
import {
  createStarterRobotArm,
  getAllStoredProjects,
  saveStoredProject,
} from '../src/project/projectStorage';
import { CircuitEngine } from '../src/circuit/CircuitEngine';
import { PinType } from '../src/circuit/types';

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

describe('Robot Arm Mathematical & Kinematic Model', () => {
  it('provides well-defined physical link dimensions and joint limits', () => {
    expect(DEFAULT_ARM_DIMENSIONS.baseHeight).toBe(55);
    expect(DEFAULT_ARM_DIMENSIONS.upperArmLength).toBe(120);
    expect(DEFAULT_ARM_DIMENSIONS.forearmLength).toBe(110);
    expect(DEFAULT_ARM_DIMENSIONS.wristLength).toBe(65);
    expect(DEFAULT_ARM_DIMENSIONS.gripperMaxOpen).toBe(40);

    expect(DEFAULT_JOINT_LIMITS.base.min).toBe(0);
    expect(DEFAULT_JOINT_LIMITS.base.max).toBe(180);
    expect(DEFAULT_JOINT_LIMITS.shoulder.min).toBe(15);
    expect(DEFAULT_JOINT_LIMITS.shoulder.max).toBe(165);
    expect(DEFAULT_JOINT_LIMITS.gripper.max).toBe(40);
  });

  it('clamps joint angles strictly to mechanical limits', () => {
    const rawAngles: RobotArmJointAngles = {
      base: 250,      // Exceeds max 180
      shoulder: -10,  // Subceeds min 15
      elbow: 190,     // Exceeds max 160
      wrist: -30,     // Subceeds min 0
      gripper: 60,    // Exceeds max 40
    };

    const clamped = clampJointAngles(rawAngles, DEFAULT_JOINT_LIMITS);
    expect(clamped.base).toBe(180);
    expect(clamped.shoulder).toBe(15);
    expect(clamped.elbow).toBe(160);
    expect(clamped.wrist).toBe(0);
    expect(clamped.gripper).toBe(40);
  });

  it('calculates exact Forward Kinematics for Ready/Home position', () => {
    const homePose = DEFAULT_ARM_POSES.find((p) => p.name.includes('Home')) || DEFAULT_ARM_POSES[0];
    const fk = calculateForwardKinematics(homePose.angles, DEFAULT_ARM_DIMENSIONS);

    expect(fk.reachable).toBe(true);
    // Base at 90° points straight forward along positive Z axis (X = 0)
    expect(Math.abs(fk.x)).toBeLessThan(1.0);
    expect(fk.y).toBeGreaterThan(150); // Well elevated above base
    expect(fk.z).toBeGreaterThan(100); // Reaching forward
    expect(fk.planarRadius).toBeGreaterThan(100);
  });

  it('calculates Left/Right sweeping symmetry in Forward Kinematics', () => {
    const sweepLeft = DEFAULT_ARM_POSES.find((p) => p.name.includes('Left'));
    const sweepRight = DEFAULT_ARM_POSES.find((p) => p.name.includes('Right'));

    expect(sweepLeft).toBeDefined();
    expect(sweepRight).toBeDefined();

    if (sweepLeft && sweepRight) {
      const fkLeft = calculateForwardKinematics(sweepLeft.angles, DEFAULT_ARM_DIMENSIONS);
      const fkRight = calculateForwardKinematics(sweepRight.angles, DEFAULT_ARM_DIMENSIONS);

      // Sweep Left (45°) and Sweep Right (135°) have symmetrical X offsets around center
      expect(Math.abs(fkLeft.x)).toBeGreaterThan(40);
      expect(Math.abs(fkRight.x)).toBeGreaterThan(40);
      expect(Math.abs(Math.abs(fkLeft.x) - Math.abs(fkRight.x))).toBeLessThan(1.0);
      expect(Math.abs(fkLeft.y - fkRight.y)).toBeLessThan(1.0);
    }
  });

  it('calculates Pick Low pose close to tabletop surface', () => {
    const pickLow = DEFAULT_ARM_POSES.find((p) => p.name.includes('Pick'));
    expect(pickLow).toBeDefined();

    if (pickLow) {
      const fk = calculateForwardKinematics(pickLow.angles, DEFAULT_ARM_DIMENSIONS);
      expect(fk.reachable).toBe(true);
      // Near table surface (Y within 0 to 45mm)
      expect(fk.y).toBeLessThan(45);
      expect(fk.y).toBeGreaterThan(-10);
    }
  });
});

describe('Electrical Servo Models & Brownout Hazards Engine', () => {
  it('defines accurate physical specs for SG90 and MG996R', () => {
    expect(SERVO_SPECS.SG90.stallTorqueKgCm).toBe(1.8);
    expect(SERVO_SPECS.SG90.currentConsumption.stallMa).toBe(650);
    expect(SERVO_SPECS.SG90.gearType).toBe('Nylon Plastic');

    expect(SERVO_SPECS.MG996R.stallTorqueKgCm).toBe(10.0);
    expect(SERVO_SPECS.MG996R.currentConsumption.stallMa).toBe(2500);
    expect(SERVO_SPECS.MG996R.gearType).toBe('Hardened Metal');
  });

  it('validates canonical starter project wiring as HEALTHY with zero brownout risk', () => {
    const starterDoc = createRobotArmProject();
    const wiringReport = validateRobotArmWiring(
      starterDoc.components,
      starterDoc.wires,
      ROBOT_ARM_SERVO_MAPPINGS
    );

    expect(wiringReport.overallStatus).toBe('HEALTHY');
    expect(wiringReport.commonGroundVerified).toBe(true);
    expect(wiringReport.externalSupplyUsed).toBe(true);
    expect(wiringReport.arduinoBrownoutRisk).toBe(false);

    // All 5 servos should be properly ready
    expect(wiringReport.servos.base.isReady).toBe(true);
    expect(wiringReport.servos.shoulder.isReady).toBe(true);
    expect(wiringReport.servos.elbow.isReady).toBe(true);
    expect(wiringReport.servos.wrist.isReady).toBe(true);
    expect(wiringReport.servos.gripper.isReady).toBe(true);

    // All 5 servos powered from external 6V rail
    expect(wiringReport.servos.base.powerSource).toBe('EXTERNAL_SUPPLY');
    expect(wiringReport.servos.shoulder.powerSource).toBe('EXTERNAL_SUPPLY');
    expect(wiringReport.servos.elbow.powerSource).toBe('EXTERNAL_SUPPLY');
    expect(wiringReport.servos.wrist.powerSource).toBe('EXTERNAL_SUPPLY');
    expect(wiringReport.servos.gripper.powerSource).toBe('EXTERNAL_SUPPLY');
  });

  it('detects missing control signal wires', () => {
    const starterDoc = createRobotArmProject();
    // Remove the base servo signal wire (uno_1:D3 -> servo_base:SIG)
    const brokenWires = starterDoc.wires.filter(
      (w) => !(w.toComponentId === 'servo_base' && w.toPinId === 'SIG')
    );

    const report = validateRobotArmWiring(
      starterDoc.components,
      brokenWires,
      ROBOT_ARM_SERVO_MAPPINGS
    );

    expect(report.overallStatus).toBe('ERROR');
    expect(report.servos.base.signalConnected).toBe(false);
    expect(report.servos.base.isReady).toBe(false);
    expect(report.servos.base.warnings.some((w) => w.includes('Signal pin (SIG) is not wired'))).toBe(true);
  });

  it('detects hazardous brownout risk when servos are powered from Arduino 5V regulator', () => {
    const starterDoc = createRobotArmProject();
    // Rewire base and shoulder servos VCC directly to Arduino 5V pin instead of external PSU
    const hazardousWires = starterDoc.wires.map((w) => {
      if (w.toComponentId === 'servo_base' && w.toPinId === 'VCC') {
        return { ...w, fromComponentId: 'uno_1', fromPinId: '5V' };
      }
      if (w.toComponentId === 'servo_shoulder' && w.toPinId === 'VCC') {
        return { ...w, fromComponentId: 'uno_1', fromPinId: '5V' };
      }
      return w;
    });

    const report = validateRobotArmWiring(
      starterDoc.components,
      hazardousWires,
      ROBOT_ARM_SERVO_MAPPINGS
    );

    expect(report.arduinoBrownoutRisk).toBe(true);
    expect(report.diagnostics.some((d) => d.includes('BROWNOUT WARNING'))).toBe(true);
  });

  it('detects ground loop / floating ground faults when PSU return is disconnected from Arduino GND', () => {
    const starterDoc = createRobotArmProject();
    // Remove common ground wire linking breadboard / PSU ground to Arduino GND
    const floatingGroundWires = starterDoc.wires.filter(
      (w) => !(w.fromComponentId === 'uno_1' && w.fromPinId === 'GND1') &&
             !(w.toComponentId === 'uno_1' && w.toPinId === 'GND1')
    );

    const report = validateRobotArmWiring(
      starterDoc.components,
      floatingGroundWires,
      ROBOT_ARM_SERVO_MAPPINGS
    );

    expect(report.commonGroundVerified).toBe(false);
    expect(report.diagnostics.some((d) => d.includes('GROUND FAULT'))).toBe(true);
  });
});

describe('Robot Arm Project Schema & Persistence Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('creates canonical starter project compliant with ProjectDocument schema', () => {
    const starterDoc = createRobotArmProject();
    const val = validateProjectDocument(starterDoc);

    expect(val.valid).toBe(true);
    expect(val.errors).toEqual([]);
    expect(starterDoc.board).toBe('arduino-uno-r3');
    expect(starterDoc.robotArm).toBeDefined();
    expect(starterDoc.robotArm?.dimensions.upperArmLength).toBe(120);
    expect(starterDoc.robotArm?.jointLimits.base.max).toBe(180);
  });

  it('registers starter project in projectStorage and loads successfully', () => {
    const starter = createStarterRobotArm();
    expect(starter.id).toBe('starter_servo_robot_arm');
    expect(starter.name).toContain('Robotic Arm');
    expect(starter.isStarter).toBe(true);

    const allProjects = getAllStoredProjects();
    const registered = allProjects.find((p) => p.id === 'starter_servo_robot_arm');
    expect(registered).toBeDefined();
    expect(registered?.document.robotArm).toBeDefined();
  });

  it('preserves robot arm configuration across project saves', () => {
    const starter = createStarterRobotArm();
    const updatedDoc = {
      ...starter.document,
      robotArm: {
        ...starter.document.robotArm!,
        currentAngles: {
          base: 120,
          shoulder: 45,
          elbow: 60,
          wrist: 90,
          gripper: 15,
        },
      },
    };

    const saved = saveStoredProject(updatedDoc, starter.id);
    expect(saved.id).toBe(starter.id);
    expect(saved.document.robotArm?.currentAngles.base).toBe(120);
    expect(saved.document.robotArm?.currentAngles.gripper).toBe(15);
  });
});
