import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationCoordinator } from './simulation/SimulationCoordinator';
import { Robot3DViewport } from './three/Robot3DViewport';
import { CodeEditor } from './editor/CodeEditor';
import { CircuitCanvas } from './circuit/CircuitCanvas';
import { ConsolePanel } from './console/ConsolePanel';
import { DEFAULT_SKETCH, createDefaultProject } from './project/defaultProject';
import { validateProjectDocument } from './project/types';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Cpu,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Box,
  FileCode,
} from 'lucide-react';

export const App: React.FC = () => {
  const coordinatorRef = useRef<SimulationCoordinator | null>(null);
  const viewportRef = useRef<Robot3DViewport | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Project state
  const [code, setCode] = useState<string>(DEFAULT_SKETCH);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Diagnostics & logs
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [circuitWarnings, setCircuitWarnings] = useState<string[]>([]);

  // Workspace layout preferences
  // 3D Viewport closed by default per Phase 2 requirements!
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    return localStorage.getItem('magicsmoke_drawer_open') === 'true';
  });
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('magicsmoke_drawer_width');
    return saved ? parseInt(saved, 10) : Math.min(560, Math.round(window.innerWidth * 0.42));
  });
  const [editorSplitPct, setEditorSplitPct] = useState<number>(() => {
    const saved = localStorage.getItem('magicsmoke_split_pct');
    return saved ? parseFloat(saved) : 50;
  });
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState<boolean>(false);

  // Mobile/Narrow responsive tab state
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(window.innerWidth < 880);
  const [mobileTab, setMobileTab] = useState<'editor' | 'circuit' | 'viewport'>('editor');

  // Split-resizing state
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isDraggingDrawerResize, setIsDraggingDrawerResize] = useState(false);

  // Telemetry
  const [telemetry, setTelemetry] = useState({
    leftRPM: 0,
    rightRPM: 0,
    modeA: 'STANDBY',
    modeB: 'STANDBY',
    voltageA: 0,
    voltageB: 0,
  });

  // Track window resizing for narrow screen layout
  useEffect(() => {
    const handleWindowResize = () => {
      setIsNarrowScreen(window.innerWidth < 880);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Handle Escape key to close 3D drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
        localStorage.setItem('magicsmoke_drawer_open', 'false');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Save drawer width to localStorage
  useEffect(() => {
    localStorage.setItem('magicsmoke_drawer_width', String(drawerWidth));
  }, [drawerWidth]);

  // Save split percentage to localStorage
  useEffect(() => {
    localStorage.setItem('magicsmoke_split_pct', String(editorSplitPct));
  }, [editorSplitPct]);

  // Initialize simulation coordinator
  useEffect(() => {
    const coord = new SimulationCoordinator();
    coordinatorRef.current = coord;

    coord.onSerial((text) => {
      setSerialLogs((prev) => [...prev, text]);
    });

    // Main animation & simulation loop
    let animId: number;
    const loop = () => {
      if (coordinatorRef.current) {
        const sim = coordinatorRef.current.tick();

        if (viewportRef.current) {
          viewportRef.current.updateRobot(
            sim.pose,
            coordinatorRef.current.leftMotor.getAngle(),
            coordinatorRef.current.rightMotor.getAngle()
          );
          viewportRef.current.render();
        }

        setTelemetry({
          leftRPM: Math.round(sim.leftRPM),
          rightRPM: Math.round(sim.rightRPM),
          modeA: sim.driverState.channelA.mode,
          modeB: sim.driverState.channelB.mode,
          voltageA: Number(sim.driverState.channelA.terminalVoltage.toFixed(1)),
          voltageB: Number(sim.driverState.channelB.terminalVoltage.toFixed(1)),
        });

        const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
        setCircuitWarnings(evalRes.circuitWarnings);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      viewportRef.current?.destroy();
    };
  }, []);

  // Mount/Resize 3D Viewport when drawer opens or resizes
  useEffect(() => {
    if (isDrawerOpen || (isNarrowScreen && mobileTab === 'viewport')) {
      if (!viewportRef.current && viewportContainerRef.current) {
        viewportRef.current = new Robot3DViewport(viewportContainerRef.current);
      } else if (viewportRef.current) {
        viewportRef.current.handleResize();
      }
    }
  }, [isDrawerOpen, drawerWidth, isNarrowScreen, mobileTab]);

  // Split-resizing drag handling
  const handleSplitMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingSplit) {
        const pct = (e.clientX / window.innerWidth) * 100;
        setEditorSplitPct(Math.max(20, Math.min(80, pct)));
      } else if (isDraggingDrawerResize) {
        const newWidth = window.innerWidth - e.clientX;
        setDrawerWidth(Math.max(340, Math.min(window.innerWidth * 0.75, newWidth)));
      }
    },
    [isDraggingSplit, isDraggingDrawerResize]
  );

  const handleSplitMouseUp = useCallback(() => {
    setIsDraggingSplit(false);
    setIsDraggingDrawerResize(false);
    if (viewportRef.current) {
      viewportRef.current.handleResize();
    }
  }, []);

  useEffect(() => {
    if (isDraggingSplit || isDraggingDrawerResize) {
      window.addEventListener('mousemove', handleSplitMouseMove);
      window.addEventListener('mouseup', handleSplitMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleSplitMouseMove);
        window.removeEventListener('mouseup', handleSplitMouseUp);
      };
    }
  }, [isDraggingSplit, isDraggingDrawerResize, handleSplitMouseMove, handleSplitMouseUp]);

  // Simulation Actions
  const handleCompileAndRun = async () => {
    if (!coordinatorRef.current || isProcessing) return;
    setIsProcessing(true);
    setCompileErrors([]);

    try {
      const res = await coordinatorRef.current.compileAndRun(code);
      if (!res.success && res.errors) {
        setCompileErrors(res.errors);
        setIsRunning(false);
        setIsPaused(false);
        setIsConsoleCollapsed(false); // auto-expand console on error
      } else {
        setIsRunning(true);
        setIsPaused(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseResume = () => {
    if (!coordinatorRef.current || !isRunning) return;
    if (isPaused) {
      coordinatorRef.current.resume();
      setIsPaused(false);
    } else {
      coordinatorRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    coordinatorRef.current?.stop();
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleReset = () => {
    coordinatorRef.current?.reset();
    viewportRef.current?.resetCamera();
    setIsRunning(false);
    setIsPaused(false);
  };

  const toggleDrawer = () => {
    const next = !isDrawerOpen;
    setIsDrawerOpen(next);
    localStorage.setItem('magicsmoke_drawer_open', String(next));
  };

  const handleWiresChange = () => {
    if (coordinatorRef.current) {
      const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
      setCircuitWarnings(evalRes.circuitWarnings);
    }
  };

  const handleExportJSON = () => {
    if (!coordinatorRef.current) return;
    const project = coordinatorRef.current.exportProject(code);
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coordinatorRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const val = validateProjectDocument(data);
        if (!val.valid) {
          alert(`Invalid project format:\n${val.errors.join('\n')}`);
          return;
        }
        setCode(data.code);
        coordinatorRef.current!.loadProject(data);
        handleWiresChange();
      } catch (err) {
        alert('Could not parse project JSON.');
      }
    };
    reader.readAsText(file);
  };

  const telemetrySummary = `${telemetry.leftRPM} RPM / ${telemetry.rightRPM} RPM | Mode: ${telemetry.modeA}`;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#080b10] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* Top Engineering Toolbar */}
      <header className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e1219] border-b border-[#1b2230] z-40 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00f0ff] font-extrabold tracking-wider text-sm font-mono">MAGICSMOKE</span>
            <span className="text-[10px] bg-[#16202e] text-[#38bdf8] px-1.5 py-0.5 rounded font-mono border border-[#1e293b]">
              v1.0
            </span>
          </div>

          <div className="h-4 w-px bg-[#263143] mx-0.5 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono">
            <Cpu size={13} className="text-[#10b981]" />
            <span className="text-[11px]">ESP32 DevKit V1 (TB6612FNG 2WD)</span>
          </div>
        </div>

        {/* Runtime Lifecycle Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleCompileAndRun}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#00f0ff] hover:bg-[#38bdf8] text-[#080b10] font-bold text-xs font-mono shadow transition-all active:scale-95 disabled:opacity-50"
              title="Compile sketch and execute simulation"
            >
              <Play size={12} fill="currentColor" /> Compile & Run
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePauseResume}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-amber-400 font-bold text-xs font-mono border border-amber-500/30 transition-all active:scale-95"
                title={isPaused ? 'Resume simulation' : 'Pause simulation'}
              >
                {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={handleStop}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ef4444] hover:bg-red-400 text-white font-bold text-xs font-mono shadow transition-all active:scale-95"
                title="Halt simulation"
              >
                <Square size={12} fill="currentColor" /> Stop
              </button>
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151a24] hover:bg-[#1e2634] text-[#cbd5e1] text-xs font-mono border border-[#242f40] transition-colors"
            title="Reset simulation and camera"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <div className="h-4 w-px bg-[#263143] mx-1 hidden md:block" />

          {/* Project Persistence */}
          <button
            onClick={handleExportJSON}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-[#12161f] hover:bg-[#1a212e] text-[#94a3b8] hover:text-[#e2e8f0] text-xs font-mono border border-[#212b3a]"
            title="Export project to JSON"
          >
            <Download size={12} /> Export
          </button>

          <label className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-[#12161f] hover:bg-[#1a212e] text-[#94a3b8] hover:text-[#e2e8f0] text-xs font-mono border border-[#212b3a] cursor-pointer">
            <Upload size={12} /> Import
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {/* Status Indicators & Drawer Toggle Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? isPaused
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-[#10b981] animate-pulse'
                  : 'bg-[#64748b]'
              }`}
            />
            <span
              className={
                isRunning
                  ? isPaused
                    ? 'text-amber-400 font-semibold'
                    : 'text-[#10b981] font-semibold'
                  : 'text-[#64748b]'
              }
            >
              {isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'STOPPED'}
            </span>
          </div>

          {/* 3D Viewport Drawer Toggle Button */}
          <button
            onClick={toggleDrawer}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
              isDrawerOpen
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/50'
                : 'bg-[#151a24] text-[#94a3b8] hover:text-[#e2e8f0] border-[#242f40] hover:border-[#38bdf8]/40'
            }`}
            title="Toggle 3D Simulation Viewport (or press Esc to close)"
          >
            <Box size={13} className={isDrawerOpen ? 'text-[#00f0ff]' : ''} />
            <span className="hidden sm:inline">3D View</span>
            {isDrawerOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </header>

      {/* Narrow Screen Tab Switcher (<880px) */}
      {isNarrowScreen && (
        <div className="flex items-center bg-[#0c1017] border-b border-[#1b2230] text-xs font-mono">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              mobileTab === 'editor'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141923]'
                : 'border-transparent text-[#94a3b8]'
            }`}
          >
            <FileCode size={13} /> Code Editor
          </button>
          <button
            onClick={() => setMobileTab('circuit')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              mobileTab === 'circuit'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141923]'
                : 'border-transparent text-[#94a3b8]'
            }`}
          >
            <Layers size={13} /> Circuit Schematic
          </button>
          <button
            onClick={() => setMobileTab('viewport')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              mobileTab === 'viewport'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141923]'
                : 'border-transparent text-[#94a3b8]'
            }`}
          >
            <Box size={13} /> 3D Robot
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative bg-[#080b10]">
        {/* DESKTOP SPLIT LAYOUT (Code Editor on Left | Circuit Schematic on Right) */}
        {!isNarrowScreen ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Code Editor Panel */}
            <div
              style={{ width: `${editorSplitPct}%` }}
              className="flex flex-col h-full bg-[#0c1017] border-r border-[#1a2230] overflow-hidden"
            >
              <div className="px-3 py-1.5 bg-[#12161f] border-b border-[#1a2230] flex items-center justify-between text-xs font-mono text-[#94a3b8]">
                <div className="flex items-center gap-1.5">
                  <FileCode size={13} className="text-[#00f0ff]" />
                  <span className="font-semibold text-[#cbd5e1]">sketch.ino</span>
                </div>
                <span className="text-[10px] text-[#64748b]">Arduino C++ (ESP32)</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeEditor value={code} onChange={setCode} />
              </div>
            </div>

            {/* Resizable Divider Handle between Editor and Circuit */}
            <div
              onMouseDown={() => setIsDraggingSplit(true)}
              className="w-1.5 bg-[#141924] hover:bg-[#00f0ff] cursor-col-resize transition-colors flex items-center justify-center z-10 select-none group"
              title="Drag to resize panels"
            >
              <div className="w-0.5 h-6 bg-[#2a3547] group-hover:bg-[#00f0ff]" />
            </div>

            {/* Right: Circuit Wiring Schematic Canvas */}
            <div className="flex-1 flex flex-col h-full bg-[#0e1218] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#12161f] border-b border-[#1a2230] flex items-center justify-between text-xs font-mono text-[#94a3b8]">
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className="text-[#10b981]" />
                  <span className="font-semibold text-[#cbd5e1]">Pin-to-Pin Circuit Schematic</span>
                </div>
                <span className="text-[10px] text-[#00f0ff]">Drag pins to wire • Scroll to zoom • Drag background to pan</span>
              </div>
              <div className="flex-1 relative overflow-hidden">
                {coordinatorRef.current && (
                  <CircuitCanvas
                    circuit={coordinatorRef.current.circuit}
                    onWiresChange={handleWiresChange}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* NARROW / MOBILE TAB LAYOUT */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {mobileTab === 'editor' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <CodeEditor value={code} onChange={setCode} />
              </div>
            )}
            {mobileTab === 'circuit' && (
              <div className="flex-1 relative overflow-hidden">
                {coordinatorRef.current && (
                  <CircuitCanvas
                    circuit={coordinatorRef.current.circuit}
                    onWiresChange={handleWiresChange}
                  />
                )}
              </div>
            )}
            {mobileTab === 'viewport' && (
              <div className="flex-1 relative overflow-hidden bg-[#0a0d14]">
                <div ref={viewportContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              </div>
            )}
          </div>
        )}

        {/* 3D SIMULATION DRAWER (Opens smoothly from right edge) */}
        {!isNarrowScreen && (
          <aside
            style={{
              width: isDrawerOpen ? `${drawerWidth}px` : '0px',
            }}
            className={`absolute top-0 right-0 h-full bg-[#0a0d14] border-l border-[#1f2838] shadow-2xl flex flex-col z-30 transition-[width] duration-300 ease-out overflow-hidden ${
              isDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {/* Drawer Resize Handle on Left Edge */}
            {isDrawerOpen && (
              <div
                onMouseDown={() => setIsDraggingDrawerResize(true)}
                className="absolute top-0 left-0 w-2 h-full cursor-ew-resize hover:bg-[#00f0ff] z-40 transition-colors"
                title="Drag to resize 3D Viewport"
              />
            )}

            {/* Drawer Header */}
            <div className="px-3 py-1.5 bg-[#12161f] border-b border-[#1b2331] flex items-center justify-between text-xs font-mono text-[#cbd5e1] select-none">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-[#00f0ff]" />
                <span className="font-semibold">3D Robotics Simulation Viewport</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => viewportRef.current?.resetCamera()}
                  className="px-2 py-0.5 rounded bg-[#1a2230] hover:bg-[#253044] text-[11px] text-[#94a3b8] hover:text-[#e2e8f0]"
                  title="Reset Camera"
                >
                  Reset Cam
                </button>
                <button
                  onClick={toggleDrawer}
                  className="p-1 text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#1f2937]"
                  title="Close 3D Viewport (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Three.js Canvas Container */}
            <div className="flex-1 relative overflow-hidden bg-[#0a0d14]">
              <div ref={viewportContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

              {/* Floating Motor Telemetry HUD */}
              <div className="absolute top-3 left-3 bg-[#10141d]/90 backdrop-blur-md p-2.5 rounded-lg border border-[#222b3a] text-[11px] font-mono space-y-1 pointer-events-none shadow-lg">
                <div className="text-[#00f0ff] font-bold text-xs border-b border-[#1b2332] pb-1 mb-1">
                  MOTOR TELEMETRY
                </div>
                <div className="flex justify-between gap-4 text-[#cbd5e1]">
                  <span>Left (A):</span>
                  <span className="text-[#38bdf8] font-bold">
                    {telemetry.leftRPM} RPM ({telemetry.voltageA}V)
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[#cbd5e1]">
                  <span>Right (B):</span>
                  <span className="text-[#38bdf8] font-bold">
                    {telemetry.rightRPM} RPM ({telemetry.voltageB}V)
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[#94a3b8] text-[10px] pt-0.5">
                  <span>Driver Mode:</span>
                  <span className="text-amber-400 font-semibold">
                    {telemetry.modeA} / {telemetry.modeB}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Persistent Right Edge Arrow Pill to Open 3D Viewport (when closed) */}
        {!isDrawerOpen && !isNarrowScreen && (
          <button
            onClick={toggleDrawer}
            className="absolute top-1/2 right-0 -translate-y-1/2 z-20 flex items-center gap-1 py-4 px-1.5 bg-[#141b27]/95 hover:bg-[#00f0ff] text-[#94a3b8] hover:text-[#080b10] border-l border-y border-[#263347] rounded-l-lg shadow-xl cursor-pointer transition-all hover:pr-2.5 group"
            title="Open 3D Simulation Viewport"
          >
            <ChevronLeft size={16} className="group-hover:scale-125 transition-transform" />
            <span
              className="text-[10px] font-mono font-bold tracking-wider [writing-mode:vertical-rl] rotate-180"
              style={{ letterSpacing: '0.12em' }}
            >
              3D VIEW
            </span>
          </button>
        )}
      </div>

      {/* Collapsible Console Panel (Serial Monitor & Diagnostics) */}
      <div className={`transition-all duration-200 z-30 ${isConsoleCollapsed ? 'h-8' : 'h-40'}`}>
        <ConsolePanel
          logs={serialLogs}
          errors={compileErrors}
          warnings={circuitWarnings}
          isCollapsed={isConsoleCollapsed}
          onToggleCollapse={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
          onClear={() => setSerialLogs([])}
          telemetrySummary={telemetrySummary}
        />
      </div>
    </div>
  );
};
