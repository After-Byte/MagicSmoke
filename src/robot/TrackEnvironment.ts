import { RobotPose } from './DifferentialDriveChassis';
import {
  TrackData,
  TrackPoint2D,
  RobotStartPose,
  sampleTrackPolyline,
  distanceToSegment,
  TRACK_PRESETS,
  createDefaultTrack,
} from './TrackModel';

export type TrackType = 'straight' | 'curved_s' | 'closed_loop' | 'hairpin' | 'custom';

// Re-export TrackPoint alias for backwards compatibility
export type TrackPoint = TrackPoint2D;

export interface TrackConfig {
  trackType?: TrackType;
  lineWidthMeters?: number;          // e.g. 0.024m (24mm standard tape)
  surfaceContrastRatio?: number;     // ratio of white to black reflectance
  polarityActiveHigh?: boolean;      // true: line = 1, surface = 0
  sensorForwardOffsetMeters?: number;// e.g. 0.09m (90mm ahead of axle)
  sensorPitchMeters?: number;        // e.g. 0.010m (10mm pitch between sensors)
}

export interface SurfaceSample {
  distanceToCenterline: number;
  isLine: boolean;
  reflectance: number;               // 0.0 (perfect black) to 1.0 (pure white)
  digitalValue: 0 | 1;
}

export interface SensorArrayReadings {
  sensorPositions: TrackPoint2D[];
  digitalChannels: (0 | 1)[];        // 8 channels: D1 (index 0) to D8 (index 7)
  reflectanceValues: number[];       // 8 continuous reflectance readings
  linePositionEstimateMeters: number;// weighted center error relative to array center
  lineLost: boolean;
  activeSensorCount: number;
}

export class TrackEnvironment {
  private config: Required<TrackConfig>;
  private trackData: TrackData;
  private trackPolyline: TrackPoint2D[] = [];
  private lastKnownLinePosition = 0;

  constructor(config: TrackConfig = {}, initialTrackData?: TrackData) {
    this.config = {
      trackType: config.trackType ?? 'closed_loop',
      lineWidthMeters: config.lineWidthMeters ?? 0.024,
      surfaceContrastRatio: config.surfaceContrastRatio ?? 0.8,
      polarityActiveHigh: config.polarityActiveHigh ?? true,
      sensorForwardOffsetMeters: config.sensorForwardOffsetMeters ?? 0.09,
      sensorPitchMeters: config.sensorPitchMeters ?? 0.010,
    };

    if (initialTrackData) {
      this.trackData = JSON.parse(JSON.stringify(initialTrackData));
    } else {
      this.trackData = this.resolvePreset(this.config.trackType);
    }

    this.rebuildPolyline();
  }

  private resolvePreset(type: TrackType): TrackData {
    switch (type) {
      case 'straight':
        return JSON.parse(JSON.stringify(TRACK_PRESETS.straight));
      case 'curved_s':
        return JSON.parse(JSON.stringify(TRACK_PRESETS.s_curves));
      case 'hairpin':
        return JSON.parse(JSON.stringify(TRACK_PRESETS.complex_circuit));
      case 'closed_loop':
      default:
        return createDefaultTrack();
    }
  }

  public setTrackType(type: TrackType) {
    this.config.trackType = type;
    this.trackData = this.resolvePreset(type);
    this.rebuildPolyline();
  }

  public getTrackType(): TrackType {
    return this.config.trackType;
  }

  public getTrackData(): TrackData {
    return this.trackData;
  }

  public setTrackData(data: TrackData) {
    this.trackData = JSON.parse(JSON.stringify(data));
    this.config.lineWidthMeters = data.lineWidthMeters;
    this.config.trackType = 'custom';
    this.rebuildPolyline();
  }

  public rebuildPolyline() {
    this.trackPolyline = sampleTrackPolyline(
      this.trackData.controlPoints,
      this.trackData.isClosed,
      this.trackData.smoothing,
      16
    );
  }

  public setLineWidth(widthMeters: number) {
    const clamped = Math.max(0.010, Math.min(0.080, widthMeters));
    this.config.lineWidthMeters = clamped;
    this.trackData.lineWidthMeters = clamped;
  }

  public getLineWidth(): number {
    return this.config.lineWidthMeters;
  }

  public setSensorPitch(pitchMeters: number) {
    this.config.sensorPitchMeters = Math.max(0.005, Math.min(0.025, pitchMeters));
  }

  public getSensorPitch(): number {
    return this.config.sensorPitchMeters;
  }

  public getTrackPolyline(): TrackPoint2D[] {
    return this.trackPolyline;
  }

  public isTrackClosed(): boolean {
    return this.trackData.isClosed;
  }

  public getStartPose(): RobotStartPose {
    return { ...this.trackData.startPose };
  }

  public setStartPose(pose: RobotStartPose) {
    this.trackData.startPose = { ...pose };
  }

  /**
   * Compute Euclidean distance from any world point (px, pz) to the nearest segment of the track centerline
   */
  public getDistanceToLine(px: number, pz: number): number {
    if (!this.trackPolyline || this.trackPolyline.length < 2) return Infinity;

    let minDistance = Infinity;
    const n = this.trackPolyline.length;

    for (let i = 0; i < n - 1; i++) {
      const a = this.trackPolyline[i];
      const b = this.trackPolyline[i + 1];

      const res = distanceToSegment(px, pz, a.x, a.z, b.x, b.z);
      if (res.distance < minDistance) {
        minDistance = res.distance;
      }
    }

    return minDistance;
  }

  /**
   * Query the physical optical surface characteristics at a specific world coordinate
   */
  public querySurface(x: number, z: number): SurfaceSample {
    const dist = this.getDistanceToLine(x, z);
    const halfWidth = this.config.lineWidthMeters / 2.0;
    const isLine = dist <= halfWidth;

    // Continuous optical reflectance model:
    // Base white surface = 0.90, Black line core = 0.10
    const sigma = halfWidth * 0.75;
    const absorption = Math.exp(-(dist * dist) / (2 * sigma * sigma));
    const reflectance = Math.max(0.10, Math.min(0.92, 0.90 - 0.80 * absorption));

    let digitalValue: 0 | 1;
    if (this.config.polarityActiveHigh) {
      digitalValue = isLine ? 1 : 0;
    } else {
      digitalValue = isLine ? 0 : 1;
    }

    return {
      distanceToCenterline: dist,
      isLine,
      reflectance,
      digitalValue,
    };
  }

  /**
   * Compute world coordinates of the 8 IR reflectance sensors based on current robot chassis pose
   */
  public computeSensorWorldPositions(pose: RobotPose): TrackPoint2D[] {
    const positions: TrackPoint2D[] = [];
    const yaw = pose.yawRad;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const dFront = this.config.sensorForwardOffsetMeters;
    const pitch = this.config.sensorPitchMeters;

    for (let i = 0; i < 8; i++) {
      // Lateral offset: channel 1 (i=0) is left (-3.5 * pitch), channel 8 (i=7) is right (+3.5 * pitch)
      const xLocal = (i - 3.5) * pitch;

      // Transform from robot frame to world frame:
      // Forward vector is (sinYaw, cosYaw), Lateral right vector is (cosYaw, -sinYaw)
      const worldX = pose.x + xLocal * cosYaw + dFront * sinYaw;
      const worldZ = pose.z - xLocal * sinYaw + dFront * cosYaw;

      positions.push({ x: worldX, z: worldZ });
    }

    return positions;
  }

  /**
   * Evaluate all 8 IR sensors and compute weighted line error
   */
  public evaluateSensors(pose: RobotPose): SensorArrayReadings {
    const positions = this.computeSensorWorldPositions(pose);
    const digitalChannels: (0 | 1)[] = [];
    const reflectanceValues: number[] = [];

    let weightedSum = 0;
    let activeCount = 0;
    const pitch = this.config.sensorPitchMeters;

    for (let i = 0; i < 8; i++) {
      const pos = positions[i];
      const sample = this.querySurface(pos.x, pos.z);

      digitalChannels.push(sample.digitalValue);
      reflectanceValues.push(sample.reflectance);

      // In active high line detection, sensor is active when digitalValue is 1
      const isDetectingLine = this.config.polarityActiveHigh
        ? sample.digitalValue === 1
        : sample.digitalValue === 0;

      if (isDetectingLine) {
        const xOffset = (i - 3.5) * pitch;
        weightedSum += xOffset;
        activeCount++;
      }
    }

    let linePositionEstimateMeters = 0;
    let lineLost = false;

    if (activeCount > 0) {
      linePositionEstimateMeters = weightedSum / activeCount;
      this.lastKnownLinePosition = linePositionEstimateMeters;
      lineLost = false;
    } else {
      lineLost = true;
      linePositionEstimateMeters = this.lastKnownLinePosition;
    }

    return {
      sensorPositions: positions,
      digitalChannels,
      reflectanceValues,
      linePositionEstimateMeters,
      lineLost,
      activeSensorCount: activeCount,
    };
  }

  public resetLineMemory() {
    this.lastKnownLinePosition = 0;
  }
}
