import React, { useState } from 'react';
import { ComponentInstance, PinDefinition, PinState } from './types';
import { CircuitEngine } from './CircuitEngine';
import { WOKWI_ESP32_DEVKIT_V1_PINS } from './wokwi/wokwiElements';

interface ESP32DevKitV1BoardProps {
  component: ComponentInstance;
  circuit?: CircuitEngine;
  hoveredPin?: { compId: string; pinId: string } | null;
  dragConnecting?: {
    fromCompId: string;
    fromPinId: string;
    target: { compId: string; pinId: string; isValid: boolean; reason?: string } | null;
  } | null;
  onPinPointerDown?: (compId: string, pinId: string, e: React.PointerEvent) => void;
  onPinHoverEnter?: (compId: string, pinId: string) => void;
  onPinHoverLeave?: () => void;
  onResetMcu?: () => void;
  isSimulating?: boolean;
}

export const ESP32_PIN_SEMANTIC_ROLES: Record<string, { label: string; role: string; category: string }> = {
  // Left Column
  'EN': { label: 'EN', role: 'Enable / Active-Low Reset (CHIP_PU)', category: 'System' },
  'VP': { label: 'VP (36)', role: 'Sensor VP • ADC1_CH0 (Input Only)', category: 'ADC In' },
  'VN': { label: 'VN (39)', role: 'Sensor VN • ADC1_CH3 (Input Only)', category: 'ADC In' },
  'D34': { label: 'D34', role: 'GPIO 34 • ADC1_CH6 (Input Only)', category: 'ADC In' },
  'D35': { label: 'D35', role: 'GPIO 35 • ADC1_CH7 (Input Only)', category: 'ADC In' },
  'D32': { label: 'D32', role: 'GPIO 32 • ADC1_CH4 / Touch 9 / PWM', category: 'GPIO / PWM' },
  'D33': { label: 'D33', role: 'GPIO 33 • ADC1_CH5 / Touch 8 / PWM', category: 'GPIO / PWM' },
  'D25': { label: 'D25', role: 'PWMA • Left Motor Speed (LEDC / DAC1)', category: 'PWM Out' },
  'D26': { label: 'D26', role: 'AIN1 • Left Motor Dir 1 (DAC2)', category: 'Digital Out' },
  'D27': { label: 'D27', role: 'AIN2 • Left Motor Dir 2 (Touch 7)', category: 'Digital Out' },
  'D14': { label: 'D14', role: 'PWMB • Right Motor Speed (LEDC / HSPI_CLK)', category: 'PWM Out' },
  'D12': { label: 'D12', role: 'GPIO 12 • HSPI_MISO / Touch 5 / PWM', category: 'GPIO / SPI' },
  'D13': { label: 'D13', role: 'GPIO 13 • HSPI_MOSI / Touch 4 / PWM', category: 'GPIO / SPI' },
  'GND2': { label: 'GND', role: 'System Ground (Port 2)', category: 'Ground' },
  'VIN': { label: 'VIN (5V)', role: 'External 5V DC Supply Input Rail', category: 'Power In' },

  // Right Column
  'D23': { label: 'D23', role: 'STBY • TB6612 Standby (VSPI_MOSI)', category: 'Digital Out' },
  'D22': { label: 'D22', role: 'GPIO 22 • I2C SCL / PWM', category: 'I2C SCL' },
  'TX0': { label: 'TX0', role: 'GPIO 1 • UART0 TX (Serial Out)', category: 'Serial TX' },
  'RX0': { label: 'RX0', role: 'GPIO 3 • UART0 RX (Serial In)', category: 'Serial RX' },
  'D21': { label: 'D21', role: 'GPIO 21 • I2C SDA / PWM', category: 'I2C SDA' },
  'D19': { label: 'D19', role: 'BIN2 • Right Motor Dir 2 (VSPI_MISO)', category: 'Digital Out' },
  'D18': { label: 'D18', role: 'BIN1 • Right Motor Dir 1 (VSPI_CLK)', category: 'Digital Out' },
  'D5': { label: 'D5', role: 'GPIO 5 • VSPI_CS0 / PWM', category: 'GPIO / SPI' },
  'TX2': { label: 'TX2', role: 'GPIO 17 • UART2 TX', category: 'Serial TX' },
  'RX2': { label: 'RX2', role: 'GPIO 16 • UART2 RX', category: 'Serial RX' },
  'D4': { label: 'D4', role: 'GPIO 4 • Touch 0 / ADC2_CH0 / PWM', category: 'GPIO / PWM' },
  'D2': { label: 'D2', role: 'GPIO 2 • Built-in Blue LED / Touch 2', category: 'GPIO / LED' },
  'D15': { label: 'D15', role: 'GPIO 15 • HSPI_CS0 / Touch 3 / PWM', category: 'GPIO / SPI' },
  'GND1': { label: 'GND', role: 'System Ground (Port 1)', category: 'Ground' },
  '3V3': { label: '3V3', role: '3.3V Regulated Main Power Output Rail', category: 'Power Out' },
};

export const ESP32DevKitV1Board: React.FC<ESP32DevKitV1BoardProps> = ({
  component,
  circuit,
  hoveredPin,
  dragConnecting,
  onPinPointerDown,
  onPinHoverEnter,
  onPinHoverLeave,
  onResetMcu,
  isSimulating = false,
}) => {
  const [isResetPressed, setIsResetPressed] = useState(false);
  const [isBootPressed, setIsBootPressed] = useState(false);
  const [resetPulseActive, setResetPulseActive] = useState(false);

  // Unique SVG IDs to prevent clashes with multiple boards on canvas
  const redLedFilterId = 'esp32RedLedFilter_' + component.id;
  const blueLedFilterId = 'esp32BlueLedFilter_' + component.id;
  const pinPatternId = 'esp32PinPattern_' + component.id;
  const smallPinPatternId = 'esp32SmallPinPattern_' + component.id;

  // Power state: either simulating or circuit has common ground + logic
  const evalResult = circuit ? circuit.evaluateCircuit() : { logicPowered: false };
  const isPowered = isSimulating || Boolean(evalResult && evalResult.logicPowered);

  // Live state of Built-in LED (GPIO 2)
  const d2State = circuit ? circuit.getPinState(component.id, 'D2') : { digital: 0, dutyCycle: 0, frequency: 0, voltage: 0 };
  const isD2Active = (d2State.digital === 1 || d2State.dutyCycle > 0) && isPowered;

  const handleResetDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResetPressed(true);
    setResetPulseActive(true);
    if (onResetMcu) onResetMcu();
    if (circuit) circuit.triggerMcuReset();
  };

  const handleResetUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResetPressed(false);
    setTimeout(() => {
      setResetPulseActive(false);
    }, 180);
  };

  const getPinSignalStatus = (pinId: string, state: PinState): string => {
    if (pinId === '3V3' || pinId === '3.3V') return '3.3V (VCC)';
    if (pinId === 'VIN' || pinId === '5V') return '5.0V (VIN)';
    if (pinId.startsWith('GND')) return '0.0V (GND)';
    if (state.dutyCycle > 0) {
      return `PWM ${Math.round(state.dutyCycle * 100)}% (${(state.voltage || state.dutyCycle * 3.3).toFixed(2)}V)`;
    }
    if (state.digital === 1) {
      return `HIGH (${(state.voltage || 3.3).toFixed(1)}V)`;
    }
    return 'LOW (0.0V)';
  };

  const getSocketIndicatorColor = (pin: PinDefinition, state: PinState) => {
    if (pin.id === '3V3' || pin.id === 'VIN') return '#06b6d4';
    if (pin.id.startsWith('GND')) return '#475569';
    if (state.dutyCycle > 0) return '#c084fc';
    if (state.digital === 1) return '#facc15';
    return '#d1c479'; // Gold castellated pad
  };

  return (
    <g className="esp32-devkit-v1-physical-board select-none">
      <defs>
        {/* Glow Filters for Live LEDs */}
        <filter id={redLedFilterId} x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={blueLedFilterId} x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Wokwi Gold Castellated Solder Pad Pattern */}
        <pattern id={pinPatternId} height="4.6" width="5" patternUnits="userSpaceOnUse">
          <path
            d="m3.5 2.85c0.268 1.82e-4 0.525-0.106 0.716-0.296 0.187-0.19 0.296-0.445 0.297-0.713l5.7e-4 -0.836c1.82e-4 -0.268-0.109-0.525-0.296-0.716-0.19-0.19-0.447-0.296-0.715-0.297l-3.5-0.0024-0.0019 2.85z"
            fill="#d1c479"
            strokeWidth="3.11"
          />
        </pattern>

        <pattern id={smallPinPatternId} height="4.6" width="2.5" patternUnits="userSpaceOnUse">
          <path
            d="m1.4 1.32c0-0.138-0.0547-0.271-0.153-0.37-0.098-0.0965-0.23-0.153-0.368-0.153h-0.432c-0.138 0-0.271 0.0563-0.37 0.153-0.098 0.098-0.153 0.231-0.153 0.37v1.81h1.47z"
            fill="#f5f9f0"
            strokeWidth="1.61"
          />
        </pattern>
      </defs>

      {/* Scale 1.5x to map Wokwi 107x201 SVG space directly to MagicSmoke 160.5x301.5 board dimensions */}
      <g transform="scale(1.5)">
        {/* 1. AUTHENTIC MATTE BLACK FR4 BOARD SILHOUETTE WITH HOLES & CASTELLATED EDGES */}
        <path
          d="m7.56 0c-4.19 0-7.56 3.37-7.56 7.56v181c0 4.19 3.37 7.56 7.56 7.56h91.5c4.19 0 7.56-3.37 7.56-7.56v-181c0-4.19-3.37-7.56-7.56-7.56zm1.11 2.5a6.24 6.24 0 0 1 6.24 6.24 6.24 6.24 0 0 1-6.24 6.24 6.24 6.24 0 0 1-6.24-6.24 6.24 6.24 0 0 1 6.24-6.24zm88.9 0.217a6.24 6.24 0 0 1 6.24 6.24 6.24 6.24 0 0 1-6.24 6.24 6.24 6.24 0 0 1-6.24-6.24 6.24 6.24 0 0 1 6.24-6.24zm3.75 15.8a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.5 0.438a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.6 9.15a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.8 0.344a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.8 9.7a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.6 0.27a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.6 9.24a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.6 0.0391a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm0.0762 9.58a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.6 0.0371a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm0 9.58a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.6 0.422a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm0 9.51a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.5 0.115a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.4 9.54a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.5 0.0391a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.5 9.7a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.5 0.346a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.7 9.35a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.7 0.154a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.6 9.43a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.7 0.23a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm0 9.58a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.7 0.23a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.7 9.35a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.7 0.152a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.8 9.51a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.7 0.154a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm96.7 9.43a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm-96.7 0.152a3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4 3.4 3.4 0 0 1 3.4-3.4zm3.79 24.7a6.24 6.24 0 0 1 6.24 6.24 6.24 6.24 0 0 1-6.24 6.24 6.24 6.24 0 0 1-6.24-6.24 6.24 6.24 0 0 1 6.24-6.24zm88.7 0.217a6.24 6.24 0 0 1 6.24 6.24 6.24 6.24 0 0 1-6.24 6.24 6.24 6.24 0 0 1-6.24-6.24 6.24 6.24 0 0 1 6.24-6.24z"
          fill="#1a1a1a"
          fillRule="evenodd"
        />

        {/* 2. ESP-WROOM-32 METALLIC SHIELD & CHIP PADS */}
        <rect transform="translate(85,34)" width="4.8" height="55" fill={`url(#${pinPatternId})`} />
        <rect transform="translate(20.5,87) rotate(180)" width="4.8" height="55" fill={`url(#${pinPatternId})`} />
        <rect transform="translate(80,98) rotate(90)" width="4.8" height="55" fill={`url(#${pinPatternId})`} />
        <rect x="20" y="24.8" width="65.6" height="73.3" fill="#808080" fillRule="evenodd" rx="2" />

        {/* Silkscreen text on RF Shield */}
        <text x="30" y="59" fill="#e2e8f0" fontFamily="sans-serif" fontSize="15px" fontWeight="700">
          ESP32
        </text>
        <text x="30" y="70" fill="#cbd5e1" fontFamily="monospace" fontSize="4.2px">
          Xtensa LX6 240MHz
        </text>
        <circle cx="70" cy="54" r="8" fill="none" stroke="#64748b" strokeWidth="0.8" opacity="0.4" />
        <path d="M 66 54 A 4 4 0 0 1 74 54 M 64 51 A 7 7 0 0 1 76 51" fill="none" stroke="#64748b" strokeWidth="0.8" opacity="0.4" />

        {/* 3. COPPER SERPENTINE PCB ANTENNA */}
        <path
          d="m24.3 22.1v-18.8h8v11.5h10.2v-11h8.5v10.5h10v-10.5h17.8v20.2"
          fill="none"
          stroke="#d97706"
          strokeWidth="1px"
        />
        <path d="m69.7 4.16v19.5" fill="none" stroke="#d97706" strokeWidth="1px" />

        {/* 4. VOLTAGE REGULATOR (AMS1117-3.3) */}
        <g fill="#ececec" fillRule="evenodd">
          <rect x="19.3" y="143" width="7.21" height="11.5" />
          <rect x="39.8" y="139" width="6.59" height="3.07" />
          <rect x="40" y="147" width="6.59" height="3.07" />
          <rect x="40.2" y="156" width="6.59" height="3.07" />
        </g>
        <rect x="26.3" y="137" width="14" height="24.7" fill="#4d4d4d" fillRule="evenodd" rx="1" />

        {/* 5. TACTILE PUSHBUTTONS (BOOT & EN) */}
        {/* BOOT Button (Bottom Right) */}
        <g strokeWidth="1.24">
          <rect x="77.6" y="177" width="11.1" height="9.96" fill="#cecccb" rx="1" />
          <circle
            cx="83.2"
            cy="182"
            r="3.48"
            fill={isBootPressed ? '#f59e0b' : '#ffdc8e'}
            stroke="#b45309"
            strokeWidth="0.5"
            className="cursor-pointer"
            onPointerDown={() => setIsBootPressed(true)}
            onPointerUp={() => setIsBootPressed(false)}
          />
          <text x="83.2" y="174" textAnchor="middle" fill="#94a3b8" fontSize="3.5px" fontFamily="monospace">
            BOOT
          </text>
        </g>

        {/* EN / RESET Button (Bottom Left) */}
        <g strokeWidth="1.24">
          <rect x="17.7" y="177" width="11.1" height="9.96" fill="#cecccb" rx="1" />
          <circle
            cx="23.3"
            cy="182"
            r="3.48"
            fill={isResetPressed ? '#f43f5e' : '#ffdc8e'}
            stroke="#991b1b"
            strokeWidth="0.5"
            className="cursor-pointer"
            onPointerDown={handleResetDown}
            onPointerUp={handleResetUp}
          />
          <text x="23.3" y="174" textAnchor="middle" fill="#94a3b8" fontSize="3.5px" fontFamily="monospace">
            EN
          </text>
        </g>

        {/* 6. MICRO-USB CONNECTOR */}
        <path
          d="m66.4 197 1.06 2.24c0.0651 0.142 0.0731 0.302 0.0207 0.448-0.0525 0.147-0.16 0.266-0.301 0.332-0.14 0.0665-0.302 0.0744-0.448 0.022-0.146-0.0525-0.266-0.16-0.332-0.301l-0.724-1.54-3e-3 0.207c-6e-3 0.488-0.206 0.955-0.556 1.3-0.35 0.342-0.821 0.529-1.31 0.522l-22.2-0.29c-0.489-6e-3 -0.955-0.206-1.3-0.556-0.341-0.35-0.529-0.821-0.522-1.31l3e-3 -0.207-0.764 1.52c-0.0701 0.14-0.192 0.244-0.34 0.292-0.147 0.0486-0.307 0.0365-0.446-0.0336l-1e-3 -1e-5c-0.138-0.0701-0.244-0.192-0.292-0.34-0.0486-0.147-0.0365-0.307 0.0336-0.447l1.11-2.21-0.602-8e-3 0.269-20.6 28.2 0.369-0.269 20.6z"
          fill="#cecccb"
          strokeWidth="1.26"
        />
        <path
          d="m60.7 177-0.0236 1.8c-7.9e-4 0.0607 0.0301 0.116 0.0802 0.148 0.522 0.329 3.38 2.12 3.38 2.12l-0.0217 1.66-1.74-0.0227-0.0156 1.19-2.63-0.0344 0.0156-1.19-1.66-0.0217 0.0413-3.16c2e-3 -0.136-0.0496-0.265-0.143-0.361-0.0948-0.096-0.223-0.151-0.357-0.152l-1.58-0.0207-0.0172 1.31-6.46-0.0845 0.0172-1.31-1.58-0.0207c-0.134-2e-3 -0.264 0.0496-0.36 0.143-0.0973 0.0936-0.152 0.221-0.154 0.357l-0.0413 3.16-1.66-0.0217-0.0156 1.19-2.63-0.0344 0.0156-1.19-1.74-0.0228 0.0217-1.66s2.91-1.73 3.43-2.03c0.0522-0.0309 0.0833-0.0848 0.0841-0.146l0.0236-1.8z"
          fill="#989898"
          strokeWidth="1.26"
        />

        {/* 7. LIVE LEDS: PWR (RED) & D2 (BLUE) */}
        <g strokeWidth="1.44">
          {/* PWR LED */}
          <rect x="35" y="108" width="3.83" height="9.3" fill="#e5e5e5" rx="0.5" />
          <rect x="35" y="111" width="3.83" height="5.31" fill="#f5ecde" />
          {isPowered && (
            <circle cx="37" cy="113.5" r="3.5" fill="#ef4444" filter={`url(#${redLedFilterId})`} />
          )}

          {/* D2 Built-in LED */}
          <rect x="69.5" y="108" width="3.83" height="9.3" fill="#e5e5e5" rx="0.5" />
          <rect x="69.5" y="110" width="3.83" height="5.31" fill="#f5ecde" />
          {isD2Active && (
            <circle cx="71.5" cy="112.5" r="3.5" fill="#3b82f6" filter={`url(#${blueLedFilterId})`} />
          )}
        </g>

        {/* 8. CP2102 USB INTERFACE BRIDGE CHIP */}
        <rect transform="translate(69,137)" width="13.9" height="3" fill={`url(#${smallPinPatternId})`} />
        <rect transform="translate(82.8,160.5) rotate(180)" width="13.9" height="3" fill={`url(#${smallPinPatternId})`} />
        <rect transform="translate(87.2,142) rotate(90)" width="13.9" height="3" fill={`url(#${smallPinPatternId})`} />
        <rect transform="translate(64,155.8) rotate(270)" width="13.9" height="3" fill={`url(#${smallPinPatternId})`} />
        <rect x="66.9" y="140" width="17.4" height="17.4" fill="#333" rx="1" />

        {/* 9. WOKWI SILKSCREEN PIN LABELS */}
        <text fill="#ffffff" fontFamily="monospace" fontSize="3.72px" fontWeight="700" transform="rotate(270)">
          {/* Left Column Labels */}
          <tspan x="-162.21" y="12.285">VIN</tspan>
          <tspan x="-153.37" y="12.317">GND</tspan>
          <tspan x="-143.03" y="12.269">D13</tspan>
          <tspan x="-132.81" y="12.130">D12</tspan>
          <tspan x="-123.10" y="12.514">D14</tspan>
          <tspan x="-113.82" y="12.481">D27</tspan>
          <tspan x="-103.55" y="12.580">D26</tspan>
          <tspan x="-94.204" y="12.509">D25</tspan>
          <tspan x="-84.482" y="12.632">D33</tspan>
          <tspan x="-74.139" y="12.294">D32</tspan>
          <tspan x="-64.263" y="12.750">D35</tspan>
          <tspan x="-54.385" y="12.631">D34</tspan>
          <tspan x="-44.529" y="12.468">VN</tspan>
          <tspan x="-35.205" y="12.546">VP</tspan>
          <tspan x="-25.439" y="12.846">EN</tspan>

          {/* Right Column Labels */}
          <tspan x="-163.01" y="95.712">3V3</tspan>
          <tspan x="-153.64" y="95.392">GND</tspan>
          <tspan x="-142.86" y="95.431">D15</tspan>
          <tspan x="-131.36" y="95.296">D2</tspan>
          <tspan x="-122.53" y="95.505">D4</tspan>
          <tspan x="-114.75" y="95.613">RX2</tspan>
          <tspan x="-104.84" y="95.442">TX2</tspan>
          <tspan x="-93.899" y="95.430">D5</tspan>
          <tspan x="-85.460" y="95.585">D18</tspan>
          <tspan x="-75.415" y="95.747">D19</tspan>
          <tspan x="-65.796" y="95.687">D21</tspan>
          <tspan x="-55.802" y="95.818">RX0</tspan>
          <tspan x="-45.850" y="95.613">TX0</tspan>
          <tspan x="-36.582" y="96.012">D22</tspan>
          <tspan x="-26.250" y="95.903">D23</tspan>
        </text>
      </g>

      {/* 10. INTERACTIVE PIN SOCKET OVERLAYS (1:1 ON 1.5x WORLD COORDINATES) */}
      {Object.values(component.pins).map((pin: PinDefinition) => {
        const isHovered = hoveredPin?.compId === component.id && hoveredPin?.pinId === pin.id;
        const isDragSource =
          dragConnecting?.fromCompId === component.id && dragConnecting?.fromPinId === pin.id;
        const isTargetCandidate =
          dragConnecting?.target?.compId === component.id && dragConnecting?.target?.pinId === pin.id;
        const isTargetValid = isTargetCandidate && dragConnecting?.target?.isValid;
        const isTargetInvalid = isTargetCandidate && !dragConnecting?.target?.isValid;

        const liveState: PinState = circuit ? circuit.getPinState(component.id, pin.id) : { digital: 0, dutyCycle: 0, frequency: 0, voltage: 0 };
        const socketIndicator = getSocketIndicatorColor(pin, liveState);

        return (
          <g
            key={pin.id}
            onPointerDown={(e) => onPinPointerDown && onPinPointerDown(component.id, pin.id, e)}
            onMouseDown={(e) => onPinPointerDown && onPinPointerDown(component.id, pin.id, e as unknown as React.PointerEvent)}
            onPointerEnter={() => onPinHoverEnter && onPinHoverEnter(component.id, pin.id)}
            onMouseEnter={() => onPinHoverEnter && onPinHoverEnter(component.id, pin.id)}
            onPointerLeave={() => onPinHoverLeave && onPinHoverLeave()}
            onMouseLeave={() => onPinHoverLeave && onPinHoverLeave()}
            className="cursor-crosshair group"
            style={{ pointerEvents: 'all' }}
            data-testid={`pin-${component.id}-${pin.id}`}
            data-wokwi-pin={`esp32:${pin.id}`}
          >
            {/* Gold Castellated Solder Pad Highlight */}
            <circle
              cx={pin.offset.x}
              cy={pin.offset.y}
              r="4.2"
              fill={socketIndicator}
              stroke="#b45309"
              strokeWidth="0.8"
              pointerEvents="none"
            />
            <circle
              cx={pin.offset.x}
              cy={pin.offset.y}
              r="2.2"
              fill="#09090b"
              pointerEvents="none"
            />

            {/* Generous 20px Transparent Interactive Hit Target */}
            <circle
              cx={pin.offset.x}
              cy={pin.offset.y}
              r="10"
              fill="#000000"
              fillOpacity="0.001"
              style={{ pointerEvents: 'all' }}
              onPointerDown={(e) => onPinPointerDown && onPinPointerDown(component.id, pin.id, e)}
              onMouseDown={(e) => onPinPointerDown && onPinPointerDown(component.id, pin.id, e as unknown as React.PointerEvent)}
              data-testid={`pin-circle-${component.id}-${pin.id}`}
            />

            {/* Glowing Target Ring on Hover or Drag */}
            {(isHovered || isDragSource || isTargetCandidate) && (
              <circle
                cx={pin.offset.x}
                cy={pin.offset.y}
                r="8.5"
                pointerEvents="none"
                fill={
                  isDragSource
                    ? '#f59e0b'
                    : isTargetValid
                    ? '#10b981'
                    : isTargetInvalid
                    ? '#f43f5e'
                    : '#00f0ff'
                }
                fillOpacity="0.35"
                stroke={
                  isDragSource
                    ? '#f59e0b'
                    : isTargetValid
                    ? '#10b981'
                    : isTargetInvalid
                    ? '#f43f5e'
                    : '#00f0ff'
                }
                strokeWidth="1.8"
              />
            )}

            {/* WOKWI FLOATING PIN ROLE & LIVE STATE TOOLTIP ON HOVER */}
            {isHovered && (
              <g pointerEvents="none" className="transition-opacity">
                {(() => {
                  const meta = ESP32_PIN_SEMANTIC_ROLES[pin.id] || {
                    label: pin.name,
                    role: pin.description,
                    category: 'GPIO',
                  };
                  const signalStr = getPinSignalStatus(pin.id, liveState);

                  // Position tooltip left or right depending on pin column
                  const isLeftCol = pin.offset.x < 80;
                  const tipX = isLeftCol ? pin.offset.x - 170 : pin.offset.x + 14;
                  const tipY = Math.max(10, Math.min(260, pin.offset.y - 20));

                  return (
                    <g transform={`translate(${tipX}, ${tipY})`}>
                      {/* Tooltip Card Background */}
                      <rect
                        x="0"
                        y="0"
                        width="160"
                        height="44"
                        rx="6"
                        fill="#090d16"
                        stroke="#00f0ff"
                        strokeWidth="1.2"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.85))"
                      />
                      {/* Wokwi Header Badge */}
                      <rect x="6" y="6" width="56" height="13" rx="3" fill="#1e293b" />
                      <text
                        x="10"
                        y="15.5"
                        fill="#38bdf8"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        esp32:{pin.id}
                      </text>
                      {/* Live Signal State Pill */}
                      <text
                        x="154"
                        y="15.5"
                        textAnchor="end"
                        fill="#10b981"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        {signalStr}
                      </text>
                      {/* Semantic Description */}
                      <text
                        x="8"
                        y="32"
                        fill="#f1f5f9"
                        fontSize="8"
                        fontFamily="sans-serif"
                        fontWeight="600"
                      >
                        {meta.role}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
