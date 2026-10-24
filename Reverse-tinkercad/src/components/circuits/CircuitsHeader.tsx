import React, { useState } from 'react';
import { TinkercadLogo } from '../common/TinkercadLogo';
import { RobotAvatar, CircuitsIcon, SchematicIcon, ComponentsTableIcon } from '../common/Icons';
import { ArrowLeft, Edit3, Check } from 'lucide-react';

interface CircuitsHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onNavigateHome: () => void;
  currentMode: 'circuits' | 'schematic' | 'components';
  onModeChange: (mode: 'circuits' | 'schematic' | 'components') => void;
}

export const CircuitsHeader: React.FC<CircuitsHeaderProps> = ({
  title,
  onTitleChange,
  onNavigateHome,
  currentMode,
  onModeChange,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-[48px] bg-white border-b border-[#e2e4e7] px-3.5 flex items-center justify-between select-none shrink-0 z-40">
      {/* Left: Tinkercad Logo & Design Title Pill */}
      <div className="flex items-center gap-3">
        {/* Tinkercad Logo button (returns to dashboard) */}
        <button
          onClick={onNavigateHome}
          className="focus:outline-hidden hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-1.5"
          title="Return to Tinkercad Dashboard"
        >
          <TinkercadLogo size={28} showWordmark={false} />
        </button>

        {/* Project Title Pill matching Photo 1: "Incredible Jofo-Snaget" */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1 bg-white border-2 border-[#0175da] rounded-lg px-2.5 py-0.5">
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              className="text-sm font-semibold text-[#1b1a1a] outline-hidden w-44"
            />
            <button
              onClick={handleSaveTitle}
              className="text-[#0175da] hover:text-[#0446af] p-0.5"
              title="Save name"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setTempTitle(title);
              setIsEditingTitle(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#d0d5db] bg-white hover:border-[#0175da] text-[14px] font-semibold text-[#1b1a1a] transition-all cursor-pointer shadow-2xs group"
            title="Click to rename design"
          >
            <span>{title}</span>
            <Edit3 size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Right: View mode segmented pills (Circuits, Schematic, Components) & Profile Avatar */}
      <div className="flex items-center gap-4">
        {/* View mode segmented buttons */}
        <div className="flex items-center bg-[#f2f3f5] p-0.5 rounded-full border border-[#e2e4e7]">
          {/* Circuits view button */}
          <button
            onClick={() => onModeChange('circuits')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'circuits'
                ? 'bg-white text-[#0175da] shadow-xs border border-blue-200'
                : 'text-[#646e80] hover:text-[#1b1a1a]'
            }`}
          >
            <CircuitsIcon size={15} className={currentMode === 'circuits' ? 'text-[#0175da]' : ''} />
            <span>Circuits</span>
          </button>

          {/* Schematic view button */}
          <button
            onClick={() => onModeChange('schematic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'schematic'
                ? 'bg-white text-[#0175da] shadow-xs border border-blue-200'
                : 'text-[#646e80] hover:text-[#1b1a1a]'
            }`}
          >
            <SchematicIcon size={15} />
            <span>Schematic</span>
          </button>

          {/* Components table view button */}
          <button
            onClick={() => onModeChange('components')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'components'
                ? 'bg-white text-[#0175da] shadow-xs border border-blue-200'
                : 'text-[#646e80] hover:text-[#1b1a1a]'
            }`}
          >
            <ComponentsTableIcon size={15} />
            <span>Components</span>
          </button>
        </div>

        {/* User Avatar */}
        <button
          className="focus:outline-hidden hover:ring-2 hover:ring-[#0175da] rounded-full transition-all cursor-pointer"
          title="Account Profile"
        >
          <RobotAvatar size={30} />
        </button>
      </div>
    </header>
  );
};
