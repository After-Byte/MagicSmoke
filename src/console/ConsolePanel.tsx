import React, { useRef, useEffect } from 'react';
import { Terminal, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';

interface ConsoleProps {
  logs: string[];
  errors: string[];
  warnings: string[];
  onClear: () => void;
}

export const ConsolePanel: React.FC<ConsoleProps> = ({ logs, errors, warnings, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, errors, warnings]);

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] border-t border-[#1e2430] font-mono text-xs">
      {/* Console Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12161f] border-b border-[#1c2331]">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#00f0ff]" />
          <span className="font-semibold text-[#cbd5e1]">Serial Monitor & System Diagnostics</span>
        </div>
        <div className="flex items-center gap-3">
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800">
              <AlertTriangle size={12} /> {warnings.length} Circuit Warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800">
              <AlertCircle size={12} /> {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-0.5 rounded hover:bg-[#1f2937]"
            title="Clear output"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 font-mono">
        {/* Render Circuit Warnings */}
        {warnings.map((w, idx) => (
          <div key={`w_${idx}`} className="text-amber-400 flex items-start gap-1.5">
            <span className="text-amber-500 font-bold">[CIRCUIT-WARN]</span> {w}
          </div>
        ))}

        {/* Render Compilation / System Errors */}
        {errors.map((e, idx) => (
          <div key={`e_${idx}`} className="text-red-400 flex items-start gap-1.5">
            <span className="text-red-500 font-bold">[COMPILE-ERR]</span> {e}
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
          <div className="text-[#475569] italic">No output. Click "Compile & Run" to execute firmware.</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
