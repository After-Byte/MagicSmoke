import React from 'react';

export interface PinCoord {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'digital' | 'analog' | 'power' | 'ground' | 'other';
}

interface ArduinoUnoR3Props {
  x: number;
  y: number;
  isSimulating: boolean;
  ledBuiltinState: boolean; // State of pin 13 LED (L)
  onPinClick?: (pin: PinCoord, e: React.MouseEvent) => void;
  hoveredPinId?: string | null;
  onPinHover?: (pin: PinCoord | null) => void;
}

export const ARDUINO_PINS: PinCoord[] = [
  // Top Digital Pins Header (Right to Left on board: 0 to 13, GND, AREF)
  { id: 'pin-aref', name: 'AREF', x: 140, y: 15, type: 'other' },
  { id: 'pin-gnd1', name: 'GND', x: 150, y: 15, type: 'ground' },
  { id: 'pin-13', name: '13 (LED)', x: 160, y: 15, type: 'digital' },
  { id: 'pin-12', name: '12', x: 170, y: 15, type: 'digital' },
  { id: 'pin-11', name: '~11', x: 180, y: 15, type: 'digital' },
  { id: 'pin-10', name: '~10', x: 190, y: 15, type: 'digital' },
  { id: 'pin-9', name: '~9', x: 200, y: 15, type: 'digital' },
  { id: 'pin-8', name: '8', x: 210, y: 15, type: 'digital' },
  { id: 'pin-7', name: '7', x: 226, y: 15, type: 'digital' },
  { id: 'pin-6', name: '~6', x: 236, y: 15, type: 'digital' },
  { id: 'pin-5', name: '~5', x: 246, y: 15, type: 'digital' },
  { id: 'pin-4', name: '4', x: 256, y: 15, type: 'digital' },
  { id: 'pin-3', name: '~3', x: 266, y: 15, type: 'digital' },
  { id: 'pin-2', name: '2', x: 276, y: 15, type: 'digital' },
  { id: 'pin-1', name: '1 (TX)', x: 286, y: 15, type: 'digital' },
  { id: 'pin-0', name: '0 (RX)', x: 296, y: 15, type: 'digital' },

  // Bottom Power Header (Left side)
  { id: 'pin-ioref', name: 'IOREF', x: 180, y: 175, type: 'power' },
  { id: 'pin-reset', name: 'RESET', x: 190, y: 175, type: 'other' },
  { id: 'pin-3v3', name: '3.3V', x: 200, y: 175, type: 'power' },
  { id: 'pin-5v', name: '5V', x: 210, y: 175, type: 'power' },
  { id: 'pin-gnd2', name: 'GND', x: 220, y: 175, type: 'ground' },
  { id: 'pin-gnd3', name: 'GND', x: 230, y: 175, type: 'ground' },
  { id: 'pin-vin', name: 'VIN', x: 240, y: 175, type: 'power' },

  // Bottom Analog In Header (Right side)
  { id: 'pin-a0', name: 'A0', x: 256, y: 175, type: 'analog' },
  { id: 'pin-a1', name: 'A1', x: 266, y: 175, type: 'analog' },
  { id: 'pin-a2', name: 'A2', x: 276, y: 175, type: 'analog' },
  { id: 'pin-a3', name: 'A3', x: 286, y: 175, type: 'analog' },
  { id: 'pin-a4', name: 'A4', x: 296, y: 175, type: 'analog' },
  { id: 'pin-a5', name: 'A5', x: 306, y: 175, type: 'analog' },
];

export const ArduinoUnoR3: React.FC<ArduinoUnoR3Props> = ({
  x,
  y,
  isSimulating,
  ledBuiltinState,
  onPinClick,
  hoveredPinId,
  onPinHover,
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="cursor-move select-none">
      {/* 1. Black USB Cable plugged into left USB Port (matches Photo 1!) */}
      <g id="usb-cable" className="pointer-events-none">
        {/* Trailing black flexible cord extending far to the left */}
        <path
          d="M -110 52 L -35 52"
          stroke="#1b1a1a"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* Ribbed strain relief boot */}
        <rect x="-35" y="45" width="8" height="14" rx="2" fill="#282727" />
        <line x1="-32" y1="45" x2="-32" y2="59" stroke="#1b1a1a" strokeWidth="1" />
        <line x1="-29" y1="45" x2="-29" y2="59" stroke="#1b1a1a" strokeWidth="1" />

        {/* Molded USB Type-B plug body */}
        <rect x="-27" y="42" width="28" height="20" rx="3" fill="#1b1a1a" />
        {/* USB logo symbol embossed on connector */}
        <path d="M -16 48 L -16 56 M -18 51 L -14 51" stroke="#64748b" strokeWidth="1.2" />

        {/* Silver metal shield plugging into port */}
        <rect x="0" y="44" width="16" height="16" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
      </g>

      {/* 2. Silver USB Type-B Jack on board */}
      <rect x="5" y="42" width="30" height="20" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
      <rect x="10" y="46" width="20" height="12" rx="1" fill="#475569" />

      {/* 3. Black DC Power Barrel Jack (Bottom left) */}
      <rect x="-4" y="130" width="35" height="26" rx="2" fill="#1b1a1a" stroke="#282727" strokeWidth="1" />
      <circle cx="2" cy="143" r="6" fill="#334155" />
      <circle cx="2" cy="143" r="2.5" fill="#e2e8f0" />

      {/* 4. Main PCB (Arduino Teal / Blue Board) */}
      <rect
        x="10"
        y="5"
        width="315"
        height="180"
        rx="8"
        fill="#007fa3"
        stroke="#005d78"
        strokeWidth="2"
        className="filter drop-shadow-md"
      />

      {/* Silkscreen & PCB traces details */}
      <rect x="14" y="9" width="307" height="172" rx="6" fill="none" stroke="#0097be" strokeWidth="1" opacity="0.6" />

      {/* Mounting holes with copper annular rings */}
      <circle cx="28" cy="18" r="6" fill="#cbd5e1" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="28" cy="18" r="3.5" fill="#f2f3f5" />
      <circle cx="160" cy="172" r="6" fill="#cbd5e1" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="160" cy="172" r="3.5" fill="#f2f3f5" />
      <circle cx="310" cy="22" r="6" fill="#cbd5e1" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="310" cy="22" r="3.5" fill="#f2f3f5" />
      <circle cx="310" cy="165" r="6" fill="#cbd5e1" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="310" cy="165" r="3.5" fill="#f2f3f5" />

      {/* Reset Push Button (Red cap with silver bezel) */}
      <rect x="22" y="70" width="16" height="16" rx="2" fill="#cbd5e1" stroke="#94a3b8" />
      <circle cx="30" cy="78" r="5" fill="#dc2626" />
      <text x="30" y="94" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">RESET</text>

      {/* Crystal Oscillator 16MHz */}
      <rect x="62" y="75" width="12" height="22" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <text x="68" y="88" fill="#475569" fontSize="5" fontWeight="bold" textAnchor="middle">16.0</text>

      {/* Main Microcontroller ATmega328P DIP-28 Chip */}
      <g id="atmega328p">
        {/* Chip socket / DIP IC body */}
        <rect x="145" y="115" width="125" height="32" rx="2" fill="#1b1a1a" stroke="#334155" strokeWidth="1" />
        {/* Notch on left */}
        <circle cx="145" cy="131" r="3.5" fill="#007fa3" />
        
        {/* Microchip text */}
        <text x="208" y="130" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          ATMEGA328P-PU
        </text>
        <text x="208" y="140" fill="#64748b" fontSize="6" textAnchor="middle" fontFamily="monospace">
          2610 U-TH
        </text>

        {/* DIP IC silver pins (14 pins top, 14 pins bottom) */}
        {Array.from({ length: 14 }).map((_, i) => (
          <React.Fragment key={i}>
            <rect x={152 + i * 8} y={111} width="4" height="4" fill="#cbd5e1" />
            <rect x={152 + i * 8} y={147} width="4" height="4" fill="#cbd5e1" />
          </React.Fragment>
        ))}
      </g>

      {/* Arduino Branding Silkscreen (Centered) */}
      <g transform="translate(145, 55)">
        {/* Infinity logo */}
        <path
          d="M 20 15 C 14 8, 4 8, 4 15 C 4 22, 14 22, 20 15 C 26 8, 36 8, 36 15 C 36 22, 26 22, 20 15 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
        />
        <text x="11" y="17" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">-</text>
        <text x="29" y="18" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">+</text>
        
        {/* ARDUINO Text */}
        <text x="45" y="18" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.05em">
          ARDUINO
        </text>
        
        {/* UNO Text */}
        <text x="115" y="19" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="sans-serif">
          UNO
        </text>
      </g>

      {/* Header Silkscreen Labels */}
      {/* Top Header Label */}
      <text x="220" y="27" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        DIGITAL (PWM ~)
      </text>

      {/* Bottom Header Labels */}
      <text x="210" y="165" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        POWER
      </text>
      <text x="280" y="165" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        ANALOG IN
      </text>

      {/* LEDs Group */}
      {/* 1. ON Power LED */}
      <rect x="75" y="130" width="8" height="6" rx="1" fill="#1b1a1a" />
      <circle
        cx="79"
        cy="133"
        r="2.5"
        fill={isSimulating ? '#22c55e' : '#14532d'}
        className={isSimulating ? 'led-active' : ''}
        filter={isSimulating ? 'drop-shadow(0 0 4px #22c55e)' : undefined}
      />
      <text x="79" y="143" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle">ON</text>

      {/* 2. Built-in 'L' LED (Pin 13 LED) - Blinks with sketch! */}
      <rect x="95" y="70" width="8" height="6" rx="1" fill="#1b1a1a" />
      <circle
        cx="99"
        cy="73"
        r="2.5"
        fill={isSimulating && ledBuiltinState ? '#eab308' : '#713f12'}
        filter={isSimulating && ledBuiltinState ? 'drop-shadow(0 0 5px #facc15)' : undefined}
      />
      <text x="99" y="83" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">L</text>

      {/* 3. TX / RX LEDs */}
      <rect x="95" y="90" width="8" height="5" rx="1" fill="#1b1a1a" />
      <circle cx="99" cy="92.5" r="1.5" fill={isSimulating ? '#ca8a04' : '#713f12'} />
      <text x="89" y="94" fill="#ffffff" fontSize="5" fontWeight="bold">TX</text>
      
      <rect x="95" y="100" width="8" height="5" rx="1" fill="#1b1a1a" />
      <circle cx="99" cy="102.5" r="1.5" fill={isSimulating ? '#ca8a04' : '#713f12'} />
      <text x="89" y="104" fill="#ffffff" fontSize="5" fontWeight="bold">RX</text>

      {/* Female Header Strips & Interactive Pins */}
      {/* Top Header Black Housing */}
      <rect x="135" y="7" width="170" height="15" rx="2" fill="#1b1a1a" stroke="#334155" strokeWidth="0.8" />
      
      {/* Bottom Left Power Header Housing */}
      <rect x="175" y="167" width="70" height="15" rx="2" fill="#1b1a1a" stroke="#334155" strokeWidth="0.8" />
      
      {/* Bottom Right Analog In Header Housing */}
      <rect x="250" y="167" width="65" height="15" rx="2" fill="#1b1a1a" stroke="#334155" strokeWidth="0.8" />

      {/* Interactive Pin Holes */}
      {ARDUINO_PINS.map((pin) => {
        const isHovered = hoveredPinId === pin.id;

        return (
          <g
            key={pin.id}
            onClick={(e) => {
              e.stopPropagation();
              onPinClick && onPinClick(pin, e);
            }}
            onMouseEnter={() => onPinHover && onPinHover(pin)}
            onMouseLeave={() => onPinHover && onPinHover(null)}
            className="cursor-pointer group"
          >
            {/* Square pin receptacle */}
            <rect
              x={pin.x - 3}
              y={pin.y - 3}
              width="6"
              height="6"
              fill={isHovered ? '#0175da' : '#334155'}
              stroke={isHovered ? '#60a5fa' : '#0f172a'}
              strokeWidth="0.8"
              rx="1"
            />
            {/* Inner hole */}
            <rect
              x={pin.x - 1.5}
              y={pin.y - 1.5}
              width="3"
              height="3"
              fill={isHovered ? '#ffffff' : '#000000'}
              rx="0.5"
            />

            {/* Hover Tooltip / Pin Name */}
            {isHovered && (
              <g transform={`translate(${pin.x}, ${pin.y < 50 ? pin.y - 12 : pin.y + 16})`}>
                <rect x="-18" y="-9" width="36" height="14" rx="3" fill="#1e293b" />
                <text x="0" y="0" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">
                  {pin.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
