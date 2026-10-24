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
    // CARD 1: 5-Axis Robot Arm with sine & square telemetry waveforms matching Image 2
    {
      id: 'servo-robot-arm',
      title: '5-Axis articulated servo robot arm with forward kinematics & parallel gripper.',
      tag: 'Robotics lab',
      onClick: onLaunchRobotArmLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          {/* Top-left sine wave annotation */}
          <path
            d="M20 28 Q26 14 32 28 T44 28 T56 28"
            stroke="#fff000"
            strokeWidth="2"
            fill="none"
          />

          {/* Robot Base Pedestal */}
          <rect x="36" y="100" width="46" height="18" rx="2" fill="#fff000" />

          {/* Articulated Arm Segments */}
          <path
            d="M59 100 L76 68 L142 54 L192 40"
            stroke="#fff000"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Joint Pivot Nodes */}
          <circle cx="59" cy="100" r="5" fill="#07081e" stroke="#fff000" strokeWidth="2.5" />
          <circle cx="76" cy="68" r="5" fill="#07081e" stroke="#fff000" strokeWidth="2.5" />
          <circle cx="142" cy="54" r="4.5" fill="#07081e" stroke="#fff000" strokeWidth="2.5" />
          <circle cx="192" cy="40" r="4" fill="#07081e" stroke="#fff000" strokeWidth="2.5" />

          {/* Gripper Jaws */}
          <path
            d="M192 35 L208 28 M192 45 L208 52"
            stroke="#fff000"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Bottom-right square wave telemetry */}
          <path
            d="M172 108 H182 V96 H194 V108 H206 V96 H218 V108"
            stroke="#fff000"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      ),
    },

    // CARD 2: Differential Drive Robot on S-Curved Track matching Image 2
    {
      id: 'line-follower',
      title: '8-channel IR array with sub-millimeter centroid estimation.',
      tag: 'Line follower',
      onClick: onLaunchLineFollowerLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          {/* Top-left waveform annotation */}
          <path
            d="M18 26 Q24 12 30 26 T42 26 T54 26"
            stroke="#fff000"
            strokeWidth="2"
            fill="none"
          />

          {/* S-Bend Track Ribbon */}
          <path
            d="M20 102 C60 102 80 44 140 44 S200 88 228 50"
            stroke="#fff000"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />

          {/* Robot Chassis & Optical Sensors */}
          <g transform="translate(100 48)">
            <rect x="0" y="8" width="54" height="15" fill="#0c0d30" stroke="#fff000" strokeWidth="2.5" />
            <circle cx="16" cy="15" r="3" fill="#fff000" />
            <circle cx="38" cy="15" r="3" fill="#fff000" />
            {/* Front IR emitter antenna */}
            <line x1="27" y1="-4" x2="27" y2="8" stroke="#fff000" strokeWidth="2.5" />
            <circle cx="27" cy="-4" r="2.5" fill="#fff000" />
          </g>
        </svg>
      ),
    },

    // CARD 3: Microcontroller / IC Chip Pinout matching Image 2
    {
      id: 'motor-kinematics',
      title: 'TB6612FNG dual H-bridge driver with torque-speed kinematics.',
      tag: 'Motor driver',
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          {/* IC Chip Outline */}
          <rect
            x="48"
            y="32"
            width="144"
            height="64"
            fill="#07081e"
            stroke="#fff000"
            strokeWidth="2.5"
          />

          {/* IC Chip Typography matching Image 2: TRABLI1PNG */}
          <text
            x="120"
            y="60"
            fill="#fff000"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="0.1em"
            textAnchor="middle"
            fontFamily="monospace"
          >
            TRA811PNG
          </text>
          <text
            x="120"
            y="76"
            fill="#fff000"
            fontSize="9"
            letterSpacing="0.05em"
            textAnchor="middle"
            fontFamily="monospace"
          >
            PoT 1u8 356Hz
          </text>

          {/* Left Pins */}
          <line x1="30" y1="46" x2="48" y2="46" stroke="#fff000" strokeWidth="3" />
          <line x1="30" y1="64" x2="48" y2="64" stroke="#fff000" strokeWidth="3" />
          <line x1="30" y1="82" x2="48" y2="82" stroke="#fff000" strokeWidth="3" />

          {/* Right Pins */}
          <line x1="192" y1="46" x2="210" y2="46" stroke="#fff000" strokeWidth="3" />
          <line x1="192" y1="64" x2="210" y2="64" stroke="#fff000" strokeWidth="3" />
          <line x1="192" y1="82" x2="210" y2="82" stroke="#fff000" strokeWidth="3" />
        </svg>
      ),
    },

    // CARD 4: Closed-Loop Elliptical Trajectory Track with Nodes matching Image 2
    {
      id: 'track-editor',
      title: 'Interactive 2D track editor with instant 3D synchronization.',
      tag: 'Track design',
      onClick: onLaunchLineFollowerLab,
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          {/* Elliptical racetrack loop */}
          <ellipse
            cx="120"
            cy="65"
            rx="82"
            ry="40"
            stroke="#fff000"
            strokeWidth="4.5"
            fill="none"
            transform="rotate(-8 120 65)"
          />

          {/* Four orbital nodal connection points matching Image 2 */}
          <circle cx="120" cy="22" r="5.5" fill="#fff000" />
          <circle cx="120" cy="108" r="5.5" fill="#fff000" />
          <circle cx="42" cy="74" r="5.5" fill="#fff000" />
          <circle cx="198" cy="56" r="5.5" fill="#fff000" />
        </svg>
      ),
    },

    // CARD 5: Firmware Checklist Document with Verified Checkmark matching Image 2
    {
      id: 'mcu-simulation',
      title: 'Real-time Arduino and ESP32 firmware execution with PID tuning.',
      tag: 'Firmware engine',
      illustration: (
        <svg viewBox="0 0 240 130" className="w-full h-full p-2" fill="none">
          {/* Card outline border */}
          <rect
            x="36"
            y="22"
            width="168"
            height="86"
            fill="#07081e"
            stroke="#fff000"
            strokeWidth="2"
          />

          {/* Firmware Code line bars */}
          <line x1="52" y1="42" x2="130" y2="42" stroke="#fff000" strokeWidth="4" strokeLinecap="round" />
          <line x1="52" y1="56" x2="148" y2="56" stroke="#fff000" strokeWidth="4" strokeLinecap="round" />
          <line x1="52" y1="70" x2="118" y2="70" stroke="#fff000" strokeWidth="4" strokeLinecap="round" />
          <line x1="52" y1="84" x2="138" y2="84" stroke="#fff000" strokeWidth="4" strokeLinecap="round" />

          {/* Verified Circle Checkmark Badge */}
          <circle cx="172" cy="65" r="17" fill="#07081e" stroke="#fff000" strokeWidth="2.5" />
          <path
            d="M164 65 L170 71 L182 58"
            stroke="#fff000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="mb-12 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Yellow Square Icon with Bulb matching Image 2 */}
          <div className="w-9 h-9 bg-[#fff000] text-[#07081e] flex items-center justify-center font-black">
            <Lightbulb size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-[#fff000] uppercase tracking-widest mb-0.5">
              // SIGNAL LOG
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">
              What&apos;s new in MagicSmoke
            </h3>
          </div>
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 border border-[#fff000] bg-[#0c0d30] flex items-center justify-center text-[#fff000] hover:bg-[#fff000] hover:text-[#07081e] transition-colors cursor-pointer"
            title="Previous Signal"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 border border-[#fff000] bg-[#0c0d30] flex items-center justify-center text-[#fff000] hover:bg-[#fff000] hover:text-[#07081e] transition-colors cursor-pointer"
            title="Next Signal"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 5 Technical Cards matching Image 2 */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className="w-[280px] shrink-0 border-2 border-[#fff000] bg-[#0c0d30] overflow-hidden hover:shadow-hard-yellow hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer group"
          >
            {/* Upper Illustration Stage */}
            <div className="h-[136px] w-full bg-[#07081e] flex items-center justify-center overflow-hidden border-b-2 border-[#fff000] group-hover:brightness-110 transition-all">
              {item.illustration}
            </div>

            {/* Lower Information */}
            <div className="p-4 flex flex-col justify-between flex-1 bg-[#0c0d30]">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#fff000] uppercase tracking-wider">
                  [{item.tag}]
                </span>
                <h4 className="mt-1.5 text-xs font-mono font-bold text-white leading-snug group-hover:text-[#fff000] transition-colors line-clamp-2">
                  {item.title}
                </h4>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-[#8b8ac4]">
                <span>Inspect Signal</span>
                <Move size={11} className="text-[#fff000]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
