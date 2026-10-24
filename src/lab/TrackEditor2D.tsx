import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TrackData,
  TrackPoint2D,
  RobotStartPose,
  sampleTrackPolyline,
  distanceToSegment,
  TRACK_PRESETS,
  createDefaultTrack,
} from '../robot/TrackModel';
import { TrackEnvironment } from '../robot/TrackEnvironment';
import {
  MousePointer,
  PenTool,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Check,
  AlertTriangle,
  Play,
  Layers,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface TrackEditor2DProps {
  track: TrackData;
  onTrackChange: (newTrack: TrackData) => void;
  onRunSimulation?: () => void;
}

type EditorTool = 'select' | 'draw' | 'add_point' | 'robot_pose';

export const TrackEditor2D: React.FC<TrackEditor2DProps> = ({
  track,
  onTrackChange,
  onRunSimulation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Tool
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Selected control point index (-1 = none)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);

  // Pan & Zoom state (world meters to screen pixels)
  // Default: 1 meter = 160 pixels, centered at (0, 0)
  const [scale, setScale] = useState<number>(180);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanMouse, setLastPanMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state for control points or robot start pose
  const [dragTarget, setDragTarget] = useState<
    | { type: 'control_point'; index: number }
    | { type: 'robot_position' }
    | { type: 'robot_heading' }
    | null
  >(null);

  // Grid snapping
  const [gridSnapMeters, setGridSnapMeters] = useState<number>(0.05); // 5cm default snap
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Clear confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<TrackData[]>([]);
  const [redoStack, setRedoStack] = useState<TrackData[]>([]);

  // Push current track to undo stack before mutation
  const pushUndo = useCallback((prevTrack: TrackData) => {
    setUndoStack((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(prevTrack))]);
    setRedoStack([]);
  }, []);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(track))]);
    onTrackChange(last);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(track))]);
    onTrackChange(next);
  };

  // Convert World Coordinates (meters) to Canvas Screen Coordinates (pixels)
  const worldToScreen = useCallback(
    (wx: number, wz: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2 + pan.x;
      const cy = rect.height / 2 + pan.y;
      // In Three.js: +X is right, +Z is forward. On screen: +X right, -Z down (so +Z is up in screen Y)
      const sx = cx + wx * scale;
      const sy = cy - wz * scale;
      return { x: sx, y: sy };
    },
    [pan, scale]
  );

  // Convert Canvas Screen Coordinates (pixels) to World Coordinates (meters)
  const screenToWorld = useCallback(
    (sx: number, sy: number): { x: number; z: number } => {
      if (!containerRef.current) return { x: 0, z: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2 + pan.x;
      const cy = rect.height / 2 + pan.y;
      let wx = (sx - cx) / scale;
      let wz = -(sy - cy) / scale;

      // Apply grid snapping if enabled
      if (gridSnapMeters > 0) {
        wx = Math.round(wx / gridSnapMeters) * gridSnapMeters;
        wz = Math.round(wz / gridSnapMeters) * gridSnapMeters;
      }

      return { x: wx, z: wz };
    },
    [pan, scale, gridSnapMeters]
  );

  // Dense polyline generated from track control points
  const polyline = sampleTrackPolyline(
    track.controlPoints,
    track.isClosed,
    track.smoothing,
    16
  );

  // Compute optical sensor status for the start pose
  const tempEnv = new TrackEnvironment({
    lineWidthMeters: track.lineWidthMeters,
  }, track);
  const sensorReadings = tempEnv.evaluateSensors({
    x: track.startPose.x,
    y: 0,
    z: track.startPose.z,
    yawRad: track.startPose.yawRad,
  });

  // Handle Preset Selection
  const handleSelectPreset = (presetKey: string) => {
    const preset = TRACK_PRESETS[presetKey];
    if (preset) {
      pushUndo(track);
      const newTrack = JSON.parse(JSON.stringify(preset));
      onTrackChange(newTrack);
      setSelectedPointIndex(-1);
    }
  };

  // Modify track properties
  const updateTrackProp = <K extends keyof TrackData>(key: K, val: TrackData[K]) => {
    pushUndo(track);
    const updated = { ...track, [key]: val };
    onTrackChange(updated);
  };

  // Add a control point at world coordinates
  const handleAddPointAt = (wx: number, wz: number) => {
    pushUndo(track);
    const pts = [...track.controlPoints, { x: wx, z: wz }];
    onTrackChange({ ...track, controlPoints: pts });
    setSelectedPointIndex(pts.length - 1);
  };

  // Delete selected control point
  const handleDeleteSelectedPoint = () => {
    if (selectedPointIndex < 0 || track.controlPoints.length <= 2) return;
    pushUndo(track);
    const pts = track.controlPoints.filter((_, idx) => idx !== selectedPointIndex);
    onTrackChange({ ...track, controlPoints: pts });
    setSelectedPointIndex(-1);
  };

  // Clear entire track
  const handleClearTrack = () => {
    pushUndo(track);
    onTrackChange({
      ...track,
      controlPoints: [
        { x: -0.5, z: 0 },
        { x: 0.5, z: 0 },
      ],
      isClosed: false,
    });
    setSelectedPointIndex(-1);
    setShowClearConfirm(false);
  };

  // Reset to default canonical track
  const handleResetToDefault = () => {
    pushUndo(track);
    onTrackChange(createDefaultTrack());
    setSelectedPointIndex(-1);
  };

  // Pan & Zoom Mouse Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setScale((prev) => Math.max(60, Math.min(600, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Right click or spacebar click initiates pan
    if (e.button === 2 || e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setLastPanMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    // Check if clicked on Robot Heading Handle
    const robotScreen = worldToScreen(track.startPose.x, track.startPose.z);
    const headingHandleDist = 48; // pixels
    const hx = robotScreen.x + Math.sin(track.startPose.yawRad) * headingHandleDist;
    const hy = robotScreen.y - Math.cos(track.startPose.yawRad) * headingHandleDist;
    if (Math.hypot(mx - hx, my - hy) < 14) {
      setDragTarget({ type: 'robot_heading' });
      return;
    }

    // Check if clicked on Robot Center
    if (Math.hypot(mx - robotScreen.x, my - robotScreen.y) < 22) {
      setDragTarget({ type: 'robot_position' });
      return;
    }

    // Check if clicked on a Control Point Handle
    for (let i = 0; i < track.controlPoints.length; i++) {
      const pt = track.controlPoints[i];
      const sp = worldToScreen(pt.x, pt.z);
      if (Math.hypot(mx - sp.x, my - sp.y) < 12) {
        setSelectedPointIndex(i);
        setDragTarget({ type: 'control_point', index: i });
        return;
      }
    }

    // If Draw or Add Point tool is active, insert a point
    if (activeTool === 'draw' || activeTool === 'add_point') {
      const worldPos = screenToWorld(mx, my);
      handleAddPointAt(worldPos.x, worldPos.z);
      return;
    }

    // Clicking on empty area deselects
    setSelectedPointIndex(-1);
    setIsPanning(true);
    setLastPanMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanMouse.x;
      const dy = e.clientY - lastPanMouse.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!dragTarget || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragTarget.type === 'control_point') {
      const worldPos = screenToWorld(mx, my);
      const pts = [...track.controlPoints];
      pts[dragTarget.index] = { x: worldPos.x, z: worldPos.z };
      onTrackChange({ ...track, controlPoints: pts });
    } else if (dragTarget.type === 'robot_position') {
      const worldPos = screenToWorld(mx, my);
      onTrackChange({
        ...track,
        startPose: { ...track.startPose, x: worldPos.x, z: worldPos.z },
      });
    } else if (dragTarget.type === 'robot_heading') {
      const robotScreen = worldToScreen(track.startPose.x, track.startPose.z);
      const dx = mx - robotScreen.x;
      const dy = -(my - robotScreen.y); // invert screen Y to world Z
      const angle = Math.atan2(dx, dy); // 0 along +Z
      onTrackChange({
        ...track,
        startPose: { ...track.startPose, yawRad: angle },
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragTarget) {
      setDragTarget(null);
    }
  };

  // Keyboard shortcuts for delete & undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPointIndex >= 0) {
          handleDeleteSelectedPoint();
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPointIndex, track, undoStack, redoStack]);

  // Center & Fit View
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setScale(180);
  };

  // Render Arena Grid Lines in SVG
  const renderGridLines = () => {
    if (!showGrid || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2 + pan.x;
    const cy = rect.height / 2 + pan.y;

    const lines: React.ReactNode[] = [];
    const arenaHalfW = track.arenaWidthMeters / 2;
    const arenaHalfH = track.arenaHeightMeters / 2;

    // Arena Mat Outer Boundary
    const matTopLeft = worldToScreen(-arenaHalfW, arenaHalfH);
    const matBottomRight = worldToScreen(arenaHalfW, -arenaHalfH);

    // Major 0.5m grid lines
    const gridStep = 0.5;
    for (let x = -arenaHalfW; x <= arenaHalfW + 0.01; x += gridStep) {
      const p1 = worldToScreen(x, arenaHalfH);
      const p2 = worldToScreen(x, -arenaHalfH);
      const isAxis = Math.abs(x) < 0.01;
      lines.push(
        <line
          key={`gx_${x}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={isAxis ? '#38bdf8' : '#e2e8f0'}
          strokeWidth={isAxis ? 1.5 : 0.8}
          strokeDasharray={isAxis ? undefined : '2,2'}
        />
      );
    }

    for (let z = -arenaHalfH; z <= arenaHalfH + 0.01; z += gridStep) {
      const p1 = worldToScreen(-arenaHalfW, z);
      const p2 = worldToScreen(arenaHalfW, z);
      const isAxis = Math.abs(z) < 0.01;
      lines.push(
        <line
          key={`gz_${z}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={isAxis ? '#38bdf8' : '#e2e8f0'}
          strokeWidth={isAxis ? 1.5 : 0.8}
          strokeDasharray={isAxis ? undefined : '2,2'}
        />
      );
    }

    return (
      <g className="grid-lines pointer-events-none select-none">
        {/* Arena White Floor Surface */}
        <rect
          x={matTopLeft.x}
          y={matTopLeft.y}
          width={matBottomRight.x - matTopLeft.x}
          height={matBottomRight.y - matTopLeft.y}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="2"
        />
        {lines}
      </g>
    );
  };

  // Render SVG Path of the track
  const renderTrackRibbon = () => {
    if (polyline.length < 2) return null;

    let d = '';
    for (let i = 0; i < polyline.length; i++) {
      const pt = polyline[i];
      const sp = worldToScreen(pt.x, pt.z);
      if (i === 0) {
        d += `M ${sp.x} ${sp.y}`;
      } else {
        d += ` L ${sp.x} ${sp.y}`;
      }
    }

    const strokePixelWidth = track.lineWidthMeters * scale;

    return (
      <g className="track-ribbon pointer-events-none select-none">
        {/* Outer subtle edge border */}
        <path
          d={d}
          fill="none"
          stroke="#334155"
          strokeWidth={strokePixelWidth + 2}
          strokeLinecap={track.isClosed ? 'round' : 'square'}
          strokeLinejoin="round"
        />
        {/* Pitch Black Matte Track Line */}
        <path
          d={d}
          fill="none"
          stroke="#090d16"
          strokeWidth={strokePixelWidth}
          strokeLinecap={track.isClosed ? 'round' : 'square'}
          strokeLinejoin="round"
        />
        {/* Fine dashed center guidance line */}
        <path
          d={d}
          fill="none"
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      </g>
    );
  };

  // Render Robot Footprint & 8 Sensor Indicators at Start Pose
  const renderRobotStartPose = () => {
    const sp = worldToScreen(track.startPose.x, track.startPose.z);
    const yaw = track.startPose.yawRad;

    // Robot dimensions: width 0.13m, length 0.18m
    const wPx = 0.13 * scale;
    const lPx = 0.18 * scale;
    const dFrontPx = 0.09 * scale;
    const headingHandleDist = 44;

    const hx = sp.x + Math.sin(yaw) * headingHandleDist;
    const hy = sp.y - Math.cos(yaw) * headingHandleDist;

    // 8 Sensor dot positions
    const pitch = 0.010;
    const sensorDots = [];
    for (let i = 0; i < 8; i++) {
      const xLocal = (i - 3.5) * pitch;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const wx = track.startPose.x + xLocal * cosY + 0.09 * sinY;
      const wz = track.startPose.z - xLocal * sinY + 0.09 * cosY;
      const dotScreen = worldToScreen(wx, wz);
      const isActive = sensorReadings.digitalChannels[i] === 1;

      sensorDots.push(
        <circle
          key={`s_${i}`}
          cx={dotScreen.x}
          cy={dotScreen.y}
          r={Math.max(3, 0.003 * scale)}
          fill={isActive ? '#10b981' : '#64748b'}
          stroke={isActive ? '#047857' : '#334155'}
          strokeWidth="1.5"
        />
      );
    }

    return (
      <g className="robot-start-pose">
        {/* Heading directional line */}
        <line
          x1={sp.x}
          y1={sp.y}
          x2={hx}
          y2={hy}
          stroke="#00f0ff"
          strokeWidth="2.5"
          strokeDasharray="3,3"
        />
        {/* Rotatable heading handle */}
        <circle
          cx={hx}
          cy={hy}
          r="6.5"
          fill="#00f0ff"
          stroke="#0a0e17"
          strokeWidth="2"
          className="cursor-crosshair hover:scale-125 transition-transform"
        >
          <title>Drag to rotate robot start heading</title>
        </circle>

        {/* Chassis Body Box */}
        <g transform={`translate(${sp.x}, ${sp.y}) rotate(${(-yaw * 180) / Math.PI})`}>
          <rect
            x={-wPx / 2}
            y={-lPx / 2}
            width={wPx}
            height={lPx}
            rx={wPx * 0.1}
            fill="#0ea5e9"
            fillOpacity="0.25"
            stroke="#0284c7"
            strokeWidth="2"
            className="cursor-move"
          />
          {/* Wheel placeholders */}
          <rect x={-wPx / 2 - 4} y={-lPx * 0.3} width={5} height={lPx * 0.45} fill="#1e293b" rx={1} />
          <rect x={wPx / 2 - 1} y={-lPx * 0.3} width={5} height={lPx * 0.45} fill="#1e293b" rx={1} />
          {/* Front Bumper Sensor Bar */}
          <rect
            x={-wPx * 0.42}
            y={dFrontPx - 3}
            width={wPx * 0.84}
            height={5}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1"
            rx={1}
          />
        </g>

        {/* 8 Sensor Indicators */}
        {sensorDots}

        {/* Draggable center pivot */}
        <circle
          cx={sp.x}
          cy={sp.y}
          r="5"
          fill="#00f0ff"
          stroke="#0a0e17"
          strokeWidth="1.5"
          className="cursor-move"
        />
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-[#f1f5f9] font-mono select-none overflow-hidden relative">
      {/* Top 2D Editor Toolbar */}
      <div className="h-12 bg-[#0c1018] border-b border-[#18202e] px-4 flex items-center justify-between z-10 shrink-0">
        {/* Left: Tools Palette */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#18202e]">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'select'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
              title="Select & Move Control Points (Shortcut: V)"
              data-testid="tool-select-btn"
            >
              <MousePointer size={14} />
            </button>
            <button
              onClick={() => setActiveTool('draw')}
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'draw'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
              title="Click or Drag on Canvas to Draw Track (Shortcut: D)"
              data-testid="tool-draw-btn"
            >
              <PenTool size={14} />
            </button>
            <button
              onClick={() => setActiveTool('add_point')}
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'add_point'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
              title="Add Control Point"
              data-testid="tool-add-point-btn"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleDeleteSelectedPoint}
              disabled={selectedPointIndex < 0 || track.controlPoints.length <= 2}
              className="p-1.5 rounded text-[#94a3b8] hover:text-rose-400 disabled:opacity-30 disabled:hover:text-[#94a3b8] transition-colors"
              title="Delete Selected Point (Delete / Backspace)"
              data-testid="tool-delete-point-btn"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-[#18202e] mx-1" />

          {/* Presets Selector */}
          <div className="flex items-center gap-1.5 bg-[#07090e] px-2.5 py-1 rounded-lg border border-[#18202e] text-xs">
            <span className="text-[10px] text-[#64748b]">Preset:</span>
            <select
              onChange={(e) => handleSelectPreset(e.target.value)}
              defaultValue="oval_loop"
              className="bg-transparent text-xs text-[#00f0ff] font-bold outline-none cursor-pointer"
              data-testid="track-preset-select"
            >
              <option value="oval_loop" className="bg-[#0c1018]">Competition Oval</option>
              <option value="rounded_rect" className="bg-[#0c1018]">Rounded Rectangle</option>
              <option value="s_curves" className="bg-[#0c1018]">Challenging S-Curves</option>
              <option value="straight" className="bg-[#0c1018]">Straight Benchmark</option>
              <option value="beginner_loop" className="bg-[#0c1018]">Beginner Circle</option>
              <option value="complex_circuit" className="bg-[#0c1018]">Grand Prix Circuit</option>
            </select>
          </div>

          <div className="h-4 w-px bg-[#18202e] mx-1 hidden sm:block" />

          {/* Width & Curve Settings */}
          <div className="hidden lg:flex items-center gap-3 bg-[#07090e] px-3 py-1 rounded-lg border border-[#18202e] text-[11px]">
            {/* Line Width */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#64748b]">Width:</span>
              <input
                type="range"
                min="12"
                max="50"
                step="2"
                value={Math.round(track.lineWidthMeters * 1000)}
                onChange={(e) => updateTrackProp('lineWidthMeters', parseInt(e.target.value, 10) / 1000)}
                className="w-16 accent-[#00f0ff] cursor-pointer"
                title={`Track Line Width: ${(track.lineWidthMeters * 1000).toFixed(0)}mm`}
                data-testid="line-width-slider"
              />
              <span className="text-[#38bdf8] font-bold">{Math.round(track.lineWidthMeters * 1000)}mm</span>
            </div>

            {/* Closed Loop Toggle */}
            <button
              onClick={() => updateTrackProp('isClosed', !track.isClosed)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                track.isClosed
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                  : 'bg-[#121926] text-[#94a3b8] border-[#1e2a3c]'
              }`}
              title="Toggle whether track forms a continuous closed circuit"
              data-testid="toggle-closed-loop-btn"
            >
              {track.isClosed ? 'Closed Loop' : 'Open Path'}
            </button>

            {/* Smoothing Toggle */}
            <button
              onClick={() => updateTrackProp('smoothing', !track.smoothing)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                track.smoothing
                  ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
                  : 'bg-[#121926] text-[#94a3b8] border-[#1e2a3c]'
              }`}
              title="Toggle Catmull-Rom Spline Curve Smoothing"
              data-testid="toggle-smoothing-btn"
            >
              {track.smoothing ? 'Smooth Spline' : 'Polygonal'}
            </button>
          </div>
        </div>

        {/* Right: Actions, History & Test Button */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#18202e]">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
              data-testid="track-undo-btn"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Shift+Z)"
              data-testid="track-redo-btn"
            >
              <RotateCw size={13} />
            </button>
          </div>

          {/* Grid Snap Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-[#07090e] px-2 py-1 rounded-lg border border-[#18202e] text-[11px] text-[#94a3b8]">
            <Grid size={12} className={gridSnapMeters > 0 ? 'text-[#00f0ff]' : 'text-[#64748b]'} />
            <select
              value={gridSnapMeters}
              onChange={(e) => setGridSnapMeters(parseFloat(e.target.value))}
              className="bg-transparent text-[10px] text-[#cbd5e1] outline-none cursor-pointer"
            >
              <option value="0" className="bg-[#0c1018]">Snap: Off</option>
              <option value="0.05" className="bg-[#0c1018]">Snap: 5cm</option>
              <option value="0.10" className="bg-[#0c1018]">Snap: 10cm</option>
              <option value="0.20" className="bg-[#0c1018]">Snap: 20cm</option>
            </select>
          </div>

          {/* Reset to Default Track Button */}
          <button
            onClick={handleResetToDefault}
            className="px-2.5 py-1 rounded-lg bg-[#07090e] hover:bg-[#161f30] text-[#94a3b8] hover:text-[#cbd5e1] border border-[#18202e] text-[11px] transition-colors"
            title="Reset to Default Competition Track"
            data-testid="reset-default-track-btn"
          >
            Reset Default
          </button>

          {/* Clear Track Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-2.5 py-1 rounded-lg bg-[#07090e] hover:bg-rose-950/40 text-[#94a3b8] hover:text-rose-300 border border-[#18202e] hover:border-rose-800 text-[11px] transition-colors"
            title="Clear Track Points"
            data-testid="clear-track-btn"
          >
            Clear
          </button>

          {/* Test in 3D Arena */}
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#070a10] font-bold text-xs shadow-sm transition-all active:scale-95"
              data-testid="test-in-3d-btn"
            >
              <Play size={13} />
              <span>Test in 3D</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2D Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden bg-[#0a0d14]"
        data-testid="track-editor-canvas"
      >
        {/* SVG Drawing Layer */}
        <svg className="w-full h-full absolute inset-0">
          {/* Background Grid & Arena Floor */}
          {renderGridLines()}

          {/* Track Ribbon (Black line tape) */}
          {renderTrackRibbon()}

          {/* Robot Start Pose with 8 IR Sensors */}
          {renderRobotStartPose()}

          {/* Control Point Handles */}
          <g className="control-points">
            {track.controlPoints.map((pt, i) => {
              const sp = worldToScreen(pt.x, pt.z);
              const isSelected = i === selectedPointIndex;
              return (
                <g key={`cp_${i}`} className="cursor-pointer">
                  {isSelected && (
                    <circle
                      cx={sp.x}
                      cy={sp.y}
                      r="12"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                  )}
                  <circle
                    cx={sp.x}
                    cy={sp.y}
                    r="5.5"
                    fill={isSelected ? '#00f0ff' : '#0284c7'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="hover:scale-125 transition-transform"
                  />
                  <text
                    x={sp.x + 8}
                    y={sp.y - 8}
                    fontSize="9"
                    fill="#94a3b8"
                    className="pointer-events-none select-none font-mono"
                  >
                    P{i + 1} ({pt.x.toFixed(2)}, {pt.z.toFixed(2)})
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Top-Left Status & Inspection Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          {/* Start Pose Sensor Overlap Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-mono font-bold ${
              sensorReadings.activeSensorCount > 0
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            {sensorReadings.activeSensorCount > 0 ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>ROBOT OVER LINE ({sensorReadings.activeSensorCount}/8 SENSORS DETECTING)</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-rose-400" />
                <span>ROBOT STARTS OFF TRACK (LINE LOST)</span>
              </>
            )}
          </div>

          <div className="bg-[#0b0f19]/80 backdrop-blur-md border border-[#1e2a3c] px-3 py-1.5 rounded-xl text-[11px] text-[#94a3b8] shadow-md flex items-center gap-3">
            <span>Points: <strong className="text-[#f8fafc]">{track.controlPoints.length}</strong></span>
            <span>Length: <strong className="text-[#38bdf8]">{(polyline.length * 0.02).toFixed(2)}m</strong></span>
            <span>Start: <strong className="text-[#cbd5e1]">{track.startPose.x.toFixed(2)}, {track.startPose.z.toFixed(2)}m</strong></span>
          </div>
        </div>

        {/* Floating View Controls (Bottom-Right) */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-[#0c1018]/90 backdrop-blur-md p-1 rounded-xl border border-[#1e2a3c] shadow-lg text-xs font-mono">
          <button
            onClick={() => setScale((prev) => Math.min(600, prev * 1.2))}
            className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setScale((prev) => Math.max(60, prev / 1.2))}
            className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Clear Track Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0c1018] border border-[#23354f] rounded-2xl max-w-sm w-full p-5 text-xs font-mono text-[#cbd5e1] space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={16} />
              <span>Clear Entire Track?</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              This will erase all current track control points. You can restore this using the Undo button.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[#141b27] hover:bg-[#1c2638] text-[#94a3b8] text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearTrack}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                data-testid="confirm-clear-track-btn"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
