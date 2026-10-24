import React, { useState } from 'react';
import { RobotAvatar, AppleIcon } from '../common/Icons';
import { Home, LayoutGrid, Folder, GraduationCap, Flag, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface LeftSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, isDefaultActive: true },
    { id: 'classes', label: 'Classes', icon: AppleIcon },
    { id: 'designs', label: 'Designs', icon: LayoutGrid },
    { id: 'collections', label: 'Collections', icon: Folder },
    { id: 'tutorials', label: 'Tutorials', icon: GraduationCap },
    { id: 'challenges', label: 'Challenges', icon: Flag },
  ];

  return (
    <aside
      className={`bg-white border-r border-[#e2e4e7] flex flex-col justify-between transition-all duration-300 relative select-none z-30 shrink-0 ${
        isExpanded ? 'w-56' : 'w-[64px]'
      }`}
    >
      {/* Top: Avatar & Navigation Items */}
      <div className="flex flex-col items-center py-4 w-full">
        {/* Profile Avatar */}
        <div className="mb-4">
          <RobotAvatar size={36} className="ring-2 ring-neutral-200" />
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-2.5 w-full px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange && onTabChange(item.id)}
                className={`relative flex items-center gap-3 w-full rounded-full transition-all duration-150 cursor-pointer ${
                  isExpanded ? 'px-3 py-2' : 'justify-center h-11 w-11 mx-auto'
                } ${
                  isActive
                    ? 'border-2 border-[#0175da] text-[#0175da] bg-blue-50/20 shadow-xs'
                    : 'text-[#646e80] hover:text-[#1b1a1a] hover:bg-neutral-100 border-2 border-transparent'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon size={21} className={isActive ? 'text-[#0175da]' : 'text-[#646e80]'} />
                {isExpanded && (
                  <span className={`text-sm font-medium ${isActive ? 'font-bold text-[#0175da]' : ''}`}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Expand/Collapse Toggle Button pill on edge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#d0d5db] shadow-xs flex items-center justify-center text-[#646e80] hover:text-[#0175da] hover:border-[#0175da] transition-all cursor-pointer z-40"
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Bottom: Help & Support */}
      <div className="flex flex-col items-center pb-5 w-full px-2.5">
        <button
          className={`flex items-center gap-3 w-full rounded-full text-[#646e80] hover:text-[#1b1a1a] hover:bg-neutral-100 transition-colors cursor-pointer ${
            isExpanded ? 'px-3 py-2' : 'justify-center h-11 w-11 mx-auto'
          }`}
          title="Help & Support"
        >
          <HelpCircle size={22} />
          {isExpanded && <span className="text-sm font-medium">Help</span>}
        </button>
      </div>
    </aside>
  );
};
