import React, { useState } from 'react';
import { RobotAvatar } from './DashboardIcons';
import {
  Home,
  LayoutGrid,
  Sparkles,
  Cpu,
  Compass,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Bot,
  Activity,
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: 'all' | 'custom' | 'starters' | 'lab') => void;
  counts?: {
    all: number;
    custom: number;
    starters: number;
  };
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab = 'all',
  onTabChange,
  counts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'all' as const, label: 'All Circuits', icon: Home, count: counts?.all },
    { id: 'custom' as const, label: 'My Designs', icon: LayoutGrid, count: counts?.custom },
    { id: 'starters' as const, label: 'Starter Labs', icon: Sparkles, count: counts?.starters },
    { id: 'lab' as const, label: 'Line Follower Lab', icon: Bot, isSpecial: true },
  ];

  return (
    <aside
      className={`bg-white border-r border-[#e2e8f0] flex flex-col justify-between transition-all duration-300 relative select-none z-30 shrink-0 ${
        isExpanded ? 'w-56' : 'w-[68px]'
      }`}
    >
      {/* Top: Avatar & Navigation Items */}
      <div className="flex flex-col items-center py-4 w-full">
        {/* Profile Avatar Pill */}
        <div className="mb-4">
          <RobotAvatar size={38} className="ring-2 ring-[#e2e8f0]" />
        </div>

        {/* Navigation Item Buttons */}
        <nav className="flex flex-col gap-2 w-full px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange && onTabChange(item.id)}
                className={`relative flex items-center gap-3 w-full rounded-xl transition-all duration-150 cursor-pointer ${
                  isExpanded ? 'px-3 py-2.5' : 'justify-center h-11 w-11 mx-auto'
                } ${
                  isActive
                    ? 'border border-[#1677ff]/30 text-[#1677ff] bg-[#1677ff]/10 font-bold shadow-xs'
                    : 'text-[#64748b] hover:text-[#172033] hover:bg-[#f8fafc] border border-transparent'
                }`}
                title={!isExpanded ? item.label : undefined}
                data-testid={`sidebar-tab-${item.id}`}
              >
                <Icon size={20} className={isActive ? 'text-[#1677ff]' : 'text-[#64748b]'} />
                {isExpanded && (
                  <div className="flex items-center justify-between w-full overflow-hidden text-left">
                    <span className="text-xs truncate">{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? 'bg-[#1677ff] text-white'
                            : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Expand/Collapse Toggle Button pill on right edge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#cbd5e1] shadow-xs flex items-center justify-center text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] transition-all cursor-pointer z-40"
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="toggle-sidebar-btn"
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Bottom: Help & Documentation */}
      <div className="flex flex-col items-center pb-5 w-full px-2.5 space-y-1">
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-3 w-full rounded-xl text-[#64748b] hover:text-[#172033] hover:bg-[#f8fafc] transition-colors cursor-pointer ${
            isExpanded ? 'px-3 py-2' : 'justify-center h-10 w-10 mx-auto'
          }`}
          title="Documentation & Community"
        >
          <HelpCircle size={20} />
          {isExpanded && <span className="text-xs font-medium">Docs & Help</span>}
        </a>
      </div>
    </aside>
  );
};
