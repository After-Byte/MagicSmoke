import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircuitEngine } from './CircuitEngine';
import { ComponentInstance, WireConnection, PinDefinition, PinType } from './types';
import { Trash2, Cpu, Zap, Battery, Disc, ZoomIn, ZoomOut, Maximize2, Move, AlertCircle, Palette, CornerDownRight, Spline, RotateCcw } from 'lucide-react';
import { ComponentPalette } from './ComponentPalette';
import { ArduinoUnoR3Board } from './ArduinoUnoR3Board';
import { ESP32DevKitV1Board } from './ESP32DevKitV1Board';
import { CatalogItem } from './ComponentCatalog';
import {
  computeManhattanWireRoute,
  computeSmartWireBezier,
  BoundingBox,
  Point,
  WireSegment,
} from './wireRouting';
import { resolveComponentPin, getPinExitVector } from './wokwi/pinAliasMapper';

interface CircuitCanvasProps {
  circuit: CircuitEngine;
  onWiresChange: (wires: WireConnection[]) => void;
  onComponentMove?: (id: string, x: number, y: number) => void;
  onComponentsChange?: (components: ComponentInstance[]) => void;
  onResetMcu?: () => void;
  isSimulating?: boolean;
}

interface DragConnectingState {
  fromCompId: string;
  fromPinId: string;
  currentWorldPos: Point;
  waypoints: Point[];
  target: {
    compId: string;
    pinId: string;
    isValid: boolean;
    reason?: string;
  } | null;
}

interface DraggingSegmentState {
  wireId: string;
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
  initialMidpoint: Point;
  initialWaypoints: Point[];
  routePoints: Point[];
}

interface DraggingWaypointState {
  wireId: string;
  waypointIndex: number;
}

function getWireColor(pin?: PinDefinition): string {
  if (!pin) return '#00f0ff';
  if (pin.id === 'GND' || pin.id === 'NEG' || pin.id === 'GND1' || pin.id === 'GND2' || pin.id === 'GND3' || pin.id === 'GND4' || pin.id.startsWith('GND') || pin.type === PinType.GROUND) return '#64748b';
  if (pin.id === '3V3' || pin.id === '3.3V' || pin.id === 'VCC' || pin.id === '5V' || pin.id === 'POS' || pin.id === 'VCC1' || pin.id === 'VCC2' || pin.id === 'VCC3' || pin.id === 'VCC4' || pin.type === PinType.POWER_VCC) return '#06b6d4';
  if (pin.id === 'VM' || pin.id === 'VIN' || pin.type === PinType.POWER_VM) return '#f59e0b';
  if (pin.id === 'STBY') return '#10b981';
  if (pin.id === 'SIG') return '#f97316';
  if (pin.type === PinType.PWM_OUTPUT || pin.id === 'PWMA' || pin.id === 'PWMB') return '#a855f7';
  if (pin.id === 'AO1' || pin.id === 'BO1' || pin.id === 'M_POS') return '#ef4444';
  if (pin.id === 'AO2' || pin.id === 'BO2' || pin.id === 'M_NEG') return '#334155';
  return '#3b82f6';
}

function getPinNormal(
  comp?: ComponentInstance,
  pin?: PinDefinition
): { x: number; y: number } {
  const vec = getPinExitVector(comp, pin);
  return { x: vec.x, y: vec.y };
}

function computeWireBezier(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = Math.max(35, Math.abs(to.x - from.x) * 0.55);
  const cp1x = from.x + (to.x < from.x ? -dx * 0.8 : dx);
  const cp2x = to.x - (to.x < from.x ? -dx * 0.8 : dx);
  return `M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  circuit,
  onWiresChange,
  onComponentMove,
  onComponentsChange,
  onResetMcu,
  isSimulating = false,
}) => {
  const [components, setComponents] = useState<ComponentInstance[]>([]);
  const [wires, setWires] = useState<WireConnection[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

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

  // Wire Segment & Waypoint Dragging State
  const [draggingSegment, setDraggingSegment] = useState<DraggingSegmentState | null>(null);
  const draggingSegmentRef = useRef<DraggingSegmentState | null>(null);
  draggingSegmentRef.current = draggingSegment;

  const [draggingWaypoint, setDraggingWaypoint] = useState<DraggingWaypointState | null>(null);
  const draggingWaypointRef = useRef<DraggingWaypointState | null>(null);
  draggingWaypointRef.current = draggingWaypoint;

  const [defaultRoutingType, setDefaultRoutingType] = useState<'orthogonal' | 'bezier'>('orthogonal');

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

  // Compute exact absolute coordinate of a pin in world space (with Wokwi alias support)
  const getPinPos = useCallback(
    (compId: string, pinId: string): { x: number; y: number } => {
      const comp = circuit.getComponent(compId);
      if (!comp) return { x: 0, y: 0 };
      const pin = resolveComponentPin(comp, pinId);
      if (!pin) return { x: comp.position.x, y: comp.position.y };
      return {
        x: comp.position.x + pin.offset.x,
        y: comp.position.y + pin.offset.y,
      };
    },
    [circuit]
  );

  const handleToggleWireRouting = useCallback(
    (wireId: string) => {
      const wire = circuit.getWire(wireId);
      if (wire) {
        wire.routingType = (wire.routingType || defaultRoutingType) === 'bezier' ? 'orthogonal' : 'bezier';
        refreshState();
        onWiresChange(circuit.getAllWires());
      }
    },
    [circuit, defaultRoutingType, onWiresChange, refreshState]
  );

  const handleClearWireWaypoints = useCallback(
    (wireId: string) => {
      const wire = circuit.getWire(wireId);
      if (wire) {
        wire.waypoints = undefined;
        refreshState();
        onWiresChange(circuit.getAllWires());
      }
    },
    [circuit, onWiresChange, refreshState]
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
    setSelectedComponentId(null);
  }, []);

  const handleSegmentPointerDown = useCallback(
    (
      wireId: string,
      segment: WireSegment,
      routePoints: Point[],
      e: React.PointerEvent
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const wire = circuit.getWire(wireId);
      if (!wire) return;
      setDraggingSegment({
        wireId,
        segmentIndex: segment.index,
        orientation: segment.orientation,
        initialMidpoint: segment.midpoint,
        initialWaypoints: wire.waypoints ? [...wire.waypoints] : [],
        routePoints,
      });
    },
    [circuit]
  );

  const handleWaypointPointerDown = useCallback(
    (
      wireId: string,
      waypointIndex: number,
      e: React.PointerEvent
    ) => {
      e.stopPropagation();
      e.preventDefault();
      setDraggingWaypoint({
        wireId,
        waypointIndex,
      });
    },
    []
  );

  const handleAddComponent = useCallback(
    (item: CatalogItem) => {
      const existing = circuit.getAllComponents();
      const count = existing.length;
      const targetX = Math.round(180 + (count % 4) * 60);
      const targetY = Math.round(100 + (count % 3) * 75);
      const compId = `${item.type.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).substring(2, 6)}`;
      const instance = item.instantiate(compId, { x: targetX, y: targetY });

      circuit.addComponent(instance);
      refreshState();
      if (onComponentsChange) onComponentsChange(circuit.getAllComponents());
      onWiresChange(circuit.getAllWires());
    },
    [circuit, onComponentsChange, onWiresChange, refreshState]
  );

  const handleDeleteComponent = useCallback(
    (compId: string) => {
      circuit.removeComponent(compId);
      if (selectedComponentId === compId) {
        setSelectedComponentId(null);
      }
      refreshState();
      if (onComponentsChange) onComponentsChange(circuit.getAllComponents());
      onWiresChange(circuit.getAllWires());
    },
    [circuit, onComponentsChange, onWiresChange, refreshState, selectedComponentId]
  );

  const handleChangeWireColor = useCallback(
    (wireId: string, newColor: string) => {
      const wire = circuit.getWire(wireId);
      if (wire) {
        wire.color = newColor;
        refreshState();
        onWiresChange(circuit.getAllWires());
      }
    },
    [circuit, onWiresChange, refreshState]
  );

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

      // 2. Handling Wire Segment Dragging (Adjusting Orthogonal Bus)
      if (draggingSegmentRef.current) {
        const worldPos = clientToWorld(e.clientX, e.clientY);
        const { wireId, segmentIndex, orientation, initialMidpoint, routePoints } = draggingSegmentRef.current;
        const wire = circuit.getWire(wireId);
        if (wire) {
          if (orientation === 'horizontal') {
            const dy = worldPos.y - initialMidpoint.y;
            const targetY = Math.round(initialMidpoint.y + dy);
            const segStart = routePoints[segmentIndex];
            const segEnd = routePoints[segmentIndex + 1];
            wire.waypoints = [
              { x: segStart.x, y: targetY },
              { x: segEnd.x, y: targetY },
            ];
          } else {
            const dx = worldPos.x - initialMidpoint.x;
            const targetX = Math.round(initialMidpoint.x + dx);
            const segStart = routePoints[segmentIndex];
            const segEnd = routePoints[segmentIndex + 1];
            wire.waypoints = [
              { x: targetX, y: segStart.y },
              { x: targetX, y: segEnd.y },
            ];
          }
          refreshState();
        }
      }

      // 3. Handling Wire Waypoint Dragging
      if (draggingWaypointRef.current) {
        const worldPos = clientToWorld(e.clientX, e.clientY);
        const { wireId, waypointIndex } = draggingWaypointRef.current;
        const wire = circuit.getWire(wireId);
        if (wire && wire.waypoints && wire.waypoints[waypointIndex]) {
          wire.waypoints[waypointIndex] = {
            x: Math.round(worldPos.x),
            y: Math.round(worldPos.y),
          };
          refreshState();
        }
      }

      // 4. Handling Component Dragging
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

      // 5. Handling Canvas Panning
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      }
    };

    const handleWindowPointerUp = () => {
      // Release segment or waypoint drag
      if (draggingSegmentRef.current) {
        setDraggingSegment(null);
        onWiresChange(circuit.getAllWires());
        refreshState();
      }

      if (draggingWaypointRef.current) {
        setDraggingWaypoint(null);
        onWiresChange(circuit.getAllWires());
        refreshState();
      }

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
          const sourcePin = resolveComponentPin(sourceComp, fromPinId);

          const newWire: WireConnection = {
            id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            fromComponentId: fromCompId,
            fromPinId: fromPinId,
            toComponentId: target.compId,
            toPinId: target.pinId,
            color: getWireColor(sourcePin),
            waypoints: dragConnectingRef.current.waypoints.length > 0 ? dragConnectingRef.current.waypoints : undefined,
            routingType: defaultRoutingType,
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

  // Canvas Background Mouse Down -> Pan Canvas or Drop Wire Waypoint
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // If active wire connection is being drawn, clicking canvas drops a corner waypoint
    if (dragConnectingRef.current) {
      const worldPos = clientToWorld(e.clientX, e.clientY);
      setDragConnecting((prev) =>
        prev
          ? {
              ...prev,
              waypoints: [...(prev.waypoints || []), worldPos],
            }
          : null
      );
      return;
    }

    // Only deselect / pan if the click was directly on the background (svg or grid rect)
    const target = e.target as HTMLElement | SVGElement | null;
    const isBackground =
      !target ||
      target === containerRef.current ||
      target === svgRef.current ||
      target.tagName === 'svg' ||
      (target.tagName === 'rect' && target.getAttribute('fill')?.includes('circuitGrid'));

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
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const worldPos = clientToWorld(e.clientX, e.clientY);
    setDragConnecting({
      fromCompId: compId,
      fromPinId: pinId,
      currentWorldPos: worldPos,
      waypoints: [],
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
        className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-[#121722]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#222e42] text-xs font-mono shadow-xl flex-wrap max-w-[calc(100%-80px)]"
      >
        <span className="text-[#94a3b8] font-medium">Wires:</span>
        <span className="text-[#00f0ff] font-bold" data-testid="wire-count">
          {wires.length}
        </span>

        <span className="text-[#94a3b8] font-medium ml-1">Parts:</span>
        <span className="text-[#38bdf8] font-bold" data-testid="component-count">
          {components.length}
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

        <div className="h-3.5 w-px bg-[#26354a] mx-1" />

        <button
          onClick={() => setDefaultRoutingType((t) => (t === 'orthogonal' ? 'bezier' : 'orthogonal'))}
          className="flex items-center gap-1 text-[#94a3b8] hover:text-[#00f0ff] px-2 py-0.5 rounded hover:bg-[#1b2434] transition-colors text-[11px]"
          title="Toggle Default Wire Routing (Orthogonal Manhattan / Smooth Bezier)"
          data-testid="toggle-default-routing-btn"
        >
          {defaultRoutingType === 'orthogonal' ? (
            <>
              <CornerDownRight size={12} className="text-[#00f0ff]" />
              <span className="hidden sm:inline">Manhattan</span>
            </>
          ) : (
            <>
              <Spline size={12} className="text-[#a855f7]" />
              <span className="hidden sm:inline">Curved</span>
            </>
          )}
        </button>

        {selectedWireId && (
          <>
            <div className="h-3.5 w-px bg-[#26354a] mx-1" />
            <button
              onClick={() => handleToggleWireRouting(selectedWireId)}
              className="flex items-center gap-1 text-[#38bdf8] hover:text-white bg-[#0369a1]/30 hover:bg-[#0284c7] px-2 py-0.5 rounded border border-[#0284c7]/50 transition-all font-mono text-[11px] cursor-pointer shadow-sm"
              title="Toggle Orthogonal / Bezier Routing"
              data-testid="toggle-wire-routing-btn"
            >
              <Spline size={11} />
              {(circuit.getWire(selectedWireId)?.routingType || defaultRoutingType) === 'bezier' ? 'Orthogonal' : 'Curved'}
            </button>
            {circuit.getWire(selectedWireId)?.waypoints && (circuit.getWire(selectedWireId)?.waypoints?.length ?? 0) > 0 && (
              <button
                onClick={() => handleClearWireWaypoints(selectedWireId)}
                className="flex items-center gap-1 text-[#f59e0b] hover:text-white bg-[#b45309]/20 hover:bg-[#d97706] px-2 py-0.5 rounded border border-[#f59e0b]/40 transition-all font-mono text-[11px] cursor-pointer shadow-sm ml-1"
                title="Reset manual waypoints"
                data-testid="clear-wire-waypoints-btn"
              >
                <RotateCcw size={11} /> Reset Route
              </button>
            )}
            <div className="h-3.5 w-px bg-[#26354a] mx-1" />
            <span className="text-[#94a3b8] text-[10px] hidden sm:inline">Color:</span>
            <div className="flex items-center gap-1" data-testid="wire-color-picker">
              {[
                { color: '#ef4444', title: 'Red (Power)' },
                { color: '#64748b', title: 'Slate (Ground)' },
                { color: '#06b6d4', title: 'Cyan (3.3V Logic)' },
                { color: '#f59e0b', title: 'Amber (Battery VM)' },
                { color: '#10b981', title: 'Green (STBY)' },
                { color: '#3b82f6', title: 'Blue (Signals)' },
                { color: '#a855f7', title: 'Purple (PWM)' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => handleChangeWireColor(selectedWireId, c.color)}
                  className="w-3.5 h-3.5 rounded-full border border-black/50 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.color }}
                  title={c.title}
                  data-testid={`wire-color-${c.color.replace('#', '')}`}
                />
              ))}
            </div>
            <button
              onClick={() => handleDeleteWire(selectedWireId)}
              className="flex items-center gap-1 text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 px-2.5 py-0.5 rounded border border-rose-800 transition-all font-semibold cursor-pointer shadow-sm ml-1"
              title="Delete selected wire (or press Delete/Backspace)"
              data-testid="delete-wire-btn"
            >
              <Trash2 size={12} /> Delete Wire
            </button>
          </>
        )}

        {selectedComponentId && !selectedWireId && (
          <>
            <div className="h-3.5 w-px bg-[#26354a] mx-1" />
            <button
              onClick={() => handleDeleteComponent(selectedComponentId)}
              className="flex items-center gap-1 text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 px-2.5 py-0.5 rounded border border-rose-800 transition-all font-semibold cursor-pointer shadow-sm"
              title="Delete selected component"
              data-testid="delete-component-btn"
            >
              <Trash2 size={12} /> Delete Component
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
          {/* Obstacle boxes for Manhattan routing around component bodies */}
          {(() => {
            const obstacleBoxes: BoundingBox[] = components.map((c) => ({
              x: c.position.x,
              y: c.position.y,
              width: c.dimensions?.width ?? 180,
              height: c.dimensions?.height ?? 220,
            }));

            return (
              <>
                {/* Permanent Circuit Wires */}
                {wires.map((wire) => {
                  const fromComp = circuit.getComponent(wire.fromComponentId);
                  const toComp = circuit.getComponent(wire.toComponentId);
                  const fromPin = fromComp ? resolveComponentPin(fromComp, wire.fromPinId) : undefined;
                  const toPin = toComp ? resolveComponentPin(toComp, wire.toPinId) : undefined;

                  const from = getPinPos(wire.fromComponentId, wire.fromPinId);
                  const to = getPinPos(wire.toComponentId, wire.toPinId);
                  const fromNormal = getPinNormal(fromComp, fromPin);
                  const toNormal = getPinNormal(toComp, toPin);

                  const isSelected = selectedWireId === wire.id;
                  const isOrthogonal = (wire.routingType || defaultRoutingType) === 'orthogonal';

                  let wirePath = '';
                  let routePoints: Point[] = [];
                  let routeSegments: WireSegment[] = [];

                  if (isOrthogonal) {
                    const route = computeManhattanWireRoute(
                      from,
                      fromNormal,
                      to,
                      toNormal,
                      wire.waypoints,
                      obstacleBoxes
                    );
                    wirePath = route.path;
                    routePoints = route.points;
                    routeSegments = route.segments;
                  } else {
                    wirePath = computeSmartWireBezier(from, fromNormal, to, toNormal);
                  }

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
                        d={wirePath}
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
                          d={wirePath}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="7"
                          strokeOpacity="0.4"
                          filter="url(#wireGlow)"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* Underneath Casing Outline (Wokwi Style 4.5px Dark Housing) */}
                      <path
                        d={wirePath}
                        fill="none"
                        stroke="#0a0e14"
                        strokeWidth={isSelected ? '5.5' : '4.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ pointerEvents: 'none' }}
                      />

                      {/* Visible Colored Wire Body */}
                      <path
                        d={wirePath}
                        fill="none"
                        stroke={isSelected ? '#f43f5e' : wire.color || '#00f0ff'}
                        strokeWidth={isSelected ? '3.5' : '2.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onPointerDown={(e) => handleWireSelect(wire.id, e)}
                        onMouseDown={(e) => handleWireSelect(wire.id, e)}
                        onClick={(e) => handleWireSelect(wire.id, e)}
                        className="transition-all group-hover:stroke-[#f43f5e] group-hover:stroke-[3.5]"
                      />

                      {/* Draggable Segment Handles (Orthogonal Parallel Bus Adjustment) */}
                      {isSelected &&
                        isOrthogonal &&
                        routeSegments.map((seg, idx) => {
                          if (seg.length < 14) return null;
                          const isHoriz = seg.orientation === 'horizontal';
                          return (
                            <g key={`seg-${wire.id}-${idx}`}>
                              <line
                                x1={seg.start.x}
                                y1={seg.start.y}
                                x2={seg.end.x}
                                y2={seg.end.y}
                                stroke="transparent"
                                strokeWidth="16"
                                className={isHoriz ? 'cursor-ns-resize' : 'cursor-ew-resize'}
                                onPointerDown={(e) => handleSegmentPointerDown(wire.id, seg, routePoints, e)}
                              />
                              <rect
                                x={seg.midpoint.x - (isHoriz ? 8 : 4)}
                                y={seg.midpoint.y - (isHoriz ? 4 : 8)}
                                width={isHoriz ? 16 : 8}
                                height={isHoriz ? 8 : 16}
                                rx="3"
                                fill="#f43f5e"
                                stroke="#ffffff"
                                strokeWidth="1.2"
                                className={isHoriz ? 'cursor-ns-resize' : 'cursor-ew-resize'}
                                onPointerDown={(e) => handleSegmentPointerDown(wire.id, seg, routePoints, e)}
                                data-testid={`segment-handle-${wire.id}-${idx}`}
                              />
                            </g>
                          );
                        })}

                      {/* Draggable Waypoint Handles */}
                      {isSelected &&
                        wire.waypoints?.map((wp, wpIdx) => (
                          <circle
                            key={`wp-${wire.id}-${wpIdx}`}
                            cx={wp.x}
                            cy={wp.y}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-move hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleWaypointPointerDown(wire.id, wpIdx, e)}
                            data-testid={`waypoint-handle-${wire.id}-${wpIdx}`}
                          />
                        ))}
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

                  const fromComp = circuit.getComponent(dragConnecting.fromCompId);
                  const fromPin = fromComp ? resolveComponentPin(fromComp, dragConnecting.fromPinId) : undefined;
                  const fromNormal = getPinNormal(fromComp, fromPin);
                  let toNormal = { x: -fromNormal.x, y: -fromNormal.y };

                  if (dragConnecting.target) {
                    const tComp = circuit.getComponent(dragConnecting.target.compId);
                    const tPin = tComp ? resolveComponentPin(tComp, dragConnecting.target.pinId) : undefined;
                    toNormal = getPinNormal(tComp, tPin);
                  }

                  const isOrthogonal = defaultRoutingType === 'orthogonal';
                  let tempPath = '';
                  if (isOrthogonal) {
                    const route = computeManhattanWireRoute(
                      from,
                      fromNormal,
                      to,
                      toNormal,
                      dragConnecting.waypoints.length > 0 ? dragConnecting.waypoints : undefined,
                      obstacleBoxes
                    );
                    tempPath = route.path;
                  } else {
                    tempPath = computeSmartWireBezier(from, fromNormal, to, toNormal);
                  }

                  const strokeColor = dragConnecting.target
                    ? dragConnecting.target.isValid
                      ? '#10b981'
                      : '#f43f5e'
                    : '#f59e0b';

                  return (
                    <g pointerEvents="none">
                      <path
                        d={tempPath}
                        fill="none"
                        stroke="#0a0e14"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={tempPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeDasharray={dragConnecting.target ? 'none' : '5 4'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx={to.x} cy={to.y} r="5" fill={strokeColor} stroke="#0a0e14" strokeWidth="1" />
                      {/* Render intermediate dropped waypoints while drawing */}
                      {dragConnecting.waypoints.map((wp, i) => (
                        <circle key={`temp-wp-${i}`} cx={wp.x} cy={wp.y} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                      ))}
                    </g>
                  );
                })()}
              </>
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
                {comp.type === 'ARDUINO_UNO_R3' ? (
                  <g
                    onPointerDown={(e) => handleComponentHeaderPointerDown(comp.id, e)}
                    className="cursor-move"
                  >
                    <ArduinoUnoR3Board
                      component={comp}
                      circuit={circuit}
                      hoveredPin={hoveredPin}
                      dragConnecting={dragConnecting}
                      onPinPointerDown={handlePinPointerDown}
                      onPinHoverEnter={(cId, pId) => {
                        hoveredPinRef.current = { compId: cId, pinId: pId };
                        setHoveredPin({ compId: cId, pinId: pId });
                      }}
                      onPinHoverLeave={() => {
                        hoveredPinRef.current = null;
                        setHoveredPin(null);
                      }}
                      onResetMcu={onResetMcu}
                      isSimulating={isSimulating}
                    />
                  </g>
                ) : comp.type === 'ESP32_DEVKIT_V1' ? (
                  <g
                    onPointerDown={(e) => handleComponentHeaderPointerDown(comp.id, e)}
                    className="cursor-move"
                  >
                    <ESP32DevKitV1Board
                      component={comp}
                      circuit={circuit}
                      hoveredPin={hoveredPin}
                      dragConnecting={dragConnecting}
                      onPinPointerDown={handlePinPointerDown}
                      onPinHoverEnter={(cId, pId) => {
                        hoveredPinRef.current = { compId: cId, pinId: pId };
                        setHoveredPin({ compId: cId, pinId: pId });
                      }}
                      onPinHoverLeave={() => {
                        hoveredPinRef.current = null;
                        setHoveredPin(null);
                      }}
                      onResetMcu={onResetMcu}
                      isSimulating={isSimulating}
                    />
                  </g>
                ) : (
                  <>
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

                {comp.type === 'GROUND_BUS' && (
                  <g pointerEvents="none">
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <rect x="10" y="32" width={width - 20} height="16" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
                    <text x={width / 2} y="44" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="700">
                      COMMON GND BUS
                    </text>
                  </g>
                )}

                {comp.type === 'HC_SR04' && (
                  <g pointerEvents="none">
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#1e3a8a"
                      stroke="#2563eb"
                      strokeWidth="1.2"
                    />
                    {/* Dual Ultrasonic Transducers */}
                    <circle cx={44} cy={62} r="18" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx={44} cy={62} r="14" fill="#0f172a" />
                    <text x={44} y={66} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="700">T</text>

                    <circle cx={width - 44} cy={62} r="18" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx={width - 44} cy={62} r="14" fill="#0f172a" />
                    <text x={width - 44} y={66} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="700">R</text>

                    <text x={width / 2} y={96} textAnchor="middle" fill="#93c5fd" fontSize="7.5" fontFamily="monospace">
                      HC-SR04 40kHz
                    </text>
                  </g>
                )}

                

                {comp.type === 'IR_SENSOR_ARRAY_8CH' && (
                  <g pointerEvents="none">
                    {/* Dark Matte FR4 Sensor Bar Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />

                    {/* 8 Optical TCRT5000 IR Emitter/Receiver Pairs */}
                    <g>
                      {[...Array(8)].map((_, i) => {
                        const cy = 38 + i * 20;
                        return (
                          <g key={i}>
                            {/* Sensor Cell Border */}
                            <rect x="25" y={cy - 7} width="55" height="14" rx="2" fill="#020617" stroke="#1e293b" strokeWidth="0.8" />
                            {/* IR Emitter (Dark Blue/Clear LED) */}
                            <circle cx="37" cy={cy} r="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.8" />
                            {/* IR Phototransistor (Dark Red Filtered Lens) */}
                            <circle cx="53" cy={cy} r="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.8" />
                            {/* Channel Label */}
                            <text x="70" y={cy + 3} fill="#94a3b8" fontSize="7" fontFamily="monospace" fontWeight="700">
                              CH{i + 1}
                            </text>
                            {/* Indicator LED */}
                            <circle cx="95" cy={cy} r="2.5" fill="#10b981" opacity="0.8" />
                          </g>
                        );
                      })}
                    </g>

                    {/* Potentiometer Calibration Section */}
                    <rect x="120" y="45" width="30" height="25" rx="2" fill="#1e40af" stroke="#3b82f6" strokeWidth="1" />
                    <circle cx="135" cy="57" r="6" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" />
                    <line x1="131" y1="57" x2="139" y2="57" stroke="#713f12" strokeWidth="1.5" />
                    <text x="135" y="80" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">
                      SENS. ADJ
                    </text>

                    {/* Silkscreen Metadata */}
                    <text x="145" y={height - 35} textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="700">
                      8-CH IR ARRAY
                    </text>
                    <text x="145" y={height - 20} textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
                      QTR-8RC COMPATIBLE
                    </text>
                  </g>
                )}

                {comp.type === 'SERVO_SG90' && (
                  <g pointerEvents="none">
                    {/* SG90 Translucent Blue Micro Servo Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#0284c7"
                      stroke="#0369a1"
                      strokeWidth="1.5"
                    />
                    <rect x="6" y="32" width={width - 12} height={height - 38} rx="3" fill="#38bdf8" fillOpacity="0.12" />

                    {/* Mounting Flange Ears with Brass Eyelets */}
                    <rect x={width - 12} y="34" width="12" height="14" rx="2" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                    <circle cx={width - 6} cy="41" r="3" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />
                    <rect x={width - 12} y={height - 24} width="12" height="14" rx="2" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                    <circle cx={width - 6} cy={height - 17} r="3" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />

                    {/* Output Spline Hub & Horn */}
                    <circle cx="96" cy="63" r="18" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <circle cx="96" cy="63" r="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                    <circle cx="96" cy="63" r="4" fill="#0f172a" stroke="#ca8a04" strokeWidth="1.5" />
                    <rect x="81" y="61" width="30" height="4" rx="2" fill="#f8fafc" />
                    <rect x="94" y="48" width="4" height="30" rx="2" fill="#f8fafc" />

                    {/* Silkscreen Labels */}
                    <text x="46" y="52" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="sans-serif" fontWeight="800">
                      TOWER PRO
                    </text>
                    <text x="46" y="66" textAnchor="middle" fill="#fef08a" fontSize="7.5" fontFamily="monospace" fontWeight="700">
                      SG90 9g
                    </text>
                    <text x="46" y="78" textAnchor="middle" fill="#bae6fd" fontSize="6.5" fontFamily="monospace">
                      MICRO SERVO
                    </text>
                  </g>
                )}

                {comp.type === 'SERVO_MG996R' && (
                  <g pointerEvents="none">
                    {/* MG996R Matte Black High-Torque Body */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="5"
                      fill="#18181b"
                      stroke="#3f3f46"
                      strokeWidth="1.5"
                    />
                    <rect x="5" y="31" width={width - 10} height={height - 36} rx="3" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />

                    {/* Heavy-Duty Mounting Flanges */}
                    <rect x={width - 12} y="34" width="12" height="16" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1" />
                    <circle cx={width - 6} cy="42" r="2.5" fill="#09090b" stroke="#ca8a04" strokeWidth="1" />
                    <rect x={width - 12} y={height - 26} width="12" height="16" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1" />
                    <circle cx={width - 6} cy={height - 18} r="2.5" fill="#09090b" stroke="#ca8a04" strokeWidth="1" />

                    {/* Brass Metal Output Spline Gear */}
                    <circle cx="106" cy="68" r="22" fill="#ca8a04" stroke="#eab308" strokeWidth="2" />
                    <circle cx="106" cy="68" r="15" fill="#a16207" stroke="#fde047" strokeWidth="1" />
                    <circle cx="106" cy="68" r="5" fill="#09090b" stroke="#ca8a04" strokeWidth="2" />

                    {/* Spec Badge */}
                    <rect x="16" y="44" width="58" height="34" rx="2" fill="#09090b" stroke="#ca8a04" strokeWidth="0.8" />
                    <text x="45" y="58" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="800">
                      MG996R
                    </text>
                    <text x="45" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="6.5" fontFamily="monospace" fontWeight="700">
                      METAL GEAR
                    </text>
                    <text x="45" y="88" textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="monospace">
                      11 kg·cm 55g
                    </text>
                  </g>
                )}

                {comp.type === 'SERVO_POWER_SUPPLY' && (
                  <g pointerEvents="none">
                    {/* DC 6V 3A Regulated Power Supply */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="4"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />

                    {/* Aluminum Heatsink Fins */}
                    {[16, 26, 36, 46, 56].map((hx) => (
                      <rect key={hx} x={hx} y="38" width="6" height="44" rx="1.5" fill="#334155" stroke="#475569" strokeWidth="0.8" />
                    ))}

                    {/* DC Output Terminal Block */}
                    <rect x={width - 28} y="34" width="24" height="52" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <circle cx={width - 16} cy="44" r="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
                    <circle cx={width - 16} cy="70" r="5" fill="#020617" stroke="#475569" strokeWidth="1" />

                    {/* Status Power LED */}
                    <circle cx="80" cy="45" r="4" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                    <circle cx="80" cy="45" r="2" fill="#86efac" />
                    <text x="90" y="48" fill="#86efac" fontSize="6.5" fontFamily="monospace" fontWeight="700">
                      6.0V OK
                    </text>

                    {/* Silkscreen Label */}
                    <text x="100" y="68" textAnchor="middle" fill="#f8fafc" fontSize="8" fontFamily="sans-serif" fontWeight="700">
                      DC SERVO PSU
                    </text>
                    <text x="100" y="80" textAnchor="middle" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="700">
                      6.0V 3.0A (18W)
                    </text>
                  </g>
                )}

                {comp.type === 'BREADBOARD' && (
                  <g pointerEvents="none">
                    {/* Solderless Mini Breadboard */}
                    <rect
                      x="0"
                      y="26"
                      width={width}
                      height={height - 26}
                      rx="5"
                      fill="#f8fafc"
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />

                    {/* Positive Red Power Rail (+) */}
                    <line x1="16" y1="36" x2={width - 16} y2="36" stroke="#ef4444" strokeWidth="1.5" />
                    <text x="8" y="39" fill="#ef4444" fontSize="9" fontWeight="800" fontFamily="monospace">+</text>

                    {/* Negative Blue Ground Rail (-) */}
                    <line x1="16" y1="84" x2={width - 16} y2="84" stroke="#3b82f6" strokeWidth="1.5" />
                    <text x="8" y="87" fill="#3b82f6" fontSize="11" fontWeight="800" fontFamily="monospace">-</text>

                    {/* Center Divider Groove */}
                    <rect x="12" y="58" width={width - 24} height="4" fill="#e2e8f0" rx="1" />

                    {/* Contact Tie-Point Sockets */}
                    {[30, 70, 110, 150].map((cx) => (
                      <g key={cx}>
                        <circle cx={cx} cy="45" r="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.5" />
                        <circle cx={cx} cy="53" r="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.5" />
                        <circle cx={cx} cy="67" r="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.5" />
                        <circle cx={cx} cy="75" r="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.5" />
                      </g>
                    ))}

                    {/* Silkscreen Label */}
                    <text x={width / 2} y="53" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="700">
                      POWER DISTRIBUTION BUS
                    </text>
                    <text x={width / 2} y="74" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">
                      SOLDERLESS BREADBOARD
                    </text>
                  </g>
                )}

                </>
                )}

                {/* Interactive Pins (for standard components) */}
                {comp.type !== 'ARDUINO_UNO_R3' && comp.type !== 'ESP32_DEVKIT_V1' &&
                  Object.values(comp.pins).map((pin: PinDefinition) => {
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

      {/* Component Library Palette Drawer */}
      <ComponentPalette
        isOpen={isPaletteOpen}
        onToggle={() => setIsPaletteOpen(!isPaletteOpen)}
        onAddComponent={handleAddComponent}
      />
    </div>
  );
};
