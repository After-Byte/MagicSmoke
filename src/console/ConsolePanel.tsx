import React, { useRef, useEffect } from 'react';
import { Terminal, AlertTriangle, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ConsoleProps {
  logs: string[];
  errors: string[];
  warnings: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClear: () => void;
  telemetrySummary?: string;
}

export const ConsolePanel: React.FC<ConsoleProps> = ({
  logs,
  errors,
  warnings,
  isCollapsed,
  onToggleCollapse,
  onClear,
  telemetrySummary,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCollapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, errors, warnings, isCollapsed]);

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
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-0.5 hover:text-[#00f0ff] text-[#94a3b8] rounded hover:bg-[#1f2937]"
            title="Collapse Console"
          >
            <ChevronDown size={14} />
          </button>
          <Terminal size={14} className="text-[#00f0ff]" />
          <span className="font-semibold text-[#cbd5e1]">Serial Monitor & System Diagnostics</span>
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
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-0.5 rounded hover:bg-[#1f2937] transition-colors"
            title="Clear output"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Scrolling Output */}
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
    </div>
  );
};
