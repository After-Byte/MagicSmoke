export interface RobotPose {
  x: number;     // meters
  y: number;     // meters (upwards in Three.js coordinates, 0 on floor)
  z: number;     // meters
  yawRad: number; // heading angle in radians (around Y axis)
}

export interface DifferentialDriveConfig {
  trackWidthMeters: number; // distance between left and right wheel contact points (e.g. 0.12m = 120mm)
}

export class DifferentialDriveChassis {
  private pose: RobotPose = { x: 0, y: 0, z: 0, yawRad: 0 };
  private config: DifferentialDriveConfig;

  constructor(config: Partial<DifferentialDriveConfig> = {}) {
    this.config = {
      trackWidthMeters: config.trackWidthMeters ?? 0.14,
    };
  }

  /**
   * Integrate wheel linear velocities over dt seconds to update robot pose
   */
  public update(vLeft: number, vRight: number, dt: number): RobotPose {
    // Forward linear velocity
    const v = (vRight + vLeft) / 2.0;

    // Angular rate of yaw rotation: (v_right - v_left) / L
    const omega = (vLeft - vRight) / this.config.trackWidthMeters;

    if (Math.abs(omega) < 1e-6) {
      // Straight line motion
      this.pose.x += v * Math.sin(this.pose.yawRad) * dt;
      this.pose.z += v * Math.cos(this.pose.yawRad) * dt;
    } else {
      // Circular arc motion
      const nextYaw = this.pose.yawRad + omega * dt;
      const r = v / omega; // instantaneous turning radius

      this.pose.x += r * (Math.cos(this.pose.yawRad) - Math.cos(nextYaw));
      this.pose.z += r * (Math.sin(nextYaw) - Math.sin(this.pose.yawRad));
      this.pose.yawRad = nextYaw;
    }

    return { ...this.pose };
  }

  public getPose(): RobotPose {
    return { ...this.pose };
  }

  public reset(pose: Partial<RobotPose> = {}) {
    this.pose = {
      x: pose.x ?? 0,
      y: pose.y ?? 0,
      z: pose.z ?? 0,
      yawRad: pose.yawRad ?? 0,
    };
  }
}
