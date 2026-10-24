import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Play,
  Cpu,
  Layers,
  Gauge,
  CircuitBoard,
} from 'lucide-react';

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
    <section className="mb-12 border-2 border-[#fff000] bg-[#0c0d30] overflow-hidden grid grid-cols-1 lg:grid-cols-[1.08fr_1.2fr] min-h-[320px] shadow-hard-yellow select-none">
      {/* LEFT COLUMN: High-Contrast Electric-Yellow Technical Engineering Grid */}
      <div className="relative overflow-hidden bg-[#07081e] p-6 sm:p-8 text-[#fff000] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#fff000]/40">
        {/* Precision Technical Engineering Grid Lines matching Image 2 */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff000 1px, transparent 1px), linear-gradient(90deg, #fff000 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Header Labels */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="px-2 py-0.5 border border-[#fff000] text-[#fff000] text-[10px] font-mono font-bold tracking-widest bg-[#07081e]/80">
            FEATURED SYSTEM / 04
          </div>
          <span className="font-mono text-[10px] text-[#fff000] tracking-wider">
            RS-LAD-SAZ
          </span>
        </div>

        {/* Central Technical Vector Illustration matching Image 2 */}
        <div className="relative z-10 py-6 flex items-center justify-center">
          <svg
            viewBox="0 0 460 180"
            className="w-full max-w-[460px] h-auto drop-shadow-[0_0_8px_rgba(255,240,0,0.4)]"
            fill="none"
            aria-label="Line follower robot system illustration"
          >
            {/* Horizontal guideline */}
            <path
              d="M12 146H450"
              stroke="#fff000"
              strokeWidth="1"
              strokeDasharray="4 7"
              strokeOpacity="0.6"
            />

            {/* Glowing yellow racetrack trajectory line */}
            <path
              d="M20 128C82 48 129 145 201 85S328 50 440 112"
              stroke="#fff000"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M20 128C82 48 129 145 201 85S328 50 440 112"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />

            {/* Differential Drive Robot Assembly */}
            <g transform="translate(186 44)">
              {/* Chassis body */}
              <rect
                x="0"
                y="20"
                width="100"
                height="54"
                rx="3"
                fill="#0c0d30"
                stroke="#fff000"
                strokeWidth="2.5"
              />
              {/* MCU Window */}
              <rect
                x="24"
                y="32"
                width="52"
                height="17"
                fill="#07081e"
                stroke="#fff000"
                strokeWidth="1.5"
              />
              <text
                x="50"
                y="44"
                textAnchor="middle"
                fill="#fff000"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                UNO R3
              </text>

              {/* Status LEDs */}
              <circle cx="12" cy="31" r="3" fill="#fff000" />
              <circle cx="88" cy="31" r="3" fill="#fff000" />

              {/* Left & Right Motor Wheels */}
              <rect
                x="-14"
                y="28"
                width="12"
                height="38"
                rx="4"
                fill="#fff000"
                stroke="#07081e"
                strokeWidth="1"
              />
              <rect
                x="102"
                y="28"
                width="12"
                height="38"
                rx="4"
                fill="#fff000"
                stroke="#07081e"
                strokeWidth="1"
              />

              {/* 8-Channel Optical Sensor Array Front Bar */}
              <rect
                x="21"
                y="76"
                width="58"
                height="9"
                fill="#07081e"
                stroke="#fff000"
                strokeWidth="1.5"
              />
              <circle cx="28" cy="80.5" r="2" fill="#fff000" />
              <circle cx="36" cy="80.5" r="2" fill="#fff000" />
              <circle cx="44" cy="80.5" r="2" fill="#fff000" />
              <circle cx="52" cy="80.5" r="2" fill="#fff000" />
              <circle cx="60" cy="80.5" r="2" fill="#fff000" />
              <circle cx="68" cy="80.5" r="2" fill="#fff000" />
            </g>

            {/* Annotation markers */}
            <text
              x="20"
              y="26"
              fill="#fff000"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              CLOSED LOOP / ACTIVE
            </text>
            <text
              x="355"
              y="166"
              fill="#fff000"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              PID-8CH
            </text>
          </svg>
        </div>

        {/* Status indicator bottom bar */}
        <div className="relative z-10 flex items-center gap-2 text-xs font-mono font-bold text-[#fff000]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fff000] animate-pulse shadow-[0_0_8px_#fff000]" />
          <span>Simulation ready</span>
          <span className="text-[#8b8ac4]">•</span>
          <span>60 FPS</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Project Information & High-Impact Typography */}
      <div className="p-7 sm:p-10 flex flex-col justify-center bg-[#0d0e34] text-white">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-[#fff000] text-[#07081e] px-2.5 py-1 uppercase tracking-wider">
            <Sparkles size={11} strokeWidth={2.5} />
            ROBOTICS LAB
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#fff000] border border-[#fff000] px-2.5 py-1 uppercase tracking-wider bg-[#07081e]/40">
            <Gauge size={11} />
            VERIFIED MODEL
          </span>
        </div>

        {/* Main Headline in Electric Yellow matching Image 2 */}
        <h2 className="text-3xl sm:text-4xl font-black leading-[1.08] tracking-tight text-[#fff000] mb-4">
          Autonomous line follower robotics lab.
        </h2>

        {/* Description in Soft Lavender */}
        <p className="text-sm text-[#d5d4fc] leading-relaxed mb-7 max-w-xl font-sans">
          Build, tune, and observe a complete differential drive robot with live firmware, optical sensing, motor control, and a synchronized 3D arena.
        </p>

        {/* Action Buttons matching Image 2 */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Primary Action Button */}
          <button
            onClick={onLaunchLineFollowerLab}
            className="flex items-center gap-2 px-5 py-3 bg-[#fff000] hover:bg-[#ffe600] text-[#07081e] font-mono font-black text-xs cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,0.6)] active:translate-y-0.5 transition-all"
            data-testid="launch-line-follower-lab-btn"
          >
            <Play size={14} fill="currentColor" strokeWidth={0} />
            <span>Launch lab</span>
            <ArrowRight size={14} strokeWidth={3} />
          </button>

          {/* Secondary Action: View Schematic */}
          {onViewSchematic && (
            <button
              onClick={onViewSchematic}
              className="flex items-center gap-1.5 px-4 py-3 bg-[#07081e] hover:bg-[#151745] text-[#fff000] border border-[#fff000] text-xs font-mono font-bold cursor-pointer transition-colors"
            >
              <Layers size={13} />
              <span>View schematic</span>
            </button>
          )}

          {/* Tertiary Action: New Circuit */}
          <button
            onClick={onCreateNewCircuit}
            className="flex items-center gap-1.5 px-3 py-3 text-[#fff000] hover:text-[#ffe600] text-xs font-mono font-bold cursor-pointer transition-colors"
          >
            <Cpu size={13} />
            <span>New circuit</span>
          </button>
        </div>

        {/* Bottom Hardware Specs Divider */}
        <div className="mt-8 pt-4 border-t border-[#272960] flex items-center gap-6 text-[10px] font-mono text-[#8b8ac4]">
          <span className="flex items-center gap-1.5 text-[#fff000]">
            <CircuitBoard size={13} />
            <span>4 hardware models</span>
          </span>
          <span>8-channel IR</span>
          <span>PID control</span>
        </div>
      </div>
    </section>
  );
};
