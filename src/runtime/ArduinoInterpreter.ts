/**
 * Arduino / ESP32 C++ Behavioral Interpreter
 *
 * Implements a lightweight, deterministic AST interpreter for Arduino C++ firmware
 * targeting the ESP32 DevKit V1 robotics profile.
 *
 * Supports:
 * - Variable declarations (int, float, bool, constexpr, const, #define)
 * - Full expression evaluation (arithmetic, unary, comparisons, logical, ternary)
 * - Helper functions with parameters, default arguments, and local scopes
 * - Control flow: if/else, while, for, return, blocks
 * - Built-in Arduino math: abs(), constrain(), min(), max(), map(), sq(), sqrt()
 * - GPIO APIs: pinMode(), digitalWrite(), digitalRead()
 * - PWM APIs: ledcAttach(), ledcWrite(), analogWrite()
 * - Timing APIs: delay(), delayMicroseconds(), millis(), micros()
 * - Serial APIs: Serial.begin(), Serial.print(), Serial.println()
 */

export enum PinMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  INPUT_PULLUP = 'INPUT_PULLUP',
}

export interface LedcChannel {
  pin: number;
  frequency: number;
  resolutionBits: number;
  duty: number;
  dutyFraction: number;
}

export interface PinStateModel {
  pin: number;
  mode: PinMode;
  digital: 0 | 1;
  dutyFraction: number;
  frequency: number;
  resolutionBits: number;
}

export interface InterpreterEvents {
  onPinStateChange?: (pin: number, state: 0 | 1, mode: PinMode) => void;
  onPWMChange?: (pin: number, dutyFraction: number, frequency: number, resolutionBits: number) => void;
  onSerialOutput?: (text: string) => void;
  onDiagnostic?: (type: string, message: string, data?: Record<string, unknown>) => void;
  readPinInput?: (pin: number) => 0 | 1;
}

// AST Nodes
export type ASTNode =
  | StmtNode
  | ExprNode;

export type StmtNode =
  | BlockStmt
  | ExprStmt
  | VarDeclStmt
  | IfStmt
  | WhileStmt
  | ForStmt
  | ReturnStmt
  | DelayStmt;

export interface BlockStmt {
  type: 'BlockStmt';
  body: StmtNode[];
}

export interface ExprStmt {
  type: 'ExprStmt';
  expr: ExprNode;
}

export interface VarDeclStmt {
  type: 'VarDeclStmt';
  name: string;
  init?: ExprNode;
}

export interface IfStmt {
  type: 'IfStmt';
  test: ExprNode;
  consequent: StmtNode;
  alternate?: StmtNode;
}

export interface WhileStmt {
  type: 'WhileStmt';
  test: ExprNode;
  body: StmtNode;
}

export interface ForStmt {
  type: 'ForStmt';
  init?: StmtNode;
  test?: ExprNode;
  update?: ExprNode;
  body: StmtNode;
}

export interface ReturnStmt {
  type: 'ReturnStmt';
  argument?: ExprNode;
}

export interface DelayStmt {
  type: 'DelayStmt';
  msExpr: ExprNode;
}

export type ExprNode =
  | LiteralExpr
  | IdentifierExpr
  | UnaryExpr
  | BinaryExpr
  | TernaryExpr
  | AssignExpr
  | CallExpr;

export interface LiteralExpr {
  type: 'Literal';
  value: number | string | boolean;
}

export interface IdentifierExpr {
  type: 'Identifier';
  name: string;
}

export interface UnaryExpr {
  type: 'UnaryExpr';
  operator: string;
  argument: ExprNode;
}

export interface BinaryExpr {
  type: 'BinaryExpr';
  operator: string;
  left: ExprNode;
  right: ExprNode;
}

export interface TernaryExpr {
  type: 'TernaryExpr';
  test: ExprNode;
  consequent: ExprNode;
  alternate: ExprNode;
}

export interface AssignExpr {
  type: 'AssignExpr';
  operator: string;
  left: string;
  right: ExprNode;
}

export interface CallExpr {
  type: 'CallExpr';
  callee: string;
  args: ExprNode[];
}

export interface FunctionDef {
  name: string;
  params: Array<{ name: string; defaultValue?: ExprNode }>;
  body: BlockStmt;
}

export class ArduinoInterpreter {
  private events: InterpreterEvents = {};
  private globalScope: Map<string, number | string | boolean> = new Map();
  private functions: Map<string, FunctionDef> = new Map();
  private pinStates: Map<number, PinStateModel> = new Map();
  private ledcChannels: Map<number, LedcChannel> = new Map();

  private isRunning = false;
  private isPaused = false;
  private virtualTimeMs = 0;

  // Execution state for cooperative step loop
  private setupFunction?: FunctionDef;
  private loopFunction?: FunctionDef;
  private loopFiber?: StatementFiber;

  constructor(events: InterpreterEvents = {}) {
    this.events = events;
    this.resetEnvironment();
  }

  public setEvents(events: InterpreterEvents) {
    this.events = events;
  }

  public getVirtualTimeMs(): number {
    return this.virtualTimeMs;
  }

  public getPinState(pin: number): PinStateModel {
    if (!this.pinStates.has(pin)) {
      this.pinStates.set(pin, {
        pin,
        mode: PinMode.INPUT,
        digital: 0,
        dutyFraction: 0,
        frequency: 0,
        resolutionBits: 8,
      });
    }
    return { ...this.pinStates.get(pin)! };
  }

  public getAllPinStates(): Record<number, PinStateModel> {
    const res: Record<number, PinStateModel> = {};
    for (const [p, s] of this.pinStates.entries()) {
      res[p] = { ...s };
    }
    return res;
  }

  public resetEnvironment() {
    this.globalScope.clear();
    this.functions.clear();
    this.pinStates.clear();
    this.ledcChannels.clear();
    this.virtualTimeMs = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.loopFiber = undefined;

    // Standard Arduino constants
    this.globalScope.set('HIGH', 1);
    this.globalScope.set('LOW', 0);
    this.globalScope.set('OUTPUT', 1);
    this.globalScope.set('INPUT', 0);
    this.globalScope.set('INPUT_PULLUP', 2);
    this.globalScope.set('true', true);
    this.globalScope.set('false', false);
    this.globalScope.set('LED_BUILTIN', 2);
  }

  /**
   * Parse source code into AST functions and global variables
   */
  public compile(source: string): { success: boolean; errors?: string[] } {
    this.resetEnvironment();
    const errors: string[] = [];

    try {
      const sanitized = this.preprocess(source);
      const parser = new CppParser(sanitized);
      const parsed = parser.parseProgram();

      // Register globals
      for (const [k, v] of parsed.globals.entries()) {
        const val = this.evalExpr(v, new Map());
        this.globalScope.set(k, val);
      }

      // Register functions
      for (const fn of parsed.functions) {
        this.functions.set(fn.name, fn);
      }

      this.setupFunction = this.functions.get('setup');
      this.loopFunction = this.functions.get('loop');

      if (!this.setupFunction) {
        errors.push('Arduino sketch must contain a void setup() function.');
      }
      if (!this.loopFunction) {
        errors.push('Arduino sketch must contain a void loop() function.');
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [err.message || 'Parser syntax error in Arduino sketch'],
      };
    }
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.virtualTimeMs = 0;

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-Boot] CPU0: Xtensa dual-core @ 240MHz, 520KB SRAM\r\n');
      this.events.onSerialOutput('[ESP32-Boot] Mounting SPIFFS filesystem /dev/vfs0...\r\n');
    }

    // Execute setup() synchronously
    if (this.setupFunction) {
      this.executeFunction(this.setupFunction, []);
    }

    // Initialize loop fiber
    if (this.loopFunction) {
      this.loopFiber = new StatementFiber(this.loopFunction.body, new Map(this.globalScope));
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.loopFiber = undefined;

    // Reset all output pins and PWM to zero
    for (const [pin, state] of this.pinStates.entries()) {
      if (state.mode === PinMode.OUTPUT || state.dutyFraction > 0 || state.digital !== 0) {
        state.digital = 0;
        state.dutyFraction = 0;
        if (this.events.onPinStateChange) {
          this.events.onPinStateChange(pin, 0, state.mode);
        }
        if (this.events.onPWMChange) {
          this.events.onPWMChange(pin, 0, state.frequency, state.resolutionBits);
        }
      }
    }

    if (this.events.onSerialOutput) {
      this.events.onSerialOutput('[ESP32-System] Simulation stopped.\r\n');
    }
  }

  /**
   * Advance simulation by deltaTimeSeconds (called on each frame/tick)
   */
  public step(deltaTimeSeconds: number) {
    if (!this.isRunning || this.isPaused || !this.loopFunction) return;

    let timeBudgetMs = deltaTimeSeconds * 1000;
    this.virtualTimeMs += timeBudgetMs;

    // Run statements until time budget is consumed by delays
    let safetyCounter = 0;
    while (timeBudgetMs > 0 && this.isRunning && !this.isPaused) {
      if (safetyCounter++ > 50000) {
        // Prevent infinite loops in code without delays
        break;
      }

      if (!this.loopFiber || this.loopFiber.isFinished()) {
        // Restart loop() iteration
        this.loopFiber = new StatementFiber(this.loopFunction.body, new Map(this.globalScope));
      }

      const yieldReason = this.loopFiber.step(this, timeBudgetMs);
      if (yieldReason.type === 'DELAY') {
        const consumed = yieldReason.timeConsumedMs;
        timeBudgetMs -= consumed;
        if (yieldReason.remainingDelayMs > 0) {
          // Still waiting for this delay to complete
          break;
        }
      } else if (yieldReason.type === 'COMPLETED') {
        // loop() completed one pass; will restart on next iteration
      }
    }
  }

  // --- Preprocessor & Sanitization ---
  private preprocess(code: string): string {
    // 1. Strip block comments /* ... */
    let s = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      // preserve line counts for error reporting
      return match.replace(/[^\n]/g, ' ');
    });

    // 2. Strip line comments //
    s = s.replace(/\/\/.*$/gm, '');

    // 3. Strip #include
    s = s.replace(/#include\s*<[^>]+>/g, '');
    s = s.replace(/#include\s*"[^"]+"/g, '');

    return s;
  }

  // --- Statement Execution ---
  public executeStatement(stmt: StmtNode, scope: Map<string, any>): { type: 'NEXT' | 'RETURN' | 'DELAY'; value?: any; ms?: number } {
    switch (stmt.type) {
      case 'BlockStmt': {
        for (const child of stmt.body) {
          const res = this.executeStatement(child, scope);
          if (res.type !== 'NEXT') return res;
        }
        return { type: 'NEXT' };
      }

      case 'ExprStmt': {
        this.evalExpr(stmt.expr, scope);
        return { type: 'NEXT' };
      }

      case 'VarDeclStmt': {
        const val = stmt.init ? this.evalExpr(stmt.init, scope) : 0;
        scope.set(stmt.name, val);
        return { type: 'NEXT' };
      }

      case 'IfStmt': {
        const cond = this.evalExpr(stmt.test, scope);
        if (this.isTruthy(cond)) {
          return this.executeStatement(stmt.consequent, scope);
        } else if (stmt.alternate) {
          return this.executeStatement(stmt.alternate, scope);
        }
        return { type: 'NEXT' };
      }

      case 'WhileStmt': {
        let iters = 0;
        while (this.isTruthy(this.evalExpr(stmt.test, scope))) {
          if (++iters > 10000) throw new Error('Maximum while-loop iterations exceeded');
          const res = this.executeStatement(stmt.body, scope);
          if (res.type !== 'NEXT') return res;
        }
        return { type: 'NEXT' };
      }

      case 'ForStmt': {
        if (stmt.init) {
          this.executeStatement(stmt.init, scope);
        }
        let iters = 0;
        while (!stmt.test || this.isTruthy(this.evalExpr(stmt.test, scope))) {
          if (++iters > 10000) throw new Error('Maximum for-loop iterations exceeded');
          const res = this.executeStatement(stmt.body, scope);
          if (res.type !== 'NEXT') return res;
          if (stmt.update) {
            this.evalExpr(stmt.update, scope);
          }
        }
        return { type: 'NEXT' };
      }

      case 'ReturnStmt': {
        const val = stmt.argument ? this.evalExpr(stmt.argument, scope) : undefined;
        return { type: 'RETURN', value: val };
      }

      case 'DelayStmt': {
        const ms = Number(this.evalExpr(stmt.msExpr, scope)) || 0;
        return { type: 'DELAY', ms: Math.max(0, ms) };
      }
    }
  }

  // --- Function Call Execution ---
  public executeFunction(fn: FunctionDef, argValues: any[]): any {
    const localScope = new Map<string, any>(this.globalScope);

    // Bind parameters
    fn.params.forEach((param, idx) => {
      if (idx < argValues.length && argValues[idx] !== undefined) {
        localScope.set(param.name, argValues[idx]);
      } else if (param.defaultValue) {
        localScope.set(param.name, this.evalExpr(param.defaultValue, localScope));
      } else {
        localScope.set(param.name, 0);
      }
    });

    for (const stmt of fn.body.body) {
      const res = this.executeStatement(stmt, localScope);
      if (res.type === 'RETURN') {
        return res.value;
      }
    }
    return undefined;
  }

  // --- Expression Evaluation ---
  public evalExpr(expr: ExprNode, scope: Map<string, any>): any {
    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier': {
        if (scope.has(expr.name)) return scope.get(expr.name);
        if (this.globalScope.has(expr.name)) return this.globalScope.get(expr.name);
        return 0; // Default undefined identifier
      }

      case 'UnaryExpr': {
        const val = this.evalExpr(expr.argument, scope);
        switch (expr.operator) {
          case '-': return -Number(val);
          case '+': return +Number(val);
          case '!': return !this.isTruthy(val) ? 1 : 0;
          default: return val;
        }
      }

      case 'BinaryExpr': {
        const left = this.evalExpr(expr.left, scope);
        // Short-circuit logical operators
        if (expr.operator === '&&') {
          return this.isTruthy(left) ? (this.isTruthy(this.evalExpr(expr.right, scope)) ? 1 : 0) : 0;
        }
        if (expr.operator === '||') {
          return this.isTruthy(left) ? 1 : (this.isTruthy(this.evalExpr(expr.right, scope)) ? 1 : 0);
        }

        const right = this.evalExpr(expr.right, scope);
        switch (expr.operator) {
          case '+': return Number(left) + Number(right);
          case '-': return Number(left) - Number(right);
          case '*': return Number(left) * Number(right);
          case '/': return Number(right) === 0 ? 0 : Number(left) / Number(right);
          case '%': return Number(right) === 0 ? 0 : Number(left) % Number(right);
          case '<': return left < right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '>=': return left >= right ? 1 : 0;
          case '==': return left === right ? 1 : 0;
          case '!=': return left !== right ? 1 : 0;
          default: return 0;
        }
      }

      case 'TernaryExpr': {
        const test = this.evalExpr(expr.test, scope);
        return this.isTruthy(test)
          ? this.evalExpr(expr.consequent, scope)
          : this.evalExpr(expr.alternate, scope);
      }

      case 'AssignExpr': {
        const rightVal = this.evalExpr(expr.right, scope);
        let finalVal = rightVal;

        const currentVal = scope.has(expr.left)
          ? scope.get(expr.left)
          : this.globalScope.get(expr.left) ?? 0;

        switch (expr.operator) {
          case '=': finalVal = rightVal; break;
          case '+=': finalVal = Number(currentVal) + Number(rightVal); break;
          case '-=': finalVal = Number(currentVal) - Number(rightVal); break;
          case '*=': finalVal = Number(currentVal) * Number(rightVal); break;
          case '/=': finalVal = Number(rightVal) === 0 ? 0 : Number(currentVal) / Number(rightVal); break;
          case '++': finalVal = Number(currentVal) + 1; break;
          case '--': finalVal = Number(currentVal) - 1; break;
        }

        if (scope.has(expr.left)) {
          scope.set(expr.left, finalVal);
        } else {
          this.globalScope.set(expr.left, finalVal);
        }
        return finalVal;
      }

      case 'CallExpr': {
        const args = expr.args.map((a) => this.evalExpr(a, scope));
        return this.dispatchCall(expr.callee, args, scope);
      }
    }
  }

  // --- Built-in API & Function Dispatch ---
  private dispatchCall(callee: string, args: any[], scope: Map<string, any>): any {
    // 1. Check user-defined functions
    const userFn = this.functions.get(callee);
    if (userFn) {
      return this.executeFunction(userFn, args);
    }

    // 2. Arduino Built-In Math & Utilities
    switch (callee) {
      case 'abs':
        return Math.abs(Number(args[0]) || 0);

      case 'constrain': {
        const x = Number(args[0]) || 0;
        const a = Number(args[1]) || 0;
        const b = Number(args[2]) || 0;
        return Math.max(a, Math.min(b, x));
      }

      case 'min':
        return Math.min(Number(args[0]) || 0, Number(args[1]) || 0);

      case 'max':
        return Math.max(Number(args[0]) || 0, Number(args[1]) || 0);

      case 'map': {
        const [x, in_min, in_max, out_min, out_max] = args.map(Number);
        if (in_max === in_min) return out_min;
        return ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
      }

      case 'sq': {
        const v = Number(args[0]) || 0;
        return v * v;
      }

      case 'sqrt':
        return Math.sqrt(Math.max(0, Number(args[0]) || 0));

      // 3. Serial Logging
      case 'Serial.begin':
        return;

      case 'Serial.print': {
        const msg = String(args[0] ?? '');
        this.events.onSerialOutput?.(msg);
        return;
      }

      case 'Serial.println': {
        const msg = String(args[0] ?? '');
        this.events.onSerialOutput?.(`${msg}\r\n`);
        return;
      }

      // 4. GPIO APIs
      case 'pinMode': {
        const pin = Math.round(Number(args[0]));
        const rawMode = args[1];
        let mode = PinMode.OUTPUT;
        if (rawMode === 0 || rawMode === 'INPUT') mode = PinMode.INPUT;
        else if (rawMode === 2 || rawMode === 'INPUT_PULLUP') mode = PinMode.INPUT_PULLUP;

        const state = this.getPinState(pin);
        state.mode = mode;
        this.pinStates.set(pin, state);
        this.events.onPinStateChange?.(pin, state.digital, mode);
        return;
      }

      case 'digitalWrite': {
        const pin = Math.round(Number(args[0]));
        const val: 0 | 1 = this.isTruthy(args[1]) ? 1 : 0;

        const state = this.getPinState(pin);
        state.digital = val;
        // If pin has LEDC duty, writing digital overrides or sets duty
        this.pinStates.set(pin, state);
        this.events.onPinStateChange?.(pin, val, state.mode);
        return;
      }

      case 'digitalRead': {
        const pin = Math.round(Number(args[0]));
        if (this.events.readPinInput) {
          return this.events.readPinInput(pin);
        }
        return this.getPinState(pin).digital;
      }

      // 5. ESP32 LEDC PWM & analogWrite APIs
      case 'ledcAttach': {
        // ESP32 core 3.x API: bool ledcAttach(pin, freq, resolution)
        const pin = Math.round(Number(args[0]));
        const freq = Number(args[1]) || 20000;
        const res = Number(args[2]) || 8;

        const ch: LedcChannel = {
          pin,
          frequency: freq,
          resolutionBits: res,
          duty: 0,
          dutyFraction: 0,
        };
        this.ledcChannels.set(pin, ch);

        const state = this.getPinState(pin);
        state.mode = PinMode.OUTPUT;
        state.frequency = freq;
        state.resolutionBits = res;
        this.pinStates.set(pin, state);
        return true;
      }

      case 'ledcWrite': {
        // bool ledcWrite(pin, duty)
        const pin = Math.round(Number(args[0]));
        const rawDuty = Number(args[1]) || 0;

        const ch = this.ledcChannels.get(pin) || {
          pin,
          frequency: 20000,
          resolutionBits: 8,
          duty: 0,
          dutyFraction: 0,
        };

        const maxDuty = Math.pow(2, ch.resolutionBits) - 1;
        const clampedDuty = Math.max(0, Math.min(maxDuty, rawDuty));
        const fraction = clampedDuty / maxDuty;

        ch.duty = clampedDuty;
        ch.dutyFraction = fraction;
        this.ledcChannels.set(pin, ch);

        const state = this.getPinState(pin);
        state.dutyFraction = fraction;
        state.frequency = ch.frequency;
        state.resolutionBits = ch.resolutionBits;
        state.digital = fraction > 0 ? 1 : 0;
        this.pinStates.set(pin, state);

        this.events.onPWMChange?.(pin, fraction, ch.frequency, ch.resolutionBits);
        return true;
      }

      case 'analogWrite': {
        // Standard Arduino 8-bit PWM (0..255)
        const pin = Math.round(Number(args[0]));
        const val = Math.max(0, Math.min(255, Number(args[1]) || 0));
        const fraction = val / 255.0;

        const state = this.getPinState(pin);
        state.dutyFraction = fraction;
        state.frequency = 1000;
        state.resolutionBits = 8;
        state.digital = fraction > 0 ? 1 : 0;
        this.pinStates.set(pin, state);

        this.events.onPWMChange?.(pin, fraction, 1000, 8);
        return;
      }

      case 'millis':
        return Math.floor(this.virtualTimeMs);

      case 'micros':
        return Math.floor(this.virtualTimeMs * 1000);

      default:
        // Report unsupported function call diagnostic
        this.events.onDiagnostic?.('UNSUPPORTED_CALL', `Call to unknown or unsupported function: ${callee}(...)`);
        return 0;
    }
  }

  private isTruthy(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0 && val !== '0';
    return !!val;
  }
}

/**
 * Statement execution fiber for step-by-step cooperative loop() simulation
 */
class StatementFiber {
  private statements: StmtNode[];
  private scope: Map<string, any>;
  private currentIndex = 0;
  private currentDelayMs = 0;
  private timeWaitedInDelayMs = 0;

  constructor(body: BlockStmt, parentScope: Map<string, any>) {
    this.statements = body.body;
    this.scope = new Map(parentScope);
  }

  public isFinished(): boolean {
    return this.currentIndex >= this.statements.length;
  }

  public step(
    interpreter: ArduinoInterpreter,
    timeAvailableMs: number
  ): { type: 'DELAY' | 'COMPLETED'; timeConsumedMs: number; remainingDelayMs: number } {
    // If currently stalled in an active delay
    if (this.currentDelayMs > 0) {
      const needed = this.currentDelayMs - this.timeWaitedInDelayMs;
      if (timeAvailableMs >= needed) {
        this.timeWaitedInDelayMs = 0;
        this.currentDelayMs = 0;
        this.currentIndex++;
        return { type: 'DELAY', timeConsumedMs: needed, remainingDelayMs: 0 };
      } else {
        this.timeWaitedInDelayMs += timeAvailableMs;
        return { type: 'DELAY', timeConsumedMs: timeAvailableMs, remainingDelayMs: needed - timeAvailableMs };
      }
    }

    // Execute statements sequentially until a delay or completion
    while (this.currentIndex < this.statements.length) {
      const stmt = this.statements[this.currentIndex];
      const res = interpreter.executeStatement(stmt, this.scope);

      if (res.type === 'DELAY') {
        const delayMs = res.ms || 0;
        if (delayMs > 0) {
          this.currentDelayMs = delayMs;
          this.timeWaitedInDelayMs = 0;
          return this.step(interpreter, timeAvailableMs);
        } else {
          this.currentIndex++;
        }
      } else if (res.type === 'RETURN') {
        this.currentIndex = this.statements.length;
        return { type: 'COMPLETED', timeConsumedMs: 0, remainingDelayMs: 0 };
      } else {
        this.currentIndex++;
      }
    }

    return { type: 'COMPLETED', timeConsumedMs: 0, remainingDelayMs: 0 };
  }
}

/**
 * Tokenizer & C++ Subset Parser
 */
interface Token {
  type: 'IDENT' | 'NUMBER' | 'STRING' | 'SYMBOL' | 'EOF';
  value: string;
  line: number;
}

class CppParser {
  private src: string;
  private pos = 0;
  private line = 1;
  private tokens: Token[] = [];
  private tokenIndex = 0;

  constructor(src: string) {
    this.src = src;
    this.tokenize();
  }

  private tokenize() {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];

      // Whitespace
      if (/\s/.test(ch)) {
        if (ch === '\n') this.line++;
        this.pos++;
        continue;
      }

      // #define directive: #define NAME VALUE
      if (ch === '#' && this.src.slice(this.pos).startsWith('#define')) {
        this.pos += 7;
        // read name
        while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
        const nameStart = this.pos;
        while (this.pos < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.pos])) this.pos++;
        const name = this.src.slice(nameStart, this.pos);

        // read value until end of line
        while (this.pos < this.src.length && /\s/.test(this.src[this.pos]) && this.src[this.pos] !== '\n') this.pos++;
        const valStart = this.pos;
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.pos++;
        const val = this.src.slice(valStart, this.pos).trim();

        // Push as equivalent to: constexpr int NAME = VALUE;
        this.tokens.push({ type: 'IDENT', value: 'constexpr', line: this.line });
        this.tokens.push({ type: 'IDENT', value: 'int', line: this.line });
        this.tokens.push({ type: 'IDENT', value: name, line: this.line });
        this.tokens.push({ type: 'SYMBOL', value: '=', line: this.line });
        if (/^-?[0-9]/.test(val)) {
          this.tokens.push({ type: 'NUMBER', value: val, line: this.line });
        } else {
          this.tokens.push({ type: 'IDENT', value: val, line: this.line });
        }
        this.tokens.push({ type: 'SYMBOL', value: ';', line: this.line });
        continue;
      }

      // String literal
      if (ch === '"' || ch === "'") {
        const quote = ch;
        this.pos++;
        let str = '';
        while (this.pos < this.src.length && this.src[this.pos] !== quote) {
          if (this.src[this.pos] === '\\' && this.pos + 1 < this.src.length) {
            this.pos++;
            const escaped = this.src[this.pos];
            if (escaped === 'n') str += '\n';
            else if (escaped === 'r') str += '\r';
            else if (escaped === 't') str += '\t';
            else str += escaped;
          } else {
            str += this.src[this.pos];
          }
          this.pos++;
        }
        this.pos++; // skip closing quote
        this.tokens.push({ type: 'STRING', value: str, line: this.line });
        continue;
      }

      // Numbers (decimal and hex)
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.src[this.pos + 1] || ''))) {
        let numStr = '';
        if (ch === '0' && (this.src[this.pos + 1] === 'x' || this.src[this.pos + 1] === 'X')) {
          numStr += '0x';
          this.pos += 2;
          while (this.pos < this.src.length && /[0-9a-fA-F]/.test(this.src[this.pos])) {
            numStr += this.src[this.pos++];
          }
        } else {
          while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) {
            numStr += this.src[this.pos++];
          }
        }
        this.tokens.push({ type: 'NUMBER', value: numStr, line: this.line });
        continue;
      }

      // Identifiers & keywords
      if (/[A-Za-z_]/.test(ch)) {
        let ident = '';
        while (this.pos < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.pos])) {
          ident += this.src[this.pos++];
        }
        // Handle Serial.print and Serial.println as composite identifiers
        if (ident === 'Serial' && this.src[this.pos] === '.') {
          this.pos++;
          let method = '';
          while (this.pos < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.pos])) {
            method += this.src[this.pos++];
          }
          this.tokens.push({ type: 'IDENT', value: `Serial.${method}`, line: this.line });
        } else {
          this.tokens.push({ type: 'IDENT', value: ident, line: this.line });
        }
        continue;
      }

      // Multi-character symbols
      const two = this.src.slice(this.pos, this.pos + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/='].includes(two)) {
        this.tokens.push({ type: 'SYMBOL', value: two, line: this.line });
        this.pos += 2;
        continue;
      }

      // Single-character symbols
      if ('{}()[];,?:=+-*/%<>!'.includes(ch)) {
        this.tokens.push({ type: 'SYMBOL', value: ch, line: this.line });
        this.pos++;
        continue;
      }

      // Unknown character, skip
      this.pos++;
    }

    this.tokens.push({ type: 'EOF', value: '', line: this.line });
  }

  private peek(): Token {
    return this.tokens[this.tokenIndex] || { type: 'EOF', value: '', line: this.line };
  }

  private next(): Token {
    const t = this.peek();
    this.tokenIndex++;
    return t;
  }

  private matchSymbol(s: string): boolean {
    if (this.peek().type === 'SYMBOL' && this.peek().value === s) {
      this.next();
      return true;
    }
    return false;
  }

  private expectSymbol(s: string) {
    const tok = this.next();
    if (tok.type !== 'SYMBOL' || tok.value !== s) {
      throw new Error(`Expected '${s}', found '${tok.value}' at line ${tok.line}`);
    }
  }

  public parseProgram(): { globals: Map<string, ExprNode>; functions: FunctionDef[] } {
    const globals = new Map<string, ExprNode>();
    const functions: FunctionDef[] = [];

    const typeKeywords = ['void', 'int', 'float', 'double', 'bool', 'auto', 'constexpr', 'const', 'unsigned', 'char', 'long'];

    while (this.peek().type !== 'EOF') {
      const tok = this.peek();

      if (tok.type === 'IDENT' && typeKeywords.includes(tok.value)) {
        // Collect type modifiers: constexpr int, const int, unsigned long, etc.
        while (this.peek().type === 'IDENT' && typeKeywords.includes(this.peek().value)) {
          this.next();
        }

        const nameTok = this.next();
        if (nameTok.type !== 'IDENT') {
          throw new Error(`Expected identifier after type declaration at line ${nameTok.line}`);
        }
        const name = nameTok.value;

        // Is it a function definition or variable declaration?
        if (this.peek().type === 'SYMBOL' && this.peek().value === '(') {
          // Function definition: name(params) { body }
          this.expectSymbol('(');
          const params: Array<{ name: string; defaultValue?: ExprNode }> = [];

          while (!this.matchSymbol(')')) {
            // skip param type keywords
            while (this.peek().type === 'IDENT' && typeKeywords.includes(this.peek().value)) {
              this.next();
            }
            const pNameTok = this.next();
            const pName = pNameTok.value;
            let defVal: ExprNode | undefined;
            if (this.matchSymbol('=')) {
              defVal = this.parseExpression();
            }
            params.push({ name: pName, defaultValue: defVal });
            if (this.matchSymbol(',')) continue;
          }

          const body = this.parseBlock();
          functions.push({ name, params, body });
        } else {
          // Global variable declaration: name = expr;
          let init: ExprNode | undefined;
          if (this.matchSymbol('=')) {
            init = this.parseExpression();
          }
          this.expectSymbol(';');
          if (init) globals.set(name, init);
        }
      } else {
        // Stray token or statement outside function
        this.next();
      }
    }

    return { globals, functions };
  }

  private parseBlock(): BlockStmt {
    this.expectSymbol('{');
    const body: StmtNode[] = [];
    while (!this.matchSymbol('}')) {
      if (this.peek().type === 'EOF') {
        throw new Error('Unexpected EOF inside block');
      }
      body.push(this.parseStatement());
    }
    return { type: 'BlockStmt', body };
  }

  private parseStatement(): StmtNode {
    const tok = this.peek();

    if (tok.type === 'SYMBOL' && tok.value === '{') {
      return this.parseBlock();
    }

    if (tok.type === 'IDENT') {
      if (tok.value === 'if') {
        this.next();
        this.expectSymbol('(');
        const test = this.parseExpression();
        this.expectSymbol(')');
        const consequent = this.parseStatement();
        let alternate: StmtNode | undefined;
        if (this.peek().type === 'IDENT' && this.peek().value === 'else') {
          this.next();
          alternate = this.parseStatement();
        }
        return { type: 'IfStmt', test, consequent, alternate };
      }

      if (tok.value === 'while') {
        this.next();
        this.expectSymbol('(');
        const test = this.parseExpression();
        this.expectSymbol(')');
        const body = this.parseStatement();
        return { type: 'WhileStmt', test, body };
      }

      if (tok.value === 'for') {
        this.next();
        this.expectSymbol('(');
        let init: StmtNode | undefined;
        if (!this.matchSymbol(';')) {
          init = this.parseStatement(); // parses var decl or expr with ;
        }
        let test: ExprNode | undefined;
        if (!this.matchSymbol(';')) {
          test = this.parseExpression();
          this.expectSymbol(';');
        }
        let update: ExprNode | undefined;
        if (!this.matchSymbol(')')) {
          update = this.parseExpression();
          this.expectSymbol(')');
        }
        const body = this.parseStatement();
        return { type: 'ForStmt', init, test, update, body };
      }

      if (tok.value === 'return') {
        this.next();
        let arg: ExprNode | undefined;
        if (!this.matchSymbol(';')) {
          arg = this.parseExpression();
          this.expectSymbol(';');
        }
        return { type: 'ReturnStmt', argument: arg };
      }

      if (tok.value === 'delay') {
        this.next();
        this.expectSymbol('(');
        const msExpr = this.parseExpression();
        this.expectSymbol(')');
        this.expectSymbol(';');
        return { type: 'DelayStmt', msExpr };
      }

      // Check for local variable declaration: (int|float|bool|auto|...) name [= init];
      const typeKeywords = ['int', 'float', 'double', 'bool', 'auto', 'const', 'constexpr', 'unsigned', 'long', 'char'];
      if (typeKeywords.includes(tok.value)) {
        while (this.peek().type === 'IDENT' && typeKeywords.includes(this.peek().value)) {
          this.next();
        }
        const name = this.next().value;
        let init: ExprNode | undefined;
        if (this.matchSymbol('=')) {
          init = this.parseExpression();
        }
        this.expectSymbol(';');
        return { type: 'VarDeclStmt', name, init };
      }
    }

    // Default: expression statement
    const expr = this.parseExpression();
    this.expectSymbol(';');
    return { type: 'ExprStmt', expr };
  }

  // --- Expression Parser with Precedence Climbing ---
  private parseExpression(): ExprNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ExprNode {
    const expr = this.parseTernary();

    if (this.peek().type === 'SYMBOL') {
      const op = this.peek().value;
      if (['=', '+=', '-=', '*=', '/='].includes(op)) {
        this.next();
        if (expr.type !== 'Identifier') {
          throw new Error(`Invalid left-hand side in assignment at line ${this.peek().line}`);
        }
        const right = this.parseAssignment();
        return { type: 'AssignExpr', operator: op, left: expr.name, right };
      }
    }

    return expr;
  }

  private parseTernary(): ExprNode {
    const expr = this.parseLogicalOr();

    if (this.matchSymbol('?')) {
      const consequent = this.parseExpression();
      this.expectSymbol(':');
      const alternate = this.parseTernary();
      return { type: 'TernaryExpr', test: expr, consequent, alternate };
    }

    return expr;
  }

  private parseLogicalOr(): ExprNode {
    let left = this.parseLogicalAnd();
    while (this.matchSymbol('||')) {
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryExpr', operator: '||', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ExprNode {
    let left = this.parseEquality();
    while (this.matchSymbol('&&')) {
      const right = this.parseEquality();
      left = { type: 'BinaryExpr', operator: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): ExprNode {
    let left = this.parseRelational();
    while (this.peek().type === 'SYMBOL' && ['==', '!='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseRelational();
      left = { type: 'BinaryExpr', operator: op, left, right };
    }
    return left;
  }

  private parseRelational(): ExprNode {
    let left = this.parseAdditive();
    while (this.peek().type === 'SYMBOL' && ['<', '>', '<=', '>='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = { type: 'BinaryExpr', operator: op, left, right };
    }
    return left;
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'SYMBOL' && ['+', '-'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpr', operator: op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parseUnary();
    while (this.peek().type === 'SYMBOL' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { type: 'BinaryExpr', operator: op, left, right };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    if (this.peek().type === 'SYMBOL') {
      const op = this.peek().value;
      if (op === '-' || op === '+' || op === '!') {
        this.next();
        const arg = this.parseUnary();
        return { type: 'UnaryExpr', operator: op, argument: arg };
      }
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ExprNode {
    const expr = this.parsePrimary();

    if (this.peek().type === 'SYMBOL') {
      const op = this.peek().value;
      if (op === '++' || op === '--') {
        this.next();
        if (expr.type !== 'Identifier') {
          throw new Error(`Invalid operand for postfix ${op}`);
        }
        return { type: 'AssignExpr', operator: op, left: expr.name, right: { type: 'Literal', value: 1 } };
      }
    }

    return expr;
  }

  private parsePrimary(): ExprNode {
    const tok = this.next();

    if (tok.type === 'NUMBER') {
      const num = tok.value.startsWith('0x') ? parseInt(tok.value, 16) : parseFloat(tok.value);
      return { type: 'Literal', value: isNaN(num) ? 0 : num };
    }

    if (tok.type === 'STRING') {
      return { type: 'Literal', value: tok.value };
    }

    if (tok.type === 'IDENT') {
      // Check for function call
      if (this.matchSymbol('(')) {
        const args: ExprNode[] = [];
        if (!this.matchSymbol(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.matchSymbol(','));
          this.expectSymbol(')');
        }
        return { type: 'CallExpr', callee: tok.value, args };
      }

      return { type: 'Identifier', name: tok.value };
    }

    if (tok.type === 'SYMBOL' && tok.value === '(') {
      const expr = this.parseExpression();
      this.expectSymbol(')');
      return expr;
    }

    throw new Error(`Unexpected token '${tok.value}' at line ${tok.line}`);
  }
}
