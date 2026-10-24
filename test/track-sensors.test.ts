import { describe, it, expect } from 'vitest';
import { TrackEnvironment, TrackType } from '../src/robot/TrackEnvironment';
import { RobotPose } from '../src/robot/DifferentialDriveChassis';

describe('Track Environment & IR Reflectance Sensor Simulation (PHASE 7)', () => {
  it('correctly calculates distance to a straight track centerline', () => {
    const track = new TrackEnvironment({
      trackType: 'straight',
      lineWidthMeters: 0.025, // 25mm black tape
    });

    // Point exactly on straight line (x=0, z=1.0)
    expect(track.getDistanceToLine(0, 1.0)).toBeCloseTo(0, 4);

    // Point 10mm to the right of centerline
    expect(track.getDistanceToLine(0.010, 1.0)).toBeCloseTo(0.010, 4);

    // Point 50mm to the left of centerline
    expect(track.getDistanceToLine(-0.050, 1.0)).toBeCloseTo(0.050, 4);
  });

  it('determines reflectance and digital line detection based on line width threshold', () => {
    const track = new TrackEnvironment({
      trackType: 'straight',
      lineWidthMeters: 0.024, // 24mm tape (half-width = 12mm)
    });

    // Center is on black line (reflectance low ~0.1, digital output 1)
    const onCenter = track.querySurface(0, 0.5);
    expect(onCenter.isLine).toBe(true);
    expect(onCenter.digitalValue).toBe(1);
    expect(onCenter.reflectance).toBeLessThan(0.3);

    // Point 8mm off center is still inside 24mm line (|8mm| < 12mm)
    const insideLine = track.querySurface(0.008, 0.5);
    expect(insideLine.isLine).toBe(true);
    expect(insideLine.digitalValue).toBe(1);

    // Point 30mm off center is on the white contrasting background
    const offLine = track.querySurface(0.030, 0.5);
    expect(offLine.isLine).toBe(false);
    expect(offLine.digitalValue).toBe(0);
    expect(offLine.reflectance).toBeGreaterThan(0.7);
  });

  it('transforms 8 IR sensor positions from robot geometry to world coordinates', () => {
    const track = new TrackEnvironment({
      sensorForwardOffsetMeters: 0.09, // 90mm in front of wheel axis
      sensorPitchMeters: 0.010,        // 10mm pitch between sensors
    });

    const pose: RobotPose = { x: 0, y: 0, z: 0, yawRad: 0 };
    const sensorWorldPositions = track.computeSensorWorldPositions(pose);

    expect(sensorWorldPositions).toHaveLength(8);

    // All sensors should be at z = 0.09m (forward offset)
    for (const pos of sensorWorldPositions) {
      expect(pos.z).toBeCloseTo(0.09, 4);
    }

    // Channel 1 (far left, index 0): x = -0.035m (-35mm)
    expect(sensorWorldPositions[0].x).toBeCloseTo(-0.035, 4);
    // Channel 4 (center left, index 3): x = -0.005m (-5mm)
    expect(sensorWorldPositions[3].x).toBeCloseTo(-0.005, 4);
    // Channel 5 (center right, index 4): x = +0.005m (+5mm)
    expect(sensorWorldPositions[4].x).toBeCloseTo(0.005, 4);
    // Channel 8 (far right, index 7): x = +0.035m (+35mm)
    expect(sensorWorldPositions[7].x).toBeCloseTo(0.035, 4);
  });

  it('evaluates all 8 IR sensor readings when robot is centered on straight line', () => {
    const track = new TrackEnvironment({
      trackType: 'straight',
      lineWidthMeters: 0.024, // 24mm tape (span -12mm to +12mm)
      sensorPitchMeters: 0.010,
      sensorForwardOffsetMeters: 0.09,
    });

    // Robot centered on straight line
    const pose: RobotPose = { x: 0, y: 0, z: 0.2, yawRad: 0 };
    const readings = track.evaluateSensors(pose);

    expect(readings.digitalChannels).toHaveLength(8);
    // Center sensors (channel 4 [index 3: -5mm] and channel 5 [index 4: +5mm]) must be HIGH (1)
    expect(readings.digitalChannels[3]).toBe(1);
    expect(readings.digitalChannels[4]).toBe(1);

    // Outer sensors (channels 1, 2, 7, 8) must be LOW (0)
    expect(readings.digitalChannels[0]).toBe(0);
    expect(readings.digitalChannels[1]).toBe(0);
    expect(readings.digitalChannels[6]).toBe(0);
    expect(readings.digitalChannels[7]).toBe(0);

    // Weighted line position estimate should be ~0 (centered)
    expect(Math.abs(readings.linePositionEstimateMeters)).toBeLessThan(0.002);
    expect(readings.lineLost).toBe(false);
  });

  it('detects when line is lost and reports last known direction', () => {
    const track = new TrackEnvironment({
      trackType: 'straight',
      lineWidthMeters: 0.024,
    });

    // Robot placed 20cm away from the line
    const pose: RobotPose = { x: 0.20, y: 0, z: 0.5, yawRad: 0 };
    const readings = track.evaluateSensors(pose);

    expect(readings.digitalChannels.every((val) => val === 0)).toBe(true);
    expect(readings.lineLost).toBe(true);
  });

  it('supports closed-loop track and detects curves as robot follows heading', () => {
    const track = new TrackEnvironment({
      trackType: 'closed_loop',
      lineWidthMeters: 0.025,
    });

    // Origin is on the track
    const surfaceAtOrigin = track.querySurface(0, 0);
    expect(surfaceAtOrigin.isLine).toBe(true);

    // Track points can be retrieved for 3D visualization
    const points = track.getTrackPolyline();
    expect(points.length).toBeGreaterThan(20);
  });
});
