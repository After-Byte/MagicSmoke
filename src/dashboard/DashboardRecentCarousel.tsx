import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Clock,
  Play,
  ArrowRight,
  Layers,
  Plus,
} from 'lucide-react';
import { StoredProject } from '../project/projectStorage';
import { CircuitThumbnail } from './CircuitThumbnail';

interface DashboardRecentCarouselProps {
  projects: StoredProject[];
  onOpenProject: (project: StoredProject) => void;
  onLaunchLineFollowerLab?: (project?: StoredProject) => void;
  onLaunchRobotArmLab?: (project?: StoredProject) => void;
  onCreateNewCircuit?: () => void;
}

export const DashboardRecentCarousel: React.FC<DashboardRecentCarouselProps> = ({
  projects,
  onOpenProject,
  onLaunchLineFollowerLab,
  onLaunchRobotArmLab,
  onCreateNewCircuit,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recentProjects = projects
    .filter((p) => !p.isStarter)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);

  const scroll = (direction: 'left' | 'right') =>
    scrollContainerRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });

  const formatRelativeTime = (timestamp: number) => {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return 'Just now';
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <section className="mb-12 select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FFEA00] text-[#090428] flex items-center justify-center font-black">
            <Layers size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-[#FFEA00] uppercase tracking-widest mb-0.5">
              // WORKSPACE ARCHIVE
            </div>
            <h3 className="text-xl font-black tracking-tight text-white font-mono">
              Recent designs
            </h3>
          </div>
          <span className="font-mono text-[10px] text-[#090428] border border-[#FFEA00] px-2 py-0.5 bg-[#FFEA00] font-bold">
            {recentProjects.length} custom
          </span>
        </div>

        {recentProjects.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 border border-[#FFEA00] bg-[#110849] flex items-center justify-center text-[#FFEA00] hover:bg-[#FFEA00] hover:text-[#090428] transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 border border-[#FFEA00] bg-[#110849] flex items-center justify-center text-[#FFEA00] hover:bg-[#FFEA00] hover:text-[#090428] transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {recentProjects.length === 0 ? (
        <div className="border border-[#FFEA00]/30 bg-[#110849] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-[#090428] text-[#FFEA00] border border-[#FFEA00]/30 flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono">No custom circuit designs yet</div>
              <div className="text-xs text-[#FFF36D]/80 mt-0.5 font-mono">
                Your custom hardware schematics and robotics tests will appear here.
              </div>
            </div>
          </div>
          {onCreateNewCircuit && (
            <button
              onClick={onCreateNewCircuit}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FFEA00] hover:bg-[#FFE000] text-[#090428] font-mono font-bold text-xs cursor-pointer shadow-btn-yellow-sm"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create first circuit</span>
            </button>
          )}
        </div>
      ) : (
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
            const isRobotArm =
              project.id === 'starter_servo_robot_arm' ||
              Boolean(project.document?.robotArm) ||
              project.name.includes('Robot Arm');

            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="w-[280px] shrink-0 bg-[#110849] border border-[#FFEA00]/30 hover:border-[#FFEA00] overflow-hidden hover:shadow-[4px_4px_0px_#FFEA00] hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer group"
                data-testid={`recent-project-card-${project.id}`}
              >
                <div className="h-[138px] w-full bg-[#0D063A] relative overflow-hidden border-b border-[#FFEA00]/30">
                  <CircuitThumbnail
                    components={project.document.components}
                    wires={project.document.wires}
                    className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 z-10">
                    <span className="text-[9px] font-mono font-bold bg-[#FFEA00] text-[#090428] px-1.5 py-0.5">
                      <Cpu size={9} className="inline mr-1" />
                      CUSTOM
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-[#090428]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-[#FFEA00] text-[#090428] font-mono font-bold text-xs flex items-center gap-1">
                      Open circuit <ArrowRight size={12} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col justify-between grow">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white leading-snug group-hover:text-[#FFEA00] transition-colors line-clamp-1 mb-2">
                      {project.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#FFF36D]/80">
                      <span>{compCount} parts</span>
                      <span>•</span>
                      <span>{wireCount} wires</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#FFEA00]/30 text-[10px] font-mono text-[#FFF36D]/70">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {isLineFollower && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchLineFollowerLab
                              ? onLaunchLineFollowerLab(project)
                              : onOpenProject(project);
                          }}
                          className="px-2 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff] hover:text-[#090428] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Play size={9} fill="currentColor" strokeWidth={0} /> Lab
                        </button>
                      )}
                      {isRobotArm && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchRobotArmLab
                              ? onLaunchRobotArmLab(project)
                              : onOpenProject(project);
                          }}
                          className="px-2 py-0.5 bg-[#FFEA00]/20 text-[#FFEA00] border border-[#FFEA00]/40 hover:bg-[#FFEA00] hover:text-[#090428] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Play size={9} fill="currentColor" strokeWidth={0} /> Arm
                        </button>
                      )}
                    </div>
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
