import React, { useState } from 'react';
import { MagicSmokeLogo } from './MagicSmokeLogo';
import {
  Search,
  ChevronDown,
  Cpu,
  Sparkles,
  Upload,
  X,
  Play,
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
  searchQuery,
  onSearchChange,
  onSelectCategory,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSimulatorsOpen, setIsSimulatorsOpen] = useState(false);

  const menuItem =
    'w-full text-left px-3.5 py-2.5 hover:bg-[#150a58] flex items-center gap-3 text-xs font-mono text-[#FFF36D] hover:text-[#FFEA00] cursor-pointer transition-colors';

  return (
    <header
      className="topbar sticky top-0 z-50 select-none flex items-center justify-between"
      style={{
        height: '68px',
        borderBottom: '1.5px solid rgba(255, 234, 0, 0.65)',
        background:
          'linear-gradient(90deg, rgba(14, 7, 62, 0.88) 0%, rgba(17, 10, 75, 0.62) 45%, rgba(14, 7, 62, 0.78) 100%)',
        backdropFilter: 'contrast(1.15)',
      }}
    >
      {/* Left: Branding & Core Navigation */}
      <div className="flex items-center h-full min-w-0">
        <button
          onClick={onNavigateHome}
          className="text-left hover:opacity-95 transition-opacity cursor-pointer shrink-0 px-4 sm:px-5 h-full flex items-center"
          title="MagicSmoke Dashboard Home"
        >
          <MagicSmokeLogo size={38} theme="cyber" />
        </button>

        {/* Technical Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-bold text-[#FFEA00]"
          style={{
            marginLeft: '16px',
            paddingLeft: '24px',
            borderLeft: '1px solid rgba(255, 234, 0, 0.35)',
          }}
        >
          {/* Workspaces Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSimulatorsOpen(!isSimulatorsOpen)}
              onBlur={() => setTimeout(() => setIsSimulatorsOpen(false), 200)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-1"
            >
              <span>Workspaces</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${isSimulatorsOpen ? 'rotate-180 text-white' : ''}`}
              />
            </button>
            {isSimulatorsOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#110849] border-2 border-[#FFEA00] shadow-[10px_10px_0px_#FFEA00] py-2 z-50">
                <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-[#FFEA00] border-b border-[#212354] mb-1 font-bold">
                  Active Workspaces
                </div>
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onCreateNewCircuit();
                  }}
                  className={menuItem}
                >
                  <Cpu size={14} className="text-[#FFEA00]" />
                  <span>
                    <b className="block text-white">Circuit Editor</b>
                    <small className="text-[10px] text-[#FFF36D]">Schematic wiring & code</small>
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
                    <small className="text-[10px] text-[#FFF36D]">8-CH IR sensor simulation</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsSimulatorsOpen(false);
                    onLaunchRobotArmLab?.();
                  }}
                  className={menuItem}
                >
                  <Sparkles size={14} className="text-[#FFEA00]" />
                  <span>
                    <b className="block text-white">Robot Arm Lab</b>
                    <small className="text-[10px] text-[#FFF36D]">5-Axis servo kinematics</small>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onSelectCategory?.('all')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            All Projects
          </button>
          <button
            onClick={() => onSelectCategory?.('starters')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Starter Labs
          </button>
          <button
            onClick={onLaunchLineFollowerLab}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFEA00] inline-block shadow-[0_0_6px_#FFEA00]" />
            <span>Robotics Arena</span>
          </button>
          <button
            onClick={onLaunchRobotArmLab}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFEA00] inline-block shadow-[0_0_6px_#FFEA00]" />
            <span>Arm Lab</span>
          </button>
        </nav>
      </div>

      {/* Right: Search, + New Circuit Action Button, & Profile Readout */}
      <div className="flex items-center gap-3 sm:gap-3.5 pr-4 sm:pr-5">
        {/* Search Field matching reference */}
        <div className="flex items-center bg-[rgba(11,5,48,0.88)] border-[1.5px] border-[#FFEA00] h-10 px-3 w-36 sm:w-52">
          <Search size={15} className="text-[#FFEA00] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search circuits"
            className="bg-transparent border-none text-xs outline-none w-full text-[#FFEA00] placeholder-[#FFEA00]/70 font-sans"
            data-testid="dashboard-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-[#FFEA00] hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Action Button: + New Circuit */}
        <div className="relative flex items-center h-10">
          <button
            onClick={onCreateNewCircuit}
            className="h-full flex items-center gap-2 px-4 bg-[#FFEA00] hover:bg-[#ffe600] text-[#090428] font-bold text-sm cursor-pointer border-[1.5px] border-[#FFEA00] transition-colors"
            data-testid="new-circuit-btn"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span className="hidden sm:inline">New Circuit</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)}
            className="h-full px-2.5 bg-[#FFEA00] hover:bg-[#ffe600] text-[#090428] border-[1.5px] border-[#FFEA00] border-l-[#090428] flex items-center justify-center cursor-pointer"
            title="More creation options"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${isCreateOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isCreateOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#110849] border-2 border-[#FFEA00] shadow-[10px_10px_0px_#FFEA00] text-white py-2 z-50">
              <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-[#FFEA00] border-b border-[#212354] mb-1 font-bold">
                New simulation project
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onCreateNewCircuit();
                }}
                className={menuItem}
              >
                <Cpu size={14} className="text-[#FFEA00]" />
                <span>
                  <b className="block text-white">New Circuit</b>
                  <small className="text-[10px] text-[#FFF36D]">Schematic design & wiring</small>
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
                  <small className="text-[10px] text-[#FFF36D]">8-CH IR & PID robotics</small>
                </span>
              </button>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onLaunchRobotArmLab?.();
                }}
                className={menuItem}
              >
                <Play size={14} className="text-[#FFEA00]" />
                <span>
                  <b className="block text-white">Robot Arm Lab</b>
                  <small className="text-[10px] text-[#FFF36D]">5-Axis servo kinematics</small>
                </span>
              </button>
              <div className="my-1.5 border-t border-[#212354]" />
              <label className={menuItem}>
                <Upload size={14} className="text-[#FFF36D]" />
                <span>
                  <b className="block text-white">Import JSON File</b>
                  <small className="text-[10px] text-[#FFF36D]">Load existing circuit project</small>
                </span>
                <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Circular Radar / Profile Readout on Far Right */}
        <div
          className="w-[38px] h-[38px] rounded-full border-2 border-[#FFEA00] bg-[#110849] flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(255,234,0,0.35)] shrink-0"
          title="MagicSmoke Operational Radar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFEA00">
            <path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z" />
          </svg>
        </div>
      </div>
    </header>
  );
};
