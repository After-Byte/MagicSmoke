import React, { useState, useRef, useCallback } from 'react';
import { ArduinoUnoR3, PinCoord, ARDUINO_PINS } from './ArduinoUnoR3';
import { Breadboard } from './Breadboard';
import { WireLayer, Wire } from './WireLayer';
import { Maximize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface CircuitCanvasProps {
  isSimulating: boolean;
  ledBuiltinState: boolean;
  wireColor: string;
  wireType: 'normal' | 'hookup' | 'alligator';
  wires: Wire[];
  onWiresChange: (wires: Wire[]) => void;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  isSimulating,
  ledBuiltinState,
  wireColor,
  wires,
  onWiresChange,
  selectedWireId,
  onSelectWire,
}) => {
  // Positions of components (matching Photo 1 arrangement!)
  const [arduinoPos, setArduinoPos] = useState({ x: 65, y: 140 });
  const [breadboardPos, setBreadboardPos] = useState({ x: 445, y: 160 });

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging components
  const [draggingComp, setDraggingComp] = useState<'arduino' | 'breadboard' | null>(null);
  const compDragOffsetRef = useRef({ x: 0, y: 0 });

  // Wire Connection Dragging
  const [draftWire, setDraftWire] = useState<{
    from: PinCoord;
    currentMouse: { x: number; y: number };
    color: string;
  } | null>(null);

  // Pin hover
  const [hoveredPin, setHoveredPin] = useState<PinCoord | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Convert mouse screen coordinates to SVG world coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      return {
        x: (rawX - pan.x) / zoom,
        y: (rawY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Handle Pin Clicks to start or complete wires
  const handlePinClick = (pin: PinCoord, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!draftWire) {
      // Start drafting wire
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDraftWire({
        from: pin,
        currentMouse: worldPos,
        color: wireColor,
      });
    } else {
      // Complete wire
      if (draftWire.from.id !== pin.id) {
        const newWire: Wire = {
          id: `wire-${Date.now()}`,
          from: draftWire.from,
          to: pin,
          color: draftWire.color,
        };
        onWiresChange([...wires, newWire]);
      }
      setDraftWire(null);
    }
  };

  // Mouse Move over Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    // If drafting wire, update endpoint
    if (draftWire) {
      setDraftWire((prev) => (prev ? { ...prev, currentMouse: worldPos } : null));
    }

    // If dragging component
    if (draggingComp === 'arduino') {
      setArduinoPos({
        x: worldPos.x - compDragOffsetRef.current.x,
        y: worldPos.y - compDragOffsetRef.current.y,
      });
    } else if (draggingComp === 'breadboard') {
      setBreadboardPos({
        x: worldPos.x - compDragOffsetRef.current.x,
        y: worldPos.y - compDragOffsetRef.current.y,
      });
    } else if (isPanning) {
      // Panning canvas
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingComp(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicked empty space, cancel wire or deselect
    if (draftWire) {
      setDraftWire(null);
      return;
    }
    onSelectWire(null);

    // Start Panning
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleZoomFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      className="relative grow h-full bg-[#f2f3f5] overflow-hidden select-none cursor-crosshair"
    >
      {/* Zoom to fit button matching Photo 1 top-left floating button `[ ]` */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleZoomFit}
          className="w-9 h-9 rounded-full bg-white border border-[#d0d5db] shadow-xs flex items-center justify-center text-[#414651] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer"
          title="Zoom to fit (F)"
        >
          {/* Brackets / zoom fit icon matching Photo 1 */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8V4h4" />
            <path d="M20 8V4h-4" />
            <path d="M4 16v4h4" />
            <path d="M20 16v4h-4" />
          </svg>
        </button>

        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="w-9 h-9 rounded-full bg-white border border-[#d0d5db] shadow-xs flex items-center justify-center text-[#414651] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>

        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="w-9 h-9 rounded-full bg-white border border-[#d0d5db] shadow-xs flex items-center justify-center text-[#414651] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>
      </div>

      {/* SVG Canvas for Components & Wires */}
      <svg
        className="w-full h-full pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Subtle Grid dots */}
          <pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="#e2e4e7" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#canvas-grid)" />

        {/* 1. Arduino Uno R3 Board */}
        <g
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            const worldPos = screenToWorld(e.clientX, e.clientY);
            setDraggingComp('arduino');
            compDragOffsetRef.current = {
              x: worldPos.x - arduinoPos.x,
              y: worldPos.y - arduinoPos.y,
            };
          }}
        >
          <ArduinoUnoR3
            x={arduinoPos.x}
            y={arduinoPos.y}
            isSimulating={isSimulating}
            ledBuiltinState={ledBuiltinState}
            onPinClick={handlePinClick}
            hoveredPinId={hoveredPin?.id}
            onPinHover={setHoveredPin}
          />
        </g>

        {/* 2. Half-Size Breadboard */}
        <g
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            const worldPos = screenToWorld(e.clientX, e.clientY);
            setDraggingComp('breadboard');
            compDragOffsetRef.current = {
              x: worldPos.x - breadboardPos.x,
              y: worldPos.y - breadboardPos.y,
            };
          }}
        >
          <Breadboard
            x={breadboardPos.x}
            y={breadboardPos.y}
            onPinClick={handlePinClick}
            hoveredPinId={hoveredPin?.id}
            onPinHover={setHoveredPin}
          />
        </g>

        {/* 3. Wires Layer */}
        <WireLayer
          wires={wires}
          activeDraftWire={draftWire}
          selectedWireId={selectedWireId}
          onSelectWire={onSelectWire}
        />
      </svg>
    </div>
  );
};
