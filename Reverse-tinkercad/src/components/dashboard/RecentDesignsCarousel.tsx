import React, { useRef } from 'react';
import { Box, ChevronLeft, ChevronRight, Cpu, MoreVertical, Plus, Play } from 'lucide-react';

interface RecentDesignsCarouselProps {
  onOpenProject: (projectId: string) => void;
}

export const RecentDesignsCarousel: React.FC<RecentDesignsCarouselProps> = ({ onOpenProject }) => {
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

  const designs = [
    {
      id: 'incredible-jofo-snaget',
      title: 'Incredible Jofo-Snaget',
      type: 'Circuits',
      modified: 'Modified 2 hours ago',
      isHero: true,
      thumbnail: (
        <div className="w-full h-full bg-[#f2f3f5] relative flex items-center justify-center p-3 select-none">
          {/* Mini Arduino Uno */}
          <div className="w-20 h-16 bg-[#00838f] rounded-xs border border-[#006064] relative shadow-xs mr-2 flex flex-col justify-between p-1">
            <div className="text-[6px] text-white font-mono font-bold">ARDUINO UNO</div>
            <div className="w-12 h-3.5 bg-[#1b1a1a] rounded-2xs mx-auto"></div>
            <div className="flex justify-between items-center text-[5px] text-white">
              <span>DIGITAL</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            {/* USB plug graphic on left */}
            <div className="absolute -left-3 top-3 w-3 h-4 bg-[#1e293b] rounded-l-xs"></div>
          </div>

          {/* Mini Breadboard */}
          <div className="w-16 h-18 bg-[#ffffff] rounded-xs border border-[#cbd5e1] shadow-2xs p-1 flex flex-col justify-between">
            <div className="flex justify-between border-b border-red-300 pb-0.5">
              <span className="text-[5px] text-red-500">+</span>
              <span className="text-[5px] text-blue-500">-</span>
            </div>
            <div className="grid grid-cols-4 gap-0.5 my-auto">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-neutral-300"></div>
              ))}
            </div>
            <div className="flex justify-between border-t border-blue-300 pt-0.5">
              <span className="text-[5px] text-blue-500">-</span>
              <span className="text-[5px] text-red-500">+</span>
            </div>
          </div>

          {/* Wire connection */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M 65 50 Q 80 30 100 48" stroke="#22c55e" strokeWidth="2" fill="none" />
          </svg>
        </div>
      ),
    },
    {
      id: 'glowing-robos-gogo',
      title: 'Glowing Robos-Gogo',
      type: 'Circuits',
      modified: 'Modified yesterday',
      thumbnail: (
        <div className="w-full h-full bg-[#f2f3f5] relative flex items-center justify-center p-3 select-none">
          <div className="w-20 h-16 bg-[#00838f] rounded-xs border border-[#006064] relative shadow-xs flex items-center justify-center">
            <span className="text-[7px] text-white font-mono font-bold">RGB UNO</span>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          </div>
        </div>
      ),
    },
    {
      id: 'spooky-castle',
      title: 'Spooky Haunted Castle',
      type: '3D Design',
      modified: 'Modified Oct 14',
      thumbnail: (
        <div className="w-full h-full bg-[#f8fafc] relative flex items-center justify-center p-3 select-none">
          <svg viewBox="0 0 100 80" className="w-24 h-20">
            <polygon points="50,15 75,30 25,30" fill="#475569" />
            <rect x="30" y="30" width="40" height="40" fill="#64748b" />
            <polygon points="20,25 35,35 5,35" fill="#334155" />
            <rect x="10" y="35" width="20" height="35" fill="#475569" />
            <polygon points="80,25 95,35 65,35" fill="#334155" />
            <rect x="70" y="35" width="20" height="35" fill="#475569" />
            <rect x="42" y="52" width="16" height="18" rx="8" fill="#1e293b" />
          </svg>
        </div>
      ),
    },
    {
      id: 'robot-gripper-v2',
      title: 'Robotic Arm Gripper v2',
      type: 'Robotics',
      modified: 'Modified Oct 12',
      thumbnail: (
        <div className="w-full h-full bg-[#f0fdf4] relative flex items-center justify-center p-3 select-none">
          <svg viewBox="0 0 100 80" className="w-24 h-20">
            <rect x="20" y="45" width="60" height="12" rx="3" fill="#0284c7" />
            <circle cx="50" cy="51" r="5" fill="#eab308" />
            <path d="M40 45 L35 25 L45 25" stroke="#0284c7" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M60 45 L65 25 L55 25" stroke="#0284c7" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="22" r="6" fill="#ef4444" />
          </svg>
        </div>
      ),
    },
    {
      id: 'traffic-lights',
      title: 'Traffic Light Sequencer',
      type: 'Circuits',
      modified: 'Modified Oct 08',
      thumbnail: (
        <div className="w-full h-full bg-[#f2f3f5] relative flex items-center justify-center p-3 select-none">
          <div className="w-12 h-20 bg-neutral-800 rounded-lg p-1.5 flex flex-col justify-between items-center shadow-md">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
            <div className="w-4 h-4 rounded-full bg-amber-400"></div>
            <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="mb-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Box size={20} className="text-[#0175da]" />
            <h3 className="text-[19px] font-bold text-[#1b1a1a] tracking-tight">Recent designs</h3>
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

      {/* Cards container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {designs.map((design) => (
          <div
            key={design.id}
            onClick={() => onOpenProject(design.id)}
            className={`w-[245px] shrink-0 bg-white border rounded-xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group relative ${
              design.isHero ? 'border-[#0175da]/50 ring-1 ring-[#0175da]/20' : 'border-[#e2e4e7]'
            }`}
          >
            {/* Thumbnail Canvas */}
            <div className="h-[140px] w-full relative overflow-hidden border-b border-[#e2e4e7] group-hover:opacity-95">
              {design.thumbnail}

              {/* Hover overlay button "Tinker this" */}
              <div className="absolute inset-0 bg-[#0175da]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-2xs">
                <span className="px-4 py-1.5 rounded-full bg-white text-[#0175da] font-bold text-xs shadow-md transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                  Tinker this
                </span>
              </div>
            </div>

            {/* Design Info */}
            <div className="p-3.5 flex flex-col justify-between grow">
              <div className="flex items-start justify-between gap-1">
                <h4 className="text-[14px] font-bold text-[#1b1a1a] leading-tight group-hover:text-[#0175da] transition-colors truncate">
                  {design.title}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Options for ${design.title}`);
                  }}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-sm hover:bg-neutral-100 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 text-[11px] text-[#646e80]">
                <span className="flex items-center gap-1 font-semibold text-[#0175da]">
                  <Cpu size={12} />
                  {design.type}
                </span>
                <span>{design.modified}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
