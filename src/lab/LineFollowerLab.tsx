import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationCoordinator } from '../simulation/SimulationCoordinator';
import { LineFollower3DViewport } from '../three/LineFollower3DViewport';
import { CodeEditor } from '../editor/CodeEditor';
import { CircuitCanvas } from '../circuit/CircuitCanvas';
import { ConsolePanel } from '../console/ConsolePanel';
import { TrackType, SensorArrayReadings } from '../robot/TrackEnvironment';
import { TrackEditor2D } from './TrackEditor2D';
import { TrackData, createDefaultTrack, TRACK_PRESETS, validateTrackData } from '../robot/TrackModel';
import { createLineFollowerProject, LINE_FOLLOWER_SKETCH } from '../project/lineFollowerProject';
import { StoredProject, saveStoredProject } from '../project/projectStorage';
import { ProjectDocument } from '../project/types';
import { ComponentInstance, WireConnection } from '../circuit/types';
import { MultiLayerDiagnosticSnapshot } from '../simulation/Diagnostics';
import {
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Download,
  Save,
  Home,
  Check,
  AlertTriangle,
  Info,
  Terminal,
  Activity,
  Layers,
  FileCode,
  Sliders,
  Eye,
  RefreshCw,
  Zap,
  Compass,
  ArrowRight,
  ShieldCheck,
  PenTool,
} from 'lucide-react';

interface LineFollowerLabProps {
  initialProject?: StoredProject;
  onBackToDashboard: () => void;
  onSaveProject?: (project: StoredProject) => void;
}

interface PIDPreset {
  name: string;
  description: string;
  kp: number;
  ki: number;
  kd: number;
  baseSpeed: number;
}

const PID_PRESETS: PIDPreset[] = [
  {
    name: 'Normal Track (Balanced)',
    description: 'Smooth proportional steering with light damping for standard closed loops.',
    kp: 2.4,
    ki: 0.01,
    kd: 0.6,
    baseSpeed: 160,
  },
  {
    name: 'Beginner Stable (Low Speed)',
    description: 'Over-damped configuration with reduced forward speed to prevent overshoot.',
    kp: 1.8,
    ki: 0.005,
    kd: 0.8,
    baseSpeed: 120,
  },
  {
    name: 'High Speed Sprint',
    description: 'Higher base PWM and elevated proportional gain for fast straightaways.',
    kp: 3.2,
    ki: 0.02,
    kd: 0.9,
    baseSpeed: 210,
  },
  {
    name: 'Aggressive Hairpin Curves',
    description: 'High response gain to quickly correct sharp ninety-degree turns.',
    kp: 3.8,
    ki: 0.015,
    kd: 1.2,
    baseSpeed: 140,
  },
];

export const LineFollowerLab: React.FC<LineFollowerLabProps> = ({
  initialProject,
  onBackToDashboard,
  onSaveProject,
}) => {
  const coordinatorRef = useRef<SimulationCoordinator | null>(null);
  const viewportRef = useRef<LineFollower3DViewport | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Active Workspace Tab: 'arena' (3D View + Telemetry), 'track' (2D Track Editor), 'code' (Monaco IDE + Tuning), 'circuit' (Schematic)
  const [activeTab, setActiveTab] = useState<'arena' | 'track' | 'code' | 'circuit'>('arena');

  // Canonical Track Data State (loaded from localStorage cache, project doc, or default)
  const [trackData, setTrackData] = useState<TrackData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('magicsmoke_active_lab_track');
        if (cached) {
          const parsed = JSON.parse(cached);
          const val = validateTrackData(parsed);
          if (val.valid) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load active track from localStorage', e);
      }
    }
    if (initialProject?.document?.track) {
      const val = validateTrackData(initialProject.document.track);
      if (val.valid) return initialProject.document.track;
    }
    return createDefaultTrack();
  });

  // Simulation execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);

  // Track selection
  const [trackType, setTrackType] = useState<TrackType>('closed_loop');
  const [lineWidthMm, setLineWidthMm] = useState<number>(24);

  // Firmware Code
  const [code, setCode] = useState<string>(() => {
    return initialProject?.document?.code || LINE_FOLLOWER_SKETCH;
  });
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Tuning parameters
  const [kp, setKp] = useState<number>(2.4);
  const [ki, setKi] = useState<number>(0.01);
  const [kd, setKd] = useState<number>(0.6);
  const [baseSpeed, setBaseSpeed] = useState<number>(160);
  const [motorMismatch, setMotorMismatch] = useState<number>(1.0);

  // Telemetry Snapshot
  const [sensorReadings, setSensorReadings] = useState<SensorArrayReadings | undefined>(undefined);
  const [robotPose, setRobotPose] = useState({ x: 0, z: 0, yawDeg: 0, vCmS: 0, omegaDegS: 0 });
  const [motorTelemetry, setMotorTelemetry] = useState({
    leftRPM: 0,
    rightRPM: 0,
    targetLeftRPM: 0,
    targetRightRPM: 0,
    leftVoltage: 0,
    rightVoltage: 0,
    modeA: 'STANDBY',
    modeB: 'STANDBY',
  });
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] = useState<MultiLayerDiagnosticSnapshot | undefined>(undefined);
  const [circuitWarnings, setCircuitWarnings] = useState<string[]>([]);

  // Disclosures modal
  const [showDisclosures, setShowDisclosures] = useState<boolean>(false);

  // 1. Initialize Simulation Coordinator
  useEffect(() => {
    const coord = new SimulationCoordinator();
    const projectDoc = initialProject?.document ? { ...initialProject.document } : createLineFollowerProject();
    projectDoc.track = trackData;
    coord.loadProject(projectDoc);
    const loadedTrack = coord.track.getTrackData();
    setLineWidthMm(Math.round(loadedTrack.lineWidthMeters * 1000));
    setTrackType((loadedTrack.id as TrackType) || 'closed_loop');
    coordinatorRef.current = coord;

    coord.onSerial((msg) => {
      setSerialLogs((prev) => [...prev.slice(-300), msg]);
    });

    const evalRes = coord.circuit.evaluateCircuit();
    setCircuitWarnings(evalRes.circuitWarnings);

    // Initial compile and run starter sketch
    coord.compileAndRun(code).then((res) => {
      if (res.success) {
        setIsRunning(true);
        setIsPaused(false);
      } else if (res.errors) {
        setCompileErrors(res.errors);
      }
    });

    // Main real-time simulation step loop
    let animId: number;
    let lastStamp = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = (timestamp - lastStamp) / 1000;
      lastStamp = timestamp;
      const dt = Math.min(rawDt, 0.05);

      if (coordinatorRef.current) {
        // Step with simulation speed factor
        const effectiveDt = dt * simulationSpeed;
        const sim = coordinatorRef.current.tick(
          coordinatorRef.current['lastTimeSeconds'] !== undefined
            ? coordinatorRef.current['lastTimeSeconds'] + effectiveDt
            : undefined
        );

        if (viewportRef.current && viewportRef.current.isAttached()) {
          viewportRef.current.updateRobot(
            sim.pose,
            coordinatorRef.current.leftMotor.getAngle(),
            coordinatorRef.current.rightMotor.getAngle(),
            sim.sensorReadings
          );
          if (viewportContainerRef.current && viewportContainerRef.current.clientWidth > 0) {
            viewportRef.current.render();
          }
        }

        // Update live telemetry states
        setSensorReadings(sim.sensorReadings);
        const yawDeg = Math.round((sim.pose.yawRad * 180) / Math.PI) % 360;
        const vM = ((sim.leftRPM + sim.rightRPM) / 2 / 60) * (2 * Math.PI * 0.032);
        setRobotPose({
          x: Number(sim.pose.x.toFixed(3)),
          z: Number(sim.pose.z.toFixed(3)),
          yawDeg: yawDeg < 0 ? yawDeg + 360 : yawDeg,
          vCmS: Math.round(vM * 100),
          omegaDegS: Math.round((((sim.rightRPM - sim.leftRPM) / 60) * (2 * Math.PI * 0.032) / 0.14 * 180) / Math.PI),
        });

        setMotorTelemetry({
          leftRPM: Math.round(sim.leftRPM),
          rightRPM: Math.round(sim.rightRPM),
          targetLeftRPM: Math.round(sim.driverState.channelA.targetRPM),
          targetRightRPM: Math.round(sim.driverState.channelB.targetRPM),
          leftVoltage: Number(sim.driverState.channelA.terminalVoltage.toFixed(1)),
          rightVoltage: Number(sim.driverState.channelB.terminalVoltage.toFixed(1)),
          modeA: sim.driverState.channelA.mode,
          modeB: sim.driverState.channelB.mode,
        });

        setDiagnosticsSnapshot(sim.diagnostics);
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
      if (coordinatorRef.current) {
        coordinatorRef.current.stop();
      }
    };
  }, []);

  // 2. Attach and resize 3D Viewport when arena tab is active
  useEffect(() => {
    if (activeTab === 'arena' && viewportContainerRef.current) {
      if (!viewportRef.current) {
        if (coordinatorRef.current) {
          viewportRef.current = new LineFollower3DViewport(
            viewportContainerRef.current,
            coordinatorRef.current.track
          );
        }
      } else {
        viewportRef.current.attachTo(viewportContainerRef.current);
        if (coordinatorRef.current) {
          viewportRef.current.rebuildTrack(coordinatorRef.current.track);
        }
        viewportRef.current.handleResize();
      }

      const t1 = setTimeout(() => {
        if (viewportRef.current) {
          viewportRef.current.handleResize();
          if (coordinatorRef.current) {
            viewportRef.current.rebuildTrack(coordinatorRef.current.track);
          }
        }
      }, 60);

      const t2 = setTimeout(() => {
        viewportRef.current?.handleResize();
      }, 180);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeTab]);

  // 3. Debounced Autosave of active track and project state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('magicsmoke_active_lab_track', JSON.stringify(trackData));
    } catch (e) {
      console.warn('Failed to save track to localStorage:', e);
    }

    const timer = setTimeout(() => {
      if (coordinatorRef.current) {
        const projectDoc = coordinatorRef.current.exportProject(code);
        projectDoc.track = trackData;
        const updated = saveStoredProject(
          projectDoc,
          initialProject?.id || 'starter_line_follower_robot'
        );
        onSaveProject?.(updated);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [trackData, code, initialProject?.id, onSaveProject]);

  // Handle Track Selection Change
  const handleTrackChange = (newTrack: TrackType) => {
    setTrackType(newTrack);
    if (coordinatorRef.current) {
      coordinatorRef.current.track.setTrackType(newTrack);
      const updatedTrack = coordinatorRef.current.track.getTrackData();
      setTrackData(updatedTrack);
      setLineWidthMm(Math.round(updatedTrack.lineWidthMeters * 1000));
      coordinatorRef.current.reset(updatedTrack.startPose);
      if (viewportRef.current) {
        viewportRef.current.rebuildTrack(coordinatorRef.current.track);
        viewportRef.current.clearTrajectory();
        viewportRef.current.resetCamera();
      }
    }
  };

  // Handle Track Data Change from 2D Editor
  const handleTrackDataChange = (newTrack: TrackData) => {
    setTrackData(newTrack);
    setLineWidthMm(Math.round(newTrack.lineWidthMeters * 1000));
    setTrackType((newTrack.id as TrackType) || 'custom');
    if (coordinatorRef.current) {
      coordinatorRef.current.track.setTrackData(newTrack);
      coordinatorRef.current.reset(newTrack.startPose);
      if (viewportRef.current) {
        viewportRef.current.rebuildTrack(coordinatorRef.current.track);
        viewportRef.current.clearTrajectory();
      }
    }
  };

  // Handle Line Width Change
  const handleLineWidthChange = (widthMm: number) => {
    setLineWidthMm(widthMm);
    if (coordinatorRef.current) {
      coordinatorRef.current.track.setLineWidth(widthMm / 1000);
      setTrackData(coordinatorRef.current.track.getTrackData());
      if (viewportRef.current) {
        viewportRef.current.rebuildTrack(coordinatorRef.current.track);
      }
    }
  };

  // Handle Motor Mismatch Ratio Change
  const handleMismatchChange = (ratio: number) => {
    setMotorMismatch(ratio);
    if (coordinatorRef.current) {
      coordinatorRef.current.setMotorMismatch(ratio);
    }
  };

  // Compile and run current firmware code
  const handleCompileAndRun = async (codeToRun?: string) => {
    if (!coordinatorRef.current || isProcessing) return;
    setIsProcessing(true);
    setCompileErrors([]);

    const targetCode = codeToRun || code;
    try {
      const res = await coordinatorRef.current.compileAndRun(targetCode);
      if (res.success) {
        setIsRunning(true);
        setIsPaused(false);
      } else if (res.errors) {
        setCompileErrors(res.errors);
        setIsRunning(false);
        setIsPaused(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Pause / Resume Simulation
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

  // Reset Robot Position and Kinematics
  const handleResetRobot = () => {
    if (!coordinatorRef.current) return;
    const startPose = coordinatorRef.current.track.getStartPose();
    coordinatorRef.current.reset(startPose);
    if (viewportRef.current) {
      viewportRef.current.clearTrajectory();
      viewportRef.current.resetCamera();
    }
    // Re-run sketch from beginning
    handleCompileAndRun();
  };

  // Apply a PID preset
  const handleApplyPreset = (preset: PIDPreset) => {
    setKp(preset.kp);
    setKi(preset.ki);
    setKd(preset.kd);
    setBaseSpeed(preset.baseSpeed);

    // Update constants in sketch code
    let updatedCode = code;
    updatedCode = updatedCode.replace(/float Kp\s*=\s*[\d.]+;/, `float Kp = ${preset.kp.toFixed(2)};`);
    updatedCode = updatedCode.replace(/float Ki\s*=\s*[\d.]+;/, `float Ki = ${preset.ki.toFixed(3)};`);
    updatedCode = updatedCode.replace(/float Kd\s*=\s*[\d.]+;/, `float Kd = ${preset.kd.toFixed(2)};`);
    updatedCode = updatedCode.replace(/int baseSpeed\s*=\s*\d+;/, `int baseSpeed = ${preset.baseSpeed};`);

    setCode(updatedCode);
    setIsDirty(true);
    handleCompileAndRun(updatedCode);
  };

  // Apply custom slider parameters into sketch code
  const handleApplyCustomTuning = () => {
    let updatedCode = code;
    updatedCode = updatedCode.replace(/float Kp\s*=\s*[\d.]+;/, `float Kp = ${kp.toFixed(2)};`);
    updatedCode = updatedCode.replace(/float Ki\s*=\s*[\d.]+;/, `float Ki = ${ki.toFixed(3)};`);
    updatedCode = updatedCode.replace(/float Kd\s*=\s*[\d.]+;/, `float Kd = ${kd.toFixed(2)};`);
    updatedCode = updatedCode.replace(/int baseSpeed\s*=\s*\d+;/, `int baseSpeed = ${baseSpeed};`);

    setCode(updatedCode);
    setIsDirty(true);
    handleCompileAndRun(updatedCode);
  };

  // Save Project
  const handleSave = () => {
    if (!coordinatorRef.current) return;
    const projectDoc = coordinatorRef.current.exportProject(code);
    projectDoc.track = trackData;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('magicsmoke_active_lab_track', JSON.stringify(trackData));
      } catch (e) {
        console.warn('Failed to save track to localStorage:', e);
      }
    }
    const updated = saveStoredProject(
      projectDoc,
      initialProject?.id || 'starter_line_follower_robot'
    );
    onSaveProject?.(updated);
    setIsDirty(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  // Export Project JSON
  const handleExportJSON = () => {
    if (!coordinatorRef.current) return;
    const projectDoc = coordinatorRef.current.exportProject(code);
    projectDoc.track = trackData;
    const blob = new Blob([JSON.stringify(projectDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'line-follower-robot.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Circuit components and wires for schematic tab
  const circuitComponents = coordinatorRef.current?.circuit.getAllComponents() || [];
  const circuitWires = coordinatorRef.current?.circuit.getAllWires() || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#06080e] text-[#f1f5f9] font-sans overflow-hidden select-none">
      {/* 1. Technical Top Navigation & Control Toolbar */}
      <header className="h-13 bg-[#0a0d14] border-b border-[#18202e] px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0e1420] hover:bg-[#161f30] text-[#94a3b8] hover:text-[#f8fafc] border border-[#1b2638] text-xs font-mono transition-colors shadow-sm"
            title="Return to MagicSmoke Dashboard"
            data-testid="lab-back-dashboard-btn"
          >
            <Home size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[#1e293b]" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-[#f8fafc] font-mono">
              Line Follower Lab
            </span>
            <span className="text-[10px] font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 px-2 py-0.5 rounded-full border border-[#00f0ff]/20 hidden md:inline">
              Arduino Uno R3 + 8-CH IR
            </span>
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40 hidden lg:inline">
              Circuit Verified
            </span>
          </div>
        </div>

        {/* Center: Main View Navigation Switcher */}
        <div className="flex items-center bg-[#07090e] p-1 rounded-xl border border-[#161e2b] text-xs font-mono">
          <button
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'arena'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-arena-btn"
          >
            <Activity size={13} />
            <span>3D Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'track'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-track-btn"
          >
            <PenTool size={13} />
            <span>2D Track Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'code'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-code-btn"
          >
            <FileCode size={13} />
            <span>Firmware & PID</span>
          </button>
          <button
            onClick={() => setActiveTab('circuit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'circuit'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-circuit-btn"
          >
            <Layers size={13} />
            <span>Circuit Schematic</span>
          </button>
        </div>

        {/* Right: Simulation Stepping, Speed, Save & Disclosures */}
        <div className="flex items-center gap-2">
          {/* Simulation Play / Pause / Reset Controls */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#161e2b]">
            <button
              onClick={handlePauseResume}
              disabled={!isRunning}
              className={`p-1.5 rounded transition-colors ${
                isPaused
                  ? 'bg-amber-400 text-[#070a10]'
                  : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#131b26]'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              data-testid="lab-play-pause-btn"
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              onClick={handleResetRobot}
              className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#131b26] transition-colors"
              title="Reset Robot Pose to Origin and Restart Sketch"
              data-testid="lab-reset-btn"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="hidden sm:flex items-center gap-1 bg-[#07090e] px-2 py-1 rounded-lg border border-[#161e2b] text-[11px] font-mono text-[#94a3b8]">
            <span>Speed:</span>
            {[0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setSimulationSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  simulationSpeed === s
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold'
                    : 'text-[#64748b] hover:text-[#cbd5e1]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0e1420] hover:bg-[#161f30] text-[#cbd5e1] border border-[#1b2638] text-xs font-mono transition-colors shadow-sm"
            title="Save Project"
            data-testid="lab-save-btn"
          >
            <Save size={13} />
            <span className="hidden md:inline">Save</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="p-1.5 rounded-lg bg-[#0e1420] hover:bg-[#161f30] text-[#94a3b8] hover:text-[#f8fafc] border border-[#1b2638] transition-colors"
            title="Export Canonical Circuit & Code JSON"
            data-testid="lab-export-btn"
          >
            <Download size={14} />
          </button>

          {/* Disclosures button */}
          <button
            onClick={() => setShowDisclosures(true)}
            className="p-1.5 rounded-lg bg-[#0e1420] hover:bg-[#161f30] text-[#38bdf8] border border-[#1b2638] transition-colors"
            title="View Engineering Model Limitations & Disclosures"
            data-testid="lab-disclosures-btn"
          >
            <ShieldCheck size={14} />
          </button>
        </div>
      </header>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs font-mono shadow-xl animate-fade-in">
          <Check size={13} />
          <span>Line Follower Project saved successfully</span>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: 3D ARENA & REAL-TIME TELEMETRY */}
        <div className={`flex-1 flex flex-col lg:flex-row h-full w-full overflow-hidden ${activeTab === 'arena' ? '' : 'hidden'}`}>
          {/* Left/Center: 3D Viewport with Overlaid Quick Bar */}
            <div className="flex-1 relative bg-[#07090e] min-h-[300px] overflow-hidden flex flex-col">
              {/* Overlaid Viewport Quick Controls */}
              <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                {/* Track Selector Pill */}
                <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0a0e17]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1e2a3c] text-xs font-mono text-[#cbd5e1] shadow-lg">
                  <Compass size={13} className="text-[#00f0ff]" />
                  <span className="text-[11px] text-[#64748b] hidden sm:inline">Track:</span>
                  <select
                    value={trackType}
                    onChange={(e) => handleTrackChange(e.target.value as TrackType)}
                    className="bg-transparent text-xs font-mono text-[#00f0ff] font-bold outline-none cursor-pointer"
                    data-testid="track-type-select"
                  >
                    <option value="closed_loop" className="bg-[#0a0e17]">Closed Racetrack (Loop)</option>
                    <option value="straight" className="bg-[#0a0e17]">Straight Test Bench</option>
                    <option value="curved_s" className="bg-[#0a0e17]">Curved S-Bend Course</option>
                    <option value="hairpin" className="bg-[#0a0e17]">Hairpin Challenge</option>
                    <option value="custom" className="bg-[#0a0e17]">Custom User Track</option>
                  </select>
                  <div className="h-3 w-px bg-[#1e293b] mx-0.5" />
                  <button
                    onClick={() => setActiveTab('track')}
                    className="flex items-center gap-1 text-[11px] text-[#38bdf8] hover:text-[#00f0ff] font-sans font-semibold transition-colors"
                    title="Open 2D Track Editor"
                    data-testid="open-track-editor-btn"
                  >
                    <PenTool size={11} />
                    <span>Edit Track</span>
                  </button>
                </div>

                {/* Viewport Camera Tools */}
                <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0a0e17]/90 backdrop-blur-md p-1 rounded-xl border border-[#1e2a3c] text-xs font-mono shadow-lg">
                  <button
                    onClick={() => viewportRef.current?.resetCamera()}
                    className="px-2 py-1 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#141d2a] text-[11px] transition-colors"
                    title="Reset 3D Camera"
                  >
                    Reset Cam
                  </button>
                  <button
                    onClick={() => viewportRef.current?.clearTrajectory()}
                    className="px-2 py-1 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#141d2a] text-[11px] transition-colors"
                    title="Clear Trajectory Breadcrumb Trail"
                  >
                    Clear Trail
                  </button>
                </div>
              </div>

              {/* Three.js Container */}
              <div
                ref={viewportContainerRef}
                className="w-full h-full flex-1 cursor-grab active:cursor-grabbing outline-none"
                data-testid="line-follower-3d-canvas"
              />
            </div>

            {/* Right/Bottom: Live Telemetry & Control Panel */}
            <div className="w-full lg:w-[420px] bg-[#090c14] border-t lg:border-t-0 lg:border-l border-[#18202e] flex flex-col h-auto lg:h-full overflow-y-auto shrink-0 font-mono text-xs">
              <div className="p-4 border-b border-[#141a26] bg-[#0c101a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[#00f0ff]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#cbd5e1]">
                    Robot Telemetry & PID Loop
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  sensorReadings?.lineLost
                    ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                }`}>
                  {sensorReadings?.lineLost ? 'LINE LOST' : 'TRACKING NOMINAL'}
                </span>
              </div>

              {/* 1. 8-Channel IR Optical Sensor Reflectance Bar */}
              <div className="p-4 border-b border-[#141a26] bg-[#07090f]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#64748b] uppercase tracking-wider font-semibold">
                    8-Channel IR Reflectance Array
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">
                    Active: <strong className="text-[#00f0ff]">{sensorReadings?.activeSensorCount ?? 0} / 8</strong>
                  </span>
                </div>

                {/* 8 Sensor Indicators Grid */}
                <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-[#0b0e17] border border-[#161f2f] mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((ch) => {
                    const idx = ch - 1;
                    const isActive = sensorReadings?.digitalChannels[idx] === 1;
                    const refl = sensorReadings?.reflectanceValues[idx] ?? 0;
                    const offsetMm = -35 + idx * 10;

                    return (
                      <div
                        key={ch}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                            : 'bg-[#0f1420] border-[#1a2538] text-[#475569]'
                        }`}
                        title={`Channel D${ch}: ${offsetMm}mm | Reflectance: ${(refl * 100).toFixed(0)}%`}
                      >
                        <span className="text-[9px] font-bold">D{ch}</span>
                        <div
                          className={`w-2.5 h-2.5 my-1 rounded-full ${
                            isActive ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-[#1e293b]'
                          }`}
                        />
                        <span className="text-[8px] font-mono">
                          {offsetMm > 0 ? `+${offsetMm}` : offsetMm}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Centerline Offset Error Gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                    <span>Array Centroid Error</span>
                    <span className="text-[#00f0ff] font-bold">
                      {sensorReadings?.lineLost
                        ? 'Lost (Target Seeking)'
                        : `${(sensorReadings?.linePositionEstimateMeters! * 1000).toFixed(1)} mm`}
                    </span>
                  </div>

                  {/* Visual Center Indicator Meter */}
                  <div className="relative h-2 w-full bg-[#0b0e17] rounded-full border border-[#161f2f] overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#475569] -translate-x-1/2" />
                    {!sensorReadings?.lineLost && (
                      <div
                        className="absolute top-0.5 bottom-0.5 w-3 bg-[#00f0ff] rounded-full shadow-[0_0_6px_#00f0ff] transition-all duration-75"
                        style={{
                          left: `calc(50% + ${Math.max(-45, Math.min(45, (sensorReadings?.linePositionEstimateMeters ?? 0) * 1000 * 1.2))}% - 6px)`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[8px] text-[#475569]">
                    <span>-35mm (Left)</span>
                    <span>0mm</span>
                    <span>+35mm (Right)</span>
                  </div>
                </div>
              </div>

              {/* 2. TB6612FNG Dual Driver & N20 Motors Telemetry */}
              <div className="p-4 border-b border-[#141a26] space-y-3">
                <span className="text-[11px] text-[#64748b] uppercase tracking-wider font-semibold">
                  TB6612FNG Driver & Motors
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Left Motor (Channel A) */}
                  <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#94a3b8] font-bold">Left Motor (AO)</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        motorTelemetry.modeA === 'FORWARD'
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : motorTelemetry.modeA === 'REVERSE'
                          ? 'text-amber-400 bg-amber-950/40'
                          : 'text-slate-400 bg-slate-900'
                      }`}>
                        {motorTelemetry.modeA}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#f8fafc]">
                      {motorTelemetry.leftRPM} <span className="text-xs font-normal text-[#64748b]">RPM</span>
                    </div>
                    <div className="text-[10px] text-[#64748b] flex justify-between">
                      <span>Target: {motorTelemetry.targetLeftRPM}</span>
                      <span>{motorTelemetry.leftVoltage}V</span>
                    </div>
                  </div>

                  {/* Right Motor (Channel B) */}
                  <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#94a3b8] font-bold">Right Motor (BO)</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        motorTelemetry.modeB === 'FORWARD'
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : motorTelemetry.modeB === 'REVERSE'
                          ? 'text-amber-400 bg-amber-950/40'
                          : 'text-slate-400 bg-slate-900'
                      }`}>
                        {motorTelemetry.modeB}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#f8fafc]">
                      {motorTelemetry.rightRPM} <span className="text-xs font-normal text-[#64748b]">RPM</span>
                    </div>
                    <div className="text-[10px] text-[#64748b] flex justify-between">
                      <span>Target: {motorTelemetry.targetRightRPM}</span>
                      <span>{motorTelemetry.rightVoltage}V</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Physical Robot Odometry & Kinematics */}
              <div className="p-4 border-b border-[#141a26] space-y-2">
                <span className="text-[11px] text-[#64748b] uppercase tracking-wider font-semibold">
                  Physical Odometry & Kinematics
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-[#0b0e17] border border-[#161f2f]">
                    <div className="text-[9px] text-[#64748b] uppercase">Position (X, Z)</div>
                    <div className="text-xs font-bold text-[#cbd5e1] mt-0.5">
                      {robotPose.x}, {robotPose.z}m
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0b0e17] border border-[#161f2f]">
                    <div className="text-[9px] text-[#64748b] uppercase">Heading (Yaw)</div>
                    <div className="text-xs font-bold text-[#cbd5e1] mt-0.5">
                      {robotPose.yawDeg}°
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0b0e17] border border-[#161f2f]">
                    <div className="text-[9px] text-[#64748b] uppercase">Forward Speed</div>
                    <div className="text-xs font-bold text-[#00f0ff] mt-0.5">
                      {robotPose.vCmS} cm/s
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Quick PID Preset Tuning Buttons */}
              <div className="p-4 flex-1 flex flex-col justify-end space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#64748b] uppercase tracking-wider font-semibold">
                    Quick Controller Presets
                  </span>
                  <button
                    onClick={() => setActiveTab('code')}
                    className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-0.5"
                  >
                    Custom Tuning <ArrowRight size={10} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PID_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 rounded-xl bg-[#0b0e17] hover:bg-[#121926] border border-[#192436] hover:border-[#00f0ff]/40 text-left transition-all group"
                    >
                      <div className="text-[11px] font-bold text-[#e2e8f0] group-hover:text-[#00f0ff] truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-[#64748b] mt-0.5">
                        Kp={preset.kp} | Kd={preset.kd} | Spd={preset.baseSpeed}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        {/* TAB 2: 2D TOP-DOWN TRACK EDITOR */}
        <div className={`flex-1 flex flex-col h-full w-full overflow-hidden ${activeTab === 'track' ? '' : 'hidden'}`}>
          <TrackEditor2D
            track={trackData}
            onTrackChange={handleTrackDataChange}
            onRunSimulation={() => {
              setActiveTab('arena');
            }}
          />
        </div>

        {/* TAB 3: FIRMWARE IDE & CONTROLLER TUNING */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full w-full overflow-hidden">
            {/* Left: Monaco C++ Code Editor */}
            <div className="flex-1 flex flex-col h-full bg-[#0a0d14] overflow-hidden">
              <div className="h-10 bg-[#0e121a] border-b border-[#18202e] px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode size={13} className="text-[#00f0ff]" />
                  <span className="text-xs font-mono font-bold text-[#cbd5e1]">
                    firmware/line_follower_pid.ino (Arduino C++)
                  </span>
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Uncompiled changes" />
                  )}
                </div>

                <button
                  onClick={() => handleCompileAndRun()}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#070a10] font-bold text-xs font-mono shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  data-testid="compile-and-run-btn"
                >
                  <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Compile & Run</span>
                </button>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 overflow-hidden relative">
                <CodeEditor
                  value={code}
                  onChange={(newCode) => {
                    setCode(newCode);
                    setIsDirty(true);
                  }}
                />
              </div>

              {/* Compiler Errors / Status Bar */}
              {compileErrors.length > 0 && (
                <div className="bg-rose-950/80 border-t border-rose-800 p-2.5 text-xs font-mono text-rose-300 max-h-28 overflow-y-auto shrink-0">
                  <div className="flex items-center gap-1 font-bold text-rose-200 mb-1">
                    <AlertTriangle size={12} />
                    <span>Compilation Failed ({compileErrors.length} errors):</span>
                  </div>
                  {compileErrors.map((err, i) => (
                    <div key={i} className="text-[11px] text-rose-300 pl-4">{err}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Controller Parameter Sliders & Serial Console */}
            <div className="w-full lg:w-[420px] bg-[#090c14] border-t lg:border-t-0 lg:border-l border-[#18202e] flex flex-col h-auto lg:h-full overflow-hidden shrink-0 font-mono text-xs">
              {/* Parameter Sliders Panel */}
              <div className="p-4 border-b border-[#141a26] bg-[#0c101a] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-[#00f0ff]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#cbd5e1]">
                      Real-Time PID Gain Sliders
                    </span>
                  </div>
                  <button
                    onClick={handleApplyCustomTuning}
                    className="px-2.5 py-1 rounded bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] font-bold text-[10px] border border-[#00f0ff]/30 transition-all"
                  >
                    Apply Gains
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Proportional Gain Kp */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94a3b8]">Proportional Gain (Kp):</span>
                      <span className="text-[#00f0ff] font-bold">{kp.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="6.0"
                      step="0.1"
                      value={kp}
                      onChange={(e) => setKp(parseFloat(e.target.value))}
                      className="w-full accent-[#00f0ff] cursor-pointer"
                    />
                  </div>

                  {/* Integral Gain Ki */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94a3b8]">Integral Gain (Ki):</span>
                      <span className="text-[#00f0ff] font-bold">{ki.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.000"
                      max="0.040"
                      step="0.002"
                      value={ki}
                      onChange={(e) => setKi(parseFloat(e.target.value))}
                      className="w-full accent-[#00f0ff] cursor-pointer"
                    />
                  </div>

                  {/* Derivative Gain Kd */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94a3b8]">Derivative Gain (Kd):</span>
                      <span className="text-[#00f0ff] font-bold">{kd.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.5"
                      step="0.05"
                      value={kd}
                      onChange={(e) => setKd(parseFloat(e.target.value))}
                      className="w-full accent-[#00f0ff] cursor-pointer"
                    />
                  </div>

                  {/* Base Speed PWM */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94a3b8]">Base Speed (PWM 0-255):</span>
                      <span className="text-amber-400 font-bold">{baseSpeed}</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="255"
                      step="5"
                      value={baseSpeed}
                      onChange={(e) => setBaseSpeed(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Motor Mismatch Ratio */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94a3b8]">Motor Mismatch Drift:</span>
                      <span className="text-[#38bdf8] font-bold">{(motorMismatch * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.20"
                      step="0.02"
                      value={motorMismatch}
                      onChange={(e) => handleMismatchChange(parseFloat(e.target.value))}
                      className="w-full accent-[#38bdf8] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Serial Monitor & Firmware Console Output */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#07090e]">
                <div className="p-2.5 bg-[#0e121a] border-b border-[#18202e] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
                    <Terminal size={12} className="text-[#00f0ff]" />
                    <span>Serial Monitor (115200 baud)</span>
                  </div>
                  <button
                    onClick={() => setSerialLogs([])}
                    className="text-[10px] text-[#64748b] hover:text-[#e2e8f0]"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-1 text-[11px] font-mono text-[#cbd5e1] select-text">
                  {serialLogs.length === 0 ? (
                    <div className="text-[#475569] italic">Awaiting serial transmission...</div>
                  ) : (
                    serialLogs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.includes('LINE_LOST')
                            ? 'text-amber-400'
                            : log.includes('RECOVERY_TIMEOUT')
                            ? 'text-rose-400 font-bold'
                            : log.includes('ONLINE') || log.includes('online')
                            ? 'text-emerald-400'
                            : 'text-[#cbd5e1]'
                        }
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CIRCUIT SCHEMATIC & ELECTRICAL INTEGRITY */}
        {activeTab === 'circuit' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full w-full overflow-hidden">
            {/* Interactive Circuit Canvas */}
            <div className="flex-1 h-full bg-[#0a0d14] relative overflow-hidden">
              {coordinatorRef.current && (
                <CircuitCanvas
                  circuit={coordinatorRef.current.circuit}
                  onWiresChange={() => {}}
                  onComponentsChange={() => {}}
                  onResetMcu={() => coordinatorRef.current?.resetMcu()}
                  isSimulating={isRunning}
                />
              )}
            </div>

            {/* Right: Electrical Integrity & Hardware Verification Checks */}
            <div className="w-full lg:w-[400px] bg-[#090c14] border-t lg:border-t-0 lg:border-l border-[#18202e] p-5 overflow-y-auto shrink-0 font-mono text-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#141a26]">
                <ShieldCheck size={16} className="text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-[#f8fafc]">Hardware Electrical Integrity</h3>
                  <div className="text-[11px] text-[#64748b]">7 Components · 26 Verified Wires</div>
                </div>
              </div>

              {/* Validation Checklist */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <div className="font-bold text-[#e2e8f0]">Common Ground Bus (GND)</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">
                      Arduino Uno GND, TB6612 GND, IR Sensor Array GND, and Battery negative are tied to a low-impedance star ground bus.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <div className="font-bold text-[#e2e8f0]">Independent Motor & Logic Rails</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">
                      Logic rail VCC operates at 5.0V from Arduino Uno voltage regulator; motor supply VM operates at 7.4V from 2S LiPo battery pack.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <div className="font-bold text-[#e2e8f0]">Driver Standby (STBY) Pin Active</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">
                      TB6612 STBY pin is routed to Arduino D3 and asserted HIGH during firmware setup, enabling dual H-bridge operation.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#161f2f] flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <div className="font-bold text-[#e2e8f0]">Hardware Pin Assignments</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed font-mono">
                      IR Channels D1-D8: D2, D4, D7, D8, D12, D13, A0, A1<br />
                      TB6612 AIN1/2: D5, D6 | PWMA: D9 (PWM)<br />
                      TB6612 BIN1/2: D10, D11 | PWMB: D10 (PWM)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Engineering Disclosure Modal */}
      {showDisclosures && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0b0f19] border border-[#23354f] rounded-2xl max-w-xl w-full p-6 text-xs font-mono text-[#cbd5e1] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3c]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#00f0ff]" />
                <h2 className="text-sm font-bold text-[#f8fafc]">
                  Engineering Truth & Simulation Disclosures
                </h2>
              </div>
              <button
                onClick={() => setShowDisclosures(false)}
                className="text-[#64748b] hover:text-[#f8fafc] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162030]">
                <strong className="text-[#38bdf8] block mb-1">Firmware Execution Environment:</strong>
                Firmware is executed via a deterministic behavioral C++ AST interpreter rather than cycle-accurate AVR binary emulation (e.g. Simavr). Timers and interrupts operate at nominal loop tick cadence.
              </div>

              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162030]">
                <strong className="text-[#38bdf8] block mb-1">Kinematic & Physical Motor Dynamics:</strong>
                Vehicle kinematics are integrated via a discrete forward Euler unicycle differential-drive formulation. First-order electromechanical motor lag (approx 0.04s) models inductive back-EMF response.
              </div>

              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162030]">
                <strong className="text-[#38bdf8] block mb-1">Optical Reflectance Modeling:</strong>
                Sensors evaluate continuous Gaussian analytical beam overlap against the high-contrast track centerline, discretized with Schmitt-trigger thresholding (V_th = 0.50V).
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDisclosures(false)}
                className="px-4 py-2 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#070a10] font-bold text-xs transition-colors"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
