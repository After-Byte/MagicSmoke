import React, { useState } from 'react';
import { Monitor, ChevronUp, ChevronDown, Trash2, Send } from 'lucide-react';

interface SerialMonitorDrawerProps {
  logs: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (msg: string) => void;
  onClearLogs: () => void;
}

export const SerialMonitorDrawer: React.FC<SerialMonitorDrawerProps> = ({
  logs,
  isOpen,
  onToggle,
  onSendMessage,
  onClearLogs,
}) => {
  const [inputText, setInputText] = useState('');
  const [baudRate, setBaudRate] = useState('9600');

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="border-t border-[#d0d5db] bg-white flex flex-col select-none shrink-0 z-20">
      {/* Bottom Bar matching Photo 1: "[icon] Serial Monitor [chevron]" */}
      <button
        onClick={onToggle}
        className="h-[36px] px-3.5 flex items-center justify-between bg-[#f8f9fa] hover:bg-neutral-200/60 transition-colors text-xs font-semibold text-[#414651] cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Monitor size={15} className="text-[#0175da]" />
          <span>Serial Monitor</span>
        </div>
        {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {/* Expanded Console Panel */}
      {isOpen && (
        <div className="p-3 bg-white flex flex-col gap-2 h-48 border-t border-neutral-200">
          {/* Top Controls: Input message & Baud rate */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type message to send to Arduino..."
              className="grow px-3 py-1 text-xs border border-neutral-300 rounded-md outline-hidden focus:border-[#0175da]"
            />
            <button
              onClick={handleSend}
              className="px-3 py-1 bg-[#0175da] hover:bg-[#035cc5] text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Send size={12} />
              <span>Send</span>
            </button>

            {/* Baud Rate Selector */}
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              className="px-2 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 outline-hidden"
            >
              <option value="9600">9600 baud</option>
              <option value="19200">19200 baud</option>
              <option value="115200">115200 baud</option>
            </select>

            {/* Clear Button */}
            <button
              onClick={onClearLogs}
              className="p-1.5 text-neutral-500 hover:text-red-600 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Clear Serial Monitor"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Logs Output Console */}
          <div className="grow bg-[#fafafa] border border-neutral-200 rounded-md p-2 overflow-y-auto font-mono text-[11px] text-neutral-800 leading-relaxed">
            {logs.length === 0 ? (
              <span className="text-neutral-400 italic">No serial output received yet. Start simulation to view logs.</span>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-neutral-400 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
