import React from 'react';
import { PinCoord } from './ArduinoUnoR3';

export interface Wire {
  id: string;
  from: PinCoord;
  to: PinCoord;
  color: string;
}

interface WireLayerProps {
  wires: Wire[];
  activeDraftWire?: { from: PinCoord; currentMouse: { x: number; y: number }; color: string } | null;
  selectedWireId?: string | null;
  onSelectWire?: (id: string | null) => void;
  onDeleteWire?: (id: string) => void;
}

export const WireLayer: React.FC<WireLayerProps> = ({
  wires,
  activeDraftWire,
  selectedWireId,
  onSelectWire,
  onDeleteWire,
}) => {
  const computeBezierPath = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.min(80, Math.max(30, dist * 0.25));

    // Control points curve naturally downward due to gravity
    const cp1x = p1.x + dx * 0.25;
    const cp1y = p1.y + dy * 0.25 + sag;
    const cp2x = p1.x + dx * 0.75;
    const cp2y = p1.y + dy * 0.75 + sag;

    return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  };

  return (
    <g id="wire-layer" className="select-none">
      {/* Existing Connected Wires */}
      {wires.map((wire) => {
        const path = computeBezierPath(wire.from, wire.to);
        const isSelected = selectedWireId === wire.id;

        return (
          <g
            key={wire.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWire && onSelectWire(wire.id);
            }}
            className="cursor-pointer group"
          >
            {/* Outer shadow / selection halo */}
            <path
              d={path}
              fill="none"
              stroke={isSelected ? '#0175da' : 'rgba(0,0,0,0.15)'}
              strokeWidth={isSelected ? 7 : 5}
              strokeLinecap="round"
            />

            {/* Main Wire Insulation */}
            <path
              d={path}
              fill="none"
              stroke={wire.color}
              strokeWidth={3.5}
              strokeLinecap="round"
              className="transition-all group-hover:stroke-width-5"
            />

            {/* Wire highlight core */}
            <path
              d={path}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              strokeLinecap="round"
            />

            {/* Start Pin Ferrule */}
            <circle cx={wire.from.x} cy={wire.from.y} r={3} fill="#1b1a1a" stroke={wire.color} strokeWidth={1.5} />
            {/* End Pin Ferrule */}
            <circle cx={wire.to.x} cy={wire.to.y} r={3} fill="#1b1a1a" stroke={wire.color} strokeWidth={1.5} />
          </g>
        );
      })}

      {/* Active Drafting Wire (Rubber-band while mouse is moving) */}
      {activeDraftWire && (
        <g className="pointer-events-none">
          <path
            d={computeBezierPath(activeDraftWire.from, activeDraftWire.currentMouse)}
            fill="none"
            stroke={activeDraftWire.color}
            strokeWidth={3.5}
            strokeDasharray="4 2"
            strokeLinecap="round"
          />
          <circle
            cx={activeDraftWire.from.x}
            cy={activeDraftWire.from.y}
            r={3.5}
            fill="#1b1a1a"
            stroke={activeDraftWire.color}
            strokeWidth={1.5}
          />
          <circle
            cx={activeDraftWire.currentMouse.x}
            cy={activeDraftWire.currentMouse.y}
            r={3.5}
            fill={activeDraftWire.color}
          />
        </g>
      )}
    </g>
  );
};
