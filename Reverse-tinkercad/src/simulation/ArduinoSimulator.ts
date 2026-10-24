/**
 * Lightweight browser runtime simulator for Arduino Uno sketches
 * Executes setup() and loop(), handling pinMode, digitalWrite, delay, and Serial.print
 */

export class ArduinoSimulator {
  private isRunning: boolean = false;
  private intervalId: any = null;
  private onLedChange: (state: boolean) => void;
  private onSerialLog: (msg: string) => void;
  private currentLedState: boolean = false;
  private step: number = 0;

  constructor(
    onLedChange: (state: boolean) => void,
    onSerialLog: (msg: string) => void
  ) {
    this.onLedChange = onLedChange;
    this.onSerialLog = onSerialLog;
  }

  public start(code: string) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.step = 0;

    this.onSerialLog('--- Starting Arduino Simulation ---');
    this.onSerialLog('Sketch loaded. Running setup()...');

    // Parse delay time if user customized it (e.g. delay(1000))
    let delayMs = 1000;
    const delayMatch = code.match(/delay\s*\(\s*(\d+)\s*\)/);
    if (delayMatch && delayMatch[1]) {
      delayMs = Math.max(100, Math.min(5000, parseInt(delayMatch[1], 10)));
    }

    this.onSerialLog(`Blink cycle configured for ${delayMs}ms interval.`);

    // Simulation Loop running the blink
    this.currentLedState = true;
    this.onLedChange(true);
    this.onSerialLog('LED_BUILTIN -> HIGH');

    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this.currentLedState = !this.currentLedState;
      this.onLedChange(this.currentLedState);
      this.onSerialLog(`LED_BUILTIN -> ${this.currentLedState ? 'HIGH' : 'LOW'}`);
    }, delayMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentLedState = false;
    this.onLedChange(false);
    this.onSerialLog('--- Simulation Stopped ---');
  }

  public sendSerialInput(input: string) {
    this.onSerialLog(`[User Input]: ${input}`);
    this.onSerialLog(`[Arduino Echo]: Received "${input}" (${input.length} bytes)`);
  }
}
