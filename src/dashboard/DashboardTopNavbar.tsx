import React, { useState } from 'react';
import { MagicSmokeLogo } from './MagicSmokeLogo';
import { RobotAvatar } from './DashboardIcons';
import { Search, Plus, ChevronDown, Cpu, Sparkles, Upload, FolderOpen, X, Play, Radio } from 'lucide-react';

interface DashboardTopNavbarProps {
  onNavigateHome: () => void;
  onCreateNewCircuit: () => void;
  onLaunchLineFollowerLab: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasActiveSession?: boolean;
  onReturnToEditor?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCategory?: (category: 'all' | 'custom' | 'starters') => void;
}

export const DashboardTopNavbar: React.FC<DashboardTopNavbarProps> = ({ onNavigateHome, onCreateNewCircuit, onLaunchLineFollowerLab, onImportJSON, hasActiveSession, onReturnToEditor, searchQuery, onSearchChange, onSelectCategory }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSimulatorsOpen, setIsSimulatorsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const menuItem = 'w-full text-left px-3 py-2.5 hover:bg-[#eaf7f3] flex items-center gap-3 text-sm cursor-pointer transition-colors';

  return (
    <header className="h-[72px] bg-[#f7f7f2]/95 backdrop-blur-md border-b border-[#dfe5e1] text-[#111214] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 select-none">
      <div className="flex items-center gap-6 sm:gap-10 min-w-0">
        <button onClick={onNavigateHome} className="text-left hover:opacity-80 transition-opacity cursor-pointer" title="MagicSmoke Dashboard Home"><MagicSmokeLogo size={34} /></button>
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.14em] text-[#777d80]">
          <span className="w-px h-5 bg-[#cbd1cf]" />
          <Radio size={13} className="text-[#e6321f]" />
          <span>Mission control</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-[12px] font-semibold text-[#777d80]">
          <div className="relative">
            <button onClick={() => setIsSimulatorsOpen(!isSimulatorsOpen)} onBlur={() => setTimeout(() => setIsSimulatorsOpen(false), 200)} className="flex items-center gap-1.5 hover:text-[#e6321f] transition-colors cursor-pointer py-2"><span>Workspaces</span><ChevronDown size={13} className={isSimulatorsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
            {isSimulatorsOpen && <div className="absolute top-full left-0 mt-2 w-60 bg-[#f7f7f2] border border-[#cbd1cf] shadow-[8px_8px_0_#b8e0d8] text-[#111214] py-2 z-50">
              <button onClick={() => { setIsSimulatorsOpen(false); onCreateNewCircuit(); }} className={menuItem}><Cpu size={16} className="text-[#e6321f]" /><span><b className="block">Circuit Editor</b><small className="text-[11px] text-[#777d80]">Schematic wiring & code</small></span></button>
              <button onClick={() => { setIsSimulatorsOpen(false); onLaunchLineFollowerLab(); }} className={menuItem}><Sparkles size={16} className="text-[#5caaa0]" /><span><b className="block">Line Follower Lab</b><small className="text-[11px] text-[#777d80]">8-CH IR sensor simulation</small></span></button>
            </div>}
          </div>
          <button onClick={() => onSelectCategory?.('all')} className="hover:text-[#e6321f] transition-colors cursor-pointer">All Projects</button>
          <button onClick={() => onSelectCategory?.('starters')} className="hover:text-[#e6321f] transition-colors cursor-pointer">Starter Labs</button>
          <button onClick={onLaunchLineFollowerLab} className="flex items-center gap-2 hover:text-[#e6321f] transition-colors cursor-pointer"><span className="ms-dot" />Robotics Arena</button>
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {hasActiveSession && onReturnToEditor && <button onClick={onReturnToEditor} className="hidden xl:flex items-center gap-2 px-3 py-2 bg-[#eaf7f3] hover:bg-[#d5eee8] text-[#1b5854] font-bold text-[11px] border border-[#b8e0d8] transition-colors cursor-pointer"><FolderOpen size={13} /> Resume session</button>}
        <div className={`flex items-center bg-white border border-[#cbd1cf] focus-within:border-[#e6321f] focus-within:ring-2 focus-within:ring-[#e6321f]/15 px-3 py-2 transition-all ${isSearchExpanded || searchQuery ? 'w-44 sm:w-60' : 'w-36 sm:w-48'}`}>
          <Search size={15} className="text-[#777d80] mr-2 shrink-0" /><input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} onFocus={() => setIsSearchExpanded(true)} onBlur={() => { if (!searchQuery) setIsSearchExpanded(false); }} placeholder="Search circuits" className="bg-transparent border-none text-xs outline-none w-full text-[#111214] placeholder-[#777d80]" data-testid="dashboard-search-input" />
          {searchQuery && <button onClick={() => onSearchChange('')} className="text-[#777d80] hover:text-[#e6321f] cursor-pointer" title="Clear search"><X size={13} /></button>}
        </div>
        <div className="relative flex items-center">
          <button onClick={onCreateNewCircuit} className="ms-button flex items-center gap-1.5 px-3.5 py-2 bg-[#e6321f] hover:bg-[#bd2719] text-white font-bold text-[11px] cursor-pointer" data-testid="new-circuit-btn"><Plus size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">New Circuit</span></button>
          <button onClick={() => setIsCreateOpen(!isCreateOpen)} onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)} className="flex items-center justify-center w-7 h-[32px] bg-[#bd2719] hover:bg-[#a82115] text-white border-l border-white/30 cursor-pointer" title="More creation options"><ChevronDown size={13} className={isCreateOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
          {isCreateOpen && <div className="absolute right-0 top-full mt-2 w-64 bg-[#f7f7f2] border border-[#cbd1cf] shadow-[8px_8px_0_#b8e0d8] text-[#111214] py-2 z-50"><div className="px-3.5 py-1.5 ms-eyebrow text-[#777d80]">New simulation project</div><button onClick={() => { setIsCreateOpen(false); onCreateNewCircuit(); }} className={menuItem}><Cpu size={16} className="text-[#e6321f]" /><span><b className="block">New Circuit</b><small className="text-[11px] text-[#777d80]">Schematic design & wiring</small></span></button><button onClick={() => { setIsCreateOpen(false); onLaunchLineFollowerLab(); }} className={menuItem}><Play size={16} className="text-[#5caaa0]" /><span><b className="block">Line Follower Lab</b><small className="text-[11px] text-[#777d80]">8-CH IR & PID robotics</small></span></button><div className="my-1.5 border-t border-[#dfe5e1]" /><label className={menuItem}><Upload size={16} className="text-[#777d80]" /><span><b className="block">Import JSON File</b><small className="text-[11px] text-[#777d80]">Load existing circuit project</small></span><input type="file" accept=".json" onChange={onImportJSON} className="hidden" /></label></div>}
        </div>
        <button className="hidden sm:block hover:opacity-80 transition-opacity cursor-pointer" title="MagicSmoke User Profile"><RobotAvatar size={34} /></button>
      </div>
    </header>
  );
};
