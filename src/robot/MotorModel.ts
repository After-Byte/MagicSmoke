export interface N20MotorConfig {
  maxRPM: number;         // e.g., 300 RPM
  wheelRadiusMeters: number; // e.g., 0.032m (64mm diameter wheel)
  accelerationRate: number;  // RPM per second acceleration limit
  decelerationRate: number;  // RPM per second braking limit
}

export class N20MotorModel {
  private targetRPM = 0;
  private currentRPM = 0;
  private currentAngleRad = 0; // Cumulative wheel rotation
  private stopReason?: string;
  private config: N20MotorConfig;

  constructor(config: Partial<N20MotorConfig> = {}) {
    this.config = {
      maxRPM: config.maxRPM ?? 300,
      wheelRadiusMeters: config.wheelRadiusMeters ?? 0.032,
      accelerationRate: config.accelerationRate ?? 600, // reaches full speed in 0.5s
      decelerationRate: config.decelerationRate ?? 1200, // brakes faster
    };
  }

  /**
   * Update motor speed given a target RPM, elapsed time dt (in seconds), and optional stop reason
   */
  public update(
    targetRPM: number,
    dt: number,
    reason?: string
  ): { currentRPM: number; angleRad: number; linearVelocity: number; stopReason?: string } {
    this.targetRPM = targetRPM;
    this.stopReason = targetRPM === 0 ? reason : undefined;

    const error = targetRPM - this.currentRPM;

    if (error !== 0) {
      const isAccelerating = Math.abs(targetRPM) > Math.abs(this.currentRPM);
      const rate = isAccelerating ? this.config.accelerationRate : this.config.decelerationRate;
      const step = rate * dt;

      if (Math.abs(error) <= step) {
        this.currentRPM = targetRPM;
      } else {
        this.currentRPM += Math.sign(error) * step;
      }
    }

    // Angular velocity in rad/s: RPM * 2*pi / 60
    const omegaRadPerSec = (this.currentRPM * 2 * Math.PI) / 60;
    this.currentAngleRad += omegaRadPerSec * dt;

    // Linear wheel velocity: v = omega * r (m/s)
    const linearVelocity = omegaRadPerSec * this.config.wheelRadiusMeters;

    return {
      currentRPM: this.currentRPM,
      angleRad: this.currentAngleRad,
      linearVelocity,
      stopReason: this.stopReason,
    };
  }

  public reset() {
    this.targetRPM = 0;
    this.currentRPM = 0;
    this.currentAngleRad = 0;
    this.stopReason = undefined;
  }

  public getTargetRPM(): number {
    return this.targetRPM;
  }

  public getRPM(): number {
    return this.currentRPM;
  }

  public getAngle(): number {
    return this.currentAngleRad;
  }

  public getStopReason(): string | undefined {
    return this.stopReason;
  }
}
