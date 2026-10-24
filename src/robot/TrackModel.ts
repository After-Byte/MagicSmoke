/**
 * MagicSmoke — Canonical Track Data Model & Geometry Utilities
 *
 * Single Source of Truth for:
 * - 2D Interactive Track Editor
 * - 3D Three.js Arena Viewport
 * - Infrared Reflectance Sensor Array Model
 * - Project Document Serialization & Persistence
 */

export interface TrackPoint2D {
  x: number; // meters (transversal in arena, +X is right)
  z: number; // meters (longitudinal in arena, +Z is forward)
}

export interface RobotStartPose {
  x: number;     // meters
  z: number;     // meters
  yawRad: number;// radians (0 is pointing along +Z, PI/2 is pointing along +X)
}

export interface TrackData {
  id: string;
  name: string;
  controlPoints: TrackPoint2D[];
  isClosed: boolean;
  lineWidthMeters: number;  // e.g. 0.024 (24mm)
  arenaWidthMeters: number; // e.g. 3.6m
  arenaHeightMeters: number;// e.g. 3.6m
  startPose: RobotStartPose;
  smoothing: boolean;       // Catmull-Rom spline interpolation
}

/**
 * Catmull-Rom spline interpolation between 4 control points at parameter t [0, 1]
 */
function catmullRomPoint(
  p0: TrackPoint2D,
  p1: TrackPoint2D,
  p2: TrackPoint2D,
  p3: TrackPoint2D,
  t: number
): TrackPoint2D {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const z =
    0.5 *
    (2 * p1.z +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

  return { x, z };
}

/**
 * Sample a dense, uniform polyline from control points.
 * Uses Catmull-Rom spline if smoothing is enabled, or piecewise linear otherwise.
 */
export function sampleTrackPolyline(
  controlPoints: TrackPoint2D[],
  isClosed: boolean,
  smoothing = true,
  stepsPerSegment = 16
): TrackPoint2D[] {
  if (!controlPoints || controlPoints.length === 0) return [];
  if (controlPoints.length === 1) return [{ ...controlPoints[0] }];
  if (controlPoints.length === 2 || !smoothing) {
    const pts: TrackPoint2D[] = controlPoints.map((p) => ({ ...p }));
    if (isClosed && controlPoints.length > 2) {
      pts.push({ ...controlPoints[0] });
    }
    return pts;
  }

  const n = controlPoints.length;
  const sampled: TrackPoint2D[] = [];
  const numSegments = isClosed ? n : n - 1;

  for (let i = 0; i < numSegments; i++) {
    let p0: TrackPoint2D;
    let p1: TrackPoint2D;
    let p2: TrackPoint2D;
    let p3: TrackPoint2D;

    if (isClosed) {
      p0 = controlPoints[(i - 1 + n) % n];
      p1 = controlPoints[i];
      p2 = controlPoints[(i + 1) % n];
      p3 = controlPoints[(i + 2) % n];
    } else {
      p0 = i === 0 ? controlPoints[0] : controlPoints[i - 1];
      p1 = controlPoints[i];
      p2 = controlPoints[i + 1];
      p3 = i + 2 < n ? controlPoints[i + 2] : controlPoints[n - 1];
    }

    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      sampled.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  if (isClosed) {
    sampled.push({ ...sampled[0] });
  } else {
    sampled.push({ ...controlPoints[n - 1] });
  }

  return sampled;
}

/**
 * Compute the distance from point (px, pz) to a line segment A-B
 */
export function distanceToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { distance: number; projX: number; projZ: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;

  if (lenSq < 1e-9) {
    const dx = px - ax;
    const dz = pz - az;
    return { distance: Math.sqrt(dx * dx + dz * dz), projX: ax, projZ: az, t: 0 };
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq));
  const projX = ax + t * vx;
  const projZ = az + t * vz;
  const dx = px - projX;
  const dz = pz - projZ;

  return { distance: Math.sqrt(dx * dx + dz * dz), projX, projZ, t };
}

/**
 * Standard track presets
 */
export const TRACK_PRESETS: Record<string, TrackData> = {
  oval_loop: {
    id: 'preset_oval_loop',
    name: 'Competition Oval Loop',
    controlPoints: [
      { x: 0, z: -0.6 },
      { x: 0, z: -0.2 },
      { x: 0, z: 0.2 },
      { x: 0, z: 0.6 },
      { x: 0.35, z: 0.95 },
      { x: 0.7, z: 0.6 },
      { x: 0.7, z: 0.2 },
      { x: 0.7, z: -0.2 },
      { x: 0.7, z: -0.6 },
      { x: 0.35, z: -0.95 },
    ],
    isClosed: true,
    lineWidthMeters: 0.024,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: 0, z: -0.2, yawRad: 0 },
    smoothing: true,
  },

  rounded_rect: {
    id: 'preset_rounded_rect',
    name: 'Rounded Rectangle Loop',
    controlPoints: [
      { x: -0.5, z: -0.8 },
      { x: -0.5, z: 0.8 },
      { x: -0.4, z: 0.95 },
      { x: -0.2, z: 1.0 },
      { x: 0.2, z: 1.0 },
      { x: 0.4, z: 0.95 },
      { x: 0.5, z: 0.8 },
      { x: 0.5, z: -0.8 },
      { x: 0.4, z: -0.95 },
      { x: 0.2, z: -1.0 },
      { x: -0.2, z: -1.0 },
      { x: -0.4, z: -0.95 },
    ],
    isClosed: true,
    lineWidthMeters: 0.024,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: -0.5, z: -0.2, yawRad: 0 },
    smoothing: true,
  },

  straight: {
    id: 'preset_straight',
    name: 'Straight Speed Benchmark',
    controlPoints: [
      { x: 0, z: -1.2 },
      { x: 0, z: 1.8 },
    ],
    isClosed: false,
    lineWidthMeters: 0.024,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: 0, z: -0.8, yawRad: 0 },
    smoothing: false,
  },

  s_curves: {
    id: 'preset_s_curves',
    name: 'Challenging S-Curves',
    controlPoints: [
      { x: 0, z: -1.2 },
      { x: 0, z: -0.4 },
      { x: 0.5, z: 0.2 },
      { x: 0.5, z: 0.6 },
      { x: -0.5, z: 1.2 },
      { x: -0.5, z: 1.6 },
      { x: 0, z: 2.0 },
    ],
    isClosed: false,
    lineWidthMeters: 0.024,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: 0, z: -1.0, yawRad: 0 },
    smoothing: true,
  },

  beginner_loop: {
    id: 'preset_beginner_loop',
    name: 'Beginner Circular Track',
    controlPoints: [
      { x: 0, z: -0.8 },
      { x: 0.56, z: -0.56 },
      { x: 0.8, z: 0 },
      { x: 0.56, z: 0.56 },
      { x: 0, z: 0.8 },
      { x: -0.56, z: 0.56 },
      { x: -0.8, z: 0 },
      { x: -0.56, z: -0.56 },
    ],
    isClosed: true,
    lineWidthMeters: 0.028,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: 0, z: -0.8, yawRad: Math.PI / 2 },
    smoothing: true,
  },

  complex_circuit: {
    id: 'preset_complex_circuit',
    name: 'Grand Prix Track with Hairpin',
    controlPoints: [
      { x: 0, z: -1.0 },
      { x: 0, z: 0.8 },
      { x: 0.25, z: 1.1 },
      { x: 0.5, z: 0.8 },
      { x: 0.5, z: 0.2 },
      { x: 0.8, z: -0.1 },
      { x: 0.8, z: -0.7 },
      { x: 0.4, z: -1.1 },
      { x: 0.2, z: -0.8 },
    ],
    isClosed: true,
    lineWidthMeters: 0.024,
    arenaWidthMeters: 3.6,
    arenaHeightMeters: 3.6,
    startPose: { x: 0, z: -0.4, yawRad: 0 },
    smoothing: true,
  },
};

export function createDefaultTrack(): TrackData {
  return JSON.parse(JSON.stringify(TRACK_PRESETS.oval_loop));
}

export function validateTrackData(track: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!track || typeof track !== 'object') {
    return { valid: false, errors: ['Track data must be a valid object'] };
  }
  if (!Array.isArray(track.controlPoints) || track.controlPoints.length < 2) {
    errors.push('Track must contain at least 2 control points');
  } else {
    for (let i = 0; i < track.controlPoints.length; i++) {
      const pt = track.controlPoints[i];
      if (typeof pt.x !== 'number' || isNaN(pt.x) || typeof pt.z !== 'number' || isNaN(pt.z)) {
        errors.push(`Control point at index ${i} has invalid coordinates`);
      }
    }
  }

  if (typeof track.lineWidthMeters !== 'number' || track.lineWidthMeters <= 0.005 || track.lineWidthMeters > 0.1) {
    errors.push('Track line width must be between 5mm and 100mm');
  }

  if (!track.startPose || typeof track.startPose.x !== 'number' || typeof track.startPose.z !== 'number') {
    errors.push('Track missing or invalid startPose coordinates');
  }

  return { valid: errors.length === 0, errors };
}
