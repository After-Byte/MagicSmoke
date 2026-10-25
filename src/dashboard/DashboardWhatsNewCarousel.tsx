import React, { useRef } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight, Move } from 'lucide-react';

interface WhatsNewItem {
  id: string;
  title: string;
  tag: string;
  illustration: React.ReactNode;
  onClick?: () => void;
}

export const DashboardWhatsNewCarousel: React.FC<{
  onLaunchLineFollowerLab?: () => void;
  onLaunchRobotArmLab?: () => void;
}> = ({ onLaunchLineFollowerLab, onLaunchRobotArmLab }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollContainerRef.current?.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  const items: WhatsNewItem[] = [
    // CARD 1: 5-Axis Robot Arm with sine & square telemetry waveforms matching Image 1
    {
      id: 'servo-robot-arm',
      title: '5-Axis articulated servo robot arm with forward kinematics & parallel gripper.',
      tag: 'Robotics lab',
      onClick: onLaunchRobotArmLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          <path
            d="M20 28 Q26 14 32 28 T44 28 T56 28"
            stroke="#FFEA00"
            strokeWidth="2.2"
            fill="none"
          />
          <rect x="36" y="100" width="46" height="18" rx="2" fill="#FFEA00" />
          <path
            d="M59 100 L76 68 L142 54 L192 40"
            stroke="#FFEA00"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="59" cy="100" r="5" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
          <circle cx="76" cy="68" r="5" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
          <circle cx="142" cy="54" r="4.5" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
          <circle cx="192" cy="40" r="4" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
          <path
            d="M192 35 L208 28 M192 45 L208 52"
            stroke="#FFEA00"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M172 108 H182 V96 H194 V108 H206 V96 H218 V108"
            stroke="#FFEA00"
            strokeWidth="2.2"
            fill="none"
          />
        </svg>
      ),
    },

    // CARD 2: Differential Drive Robot on S-Curved Track matching Image 1
    {
      id: 'line-follower',
      title: '8-channel IR array with sub-millimeter centroid estimation.',
      tag: 'Line follower',
      onClick: onLaunchLineFollowerLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          <path
            d="M18 26 Q24 12 30 26 T42 26 T54 26"
            stroke="#FFEA00"
            strokeWidth="2.2"
            fill="none"
          />
          <path
            d="M20 102 C60 102 80 44 140 44 S200 88 228 50"
            stroke="#FFEA00"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />
          <g transform="translate(100 48)">
            <rect x="0" y="8" width="54" height="15" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
            <circle cx="16" cy="15" r="3" fill="#FFEA00" />
            <circle cx="38" cy="15" r="3" fill="#FFEA00" />
            <line x1="27" y1="-4" x2="27" y2="8" stroke="#FFEA00" strokeWidth="2.5" />
            <circle cx="27" cy="-4" r="2.5" fill="#FFEA00" />
          </g>
        </svg>
      ),
    },

    // CARD 3: Microcontroller / IC Chip Pinout matching Image 1: TRA811PNG
    {
      id: 'motor-kinematics',
      title: 'TB6612FNG dual H-bridge driver with torque-speed kinematics.',
      tag: 'Motor driver',
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          <rect
            x="48"
            y="32"
            width="144"
            height="64"
            fill="#110849"
            stroke="#FFEA00"
            strokeWidth="2.5"
          />
          <text
            x="120"
            y="60"
            fill="#FFEA00"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="0.1em"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            TRA811PNG
          </text>
          <text
            x="120"
            y="76"
            fill="#FFF36D"
            fontSize="9"
            letterSpacing="0.05em"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            PoT 1u8 356Hz
          </text>
          <line x1="30" y1="46" x2="48" y2="46" stroke="#FFEA00" strokeWidth="3" />
          <line x1="30" y1="64" x2="48" y2="64" stroke="#FFEA00" strokeWidth="3" />
          <line x1="30" y1="82" x2="48" y2="82" stroke="#FFEA00" strokeWidth="3" />
          <line x1="192" y1="46" x2="210" y2="46" stroke="#FFEA00" strokeWidth="3" />
          <line x1="192" y1="64" x2="210" y2="64" stroke="#FFEA00" strokeWidth="3" />
          <line x1="192" y1="82" x2="210" y2="82" stroke="#FFEA00" strokeWidth="3" />
        </svg>
      ),
    },

    // CARD 4: Closed-Loop Elliptical Trajectory Track with Nodes matching Image 1
    {
      id: 'track-editor',
      title: 'Interactive 2D track editor with instant 3D synchronization.',
      tag: 'Track design',
      onClick: onLaunchLineFollowerLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          <ellipse
            cx="120"
            cy="65"
            rx="82"
            ry="40"
            stroke="#FFEA00"
            strokeWidth="4.5"
            fill="none"
            transform="rotate(-8 120 65)"
          />
          <circle cx="120" cy="22" r="5.5" fill="#FFEA00" />
          <circle cx="120" cy="108" r="5.5" fill="#FFEA00" />
          <circle cx="42" cy="74" r="5.5" fill="#FFEA00" />
          <circle cx="198" cy="56" r="5.5" fill="#FFEA00" />
        </svg>
      ),
    },

    // CARD 5: Firmware Checklist Document with Verified Checkmark matching Image 1
    {
      id: 'mcu-simulation',
      title: 'Real-time Arduino and ESP32 firmware execution with PID tuning.',
      tag: 'Firmware engine',
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          <rect
            x="36"
            y="22"
            width="168"
            height="86"
            fill="#110849"
            stroke="#FFEA00"
            strokeWidth="2.5"
          />
          <line x1="52" y1="42" x2="130" y2="42" stroke="#FFEA00" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="52" y1="56" x2="148" y2="56" stroke="#FFEA00" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="52" y1="70" x2="118" y2="70" stroke="#FFEA00" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="52" y1="84" x2="138" y2="84" stroke="#FFEA00" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="172" cy="65" r="17" fill="#110849" stroke="#FFEA00" strokeWidth="2.5" />
          <path
            d="M164 65 L170 71 L182 58"
            stroke="#FFEA00"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="signal-section mb-12 select-none">
      {/* Section Header */}
      <div className="signal-header flex items-center justify-between mb-5">
        <div className="signal-title-group flex items-center gap-3.5">
          <div className="signal-icon-box w-[34px] h-[38px] bg-[#FFEA00] text-[#090428] flex items-center justify-center font-bold">
            <Lightbulb size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="signal-kicker font-mono text-[11px] tracking-wider text-[#FFF36D] uppercase mb-0.5">
              // SIGNAL LOG
            </div>
            {/* Warm Yellow #FFEA00 heading matching user instructions */}
            <h2 className="signal-heading text-2xl font-bold tracking-tight text-[#FFEA00]">
              What&apos;s new in MagicSmoke
            </h2>
          </div>
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="carousel-arrows flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="arrow-btn w-9 h-9 bg-[#110849] border-[1.5px] border-[#FFEA00] flex items-center justify-center text-[#FFEA00] hover:bg-[#FFEA00] hover:text-[#090428] transition-colors cursor-pointer text-base"
            title="Previous Signal"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="arrow-btn w-9 h-9 bg-[#110849] border-[1.5px] border-[#FFEA00] flex items-center justify-center text-[#FFEA00] hover:bg-[#FFEA00] hover:text-[#090428] transition-colors cursor-pointer text-base"
            title="Next Signal"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 5 Technical Cards matching Image 1 */}
      <div
        ref={scrollContainerRef}
        className="cards-grid flex gap-5 overflow-x-auto pb-3 scrollbar-none snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className="log-card w-[280px] shrink-0 border-[1.5px] border-[#FFEA00] bg-[#110849] overflow-hidden hover:shadow-[0_0_16px_rgba(255,234,0,0.35)] hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer group"
            style={{
              backgroundColor: '#110849',
              boxShadow: '0 6px 20px rgba(5, 2, 28, 0.65)',
            }}
          >
            {/* Upper Illustration Stage */}
            <div className="h-[142px] w-full bg-[#0D063A] flex items-center justify-center overflow-hidden border-b-[1.5px] border-[#FFEA00] group-hover:brightness-110 transition-all">
              {item.illustration}
            </div>

            {/* Lower Information */}
            <div className="p-4 flex flex-col justify-between flex-1 bg-[#110849]">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#FFEA00] uppercase tracking-wider">
                  [{item.tag}]
                </span>
                <h4 className="mt-1.5 text-xs font-mono font-bold text-[#FFF36D] leading-snug group-hover:text-[#FFEA00] transition-colors line-clamp-2">
                  {item.title}
                </h4>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-[#FFF36D]/80">
                <span>Inspect Signal</span>
                <Move size={11} className="text-[#FFEA00]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
