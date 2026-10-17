import React, { useRef, useEffect, useState } from 'react';
import { Terminal, AlertTriangle, AlertCircle, Trash2, ChevronDown, ChevronUp, Activity, Cpu, Layers } from 'lucide-react';
import { MultiLayerDiagnosticSnapshot } from '../simulation/Diagnostics';

interface ConsoleProps {
  logs: string[];
  errors: string[];
  warnings: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClear: () => void;
  telemetrySummary?: string;
  diagnostics?: MultiLayerDiagnosticSnapshot;
}

export const ConsolePanel: React.FC<ConsoleProps> = ({
  logs,
  errors,
  warnings,
  isCollapsed,
  onToggleCollapse,
  onClear,
  telemetrySummary,
  diagnostics,
}) => {
  const [activeTab, setActiveTab] = useState<'serial' | 'diagnostics'>('serial');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCollapsed && activeTab === 'serial') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, errors, warnings, isCollapsed, activeTab]);

  // If collapsed, display a compact high-density status bar
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="flex items-center justify-between px-3 py-1.5 bg-[#0e1219] border-t border-[#1e2430] font-mono text-xs cursor-pointer hover:bg-[#141924] transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <ChevronUp size={14} className="text-[#00f0ff]" />
          <Terminal size={13} className="text-[#00f0ff]" />
          <span className="font-semibold text-[#cbd5e1]">Serial Monitor & Diagnostics</span>
          <span className="text-[#64748b]">({logs.length} messages)</span>
        </div>

        <div className="flex items-center gap-3">
          {telemetrySummary && (
            <span className="text-[#94a3b8] text-[11px] hidden sm:inline">{telemetrySummary}</span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
              <AlertTriangle size={11} /> {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800 text-[11px] font-bold animate-pulse">
              <AlertCircle size={11} /> {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] border-t border-[#1e2430] font-mono text-xs select-none">
      {/* Console Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12161f] border-b border-[#1c2331]">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleCollapse}
            className="p-0.5 hover:text-[#00f0ff] text-[#94a3b8] rounded hover:bg-[#1f2937]"
            title="Collapse Console"
          >
            <ChevronDown size={14} />
          </button>

          {/* Tab Selector */}
          <div className="flex items-center bg-[#0a0d14] rounded p-0.5 border border-[#1e2638]">
            <button
              onClick={() => setActiveTab('serial')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'serial'
                  ? 'bg-[#1b2333] text-[#00f0ff] shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Terminal size={12} />
              Serial Monitor
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-[#1b2333] text-[#00f0ff] shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Activity size={12} />
              Signal & Layer Diagnostics
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
              <AlertTriangle size={12} /> {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800 text-[11px] font-bold">
              <AlertCircle size={12} /> {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          )}
          {activeTab === 'serial' && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-0.5 rounded hover:bg-[#1f2937] transition-colors"
              title="Clear output"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      {activeTab === 'serial' ? (
        <div className="flex-1 p-3 overflow-y-auto space-y-1 font-mono select-text">
          {/* Render Circuit Warnings */}
          {warnings.map((w, idx) => (
            <div key={`w_${idx}`} className="text-amber-400 flex items-start gap-1.5">
              <span className="text-amber-500 font-bold select-none">[CIRCUIT-WARN]</span> {w}
            </div>
          ))}

          {/* Render Compilation / System Errors */}
          {errors.map((e, idx) => (
            <div key={`e_${idx}`} className="text-red-400 flex items-start gap-1.5">
              <span className="text-red-500 font-bold select-none">[COMPILE-ERR]</span> {e}
            </div>
          ))}

          {/* Render Firmware Serial Logs */}
          {logs.map((log, idx) => (
            <div key={`l_${idx}`} className="text-[#38bdf8] flex items-start gap-1.5">
              <span className="text-[#64748b] select-none">&gt;</span>
              <span className="whitespace-pre-wrap">{log}</span>
            </div>
          ))}

          {logs.length === 0 && errors.length === 0 && warnings.length === 0 && (
            <div className="text-[#475569] italic select-none">No output. Click "Compile & Run" to execute firmware.</div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        /* Multi-Layer Diagnostic Trace View */
        <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] select-text">
          {diagnostics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Firmware Layer */}
              <div className="bg-[#10141d] p-2.5 rounded border border-[#1e2638] space-y-1">
                <div className="flex items-center justify-between text-[#00f0ff] font-bold pb-1 border-b border-[#1b2332]">
                  <span className="flex items-center gap-1"><Cpu size={12} /> 1. Firmware Layer</span>
                  <span className="text-[10px] text-[#94a3b8]">{Math.round(diagnostics.virtualTimeMs)}ms</span>
                </div>
                <div className="text-[#94a3b8]">Status: <span className={diagnostics.firmware.running ? 'text-emerald-400' : 'text-amber-400'}>{diagnostics.firmware.running ? 'RUNNING' : 'STOPPED'}</span></div>
                <div className="text-[#cbd5e1] font-semibold text-[10px] pt-1">Canonical GPIO Latches:</div>
                <div className="space-y-0.5 text-[10px]">
                  {Object.entries(diagnostics.firmware.gpioStates)
                    .filter(([p]) => [25, 26, 27, 14, 18, 19, 23].includes(Number(p)))
                    .map(([pin, s]) => (
                      <div key={pin} className="flex justify-between text-[#94a3b8]">
                        <span>GPIO{pin} ({s.mode}):</span>
                        <span className={s.digital === 1 ? 'text-[#00f0ff] font-bold' : 'text-[#64748b]'}>
                          {s.dutyFraction > 0 ? `${Math.round(s.dutyFraction * 100)}% PWM` : (s.digital === 1 ? 'HIGH' : 'LOW')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 2. Circuit Layer */}
              <div className="bg-[#10141d] p-2.5 rounded border border-[#1e2638] space-y-1">
                <div className="flex items-center justify-between text-[#10b981] font-bold pb-1 border-b border-[#1b2332]">
                  <span className="flex items-center gap-1"><Layers size={12} /> 2. Circuit Layer</span>
                  <span className={diagnostics.circuit.hasCommonGround ? 'text-emerald-400 text-[10px]' : 'text-red-400 text-[10px]'}>
                    {diagnostics.circuit.hasCommonGround ? 'GND OK' : 'NO GND'}
                  </span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>VCC (Logic 3.3V):</span>
                  <span className={diagnostics.circuit.logicPowered ? 'text-emerald-400' : 'text-red-400'}>{diagnostics.circuit.logicPowered ? '3.3V' : '0V'}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>VM (Motor 7.4V):</span>
                  <span className={diagnostics.circuit.motorPowered ? 'text-amber-400' : 'text-red-400'}>{diagnostics.circuit.motorPowered ? '7.4V' : '0V'}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Motor Leads A / B:</span>
                  <span className={diagnostics.circuit.motorAConnected && diagnostics.circuit.motorBConnected ? 'text-emerald-400' : 'text-amber-400'}>
                    {diagnostics.circuit.motorAConnected ? 'A:OK' : 'A:DISC'} / {diagnostics.circuit.motorBConnected ? 'B:OK' : 'B:DISC'}
                  </span>
                </div>
              </div>

              {/* 3. TB6612 Driver Layer */}
              <div className="bg-[#10141d] p-2.5 rounded border border-[#1e2638] space-y-1">
                <div className="flex items-center justify-between text-[#a855f7] font-bold pb-1 border-b border-[#1b2332]">
                  <span>3. TB6612FNG Driver</span>
                  <span className={diagnostics.driver.standby ? 'text-amber-400 text-[10px]' : 'text-emerald-400 text-[10px]'}>
                    {diagnostics.driver.standby ? 'STANDBY' : 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Channel A Mode:</span>
                  <span className="text-[#38bdf8] font-semibold">{diagnostics.driver.channelA.mode}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Channel B Mode:</span>
                  <span className="text-[#38bdf8] font-semibold">{diagnostics.driver.channelB.mode}</span>
                </div>
                <div className="text-[10px] text-[#94a3b8] truncate" title={diagnostics.driver.diagnostic}>
                  {diagnostics.driver.diagnostic}
                </div>
              </div>

              {/* 4. Motors & 3D Kinematics */}
              <div className="bg-[#10141d] p-2.5 rounded border border-[#1e2638] space-y-1">
                <div className="flex items-center justify-between text-[#f59e0b] font-bold pb-1 border-b border-[#1b2332]">
                  <span>4. Motors & Kinematics</span>
                  <span className="text-[#cbd5e1] text-[10px]">{Math.round(diagnostics.chassis.headingDeg)}° Heading</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Motor A (Left):</span>
                  <span className="text-[#38bdf8] font-bold">{Math.round(diagnostics.motors.left.currentRPM)} RPM</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Motor B (Right):</span>
                  <span className="text-[#38bdf8] font-bold">{Math.round(diagnostics.motors.right.currentRPM)} RPM</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Chassis Speed / Z:</span>
                  <span className="text-emerald-400 font-bold">{diagnostics.chassis.linearVelocity.toFixed(2)} m/s (z={diagnostics.chassis.pose.z.toFixed(2)}m)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[#64748b] italic">Run simulation to view live multi-layer diagnostic telemetry.</div>
          )}
        </div>
      )}
    </div>
  );
};
