import React, { useState } from 'react';
import { Download, Printer, Copy, Check, ChevronDown } from 'lucide-react';
import { SerialMonitorDrawer } from './SerialMonitorDrawer';

interface CodeEditorPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  serialLogs: string[];
  onSendMessage: (msg: string) => void;
  onClearLogs: () => void;
  isSimulating: boolean;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  code,
  onCodeChange,
  serialLogs,
  onSendMessage,
  onClearLogs,
  isSimulating,
}) => {
  const [mode, setMode] = useState<'text' | 'blocks' | 'blocks-text'>('text');
  const [fontSize, setFontSize] = useState<number>(13);
  const [isSerialOpen, setIsSerialOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Line numbers calculation
  const lines = code.split('\n');

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Incredible_Jofo_Snaget.ino';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Simple syntax highlighter for C++/Arduino code
  const renderHighlightedLine = (line: string) => {
    // If it's a comment
    if (line.trim().startsWith('//')) {
      return <span className="text-[#859900] italic">{line}</span>;
    }

    // Replace keywords, types, constants, function calls with syntax colors
    const parts = line.split(/(\b(?:void|int|float|bool|setup|loop|pinMode|digitalWrite|digitalRead|delay|Serial|begin|println|print|LED_BUILTIN|OUTPUT|INPUT|HIGH|LOW)\b|\/\/.*$)/g);

    return parts.map((part, index) => {
      if (part.startsWith('//')) {
        return <span key={index} className="text-[#859900] italic">{part}</span>;
      }
      if (['void', 'int', 'float', 'bool'].includes(part)) {
        return <span key={index} className="text-[#d33682] font-semibold">{part}</span>;
      }
      if (['setup', 'loop', 'pinMode', 'digitalWrite', 'delay', 'digitalRead'].includes(part)) {
        return <span key={index} className="text-[#268bd2] font-semibold">{part}</span>;
      }
      if (['LED_BUILTIN', 'OUTPUT', 'INPUT', 'HIGH', 'LOW'].includes(part)) {
        return <span key={index} className="text-[#b58900] font-bold">{part}</span>;
      }
      if (part === 'Serial') {
        return <span key={index} className="text-[#6c71c4] font-bold">{part}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-[420px] lg:w-[480px] bg-white border-l border-[#d0d5db] flex flex-col justify-between shrink-0 h-full shadow-md z-30 select-none">
      {/* 1. Header Toolbar matching Photo 1 */}
      <div className="h-[44px] bg-[#f8f9fa] border-b border-[#e2e4e7] px-3 flex items-center justify-between shrink-0">
        {/* Left: Mode Dropdown (Text / Blocks / Blocks + Text) */}
        <div className="relative">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="appearance-none bg-white border border-[#d0d5db] hover:border-[#0175da] rounded-md px-2.5 py-1 pr-6 text-xs font-semibold text-[#1b1a1a] cursor-pointer outline-hidden shadow-2xs"
          >
            <option value="text">Text</option>
            <option value="blocks">Blocks</option>
            <option value="blocks-text">Blocks + Text</option>
          </select>
          <ChevronDown size={13} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
        </div>

        {/* Right Action Icons: Download, Copy, Font Size, Target selector */}
        <div className="flex items-center gap-1.5">
          {/* Download code */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#0175da] transition-colors cursor-pointer"
            title="Download code (.ino)"
          >
            <Download size={15} />
          </button>

          {/* Copy / Print */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#0175da] transition-colors cursor-pointer"
            title="Copy Code"
          >
            {isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          </button>

          {/* Font Size Toggle A^ Av */}
          <button
            onClick={() => setFontSize((s) => (s >= 16 ? 11 : s + 2))}
            className="px-1.5 py-0.5 rounded-md hover:bg-neutral-200/70 text-[#414651] hover:text-[#0175da] text-xs font-bold transition-colors cursor-pointer flex items-center"
            title="Change font size"
          >
            <span>A</span>
            <span className="text-[9px] font-normal">±</span>
          </button>

          {/* Target Board Selector Dropdown */}
          <div className="relative ml-1">
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#d0d5db] text-[11px] font-bold text-[#1b1a1a] shadow-2xs"
              title="Target Microcontroller"
            >
              <span>1 (Arduino Uno R3)</span>
              <ChevronDown size={12} className="text-neutral-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Editor Area: Line Numbers + Highlighted Textarea */}
      <div className="grow relative overflow-hidden flex bg-white font-mono">
        {/* Line Numbers Column */}
        <div
          className="w-10 bg-[#fafafa] border-r border-[#e2e4e7] py-3 text-right pr-2 text-neutral-400 select-none shrink-0"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Content Container */}
        <div className="grow relative overflow-auto p-3">
          {/* Formatted Code Rendering */}
          <div
            className="absolute inset-3 pointer-events-none whitespace-pre font-mono text-neutral-800 leading-relaxed"
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
          >
            {lines.map((line, i) => (
              <div key={i}>{renderHighlightedLine(line)}</div>
            ))}
          </div>

          {/* Transparent Live Editable Textarea */}
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            spellCheck={false}
            className="absolute inset-3 w-full h-full bg-transparent text-transparent caret-neutral-900 border-none outline-hidden resize-none font-mono leading-relaxed whitespace-pre"
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
          />
        </div>
      </div>

      {/* 3. Bottom Drawer: Serial Monitor */}
      <SerialMonitorDrawer
        logs={serialLogs}
        isOpen={isSerialOpen}
        onToggle={() => setIsSerialOpen(!isSerialOpen)}
        onSendMessage={onSendMessage}
        onClearLogs={onClearLogs}
      />
    </div>
  );
};
