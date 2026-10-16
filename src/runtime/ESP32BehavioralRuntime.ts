import { FirmwareRuntime, FirmwareRuntimeEvents } from './FirmwareRuntime';

interface AstInstruction {
  type: 'SET_MOTOR' | 'DRIVE' | 'DELAY' | 'DIGITAL_WRITE' | 'LEDC_WRITE' | 'SERIAL_PRINT';
  params: Record<string, number | string>;
}

export class ESP32BehavioralRuntime implements FirmwareRuntime {
  private events: FirmwareRuntimeEvents = {};
  private running = false;
  private loopInstructions: AstInstruction[] = [];
  private currentInstructionIndex = 0;
  private timeInCurrentStepMs = 0;

  // Pin state tracker
  private pinModes: Record<number, 'INPUT' | 'OUTPUT'> = {};
  private pinValues: Record<number, 0 | 1> = {};
  private ledcAttachments: Record<number, { freq: number; resolution: number }> = {};
  private ledcValues: Record<number, number> = {};

  // Variables parsed from sketch
  private constants: Record<string, number> = {};

  public setEvents(events: FirmwareRuntimeEvents) {
    this.events = events;
  }

  public getRuntimeName(): string {
    return 'ESP32 Behavioral Runtime (Client-Side AST Interpreter)';
  }

  public isGenuineHardwareEmulation(): boolean {
    return false; // Honest disclosure
  }

  public isRunning(): boolean {
    return this.running;
  }

  public async compile(sourceCode: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];
    this.loopInstructions = [];
    this.constants = {};

    try {
      // 1. Basic C++ tokenizing & constant extraction
      // Find: constexpr int NAME = VALUE; or #define NAME VALUE or int NAME = VALUE;
      const constRegex = /(?:constexpr\s+int|int|#define)\s+([A-Za-z0-9_]+)\s*(?:=)?\s*([0-9]+)\s*;/g;
      let match;
      while ((match = constRegex.exec(sourceCode)) !== null) {
        this.constants[match[1]] = parseInt(match[2], 10);
      }

      // Check required pins for ESP32 TB6612 robot
      const required = ['PWMA', 'AIN1', 'AIN2', 'PWMB', 'BIN1', 'BIN2', 'STBY'];
      for (const r of required) {
        if (this.constants[r] === undefined) {
          // Fallback standard assignments if not defined explicitly
          const defaults: Record<string, number> = {
            PWMA: 25, AIN1: 26, AIN2: 27, PWMB: 14, BIN1: 18, BIN2: 19, STBY: 23,
          };
          this.constants[r] = defaults[r];
        }
      }

      // 2. Parse setup() block
      const setupMatch = sourceCode.match(/void\s+setup\s*\(\s*\)\s*\{([^}]+)\}/s);
      if (!setupMatch) {
        errors.push('Syntax error: Missing setup() function');
      }

      // 3. Parse loop() block
      const loopMatch = sourceCode.match(/void\s+loop\s*\(\s*\)\s*\{([^}]+)\}/s);
      if (!loopMatch) {
        errors.push('Syntax error: Missing loop() function');
      } else {
        const loopBody = loopMatch[1];
        const lines = loopBody.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//')) continue;

          // Drive call: drive(leftSpeed, rightSpeed);
          const driveMatch = trimmed.match(/drive\s*\(\s*(-?[0-9A-Za-z_]+)\s*,\s*(-?[0-9A-Za-z_]+)\s*\)\s*;/);
          if (driveMatch) {
            const leftVal = this.resolveValue(driveMatch[1]);
            const rightVal = this.resolveValue(driveMatch[2]);
            this.loopInstructions.push({
              type: 'DRIVE',
              params: { left: leftVal, right: rightVal },
            });
            continue;
          }

          // Delay call: delay(ms);
          const delayMatch = trimmed.match(/delay\s*\(\s*([0-9]+)\s*\)\s*;/);
          if (delayMatch) {
            this.loopInstructions.push({
              type: 'DELAY',
              params: { ms: parseInt(delayMatch[1], 10) },
            });
            continue;
          }

          // Serial.println("...");
          const printMatch = trimmed.match(/Serial\.println\s*\(\s*["']([^"']+)["']\s*\)\s*;/);
          if (printMatch) {
            this.loopInstructions.push({
              type: 'SERIAL_PRINT',
              params: { text: printMatch[1] },
            });
            continue;
          }

          // digitalWrite(pin, HIGH/LOW)
          const dwMatch = trimmed.match(/digitalWrite\s*\(\s*([A-Za-z0-9_]+)\s*,\s*(HIGH|LOW)\s*\)\s*;/);
          if (dwMatch) {
            const pin = this.resolveValue(dwMatch[1]);
            const val = dwMatch[2] === 'HIGH' ? 1 : 0;
            this.loopInstructions.push({
              type: 'DIGITAL_WRITE',
              params: { pin, val },
            });
            continue;
          }

          // ledcWrite(pin, val)
          const lwMatch = trimmed.match(/ledcWrite\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([0-9]+)\s*\)\s*;/);
          if (lwMatch) {
            const pin = this.resolveValue(lwMatch[1]);
            const val = parseInt(lwMatch[2], 10);
            this.loopInstructions.push({
              type: 'LEDC_WRITE',
              params: { pin, val },
            });
            continue;
          }
        }
      }

      if (this.loopInstructions.length === 0 && errors.length === 0) {
        errors.push('No executable statements detected inside loop().');
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [err.message || 'Unknown compiler error'],
      };
    }
  }

  private resolveValue(raw: string): number {
    const trimmed = raw.trim();
    if (this.constants[trimmed] !== undefined) {
      return this.constants[trimmed];
    }
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  public start() {
    this.running = true;
    this.currentInstructionIndex = 0;
    this.timeInCurrentStepMs = 0;

    // Execute setup() actions: STBY HIGH
    const stbyPin = this.constants['STBY'] ?? 23;
    this.setDigitalPin(stbyPin, 1);

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-Boot] CPU0: Xtensa dual-core @ 240MHz, 520KB SRAM\r\n');
      this.events.onSerialOutput('[ESP32-Boot] Mounting SPIFFS /dev/vfs0...\r\n');
      this.events.onSerialOutput('[ESP32-App] MagicSmoke motor test initialized\r\n');
    }
  }

  public stop() {
    this.running = false;
    // Turn off motor driver enable
    const stbyPin = this.constants['STBY'] ?? 23;
    this.setDigitalPin(stbyPin, 0);

    // Zero out motor pins
    const pwma = this.constants['PWMA'] ?? 25;
    const pwmb = this.constants['PWMB'] ?? 14;
    this.setPWM(pwma, 0, 20000);
    this.setPWM(pwmb, 0, 20000);

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-System] Execution halted.\r\n');
    }
  }

  public reset() {
    this.stop();
    this.currentInstructionIndex = 0;
    this.timeInCurrentStepMs = 0;
  }

  public step(deltaTimeSeconds: number) {
    if (!this.running || this.loopInstructions.length === 0) return;

    const deltaMs = deltaTimeSeconds * 1000;
    this.timeInCurrentStepMs += deltaMs;

    // Process loop instructions
    while (this.running) {
      const instr = this.loopInstructions[this.currentInstructionIndex];
      if (!instr) {
        this.currentInstructionIndex = 0;
        continue;
      }

      if (instr.type === 'DELAY') {
        const requiredMs = instr.params.ms as number;
        if (this.timeInCurrentStepMs >= requiredMs) {
          this.timeInCurrentStepMs -= requiredMs;
          this.advanceInstruction();
        } else {
          // Waiting for delay timer
          break;
        }
      } else {
        this.executeInstruction(instr);
        this.advanceInstruction();
      }
    }
  }

  private advanceInstruction() {
    this.currentInstructionIndex = (this.currentInstructionIndex + 1) % this.loopInstructions.length;
  }

  private executeInstruction(instr: AstInstruction) {
    switch (instr.type) {
      case 'DRIVE': {
        const leftSpeed = instr.params.left as number;
        const rightSpeed = instr.params.right as number;
        this.applyMotorSpeed('A', leftSpeed);
        this.applyMotorSpeed('B', rightSpeed);
        break;
      }
      case 'SERIAL_PRINT': {
        if (this.events.onSerialOutput) {
          this.events.onSerialOutput(`${instr.params.text}\r\n`);
        }
        break;
      }
      case 'DIGITAL_WRITE': {
        this.setDigitalPin(instr.params.pin as number, instr.params.val as 0 | 1);
        break;
      }
      case 'LEDC_WRITE': {
        const pin = instr.params.pin as number;
        const val = instr.params.val as number;
        const dutyFraction = Math.max(0, Math.min(255, val)) / 255.0;
        this.setPWM(pin, dutyFraction, 20000);
        break;
      }
    }
  }

  private applyMotorSpeed(channel: 'A' | 'B', speed: number) {
    const clamped = Math.max(-255, Math.min(255, speed));
    const dutyFraction = Math.abs(clamped) / 255.0;

    const pwmPin = channel === 'A' ? (this.constants['PWMA'] ?? 25) : (this.constants['PWMB'] ?? 14);
    const in1Pin = channel === 'A' ? (this.constants['AIN1'] ?? 26) : (this.constants['BIN1'] ?? 18);
    const in2Pin = channel === 'A' ? (this.constants['AIN2'] ?? 27) : (this.constants['BIN2'] ?? 19);

    if (clamped > 0) {
      this.setDigitalPin(in1Pin, 1);
      this.setDigitalPin(in2Pin, 0);
    } else if (clamped < 0) {
      this.setDigitalPin(in1Pin, 0);
      this.setDigitalPin(in2Pin, 1);
    } else {
      // Coast or Brake
      this.setDigitalPin(in1Pin, 0);
      this.setDigitalPin(in2Pin, 0);
    }

    this.setPWM(pwmPin, dutyFraction, 20000);
  }

  private setDigitalPin(pin: number, state: 0 | 1) {
    this.pinValues[pin] = state;
    if (this.events.onPinStateChange) {
      this.events.onPinStateChange(pin, state);
    }
  }

  private setPWM(pin: number, dutyFraction: number, freq: number) {
    this.ledcValues[pin] = dutyFraction;
    if (this.events.onPWMChange) {
      this.events.onPWMChange(pin, dutyFraction, freq);
    }
  }
}
