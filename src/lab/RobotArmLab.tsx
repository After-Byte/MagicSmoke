import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RobotArm3DViewport } from '../three/RobotArm3DViewport';
import { CircuitCanvas } from '../circuit/CircuitCanvas';
import { CodeEditor } from '../editor/CodeEditor';
import { ConsolePanel } from '../console/ConsolePanel';
import { CircuitEngine } from '../circuit/CircuitEngine';
import { ArduinoUnoBehavioralRuntime } from '../runtime/ArduinoUnoBehavioralRuntime';
import {
  RobotArmJointAngles,
  RobotArmDimensions,
  RobotArmPose,
  DEFAULT_ARM_DIMENSIONS,
  DEFAULT_JOINT_LIMITS,
  DEFAULT_ARM_POSES,
  ForwardKinematicsResult,
  calculateForwardKinematics,
  clampJointAngles,
} from '../robot/arm/RobotArmModel';
import {
  SERVO_SPECS,
  ROBOT_ARM_SERVO_MAPPINGS,
  ServoJointMapping,
  validateRobotArmWiring,
  RobotArmWiringReport,
} from '../robot/arm/ServoModels';
import { ROBOT_ARM_SKETCH, ROBOT_ARM_PIN_MAPPING } from '../project/robotArmProject';
import { StoredProject, saveStoredProject } from '../project/projectStorage';
import { ProjectDocument } from '../project/types';
import { ComponentInstance, WireConnection } from '../circuit/types';
import {
  Play,
  Pause,
  RotateCcw,
  Cpu,
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
  Zap,
  Compass,
  ArrowRight,
  ShieldCheck,
  Eye,
  Crosshair,
  Maximize2,
  Box,
} from 'lucide-react';

interface RobotArmLabProps {
  initialProject?: StoredProject;
  onBackToDashboard: () => void;
  onSaveProject?: (project: StoredProject) => void;
}

export const RobotArmLab: React.FC<RobotArmLabProps> = ({
  initialProject,
  onBackToDashboard,
  onSaveProject,
}) => {
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<RobotArm3DViewport | null>(null);
  const runtimeRef = useRef<ArduinoUnoBehavioralRuntime | null>(null);

  // Active Workspace Tab: 'workbench' (3D Arm + Controls), 'circuit' (Schematic Wiring), 'code' (Monaco C++ IDE)
  const [activeTab, setActiveTab] = useState<'workbench' | 'circuit' | 'code'>('workbench');

  // Robot Arm State
  const [angles, setAngles] = useState<RobotArmJointAngles>(() => {
    return (
      initialProject?.document?.robotArm?.currentAngles || {
        base: 90,
        shoulder: 60,
        elbow: 75,
        wrist: 90,
        gripper: 20,
      }
    );
  });

  const [activePoseId, setActivePoseId] = useState<string>(
    initialProject?.document?.robotArm?.activePoseId || 'pose_home'
  );

  const [selectedJoint, setSelectedJoint] = useState<keyof RobotArmJointAngles | null>('base');

  // Circuit Engine & Hardware State
  const [circuit, setCircuit] = useState<CircuitEngine>(() => {
    const engine = new CircuitEngine();
    if (initialProject?.document) {
      initialProject.document.components.forEach((c) => engine.addComponent(c));
      initialProject.document.wires.forEach((w) => engine.addWire(w));
    }
    return engine;
  });

  const [code, setCode] = useState<string>(() => {
    return initialProject?.document?.code || ROBOT_ARM_SKETCH;
  });

  // Wiring Electrical Diagnostics
  const [wiringReport, setWiringReport] = useState<RobotArmWiringReport>(() => {
    return validateRobotArmWiring(
      circuit.getAllComponents(),
      circuit.getAllWires(),
      ROBOT_ARM_SERVO_MAPPINGS
    );
  });

  // Kinematic Position State
  const [kinematics, setKinematics] = useState<ForwardKinematicsResult>(() => {
    return calculateForwardKinematics(angles, DEFAULT_ARM_DIMENSIONS);
  });

  // Simulation Runtime Lifecycle
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Re-run electrical netlist validation when circuit changes
  const revalidateCircuit = useCallback(() => {
    const report = validateRobotArmWiring(
      circuit.getAllComponents(),
      circuit.getAllWires(),
      ROBOT_ARM_SERVO_MAPPINGS
    );
    setWiringReport(report);
  }, [circuit]);

  // Initialize and manage Three.js Viewport Lifecycle across tab switches
  useEffect(() => {
    if (activeTab === 'workbench') {
      if (viewportContainerRef.current) {
        if (!viewportRef.current) {
          const vp = new RobotArm3DViewport(
            viewportContainerRef.current,
            initialProject?.document?.robotArm?.dimensions || DEFAULT_ARM_DIMENSIONS,
            initialProject?.document?.robotArm?.jointLimits || DEFAULT_JOINT_LIMITS,
            angles
          );

          vp.onAnglesChange((newAngles) => {
            setAngles(newAngles);
            setKinematics(vp.getKinematics());
          });

          viewportRef.current = vp;
        } else {
          // Viewport already exists: ensure it is attached to the current container
          viewportRef.current.attachTo(viewportContainerRef.current);
          viewportRef.current.setTargetAngles(angles, true);
          viewportRef.current.handleResize();
        }

        // Post-reflow resizes to handle browser layout recalculation after tab transition
        const raf = requestAnimationFrame(() => {
          if (viewportRef.current) {
            viewportRef.current.handleResize();
          }
        });

        const timer = setTimeout(() => {
          if (viewportRef.current) {
            viewportRef.current.handleResize();
          }
        }, 80);

        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
        };
      }
    } else {
      // Pause Three.js render loop when 3D tab is hidden to save GPU/CPU cycles
      viewportRef.current?.pauseLoop();
    }
  }, [activeTab]);

  // Clean up WebGL resources when workspace unmounts
  useEffect(() => {
    return () => {
      if (viewportRef.current) {
        viewportRef.current.dispose();
        viewportRef.current = null;
      }
    };
  }, []);

  // Update selected joint in 3D viewport for highlight effects
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.setSelectedJoint(selectedJoint);
    }
  }, [selectedJoint]);

  // Handle manual joint slider/numeric updates
  const handleJointAngleChange = (joint: keyof RobotArmJointAngles, value: number) => {
    const clamped = clampJointAngles({ [joint]: value }, angles);
    setAngles(clamped);
    setActivePoseId('');
    setIsDirty(true);

    if (viewportRef.current) {
      viewportRef.current.setTargetAngles({ [joint]: value });
      setKinematics(viewportRef.current.getKinematics());
    }
  };

  // Apply a preset pose
  const handleApplyPose = (pose: RobotArmPose) => {
    setActivePoseId(pose.id);
    setAngles(pose.angles);
    setIsDirty(true);

    if (viewportRef.current) {
      viewportRef.current.setTargetAngles(pose.angles);
      setKinematics(viewportRef.current.getKinematics());
    }

    addSerialLog(`[POSE] Applied pose: ${pose.name} (${JSON.stringify(pose.angles)})`);
  };

  const addSerialLog = (line: string) => {
    setSerialLogs((prev) => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  // Firmware Runtime Execution setup
  const startSimulation = async () => {
    if (isRunning) return;

    revalidateCircuit();
    if (wiringReport.overallStatus === 'ERROR') {
      addSerialLog('[ERROR] Cannot run firmware: Incomplete or broken servo electrical wiring!');
      return;
    }

    const runtime = new ArduinoUnoBehavioralRuntime();
    runtimeRef.current = runtime;

    runtime.setEvents({
      onSerialOutput: (text) => {
        addSerialLog(text);
      },
      onPWMChange: (pin, dutyFraction) => {
        // Map Arduino PWM pin to corresponding servo joint angle
        // Standard hobby servo PWM: 1ms (0°) to 2ms (180°) mapped over dutyFraction
        // In our sketch: analogWrite(pin, map(angle, 0, 180, 25, 125)) -> duty = val / 255
        const val = dutyFraction * 255;
        const angle = Math.round(((val - 25) / (125 - 25)) * 180);

        if (pin === ROBOT_ARM_PIN_MAPPING.BASE_SERVO_PIN) {
          handleJointAngleChange('base', angle);
        } else if (pin === ROBOT_ARM_PIN_MAPPING.SHOULDER_SERVO_PIN) {
          handleJointAngleChange('shoulder', angle);
        } else if (pin === ROBOT_ARM_PIN_MAPPING.ELBOW_SERVO_PIN) {
          handleJointAngleChange('elbow', angle);
        } else if (pin === ROBOT_ARM_PIN_MAPPING.WRIST_SERVO_PIN) {
          handleJointAngleChange('wrist', angle);
        } else if (pin === ROBOT_ARM_PIN_MAPPING.GRIPPER_SERVO_PIN) {
          const gripperMm = Math.round(((val - 25) / (125 - 25)) * 40);
          handleJointAngleChange('gripper', gripperMm);
        }
      },
      onError: (msg) => {
        addSerialLog(`[FIRMWARE ERROR] ${msg}`);
      },
    });

    const compileRes = await runtime.compile(code);
    if (!compileRes.success) {
      addSerialLog(`[COMPILATION FAILED] ${(compileRes.errors || []).join('; ')}`);
      return;
    }

    runtime.start();
    setIsRunning(true);
    setIsPaused(false);
    addSerialLog('[FIRMWARE] Sketch compiled and running at 16MHz clock.');
  };

  const pauseSimulation = () => {
    setIsPaused((p) => !p);
    addSerialLog(isPaused ? '[SIMULATION] Resumed.' : '[SIMULATION] Paused.');
  };

  const stopSimulation = () => {
    if (runtimeRef.current) {
      runtimeRef.current.reset();
      runtimeRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    addSerialLog('[SIMULATION] Stopped.');
  };

  const resetAll = () => {
    stopSimulation();
    const homePose = DEFAULT_ARM_POSES[0];
    handleApplyPose(homePose);
    if (viewportRef.current) {
      viewportRef.current.resetCamera();
    }
    addSerialLog('[RESET] Pose reset to Home and camera realigned.');
  };

  // Save Project
  const handleSave = () => {
    const updatedDoc: ProjectDocument = {
      schemaVersion: '1.0.0',
      name: initialProject?.name || '5-Axis Servo Robotic Arm',
      board: 'arduino-uno-r3',
      code,
      components: circuit.getAllComponents(),
      wires: circuit.getAllWires(),
      robotArm: {
        dimensions: DEFAULT_ARM_DIMENSIONS,
        jointLimits: DEFAULT_JOINT_LIMITS,
        currentAngles: angles,
        targetAngles: angles,
        activePoseId,
        customPoses: DEFAULT_ARM_POSES,
      },
    };

    const saved = saveStoredProject(updatedDoc, initialProject?.id);
    if (onSaveProject) {
      onSaveProject(saved);
    }

    setIsDirty(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
    addSerialLog(`[SAVE] Project '${saved.name}' saved to localStorage.`);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#07090e] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* Top Engineering Workbench Header */}
      <header className="h-[54px] bg-[#0c1017] border-b border-[#1b2230] px-4 flex items-center justify-between z-40 select-none shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1e2535] text-[#38bdf8] hover:text-white border border-[#232e42] text-xs font-mono transition-colors cursor-pointer"
            data-testid="arm-back-to-dashboard-btn"
          >
            <Home size={14} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[#1f293d] mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[#00f0ff] font-black tracking-wider text-sm font-mono">
              MAGICSMOKE
            </span>
            <span className="text-[10px] bg-[#16202e] text-[#38bdf8] px-1.5 py-0.5 rounded font-mono border border-[#1e293b]">
              v1.21
            </span>
            <span className="text-xs text-[#cbd5e1] font-mono font-bold hidden md:inline ml-1">
              {initialProject?.name || '5-Axis Servo Robotic Arm'}
            </span>
            {isDirty && (
              <span className="text-[10px] text-amber-400 font-mono italic">
                • unsaved
              </span>
            )}
          </div>
        </div>

        {/* Workspace View Mode Switcher Pills */}
        <div className="flex items-center bg-[#070a0f] p-1 rounded-xl border border-[#1b2536] text-xs font-mono">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'workbench'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-xs'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-workbench-btn"
          >
            <Box size={13} />
            <span>3D Arm & Joints</span>
          </button>
          <button
            onClick={() => setActiveTab('circuit')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'circuit'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-xs'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-circuit-btn"
          >
            <Layers size={13} />
            <span>Schematic ({circuit.getAllComponents().length} parts)</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-xs'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
            data-testid="tab-code-btn"
          >
            <FileCode size={13} />
            <span>Firmware.ino</span>
          </button>
        </div>

        {/* Global Action & Simulation Lifecycle Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={startSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#05080f] font-bold text-xs font-mono shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-all cursor-pointer active:scale-95"
              data-testid="arm-compile-run-btn"
            >
              <Play size={13} fill="currentColor" />
              <span>Compile & Run</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-amber-400 font-bold text-xs font-mono border border-amber-500/30 transition-all cursor-pointer"
              >
                {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={stopSimulation}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono shadow-xs transition-all cursor-pointer active:scale-95"
                data-testid="arm-stop-btn"
              >
                <span>Stop</span>
              </button>
            </div>
          )}

          <button
            onClick={resetAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1e2535] text-[#cbd5e1] text-xs font-mono border border-[#232e42] transition-colors cursor-pointer"
            title="Reset arm pose and camera"
            data-testid="arm-reset-btn"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              saveToast
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-[#141923] hover:bg-[#1e2535] text-[#38bdf8] border-[#232e42]'
            }`}
            data-testid="arm-save-btn"
          >
            {saveToast ? <Check size={13} /> : <Save size={13} />}
            <span>{saveToast ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: 3D ROBOT ARM WORKBENCH & INTERACTIVE CONTROLS */}
        <div className={`flex-1 flex overflow-hidden ${activeTab === 'workbench' ? '' : 'hidden'}`}>
          {/* Left Column: Joint Angle Sliders & Preset Poses */}
            <aside className="w-80 bg-[#0a0e16] border-r border-[#162030] flex flex-col justify-between overflow-y-auto select-none p-4 shrink-0">
              <div className="space-y-5">
                {/* Section: Joint Sliders */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#162030] mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#f8fafc]">
                      <Sliders size={14} className="text-[#00f0ff]" />
                      <span>Joint Angle Controls</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#00f0ff] bg-[#00f0ff]/10 px-2 py-0.5 rounded border border-[#00f0ff]/20">
                      5-DOF
                    </span>
                  </div>

                  {/* Sliders for each joint */}
                  <div className="space-y-3.5 text-xs font-mono">
                    {/* 1. Base Joint */}
                    <div
                      onClick={() => setSelectedJoint('base')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJoint === 'base'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
                          : 'bg-[#0c121e] border-[#182335] hover:border-[#233550]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                          <span className="font-bold text-[#f8fafc]">Base (Yaw)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={DEFAULT_JOINT_LIMITS.base.min}
                            max={DEFAULT_JOINT_LIMITS.base.max}
                            value={Math.round(angles.base)}
                            onChange={(e) => handleJointAngleChange('base', Number(e.target.value))}
                            className="w-12 bg-[#05080f] border border-[#223147] rounded px-1.5 py-0.5 text-right text-xs text-[#00f0ff] outline-none"
                            data-testid="input-base-angle"
                          />
                          <span className="text-[#64748b]">°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={DEFAULT_JOINT_LIMITS.base.min}
                        max={DEFAULT_JOINT_LIMITS.base.max}
                        value={angles.base}
                        onChange={(e) => handleJointAngleChange('base', Number(e.target.value))}
                        className="w-full accent-[#00f0ff] cursor-pointer"
                        data-testid="slider-base-angle"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                        <span>0° (Right)</span>
                        <span>90° (Center)</span>
                        <span>180° (Left)</span>
                      </div>
                    </div>

                    {/* 2. Shoulder Joint */}
                    <div
                      onClick={() => setSelectedJoint('shoulder')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJoint === 'shoulder'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
                          : 'bg-[#0c121e] border-[#182335] hover:border-[#233550]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                          <span className="font-bold text-[#f8fafc]">Shoulder (Pitch)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={DEFAULT_JOINT_LIMITS.shoulder.min}
                            max={DEFAULT_JOINT_LIMITS.shoulder.max}
                            value={Math.round(angles.shoulder)}
                            onChange={(e) => handleJointAngleChange('shoulder', Number(e.target.value))}
                            className="w-12 bg-[#05080f] border border-[#223147] rounded px-1.5 py-0.5 text-right text-xs text-[#38bdf8] outline-none"
                            data-testid="input-shoulder-angle"
                          />
                          <span className="text-[#64748b]">°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={DEFAULT_JOINT_LIMITS.shoulder.min}
                        max={DEFAULT_JOINT_LIMITS.shoulder.max}
                        value={angles.shoulder}
                        onChange={(e) => handleJointAngleChange('shoulder', Number(e.target.value))}
                        className="w-full accent-[#38bdf8] cursor-pointer"
                        data-testid="slider-shoulder-angle"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                        <span>15° (Low)</span>
                        <span>90° (Vertical)</span>
                        <span>165° (Back)</span>
                      </div>
                    </div>

                    {/* 3. Elbow Joint */}
                    <div
                      onClick={() => setSelectedJoint('elbow')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJoint === 'elbow'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
                          : 'bg-[#0c121e] border-[#182335] hover:border-[#233550]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
                          <span className="font-bold text-[#f8fafc]">Elbow (Pitch)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={DEFAULT_JOINT_LIMITS.elbow.min}
                            max={DEFAULT_JOINT_LIMITS.elbow.max}
                            value={Math.round(angles.elbow)}
                            onChange={(e) => handleJointAngleChange('elbow', Number(e.target.value))}
                            className="w-12 bg-[#05080f] border border-[#223147] rounded px-1.5 py-0.5 text-right text-xs text-[#818cf8] outline-none"
                            data-testid="input-elbow-angle"
                          />
                          <span className="text-[#64748b]">°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={DEFAULT_JOINT_LIMITS.elbow.min}
                        max={DEFAULT_JOINT_LIMITS.elbow.max}
                        value={angles.elbow}
                        onChange={(e) => handleJointAngleChange('elbow', Number(e.target.value))}
                        className="w-full accent-[#818cf8] cursor-pointer"
                        data-testid="slider-elbow-angle"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                        <span>0° (Straight)</span>
                        <span>90° (Right)</span>
                        <span>160° (Bent)</span>
                      </div>
                    </div>

                    {/* 4. Wrist Joint */}
                    <div
                      onClick={() => setSelectedJoint('wrist')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJoint === 'wrist'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
                          : 'bg-[#0c121e] border-[#182335] hover:border-[#233550]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#c084fc]" />
                          <span className="font-bold text-[#f8fafc]">Wrist (Pitch)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={DEFAULT_JOINT_LIMITS.wrist.min}
                            max={DEFAULT_JOINT_LIMITS.wrist.max}
                            value={Math.round(angles.wrist)}
                            onChange={(e) => handleJointAngleChange('wrist', Number(e.target.value))}
                            className="w-12 bg-[#05080f] border border-[#223147] rounded px-1.5 py-0.5 text-right text-xs text-[#c084fc] outline-none"
                            data-testid="input-wrist-angle"
                          />
                          <span className="text-[#64748b]">°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={DEFAULT_JOINT_LIMITS.wrist.min}
                        max={DEFAULT_JOINT_LIMITS.wrist.max}
                        value={angles.wrist}
                        onChange={(e) => handleJointAngleChange('wrist', Number(e.target.value))}
                        className="w-full accent-[#c084fc] cursor-pointer"
                        data-testid="slider-wrist-angle"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                        <span>0° (Down)</span>
                        <span>90° (Level)</span>
                        <span>180° (Up)</span>
                      </div>
                    </div>

                    {/* 5. Gripper Jaws */}
                    <div
                      onClick={() => setSelectedJoint('gripper')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJoint === 'gripper'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
                          : 'bg-[#0c121e] border-[#182335] hover:border-[#233550]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                          <span className="font-bold text-[#f8fafc]">Parallel Gripper</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={DEFAULT_JOINT_LIMITS.gripper.min}
                            max={DEFAULT_JOINT_LIMITS.gripper.max}
                            value={Math.round(angles.gripper)}
                            onChange={(e) => handleJointAngleChange('gripper', Number(e.target.value))}
                            className="w-12 bg-[#05080f] border border-[#223147] rounded px-1.5 py-0.5 text-right text-xs text-[#f43f5e] outline-none"
                            data-testid="input-gripper-angle"
                          />
                          <span className="text-[#64748b]">mm</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={DEFAULT_JOINT_LIMITS.gripper.min}
                        max={DEFAULT_JOINT_LIMITS.gripper.max}
                        value={angles.gripper}
                        onChange={(e) => handleJointAngleChange('gripper', Number(e.target.value))}
                        className="w-full accent-[#f43f5e] cursor-pointer"
                        data-testid="slider-gripper-angle"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                        <span>0mm (Closed)</span>
                        <span>20mm (Half)</span>
                        <span>40mm (Wide)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Useful Poses */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#162030] mb-2.5">
                    <span className="text-xs font-mono font-bold text-[#f8fafc]">
                      Kinematic Preset Poses
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_ARM_POSES.map((pose) => (
                      <button
                        key={pose.id}
                        onClick={() => handleApplyPose(pose)}
                        className={`px-2.5 py-2 rounded-xl text-left font-mono transition-all border cursor-pointer ${
                          activePoseId === pose.id
                            ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40 font-bold shadow-xs'
                            : 'bg-[#0c121e] text-[#cbd5e1] border-[#182335] hover:border-[#233550] hover:bg-[#101828]'
                        }`}
                        data-testid={`pose-btn-${pose.id}`}
                      >
                        <div className="text-[11px] font-bold truncate">{pose.name}</div>
                        <div className="text-[9px] text-[#64748b] truncate mt-0.5">
                          {pose.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom: Mechanical Link Dimensions */}
              <div className="pt-3 border-t border-[#162030] text-[10px] font-mono text-[#64748b] space-y-1">
                <div className="flex justify-between">
                  <span>Base Height:</span>
                  <span className="text-[#cbd5e1] font-bold">{DEFAULT_ARM_DIMENSIONS.baseHeight}mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Upper Arm L1:</span>
                  <span className="text-[#cbd5e1] font-bold">{DEFAULT_ARM_DIMENSIONS.upperArmLength}mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Forearm L2:</span>
                  <span className="text-[#cbd5e1] font-bold">{DEFAULT_ARM_DIMENSIONS.forearmLength}mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Wrist L3:</span>
                  <span className="text-[#cbd5e1] font-bold">{DEFAULT_ARM_DIMENSIONS.wristLength}mm</span>
                </div>
              </div>
            </aside>

            {/* Center: Three.js Interactive 3D Robot Arm Viewport */}
            <main className="flex-1 relative overflow-hidden bg-[#0a0d14] flex flex-col">
              <div
                ref={viewportContainerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
                data-testid="robot-arm-3d-canvas"
              />

              {/* Floating Live Forward Kinematics HUD (Top Left) */}
              <div className="absolute top-4 left-4 bg-[#0a0f1be6] backdrop-blur-md border border-[#1b2538] rounded-2xl p-3.5 shadow-2xl font-mono text-xs pointer-events-none space-y-2 select-none">
                <div className="flex items-center justify-between gap-4 border-b border-[#182236] pb-1.5">
                  <div className="flex items-center gap-1.5 text-[#00f0ff] font-bold text-xs">
                    <Crosshair size={14} />
                    <span>END-EFFECTOR POSITION</span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      kinematics.reachable
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {kinematics.reachable ? 'REACHABLE' : 'OUT OF REACH'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-[#05080f] px-2.5 py-1.5 rounded-lg border border-[#172032]">
                    <div className="text-[10px] text-[#64748b]">X (Lateral)</div>
                    <div className="text-sm font-bold text-[#f8fafc]">{kinematics.x} mm</div>
                  </div>
                  <div className="bg-[#05080f] px-2.5 py-1.5 rounded-lg border border-[#172032]">
                    <div className="text-[10px] text-[#64748b]">Y (Height)</div>
                    <div className="text-sm font-bold text-[#f8fafc]">{kinematics.y} mm</div>
                  </div>
                  <div className="bg-[#05080f] px-2.5 py-1.5 rounded-lg border border-[#172032]">
                    <div className="text-[10px] text-[#64748b]">Z (Depth)</div>
                    <div className="text-sm font-bold text-[#f8fafc]">{kinematics.z} mm</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#94a3b8] pt-1">
                  <span>Ground Radius: <b className="text-[#38bdf8]">{kinematics.planarRadius} mm</b></span>
                  <span>Pitch: <b className="text-[#a855f7]">{kinematics.pitchDeg}°</b></span>
                </div>
              </div>

              {/* Floating Camera Reset Button (Top Right) */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => viewportRef.current?.resetCamera()}
                  className="px-3 py-1.5 rounded-xl bg-[#0c121e]/90 hover:bg-[#141d2e] border border-[#1c293d] text-xs font-mono text-[#94a3b8] hover:text-[#f8fafc] backdrop-blur-sm shadow-md transition-all cursor-pointer"
                >
                  Reset Cam
                </button>
              </div>

              {/* Navigation Hint Overlay (Bottom Left) */}
              <div className="absolute bottom-4 left-4 bg-[#0a0f1be6] backdrop-blur-sm border border-[#182336] px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#64748b] pointer-events-none">
                <span>Left Click: Orbit • Right Click: Pan • Scroll: Zoom</span>
              </div>
            </main>

            {/* Right Column: Electrical Wiring Health & Servo Specifications */}
            <aside className="w-80 bg-[#0a0e16] border-l border-[#162030] flex flex-col justify-between overflow-y-auto select-none p-4 shrink-0">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#162030]">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#f8fafc]">
                    <Zap size={14} className="text-amber-400" />
                    <span>Servo Electrical Status</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      wiringReport.overallStatus === 'HEALTHY'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : wiringReport.overallStatus === 'WARNING'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {wiringReport.overallStatus}
                  </span>
                </div>

                {/* Brownout Warning Banner if detected */}
                {wiringReport.arduinoBrownoutRisk && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-mono space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <span>Brownout Risk Detected</span>
                    </div>
                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                      Powering high-torque servos from the Arduino Uno 5V regulator can trigger brownout resets under load. Use the external 6V 3A supply rail!
                    </p>
                  </div>
                )}

                {/* Common Ground Status */}
                <div className="p-2.5 rounded-xl bg-[#0c121e] border border-[#182335] text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Common Ground:</span>
                    <span
                      className={`font-bold ${
                        wiringReport.commonGroundVerified ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {wiringReport.commonGroundVerified ? 'VERIFIED (0V)' : 'DISCONNECTED'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748b]">
                    <span>Total Running Current:</span>
                    <span className="text-[#cbd5e1] font-bold">
                      ~{(wiringReport.totalOperatingCurrentMa / 1000).toFixed(1)}A
                    </span>
                  </div>
                </div>

                {/* Individual Servo Cards */}
                <div className="space-y-2.5 text-xs font-mono">
                  {ROBOT_ARM_SERVO_MAPPINGS.map((m: ServoJointMapping) => {
                    const status = wiringReport.servos[m.joint];
                    const spec = SERVO_SPECS[m.model];

                    return (
                      <div
                        key={m.joint}
                        className={`p-2.5 rounded-xl border transition-all ${
                          status?.isReady
                            ? 'bg-[#0c121e] border-[#182335]'
                            : 'bg-rose-950/20 border-rose-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#f8fafc] capitalize">
                            {m.joint} Joint
                          </span>
                          <span className="text-[10px] text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.2 rounded border border-[#38bdf8]/20">
                            {spec.name.split(' ')[1]}
                          </span>
                        </div>

                        <div className="space-y-0.5 text-[10px] text-[#64748b]">
                          <div className="flex justify-between">
                            <span>PWM Signal:</span>
                            <span className={status?.signalConnected ? 'text-emerald-400' : 'text-rose-400'}>
                              {status?.signalSource || `Missing Pin D${m.signalPinNumber}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Power Rail:</span>
                            <span
                              className={
                                status?.powerSource === 'EXTERNAL_SUPPLY'
                                  ? 'text-emerald-400'
                                  : status?.powerSource === 'ARDUINO_5V'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }
                            >
                              {status?.powerSource === 'EXTERNAL_SUPPLY'
                                ? 'External 6V PSU'
                                : status?.powerSource === 'ARDUINO_5V'
                                ? 'Arduino 5V (Caution)'
                                : 'Unpowered'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ground Return:</span>
                            <span className={status?.groundConnected ? 'text-emerald-400' : 'text-rose-400'}>
                              {status?.groundConnected ? 'Common GND' : 'Open Ground'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Switch to Circuit Schematic */}
              <button
                onClick={() => setActiveTab('circuit')}
                className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#141b27] hover:bg-[#1e2738] text-[#38bdf8] border border-[#212f45] text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <Layers size={13} />
                <span>Open Circuit Schematic Editor</span>
              </button>
            </aside>
          </div>

        {/* TAB 2: INTERACTIVE PIN-TO-PIN SCHEMATIC CANVAS */}
        {activeTab === 'circuit' && (
          <div className="flex-1 relative overflow-hidden bg-[#07090e]">
            <CircuitCanvas
              circuit={circuit}
              onWiresChange={(wires) => {
                revalidateCircuit();
                setIsDirty(true);
              }}
              onComponentsChange={(comps) => {
                revalidateCircuit();
                setIsDirty(true);
              }}
            />
          </div>
        )}

        {/* TAB 3: MONACO C++ ARDUINO CODE EDITOR */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0d14]">
            <div className="px-4 py-2 bg-[#0e131d] border-b border-[#1b2434] flex items-center justify-between text-xs font-mono text-[#cbd5e1]">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-[#00f0ff]" />
                <span className="font-bold">firmware/robot_arm_controller.ino</span>
              </div>
              <span className="text-[11px] text-[#64748b]">AVR ATmega328P (16MHz)</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={(newCode) => {
                  setCode(newCode);
                  setIsDirty(true);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Collapsible Serial Monitor & Telemetry Console */}
      <div className={`transition-all duration-200 z-30 shrink-0 ${isConsoleCollapsed ? 'h-8' : 'h-36'}`}>
        <ConsolePanel
          logs={serialLogs}
          errors={wiringReport.overallStatus === 'ERROR' ? ['Servo wiring incomplete'] : []}
          warnings={wiringReport.diagnostics}
          isCollapsed={isConsoleCollapsed}
          onToggleCollapse={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
          onClear={() => setSerialLogs([])}
          telemetrySummary={`Base: ${Math.round(angles.base)}° | Shoulder: ${Math.round(angles.shoulder)}° | Elbow: ${Math.round(angles.elbow)}° | Wrist: ${Math.round(angles.wrist)}° | Gripper: ${Math.round(angles.gripper)}mm`}
        />
      </div>
    </div>
  );
};
