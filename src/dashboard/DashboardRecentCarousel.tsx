import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Cpu, Clock, Play, ArrowRight, Layers, Sparkles, Plus } from 'lucide-react';
import { StoredProject } from '../project/projectStorage';
import { CircuitThumbnail } from './CircuitThumbnail';

interface DashboardRecentCarouselProps {
  projects: StoredProject[];
  onOpenProject: (project: StoredProject) => void;
  onLaunchLineFollowerLab?: (project?: StoredProject) => void;
  onCreateNewCircuit?: () => void;
}

export const DashboardRecentCarousel: React.FC<DashboardRecentCarouselProps> = ({
  projects,
  onOpenProject,
  onLaunchLineFollowerLab,
  onCreateNewCircuit,
}) => {
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

  const formatRelativeTime = (timestamp: number) => {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return 'Just now';
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter to custom user designs only (preventing collisions with starter templates)
  const recentProjects = projects
    .filter((p) => !p.isStarter)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);

  return (
    <section className="mb-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center">
            <Layers size={15} />
          </div>
          <h3 className="text-base font-bold text-[#172033] tracking-tight">
            Recent Designs
          </h3>
          <span className="text-[11px] font-mono text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full border border-[#e2e8f0]">
            {recentProjects.length} custom {recentProjects.length === 1 ? 'circuit' : 'circuits'}
          </span>
        </div>

        {/* Carousel Prev/Next Buttons */}
        {recentProjects.length > 0 && (
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
        )}
      </div>

      {recentProjects.length === 0 ? (
        /* Empty State Prompt for Brand New Users */
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center shrink-0">
              <Cpu size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#172033]">
                No custom circuit designs yet
              </div>
              <div className="text-[11px] text-[#64748b]">
                Your personal circuits, robotics tests, and modified firmware sketches will automatically appear here.
              </div>
            </div>
          </div>
          {onCreateNewCircuit && (
            <button
              onClick={onCreateNewCircuit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1677ff] hover:bg-[#0060df] text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={14} />
              <span>Create First Circuit</span>
            </button>
          )}
        </div>
      ) : (
        /* Cards list container */
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recentProjects.map((project) => {
            const compCount = project.document.components.length;
            const wireCount = project.document.wires.length;
            const isLineFollower =
              project.id === 'starter_line_follower_robot' ||
              project.id === 'starter_line_follower' ||
              project.name.includes('Line Follower');

            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="w-[270px] shrink-0 bg-white border border-[#e2e8f0] hover:border-[#1677ff]/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group relative hover:-translate-y-0.5"
                data-testid={`recent-project-card-${project.id}`}
              >
                {/* Thumbnail Area with CircuitThumbnail SVG */}
                <div className="h-[135px] w-full bg-[#0a0e17] relative overflow-hidden border-b border-[#e2e8f0] flex items-center justify-center">
                  <CircuitThumbnail
                    components={project.document.components}
                    wires={project.document.wires}
                    className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 z-10">
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1677ff]/20 text-[#38bdf8] border border-[#1677ff]/30 backdrop-blur-sm">
                      <Cpu size={9} /> Custom
                    </span>
                  </div>

                  {/* Hover overlay button "Open Circuit" */}
                  <div className="absolute inset-0 bg-[#0c1424]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-2xs gap-2">
                    <span className="px-3 py-1 rounded-full bg-white text-[#1677ff] font-bold text-xs shadow-md transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-200 flex items-center gap-1">
                      <span>Open Circuit</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

                {/* Project Info */}
                <div className="p-3.5 flex flex-col justify-between grow bg-white">
                  <div>
                    <h4 className="text-xs font-bold text-[#172033] leading-snug group-hover:text-[#1677ff] transition-colors line-clamp-1 mb-1">
                      {project.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748b]">
                      <span>{compCount} parts</span>
                      <span>•</span>
                      <span>{wireCount} wires</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] font-mono text-[#64748b]">
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock size={11} />
                      {formatRelativeTime(project.updatedAt)}
                    </span>

                    {isLineFollower && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onLaunchLineFollowerLab) onLaunchLineFollowerLab(project);
                          else onOpenProject(project);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Play size={9} fill="currentColor" />
                        <span>Lab</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
