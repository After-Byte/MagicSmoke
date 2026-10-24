import { FirmwareRuntime, FirmwareRuntimeEvents } from './FirmwareRuntime';
import { ArduinoInterpreter, PinMode, PinStateModel } from './ArduinoInterpreter';

export interface ArduinoUnoCompatibilityProfile {
  targetMCU: 'Arduino Uno R3 (ATmega328P)';
  coreAPI: 'Arduino AVR Core v1.8.x';
  languageLevel: 'C++ subset (AST interpretation)';
  clockSpeedMHz: 16;
  logicVoltage: 5.0;
  supportedAPIs: string[];
  unsupportedAPIs: string[];
}

export class ArduinoUnoBehavioralRuntime implements FirmwareRuntime {
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
    return 'Arduino Uno R3 Behavioral Runtime (Deterministic C++ AST Interpreter)';
  }

  public isGenuineHardwareEmulation(): boolean {
    return false; // Honest disclosure: Behavioral AST interpreter, not cycle-accurate AVR emulator
  }

  public getLimitations(): string[] {
    return [
      'Client-side structured Arduino C++ AST execution (not a cycle-accurate ATmega328P binary machine emulator).',
      'Supports standard Arduino robotics constructs: setup(), loop(), pinMode(), digitalWrite(), digitalRead(), analogWrite(), delay(), millis(), micros(), Serial, user helper functions, and nested control flow.',
      'AVR direct register writes (PORTB, DDRD, TCCR1A), EEPROM, Watchdog timers, and hardware pin-change interrupts are not modeled.',
    ];
  }

  public getCompatibilityProfile(): ArduinoUnoCompatibilityProfile {
    return {
      targetMCU: 'Arduino Uno R3 (ATmega328P)',
      coreAPI: 'Arduino AVR Core v1.8.x',
      languageLevel: 'C++ subset (AST interpretation)',
      clockSpeedMHz: 16,
      logicVoltage: 5.0,
      supportedAPIs: [
        'setup()',
        'loop()',
        'pinMode(pin, mode)',
        'digitalWrite(pin, val)',
        'digitalRead(pin)',
        'analogWrite(pin, val)',
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
        'Analog pin aliases A0..A5 mapped to digital pins 14..19',
        'User helper functions with default parameters and return values',
        'Expressions: arithmetic (+,-,*,/,%), relational (<,>,<=,>=,==,!=), logical (&&,||,!), ternary (? :)',
        'Control flow: if/else, while, for, variable scopes',
      ],
      unsupportedAPIs: [
        'AVR Direct Port Manipulation (PORTD, PINB)',
        'Hardware Interrupts (attachInterrupt)',
        'EEPROM.h',
        'Direct Timer Registers (TCCR0A, TCCR1B)',
        'Inline AVR Assembly',
      ],
    };
  }

  public async compile(sourceCode: string): Promise<{ success: boolean; errors?: string[] }> {
    this.sourceCode = sourceCode;
    this.diagnosticLogs = [];
    const res = this.interpreter.compile(sourceCode);
    return res;
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

  public isRunning(): boolean {
    return this.interpreter['isRunning'];
  }

  public isPaused(): boolean {
    return this.interpreter['isPaused'];
  }

  public step(deltaTimeSeconds: number) {
    this.interpreter.step(deltaTimeSeconds);
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

  public getVirtualTimeMs(): number {
    return this.interpreter.getVirtualTimeMs();
  }
}
