import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircuitEngine } from './CircuitEngine';
import { ComponentInstance, WireConnection, PinDefinition, PinType } from './types';
import { Trash2, Cpu, Zap, Battery, Disc, ZoomIn, ZoomOut, Maximize2, Move, AlertCircle } from 'lucide-react';

interface CircuitCanvasProps {
  circuit: CircuitEngine;
  onWiresChange: (wires: WireConnection[]) => void;
  onComponentMove?: (id: string, x: number, y: number) => void;
}

interface DragConnectingState {
  fromCompId: string;
  fromPinId: string;
  currentWorldPos: { x: number; y: number };
  target: {
    compId: string;
    pinId: string;
    isValid: boolean;
    reason?: string;
  } | null;
}

function getWireColor(pin?: PinDefinition): string {
  if (!pin) return '#00f0ff';
  if (pin.id === 'GND' || pin.id === 'NEG' || pin.type === PinType.GROUND) return '#64748b';
  if (pin.id === '3V3' || pin.id === 'VCC' || pin.type === PinType.POWER_VCC) return '#06b6d4';
  if (pin.id === 'VM' || pin.id === 'POS' || pin.type === PinType.POWER_VM) return '#f59e0b';
  if (pin.id === 'STBY') return '#10b981';
  if (pin.type === PinType.PWM_OUTPUT || pin.id === 'PWMA' || pin.id === 'PWMB') return '#a855f7';
  if (pin.id === 'AO1' || pin.id === 'BO1' || pin.id === 'M_POS') return '#ef4444';
  if (pin.id === 'AO2' || pin.id === 'BO2' || pin.id === 'M_NEG') return '#334155';
  return '#3b82f6';
}

function computeWireBezier(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = Math.max(35, Math.abs(to.x - from.x) * 0.55);
  const cp1x = from.x + (to.x < from.x ? -dx * 0.8 : dx);
  const cp2x = to.x - (to.x < from.x ? -dx * 0.8 : dx);
  return `M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ circuit, onWiresChange, onComponentMove }) => {
  const [components, setComponents] = useState<ComponentInstance[]>([]);
  const [wires, setWires] = useState<WireConnection[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Pan & Zoom state
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Pin Connection Dragging State
  const [dragConnecting, setDragConnecting] = useState<DragConnectingState | null>(null);
  const dragConnectingRef = useRef<DragConnectingState | null>(null);
  dragConnectingRef.current = dragConnecting;

  // Hovered Pin state
  const [hoveredPin, setHoveredPin] = useState<{ compId: string; pinId: string } | null>(null);
  const hoveredPinRef = useRef<{ compId: string; pinId: string } | null>(null);

  // Component Dragging State
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const compDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const refreshState = useCallback(() => {
    setComponents([...circuit.getAllComponents()]);
    setWires([...circuit.getAllWires()]);
  }, [circuit]);

  useEffect(() => {
    refreshState();
  }, [circuit, refreshState]);

  // Convert client viewport coordinate to SVG world coordinate
  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      return {
        x: (rawX - pan.x) / scale,
        y: (rawY - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  // Compute exact absolute coordinate of a pin in world space
  const getPinPos = useCallback(
    (compId: string, pinId: string): { x: number; y: number } => {
      const comp = circuit.getComponent(compId);
      if (!comp) return { x: 0, y: 0 };
      const pin = comp.pins[pinId];
      if (!pin) return { x: comp.position.x, y: comp.position.y };
      return {
        x: comp.position.x + pin.offset.x,
        y: comp.position.y + pin.offset.y,
      };
    },
    [circuit]
  );

  // Safe Wire Deletion (used by button and keyboard delete)
  const handleDeleteWire = useCallback(
    (wireId: string) => {
      const removed = circuit.removeWire(wireId);
      if (removed) {
        setSelectedWireId(null);
        refreshState();
        onWiresChange(circuit.getAllWires());
      }
    },
    [circuit, onWiresChange, refreshState]
  );

  const handleWireSelect = useCallback((wireId: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    console.log('[CIRCUIT] Selected wire:', wireId);
    setSelectedWireId(wireId);
  }, []);

  // Global Keyboard Handlers: Delete, Backspace, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Cancel active wire drag or clear wire selection
      if (e.key === 'Escape') {
        if (dragConnectingRef.current) {
          setDragConnecting(null);
        } else if (selectedWireId) {
          setSelectedWireId(null);
        }
        return;
      }

      // Delete / Backspace for selected wire
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWireId) {
        // Protect text input inside editor or dialogs
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.closest('.monaco-editor') ||
            active.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }
        e.preventDefault();
        handleDeleteWire(selectedWireId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWireId, handleDeleteWire]);

  // Window-level Pointer Listeners for Wire Connection and Component Dragging
  useEffect(() => {
    const handleWindowPointerMove = (e: MouseEvent | PointerEvent) => {
      // 1. Handling Wire Connection Gesture
      if (dragConnectingRef.current) {
        const worldPos = clientToWorld(e.clientX, e.clientY);
        const sourceCompId = dragConnectingRef.current.fromCompId;
        const sourcePinId = dragConnectingRef.current.fromPinId;

        let candidate: DragConnectingState['target'] = null;

        // Check hovered pin first
        if (hoveredPinRef.current && (hoveredPinRef.current.compId !== sourceCompId || hoveredPinRef.current.pinId !== sourcePinId)) {
          const hComp = hoveredPinRef.current.compId;
          const hPin = hoveredPinRef.current.pinId;
          const check = circuit.validateConnection(sourceCompId, sourcePinId, hComp, hPin);
          candidate = {
            compId: hComp,
            pinId: hPin,
            isValid: check.valid,
            reason: check.reason,
          };
        } else {
          // Geometric distance snap test (36px world radius)
          const allComps = circuit.getAllComponents();
          for (const comp of allComps) {
            for (const pin of Object.values(comp.pins)) {
              if (comp.id === sourceCompId && pin.id === sourcePinId) continue;
              const pinX = comp.position.x + pin.offset.x;
              const pinY = comp.position.y + pin.offset.y;
              const dist = Math.hypot(worldPos.x - pinX, worldPos.y - pinY);

              if (dist < 36) {
                const check = circuit.validateConnection(sourceCompId, sourcePinId, comp.id, pin.id);
                candidate = {
                  compId: comp.id,
                  pinId: pin.id,
                  isValid: check.valid,
                  reason: check.reason,
                };
                break;
              }
            }
            if (candidate) break;
          }
        }

        setDragConnecting((prev) =>
          prev
            ? {
                ...prev,
                currentWorldPos: worldPos,
                target: candidate,
              }
            : null
        );
      }

      // 2. Handling Component Dragging
      if (draggingCompId) {
        const worldPos = clientToWorld(e.clientX, e.clientY);
        const comp = circuit.getComponent(draggingCompId);
        if (comp) {
          const newX = Math.round(worldPos.x - compDragOffsetRef.current.x);
          const newY = Math.round(worldPos.y - compDragOffsetRef.current.y);
          comp.position = { x: newX, y: newY };
          setComponents([...circuit.getAllComponents()]);
          if (onComponentMove) onComponentMove(draggingCompId, newX, newY);
        }
      }

      // 3. Handling Canvas Panning
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      }
    };

    const handleWindowPointerUp = () => {
      // Commit wire connection if released over valid target
      if (dragConnectingRef.current) {
        const { fromCompId, fromPinId } = dragConnectingRef.current;
        let target = dragConnectingRef.current.target;

        // Fallback to hovered pin if available
        if (!target && hoveredPinRef.current) {
          const hComp = hoveredPinRef.current.compId;
          const hPin = hoveredPinRef.current.pinId;
          const check = circuit.validateConnection(fromCompId, fromPinId, hComp, hPin);
          if (check.valid) {
            target = { compId: hComp, pinId: hPin, isValid: true };
          }
        }

        if (target && target.isValid) {
          const sourceComp = circuit.getComponent(fromCompId);
          const sourcePin = sourceComp?.pins[fromPinId];

          const newWire: WireConnection = {
            id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            fromComponentId: fromCompId,
            fromPinId: fromPinId,
            toComponentId: target.compId,
            toPinId: target.pinId,
            color: getWireColor(sourcePin),
          };

          const added = circuit.addWire(newWire);
          if (added) {
            refreshState();
            onWiresChange(circuit.getAllWires());
          }
        }
        setDragConnecting(null);
      }

      setDraggingCompId(null);
      setIsPanning(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('mousemove', handleWindowPointerMove);
    window.addEventListener('mouseup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('mousemove', handleWindowPointerMove);
      window.removeEventListener('mouseup', handleWindowPointerUp);
    };
  }, [clientToWorld, circuit, draggingCompId, isPanning, onComponentMove, onWiresChange, refreshState]);

  // Canvas Background Mouse Down -> Pan Canvas
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Only deselect / pan if the click was directly on the background (svg or grid rect)
    const target = e.target as HTMLElement | SVGElement | null;
    const isBackground =
      !target ||
      target === containerRef.current ||
      target === svgRef.current ||
      target.tagName === 'svg' ||
      (target.tagName === 'rect' && target.getAttribute('fill')?.includes('circuitGrid'));

    console.log('[CANVAS] pointerdown on:', target?.tagName, target?.className, 'isBackground:', isBackground);

    if (isBackground && (e.button === 0 || e.button === 1)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedWireId(null);
    }
  };

  // Wheel Zoom towards cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.max(0.35, Math.min(2.5, scale * zoomFactor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
      const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Start dragging a component
  const handleComponentHeaderPointerDown = (compId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const comp = circuit.getComponent(compId);
    if (!comp) return;
    const worldPos = clientToWorld(e.clientX, e.clientY);
    compDragOffsetRef.current = {
      x: worldPos.x - comp.position.x,
      y: worldPos.y - comp.position.y,
    };
    setDraggingCompId(compId);
  };

  // Start dragging a wire connection from a pin
  const handlePinPointerDown = (compId: string, pinId: string, e: React.PointerEvent) => {
    console.log('[PIN] pointerdown on:', compId, pinId, 'button:', e.button);
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const worldPos = clientToWorld(e.clientX, e.clientY);
    setDragConnecting({
      fromCompId: compId,
      fromPinId: pinId,
      currentWorldPos: worldPos,
      target: null,
    });
  };

  const resetView = () => {
    setScale(1.0);
    setPan({ x: 20, y: 20 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0a0d14] overflow-hidden select-none border border-[#1a2230]"
      onPointerDown={handleCanvasPointerDown}
      onWheel={handleWheel}
    >
      {/* Canvas Controls Toolbar */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-[#121722]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#222e42] text-xs font-mono shadow-xl"
      >
        <span className="text-[#94a3b8] font-medium">Wires:</span>
        <span className="text-[#00f0ff] font-bold" data-testid="wire-count">
          {wires.length}
        </span>

        <div className="h-3.5 w-px bg-[#26354a] mx-1" />

        <button
          onClick={() => setScale((s) => Math.min(2.5, s * 1.15))}
          className="p-1 text-[#94a3b8] hover:text-[#00f0ff] rounded hover:bg-[#1b2434] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.35, s * 0.85))}
          className="p-1 text-[#94a3b8] hover:text-[#00f0ff] rounded hover:bg-[#1b2434] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={resetView}
          className="p-1 text-[#94a3b8] hover:text-[#00f0ff] rounded hover:bg-[#1b2434] transition-colors"
          title="Reset View"
        >
          <Maximize2 size={13} />
        </button>

        {selectedWireId && (
          <>
            <div className="h-3.5 w-px bg-[#26354a] mx-1" />
            <button
              onClick={() => handleDeleteWire(selectedWireId)}
              className="flex items-center gap-1 text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 px-2.5 py-0.5 rounded border border-rose-800 transition-all font-semibold cursor-pointer shadow-sm"
              title="Delete selected wire (or press Delete/Backspace)"
              data-testid="delete-wire-btn"
            >
              <Trash2 size={12} /> Delete Wire
            </button>
          </>
        )}
      </div>

      {/* Floating Connection Diagnostics Pill */}
      {dragConnecting && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141b27]/95 border border-[#2a384f] text-[11px] font-mono text-[#cbd5e1] shadow-2xl pointer-events-none">
          {dragConnecting.target ? (
            dragConnecting.target.isValid ? (
              <span className="text-[#10b981] font-semibold flex items-center gap-1">
                ✓ Release to connect to {dragConnecting.target.compId}:{dragConnecting.target.pinId}
              </span>
            ) : (
              <span className="text-[#f43f5e] font-semibold flex items-center gap-1">
                <AlertCircle size={13} /> {dragConnecting.target.reason || 'Invalid connection'}
              </span>
            )
          ) : (
            <span className="text-[#94a3b8]">Drag to a destination pin • Press Esc to cancel</span>
          )}
        </div>
      )}

      {/* SVG Canvas for Grid, Components, and Wires */}
      <svg ref={svgRef} className="w-full h-full pointer-events-auto cursor-default">
        <defs>
          {/* Subtle Grid */}
          <pattern id="circuitGrid" width={24 * scale} height={24 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${24 * scale} 0 L 0 0 0 ${24 * scale}`} fill="none" stroke="#141a24" strokeWidth="1" />
          </pattern>

          {/* ESP32 Metallic RF Shield Gradient */}
          <linearGradient id="rfShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Copper Antenna Gradient */}
          <linearGradient id="antennaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Glow Filter for Selected Wire */}
          <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#circuitGrid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Permanent Circuit Wires */}
          {wires.map((wire) => {
            const from = getPinPos(wire.fromComponentId, wire.fromPinId);
            const to = getPinPos(wire.toComponentId, wire.toPinId);
            const isSelected = selectedWireId === wire.id;
            const path = computeWireBezier(from, to);

            return (
              <g
                key={wire.id}
                onPointerDown={(e) => handleWireSelect(wire.id, e)}
                onMouseDown={(e) => handleWireSelect(wire.id, e)}
                onClick={(e) => handleWireSelect(wire.id, e)}
                className="cursor-pointer group"
                data-testid={`wire-${wire.id}`}
              >
                {/* Wide invisible hit path for easy wire selection */}
                <path
                  d={path}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.001"
                  strokeWidth="24"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerDown={(e) => handleWireSelect(wire.id, e)}
                  onMouseDown={(e) => handleWireSelect(wire.id, e)}
                  onClick={(e) => handleWireSelect(wire.id, e)}
                />

                {/* Selection Halo */}
                {isSelected && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="6"
                    strokeOpacity="0.4"
                    filter="url(#wireGlow)"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Visible Wire Body */}
                <path
                  d={path}
                  fill="none"
                  stroke={isSelected ? '#f43f5e' : wire.color || '#00f0ff'}
                  strokeWidth={isSelected ? '3.5' : '2'}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerDown={(e) => handleWireSelect(wire.id, e)}
                  onMouseDown={(e) => handleWireSelect(wire.id, e)}
                  onClick={(e) => handleWireSelect(wire.id, e)}
                  className="transition-all group-hover:stroke-[#f43f5e] group-hover:stroke-[3.5]"
                />
              </g>
            );
          })}

          {/* Active Live Temporary Wire while Dragging */}
          {dragConnecting && (() => {
            const from = getPinPos(dragConnecting.fromCompId, dragConnecting.fromPinId);
            let to = dragConnecting.currentWorldPos;

            // Snap to target pin center if hovering a pin
            if (dragConnecting.target) {
              to = getPinPos(dragConnecting.target.compId, dragConnecting.target.pinId);
            }

            const path = computeWireBezier(from, to);
            const strokeColor = dragConnecting.target
              ? dragConnecting.target.isValid
                ? '#10b981'
                : '#f43f5e'
              : '#f59e0b';

            return (
              <g pointerEvents="none">
                <path
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={dragConnecting.target ? 'none' : '5 4'}
                  strokeLinecap="round"
                />
                <circle cx={to.x} cy={to.y} r="5" fill={strokeColor} />
              </g>
            );
          })()}

          {/* Render Realistic Schematic Hardware Components */}
          {components.map((comp) => {
            const width = comp.dimensions?.width ?? 180;
            const height = comp.dimensions?.height ?? 220;

            return (
              <g
                key={comp.id}
                transform={`translate(${comp.position.x}, ${comp.position.y})`}
                data-testid={`component-${comp.id}`}
              >
                {/* Component Drag Header Bar */}
                <g
                  onPointerDown={(e) => handleComponentHeaderPointerDown(comp.id, e)}
                  className="cursor-move"
                >
                  <rect
                    x="0"
                    y="0"
                    width={width}
                    height="28"
                    rx="6"
                    fill="#151b26"
                    stroke="#222e42"
                    strokeWidth="1.2"
                  />
                  <rect x="0" y="22" width={width} height="6" fill="#151b26" />

                  {/* Header Title & Icon */}
                  <text
                    x="10"
                    y="18"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="0.03em"
                    pointerEvents="none"
                  >
                    {comp.name}
                  </text>
                  <circle cx={width - 14} cy="14" r="2" fill="#64748b" pointerEvents="none" />
                  <circle cx={width - 20} cy="14" r="2" fill="#64748b" pointerEvents="none" />
                </g>

                {/* Component Board Body */}
                {comp.type === 'ESP32_DEVKIT_V1' && (
                  <g pointerEvents="none">
                    {/* Dark Matte FR4 PCB Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#10141d"
                      stroke="#222e42"
                      strokeWidth="1.2"
                    />

                    {/* Corner Mounting Holes */}
                    <circle cx="12" cy="38" r="3.5" fill="#080b10" stroke="#334155" strokeWidth="1" />
                    <circle cx={width - 12} cy="38" r="3.5" fill="#080b10" stroke="#334155" strokeWidth="1" />
                    <circle cx="12" cy={height - 12} r="3.5" fill="#080b10" stroke="#334155" strokeWidth="1" />
                    <circle cx={width - 12} cy={height - 12} r="3.5" fill="#080b10" stroke="#334155" strokeWidth="1" />

                    {/* Gold Serpentine PCB Antenna at Top */}
                    <rect x={width / 2 - 24} y="32" width="48" height="12" rx="2" fill="url(#antennaGrad)" opacity="0.85" />

                    {/* Silver ESP-WROOM-32 Metallic Shield */}
                    <rect
                      x={width / 2 - 38}
                      y="52"
                      width="76"
                      height="80"
                      rx="3"
                      fill="url(#rfShieldGrad)"
                      stroke="#64748b"
                      strokeWidth="1"
                    />
                    <text x={width / 2} y="85" textAnchor="middle" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="700">
                      ESP-WROOM-32
                    </text>
                    <text x={width / 2} y="100" textAnchor="middle" fill="#334155" fontSize="7.5" fontFamily="monospace">
                      Xtensa LX6 240MHz
                    </text>

                    {/* Micro-USB Port at Bottom */}
                    <rect x={width / 2 - 16} y={height - 10} width="32" height="10" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
                    <rect x={width / 2 - 10} y={height - 6} width="20" height="6" fill="#090d14" />

                    {/* Silkscreen Indicators */}
                    <circle cx="28" cy={height - 24} r="2.5" fill="#ef4444" />
                    <text x="34" y={height - 22} fill="#64748b" fontSize="7" fontFamily="monospace">PWR</text>
                    <circle cx="68" cy={height - 24} r="2.5" fill="#3b82f6" />
                    <text x="74" y={height - 22} fill="#64748b" fontSize="7" fontFamily="monospace">D2</text>
                  </g>
                )}

                {comp.type === 'TB6612FNG' && (
                  <g pointerEvents="none">
                    {/* Vibrant Red Breakout PCB Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#7f1d1d"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />

                    {/* SSOP-24 Driver Chip in Center */}
                    <rect x={width / 2 - 20} y="80" width="40" height="110" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                    <text x={width / 2} y="132" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontFamily="monospace" fontWeight="700" transform={`rotate(-90 ${width / 2} 132)`}>
                      TB6612FNG
                    </text>

                    {/* IC Lead Pins */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <g key={i}>
                        <line x1={width / 2 - 24} y1={88 + i * 10} x2={width / 2 - 20} y2={88 + i * 10} stroke="#cbd5e1" strokeWidth="1.5" />
                        <line x1={width / 2 + 20} y1={88 + i * 10} x2={width / 2 + 24} y2={88 + i * 10} stroke="#cbd5e1" strokeWidth="1.5" />
                      </g>
                    ))}

                    {/* Sub-headers */}
                    <text x="14" y="38" fill="#fca5a5" fontSize="7" fontFamily="monospace" fontWeight="600">INPUTS</text>
                    <text x={width - 14} y="38" textAnchor="end" fill="#fca5a5" fontSize="7" fontFamily="monospace" fontWeight="600">OUTPUTS</text>
                  </g>
                )}

                {comp.type === 'BATTERY_PACK' && (
                  <g pointerEvents="none">
                    {/* Blue / Yellow LiPo Pouch Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#075985"
                      stroke="#0284c7"
                      strokeWidth="1.2"
                    />
                    <rect x="12" y="34" width="70" height="48" rx="3" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.8" />
                    <text x="47" y="56" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="700">
                      7.4V
                    </text>
                    <text x="47" y="70" textAnchor="middle" fill="#bae6fd" fontSize="7.5" fontFamily="monospace">
                      2S LiPo 1000mAh
                    </text>
                  </g>
                )}

                {comp.type === 'N20_MOTOR' && (
                  <g pointerEvents="none">
                    {/* N20 Metal Motor Body + Brass Gearbox */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#141923"
                      stroke="#222e42"
                      strokeWidth="1.2"
                    />
                    {/* Gearbox Brass housing */}
                    <rect x="42" y="34" width="34" height="48" rx="2" fill="#ca8a04" stroke="#eab308" strokeWidth="1" />
                    {/* Steel motor cylindrical can */}
                    <rect x="76" y="38" width="46" height="40" rx="3" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
                    {/* Rotating shaft glyph */}
                    <circle cx="28" cy="58" r="6" fill="#ca8a04" stroke="#fef08a" strokeWidth="1.5" />
                    <path d="M 28 52 L 28 64" stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                )}

                {/* Interactive Pins */}
                {Object.values(comp.pins).map((pin: PinDefinition) => {
                  const isLeft = pin.offset.x === 0;
                  const isHovered = hoveredPin?.compId === comp.id && hoveredPin?.pinId === pin.id;
                  const isDragSource =
                    dragConnecting?.fromCompId === comp.id && dragConnecting?.fromPinId === pin.id;
                  const isTargetCandidate =
                    dragConnecting?.target?.compId === comp.id && dragConnecting?.target?.pinId === pin.id;
                  const isTargetValid = isTargetCandidate && dragConnecting?.target?.isValid;
                  const isTargetInvalid = isTargetCandidate && !dragConnecting?.target?.isValid;

                  const pinColor = getWireColor(pin);

                  return (
                    <g
                      key={pin.id}
                      onPointerDown={(e) => handlePinPointerDown(comp.id, pin.id, e)}
                      onMouseDown={(e) => handlePinPointerDown(comp.id, pin.id, e as unknown as React.PointerEvent)}
                      onPointerEnter={() => {
                        hoveredPinRef.current = { compId: comp.id, pinId: pin.id };
                        setHoveredPin({ compId: comp.id, pinId: pin.id });
                      }}
                      onMouseEnter={() => {
                        hoveredPinRef.current = { compId: comp.id, pinId: pin.id };
                        setHoveredPin({ compId: comp.id, pinId: pin.id });
                      }}
                      onPointerLeave={() => {
                        hoveredPinRef.current = null;
                        setHoveredPin(null);
                      }}
                      onMouseLeave={() => {
                        hoveredPinRef.current = null;
                        setHoveredPin(null);
                      }}
                      className="cursor-crosshair group"
                      style={{ pointerEvents: 'all' }}
                      data-testid={`pin-${comp.id}-${pin.id}`}
                    >
                      {/* Large 24px invisible hit target */}
                      <circle
                        cx={pin.offset.x}
                        cy={pin.offset.y}
                        r="12"
                        fill="#000000"
                        fillOpacity="0.001"
                        style={{ pointerEvents: 'all' }}
                        onPointerDown={(e) => handlePinPointerDown(comp.id, pin.id, e)}
                        onMouseDown={(e) => handlePinPointerDown(comp.id, pin.id, e as unknown as React.PointerEvent)}
                        data-testid={`pin-circle-${comp.id}-${pin.id}`}
                      />

                      {/* Halo ring when hovered or active */}
                      {(isHovered || isDragSource || isTargetCandidate) && (
                        <circle
                          cx={pin.offset.x}
                          cy={pin.offset.y}
                          r="10"
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
                          fillOpacity="0.3"
                          stroke={
                            isDragSource
                              ? '#f59e0b'
                              : isTargetValid
                              ? '#10b981'
                              : isTargetInvalid
                              ? '#f43f5e'
                              : '#00f0ff'
                          }
                          strokeWidth="2"
                        />
                      )}

                      {/* Physical Pin Pad Ring */}
                      <circle
                        cx={pin.offset.x}
                        cy={pin.offset.y}
                        r="4.5"
                        fill="#0b0f17"
                        pointerEvents="none"
                        stroke={
                          isDragSource
                            ? '#f59e0b'
                            : isTargetValid
                            ? '#10b981'
                            : isTargetInvalid
                            ? '#f43f5e'
                            : pinColor
                        }
                        strokeWidth="2"
                      />

                      {/* Center Solder Hole */}
                      <circle cx={pin.offset.x} cy={pin.offset.y} r="1.5" fill="#020408" pointerEvents="none" />

                      {/* Crisp Monospace Pin Label */}
                      <text
                        x={isLeft ? pin.offset.x + 9 : pin.offset.x - 9}
                        y={pin.offset.y + 3.5}
                        textAnchor={isLeft ? 'start' : 'end'}
                        fill={isHovered ? '#ffffff' : '#94a3b8'}
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight={isHovered ? '700' : '600'}
                        pointerEvents="none"
                      >
                        {pin.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
