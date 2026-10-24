import React, { useState } from 'react';
import { X, Sliders, Eye, Split, Image as ImageIcon } from 'lucide-react';

interface ReferenceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'dashboard' | 'circuits';
}

export const ReferenceComparisonModal: React.FC<ReferenceComparisonModalProps> = ({
  isOpen,
  onClose,
  currentView,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<'dashboard' | 'circuits'>(currentView);
  const [opacity, setOpacity] = useState<number>(0.85);

  if (!isOpen) return null;

  const imageSrc =
    selectedPhoto === 'dashboard'
      ? '/dashboard-reference.png'
      : '/circuits-reference.png';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-neutral-800 text-sm">
              <ImageIcon size={18} className="text-[#0175da]" />
              <span>Reference Screenshot Comparison</span>
            </div>

            {/* Toggle Photo 1 vs Photo 2 */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-neutral-300">
              <button
                onClick={() => setSelectedPhoto('dashboard')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedPhoto === 'dashboard'
                    ? 'bg-[#0175da] text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Dashboard Screenshot (Photo 2)
              </button>
              <button
                onClick={() => setSelectedPhoto('circuits')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedPhoto === 'circuits'
                    ? 'bg-[#0175da] text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Circuits + Code Screenshot (Photo 1)
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grow overflow-auto p-4 flex flex-col items-center justify-center bg-neutral-900/10">
          <div className="relative max-w-full rounded-lg overflow-hidden border border-neutral-300 shadow-md bg-white">
            <img
              src={imageSrc}
              alt={selectedPhoto === 'dashboard' ? 'Tinkercad Dashboard Reference' : 'Tinkercad Circuits Reference'}
              className="max-h-[68vh] w-auto object-contain"
            />
          </div>

          <div className="mt-3 text-xs text-neutral-600 flex items-center gap-2">
            <span>Original User-Provided Reference Image ({selectedPhoto === 'dashboard' ? '1024x475' : '1024x479'})</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs">
          <span className="text-neutral-500">
            Compare features, typography, buttons, colors, and layout directly against your reference.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0175da] hover:bg-[#035cc5] text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
