import React from 'react';

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
    <section
      className="hero-card mb-12 border-2 border-[#FFEA00] grid grid-cols-1 lg:grid-cols-[46.5%_53.5%] min-h-[350px] select-none"
      style={{
        backgroundColor: '#110849',
        boxShadow: '10px 10px 0px #FFEA00',
        minHeight: '350px',
      }}
    >
      {/* Left Blueprint Grid Panel */}
      <div
        className="hero-schematic relative flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r-[1.5px] border-[#FFEA00]"
        style={{
          backgroundColor: '#0D063A',
          backgroundImage:
            'linear-gradient(to right, rgba(255, 234, 0, 0.42) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 234, 0, 0.42) 1px, transparent 1px)',
          backgroundSize: '29.5px 29.5px',
          backgroundPosition: '-1px -1px',
        }}
      >
        {/* Subtle radial vignette inside blueprint so center glow pops */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 52% 52%, rgba(255, 230, 0, 0.12) 0%, rgba(10, 4, 42, 0.45) 85%)',
          }}
        />

        {/* Top Grid Row: FEATURED SYSTEM / 04 and RS-LAD-SAZ directly in top row above a full-width yellow border */}
        <div
          className="schematic-top-row relative z-10 flex items-center justify-between px-5 font-mono text-xs font-semibold text-[#FFF36D] tracking-widest border-b-[1.5px] border-[#FFEA00]"
          style={{ height: '44px' }}
        >
          <span>FEATURED SYSTEM / 04</span>
          <span>RS-LAD-SAZ</span>
        </div>

        {/* Central Schematic Canvas with Strong SVG Neon Glow Filter */}
        <div className="schematic-canvas relative z-10 flex-1 flex items-center justify-center p-3">
          <svg className="schematic-svg w-[92%] h-[195px] overflow-visible" viewBox="0 0 500 240" fill="none">
            <defs>
              <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="12" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Callout Label Top Left */}
            <text
              x="64"
              y="42"
              fill="#FFF36D"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              letterSpacing="0.06em"
              fontWeight="600"
            >
              CLOSED LOOP / ACTIVE
            </text>
            <line
              x1="120"
              y1="48"
              x2="120"
              y2="112"
              stroke="#FFEA00"
              strokeWidth="1.2"
              opacity="0.8"
            />

            {/* Glowing S-Curve Line Follower Track */}
            <path
              d="M 62 156 C 95 102, 145 148, 195 128 C 255 104, 290 66, 338 82 C 378 96, 412 126, 442 146"
              stroke="#FFEA00"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#neon-glow)"
            />

            {/* Robot Chassis (UNO R3) with Neon Glow */}
            <g filter="url(#neon-glow)">
              {/* Left & Right Wheels */}
              <rect x="195" y="105" width="10" height="36" rx="3" fill="#FFEA00" />
              <rect x="307" y="105" width="10" height="36" rx="3" fill="#FFEA00" />
              {/* Main Chassis Body */}
              <rect
                x="208"
                y="98"
                width="96"
                height="50"
                rx="8"
                fill="#100846"
                stroke="#FFEA00"
                strokeWidth="3.5"
              />
              {/* Inner UNO Board Outline */}
              <rect
                x="234"
                y="112"
                width="44"
                height="22"
                stroke="#FFEA00"
                strokeWidth="1.5"
                fill="#0B0536"
              />
              <text
                x="242"
                y="126"
                fill="#FFEA00"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                fontWeight="700"
              >
                UNO R3
              </text>
              {/* Corner Mounting Pins */}
              <circle cx="216" cy="104" r="2" fill="#FFEA00" />
              <circle cx="296" cy="104" r="2" fill="#FFEA00" />
              <circle cx="216" cy="142" r="2" fill="#FFEA00" />
              <circle cx="296" cy="142" r="2" fill="#FFEA00" />
              {/* Bottom 8-Channel IR Sensor Bar */}
              <rect
                x="233"
                y="148"
                width="46"
                height="10"
                rx="2"
                fill="#100846"
                stroke="#FFEA00"
                strokeWidth="2.5"
              />
              <circle cx="240" cy="153" r="1.6" fill="#FFEA00" />
              <circle cx="248" cy="153" r="1.6" fill="#FFEA00" />
              <circle cx="256" cy="153" r="1.6" fill="#FFEA00" />
              <circle cx="264" cy="153" r="1.6" fill="#FFEA00" />
              <circle cx="272" cy="153" r="1.6" fill="#FFEA00" />
            </g>

            {/* Dashed Datum Line & PID Label */}
            <line
              x1="60"
              y1="176"
              x2="438"
              y2="176"
              stroke="#FFEA00"
              strokeWidth="1.4"
              strokeDasharray="5 6"
              opacity="0.85"
            />
            <text
              x="355"
              y="197"
              fill="#FFF36D"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              letterSpacing="0.06em"
              fontWeight="600"
            >
              PID-8CH
            </text>
          </svg>
        </div>

        {/* Schematic Status Footer */}
        <div className="schematic-footer relative z-10 flex items-center gap-2.5 px-5 py-3.5 font-mono text-sm text-[#FFF36D]">
          <span
            className="status-dot w-2.5 h-2.5 rounded-full bg-[#FFEA00]"
            style={{ boxShadow: '0 0 8px #FFEA00' }}
          />
          <span>Simulation ready • 60 FPS</span>
        </div>
      </div>

      {/* Right Hero Content */}
      <div
        className="hero-details flex flex-col justify-center"
        style={{
          padding: '24px 44px 22px 40px',
          background: 'linear-gradient(135deg, #12094D 0%, #0E0640 100%)',
        }}
      >
        <div className="badge-row flex items-center gap-3 mb-[14px]">
          <span className="badge-solid bg-[#FFEA00] text-[#090428] font-mono font-bold text-xs px-3 py-1.5 inline-flex items-center gap-1.5 tracking-wider">
            ⚙ ROBOTICS LAB
          </span>
          <span className="badge-outline border-[1.5px] border-[#FFEA00] text-[#FFEA00] font-mono font-semibold text-xs px-3 py-1.5 inline-flex items-center gap-1.5 tracking-wider bg-[rgba(17,8,73,0.4)]">
            ◔ VERIFIED MODEL
          </span>
        </div>

        <h1 className="hero-heading text-[40px] font-bold leading-[1.08] tracking-tight text-[#FFEA00] mb-[12px] font-sans">
          Autonomous line follower robotics lab.
        </h1>

        {/* Warm yellow hero description matching Image 1 (#FFF36D) */}
        <p className="hero-description text-[16px] leading-[1.48] text-[#FFF36D] max-w-xl mb-[20px] font-medium font-sans">
          Build, tune, and observe a complete differential drive robot with live firmware, optical sensing, motor control, and a synchronized 3D arena.
        </p>

        {/* CTA Buttons */}
        <div className="cta-row flex flex-wrap items-center gap-4 mb-[20px]">
          <button
            onClick={onLaunchLineFollowerLab}
            className="btn-launch h-[46px] px-6 bg-[#FFEA00] hover:bg-[#ffe600] text-[#090428] font-bold text-sm inline-flex items-center gap-3 cursor-pointer shadow-[0_0_16px_rgba(255,234,0,0.35)] transition-all font-sans"
            data-testid="launch-line-follower-lab-btn"
          >
            <span>▶ Launch lab</span>
            <span>→</span>
          </button>
          {onViewSchematic && (
            <button
              onClick={onViewSchematic}
              className="btn-schematic h-[46px] px-5 bg-[rgba(20,11,77,0.9)] hover:bg-[#110849] text-[#FFEA00] border-[1.5px] border-[#FFEA00] font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors font-sans"
            >
              <span>❖ View schematic</span>
            </button>
          )}
          <button
            onClick={onCreateNewCircuit}
            className="btn-ghost px-3 text-[#FFEA00] hover:text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors font-sans"
          >
            <span>⚙ New circuit</span>
          </button>
        </div>

        {/* Solid Horizontal Yellow Divider Line */}
        <div
          className="hero-divider w-full"
          style={{
            height: '1.5px',
            backgroundColor: '#FFEA00',
            opacity: 0.75,
            marginBottom: '14px',
          }}
        />

        {/* Bottom Hardware Specs in Warm Yellow (#FFF36D) */}
        <div className="specs-footer flex flex-wrap items-center gap-7 font-mono text-[12.5px] text-[#FFF36D]">
          <span className="spec-item inline-flex items-center gap-2">
            <span>▣</span>
            <span>4 hardware models</span>
          </span>
          <span className="spec-item">8-channel IR</span>
          <span className="spec-item">PID control</span>
        </div>
      </div>
    </section>
  );
};
