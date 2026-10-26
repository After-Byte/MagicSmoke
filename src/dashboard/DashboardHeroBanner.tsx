import React from 'react';
import autonomousRobotImg from '../assets/autonomous-robot.jpg';

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
      className="hero-card mb-12 border-2 border-[#FFEA00] grid grid-cols-1 lg:grid-cols-[46.5%_53.5%] w-full min-h-[350px] select-none"
      style={{
        backgroundColor: '#110849',
        boxShadow: '10px 10px 0px #FFEA00',
        minHeight: '350px',
        width: '100%',
      }}
    >
      {/* Left Visual Panel - Full-Bleed Edge-to-Edge Image */}
      <div
        className="hero-schematic relative w-full h-full min-w-0 min-h-[260px] lg:min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r-[1.5px] border-[#FFEA00]"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#0D063A',
        }}
      >
        <img
    src="/neon-line-follower-arena.png"
    alt="Neon Line-Follower Robot Arena"
    className="absolute inset-0 w-full h-full object-cover object-[55%_center]"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: '55% center',
    }}
  />
      </div>

      {/* Right Hero Content */}
      <div
        className="hero-details flex flex-col justify-center min-w-0"
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
