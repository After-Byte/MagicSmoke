import React, { useState } from 'react';
import { RobotAvatar } from './DashboardIcons';
import { Home, LayoutGrid, Sparkles, HelpCircle, ChevronRight, ChevronLeft, Bot } from 'lucide-react';

interface DashboardSidebarProps { activeTab?: string; onTabChange?: (tab: 'all' | 'custom' | 'starters' | 'lab') => void; counts?: { all: number; custom: number; starters: number } }

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeTab = 'all', onTabChange, counts }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navItems = [
    { id: 'all' as const, label: 'All Circuits', icon: Home, count: counts?.all },
    { id: 'custom' as const, label: 'My Designs', icon: LayoutGrid, count: counts?.custom },
    { id: 'starters' as const, label: 'Starter Labs', icon: Sparkles, count: counts?.starters },
    { id: 'lab' as const, label: 'Line Follower Lab', icon: Bot, isSpecial: true },
  ];
  return <aside className={`dashboard-sidebar bg-[#111214] flex flex-col justify-between transition-all duration-300 relative select-none z-30 shrink-0 ${isExpanded ? 'w-56' : 'w-[76px]'}`}>
    <div className="flex flex-col items-center py-6 w-full">
      <div className="sidebar-avatar mb-8"><RobotAvatar size={36} className="ring-2 ring-[#5caaa0]" /></div>
      <nav className="flex flex-col gap-2 w-full px-3">
        {navItems.map((item) => { const Icon = item.icon; const isActive = activeTab === item.id; return <button key={item.id} onClick={() => onTabChange?.(item.id)} className={`relative flex items-center gap-3 w-full transition-all duration-150 cursor-pointer ${isExpanded ? 'px-3 py-3' : 'justify-center h-11 w-11 mx-auto'} ${isActive ? 'bg-[#b8e0d8] text-[#111214] font-bold' : 'text-[#cbd1cf] hover:text-white hover:bg-white/10'}`} title={!isExpanded ? item.label : undefined} data-testid={`sidebar-tab-${item.id}`}><Icon size={18} className={isActive ? 'text-[#111214]' : item.isSpecial ? 'text-[#e6321f]' : 'text-[#b8e0d8]'} />{isExpanded && <div className="flex items-center justify-between w-full overflow-hidden text-left"><span className="text-xs truncate">{item.label}</span>{typeof item.count === 'number' && <span className={`text-[10px] px-1.5 py-0.5 font-mono ${isActive ? 'bg-[#111214] text-[#b8e0d8]' : 'bg-white/10 text-[#cbd1cf]'}`}>{item.count}</span>}</div>}</button> })}
      </nav>
    </div>
    <button onClick={() => setIsExpanded(!isExpanded)} className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#b8e0d8] border border-[#111214] flex items-center justify-center text-[#111214] hover:bg-white transition-colors cursor-pointer z-40" title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'} data-testid="toggle-sidebar-btn">{isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}</button>
    <div className="flex flex-col items-center pb-6 w-full px-3"><a href="https://github.com" target="_blank" rel="noreferrer" className={`flex items-center gap-3 w-full text-[#cbd1cf] hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${isExpanded ? 'px-3 py-2.5' : 'justify-center h-10 w-10 mx-auto'}`} title="Documentation & Community"><HelpCircle size={18} />{isExpanded && <span className="text-xs font-medium">Docs & Help</span>}</a></div>
  </aside>;
};
