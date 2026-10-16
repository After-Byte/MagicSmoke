export type PinStateCallback = (pin: number, state: 0 | 1) => void;
export type PWMStateCallback = (pin: number, dutyCycle: number, frequency: number) => void;
export type SerialOutputCallback = (text: string) => void;
export type ExecutionErrorCallback = (error: string) => void;

export interface FirmwareRuntimeEvents {
  onPinStateChange?: PinStateCallback;
  onPWMChange?: PWMStateCallback;
  onSerialOutput?: SerialOutputCallback;
  onError?: ExecutionErrorCallback;
}

export interface FirmwareRuntime {
  compile(sourceCode: string): Promise<{ success: boolean; errors?: string[] }>;
  start(): void;
  stop(): void;
  reset(): void;
  isRunning(): boolean;
  step(deltaTimeSeconds: number): void;
  setEvents(events: FirmwareRuntimeEvents): void;
  getRuntimeName(): string;
  isGenuineHardwareEmulation(): boolean;
}
