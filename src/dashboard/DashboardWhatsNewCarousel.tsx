import React, { useRef } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight, Cpu, Activity, Move, Zap } from 'lucide-react';

interface WhatsNewItem {
  id: string;
  title: string;
  tag: string;
  illustration: React.ReactNode;
  bgGradient: string;
  onClick?: () => void;
}

export const DashboardWhatsNewCarousel: React.FC<{
  onLaunchLineFollowerLab?: () => void;
}> = ({ onLaunchLineFollowerLab }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const items: WhatsNewItem[] = [
    {
      id: 'line-follower',
      title: '8-Channel IR Reflectance Array with sub-millimeter centroid estimation.',
      tag: 'Robotics Lab',
      bgGradient: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      illustration: (
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Black track ribbon */}
          <path d="M 10 90 Q 60 40 100 60 T 190 30" stroke="#172033" strokeWidth="14" fill="none" strokeLinecap="round" />
          {/* Sensor bar */}
          <rect x="70" y="45" width="60" height="12" rx="3" fill="#1e293b" />
          {/* Active central sensors */}
          <circle cx="85" cy="51" r="3" fill="#64748b" />
          <circle cx="95" cy="51" r="3.5" fill="#ef4444" />
          <circle cx="105" cy="51" r="3.5" fill="#ef4444" />
          <circle cx="115" cy="51" r="3" fill="#64748b" />
          {/* Centroid error indicator */}
          <line x1="100" y1="35" x2="100" y2="45" stroke="#1677ff" strokeWidth="2" />
          <text x="100" y="28" fill="#1677ff" fontSize="9" fontWeight="bold" textAnchor="middle">e = 0.0mm</text>
        </svg>
      ),
      onClick: onLaunchLineFollowerLab,
    },
    {
      id: 'motor-kinematics',
      title: 'TB6612FNG Dual H-Bridge Driver with non-linear torque-speed kinematics.',
      tag: 'Motor Driver',
      bgGradient: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      illustration: (
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Driver IC */}
          <rect x="40" y="30" width="120" height="50" rx="6" fill="#1e293b" />
          <text x="100" y="52" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">TB6612FNG</text>
          <text x="100" y="66" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">PWM A/B 20kHz</text>
          {/* Pins */}
          <line x1="30" y1="45" x2="40" y2="45" stroke="#16a34a" strokeWidth="2" />
          <line x1="30" y1="55" x2="40" y2="55" stroke="#16a34a" strokeWidth="2" />
          <line x1="30" y1="65" x2="40" y2="65" stroke="#16a34a" strokeWidth="2" />
          <line x1="160" y1="45" x2="170" y2="45" stroke="#f59e0b" strokeWidth="2" />
          <line x1="160" y1="55" x2="170" y2="55" stroke="#f59e0b" strokeWidth="2" />
          <line x1="160" y1="65" x2="170" y2="65" stroke="#f59e0b" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 'track-editor',
      title: 'Interactive 2D Track Editor: draw custom closed-loops with instant 3D sync.',
      tag: 'Track Design',
      bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
      illustration: (
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Grid background */}
          <line x1="20" y1="20" x2="180" y2="20" stroke="#e2e8f0" strokeWidth="1" />
          <line x1="20" y1="55" x2="180" y2="55" stroke="#e2e8f0" strokeWidth="1" />
          <line x1="20" y1="90" x2="180" y2="90" stroke="#e2e8f0" strokeWidth="1" />
          {/* Spline curve */}
          <path d="M 30 55 C 60 20, 140 20, 170 55 S 140 90, 30 55 Z" stroke="#d97706" strokeWidth="4" fill="none" />
          {/* Waypoint handle dots */}
          <circle cx="30" cy="55" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="100" cy="20" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="170" cy="55" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="100" cy="90" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      ),
      onClick: onLaunchLineFollowerLab,
    },
    {
      id: 'mcu-simulation',
      title: 'Real-time Arduino & ESP32 firmware execution with PID gain tuning.',
      tag: 'Firmware Engine',
      bgGradient: 'bg-gradient-to-br from-purple-50 to-pink-50',
      illustration: (
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <rect x="25" y="20" width="150" height="70" rx="6" fill="#ffffff" stroke="#cbd5e1" />
          <rect x="35" y="32" width="60" height="5" rx="2" fill="#9333ea" />
          <rect x="35" y="44" width="85" height="4" rx="2" fill="#cbd5e1" />
          <rect x="35" y="54" width="70" height="4" rx="2" fill="#cbd5e1" />
          <rect x="35" y="64" width="95" height="4" rx="2" fill="#a855f7" />
          <circle cx="150" cy="55" r="16" fill="#f3e8ff" />
          <path d="M 144 55 L 148 59 L 157 50" stroke="#9333ea" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="mb-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center">
            <Lightbulb size={15} />
          </div>
          <h3 className="text-base font-bold text-[#172033] tracking-tight">
            What's New in MagicSmoke
          </h3>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full border border-[#cbd5e1] bg-white flex items-center justify-center text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] transition-all cursor-pointer shadow-2xs"
            title="Previous"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full border border-[#cbd5e1] bg-white flex items-center justify-center text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] transition-all cursor-pointer shadow-2xs"
            title="Next"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Cards list container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className="w-[260px] shrink-0 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden hover:shadow-md hover:border-[#1677ff]/40 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
          >
            {/* Image / Illustration */}
            <div className={`h-[120px] w-full ${item.bgGradient} flex items-center justify-center overflow-hidden border-b border-[#e2e8f0] group-hover:brightness-105 transition-all`}>
              {item.illustration}
            </div>

            {/* Content */}
            <div className="p-3.5 flex flex-col justify-between grow">
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1677ff] bg-[#1677ff]/10 px-2 py-0.5 rounded-full border border-[#1677ff]/20">
                  {item.tag}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-[#172033] leading-snug line-clamp-2 group-hover:text-[#1677ff] transition-colors">
                {item.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
