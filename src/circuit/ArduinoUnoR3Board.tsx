import React, { useState } from 'react';
import { ComponentInstance, PinDefinition, PinState } from './types';
import { CircuitEngine } from './CircuitEngine';
import { WOKWI_ARDUINO_UNO_PINS, WOKWI_PINS_FEMALE_PATTERN_DEF, HEADER_PITCH_MM } from './wokwi/wokwiElements';
import { MAGIC_TO_WOKWI_PIN_MAP } from './wokwi/pinAliasMapper';

export { WOKWI_ARDUINO_UNO_PINS, HEADER_PITCH_MM };

interface ArduinoUnoR3BoardProps {
  component: ComponentInstance;
  circuit: CircuitEngine;
  hoveredPin: { compId: string; pinId: string } | null;
  dragConnecting: {
    fromCompId: string;
    fromPinId: string;
    target: { compId: string; pinId: string; isValid: boolean; reason?: string } | null;
  } | null;
  onPinPointerDown: (compId: string, pinId: string, e: React.PointerEvent) => void;
  onPinHoverEnter: (compId: string, pinId: string) => void;
  onPinHoverLeave: () => void;
  onResetMcu?: () => void;
  isSimulating?: boolean;
}

export const PIN_SEMANTIC_ROLES: Record<string, { label: string; role: string; category: string }> = {
  '5V': { label: '5V', role: '5V Regulated Power Output (Logic Rail)', category: 'Power' },
  '3V3': { label: '3.3V', role: '3.3V Regulated Output (Up to 50mA)', category: 'Power' },
  'GND1': { label: 'GND', role: 'Power Header System Ground (Port 1)', category: 'Ground' },
  'GND2': { label: 'GND', role: 'Power Header System Ground (Port 2)', category: 'Ground' },
  'GND3': { label: 'GND', role: 'Digital Header System Ground (Port 3)', category: 'Ground' },
  'VIN': { label: 'VIN', role: 'External DC Input (7-12V)', category: 'Power In' },
  'RESET': { label: 'RESET', role: 'Active-Low MCU Hardware Reset', category: 'System' },
  'IOREF': { label: 'IOREF', role: 'Target Board I/O Voltage Reference (5V)', category: 'System' },
  'AREF': { label: 'AREF', role: 'ADC Analog Reference Voltage', category: 'Analog Ref' },

  'A0': { label: 'A0 (D14)', role: 'IR7 • Reflectance Channel 7 (+25mm)', category: 'Analog / Digital' },
  'A1': { label: 'A1 (D15)', role: 'IR8 • Reflectance Channel 8 (+35mm)', category: 'Analog / Digital' },
  'A2': { label: 'A2 (D16)', role: 'BIN2 • TB6612 Right Motor Dir 2', category: 'Digital Out' },
  'A3': { label: 'A3 (D17)', role: 'Analog Input 3 / General GPIO', category: 'Analog / Digital' },
  'A4': { label: 'A4 (SDA)', role: 'I2C SDA • Serial Data / Analog In 4', category: 'I2C / ADC' },
  'A5': { label: 'A5 (SCL)', role: 'I2C SCL • Serial Clock / Analog In 5', category: 'I2C / ADC' },

  'D0': { label: '0 (RX)', role: 'USART Receive (Serial In)', category: 'Serial RX' },
  'D1': { label: '1 (TX)', role: 'USART Transmit (Serial Out)', category: 'Serial TX' },
  'D2': { label: '2', role: 'IR1 • Reflectance Channel 1 (-35mm)', category: 'Digital In' },
  'D3': { label: '~3', role: 'STBY • TB6612 Standby Control (Active HIGH)', category: 'PWM / Digital' },
  'D4': { label: '4', role: 'IR2 • Reflectance Channel 2 (-25mm)', category: 'Digital In' },
  'D5': { label: '~5', role: 'PWMA • Left Motor Speed (Timer 0B)', category: 'PWM Out' },
  'D6': { label: '~6', role: 'PWMB • Right Motor Speed (Timer 0A)', category: 'PWM Out' },
  'D7': { label: '7', role: 'IR3 • Reflectance Channel 3 (-15mm)', category: 'Digital In' },
  'D8': { label: '8', role: 'IR4 • Reflectance Channel 4 (-5mm, Center L)', category: 'Digital In' },
  'D9': { label: '~9', role: 'AIN1 • TB6612 Left Motor Dir 1', category: 'PWM Out' },
  'D10': { label: '~10', role: 'AIN2 • TB6612 Left Motor Dir 2', category: 'PWM Out' },
  'D11': { label: '~11', role: 'BIN1 • TB6612 Right Motor Dir 1 (SPI MOSI)', category: 'PWM Out' },
  'D12': { label: '12', role: 'IR5 • Reflectance Channel 5 (+5mm, Center R)', category: 'Digital In' },
  'D13': { label: '13', role: 'IR6 • Reflectance Channel 6 (+15mm) / LED L', category: 'Digital In' },
};

export const ArduinoUnoR3Board: React.FC<ArduinoUnoR3BoardProps> = ({
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
  const [resetPulseActive, setResetPulseActive] = useState(false);

  // Check board power: either actively simulating, or circuit logic is powered
  const evalResult = circuit.evaluateCircuit();
  const isPowered = isSimulating || evalResult.logicPowered;

  // Live state of Built-in LED L (Pin 13)
  const d13State = circuit.getPinState(component.id, 'D13');
  const isD13Active = (d13State.digital === 1 || d13State.dutyCycle > 0 || resetPulseActive) && isPowered;

  // Live state of TX & RX
  const d1State = circuit.getPinState(component.id, 'D1');
  const d0State = circuit.getPinState(component.id, 'D0');
  const isTxActive = (d1State.digital === 1 || d1State.dutyCycle > 0) && isPowered;
  const isRxActive = (d0State.digital === 1 || d0State.dutyCycle > 0) && isPowered;

  // Handle tactile reset button press/release
  const handleResetDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResetPressed(true);
    setResetPulseActive(true);

    if (onResetMcu) {
      onResetMcu();
    }
    circuit.triggerMcuReset();
  };

  const handleResetUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResetPressed(false);
    setTimeout(() => {
      setResetPulseActive(false);
    }, 180);
  };

  // Get live signal text for tooltip
  const getPinSignalStatus = (pinId: string, state: PinState): string => {
    if (pinId === '5V') return '5.0V (VCC)';
    if (pinId === '3V3' || pinId === '3.3V') return '3.3V (VCC)';
    if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND3' || pinId.startsWith('GND')) return '0.0V (GND)';
    if (pinId === 'VIN') return '7.4V (VIN)';
    if (state.dutyCycle > 0) {
      return `PWM ${Math.round(state.dutyCycle * 100)}% (${(state.voltage || state.dutyCycle * 5).toFixed(2)}V)`;
    }
    if (state.digital === 1) {
      return `HIGH (${(state.voltage || 5.0).toFixed(1)}V)`;
    }
    return 'LOW (0.0V)';
  };

  // Helper for pin socket color indicator
  const getSocketIndicatorColor = (pin: PinDefinition, state: PinState) => {
    if (pin.id === '5V' || pin.id === '3V3' || pin.id === 'VIN') return '#06b6d4';
    if (pin.id === 'GND1' || pin.id === 'GND2' || pin.id === 'GND3') return '#475569';
    if (state.dutyCycle > 0) return '#c084fc'; // Purple for PWM
    if (state.digital === 1) return '#facc15'; // Amber/Yellow for HIGH
    return '#18181b';
  };

  return (
    <g className="arduino-uno-physical-board select-none">
      <defs>
        {/* Glow Filters for Live LEDs */}
        <filter id="greenLedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="amberLedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Metallic Bevel Gradients */}
        <linearGradient id="usbSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id="crystalSilverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="40%" stopColor="#cbd5e1" />
          <stop offset="80%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id="pcbTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007f82" />
          <stop offset="100%" stopColor="#006063" />
        </linearGradient>

        {/* Wokwi 2.54mm Female Header Socket Pattern */}
        <pattern id="pins-female-pitch" width="10.5" height="15" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="10.5" height="15" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
          <rect x="2.5" y="4.5" width="5.5" height="6" rx="0.8" fill="#09090b" stroke="#333" strokeWidth="0.5" />
          <rect x="3.5" y="5.5" width="3.5" height="4" rx="0.5" fill="#3f3f46" opacity="0.6" />
        </pattern>
      </defs>

      {/* 1. PCB BASE SILHOUETTE WITH AUTHENTIC STEPPED CONTOURS */}
      <path
        d={`
          M 34 16
          L 322 16
          Q 328 16 328 22
          L 328 62
          L 334 68
          L 334 140
          L 328 146
          L 328 212
          Q 328 218 322 218
          L 92 218
          L 92 211
          L 80 211
          L 80 218
          L 34 218
          Q 28 218 28 212
          L 28 22
          Q 28 16 34 16
          Z
        `}
        fill="url(#pcbTealGrad)"
        stroke="#004d4f"
        strokeWidth="1.6"
      />

      {/* Inner PCB Bevel Border Line */}
      <path
        d={`
          M 35 18
          L 321 18
          L 326 62
          L 332 68
          L 332 139
          L 326 145
          L 326 216
          L 93 216
          L 93 212
          L 79 212
          L 79 216
          L 35 216
          Z
        `}
        fill="none"
        stroke="#009ea3"
        strokeWidth="0.8"
        opacity="0.4"
      />

      {/* 2. FOUR METALLIC PCB MOUNTING HOLES */}
      {[
        { cx: 82, cy: 26 },   // Top-Left
        { cx: 80, cy: 206 },  // Bottom-Left
        { cx: 320, cy: 76 },  // Right Upper
        { cx: 320, cy: 196 }, // Right Lower
      ].map((hole, i) => (
        <g key={i}>
          <circle cx={hole.cx} cy={hole.cy} r="5" fill="#004d4f" />
          <circle cx={hole.cx} cy={hole.cy} r="4.2" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
          <circle cx={hole.cx} cy={hole.cy} r="2.8" fill="#07090e" stroke="#1e293b" strokeWidth="0.5" />
        </g>
      ))}

      {/* 3. OVERHANGING LEFT-EDGE CONNECTORS */}
      {/* A. Metallic Silver USB Type-B Port */}
      <g>
        <rect
          x="0"
          y="44"
          width="44"
          height="50"
          rx="3"
          fill="url(#usbSilverGrad)"
          stroke="#475569"
          strokeWidth="1.2"
        />
        <rect x="10" y="45" width="24" height="2" fill="#334155" rx="0.5" />
        <rect x="10" y="91" width="24" height="2" fill="#334155" rx="0.5" />
        <rect x="4" y="49" width="36" height="40" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect x="8" y="56" width="28" height="26" rx="1.5" fill="#090d16" />
        {[61, 66, 71, 76].map((py) => (
          <rect key={py} x="12" y={py} width="16" height="2" rx="0.5" fill="#eab308" />
        ))}
      </g>

      {/* B. Matte-Black DC Power Barrel Jack (2.1mm) */}
      <g>
        <rect
          x="8"
          y="160"
          width="50"
          height="48"
          rx="2.5"
          fill="#141416"
          stroke="#27272a"
          strokeWidth="1.2"
        />
        <rect x="8" y="170" width="10" height="28" fill="#09090b" rx="1" />
        <circle cx="26" cy="184" r="8" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
        <circle cx="26" cy="184" r="4.5" fill="#09090b" />
        <circle cx="26" cy="184" r="2.2" fill="#71717a" />
        <rect x="54" y="166" width="4" height="6" fill="#a1a1aa" />
        <rect x="54" y="196" width="4" height="6" fill="#a1a1aa" />
      </g>

      {/* 4. ON-BOARD POWER & PASSIVE COMPONENTS */}
      {/* 5V SOT-223 Low-Dropout Voltage Regulator */}
      <g>
        <rect x="62" y="136" width="18" height="18" rx="2" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
        <rect x="64" y="132" width="14" height="4" fill="#cbd5e1" rx="0.5" />
        <rect x="64" y="154" width="3" height="4" fill="#cbd5e1" />
        <rect x="69.5" y="154" width="3" height="4" fill="#cbd5e1" />
        <rect x="75" y="154" width="3" height="4" fill="#cbd5e1" />
      </g>

      {/* 500mA Golden Resettable Polyfuse */}
      <g>
        <rect x="58" y="104" width="14" height="18" rx="2" fill="#ca8a04" stroke="#eab308" strokeWidth="0.8" />
        <rect x="56" y="107" width="2" height="12" fill="#94a3b8" />
        <rect x="72" y="107" width="2" height="12" fill="#94a3b8" />
      </g>

      {/* Two Cylindrical Silver Electrolytic Capacitors */}
      <g>
        <circle cx="94" cy="178" r="11" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        <path d="M 83 178 A 11 11 0 0 1 94 167 L 94 189 Z" fill="#1e293b" opacity="0.85" />
        <circle cx="94" cy="178" r="8" fill="#e2e8f0" />

        <circle cx="118" cy="178" r="11" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        <path d="M 107 178 A 11 11 0 0 1 118 167 L 118 189 Z" fill="#1e293b" opacity="0.85" />
        <circle cx="118" cy="178" r="8" fill="#e2e8f0" />
      </g>

      {/* 5. 16.000 MHz QUARTZ CRYSTAL OSCILLATOR */}
      <g>
        <rect
          x="88"
          y="108"
          width="36"
          height="16"
          rx="8"
          fill="url(#crystalSilverGrad)"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <rect x="91" y="110" width="30" height="12" rx="6" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
        <text x="106" y="119" textAnchor="middle" fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">
          16.000
        </text>
      </g>

      {/* 6. ATmega16U2 USB INTERFACE SMD CHIP & JP2 PADS */}
      <g>
        <rect x="98" y="66" width="22" height="22" rx="2" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
        <circle cx="102" cy="70" r="1" fill="#71717a" />
        {[70, 74, 78, 82].map((ly) => (
          <React.Fragment key={ly}>
            <rect x="95" y={ly} width="3" height="1.5" fill="#cbd5e1" />
            <rect x="120" y={ly} width="3" height="1.5" fill="#cbd5e1" />
          </React.Fragment>
        ))}
        <text x="96" y="58" fill="#e2e8f0" fontSize="5.5" fontFamily="monospace" fontWeight="700">JP2</text>
        <circle cx="106" cy="54" r="2" fill="#cbd5e1" stroke="#004d4f" strokeWidth="0.5" />
        <circle cx="112" cy="54" r="2" fill="#cbd5e1" stroke="#004d4f" strokeWidth="0.5" />
        <circle cx="106" cy="60" r="2" fill="#cbd5e1" stroke="#004d4f" strokeWidth="0.5" />
        <circle cx="112" cy="60" r="2" fill="#cbd5e1" stroke="#004d4f" strokeWidth="0.5" />

        <rect x="96" y="26" width="18" height="12" rx="1" fill="#18181b" />
        {[0, 1].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={99 + col * 6}
              cy={29 + row * 6}
              r="1.4"
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth="0.4"
            />
          ))
        )}
      </g>

      {/* 7. ATmega328P DIP-28 MAIN MICROCONTROLLER */}
      <g>
        <rect
          x="154"
          y="142"
          width="134"
          height="34"
          rx="3"
          fill="#111113"
          stroke="#27272a"
          strokeWidth="1.2"
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <React.Fragment key={i}>
            <rect x={160 + i * 8.8} y="139" width="3.2" height="4" rx="0.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.4" />
            <rect x={160 + i * 8.8} y="175" width="3.2" height="4" rx="0.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.4" />
          </React.Fragment>
        ))}
        <rect
          x="156"
          y="145"
          width="130"
          height="28"
          rx="2"
          fill="#1c1917"
          stroke="#292524"
          strokeWidth="0.8"
        />
        <path d="M 156 155 A 4 4 0 0 1 156 163 Z" fill="#0c0a09" />
        <circle cx="163" cy="151" r="1.4" fill="#44403c" />
        <text
          x="221"
          y="162"
          textAnchor="middle"
          fill="#d6d3d1"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0.08em"
        >
          ATMEGA328P-PU
        </text>
      </g>

      {/* 8. RIGHT-EDGE 2x3 ICSP HEADER */}
      <g>
        <rect x="310" y="104" width="14" height="20" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
        <text x="317" y="100" textAnchor="middle" fill="#e2e8f0" fontSize="5.5" fontFamily="monospace" fontWeight="700">ICSP</text>
        {[0, 1].map((col) =>
          [0, 1, 2].map((row) => (
            <rect
              key={`${col}-${row}`}
              x={312 + col * 5.5}
              y={106 + row * 6}
              width="3"
              height="3"
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth="0.4"
            />
          ))
        )}
      </g>

      {/* 9. TOP-LEFT TACTILE RESET BUTTON (INTERACTIVE) */}
      <g
        onPointerDown={handleResetDown}
        onPointerUp={handleResetUp}
        onPointerLeave={handleResetUp}
        className="cursor-pointer group"
        data-testid="mcu-reset-button"
      >
        <title>Hardware Reset MCU (Click to restart sketch)</title>
        <rect
          x="38"
          y="20"
          width="18"
          height="18"
          rx="2"
          fill={isResetPressed ? '#94a3b8' : '#cbd5e1'}
          stroke="#475569"
          strokeWidth="1"
        />
        <rect x="36" y="21" width="2" height="3" fill="#64748b" />
        <rect x="36" y="33" width="2" height="3" fill="#64748b" />
        <rect x="56" y="21" width="2" height="3" fill="#64748b" />
        <rect x="56" y="33" width="2" height="3" fill="#64748b" />
        <circle
          id="reset-button"
          cx="47"
          cy="29"
          r={isResetPressed ? 4.5 : 5.2}
          fill={isResetPressed ? '#991b1b' : '#dc2626'}
          stroke={isResetPressed ? '#333' : '#7f1d1d'}
          strokeWidth="0.8"
          tabIndex={0}
          className="transition-all"
        />
        <text
          x="33"
          y="34"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="6.5"
          fontFamily="monospace"
          fontWeight="700"
          transform="rotate(-90 33 34)"
        >
          RESET
        </text>
      </g>

      {/* 10. AUTHENTIC ARDUINO SILKSCREEN BRANDING */}
      <g pointerEvents="none">
        <g transform="translate(196, 64)">
          <circle cx="-13" cy="0" r="9" fill="none" stroke="#ffffff" strokeWidth="2.8" />
          <rect x="-18" y="-1.4" width="10" height="2.8" fill="#ffffff" />
          <circle cx="13" cy="0" r="9" fill="none" stroke="#ffffff" strokeWidth="2.8" />
          <rect x="8" y="-1.4" width="10" height="2.8" fill="#ffffff" />
          <rect x="11.6" y="-5" width="2.8" height="10" fill="#ffffff" />
        </g>

        <text
          x="196"
          y="87"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="13"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          letterSpacing="0.08em"
        >
          ARDUINO
        </text>
        <circle cx="232" cy="78" r="2.2" fill="none" stroke="#ffffff" strokeWidth="0.6" />
        <text x="232" y="80" textAnchor="middle" fill="#ffffff" fontSize="3.5" fontWeight="700">R</text>

        <rect x="168" y="94" width="36" height="14" fill="#ffffff" rx="1.5" />
        <text x="186" y="104.5" textAnchor="middle" fill="#006063" fontSize="9.5" fontFamily="sans-serif" fontWeight="900">
          UNO
        </text>
        <rect x="207" y="94" width="22" height="14" fill="none" stroke="#ffffff" strokeWidth="1.2" rx="1.5" />
        <text x="218" y="104.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="sans-serif" fontWeight="800">
          R3
        </text>

        <text x="210" y="125" textAnchor="middle" fill="#e2e8f0" fontSize="6.5" fontFamily="monospace" fontWeight="700" letterSpacing="0.04em">
          ARDUINO.CC
        </text>
      </g>

      {/* 11. LIVE ON-BOARD INDICATOR LEDS (ON, L, TX, RX) */}
      {/* A. 'ON' Power LED (Green) */}
      <g>
        <rect x="281" y="66" width="6" height="8" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
        <circle
          id="ledPower"
          cx="284"
          cy="70"
          r="2.2"
          fill={isPowered ? '#22c55e' : '#14532d'}
          filter={isPowered ? 'url(#greenLedGlow)' : undefined}
          opacity={isPowered ? 1.0 : 0.4}
        />
        <text x="291" y="72" fill="#e2e8f0" fontSize="6" fontFamily="monospace" fontWeight="700">ON</text>
      </g>

      {/* B. 'L' Built-in LED (Amber, Pin 13) */}
      <g>
        <rect x="146" y="44" width="6" height="8" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
        <circle
          id="led13"
          cx="149"
          cy="48"
          r="2.2"
          fill={isD13Active ? '#fbbf24' : '#78350f'}
          filter={isD13Active ? 'url(#amberLedGlow)' : undefined}
          opacity={isD13Active ? 1.0 : 0.35}
        />
        <text x="142" y="50" textAnchor="end" fill="#e2e8f0" fontSize="6.5" fontFamily="monospace" fontWeight="700">L</text>
      </g>

      {/* C. 'TX' and 'RX' LEDs (Amber) */}
      <g>
        <rect x="146" y="63" width="6" height="7" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
        <circle
          id="ledTX"
          cx="149"
          cy="66.5"
          r="1.8"
          fill={isTxActive ? '#fbbf24' : '#78350f'}
          filter={isTxActive ? 'url(#amberLedGlow)' : undefined}
          opacity={isTxActive ? 1.0 : 0.35}
        />
        <text x="142" y="68.5" textAnchor="end" fill="#e2e8f0" fontSize="5.5" fontFamily="monospace" fontWeight="700">TX</text>

        <rect x="146" y="78" width="6" height="7" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
        <circle
          id="ledRX"
          cx="149"
          cy="81.5"
          r="1.8"
          fill={isRxActive ? '#fbbf24' : '#78350f'}
          filter={isRxActive ? 'url(#amberLedGlow)' : undefined}
          opacity={isRxActive ? 1.0 : 0.35}
        />
        <text x="142" y="83.5" textAnchor="end" fill="#e2e8f0" fontSize="5.5" fontFamily="monospace" fontWeight="700">RX</text>
      </g>

      {/* 12. BLACK FEMALE PLASTIC HEADER STRIP HOUSINGS (2.54mm PITCH) */}
      {/* Top Header Plastics */}
      <rect x="118" y="10" width="107" height="15" rx="1.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
      <rect x="231" y="10" width="86" height="15" rx="1.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />

      {/* Bottom Header Plastics */}
      <rect x="153" y="205" width="86" height="15" rx="1.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
      <rect x="252" y="205" width="65" height="15" rx="1.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />

      {/* Silkscreen Section Labels */}
      <text x="228" y="33" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontFamily="monospace" fontWeight="700" letterSpacing="0.04em">
        DIGITAL - PWM~
      </text>
      <line x1="170" y1="31" x2="198" y2="31" stroke="#ffffff" strokeWidth="0.8" />
      <line x1="258" y1="31" x2="286" y2="31" stroke="#ffffff" strokeWidth="0.8" />

      <text x="195" y="200" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontFamily="monospace" fontWeight="700" letterSpacing="0.04em">
        POWER
      </text>
      <text x="284" y="200" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontFamily="monospace" fontWeight="700" letterSpacing="0.04em">
        ANALOG IN
      </text>

      {/* Top Pin Labels */}
      <g fill="#ffffff" fontSize="6.5" fontFamily="monospace" fontWeight="700">
        <text x="144.5" y="32" textAnchor="middle">AREF</text>
        <rect x="150" y="25" width="10" height="9" fill="none" stroke="#ffffff" strokeWidth="0.8" />
        <text x="155" y="32" textAnchor="middle">GND</text>
        <text x="165.5" y="32" textAnchor="middle">13</text>
        <text x="176" y="32" textAnchor="middle">12</text>
        <text x="186.5" y="32" textAnchor="middle">~11</text>
        <text x="197" y="32" textAnchor="middle">~10</text>
        <text x="207.5" y="32" textAnchor="middle">~9</text>
        <text x="218" y="32" textAnchor="middle">8</text>

        <text x="236.5" y="32" textAnchor="middle">7</text>
        <text x="247" y="32" textAnchor="middle">~6</text>
        <text x="257.5" y="32" textAnchor="middle">~5</text>
        <text x="268" y="32" textAnchor="middle">4</text>
        <text x="278.5" y="32" textAnchor="middle">~3</text>
        <text x="289" y="32" textAnchor="middle">2</text>
        <text x="299.5" y="32" textAnchor="middle">TX</text>
        <text x="310" y="32" textAnchor="middle">RX</text>
      </g>

      {/* Bottom Pin Labels */}
      <g fill="#ffffff" fontSize="6.5" fontFamily="monospace" fontWeight="700">
        <text x="169" y="196" textAnchor="middle" transform="rotate(-90 169 196)">IOREF</text>
        <text x="179.5" y="196" textAnchor="middle" transform="rotate(-90 179.5 196)">RESET</text>
        <text x="190" y="196" textAnchor="middle" transform="rotate(-90 190 196)">3.3V</text>
        <text x="200.5" y="196" textAnchor="middle" transform="rotate(-90 200.5 196)">5V</text>
        <rect x="206" y="184" width="21" height="11" fill="none" stroke="#ffffff" strokeWidth="0.8" />
        <text x="216" y="192" textAnchor="middle">GND</text>
        <text x="232" y="196" textAnchor="middle" transform="rotate(-90 232 196)">Vin</text>

        <text x="257.5" y="194" textAnchor="middle">A0</text>
        <text x="268" y="194" textAnchor="middle">A1</text>
        <text x="278.5" y="194" textAnchor="middle">A2</text>
        <text x="289" y="194" textAnchor="middle">A3</text>
        <text x="299.5" y="194" textAnchor="middle">A4</text>
        <text x="310" y="194" textAnchor="middle">A5</text>
      </g>

      {/* 13. INTERACTIVE FEMALE HEADER SOCKET HIT TARGETS & LIVE STATE */}
      {Object.values(component.pins).map((pin: PinDefinition) => {
        const isHovered = hoveredPin?.compId === component.id && hoveredPin?.pinId === pin.id;
        const isDragSource =
          dragConnecting?.fromCompId === component.id && dragConnecting?.fromPinId === pin.id;
        const isTargetCandidate =
          dragConnecting?.target?.compId === component.id && dragConnecting?.target?.pinId === pin.id;
        const isTargetValid = isTargetCandidate && dragConnecting?.target?.isValid;
        const isTargetInvalid = isTargetCandidate && !dragConnecting?.target?.isValid;

        const liveState = circuit.getPinState(component.id, pin.id);
        const socketIndicator = getSocketIndicatorColor(pin, liveState);
        const wokwiName = MAGIC_TO_WOKWI_PIN_MAP[pin.id] || pin.id;

        return (
          <g
            key={pin.id}
            onPointerDown={(e) => onPinPointerDown(component.id, pin.id, e)}
            onMouseDown={(e) => onPinPointerDown(component.id, pin.id, e as unknown as React.PointerEvent)}
            onPointerEnter={() => onPinHoverEnter(component.id, pin.id)}
            onMouseEnter={() => onPinHoverEnter(component.id, pin.id)}
            onPointerLeave={onPinHoverLeave}
            onMouseLeave={onPinHoverLeave}
            className="cursor-crosshair group"
            style={{ pointerEvents: 'all' }}
            data-testid={`pin-${component.id}-${pin.id}`}
            data-wokwi-pin={`uno:${wokwiName}`}
          >
            {/* Recessed Square Plastic Socket Body */}
            <rect
              x={pin.offset.x - 3.8}
              y={pin.offset.y - 3.8}
              width="7.6"
              height="7.6"
              rx="1"
              fill="#09090b"
              stroke="#27272a"
              strokeWidth="0.8"
              pointerEvents="none"
            />

            {/* Inner Metallic Spring Clip Socket */}
            <rect
              x={pin.offset.x - 1.8}
              y={pin.offset.y - 1.8}
              width="3.6"
              height="3.6"
              rx="0.5"
              fill={socketIndicator}
              stroke="#3f3f46"
              strokeWidth="0.5"
              pointerEvents="none"
            />

            {/* Generous 24px Transparent Interactive Hit Circle */}
            <circle
              cx={pin.offset.x}
              cy={pin.offset.y}
              r="12"
              fill="#000000"
              fillOpacity="0.001"
              style={{ pointerEvents: 'all' }}
              onPointerDown={(e) => onPinPointerDown(component.id, pin.id, e)}
              onMouseDown={(e) => onPinPointerDown(component.id, pin.id, e as unknown as React.PointerEvent)}
              data-testid={`pin-circle-${component.id}-${pin.id}`}
            />

            {/* Glowing Target Ring on Hover or Drag */}
            {(isHovered || isDragSource || isTargetCandidate) && (
              <circle
                cx={pin.offset.x}
                cy={pin.offset.y}
                r="9"
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
                  const meta = PIN_SEMANTIC_ROLES[pin.id] || {
                    label: pin.name,
                    role: pin.description,
                    category: 'GPIO',
                  };
                  const signalStr = getPinSignalStatus(pin.id, liveState);

                  // Position tooltip above for top pins, below for bottom pins
                  const isTopPin = pin.offset.y <= 30;
                  const tipY = isTopPin ? pin.offset.y - 48 : pin.offset.y + 16;
                  const tipX = Math.max(70, Math.min(260, pin.offset.x));

                  return (
                    <g transform={`translate(${tipX}, ${tipY})`}>
                      <rect
                        x="-65"
                        y="0"
                        width="130"
                        height="40"
                        rx="5"
                        fill="#0c1017"
                        fillOpacity="0.96"
                        stroke="#00f0ff"
                        strokeWidth="1"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.8))"
                      />
                      {/* Header Line: Wokwi Name + Category */}
                      <text
                        x="-58"
                        y="13"
                        fill="#00f0ff"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="800"
                      >
                        uno:{wokwiName}
                      </text>
                      <text
                        x="58"
                        y="13"
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {meta.category}
                      </text>

                      {/* Line 2: Semantic Role */}
                      <text
                        x="-58"
                        y="24"
                        fill="#f8fafc"
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {meta.role.length > 25 ? meta.role.substring(0, 24) + '…' : meta.role}
                      </text>

                      {/* Line 3: Live Signal & Net Status */}
                      <text
                        x="-58"
                        y="34"
                        fill="#22c55e"
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        ● {signalStr}
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
