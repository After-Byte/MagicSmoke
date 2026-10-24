import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationCoordinator } from './simulation/SimulationCoordinator';
import { Robot3DViewport } from './three/Robot3DViewport';
import { CodeEditor } from './editor/CodeEditor';
import { CircuitCanvas } from './circuit/CircuitCanvas';
import { ConsolePanel } from './console/ConsolePanel';
import { LineFollowerLab } from './lab/LineFollowerLab';
import { DEFAULT_SKETCH, createDefaultProject } from './project/defaultProject';
import { ProjectDocument, validateProjectDocument } from './project/types';
import { ComponentInstance, WireConnection } from './circuit/types';
import { MultiLayerDiagnosticSnapshot } from './simulation/Diagnostics';
import { Dashboard } from './dashboard/Dashboard';
import {
  StoredProject,
  getAllStoredProjects,
  saveStoredProject,
  getActiveProjectId,
  setActiveProjectId,
  createStarter2WDRobot,
} from './project/projectStorage';
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
  Home,
  Save,
  Check,
  AlertTriangle,
  Activity,
} from 'lucide-react';

export const App: React.FC = () => {
  const coordinatorRef = useRef<SimulationCoordinator | null>(null);
  const viewportRef = useRef<Robot3DViewport | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Active View State: 'dashboard' vs 'editor' vs 'lab'
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor' | 'lab'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#lab' || window.location.search.includes('view=lab')) {
        return 'lab';
      }
      if (window.location.hash === '#editor' || window.location.search.includes('view=editor')) {
        return 'editor';
      }
      const saved = localStorage.getItem('magicsmoke_active_view');
      if (saved === 'lab' || saved === 'editor') return saved as any;
      return 'dashboard';
    }
    return 'dashboard';
  });

  const [activeProject, setActiveProject] = useState<StoredProject | null>(() => {
    const isLab =
      typeof window !== 'undefined' &&
      (window.location.hash === '#lab' ||
        window.location.search.includes('view=lab') ||
        localStorage.getItem('magicsmoke_active_view') === 'lab');
    const activeId = getActiveProjectId();
    const all = getAllStoredProjects();
    if (activeId) {
      const found = all.find((p) => p.id === activeId);
      if (found) {
        if (!isLab || found.id === 'starter_line_follower_robot' || found.document?.track) {
          return found;
        }
      }
    }
    if (isLab) {
      const lf = all.find((p) => p.id === 'starter_line_follower_robot' || p.name.includes('Line Follower'));
      if (lf) return lf;
    }
    return all[0] || createStarter2WDRobot();
  });

  // Project state
  const [code, setCode] = useState<string>(() => {
    const activeId = getActiveProjectId();
    const all = getAllStoredProjects();
    if (activeId) {
      const found = all.find((p) => p.id === activeId);
      if (found) return found.document.code;
    }
    return (all[0]?.document.code) || DEFAULT_SKETCH;
  });

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Diagnostics & logs
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [circuitWarnings, setCircuitWarnings] = useState<string[]>([]);
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] = useState<MultiLayerDiagnosticSnapshot | undefined>(undefined);

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
    if (activeProject) {
      coord.loadProject(activeProject.document);
    }
    coordinatorRef.current = coord;

    coord.onSerial((text) => {
      setSerialLogs((prev) => [...prev, text]);
    });

    // Main animation & simulation loop
    let animId: number;
    const loop = () => {
      if (coordinatorRef.current) {
        const sim = coordinatorRef.current.tick();

        if (viewportRef.current && viewportRef.current.isAttached()) {
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

        setDiagnosticsSnapshot(sim.diagnostics);

        const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
        setCircuitWarnings(evalRes.circuitWarnings);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      if (viewportRef.current) {
        viewportRef.current.destroy();
        viewportRef.current = null;
      }
    };
  }, []);

  // Mount/Resize 3D Viewport when drawer opens or resizes
  useEffect(() => {
    const isVisible = isDrawerOpen || (isNarrowScreen && mobileTab === 'viewport');
    if (isVisible && viewportContainerRef.current) {
      if (!viewportRef.current || !viewportRef.current.isAttached()) {
        if (viewportRef.current) {
          viewportRef.current.destroy();
          viewportRef.current = null;
        }
        viewportRef.current = new Robot3DViewport(viewportContainerRef.current);
        if (coordinatorRef.current && coordinatorRef.current.track) {
          viewportRef.current.rebuildTrack(coordinatorRef.current.track);
        }
      } else {
        viewportRef.current.handleResize();
        if (coordinatorRef.current && coordinatorRef.current.track) {
          viewportRef.current.rebuildTrack(coordinatorRef.current.track);
        }
      }

      // Smooth handling across the 300ms CSS drawer width transition
      const t1 = setTimeout(() => viewportRef.current?.handleResize(), 60);
      const t2 = setTimeout(() => viewportRef.current?.handleResize(), 160);
      const t3 = setTimeout(() => viewportRef.current?.handleResize(), 320);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
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
    if (viewportRef.current) {
      viewportRef.current.resetCamera();
      if (coordinatorRef.current) {
        viewportRef.current.updateRobot(coordinatorRef.current.chassis.getPose(), 0, 0);
        viewportRef.current.render();
      }
    }
    setIsRunning(false);
    setIsPaused(false);
  };

  const toggleDrawer = () => {
    const next = !isDrawerOpen;
    setIsDrawerOpen(next);
    localStorage.setItem('magicsmoke_drawer_open', String(next));
  };

  const handleOpenProject = (project: StoredProject) => {
    setActiveProject(project);
    setActiveProjectId(project.id);
    setCode(project.document.code);
    if (coordinatorRef.current) {
      coordinatorRef.current.loadProject(project.document);
      const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
      setCircuitWarnings(evalRes.circuitWarnings);
      if (viewportRef.current) {
        viewportRef.current.rebuildTrack(coordinatorRef.current.track);
      }
    }
    setIsDirty(false);
    setCurrentView('editor');
    localStorage.setItem('magicsmoke_active_view', 'editor');
  };

  const handleLaunchLineFollowerLab = (project?: StoredProject) => {
    const all = getAllStoredProjects();
    const target =
      project ||
      all.find((p) => p.id === 'starter_line_follower_robot' || p.id === 'starter_line_follower' || p.name.includes('Line Follower')) ||
      all[0];
    if (target) {
      setActiveProject(target);
      setActiveProjectId(target.id);
      setCode(target.document.code);
    }
    setCurrentView('lab');
    localStorage.setItem('magicsmoke_active_view', 'lab');
  };

  const handleSaveProject = () => {
    if (!coordinatorRef.current || !activeProject) return;
    const currentDoc: ProjectDocument = {
      ...activeProject.document,
      name: activeProject.name,
      code,
      components: coordinatorRef.current.circuit.getAllComponents(),
      wires: coordinatorRef.current.circuit.getAllWires(),
    };

    const updated = saveStoredProject(currentDoc, activeProject.id);
    setActiveProject(updated);
    setIsDirty(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleNavigateToDashboard = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      setCurrentView('dashboard');
      localStorage.setItem('magicsmoke_active_view', 'dashboard');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setIsDirty(true);
  };

  const handleWiresChange = () => {
    setIsDirty(true);
    if (coordinatorRef.current) {
      const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
      setCircuitWarnings(evalRes.circuitWarnings);
    }
  };

  const handleComponentsChange = () => {
    setIsDirty(true);
  };

  const handleExportJSON = () => {
    if (!coordinatorRef.current) return;
    const project = coordinatorRef.current.exportProject(code);
    if (activeProject) project.name = activeProject.name;
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
        const imported = saveStoredProject(data);
        handleOpenProject(imported);
      } catch (err) {
        alert('Could not parse project JSON.');
      }
    };
    reader.readAsText(file);
  };

  const telemetrySummary = `${telemetry.leftRPM} RPM / ${telemetry.rightRPM} RPM | Mode: ${telemetry.modeA}`;

  if (currentView === 'dashboard') {
    return (
      <Dashboard
        onOpenProject={handleOpenProject}
        hasActiveSession={Boolean(activeProject)}
        onReturnToEditor={() => {
          setCurrentView('editor');
          localStorage.setItem('magicsmoke_active_view', 'editor');
        }}
        onLaunchLineFollowerLab={handleLaunchLineFollowerLab}
      />
    );
  }

  if (currentView === 'lab') {
    return (
      <LineFollowerLab
        initialProject={activeProject || undefined}
        onBackToDashboard={() => {
          setCurrentView('dashboard');
          localStorage.setItem('magicsmoke_active_view', 'dashboard');
        }}
        onSaveProject={(savedProj) => {
          setActiveProject(savedProj);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-[#080b10] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* Top Engineering Toolbar */}
      <header className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e1219] border-b border-[#1b2230] z-40 select-none">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleNavigateToDashboard}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#131924] hover:bg-[#1c2434] text-[#38bdf8] hover:text-white border border-[#212c40] text-xs font-mono transition-all mr-0.5"
            title="Return to Projects Dashboard"
            data-testid="back-to-dashboard-btn"
          >
            <Home size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-[#00f0ff] font-extrabold tracking-wider text-sm font-mono">MAGICSMOKE</span>
            <span className="text-[10px] bg-[#16202e] text-[#38bdf8] px-1.5 py-0.5 rounded font-mono border border-[#1e293b]">
              v1.21
            </span>
          </div>

          <div className="h-4 w-px bg-[#263143] mx-0.5 hidden sm:block" />

          {/* Active Project Title with dirty indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#cbd5e1] font-mono">
            <span className="font-semibold max-w-[170px] truncate" title={activeProject?.name}>
              {activeProject?.name || 'Untitled Circuit'}
            </span>
            {isDirty && (
              <span className="text-[10px] text-amber-400 font-mono italic" title="You have unsaved changes">
                • unsaved
              </span>
            )}
            {(activeProject?.document?.board === 'arduino-uno-r3' || activeProject?.name.includes('Line Follower')) && (
              <button
                onClick={() => handleLaunchLineFollowerLab(activeProject || undefined)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 text-[11px] font-mono font-bold transition-all shadow-sm active:scale-95 ml-1.5"
                title="Open in dedicated 3D Line Follower Simulation Lab"
                data-testid="open-in-lab-btn"
              >
                <Activity size={11} />
                <span>Open in Lab</span>
              </button>
            )}
          </div>
        </div>

        {/* Runtime Lifecycle Controls */}
        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={handleSaveProject}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
              saveToast
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : isDirty
                ? 'bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border-[#00f0ff]/50 font-bold animate-pulse'
                : 'bg-[#12161f] hover:bg-[#1a212e] text-[#94a3b8] hover:text-[#e2e8f0] border-[#212b3a]'
            }`}
            title="Save circuit and sketch changes"
            data-testid="save-project-btn"
          >
            {saveToast ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
            <span>{saveToast ? 'Saved!' : 'Save'}</span>
          </button>

          <div className="h-4 w-px bg-[#263143] mx-0.5 hidden md:block" />

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

          {/* Project Export/Import */}
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
                <CodeEditor value={code} onChange={handleCodeChange} />
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
                    onComponentsChange={handleComponentsChange}
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
                <CodeEditor value={code} onChange={handleCodeChange} />
              </div>
            )}
            {mobileTab === 'circuit' && (
              <div className="flex-1 relative overflow-hidden">
                {coordinatorRef.current && (
                  <CircuitCanvas
                    circuit={coordinatorRef.current.circuit}
                    onWiresChange={handleWiresChange}
                    onComponentsChange={handleComponentsChange}
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
          diagnostics={diagnosticsSnapshot}
        />
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-[#24334a] rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <h3 className="font-bold text-sm text-[#f1f5f9] font-mono">Unsaved Changes</h3>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed font-mono">
              You have unsaved changes to this circuit or sketch. Would you like to save your work before returning to the dashboard?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-[#1c2738] font-mono text-xs">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#172030] hover:bg-[#202c42] text-[#cbd5e1] transition-colors"
                data-testid="keep-editing-btn"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setIsDirty(false);
                  setShowExitConfirm(false);
                  setCurrentView('dashboard');
                  localStorage.setItem('magicsmoke_active_view', 'dashboard');
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#1e293b] hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-800/40 transition-colors"
                data-testid="discard-and-exit-btn"
              >
                Discard & Return
              </button>
              <button
                onClick={() => {
                  handleSaveProject();
                  setShowExitConfirm(false);
                  setCurrentView('dashboard');
                  localStorage.setItem('magicsmoke_active_view', 'dashboard');
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#00f0ff] hover:bg-[#38bdf8] text-[#070a10] font-bold transition-all"
                data-testid="save-and-exit-btn"
              >
                Save & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
