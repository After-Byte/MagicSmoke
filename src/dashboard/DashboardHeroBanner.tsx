import React from 'react';
import { Sparkles, ArrowRight, Play, Cpu, Layers } from 'lucide-react';

interface DashboardHeroBannerProps {
  onLaunchLineFollowerLab: () => void;
  onCreateNewCircuit: () => void;
  onViewSchematic?: () => void;
}

export const DashboardHeroBanner: React.FC<DashboardHeroBannerProps> = ({
  onLaunchLineFollowerLab,
  onCreateNewCircuit,
  onViewSchematic,
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs flex flex-col md:flex-row mb-8 select-none">
      {/* Left Column: Stylized Robotics & Circuit Visual Illustration (~40%) */}
      <div className="md:w-[42%] bg-gradient-to-br from-[#0c1424] via-[#0d1e38] to-[#081220] relative overflow-hidden flex items-center justify-center min-h-[200px] p-6 text-white">
        {/* Subtle background tech grid and circuit paths */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
          preserveAspectRatio="none"
          viewBox="0 0 400 220"
          fill="none"
        >
          {/* Track curve line */}
          <path
            d="M 20 180 C 100 80, 160 200, 240 100 S 340 180, 390 60"
            stroke="#00b8d9"
            strokeWidth="3.5"
            strokeDasharray="6 6"
          />
          {/* Ground grid lines */}
          <line x1="0" y1="180" x2="400" y2="180" stroke="#334155" strokeWidth="1" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="#1e293b" strokeWidth="1" />
          <line x1="50" y1="160" x2="100" y2="220" stroke="#1e293b" strokeWidth="1" />
          <line x1="150" y1="160" x2="200" y2="220" stroke="#1e293b" strokeWidth="1" />
          <line x1="250" y1="160" x2="300" y2="220" stroke="#1e293b" strokeWidth="1" />
          <line x1="350" y1="160" x2="400" y2="220" stroke="#1e293b" strokeWidth="1" />
        </svg>

        {/* Foreground 2WD Robot Chassis Illustration */}
        <div className="relative z-10 flex flex-col items-center">
          {/* 3D Chassis Representation */}
          <div className="relative w-44 h-28 flex items-center justify-center">
            {/* Robot Base Body */}
            <div className="w-32 h-20 bg-[#162033] rounded-xl border border-[#38bdf8]/40 shadow-[0_0_25px_rgba(56,189,248,0.25)] flex flex-col justify-between p-2 relative">
              {/* Arduino Uno microcontroller chip */}
              <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#38bdf8]">
                <span>UNO R3</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="w-20 h-5 bg-[#0b101b] rounded border border-[#1e293b] mx-auto flex items-center justify-center text-[7px] font-mono text-[#94a3b8]">
                ATmega328P
              </div>
              {/* TB6612FNG Dual Driver */}
              <div className="flex justify-between items-center text-[7px] font-mono text-[#cbd5e1] border-t border-[#1e2a3c] pt-1">
                <span className="text-amber-400 font-semibold">TB6612FNG</span>
                <span className="text-emerald-400">2S LiPo</span>
              </div>
            </div>

            {/* Left Motor Wheel */}
            <div className="absolute -left-3 top-2 w-4 h-16 bg-[#0a0e17] rounded-md border border-[#475569] shadow-md flex items-center justify-center">
              <div className="w-2 h-10 bg-[#334155] rounded-xs" />
            </div>

            {/* Right Motor Wheel */}
            <div className="absolute -right-3 top-2 w-4 h-16 bg-[#0a0e17] rounded-md border border-[#475569] shadow-md flex items-center justify-center">
              <div className="w-2 h-10 bg-[#334155] rounded-xs" />
            </div>

            {/* 8-Channel IR Reflectance Array Bar (Front) */}
            <div className="absolute -bottom-2 w-28 h-3.5 bg-[#0f172a] rounded-sm border border-[#38bdf8]/60 flex items-center justify-around px-1 shadow-[0_0_12px_rgba(56,189,248,0.4)]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === 3 || i === 4 ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#334155]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Under-chassis telemetry indicator */}
          <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e293b]/80 border border-[#38bdf8]/30 backdrop-blur-sm text-[11px] font-mono text-[#38bdf8]">
            <span className="w-2 h-2 rounded-full bg-[#00b8d9] animate-ping" />
            <span>Closed-Loop PID Control</span>
          </div>
        </div>
      </div>

      {/* Right Column: Copy & Actions (~58%) */}
      <div className="md:w-[58%] p-6 sm:p-8 flex flex-col justify-center items-start bg-white">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#1677ff] bg-[#1677ff]/10 px-2.5 py-0.5 rounded-full border border-[#1677ff]/20 uppercase tracking-wider">
            <Sparkles size={11} /> Featured Simulation Lab
          </span>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Closed-Loop Feedback Verified
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#172033] leading-tight mb-2.5 tracking-tight">
          Autonomous Line Follower Robotics Lab
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-[13px] text-[#64748b] leading-relaxed mb-6 max-w-xl">
          Complete hardware simulation: Arduino Uno R3 running C++ PID firmware, 8-channel optical reflectance sensor array, TB6612FNG dual motor driver, and unicycle differential drive kinematics inside an interactive 3D arena.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onLaunchLineFollowerLab}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1677ff] hover:bg-[#0060df] text-white font-bold text-xs font-mono shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer active:scale-95"
            data-testid="launch-line-follower-lab-btn"
          >
            <Play size={14} fill="currentColor" />
            <span>Launch Line Follower Lab</span>
            <ArrowRight size={14} />
          </button>

          {onViewSchematic && (
            <button
              onClick={onViewSchematic}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#172033] border border-[#e2e8f0] text-xs font-mono transition-colors cursor-pointer"
              title="Open schematic and wiring directly in Circuit Editor"
              data-testid="view-schematic-btn"
            >
              <Layers size={13} />
              <span>View Schematic</span>
            </button>
          )}

          <button
            onClick={onCreateNewCircuit}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1677ff] border border-[#cbd5e1] text-xs font-mono font-semibold transition-colors cursor-pointer"
            data-testid="banner-new-circuit-btn"
          >
            <Cpu size={13} />
            <span>+ New Circuit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
