import React, { useState } from 'react';
import {
  Home,
  LayoutGrid,
  Bot,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Activity,
  Layers,
  CircleDot,
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: 'all' | 'custom' | 'starters' | 'lab' | 'arm') => void;
  counts?: { all: number; custom: number; starters: number };
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab = 'all',
  onTabChange,
  counts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'all' as const, label: 'Mission Control', icon: Home, count: counts?.all },
    { id: 'custom' as const, label: 'Circuit Projects', icon: LayoutGrid, count: counts?.custom },
    { id: 'starters' as const, label: 'Starter Labs', icon: Layers, count: counts?.starters },
    { id: 'lab' as const, label: 'Line Follower Lab', icon: Bot, isSpecial: true },
    { id: 'arm' as const, label: 'Robot Arm Lab', icon: Bot, isSpecial: true },
  ];

  return (
    <aside
      className={`dashboard-sidebar bg-[#090a26] border-r border-[#212354] flex flex-col justify-between transition-all duration-300 relative select-none z-30 shrink-0 ${
        isExpanded ? 'w-56' : 'w-[72px]'
      }`}
    >
      {/* Top Section: Technical Circular Badge & Vertical Navigation Icons */}
      <div className="flex flex-col items-center py-5 w-full">
        {/* Top Circular Radar / Mecha Badge matching Image 2 */}
        <div className="mb-6 relative">
          <div className="w-10 h-10 rounded-full border-2 border-[#fff000] bg-[#0c0d30] flex items-center justify-center text-[#fff000] shadow-[0_0_10px_rgba(255,240,0,0.3)]">
            <CircleDot size={20} className="text-[#fff000]" />
          </div>
        </div>

        {/* Vertical Icon Rail */}
        <nav className="flex flex-col gap-3 w-full px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative flex items-center w-full">
                <button
                  onClick={() => onTabChange?.(item.id)}
                  className={`relative flex items-center gap-3 w-full transition-all duration-150 cursor-pointer ${
                    isExpanded ? 'px-3 py-2.5' : 'justify-center h-11 w-11 mx-auto'
                  } ${
                    isActive
                      ? 'bg-[#fff000] text-[#07081e] font-black shadow-sm'
                      : 'text-[#8b8ac4] hover:text-[#fff000] hover:bg-[#151745]'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                  data-testid={`sidebar-tab-${item.id}`}
                >
                  <Icon
                    size={19}
                    className={
                      isActive
                        ? 'text-[#07081e]'
                        : item.isSpecial
                        ? 'text-[#00f0ff]'
                        : 'text-[#d5d4fc]'
                    }
                  />

                  {isExpanded && (
                    <div className="flex items-center justify-between w-full overflow-hidden text-left font-mono">
                      <span className="text-xs truncate">{item.label}</span>
                      {typeof item.count === 'number' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 font-mono ${
                            isActive
                              ? 'bg-[#07081e] text-[#fff000]'
                              : 'bg-[#151745] text-[#8b8ac4]'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Right-protruding yellow indicator flag pill on active item matching Image 2 */}
                {isActive && !isExpanded && (
                  <div
                    className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-6 bg-[#fff000] flex items-center justify-center text-[#07081e] z-40 pointer-events-none"
                    style={{
                      clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#fff000] border border-[#07081e] flex items-center justify-center text-[#07081e] hover:bg-[#ffe600] transition-colors cursor-pointer z-40 shadow-sm"
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="toggle-sidebar-btn"
      >
        {isExpanded ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
      </button>

      {/* Bottom Documentation & System Status Indicator */}
      <div className="flex flex-col items-center pb-5 w-full px-2.5">
        <div
          className={`flex items-center gap-3 w-full text-[#8b8ac4] hover:text-[#fff000] hover:bg-[#151745] transition-colors cursor-pointer ${
            isExpanded ? 'px-3 py-2' : 'justify-center h-10 w-10 mx-auto rounded-full border border-[#212354]'
          }`}
          title="MagicSmoke Diagnostics & Docs"
        >
          <HelpCircle size={18} />
          {isExpanded && <span className="text-xs font-mono">System Docs</span>}
        </div>
      </div>
    </aside>
  );
};
