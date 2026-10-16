import React, { useEffect, useRef, useState } from 'react';
import { SimulationCoordinator } from './simulation/SimulationCoordinator';
import { Robot3DViewport } from './three/Robot3DViewport';
import { CodeEditor } from './editor/CodeEditor';
import { CircuitCanvas } from './circuit/CircuitCanvas';
import { WireConnection } from './circuit/types';
import { ConsolePanel } from './console/ConsolePanel';
import { Play, Square, RotateCcw, Cpu, Save, Download, Upload, CheckCircle2, AlertOctagon } from 'lucide-react';

const DEFAULT_SKETCH = `#include <Arduino.h>

constexpr int PWMA = 25;
constexpr int AIN1 = 26;
constexpr int AIN2 = 27;

constexpr int PWMB = 14;
constexpr int BIN1 = 18;
constexpr int BIN2 = 19;

constexpr int STBY = 23;

void setMotor(int pwmPin, int in1, int in2, int speed) {
  speed = constrain(speed, -255, 255);

  digitalWrite(in1, speed > 0 ? HIGH : LOW);
  digitalWrite(in2, speed < 0 ? HIGH : LOW);

  ledcWrite(pwmPin, abs(speed));
}

void drive(int leftSpeed, int rightSpeed) {
  setMotor(PWMA, AIN1, AIN2, leftSpeed);
  setMotor(PWMB, BIN1, BIN2, rightSpeed);
}

void setup() {
  Serial.begin(115200);

  pinMode(AIN1, OUTPUT);
  pinMode(AIN2, OUTPUT);
  pinMode(BIN1, OUTPUT);
  pinMode(BIN2, OUTPUT);
  pinMode(STBY, OUTPUT);

  ledcAttach(PWMA, 20000, 8);
  ledcAttach(PWMB, 20000, 8);

  digitalWrite(STBY, HIGH);
  Serial.println("MagicSmoke motor test started");
}

void loop() {
  Serial.println("Forward");
  drive(160, 160);
  delay(2000);

  Serial.println("Stop");
  drive(0, 0);
  delay(1000);

  Serial.println("Reverse");
  drive(-160, -160);
  delay(2000);

  Serial.println("Stop");
  drive(0, 0);
  delay(1000);
}
`;

export const App: React.FC = () => {
  const coordinatorRef = useRef<SimulationCoordinator | null>(null);
  const viewportRef = useRef<Robot3DViewport | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  const [code, setCode] = useState<string>(DEFAULT_SKETCH);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [circuitWarnings, setCircuitWarnings] = useState<string[]>([]);

  // Telemetry indicators
  const [telemetry, setTelemetry] = useState({
    leftRPM: 0,
    rightRPM: 0,
    modeA: 'STANDBY',
    modeB: 'STANDBY',
    voltageA: 0,
    voltageB: 0,
  });

  // Initialize simulation coordinator and 3D scene
  useEffect(() => {
    const coord = new SimulationCoordinator();
    coordinatorRef.current = coord;

    coord.onSerial((text) => {
      setSerialLogs((prev) => [...prev, text]);
    });

    if (viewportContainerRef.current) {
      viewportRef.current = new Robot3DViewport(viewportContainerRef.current);
    }

    // Main animation & simulation tick loop
    let animId: number;
    const loop = () => {
      if (coordinatorRef.current && viewportRef.current) {
        const sim = coordinatorRef.current.tick();
        viewportRef.current.updateRobot(sim.pose, coordinatorRef.current.leftMotor.getAngle(), coordinatorRef.current.rightMotor.getAngle());
        viewportRef.current.render();

        setTelemetry({
          leftRPM: Math.round(sim.leftRPM),
          rightRPM: Math.round(sim.rightRPM),
          modeA: sim.driverState.channelA.mode,
          modeB: sim.driverState.channelB.mode,
          voltageA: Number(sim.driverState.channelA.terminalVoltage.toFixed(1)),
          voltageB: Number(sim.driverState.channelB.terminalVoltage.toFixed(1)),
        });

        // Evaluate circuit warnings
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

  const handleCompileAndRun = async () => {
    if (!coordinatorRef.current) return;
    setCompileErrors([]);
    const res = await coordinatorRef.current.compileAndRun(code);
    if (!res.success && res.errors) {
      setCompileErrors(res.errors);
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    coordinatorRef.current?.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    coordinatorRef.current?.reset();
    viewportRef.current?.resetCamera();
    setIsRunning(false);
  };

  const handleWiresChange = () => {
    if (coordinatorRef.current) {
      const evalRes = coordinatorRef.current.circuit.evaluateCircuit();
      setCircuitWarnings(evalRes.circuitWarnings);
    }
  };

  const handleExportJSON = () => {
    if (!coordinatorRef.current) return;
    const project = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      code,
      wires: coordinatorRef.current.circuit.getAllWires(),
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'magicsmoke_project.json';
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
        if (data.code) setCode(data.code);
        if (data.wires) {
          // Clear and replace wires
          const currentWires = coordinatorRef.current!.circuit.getAllWires();
          currentWires.forEach((w: WireConnection) => coordinatorRef.current!.circuit.removeWire(w.id));
          data.wires.forEach((w: WireConnection) => coordinatorRef.current!.circuit.addWire(w));
          handleWiresChange();
        }
      } catch (err) {
        alert('Invalid project JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0a0d13] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#0e121a] border-b border-[#1c2331] z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00f0ff] font-extrabold tracking-wider text-base font-mono">MAGICSMOKE</span>
            <span className="text-xs bg-[#1f293d] text-[#38bdf8] px-2 py-0.5 rounded font-mono">v1.0-alpha</span>
          </div>
          <div className="h-4 w-px bg-[#2a3449] mx-1" />
          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono">
            <Cpu size={14} className="text-[#10b981]" />
            <span>Target: ESP32 DevKit V1 (Xtensa LX6)</span>
          </div>
        </div>

        {/* Runtime Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleCompileAndRun}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#00f0ff] hover:bg-[#38bdf8] text-[#0a0d13] font-bold text-xs font-mono shadow-md transition-all active:scale-95"
            >
              <Play size={13} fill="currentColor" /> Compile & Run
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#ef4444] hover:bg-red-400 text-white font-bold text-xs font-mono shadow-md transition-all active:scale-95"
            >
              <Square size={13} fill="currentColor" /> Stop
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1c2331] hover:bg-[#283246] text-[#cbd5e1] text-xs font-mono border border-[#2b3547]"
            title="Reset simulation and camera"
          >
            <RotateCcw size={13} /> Reset
          </button>

          <div className="h-4 w-px bg-[#2a3449] mx-1" />

          {/* Project Persistence */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#161c28] hover:bg-[#222b3d] text-[#94a3b8] hover:text-[#e2e8f0] text-xs font-mono border border-[#263143]"
            title="Export project to JSON"
          >
            <Download size={13} /> Export
          </button>

          <label className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#161c28] hover:bg-[#222b3d] text-[#94a3b8] hover:text-[#e2e8f0] text-xs font-mono border border-[#263143] cursor-pointer">
            <Upload size={13} /> Import
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#10b981] animate-pulse' : 'bg-[#64748b]'}`} />
            <span className={isRunning ? 'text-[#10b981] font-semibold' : 'text-[#64748b]'}>
              {isRunning ? 'SIMULATION RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace (3 Panels: Editor | Circuit | 3D Viewport) */}
      <div className="flex-1 grid grid-cols-12 gap-1 p-1 overflow-hidden bg-[#0a0d13]">
        {/* Left: Monaco Arduino Code Editor (Col 1-4) */}
        <div className="col-span-4 flex flex-col h-full bg-[#0f1117] rounded border border-[#1e2430] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#141822] border-b border-[#1f2636] flex items-center justify-between text-xs font-mono text-[#94a3b8]">
            <span>sketch.ino</span>
            <span className="text-[10px] text-[#64748b]">C++ / Arduino-ESP32</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </div>

        {/* Middle: Interactive Circuit Wiring Canvas (Col 5-8) */}
        <div className="col-span-4 flex flex-col h-full bg-[#11141a] rounded border border-[#1e2430] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#141822] border-b border-[#1f2636] flex items-center justify-between text-xs font-mono text-[#94a3b8]">
            <span>Pin-to-Pin Circuit Schematic</span>
            <span className="text-[10px] text-[#00f0ff]">Click & drag pins to wire</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {coordinatorRef.current && (
              <CircuitCanvas circuit={coordinatorRef.current.circuit} onWiresChange={handleWiresChange} />
            )}
          </div>
        </div>

        {/* Right: 3D Robotics Viewport & Telemetry (Col 9-12) */}
        <div className="col-span-4 flex flex-col h-full bg-[#0d1117] rounded border border-[#1e2430] overflow-hidden relative">
          <div className="px-3 py-1.5 bg-[#141822] border-b border-[#1f2636] flex items-center justify-between text-xs font-mono text-[#94a3b8]">
            <span>3D Physical Robot Viewport</span>
            <span className="text-[10px] text-[#10b981]">Three.js WebGL</span>
          </div>

          <div ref={viewportContainerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating Live Telemetry HUD */}
          <div className="absolute top-9 left-2 bg-[#121620]/90 p-2.5 rounded border border-[#242d3d] text-[11px] font-mono space-y-1 pointer-events-none backdrop-blur-sm shadow-md">
            <div className="text-[#00f0ff] font-bold text-xs border-b border-[#1f293d] pb-1 mb-1">MOTOR TELEMETRY</div>
            <div className="flex justify-between gap-4 text-[#cbd5e1]">
              <span>Left Motor (A):</span>
              <span className="text-[#38bdf8] font-bold">{telemetry.leftRPM} RPM ({telemetry.voltageA}V)</span>
            </div>
            <div className="flex justify-between gap-4 text-[#cbd5e1]">
              <span>Right Motor (B):</span>
              <span className="text-[#38bdf8] font-bold">{telemetry.rightRPM} RPM ({telemetry.voltageB}V)</span>
            </div>
            <div className="flex justify-between gap-4 text-[#94a3b8] text-[10px] pt-1">
              <span>Driver Mode:</span>
              <span className="text-amber-400 font-semibold">{telemetry.modeA} / {telemetry.modeB}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Serial Monitor & Diagnostics */}
      <div className="h-44 z-20">
        <ConsolePanel
          logs={serialLogs}
          errors={compileErrors}
          warnings={circuitWarnings}
          onClear={() => setSerialLogs([])}
        />
      </div>
    </div>
  );
};
