import React, { useState } from 'react';
import { MagicSmokeLogo } from './MagicSmokeLogo';
import {
  Search,
  Plus,
  ChevronDown,
  Cpu,
  Sparkles,
  Upload,
  FolderOpen,
  X,
  Play,
  Crosshair,
} from 'lucide-react';

interface DashboardTopNavbarProps {
  onNavigateHome: () => void;
  onCreateNewCircuit: () => void;
  onLaunchLineFollowerLab: () => void;
  onLaunchRobotArmLab?: () => void;
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
  onLaunchRobotArmLab,
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

  const menuItem =
    'w-full text-left px-3.5 py-2.5 hover:bg-[#151745] flex items-center gap-3 text-xs font-mono text-[#d5d4fc] hover:text-[#fff000] cursor-pointer transition-colors';

  return (
    <header className="h-[72px] bg-[#0b0c2a] border-b border-[#212354] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {/* Left: Branding & Core Mission Control Navigation */}
      <div className="flex items-center gap-4 lg:gap-7 min-w-0">
        <button
          onClick={onNavigateHome}
          className="text-left hover:opacity-95 transition-opacity cursor-pointer shrink-0"
          title="MagicSmoke Dashboard Home"
        >
          <MagicSmokeLogo size={38} theme="cyber" />
        </button>

        {/* Selected Active Section Block: (M) MISSION CONTROL */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-[#fff000] text-[#07081e] font-black text-xs font-mono tracking-wider shadow-sm shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#07081e]" />
          <span>(M) MISSION CONTROL</span>
        </div>

        {/* Technical Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-mono font-medium text-[#c4c3eb]">
          {/* Workspaces Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSimulatorsOpen(!isSimulatorsOpen)}
              onBlur={() => setTimeout(() => setIsSimulatorsOpen(false), 200)}
              className="flex items-center gap-1 hover:text-[#fff000] transition-colors cursor-pointer py-1"
            >
              <span>Workspaces</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${isSimulatorsOpen ? 'rotate-180 text-[#fff000]' : ''}`}
              />
            </button>
            {isSimulatorsOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0b28] border-2 border-[#fff000] shadow-hard-yellow py-2 z-50">
                <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-[#fff000] border-b border-[#212354] mb-1">
                  Active Workspaces
                </div>
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onCreateNewCircuit();
                  }}
                  className={menuItem}
                >
                  <Cpu size={14} className="text-[#fff000]" />
                  <span>
                    <b className="block text-white">Circuit Editor</b>
                    <small className="text-[10px] text-[#8b8ac4]">Schematic wiring & code</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onLaunchLineFollowerLab();
                  }}
                  className={menuItem}
                >
                  <Sparkles size={14} className="text-[#00f0ff]" />
                  <span>
                    <b className="block text-white">Line Follower Lab</b>
                    <small className="text-[10px] text-[#8b8ac4]">8-CH IR sensor simulation</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onLaunchRobotArmLab?.();
                  }}
                  className={menuItem}
                >
                  <Sparkles size={14} className="text-[#fff000]" />
                  <span>
                    <b className="block text-white">Robot Arm Lab</b>
                    <small className="text-[10px] text-[#8b8ac4]">5-Axis servo kinematics</small>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onSelectCategory?.('all')}
            className="hover:text-[#fff000] transition-colors cursor-pointer"
          >
            All Projects
          </button>
          <button
            onClick={() => onSelectCategory?.('starters')}
            className="hover:text-[#fff000] transition-colors cursor-pointer"
          >
            Starter Labs
          </button>
          <button
            onClick={onLaunchLineFollowerLab}
            className="flex items-center gap-1.5 hover:text-[#fff000] transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#fff000]" />
            <span>Robotics Arena</span>
          </button>
          <button
            onClick={onLaunchRobotArmLab}
            className="flex items-center gap-1.5 hover:text-[#fff000] transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
            <span>Arm Lab</span>
          </button>
        </nav>
      </div>

      {/* Right: Search, Primary Action Button & Radar Badge */}
      <div className="flex items-center gap-2 sm:gap-4">
        {hasActiveSession && onReturnToEditor && (
          <button
            onClick={onReturnToEditor}
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#101238] hover:bg-[#1a1e54] text-[#fff000] font-mono font-bold text-[11px] border border-[#fff000]/40 transition-colors cursor-pointer"
          >
            <FolderOpen size={13} className="text-[#fff000]" />
            <span>Resume session</span>
          </button>
        )}

        {/* High-Tech Search Field */}
        <div
          className={`flex items-center bg-[#07081e] border border-[#272960] focus-within:border-[#fff000] px-3 py-1.5 transition-all ${
            isSearchExpanded || searchQuery ? 'w-44 sm:w-60' : 'w-36 sm:w-48'
          }`}
        >
          <Search size={14} className="text-[#8b8ac4] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchExpanded(true)}
            onBlur={() => {
              if (!searchQuery) setIsSearchExpanded(false);
            }}
            placeholder="Search circuits"
            className="bg-transparent border-none text-xs font-mono outline-none w-full text-white placeholder-[#686799]"
            data-testid="dashboard-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-[#8b8ac4] hover:text-[#fff000] cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* High-Voltage Electric-Yellow Action Button: + New Circuit */}
        <div className="relative flex items-center">
          <button
            onClick={onCreateNewCircuit}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#fff000] hover:bg-[#ffe600] text-[#07081e] font-mono font-black text-xs cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,0.6)] transition-all active:translate-y-0.5"
            data-testid="new-circuit-btn"
          >
            <Plus size={14} strokeWidth={3} className="text-[#07081e]" />
            <span className="hidden sm:inline">New Circuit</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)}
            className="flex items-center justify-center w-7 h-[32px] bg-[#fff000] hover:bg-[#ffe600] text-[#07081e] border-l border-[#07081e]/25 cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,0.6)] transition-all"
            title="More creation options"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${isCreateOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isCreateOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0b28] border-2 border-[#fff000] shadow-hard-yellow text-white py-2 z-50">
              <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-[#fff000] border-b border-[#212354] mb-1">
                New simulation project
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onCreateNewCircuit();
                }}
                className={menuItem}
              >
                <Cpu size={14} className="text-[#fff000]" />
                <span>
                  <b className="block text-white">New Circuit</b>
                  <small className="text-[10px] text-[#8b8ac4]">Schematic design & wiring</small>
                </span>
              </button>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onLaunchLineFollowerLab();
                }}
                className={menuItem}
              >
                <Play size={14} className="text-[#00f0ff]" />
                <span>
                  <b className="block text-white">Line Follower Lab</b>
                  <small className="text-[10px] text-[#8b8ac4]">8-CH IR & PID robotics</small>
                </span>
              </button>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onLaunchRobotArmLab?.();
                }}
                className={menuItem}
              >
                <Play size={14} className="text-[#fff000]" />
                <span>
                  <b className="block text-white">Robot Arm Lab</b>
                  <small className="text-[10px] text-[#8b8ac4]">5-Axis servo kinematics</small>
                </span>
              </button>
              <div className="my-1.5 border-t border-[#212354]" />
              <label className={menuItem}>
                <Upload size={14} className="text-[#8b8ac4]" />
                <span>
                  <b className="block text-white">Import JSON File</b>
                  <small className="text-[10px] text-[#8b8ac4]">Load existing circuit project</small>
                </span>
                <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Circular Radar / Technical Badge on Far Right matching Image 2 */}
        <div
          className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full border border-[#fff000] bg-[#0c0d2e] text-[#fff000] shadow-[0_0_8px_rgba(255,240,0,0.3)] shrink-0"
          title="MagicSmoke Operational Radar"
        >
          <Crosshair size={18} strokeWidth={2} className="animate-spin-slow" />
        </div>
      </div>
    </header>
  );
};
