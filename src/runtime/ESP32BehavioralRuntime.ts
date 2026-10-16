import { FirmwareRuntime, FirmwareRuntimeEvents } from './FirmwareRuntime';

interface AstInstruction {
  type: 'SET_MOTOR' | 'DRIVE' | 'DELAY' | 'DIGITAL_WRITE' | 'LEDC_WRITE' | 'SERIAL_PRINT';
  params: Record<string, number | string>;
}

interface UserFunctionDef {
  name: string;
  paramNames: string[];
  defaultValues?: Record<string, number>;
  bodyLines: string[];
}

export class ESP32BehavioralRuntime implements FirmwareRuntime {
  private events: FirmwareRuntimeEvents = {};
  private running = false;
  private paused = false;

  private setupInstructions: AstInstruction[] = [];
  private loopInstructions: AstInstruction[] = [];
  private currentInstructionIndex = 0;
  private timeInCurrentStepMs = 0;

  // Pin state tracker
  private pinValues: Record<number, 0 | 1> = {};
  private ledcValues: Record<number, number> = {};

  // Variables parsed from sketch
  private constants: Record<string, number> = {};
  private userFunctions: Map<string, UserFunctionDef> = new Map();

  public setEvents(events: FirmwareRuntimeEvents) {
    this.events = events;
  }

  public getRuntimeName(): string {
    return 'ESP32 Behavioral Runtime (Client-Side AST Interpreter)';
  }

  public isGenuineHardwareEmulation(): boolean {
    return false; // Honest disclosure
  }

  public getLimitations(): string[] {
    return [
      'Client-side AST parser & discrete event dispatcher (not a full binary Xtensa LX6 instruction emulator).',
      'Supports standard Arduino-ESP32 syntax: setup(), loop(), pinMode(), digitalWrite(), ledcAttach(), ledcWrite(), delay(), Serial.begin(), Serial.println(), and user-defined helper functions.',
      'Complex pointer arithmetic, FreeRTOS tasks, and 2.4GHz RF PHY are not modeled.',
    ];
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public async compile(sourceCode: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];
    this.setupInstructions = [];
    this.loopInstructions = [];
    this.constants = {};
    this.userFunctions = new Map();

    try {
      // 1. Extract constants: constexpr int NAME = VAL; or int NAME = VAL; or #define NAME VAL
      const constRegex = /(?:constexpr\s+int|const\s+int|int|#define)\s+([A-Za-z0-9_]+)\s*(?:=)?\s*(-?[0-9]+)\s*;/g;
      let match;
      while ((match = constRegex.exec(sourceCode)) !== null) {
        this.constants[match[1]] = parseInt(match[2], 10);
      }

      // Also support #define without semicolon
      const defineRegex = /#define\s+([A-Za-z0-9_]+)\s+(-?[0-9]+)\b/g;
      while ((match = defineRegex.exec(sourceCode)) !== null) {
        this.constants[match[1]] = parseInt(match[2], 10);
      }

      // Default fallback pins if not explicitly declared in sketch
      const defaultPins: Record<string, number> = {
        PWMA: 25, AIN1: 26, AIN2: 27, PWMB: 14, BIN1: 18, BIN2: 19, STBY: 23,
      };
      for (const [k, v] of Object.entries(defaultPins)) {
        if (this.constants[k] === undefined) {
          this.constants[k] = v;
        }
      }

      // 2. Extract user functions: void funcName(args) { body }
      const funcRegex = /void\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{([^}]+)\}/g;
      while ((match = funcRegex.exec(sourceCode)) !== null) {
        const funcName = match[1];
        if (funcName === 'setup' || funcName === 'loop' || funcName === 'drive' || funcName === 'setMotor') continue;

        const rawParams = match[2].trim();
        const paramNames: string[] = [];
        const defaultValues: Record<string, number> = {};

        if (rawParams) {
          rawParams.split(',').forEach((p) => {
            const [decl, defVal] = p.split('=');
            const parts = decl.trim().split(/\s+/);
            const pName = parts[parts.length - 1].trim();
            if (pName) {
              paramNames.push(pName);
              if (defVal) {
                const parsedDef = parseInt(defVal.trim(), 10);
                if (!isNaN(parsedDef)) defaultValues[pName] = parsedDef;
              }
            }
          });
        }

        const bodyLines = match[3]
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('//'));

        this.userFunctions.set(funcName, {
          name: funcName,
          paramNames,
          defaultValues,
          bodyLines,
        });
      }

      // 3. Parse setup() block
      const setupMatch = sourceCode.match(/void\s+setup\s*\(\s*\)\s*\{([^}]+)\}/s);
      if (!setupMatch) {
        errors.push('Syntax error: Missing setup() function');
      } else {
        const lines = setupMatch[1].split('\n');
        this.setupInstructions = this.parseLines(lines);
      }

      // 4. Parse loop() block
      const loopMatch = sourceCode.match(/void\s+loop\s*\(\s*\)\s*\{([^}]+)\}/s);
      if (!loopMatch) {
        errors.push('Syntax error: Missing loop() function');
      } else {
        const lines = loopMatch[1].split('\n');
        this.loopInstructions = this.parseLines(lines);
      }

      // Empty loop is valid Arduino structure (e.g. setup-only programs or idle loops)
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

  private parseLines(lines: string[], localScope: Record<string, number> = {}): AstInstruction[] {
    const instructions: AstInstruction[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;

      // Drive call: drive(leftSpeed, rightSpeed);
      const driveMatch = line.match(/drive\s*\(\s*(-?[0-9A-Za-z_]+)\s*,\s*(-?[0-9A-Za-z_]+)\s*\)\s*;/);
      if (driveMatch) {
        const leftVal = this.resolveValue(driveMatch[1], localScope);
        const rightVal = this.resolveValue(driveMatch[2], localScope);
        instructions.push({
          type: 'DRIVE',
          params: { left: leftVal, right: rightVal },
        });
        continue;
      }

      // Check if line calls a user function: funcName(args);
      const userCallMatch = line.match(/^([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*;/);
      if (userCallMatch) {
        const fnName = userCallMatch[1];
        const fnDef = this.userFunctions.get(fnName);
        if (fnDef) {
          const callArgValues = userCallMatch[2]
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
            .map((a) => this.resolveValue(a, localScope));

          const fnScope: Record<string, number> = { ...localScope };
          fnDef.paramNames.forEach((name, idx) => {
            if (callArgValues[idx] !== undefined) {
              fnScope[name] = callArgValues[idx];
            } else if (fnDef.defaultValues?.[name] !== undefined) {
              fnScope[name] = fnDef.defaultValues[name];
            }
          });

          // Inline the user function instructions
          const inlined = this.parseLines(fnDef.bodyLines, fnScope);
          instructions.push(...inlined);
          continue;
        }
      }

      // Delay call: delay(ms);
      const delayMatch = line.match(/delay\s*\(\s*([0-9A-Za-z_]+)\s*\)\s*;/);
      if (delayMatch) {
        const ms = this.resolveValue(delayMatch[1], localScope);
        instructions.push({
          type: 'DELAY',
          params: { ms: Math.max(1, ms) },
        });
        continue;
      }

      // Serial.println("...") or Serial.println(variable)
      const printMatch = line.match(/Serial\.println\s*\(\s*(?:["']([^"']+)["']|([A-Za-z0-9_]+))\s*\)\s*;/);
      if (printMatch) {
        const text = printMatch[1] ?? String(this.resolveValue(printMatch[2], localScope));
        instructions.push({
          type: 'SERIAL_PRINT',
          params: { text },
        });
        continue;
      }

      // digitalWrite(pin, HIGH/LOW)
      const dwMatch = line.match(/digitalWrite\s*\(\s*([A-Za-z0-9_]+)\s*,\s*(HIGH|LOW|[0-9]+)\s*\)\s*;/);
      if (dwMatch) {
        const pin = this.resolveValue(dwMatch[1], localScope);
        const val = dwMatch[2] === 'HIGH' || dwMatch[2] === '1' ? 1 : 0;
        instructions.push({
          type: 'DIGITAL_WRITE',
          params: { pin, val },
        });
        continue;
      }

      // ledcWrite(pin, val) or analogWrite(pin, val)
      const lwMatch = line.match(/(?:ledcWrite|analogWrite)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*\)\s*;/);
      if (lwMatch) {
        const pin = this.resolveValue(lwMatch[1], localScope);
        const val = this.resolveValue(lwMatch[2], localScope);
        instructions.push({
          type: 'LEDC_WRITE',
          params: { pin, val },
        });
        continue;
      }
    }

    return instructions;
  }

  private resolveValue(raw: string, localScope: Record<string, number> = {}): number {
    const trimmed = raw.trim();
    if (localScope[trimmed] !== undefined) return localScope[trimmed];
    if (this.constants[trimmed] !== undefined) return this.constants[trimmed];
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  public start() {
    this.running = true;
    this.paused = false;
    this.currentInstructionIndex = 0;
    this.timeInCurrentStepMs = 0;

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-Boot] CPU0: Xtensa dual-core @ 240MHz, 520KB SRAM\r\n');
      this.events.onSerialOutput('[ESP32-Boot] Mounting SPIFFS filesystem /dev/vfs0...\r\n');
    }

    // Execute setup() statements
    for (const instr of this.setupInstructions) {
      this.executeInstruction(instr);
    }
  }

  public pause() {
    this.paused = true;
  }

  public resume() {
    this.paused = false;
  }

  public stop() {
    this.running = false;
    this.paused = false;

    // Pull STBY LOW to disable driver
    const stbyPin = this.constants['STBY'] ?? 23;
    this.setDigitalPin(stbyPin, 0);

    // Zero out motor PWM channels
    const pwma = this.constants['PWMA'] ?? 25;
    const pwmb = this.constants['PWMB'] ?? 14;
    this.setPWM(pwma, 0, 20000);
    this.setPWM(pwmb, 0, 20000);

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-System] Simulation stopped.\r\n');
    }
  }

  public reset() {
    this.stop();
    this.currentInstructionIndex = 0;
    this.timeInCurrentStepMs = 0;
  }

  public step(deltaTimeSeconds: number) {
    if (!this.running || this.paused || this.loopInstructions.length === 0) return;

    const deltaMs = deltaTimeSeconds * 1000;
    this.timeInCurrentStepMs += deltaMs;

    while (this.running && !this.paused && this.loopInstructions.length > 0) {
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
          break; // wait for timer
        }
      } else {
        this.executeInstruction(instr);
        this.advanceInstruction();
      }
    }
  }

  private advanceInstruction() {
    if (this.loopInstructions.length > 0) {
      this.currentInstructionIndex = (this.currentInstructionIndex + 1) % this.loopInstructions.length;
    }
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
        const dutyFraction = Math.max(0, Math.min(255, Math.abs(val))) / 255.0;
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
