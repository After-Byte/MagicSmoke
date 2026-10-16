import React, { useState, useRef, useEffect } from 'react';
import { CircuitEngine } from '../circuit/CircuitEngine';
import { ComponentInstance, WireConnection, PinDefinition } from '../circuit/types';
import { X, Plus, Trash2, Cpu, Zap, Battery, Disc } from 'lucide-react';

interface CircuitCanvasProps {
  circuit: CircuitEngine;
  onWiresChange: (wires: WireConnection[]) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ circuit, onWiresChange }) => {
  const [components, setComponents] = useState<ComponentInstance[]>([]);
  const [wires, setWires] = useState<WireConnection[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Wire dragging state
  const [draggingFrom, setDraggingFrom] = useState<{ compId: string; pinId: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setComponents(circuit.getAllComponents());
    setWires(circuit.getAllWires());
  }, [circuit]);

  // Compute absolute coordinate of a pin
  const getPinPos = (compId: string, pinId: string): { x: number; y: number } => {
    const comp = circuit.getComponent(compId);
    if (!comp) return { x: 0, y: 0 };
    const pin = comp.pins[pinId];
    if (!pin) return { x: comp.position.x, y: comp.position.y };
    return {
      x: comp.position.x + pin.offset.x,
      y: comp.position.y + pin.offset.y,
    };
  };

  const handlePinMouseDown = (compId: string, pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingFrom({ compId, pinId });
  };

  const handlePinMouseUp = (targetCompId: string, targetPinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draggingFrom) return;

    if (draggingFrom.compId !== targetCompId || draggingFrom.pinId !== targetPinId) {
      // Check if wire already exists
      const exists = wires.some(
        (w) =>
          (w.fromComponentId === draggingFrom.compId && w.fromPinId === draggingFrom.pinId && w.toComponentId === targetCompId && w.toPinId === targetPinId) ||
          (w.fromComponentId === targetCompId && w.fromPinId === targetPinId && w.toComponentId === draggingFrom.compId && w.toPinId === draggingFrom.pinId)
      );

      if (!exists) {
        const newWire: WireConnection = {
          id: `w_${Date.now()}`,
          fromComponentId: draggingFrom.compId,
          fromPinId: draggingFrom.pinId,
          toComponentId: targetCompId,
          toPinId: targetPinId,
          color: '#06b6d4',
        };
        circuit.addWire(newWire);
        const updated = circuit.getAllWires();
        setWires([...updated]);
        onWiresChange(updated);
      }
    }
    setDraggingFrom(null);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingFrom || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    setDraggingFrom(null);
  };

  const deleteWire = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    circuit.removeWire(id);
    const updated = circuit.getAllWires();
    setWires([...updated]);
    setSelectedWireId(null);
    onWiresChange(updated);
  };

  return (
    <div className="relative w-full h-full bg-[#11141a] overflow-hidden select-none border border-[#1e2430]">
      {/* Top Banner Status */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-[#181d26]/90 px-3 py-1.5 rounded border border-[#2a3242] text-xs font-mono">
        <span className="text-[#94a3b8]">Wires:</span>
        <span className="text-[#38bdf8] font-bold">{wires.length}</span>
        {selectedWireId && (
          <button
            onClick={(e) => deleteWire(selectedWireId, e)}
            className="ml-3 flex items-center gap-1 text-red-400 hover:text-red-300 bg-red-950/40 px-2 py-0.5 rounded border border-red-800"
          >
            <Trash2 size={12} /> Delete Wire
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a202c" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Existing Wires (Bezier Curves) */}
        {wires.map((wire) => {
          const from = getPinPos(wire.fromComponentId, wire.fromPinId);
          const to = getPinPos(wire.toComponentId, wire.toPinId);
          const isSelected = selectedWireId === wire.id;

          const dx = Math.abs(to.x - from.x) * 0.5;
          const path = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;

          return (
            <g key={wire.id} onClick={() => setSelectedWireId(wire.id)}>
              <path
                d={path}
                fill="none"
                stroke={isSelected ? '#f43f5e' : wire.color || '#00f0ff'}
                strokeWidth={isSelected ? '3.5' : '2'}
                strokeLinecap="round"
                className="transition-all hover:stroke-[#f43f5e] hover:stroke-[3.5] cursor-pointer"
              />
            </g>
          );
        })}

        {/* Live Dragging Wire */}
        {draggingFrom && (
          <path
            d={`M ${getPinPos(draggingFrom.compId, draggingFrom.pinId).x} ${
              getPinPos(draggingFrom.compId, draggingFrom.pinId).y
            } L ${mousePos.x} ${mousePos.y}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {/* Render Components as DOM overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {components.map((comp) => (
          <div
            key={comp.id}
            style={{ left: comp.position.x, top: comp.position.y }}
            className="absolute pointer-events-auto bg-[#161b24] border border-[#2b3547] rounded shadow-lg p-2 font-mono text-xs select-none"
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 border-b border-[#263143] pb-1.5 mb-2 font-bold text-[#e2e8f0]">
              {comp.type === 'ESP32_DEVKIT_V1' && <Cpu size={14} className="text-[#10b981]" />}
              {comp.type === 'TB6612FNG' && <Zap size={14} className="text-[#ef4444]" />}
              {comp.type === 'BATTERY_PACK' && <Battery size={14} className="text-[#f59e0b]" />}
              {comp.type === 'N20_MOTOR' && <Disc size={14} className="text-[#38bdf8]" />}
              <span>{comp.name}</span>
            </div>

            {/* Pins */}
            <div className="relative" style={{ width: comp.type === 'TB6612FNG' ? 140 : comp.type === 'ESP32_DEVKIT_V1' ? 150 : 100, minHeight: 90 }}>
              {Object.values(comp.pins).map((pin: PinDefinition) => {
                const isLeft = pin.offset.x === 0;
                return (
                  <div
                    key={pin.id}
                    style={{ left: pin.offset.x - (isLeft ? 6 : 6), top: pin.offset.y - 6 }}
                    className="absolute group z-20 flex items-center"
                  >
                    <div
                      onMouseDown={(e) => handlePinMouseDown(comp.id, pin.id, e)}
                      onMouseUp={(e) => handlePinMouseUp(comp.id, pin.id, e)}
                      className="w-3.5 h-3.5 rounded-full bg-[#1e293b] border-2 border-[#00f0ff] hover:bg-[#00f0ff] hover:scale-125 transition-all cursor-crosshair shadow-sm"
                      title={`${pin.name}: ${pin.description}`}
                    />
                    <span
                      className={`absolute pointer-events-none text-[10px] whitespace-nowrap font-semibold ${
                        isLeft ? 'left-4 text-[#94a3b8]' : 'right-4 text-[#94a3b8]'
                      }`}
                    >
                      {pin.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
