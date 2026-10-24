import React, { useState } from 'react';
import { TinkercadLogo } from '../common/TinkercadLogo';
import { RobotAvatar } from '../common/Icons';
import { Search, Plus, ChevronDown, Bell, Sparkles, Cpu, Box, Code } from 'lucide-react';

interface TopNavbarProps {
  onNavigateToCircuits: () => void;
  onNavigateHome: () => void;
  activeView?: 'dashboard' | 'circuits';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onNavigateToCircuits,
  onNavigateHome,
  activeView = 'dashboard',
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTinkerOpen, setIsTinkerOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <header className="h-[56px] bg-[#0175da] text-white flex items-center justify-between px-4 sticky top-0 z-50 shadow-xs select-none">
      {/* Left: Brand & Main Navigation */}
      <div className="flex items-center gap-7">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-left focus:outline-hidden hover:opacity-95 transition-opacity cursor-pointer"
          title="Tinkercad Home"
        >
          <TinkercadLogo size={34} showWordmark={true} wordmarkColor="white" />
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-[15px] font-medium text-white/95">
          {/* Tinker Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTinkerOpen(!isTinkerOpen)}
              onBlur={() => setTimeout(() => setIsTinkerOpen(false), 200)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-1"
            >
              <span>Tinker</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isTinkerOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTinkerOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-neutral-200 text-neutral-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => setIsTinkerOpen(false)}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-sm"
                >
                  <Box size={16} className="text-[#0175da]" />
                  <span>3D Designs</span>
                </button>
                <button
                  onClick={() => {
                    setIsTinkerOpen(false);
                    onNavigateToCircuits();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-sm font-semibold text-[#0175da]"
                >
                  <Cpu size={16} className="text-[#0175da]" />
                  <span>Circuits</span>
                </button>
                <button
                  onClick={() => setIsTinkerOpen(false)}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-sm"
                >
                  <Code size={16} className="text-[#0175da]" />
                  <span>Codeblocks</span>
                </button>
              </div>
            )}
          </div>

          <a href="#gallery" className="hover:text-white transition-colors py-1">
            Gallery
          </a>
          <a href="#learn" className="hover:text-white transition-colors py-1">
            Learn
          </a>
          <a href="#teachers" className="hover:text-white transition-colors py-1">
            Teachers
          </a>

          {/* Resources Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsResourcesOpen(!isResourcesOpen)}
              onBlur={() => setTimeout(() => setIsResourcesOpen(false), 200)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-1"
            >
              <span>Resources</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isResourcesOpen ? 'rotate-180' : ''}`} />
            </button>

            {isResourcesOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-neutral-200 text-neutral-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <a href="#blog" className="block px-4 py-2 hover:bg-neutral-100 text-sm">
                  Blog
                </a>
                <a href="#help" className="block px-4 py-2 hover:bg-neutral-100 text-sm">
                  Help Center
                </a>
                <a href="#shortcuts" className="block px-4 py-2 hover:bg-neutral-100 text-sm">
                  Keyboard Shortcuts
                </a>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right: Search, + Create, and Avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex items-center">
          {isSearchActive ? (
            <div className="flex items-center bg-white rounded-full px-3 py-1 text-neutral-800 shadow-inner w-56 sm:w-64 animate-in fade-in">
              <Search size={16} className="text-neutral-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search designs..."
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setIsSearchActive(false);
                }}
                className="bg-transparent border-none text-sm outline-hidden w-full"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsSearchActive(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
              title="Search"
            >
              <Search size={19} />
            </button>
          )}
        </div>

        {/* + Create Button */}
        <div className="relative">
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white text-white font-semibold text-sm hover:bg-white hover:text-[#0175da] transition-all duration-150 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create</span>
          </button>

          {/* + Create Dropdown Menu */}
          {isCreateOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-neutral-200 text-neutral-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                New Project
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 flex items-center gap-3 text-sm font-medium cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff650f] flex items-center justify-center">
                  <Box size={18} />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">3D Design</div>
                  <div className="text-xs text-neutral-500">Create solid 3D models</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  onNavigateToCircuits();
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium cursor-pointer bg-blue-50/50"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0175da] text-white flex items-center justify-center shadow-xs">
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="font-semibold text-[#0175da]">Circuit</div>
                  <div className="text-xs text-neutral-500">Simulate Arduino & electronics</div>
                </div>
              </button>

              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 flex items-center gap-3 text-sm font-medium cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Code size={18} />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">Codeblocks</div>
                  <div className="text-xs text-neutral-500">Computational 3D design</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <button
          className="focus:outline-hidden hover:ring-2 hover:ring-white/60 rounded-full transition-all cursor-pointer"
          title="Account Profile"
        >
          <RobotAvatar size={34} />
        </button>
      </div>
    </header>
  );
};
