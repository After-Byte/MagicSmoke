import { FirmwareRuntime, FirmwareRuntimeEvents } from './FirmwareRuntime';
import { ArduinoInterpreter, PinMode, PinStateModel } from './ArduinoInterpreter';

export interface ESP32CompatibilityProfile {
  targetMCU: 'ESP32 DevKit V1 (ESP-WROOM-32)';
  coreAPI: 'Arduino-ESP32 v2.x / v3.x';
  languageLevel: 'C++ subset (AST interpretation)';
  supportedAPIs: string[];
  unsupportedAPIs: string[];
}

export class ESP32BehavioralRuntime implements FirmwareRuntime {
  private interpreter: ArduinoInterpreter;
  private events: FirmwareRuntimeEvents = {};
  private sourceCode = '';
  private diagnosticLogs: string[] = [];

  constructor() {
    this.interpreter = new ArduinoInterpreter();
  }

  public setEvents(events: FirmwareRuntimeEvents) {
    this.events = events;
    this.interpreter.setEvents({
      onPinStateChange: (pin, state) => {
        this.events.onPinStateChange?.(pin, state);
      },
      onPWMChange: (pin, dutyFraction, frequency) => {
        this.events.onPWMChange?.(pin, dutyFraction, frequency);
      },
      onSerialOutput: (text) => {
        this.events.onSerialOutput?.(text);
      },
      onDiagnostic: (_type, message) => {
        this.diagnosticLogs.push(message);
        this.events.onError?.(message);
      },
    });
  }

  public setPinInputReader(reader: (pin: number) => 0 | 1) {
    this.interpreter.setEvents({
      ...this.interpreter['events'],
      readPinInput: reader,
    });
  }

  public getRuntimeName(): string {
    return 'ESP32 Behavioral Runtime (Structured C++ AST Interpreter)';
  }

  public isGenuineHardwareEmulation(): boolean {
    return false; // Transparent disclosure
  }

  public getLimitations(): string[] {
    return [
      'Client-side structured C++ AST execution (not a cycle-accurate Xtensa LX6 binary machine emulator).',
      'Supports standard Arduino robotics constructs: setup(), loop(), pinMode(), digitalWrite(), digitalRead(), analogWrite(), ledcAttach(), ledcWrite(), delay(), millis(), micros(), Serial, user helper functions, and nested control flow.',
      'Complex C++ templates, FreeRTOS multi-core tasks, hardware interrupts (attachInterrupt), and 2.4GHz RF radio stacks are not modeled.',
    ];
  }

  public getCompatibilityProfile(): ESP32CompatibilityProfile {
    return {
      targetMCU: 'ESP32 DevKit V1 (ESP-WROOM-32)',
      coreAPI: 'Arduino-ESP32 v2.x / v3.x',
      languageLevel: 'C++ subset (AST interpretation)',
      supportedAPIs: [
        'setup()',
        'loop()',
        'pinMode(pin, mode)',
        'digitalWrite(pin, val)',
        'digitalRead(pin)',
        'analogWrite(pin, val)',
        'ledcAttach(pin, freq, resolution)',
        'ledcWrite(pin, duty)',
        'delay(ms)',
        'delayMicroseconds(us)',
        'millis()',
        'micros()',
        'Serial.begin(baud)',
        'Serial.print(val)',
        'Serial.println(val)',
        'abs(x)',
        'constrain(x, a, b)',
        'min(a, b)',
        'max(a, b)',
        'map(x, in_min, in_max, out_min, out_max)',
        'sq(x)',
        'sqrt(x)',
        'User helper functions with default parameters and return values',
        'Expressions: arithmetic (+,-,*,/,%), relational (<,>,<=,>=,==,!=), logical (&&,||,!), ternary (? :)',
        'Control flow: if/else, while, for, variable scopes',
      ],
      unsupportedAPIs: [
        'FreeRTOS tasks (xTaskCreatePinnedToCore)',
        'Hardware interrupts (attachInterrupt)',
        'Wi-Fi / BLE radio stack',
        'I2C / SPI bus transactions (Wire.h, SPI.h)',
        'EEPROM / Preferences / NVS flash storage',
      ],
    };
  }

  public isRunning(): boolean {
    return this.interpreter['isRunning'];
  }

  public isPaused(): boolean {
    return this.interpreter['isPaused'];
  }

  public async compile(sourceCode: string): Promise<{ success: boolean; errors?: string[] }> {
    this.sourceCode = sourceCode;
    this.diagnosticLogs = [];
    return this.interpreter.compile(sourceCode);
  }

  public start() {
    this.interpreter.start();
  }

  public pause() {
    this.interpreter.pause();
  }

  public resume() {
    this.interpreter.resume();
  }

  public stop() {
    this.interpreter.stop();
  }

  public reset() {
    this.interpreter.stop();
    this.interpreter.resetEnvironment();
    if (this.sourceCode) {
      this.interpreter.compile(this.sourceCode);
    }
  }

  public step(deltaTimeSeconds: number) {
    this.interpreter.step(deltaTimeSeconds);
  }

  public getVirtualTimeMs(): number {
    return this.interpreter.getVirtualTimeMs();
  }

  public getPinState(pin: number): PinStateModel {
    return this.interpreter.getPinState(pin);
  }

  public getAllPinStates(): Record<number, PinStateModel> {
    return this.interpreter.getAllPinStates();
  }

  public getDiagnosticLogs(): string[] {
    return [...this.diagnosticLogs];
  }
}
