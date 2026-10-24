export enum PinType {
  DIGITAL_INPUT = 'DIGITAL_INPUT',
  DIGITAL_OUTPUT = 'DIGITAL_OUTPUT',
  ANALOG_INPUT = 'ANALOG_INPUT',
  PWM_OUTPUT = 'PWM_OUTPUT',
  POWER_VCC = 'POWER_VCC',
  POWER_VM = 'POWER_VM',
  GROUND = 'GROUND',
  MOTOR_OUT = 'MOTOR_OUT',
}

export enum PinVoltage {
  V_0 = 0,
  V_3_3 = 3.3,
  V_5 = 5.0,
  V_12 = 12.0,
}

export interface PinState {
  digital: 0 | 1;
  dutyCycle: number; // 0.0 - 1.0 (or 0-255 scaled)
  frequency: number; // Hz
  voltage: number;   // In Volts
  connectedNetId?: string;
}

export interface PinDefinition {
  id: string;
  name: string;
  type: PinType;
  description: string;
  nominalVoltage?: number;
  offset: { x: number; y: number }; // relative coordinate for canvas/SVG ports
}

export interface ComponentInstance {
  id: string;
  type:
    | 'ESP32_DEVKIT_V1'
    | 'TB6612FNG'
    | 'N20_MOTOR'
    | 'BATTERY_PACK'
    | 'GROUND_BUS'
    | 'HC_SR04'
    | 'ARDUINO_UNO_R3'
    | 'IR_SENSOR_ARRAY_8CH';
  name: string;
  position: { x: number; y: number };
  pins: Record<string, PinDefinition>;
  dimensions?: { width: number; height: number };
}

export interface WireConnection {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color?: string;
}

export interface CircuitStateSnapshot {
  netStates: Record<string, PinState>;
  circuitErrors: string[];
  circuitWarnings: string[];
  hasCommonGround: boolean;
  logicPowered: boolean;
  motorPowered: boolean;
}
