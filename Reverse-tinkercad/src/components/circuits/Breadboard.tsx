import React from 'react';
import { PinCoord } from './ArduinoUnoR3';

interface BreadboardProps {
  x: number;
  y: number;
  onPinClick?: (pin: PinCoord, e: React.MouseEvent) => void;
  hoveredPinId?: string | null;
  onPinHover?: (pin: PinCoord | null) => void;
}

export const Breadboard: React.FC<BreadboardProps> = ({
  x,
  y,
  onPinClick,
  hoveredPinId,
  onPinHover,
}) => {
  // Generate breadboard pins
  const rows = 30; // 1 to 30
  const colsTop = ['a', 'b', 'c', 'd', 'e'];
  const colsBottom = ['f', 'g', 'h', 'i', 'j'];

  return (
    <g transform={`translate(${x}, ${y})`} className="cursor-move select-none">
      {/* Breadboard Body (White / Off-White ABS Plastic) */}
      <rect
        x="0"
        y="0"
        width="260"
        height="180"
        rx="6"
        fill="#fafafa"
        stroke="#d0d5db"
        strokeWidth="1.5"
        className="filter drop-shadow-md"
      />

      {/* Subtle Texture / Recessed edge lines */}
      <rect x="5" y="5" width="250" height="170" rx="4" fill="none" stroke="#e2e4e7" strokeWidth="1" />

      {/* Center Divider Trough */}
      <rect x="8" y="86" width="244" height="8" fill="#e2e4e7" rx="1" />

      {/* Top Power Rails Lines (+ Red line, - Blue line) */}
      <line x1="16" y1="16" x2="244" y2="16" stroke="#ef4444" strokeWidth="1.2" />
      <text x="10" y="18" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>
      <text x="248" y="18" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>

      <line x1="16" y1="28" x2="244" y2="28" stroke="#0284c7" strokeWidth="1.2" />
      <text x="10" y="30" fill="#0284c7" fontSize="8" fontWeight="bold">-</text>
      <text x="248" y="30" fill="#0284c7" fontSize="8" fontWeight="bold">-</text>

      {/* Bottom Power Rails Lines (+ Red line, - Blue line) */}
      <line x1="16" y1="152" x2="244" y2="152" stroke="#0284c7" strokeWidth="1.2" />
      <text x="10" y="154" fill="#0284c7" fontSize="8" fontWeight="bold">-</text>
      <text x="248" y="154" fill="#0284c7" fontSize="8" fontWeight="bold">-</text>

      <line x1="16" y1="164" x2="244" y2="164" stroke="#ef4444" strokeWidth="1.2" />
      <text x="10" y="166" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>
      <text x="248" y="166" fill="#ef4444" fontSize="8" fontWeight="bold">+</text>

      {/* Column Letters on side */}
      {colsTop.map((col, idx) => (
        <text key={col} x="12" y={42 + idx * 8} fill="#94a3b8" fontSize="5" fontWeight="bold">
          {col}
        </text>
      ))}
      {colsBottom.map((col, idx) => (
        <text key={col} x="12" y={102 + idx * 8} fill="#94a3b8" fontSize="5" fontWeight="bold">
          {col}
        </text>
      ))}

      {/* Row Numbers: 1, 5, 10, 15, 20, 25, 30 */}
      {[1, 5, 10, 15, 20, 25, 30].map((num) => {
        const posX = 20 + (num - 1) * 7.5;
        return (
          <React.Fragment key={num}>
            <text x={posX} y="36" fill="#94a3b8" fontSize="5" fontWeight="bold" textAnchor="middle">
              {num}
            </text>
            <text x={posX} y="146" fill="#94a3b8" fontSize="5" fontWeight="bold" textAnchor="middle">
              {num}
            </text>
          </React.Fragment>
        );
      })}

      {/* Power Rails Pin Holes */}
      {Array.from({ length: 29 }).map((_, i) => {
        const pinX = 22 + i * 7.5;
        const topPlusId = `bb-tp-${i}`;
        const topMinusId = `bb-tm-${i}`;
        const btmMinusId = `bb-bm-${i}`;
        const btmPlusId = `bb-bp-${i}`;

        return (
          <React.Fragment key={i}>
            {/* Top + */}
            <circle
              cx={pinX}
              cy="16"
              r={hoveredPinId === topPlusId ? "2.5" : "1.5"}
              fill={hoveredPinId === topPlusId ? "#ef4444" : "#1b1a1a"}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onPinClick && onPinClick({ id: topPlusId, name: 'Power (+)', x: x + pinX, y: y + 16, type: 'power' }, e);
              }}
              onMouseEnter={() => onPinHover && onPinHover({ id: topPlusId, name: 'Power (+)', x: x + pinX, y: y + 16, type: 'power' })}
              onMouseLeave={() => onPinHover && onPinHover(null)}
            />
            {/* Top - */}
            <circle
              cx={pinX}
              cy="28"
              r={hoveredPinId === topMinusId ? "2.5" : "1.5"}
              fill={hoveredPinId === topMinusId ? "#0284c7" : "#1b1a1a"}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onPinClick && onPinClick({ id: topMinusId, name: 'Ground (-)', x: x + pinX, y: y + 28, type: 'ground' }, e);
              }}
              onMouseEnter={() => onPinHover && onPinHover({ id: topMinusId, name: 'Ground (-)', x: x + pinX, y: y + 28, type: 'ground' })}
              onMouseLeave={() => onPinHover && onPinHover(null)}
            />
            {/* Bottom - */}
            <circle
              cx={pinX}
              cy="152"
              r={hoveredPinId === btmMinusId ? "2.5" : "1.5"}
              fill={hoveredPinId === btmMinusId ? "#0284c7" : "#1b1a1a"}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onPinClick && onPinClick({ id: btmMinusId, name: 'Ground (-)', x: x + pinX, y: y + 152, type: 'ground' }, e);
              }}
              onMouseEnter={() => onPinHover && onPinHover({ id: btmMinusId, name: 'Ground (-)', x: x + pinX, y: y + 152, type: 'ground' })}
              onMouseLeave={() => onPinHover && onPinHover(null)}
            />
            {/* Bottom + */}
            <circle
              cx={pinX}
              cy="164"
              r={hoveredPinId === btmPlusId ? "2.5" : "1.5"}
              fill={hoveredPinId === btmPlusId ? "#ef4444" : "#1b1a1a"}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onPinClick && onPinClick({ id: btmPlusId, name: 'Power (+)', x: x + pinX, y: y + 164, type: 'power' }, e);
              }}
              onMouseEnter={() => onPinHover && onPinHover({ id: btmPlusId, name: 'Power (+)', x: x + pinX, y: y + 164, type: 'power' })}
              onMouseLeave={() => onPinHover && onPinHover(null)}
            />
          </React.Fragment>
        );
      })}

      {/* Main Terminal Tie-Point Grid (Rows 1 to 30, Cols a-e and f-j) */}
      {Array.from({ length: rows }).map((_, rIdx) => {
        const rowNum = rIdx + 1;
        const posX = 20 + rIdx * 7.5;

        return (
          <g key={rowNum}>
            {/* Top Half: a, b, c, d, e */}
            {colsTop.map((col, cIdx) => {
              const posY = 40 + cIdx * 8;
              const pinId = `bb-t-${rowNum}-${col}`;
              const isHovered = hoveredPinId === pinId;

              return (
                <rect
                  key={col}
                  x={posX - 1.5}
                  y={posY - 1.5}
                  width="3"
                  height="3"
                  rx="0.5"
                  fill={isHovered ? '#0175da' : '#1b1a1a'}
                  stroke={isHovered ? '#60a5fa' : '#64748b'}
                  strokeWidth="0.5"
                  className="cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinClick && onPinClick({ id: pinId, name: `${rowNum}${col}`, x: x + posX, y: y + posY, type: 'other' }, e);
                  }}
                  onMouseEnter={() => onPinHover && onPinHover({ id: pinId, name: `${rowNum}${col}`, x: x + posX, y: y + posY, type: 'other' })}
                  onMouseLeave={() => onPinHover && onPinHover(null)}
                />
              );
            })}

            {/* Bottom Half: f, g, h, i, j */}
            {colsBottom.map((col, cIdx) => {
              const posY = 100 + cIdx * 8;
              const pinId = `bb-b-${rowNum}-${col}`;
              const isHovered = hoveredPinId === pinId;

              return (
                <rect
                  key={col}
                  x={posX - 1.5}
                  y={posY - 1.5}
                  width="3"
                  height="3"
                  rx="0.5"
                  fill={isHovered ? '#0175da' : '#1b1a1a'}
                  stroke={isHovered ? '#60a5fa' : '#64748b'}
                  strokeWidth="0.5"
                  className="cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinClick && onPinClick({ id: pinId, name: `${rowNum}${col}`, x: x + posX, y: y + posY, type: 'other' }, e);
                  }}
                  onMouseEnter={() => onPinHover && onPinHover({ id: pinId, name: `${rowNum}${col}`, x: x + posX, y: y + posY, type: 'other' })}
                  onMouseLeave={() => onPinHover && onPinHover(null)}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};
