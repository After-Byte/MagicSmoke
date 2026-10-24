/**
 * MagicSmoke — Interactive Servo Robot Arm Data Model & Forward Kinematics
 */

export interface JointLimit {
  min: number;
  max: number;
  default: number;
  speedLimit: number; // deg/sec or mm/sec
  unit: 'deg' | 'mm';
}

export interface RobotArmJointAngles {
  base: number;     // 0° to 180° (azimuth / waist yaw)
  shoulder: number; // 15° to 165° (pitch)
  elbow: number;    // 0° to 160° (pitch)
  wrist: number;    // 0° to 180° (pitch)
  gripper: number;  // 0 to 40 mm (jaw opening)
}

export interface RobotArmDimensions {
  baseRadius: number;       // Radius of ground mounting plate (mm)
  baseHeight: number;       // Height from ground to shoulder pivot (mm)
  upperArmLength: number;   // Shoulder to elbow link length (mm)
  forearmLength: number;    // Elbow to wrist link length (mm)
  wristLength: number;      // Wrist to gripper fingertip center (mm)
  gripperMaxOpen: number;   // Maximum distance between gripper jaws (mm)
}

export interface RobotArmPose {
  id: string;
  name: string;
  description: string;
  angles: RobotArmJointAngles;
}

export interface ForwardKinematicsResult {
  x: number;          // mm from base origin
  y: number;          // mm height above ground
  z: number;          // mm from base origin
  planarRadius: number; // mm ground distance sqrt(x^2 + z^2)
  pitchDeg: number;   // absolute tool pitch angle relative to ground (0 = horizontal forward)
  reachable: boolean;
}

export interface RobotArmData {
  dimensions: RobotArmDimensions;
  jointLimits: Record<keyof RobotArmJointAngles, JointLimit>;
  currentAngles: RobotArmJointAngles;
  targetAngles: RobotArmJointAngles;
  activePoseId?: string;
  customPoses: RobotArmPose[];
}

export const DEFAULT_ARM_DIMENSIONS: RobotArmDimensions = {
  baseRadius: 65,
  baseHeight: 55,
  upperArmLength: 120,
  forearmLength: 110,
  wristLength: 65,
  gripperMaxOpen: 40,
};

export const DEFAULT_JOINT_LIMITS: Record<keyof RobotArmJointAngles, JointLimit> = {
  base: { min: 0, max: 180, default: 90, speedLimit: 150, unit: 'deg' },
  shoulder: { min: 15, max: 165, default: 60, speedLimit: 120, unit: 'deg' },
  elbow: { min: 0, max: 160, default: 75, speedLimit: 120, unit: 'deg' },
  wrist: { min: 0, max: 180, default: 90, speedLimit: 180, unit: 'deg' },
  gripper: { min: 0, max: 40, default: 20, speedLimit: 60, unit: 'mm' },
};

export const DEFAULT_ARM_POSES: RobotArmPose[] = [
  {
    id: 'pose_home',
    name: 'Home (Ready)',
    description: 'Balanced upright stance with gripper half open.',
    angles: { base: 90, shoulder: 60, elbow: 75, wrist: 90, gripper: 20 },
  },
  {
    id: 'pose_reach_forward',
    name: 'Reach Forward',
    description: 'Extended horizontal reach along the center line.',
    angles: { base: 90, shoulder: 40, elbow: 45, wrist: 85, gripper: 35 },
  },
  {
    id: 'pose_pick_low',
    name: 'Pick Low (Ground)',
    description: 'Gripper oriented downward near ground plane to grab objects.',
    angles: { base: 90, shoulder: 32, elbow: 30, wrist: 60, gripper: 12 },
  },
  {
    id: 'pose_lift_high',
    name: 'Lift High',
    description: 'Elevated holding position safe for transit.',
    angles: { base: 90, shoulder: 105, elbow: 85, wrist: 90, gripper: 0 },
  },
  {
    id: 'pose_stow',
    name: 'Park / Stow',
    description: 'Compact folded configuration for storage and transit.',
    angles: { base: 90, shoulder: 145, elbow: 140, wrist: 160, gripper: 0 },
  },
  {
    id: 'pose_left_shelf',
    name: 'Sweep Left (45°)',
    description: 'Oriented towards left sorting bin or feeder.',
    angles: { base: 45, shoulder: 55, elbow: 65, wrist: 85, gripper: 25 },
  },
  {
    id: 'pose_right_shelf',
    name: 'Sweep Right (135°)',
    description: 'Oriented towards right delivery conveyor.',
    angles: { base: 135, shoulder: 55, elbow: 65, wrist: 85, gripper: 25 },
  },
];

export function createDefaultRobotArmData(): RobotArmData {
  return {
    dimensions: { ...DEFAULT_ARM_DIMENSIONS },
    jointLimits: { ...DEFAULT_JOINT_LIMITS },
    currentAngles: { ...DEFAULT_ARM_POSES[0].angles },
    targetAngles: { ...DEFAULT_ARM_POSES[0].angles },
    activePoseId: 'pose_home',
    customPoses: [...DEFAULT_ARM_POSES],
  };
}

/**
 * Mathematical Forward Kinematics calculation.
 * Computes exact 3D Cartesian coordinates of the end-effector tip
 * directly from link lengths and joint angles.
 */
export function calculateForwardKinematics(
  angles: RobotArmJointAngles,
  dims: RobotArmDimensions = DEFAULT_ARM_DIMENSIONS
): ForwardKinematicsResult {
  const deg2rad = Math.PI / 180;

  // Joint angles in radians
  const baseRad = angles.base * deg2rad;
  const shoulderRad = angles.shoulder * deg2rad;
  const elbowRad = angles.elbow * deg2rad;
  const wristRad = angles.wrist * deg2rad;

  // Planar angle offsets:
  // Shoulder angle is measured from the horizontal ground plane (0° = horizontal forward, 90° = vertical up)
  const phi1 = shoulderRad;
  // Elbow angle bends relative to upper arm (90° = perpendicular)
  const phi2 = phi1 - (Math.PI / 2 - elbowRad);
  // Wrist angle bends relative to forearm (90° = in-line)
  const phi3 = phi2 - (Math.PI / 2 - wristRad);

  // In the arm's planar reference frame:
  // radius r along ground direction, elevation y above base ground
  const r =
    dims.upperArmLength * Math.cos(phi1) +
    dims.forearmLength * Math.cos(phi2) +
    dims.wristLength * Math.cos(phi3);

  const y =
    dims.baseHeight +
    dims.upperArmLength * Math.sin(phi1) +
    dims.forearmLength * Math.sin(phi2) +
    dims.wristLength * Math.sin(phi3);

  // 3D Cartesian frame:
  // Base angle 90° faces forward (+Z in standard robotics or +Z in Three.js)
  // Let azimuth 90° be forward (+Z), 0° be right (+X), 180° be left (-X)
  const azimuthRad = baseRad;
  const x = -r * Math.cos(azimuthRad);
  const z = r * Math.sin(azimuthRad);

  const maxReach = dims.upperArmLength + dims.forearmLength + dims.wristLength;
  const distFromShoulder = Math.sqrt(r * r + (y - dims.baseHeight) * (y - dims.baseHeight));
  const reachable = distFromShoulder <= maxReach * 1.01 && y >= 0;

  const pitchDeg = Math.round((phi3 * 180) / Math.PI);

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    z: Math.round(z * 10) / 10,
    planarRadius: Math.round(r * 10) / 10,
    pitchDeg,
    reachable,
  };
}

/**
 * Constrains requested angles to valid joint limits.
 */
export function clampJointAngles(
  requested: Partial<RobotArmJointAngles>,
  current: RobotArmJointAngles,
  limits: Record<keyof RobotArmJointAngles, JointLimit> = DEFAULT_JOINT_LIMITS
): RobotArmJointAngles {
  const result: RobotArmJointAngles = { ...current };

  for (const key of Object.keys(limits) as Array<keyof RobotArmJointAngles>) {
    if (typeof requested[key] === 'number') {
      const val = requested[key]!;
      const lim = limits[key];
      result[key] = Math.max(lim.min, Math.min(lim.max, val));
    }
  }

  return result;
}
