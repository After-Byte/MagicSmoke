import React, { useRef } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from 'lucide-react';

interface WhatsNewItem {
  id: string;
  title: string;
  linkText: string;
  imageBg: string;
  illustration: React.ReactNode;
}

export const WhatsNewCarousel: React.FC = () => {
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
      id: 'measure-tool',
      title: 'New Measure tool - easily check and edit distances.',
      linkText: 'Read Now >',
      imageBg: 'bg-[#e0f2fe]',
      illustration: (
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* 3D Cyan Grid Plane */}
          <path d="M10 100 L100 65 L190 100 L100 115 Z" fill="#bae6fd" opacity="0.6" />
          <path d="M30 90 L100 65 L170 90" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
          <path d="M50 80 L100 65 L150 80" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
          
          {/* Column 1 */}
          <rect x="40" y="55" width="28" height="45" rx="2" fill="#94a3b8" />
          <path d="M40 55 L54 45 L68 55 Z" fill="#cbd5e1" />
          
          {/* Column 2 */}
          <rect x="130" y="45" width="28" height="55" rx="2" fill="#94a3b8" />
          <path d="M130 45 L144 35 L158 45 Z" fill="#cbd5e1" />

          {/* Dimension measurement line with blue dots */}
          <line x1="54" y1="35" x2="144" y2="35" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="54" cy="35" r="3.5" fill="#0284c7" />
          <circle cx="144" cy="35" r="3.5" fill="#0284c7" />
          <text x="99" y="30" fill="#0369a1" fontSize="10" fontWeight="bold" textAnchor="middle">42.5 mm</text>
        </svg>
      ),
    },
    {
      id: 'email-verification',
      title: 'Email verification coming soon if you sign in with email.',
      linkText: 'Read Now >',
      imageBg: 'bg-[#0f172a]',
      illustration: (
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Dark 3D perspective background */}
          <rect width="200" height="120" fill="#0f172a" />
          <path d="M0 80 L200 60 L200 120 L0 120 Z" fill="#1e293b" opacity="0.5" />
          
          {/* Floating White Dialog */}
          <g transform="translate(45, 20)">
            <rect width="110" height="75" rx="6" fill="#ffffff" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.4))" />
            <rect x="10" y="10" width="40" height="5" rx="2.5" fill="#0f172a" />
            <rect x="10" y="22" width="90" height="3" rx="1.5" fill="#94a3b8" />
            <rect x="10" y="28" width="75" height="3" rx="1.5" fill="#cbd5e1" />
            <rect x="10" y="38" width="90" height="12" rx="3" fill="#f1f5f9" stroke="#cbd5e1" />
            <rect x="10" y="56" width="90" height="12" rx="3" fill="#0175da" />
            <text x="55" y="65" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">Verify Email</text>
          </g>
        </svg>
      ),
    },
    {
      id: 'tinkercad-robotics',
      title: 'Introducing Tinkercad Robotics.',
      linkText: 'Read Now >',
      imageBg: 'bg-[#dcfce7]',
      illustration: (
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <rect width="200" height="120" fill="#f0fdf4" />
          {/* Robotic Track & Machine */}
          <rect x="20" y="85" width="160" height="12" rx="3" fill="#0284c7" />
          <rect x="25" y="80" width="150" height="5" rx="1" fill="#eab308" />
          
          {/* Robotics spheres */}
          <circle cx="50" cy="74" r="11" fill="#ef4444" />
          <circle cx="75" cy="76" r="9" fill="#f97316" />
          <circle cx="95" cy="78" r="7" fill="#22c55e" />

          {/* Robotic Gantry / Crane Arm */}
          <rect x="135" y="25" width="12" height="70" fill="#0369a1" />
          <rect x="90" y="25" width="55" height="10" fill="#0284c7" />
          <line x1="105" y1="35" x2="105" y2="55" stroke="#64748b" strokeWidth="3" />
          <path d="M98 55 L105 62 L112 55" stroke="#ef4444" strokeWidth="2.5" fill="none" />
        </svg>
      ),
    },
    {
      id: 'codeblocks-shapes',
      title: 'Codeblocks Shapes: Build Once, Customize in 3D.',
      linkText: 'Read Now >',
      imageBg: 'bg-[#f1f5f9]',
      illustration: (
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Palette Sidebar */}
          <rect x="15" y="10" width="75" height="100" rx="4" fill="#ffffff" stroke="#e2e8f0" />
          <rect x="22" y="18" width="40" height="5" rx="2" fill="#ef4444" />
          <rect x="22" y="28" width="50" height="5" rx="2" fill="#0284c7" />
          <rect x="22" y="38" width="45" height="5" rx="2" fill="#eab308" />
          <rect x="22" y="48" width="55" height="5" rx="2" fill="#22c55e" />
          
          {/* 3D Shapes */}
          <polygon points="125,25 155,10 185,25 155,40" fill="#ef4444" />
          <polygon points="125,25 155,40 155,65 125,50" fill="#b91c1c" />
          <polygon points="185,25 155,40 155,65 185,50" fill="#dc2626" />

          {/* House Roof shape */}
          <polygon points="145,75 165,60 185,75" fill="#0284c7" />
          <rect x="148" y="75" width="34" height="25" fill="#f8fafc" stroke="#cbd5e1" />
        </svg>
      ),
    },
    {
      id: 'control-codeblocks',
      title: 'Take Control of your Codeblocks designs.',
      linkText: 'Read Now >',
      imageBg: 'bg-[#f8fafc]',
      illustration: (
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* 3D Model Ribbed wall */}
          <g transform="translate(15, 20)">
            <rect x="0" y="0" width="65" height="75" rx="3" fill="#dc2626" />
            <line x1="0" y1="15" x2="65" y2="15" stroke="#ef4444" strokeWidth="2" />
            <line x1="0" y1="30" x2="65" y2="30" stroke="#ef4444" strokeWidth="2" />
            <line x1="0" y1="45" x2="65" y2="45" stroke="#ef4444" strokeWidth="2" />
            <line x1="0" y1="60" x2="65" y2="60" stroke="#ef4444" strokeWidth="2" />
          </g>

          {/* Properties Panel */}
          <g transform="translate(95, 15)">
            <rect width="85" height="85" rx="4" fill="#ffffff" stroke="#cbd5e1" />
            <rect x="10" y="10" width="65" height="6" rx="2" fill="#334155" />
            <line x1="10" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1" />
            <rect x="10" y="32" width="30" height="5" rx="2" fill="#94a3b8" />
            <rect x="10" y="42" width="65" height="6" rx="3" fill="#e2e8f0" />
            <rect x="10" y="55" width="25" height="5" rx="2" fill="#94a3b8" />
            <rect x="10" y="65" width="50" height="6" rx="3" fill="#0175da" />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <section className="mb-7 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={20} className="text-[#0175da]" />
            <h3 className="text-[19px] font-bold text-[#1b1a1a] tracking-tight">What's New</h3>
          </div>
          <button className="px-3 py-1 rounded-full border border-[#d0d5db] text-[#414651] text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer">
            View all
          </button>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-[#d0d5db] bg-white flex items-center justify-center text-[#646e80] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer shadow-2xs"
            title="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-[#d0d5db] bg-white flex items-center justify-center text-[#646e80] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer shadow-2xs"
            title="Next"
          >
            <ChevronRight size={16} />
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
            className="w-[245px] shrink-0 bg-white border border-[#e2e4e7] rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col justify-between cursor-pointer group"
          >
            {/* Image / Illustration */}
            <div className={`h-[125px] w-full ${item.imageBg} flex items-center justify-center overflow-hidden border-b border-[#e2e4e7]`}>
              {item.illustration}
            </div>

            {/* Content */}
            <div className="p-3.5 flex flex-col justify-between grow">
              <h4 className="text-[13px] font-semibold text-[#1b1a1a] leading-snug line-clamp-2 mb-3 group-hover:text-[#0175da] transition-colors">
                {item.title}
              </h4>
              <span className="text-[12px] font-bold text-[#0175da] flex items-center gap-1 group-hover:underline">
                {item.linkText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
