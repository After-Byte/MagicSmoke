import React, { useState } from 'react';
import {
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  MessageSquare,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Code2,
  Play,
  Square,
  Share2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface CircuitsToolbarProps {
  onRotate?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddNote?: () => void;
  wireColor: string;
  onWireColorChange: (color: string) => void;
  wireType: 'normal' | 'hookup' | 'alligator';
  onWireTypeChange: (type: 'normal' | 'hookup' | 'alligator') => void;
  isCodeOpen: boolean;
  onToggleCode: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onSendTo?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  notesVisible: boolean;
  onToggleNotesVisibility?: () => void;
}

export const TINKERCAD_WIRE_COLORS = [
  { name: 'Green', hex: '#22c55e' },
  { name: 'Black', hex: '#1b1a1a' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#0175da' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Brown', hex: '#854d0e' },
  { name: 'Grey', hex: '#94a3b8' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Turquoise', hex: '#06b6d4' },
];

export const CircuitsToolbar: React.FC<CircuitsToolbarProps> = ({
  onRotate,
  onDelete,
  onUndo,
  onRedo,
  onAddNote,
  wireColor,
  onWireColorChange,
  wireType,
  onWireTypeChange,
  isCodeOpen,
  onToggleCode,
  isSimulating,
  onToggleSimulation,
  onSendTo,
  onFlipHorizontal,
  onFlipVertical,
  notesVisible,
  onToggleNotesVisibility,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isWireTypeOpen, setIsWireTypeOpen] = useState(false);

  return (
    <div className="h-[44px] bg-[#f8f9fa] border-b border-[#e2e4e7] px-3 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left side actions */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Rotate Button */}
        <button
          onClick={onRotate}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Rotate (R)"
        >
          <RotateCw size={17} />
        </button>

        {/* Delete / Trash Button */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-red-600 transition-colors cursor-pointer"
          title="Delete (Del / Backspace)"
        >
          <Trash2 size={17} />
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 mx-0.5" />

        {/* Undo Button */}
        <button
          onClick={onUndo}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={17} />
        </button>

        {/* Redo Button */}
        <button
          onClick={onRedo}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={17} />
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 mx-0.5" />

        {/* Note / Annotation Button */}
        <button
          onClick={onAddNote}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Add Note"
        >
          <MessageSquare size={17} />
        </button>

        {/* Toggle Notes visibility */}
        <button
          onClick={onToggleNotesVisibility}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title={notesVisible ? 'Hide notes' : 'Show notes'}
        >
          {notesVisible ? <Eye size={17} /> : <EyeOff size={17} className="text-neutral-400" />}
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 mx-0.5" />

        {/* Wire Color Picker Dropdown (matches Photo 1 green pill!) */}
        <div className="relative">
          <button
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            onBlur={() => setTimeout(() => setIsColorPickerOpen(false), 200)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-[#d0d5db] hover:border-[#0175da] transition-all cursor-pointer shadow-2xs"
            title="Wire Color"
          >
            <div
              className="w-4 h-4 rounded-xs border border-black/20 shadow-inner"
              style={{ backgroundColor: wireColor }}
            />
            <ChevronDown size={13} className="text-neutral-500" />
          </button>

          {isColorPickerOpen && (
            <div className="absolute top-full left-0 mt-1.5 p-2 bg-white rounded-lg shadow-xl border border-neutral-200 grid grid-cols-4 gap-1.5 z-50 animate-in fade-in duration-100">
              {TINKERCAD_WIRE_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    onWireColorChange(c.hex);
                    setIsColorPickerOpen(false);
                  }}
                  className={`w-6 h-6 rounded-xs border transition-transform hover:scale-115 flex items-center justify-center cursor-pointer ${
                    wireColor === c.hex ? 'ring-2 ring-[#0175da] ring-offset-1 border-black/40' : 'border-black/15'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Wire Type Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsWireTypeOpen(!isWireTypeOpen)}
            onBlur={() => setTimeout(() => setIsWireTypeOpen(false), 200)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-[#d0d5db] hover:border-[#0175da] transition-all cursor-pointer shadow-2xs"
            title="Wire Type"
          >
            {/* Custom line wire icon */}
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M2 7 C 6 2, 12 12, 16 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <ChevronDown size={13} className="text-neutral-500" />
          </button>

          {isWireTypeOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-32 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 z-50 text-xs">
              <button
                onClick={() => {
                  onWireTypeChange('normal');
                  setIsWireTypeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-neutral-100 font-medium ${
                  wireType === 'normal' ? 'text-[#0175da] font-bold bg-blue-50/50' : 'text-neutral-700'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => {
                  onWireTypeChange('hookup');
                  setIsWireTypeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-neutral-100 font-medium ${
                  wireType === 'hookup' ? 'text-[#0175da] font-bold bg-blue-50/50' : 'text-neutral-700'
                }`}
              >
                Hookup
              </button>
              <button
                onClick={() => {
                  onWireTypeChange('alligator');
                  setIsWireTypeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-neutral-100 font-medium ${
                  wireType === 'alligator' ? 'text-[#0175da] font-bold bg-blue-50/50' : 'text-neutral-700'
                }`}
              >
                Alligator Clip
              </button>
            </div>
          )}
        </div>

        {/* Flip Horizontal / Vertical */}
        <button
          onClick={onFlipHorizontal}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Flip Horizontal"
        >
          <FlipHorizontal size={17} />
        </button>
        <button
          onClick={onFlipVertical}
          className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#1b1a1a] transition-colors cursor-pointer"
          title="Flip Vertical"
        >
          <FlipVertical size={17} />
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* [</> Code] Toggle Button - highlighted in blue when code panel is open, matching Photo 1! */}
        <button
          onClick={onToggleCode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isCodeOpen
              ? 'bg-[#0175da] text-white hover:bg-[#035cc5] ring-2 ring-[#0175da]/30'
              : 'bg-white text-[#414651] border border-[#d0d5db] hover:border-[#0175da] hover:text-[#0175da]'
          }`}
          title="Toggle Code Editor"
        >
          <Code2 size={15} />
          <span>Code</span>
        </button>

        {/* [> Start Simulation] Button */}
        <button
          onClick={onToggleSimulation}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isSimulating
              ? 'bg-neutral-800 text-white hover:bg-neutral-900 border border-neutral-700'
              : 'bg-white text-[#1b1a1a] border border-[#d0d5db] hover:border-emerald-500 hover:text-emerald-600'
          }`}
        >
          {isSimulating ? (
            <>
              <Square size={13} className="text-red-500 fill-red-500" />
              <span>Stop Simulation</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5"></span>
            </>
          ) : (
            <>
              <Play size={13} className="text-emerald-600 fill-emerald-600" />
              <span>Start Simulation</span>
            </>
          )}
        </button>

        {/* [Send To] Button */}
        <button
          onClick={onSendTo || (() => alert('Exporting to Autodesk Fusion / 3D Print...'))}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-white border border-[#d0d5db] hover:border-[#0175da] hover:text-[#0175da] text-[#414651] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Send To / Export"
        >
          <span>Send To</span>
        </button>
      </div>
    </div>
  );
};
