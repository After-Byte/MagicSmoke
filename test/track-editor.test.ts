import { describe, it, expect } from 'vitest';
import {
  TrackData,
  TrackPoint2D,
  RobotStartPose,
  sampleTrackPolyline,
  distanceToSegment,
  validateTrackData,
  createDefaultTrack,
  TRACK_PRESETS,
} from '../src/robot/TrackModel';
import { TrackEnvironment } from '../src/robot/TrackEnvironment';
import { SimulationCoordinator } from '../src/simulation/SimulationCoordinator';
import { createLineFollowerProject, LINE_FOLLOWER_SKETCH } from '../src/project/lineFollowerProject';

describe('TrackModel & 2D Track Editor Engine', () => {
  it('correctly calculates distance from point to segment', () => {
    // Segment from (0, 0) to (1, 0)
    const res1 = distanceToSegment(0.5, 0.5, 0, 0, 1, 0);
    expect(res1.distance).toBeCloseTo(0.5, 5);
    expect(res1.t).toBeCloseTo(0.5, 5);
    expect(res1.projX).toBeCloseTo(0.5, 5);
    expect(res1.projZ).toBeCloseTo(0, 5);

    // Point before segment start (t clamped to 0)
    const res2 = distanceToSegment(-0.5, 0, 0, 0, 1, 0);
    expect(res2.distance).toBeCloseTo(0.5, 5);
    expect(res2.t).toBe(0);

    // Point after segment end (t clamped to 1)
    const res3 = distanceToSegment(1.5, 0, 0, 0, 1, 0);
    expect(res3.distance).toBeCloseTo(0.5, 5);
    expect(res3.t).toBe(1);
  });

  it('samples Catmull-Rom smooth curves with continuous interpolation', () => {
    const controlPoints: TrackPoint2D[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
      { x: 0, z: 1 },
    ];

    // Closed loop with Catmull-Rom smoothing
    const smoothed = sampleTrackPolyline(controlPoints, true, true, 10);
    expect(smoothed.length).toBeGreaterThan(controlPoints.length);
    // Closed polyline should wrap back to start
    expect(smoothed[0].x).toBeCloseTo(smoothed[smoothed.length - 1].x, 4);
    expect(smoothed[0].z).toBeCloseTo(smoothed[smoothed.length - 1].z, 4);

    // Linear sampling
    const linear = sampleTrackPolyline(controlPoints, true, false, 10);
    expect(linear.length).toBe(controlPoints.length + 1);
  });

  it('validates canonical TrackData structures', () => {
    const validTrack: TrackData = {
      id: 'test_loop',
      name: 'Test Loop',
      arenaWidthMeters: 3.6,
      arenaHeightMeters: 3.6,
      lineWidthMeters: 0.024,
      isClosed: true,
      smoothing: true,
      controlPoints: [
        { x: -0.5, z: -0.5 },
        { x: 0.5, z: -0.5 },
        { x: 0.5, z: 0.5 },
        { x: -0.5, z: 0.5 },
      ],
      startPose: { x: 0, z: -0.5, yawRad: 0 },
    };

    expect(validateTrackData(validTrack).valid).toBe(true);

    // Invalid: less than 2 control points
    const invalidTrack = { ...validTrack, controlPoints: [{ x: 0, z: 0 }] };
    expect(validateTrackData(invalidTrack).valid).toBe(false);

    // Invalid: negative line width
    const negativeWidth = { ...validTrack, lineWidthMeters: -0.01 };
    expect(validateTrackData(negativeWidth).valid).toBe(false);
  });

  it('allows dynamic track modification and recomputes distance field', () => {
    const env = new TrackEnvironment();

    // Default oval loop: point (0, -0.2) is on the straightaway
    expect(env.getDistanceToLine(0, -0.2)).toBeLessThan(0.01);

    // Create custom S-curve track
    const customTrack: TrackData = {
      id: 'custom_s',
      name: 'Custom S Track',
      arenaWidthMeters: 3.6,
      arenaHeightMeters: 3.6,
      lineWidthMeters: 0.030,
      isClosed: false,
      smoothing: false,
      controlPoints: [
        { x: -0.8, z: 0 },
        { x: 0, z: 0.5 },
        { x: 0.8, z: 0 },
      ],
      startPose: { x: -0.8, z: 0, yawRad: 0 },
    };

    env.setTrackData(customTrack);

    // Origin (0, 0) is now away from the track; (0, 0.5) is on the track
    expect(env.getDistanceToLine(0, 0.5)).toBeCloseTo(0, 4);
    expect(env.getDistanceToLine(0, 0)).toBeCloseTo(0.424, 2);

    // Surface query should reflect 30mm tape (half-width = 15mm)
    const onCenter = env.querySurface(0, 0.5);
    expect(onCenter.isLine).toBe(true);
    expect(onCenter.digitalValue).toBe(1);

    const inside12mm = env.querySurface(0.012, 0.5);
    expect(inside12mm.isLine).toBe(true);
    expect(inside12mm.digitalValue).toBe(1);

    const outside40mm = env.querySurface(0, 0.54);
    expect(outside40mm.isLine).toBe(false);
    expect(outside40mm.digitalValue).toBe(0);
  });

  it('evaluates sensor array readings correctly when robot start pose aligns with track', () => {
    const defaultTrack = createDefaultTrack();
    const env = new TrackEnvironment({}, defaultTrack);

    // Evaluate sensors at default start pose: robot starts with center sensors D4 and D5 over line
    const readings = env.evaluateSensors({
      x: defaultTrack.startPose.x,
      y: 0,
      z: defaultTrack.startPose.z,
      yawRad: defaultTrack.startPose.yawRad,
    });

    // Center sensors must see the line
    expect(readings.digitalChannels[3]).toBe(1); // D4
    expect(readings.digitalChannels[4]).toBe(1); // D5
    // Outer sensors must be off the line
    expect(readings.digitalChannels[0]).toBe(0); // D1
    expect(readings.digitalChannels[7]).toBe(0); // D8
    expect(readings.lineLost).toBe(false);
  });

  it('anti-cheating test: changing track alters sensor readings and kinematics (NOT scripted on-rails)', async () => {
    const coordinator = new SimulationCoordinator();
    const project = createLineFollowerProject();
    coordinator.loadProject(project);

    // Initial compile
    const compRes = await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);
    expect(compRes.success).toBe(true);

    // 1. Run on standard oval track for 0.4 seconds (20 ticks of 0.02s)
    let t = 0;
    for (let i = 0; i < 20; i++) {
      t += 0.02;
      coordinator.tick(t);
    }
    const poseOnOval = { ...coordinator.chassis.getPose() };
    const sensorCountOval = coordinator.tick(t + 0.02).sensorReadings.activeSensorCount;

    // 2. Now shift track completely away so robot starts in empty space
    const shiftedTrack: TrackData = {
      ...createDefaultTrack(),
      controlPoints: [
        { x: 1.0, z: 1.0 },
        { x: 1.5, z: 1.0 },
        { x: 1.5, z: 1.5 },
        { x: 1.0, z: 1.5 },
      ],
      startPose: { x: 0, z: 0, yawRad: 0 }, // Starts far from line (at origin)
    };

    coordinator.track.setTrackData(shiftedTrack);
    coordinator.reset(shiftedTrack.startPose);
    await coordinator.compileAndRun(LINE_FOLLOWER_SKETCH);

    // Run again for same time
    t = 0;
    for (let i = 0; i < 20; i++) {
      t += 0.02;
      coordinator.tick(t);
    }
    const poseOnShifted = { ...coordinator.chassis.getPose() };
    const sensorCountShifted = coordinator.tick(t + 0.02).sensorReadings.activeSensorCount;

    // The robot's trajectory and sensor readings must be drastically different!
    // In empty space, all sensors read 0 (line lost), and the recovery algorithm enters search spin/recovery
    expect(sensorCountShifted).toBe(0);
    expect(sensorCountOval).toBeGreaterThan(0);
    // Yaw headings must diverge because recovery mode triggers differential turn
    expect(poseOnShifted.yawRad).not.toBeCloseTo(poseOnOval.yawRad, 1);
  });
});
