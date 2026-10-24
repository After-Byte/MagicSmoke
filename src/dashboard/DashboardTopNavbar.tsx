import React, { useState } from 'react';
import { MagicSmokeLogo } from './MagicSmokeLogo';
import { RobotAvatar } from './DashboardIcons';
import {
  Search,
  Plus,
  ChevronDown,
  Cpu,
  Layers,
  Sparkles,
  Upload,
  FolderOpen,
  X,
  Play,
  HelpCircle,
} from 'lucide-react';
import { StoredProject } from '../project/projectStorage';

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

export const DashboardTopNavbar: React.FC<DashboardTopNavbarProps> = ({
  onNavigateHome,
  onCreateNewCircuit,
  onLaunchLineFollowerLab,
  onImportJSON,
  hasActiveSession,
  onReturnToEditor,
  searchQuery,
  onSearchChange,
  onSelectCategory,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSimulatorsOpen, setIsSimulatorsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className="h-[60px] bg-white border-b border-[#e2e8f0] text-[#172033] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 shadow-xs select-none">
      {/* Left: Brand Logo & Workspace Navigation Links */}
      <div className="flex items-center gap-6 sm:gap-8">
        <button
          onClick={onNavigateHome}
          className="flex items-center text-left focus:outline-hidden hover:opacity-90 transition-opacity cursor-pointer"
          title="MagicSmoke Dashboard Home"
        >
          <MagicSmokeLogo size={36} theme="light" />
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-[14px] font-medium text-[#475569]">
          {/* Simulators Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSimulatorsOpen(!isSimulatorsOpen)}
              onBlur={() => setTimeout(() => setIsSimulatorsOpen(false), 200)}
              className="flex items-center gap-1 hover:text-[#1677ff] transition-colors cursor-pointer py-1 font-semibold"
            >
              <span>Workspaces</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isSimulatorsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isSimulatorsOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e2e8f0] text-[#172033] py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onCreateNewCircuit();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f1f5f9] flex items-center gap-3 text-sm cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#172033]">Circuit Editor</div>
                    <div className="text-[11px] text-[#64748b]">Schematic wiring & code</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onLaunchLineFollowerLab();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f1f5f9] flex items-center gap-3 text-sm cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-700">Line Follower Lab</div>
                    <div className="text-[11px] text-[#64748b]">8-CH IR sensor simulation</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onSelectCategory && onSelectCategory('all')}
            className="hover:text-[#1677ff] transition-colors py-1 cursor-pointer"
          >
            All Projects
          </button>
          <button
            onClick={() => onSelectCategory && onSelectCategory('starters')}
            className="hover:text-[#1677ff] transition-colors py-1 cursor-pointer"
          >
            Starter Labs
          </button>
          <button
            onClick={() => onLaunchLineFollowerLab()}
            className="hover:text-[#1677ff] transition-colors py-1 cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Robotics Arena</span>
          </button>
        </nav>
      </div>

      {/* Right: Search, Resume Session, + Create, and Avatar */}
      <div className="flex items-center gap-3">
        {/* Active Session Return Button (if session exists) */}
        {hasActiveSession && onReturnToEditor && (
          <button
            onClick={onReturnToEditor}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1677ff] font-medium text-xs border border-[#cbd5e1] transition-all cursor-pointer shadow-xs active:scale-95"
            title="Resume current active simulation session"
            data-testid="resume-editor-btn"
          >
            <FolderOpen size={13} />
            <span>Resume Active Circuit</span>
          </button>
        )}

        {/* Global Live Search Input */}
        <div className="relative flex items-center">
          <div
            className={`flex items-center bg-[#f8fafc] border border-[#e2e8f0] focus-within:border-[#1677ff] focus-within:ring-2 focus-within:ring-[#1677ff]/15 rounded-full px-3 py-1.5 text-[#172033] shadow-inner transition-all ${
              isSearchExpanded || searchQuery ? 'w-48 sm:w-64' : 'w-36 sm:w-52'
            }`}
          >
            <Search size={15} className="text-[#94a3b8] mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchExpanded(true)}
              onBlur={() => {
                if (!searchQuery) setIsSearchExpanded(false);
              }}
              placeholder="Search circuits..."
              className="bg-transparent border-none text-xs outline-hidden w-full text-[#172033] placeholder-[#94a3b8]"
              data-testid="dashboard-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-[#94a3b8] hover:text-[#475569] p-0.5 cursor-pointer ml-1"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* + Create Button Group */}
        <div className="relative flex items-center">
          <button
            onClick={onCreateNewCircuit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-l-full bg-[#1677ff] hover:bg-[#0060df] text-white font-semibold text-xs transition-all duration-150 shadow-xs cursor-pointer active:scale-95"
            data-testid="new-circuit-btn"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Circuit</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)}
            className="flex items-center justify-center w-7 h-[28px] rounded-r-full bg-[#1677ff] hover:bg-[#0060df] text-white border-l border-white/20 transition-all cursor-pointer"
            title="More creation options"
          >
            <ChevronDown size={13} className={`transition-transform duration-200 ${isCreateOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* + Create Dropdown Menu */}
          {isCreateOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#e2e8f0] text-[#172033] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                New Simulation Project
              </div>

              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onCreateNewCircuit();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafc] flex items-center gap-3 text-xs font-medium cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center shrink-0">
                  <Cpu size={17} />
                </div>
                <div>
                  <div className="font-semibold text-[#172033]">New Circuit</div>
                  <div className="text-[11px] text-[#64748b]">Schematic design & wiring</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onLaunchLineFollowerLab();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafc] flex items-center gap-3 text-xs font-medium cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Play size={16} fill="currentColor" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-700">Line Follower Lab</div>
                  <div className="text-[11px] text-[#64748b]">8-CH IR & PID robotics</div>
                </div>
              </button>

              <div className="my-1.5 border-t border-[#f1f5f9]" />

              {/* JSON Import option */}
              <label className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafc] flex items-center gap-3 text-xs font-medium cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] text-[#64748b] flex items-center justify-center shrink-0">
                  <Upload size={16} />
                </div>
                <div>
                  <div className="font-semibold text-[#172033]">Import JSON File</div>
                  <div className="text-[11px] text-[#64748b]">Load existing circuit project</div>
                </div>
                <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Profile Robot Avatar */}
        <button
          className="focus:outline-hidden hover:ring-2 hover:ring-[#1677ff]/40 rounded-full transition-all cursor-pointer"
          title="MagicSmoke User Profile"
        >
          <RobotAvatar size={34} />
        </button>
      </div>
    </header>
  );
};
