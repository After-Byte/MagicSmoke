import React from 'react';
import { ComponentInstance, WireConnection } from '../circuit/types';

interface CircuitThumbnailProps {
  components: ComponentInstance[];
  wires: WireConnection[];
  className?: string;
}

export const CircuitThumbnail: React.FC<CircuitThumbnailProps> = ({
  components,
  wires,
  className = 'w-full h-full',
}) => {
  if (components.length === 0) {
    return (
      <div className={`relative bg-[#070b12] flex flex-col items-center justify-center overflow-hidden ${className}`}>
        {/* Subtle PCB Grid Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="emptyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="1" fill="#38bdf8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#emptyGrid)" />
        </svg>

        {/* Blueprint Footprint Outline */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-20 rounded border border-dashed border-[#00f0ff]/40 bg-[#00f0ff]/5 flex items-center justify-center mb-2">
            <div className="w-8 h-8 rounded border border-[#00f0ff]/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#00f0ff]/60 animate-ping" />
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#64748b]">
            Unpopulated Canvas
          </span>
          <span className="text-[9px] font-mono text-[#475569]">Ready to wire</span>
        </div>
      </div>
    );
  }

  // Calculate bounding box of all components
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const compMap = new Map<string, ComponentInstance>();
  for (const c of components) {
    compMap.set(c.id, c);
    const width = c.dimensions?.width ?? (c.type === 'ESP32_DEVKIT_V1' ? 200 : c.type === 'ARDUINO_UNO_R3' ? 220 : c.type === 'IR_SENSOR_ARRAY_8CH' ? 220 : c.type === 'TB6612FNG' ? 180 : 140);
    const height = c.dimensions?.height ?? (c.type === 'ESP32_DEVKIT_V1' ? 235 : c.type === 'ARDUINO_UNO_R3' ? 350 : c.type === 'IR_SENSOR_ARRAY_8CH' ? 210 : c.type === 'TB6612FNG' ? 295 : 100);
    if (c.position.x < minX) minX = c.position.x;
    if (c.position.y < minY) minY = c.position.y;
    if (c.position.x + width > maxX) maxX = c.position.x + width;
    if (c.position.y + height > maxY) maxY = c.position.y + height;
  }

  // Add padding around components
  const pad = 35;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = Math.max(220, (maxX - minX) + pad * 2);
  const vbH = Math.max(140, (maxY - minY) + pad * 2);

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      className={`bg-[#06090f] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Subtle PCB Dot Grid */}
        <pattern id="thumbGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="#1e293b" opacity="0.6" />
        </pattern>

        {/* ESP32 Metallic Shield Gradient */}
        <linearGradient id="thumbShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Copper Antenna Gradient */}
        <linearGradient id="thumbAntennaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#thumbGrid)" />

      {/* 1. Render Permanent Circuit Wires */}
      <g>
        {wires.map((wire) => {
          const fromComp = compMap.get(wire.fromComponentId);
          const toComp = compMap.get(wire.toComponentId);
          if (!fromComp || !toComp) return null;

          const fromPin = fromComp.pins[wire.fromPinId];
          const toPin = toComp.pins[wire.toPinId];
          if (!fromPin || !toPin) return null;

          const x1 = fromComp.position.x + fromPin.offset.x;
          const y1 = fromComp.position.y + fromPin.offset.y;
          const x2 = toComp.position.x + toPin.offset.x;
          const y2 = toComp.position.y + toPin.offset.y;

          const dx = Math.abs(x2 - x1) * 0.45 + 16;
          const cp1x = x1 > x2 ? x1 - dx : x1 + dx;
          const cp2x = x2 > x1 ? x2 - dx : x2 + dx;
          const path = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
          const strokeColor = wire.color || '#3b82f6';

          return (
            <g key={wire.id}>
              {/* Wire Shadow/Halo */}
              <path
                d={path}
                fill="none"
                stroke="#000000"
                strokeWidth="5"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              {/* Actual Wire Spline */}
              <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeOpacity="0.9"
              />
              {/* Terminal solder dots */}
              <circle cx={x1} cy={y1} r="3" fill={strokeColor} />
              <circle cx={x2} cy={y2} r="3" fill={strokeColor} />
            </g>
          );
        })}
      </g>

      {/* 2. Render Hardware Components */}
      <g>
        {components.map((comp) => {
          const width = comp.dimensions?.width ?? (comp.type === 'ESP32_DEVKIT_V1' ? 200 : comp.type === 'TB6612FNG' ? 180 : 140);
          const height = comp.dimensions?.height ?? (comp.type === 'ESP32_DEVKIT_V1' ? 235 : comp.type === 'TB6612FNG' ? 295 : 100);
          const { x, y } = comp.position;

          return (
            <g key={comp.id} transform={`translate(${x}, ${y})`}>
              {/* Component Drop Shadow */}
              <rect
                x="3"
                y="4"
                width={width}
                height={height}
                rx="6"
                fill="#000000"
                opacity="0.5"
              />

              {/* Hardware-Specific Visual Rendering */}
              {comp.type === 'ESP32_DEVKIT_V1' && (
                <g>
                  {/* Black Matte PCB Body */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="5"
                    fill="#0d1117"
                    stroke="#21262d"
                    strokeWidth="1.5"
                  />
                  {/* Copper Serpentine PCB Antenna */}
                  <rect
                    x={width / 2 - 20}
                    y="8"
                    width="40"
                    height="12"
                    rx="2"
                    fill="url(#thumbAntennaGrad)"
                  />
                  {/* Silver ESP-WROOM-32 Shield */}
                  <rect
                    x={width / 2 - 32}
                    y="28"
                    width="64"
                    height="75"
                    rx="3"
                    fill="url(#thumbShieldGrad)"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <text
                    x={width / 2}
                    y="65"
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    ESP-WROOM-32
                  </text>
                  <text
                    x={width / 2}
                    y="78"
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="6.5"
                    fontFamily="monospace"
                  >
                    Xtensa LX6 240MHz
                  </text>

                  {/* Micro-USB Port */}
                  <rect
                    x={width / 2 - 14}
                    y={height - 10}
                    width="28"
                    height="10"
                    rx="2"
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth="1"
                  />

                  {/* Silkscreen Indicators */}
                  <circle cx="22" cy={height - 20} r="2" fill="#ef4444" />
                  <circle cx="48" cy={height - 20} r="2" fill="#3b82f6" />
                </g>
              )}

              {comp.type === 'TB6612FNG' && (
                <g>
                  {/* Vibrant Red Breakout PCB */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="5"
                    fill="#7f1d1d"
                    stroke="#991b1b"
                    strokeWidth="1.5"
                  />
                  {/* SSOP Driver IC Chip */}
                  <rect
                    x={width / 2 - 18}
                    y="50"
                    width="36"
                    height="95"
                    rx="2"
                    fill="#0f172a"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={width / 2}
                    y="98"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="700"
                    transform={`rotate(-90 ${width / 2} 98)`}
                  >
                    TB6612FNG
                  </text>
                  {/* IC Leads */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <g key={i}>
                      <line
                        x1={width / 2 - 22}
                        y1={58 + i * 11}
                        x2={width / 2 - 18}
                        y2={58 + i * 11}
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={width / 2 + 18}
                        y1={58 + i * 11}
                        x2={width / 2 + 22}
                        y2={58 + i * 11}
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                      />
                    </g>
                  ))}
                  {/* PCB Sub-headers */}
                  <text x="12" y="16" fill="#fca5a5" fontSize="7" fontFamily="monospace" fontWeight="600">IN</text>
                  <text x={width - 12} y="16" textAnchor="end" fill="#fca5a5" fontSize="7" fontFamily="monospace" fontWeight="600">OUT</text>
                </g>
              )}

              {comp.type === 'BATTERY_PACK' && (
                <g>
                  {/* High-Contrast Cobalt Battery Pack */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="5"
                    fill="#0369a1"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <rect x="8" y="8" width={width - 16} height="32" rx="3" fill="#0c4a6e" />
                  <text
                    x={width / 2}
                    y="28"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    7.4V
                  </text>
                  <text
                    x={width / 2}
                    y="55"
                    textAnchor="middle"
                    fill="#bae6fd"
                    fontSize="7.5"
                    fontFamily="monospace"
                  >
                    2S LiPo 1000mAh
                  </text>
                  {/* Warning Stripe */}
                  <line x1="8" y1="85" x2={width - 8} y2="85" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                </g>
              )}

              {comp.type === 'N20_MOTOR' && (
                <g>
                  {/* Cylindrical Motor Body */}
                  <rect
                    x="0"
                    y="10"
                    width={width - 24}
                    height={height - 20}
                    rx="6"
                    fill="#334155"
                    stroke="#475569"
                    strokeWidth="1.2"
                  />
                  {/* Brass Gearbox Block */}
                  <rect
                    x={width - 24}
                    y="12"
                    width="16"
                    height={height - 24}
                    rx="2"
                    fill="#b45309"
                    stroke="#d97706"
                    strokeWidth="1"
                  />
                  {/* D-Shaft */}
                  <rect
                    x={width - 8}
                    y={height / 2 - 3}
                    width="8"
                    height="6"
                    rx="1"
                    fill="#cbd5e1"
                  />
                  <text
                    x={(width - 24) / 2}
                    y={height / 2 + 3}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    N20 DC
                  </text>
                </g>
              )}

              {comp.type === 'GROUND_BUS' && (
                <g>
                  {/* Shared Common Ground Terminal Strip */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="4"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="1.2"
                  />
                  <rect x="4" y="4" width={width - 8} height="14" rx="2" fill="#0f172a" />
                  <text
                    x={width / 2}
                    y="14"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    COMMON GND BUS
                  </text>
                </g>
              )}

              {comp.type === 'HC_SR04' && (
                <g>
                  {/* Ultrasonic Sensor Breakout */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="4"
                    fill="#1e3a8a"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                  />
                  {/* Dual Ultrasonic Transducers */}
                  <circle cx="36" cy="45" r="22" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
                  <circle cx="36" cy="45" r="14" fill="#475569" />
                  <circle cx={width - 36} cy="45" r="22" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
                  <circle cx={width - 36} cy="45" r="14" fill="#475569" />
                  <text x={width / 2} y="22" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="monospace" fontWeight="700">HC-SR04</text>
                </g>
              )}

              {comp.type === 'ARDUINO_UNO_R3' && (
                <g>
                  {/* Arduino Teal PCB Body */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="6"
                    fill="#005c5f"
                    stroke="#00878f"
                    strokeWidth="1.5"
                  />
                  {/* USB Port & Barrel Jack */}
                  <rect x="8" y="10" width="28" height="30" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
                  <rect x="8" y={height - 40} width="32" height="28" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                  {/* ATmega328P DIP IC */}
                  <rect x={width / 2 - 12} y="60" width="30" height="110" rx="3" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                  <text
                    x={width / 2 + 3}
                    y="115"
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="700"
                    transform={`rotate(-90 ${width / 2 + 3} 115)`}
                  >
                    ATMEGA328P
                  </text>
                  <text x={width / 2} y={height - 25} textAnchor="middle" fill="#f8fafc" fontSize="9" fontFamily="sans-serif" fontWeight="800">
                    ARDUINO
                  </text>
                  <text x={width / 2} y={height - 12} textAnchor="middle" fill="#67e8f9" fontSize="7" fontFamily="monospace" fontWeight="700">
                    UNO R3
                  </text>
                </g>
              )}

              {comp.type === 'IR_SENSOR_ARRAY_8CH' && (
                <g>
                  {/* 8-Channel IR Sensor Array Bar */}
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  {/* 8 Sensor Cells */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <g key={i}>
                      <circle cx="30" cy={20 + i * 19} r="3.5" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.6" />
                      <circle cx="44" cy={20 + i * 19} r="3.5" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.6" />
                    </g>
                  ))}
                  <text x={width / 2 + 30} y="40" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="700">
                    8-CH IR
                  </text>
                  <text x={width / 2 + 30} y="55" textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
                    QTR-8RC
                  </text>
                </g>
              )}

              {/* Solder Header Pins for this component */}
              {Object.values(comp.pins).map((pin) => (
                <g key={pin.id} transform={`translate(${pin.offset.x}, ${pin.offset.y})`}>
                  <circle r="3" fill="#0b0f17" stroke="#64748b" strokeWidth="1" />
                  <circle r="1" fill="#cbd5e1" />
                </g>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
