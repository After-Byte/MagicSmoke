import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutGrid,
  Bot,
  HelpCircle,
  ChevronLeft,
  CircleDot,
  Radio,
  Sliders,
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
  const [activeNavId, setActiveNavId] = useState<string>('all');

  useEffect(() => {
    if (activeTab === 'custom') {
      setActiveNavId('custom');
    } else if (activeTab === 'starters') {
      setActiveNavId('all');
    } else if (activeTab === 'all' && activeNavId !== 'home') {
      setActiveNavId('all');
    }
  }, [activeTab]);

  // Sidebar navigation items: single active item only (default: Circuit Projects / 4-square grid)
  const navItems = [
    { id: 'home' as const, mapped: 'all' as const, label: 'Overview', icon: Home },
    { id: 'all' as const, mapped: 'all' as const, label: 'Circuit Projects', icon: LayoutGrid, count: counts?.all },
    { id: 'custom' as const, mapped: 'custom' as const, label: 'My Designs', icon: Radio, count: counts?.custom },
    { id: 'lab' as const, mapped: 'lab' as const, label: 'Line Follower Lab', icon: Bot, isSpecial: true },
    { id: 'arm' as const, mapped: 'arm' as const, label: 'Robot Arm Lab', icon: Sliders, isSpecial: true },
  ];

  return (
    <aside
      className={`sidebar ${isExpanded ? 'expanded' : ''} relative flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 ${
        isExpanded ? 'w-56' : 'w-[62px]'
      }`}
      data-expanded={isExpanded ? 'true' : 'false'}
      style={{
        borderRight: '1.5px solid rgba(255, 234, 0, 0.55)',
        backgroundColor: 'rgba(10, 4, 44, 0.25)', // Lets magenta/cobalt brush show through
      }}
    >
      {/* Top Avatar Ring matching template */}
      <div className={`flex flex-col ${isExpanded ? 'items-start' : 'items-center'} pt-6 w-full`}>
        <div
          className="side-avatar-ring w-10 h-10 rounded-full border-2 border-[#FFEA00] bg-[#110849] flex items-center justify-center mb-9 cursor-pointer"
          style={{
            boxShadow: '0 0 10px rgba(255, 234, 0, 0.4)',
            marginLeft: isExpanded ? '18px' : '0px',
          }}
          title="MagicSmoke Node Identity"
        >
          <CircleDot size={20} className="text-[#FFEA00]" />
        </div>

        {/* Vertical Nav Icons */}
        <nav className="side-nav flex flex-col w-full gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Only ONE sidebar item can be active at a time
            const isActive = activeNavId === item.id;

            return (
              <div key={item.id} className="relative flex items-center w-full">
                <button
                  onClick={() => {
                    setActiveNavId(item.id);
                    onTabChange?.(item.mapped);
                  }}
                  className={`side-icon side-nav-item w-full flex items-center transition-all cursor-pointer ${
                    isExpanded
                      ? 'justify-start pl-[20px] pr-[16px] gap-[12px] h-[48px]'
                      : 'justify-center p-0 h-[48px]'
                  } ${
                    isActive
                      ? 'bg-[#FFEA00] text-[#090428] font-bold shadow-[0_0_14px_rgba(255,234,0,0.45)]'
                      : 'text-[#FFEA00] hover:text-white hover:bg-[#110849]/50'
                  }`}
                  style={{
                    ...(isActive
                      ? {
                          backgroundColor: '#FFEA00',
                          color: '#090428',
                        }
                      : {}),
                    ...(isExpanded
                      ? {
                          padding: '0 16px 0 20px',
                          gap: '12px',
                          justifyContent: 'flex-start',
                          height: '48px',
                          width: '100%',
                        }
                      : {
                          justifyContent: 'center',
                          padding: '0',
                          height: '48px',
                          width: '100%',
                        }),
                  }}
                  title={!isExpanded ? item.label : undefined}
                  data-testid={`sidebar-tab-${item.id}`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`shrink-0 ${isActive ? 'text-[#090428]' : 'text-[#FFEA00]'}`}
                  />

                  {isExpanded && (
                    <div className="flex items-center justify-between w-full overflow-hidden text-left font-mono">
                      <span className="text-xs truncate">{item.label}</span>
                      {typeof item.count === 'number' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 font-mono ml-auto ${
                            isActive
                              ? 'bg-[#090428] text-[#FFEA00]'
                              : 'bg-[#110849] text-[#FFEA00]'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Small yellow › collapse tab attached directly onto the right border line */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="sidebar-collapse-btn absolute flex items-center justify-center font-bold cursor-pointer select-none"
        style={{
          right: '-14px',
          top: '392px',
          width: '28px',
          height: '30px',
          backgroundColor: '#FFEA00',
          color: '#090428',
          boxShadow: '0 0 8px rgba(255, 234, 0, 0.5)',
          zIndex: 40,
        }}
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="toggle-sidebar-btn"
      >
        <span className="text-lg leading-none font-bold">
          {isExpanded ? '‹' : '›'}
        </span>
      </div>

      {/* Bottom Help Icon */}
      <div className="flex flex-col items-center pb-6 w-full">
        <div
          className="side-help text-[#FFEA00] hover:text-white transition-opacity cursor-pointer opacity-85"
          title="MagicSmoke Documentation & Help"
        >
          <HelpCircle size={20} />
        </div>
      </div>
    </aside>
  );
};
