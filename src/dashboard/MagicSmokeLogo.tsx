import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

interface MagicSmokeLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  subtitle?: string;
}

export const MagicSmokeLogo: React.FC<MagicSmokeLogoProps> = ({
  size = 36,
  showWordmark = true,
  theme = 'light',
  className = '',
  subtitle = 'Robotics & Circuits IDE',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem Icon / Thumbnail Container */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl overflow-hidden shadow-sm shrink-0 border border-[#e2e8f0] bg-[#ffffff] flex items-center justify-center"
      >
        {!imageFailed ? (
          <img
            src="/magicsmoke-emblem.jpg"
            alt="MagicSmoke Emblem"
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#1677ff]/10 text-[#1677ff] flex items-center justify-center">
            <Cpu size={Math.round(size * 0.55)} />
          </div>
        )}
      </div>

      {/* Stylized Typography Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-wider text-base font-sans leading-none ${
                theme === 'light' ? 'text-[#172033]' : 'text-[#ffffff]'
              }`}
            >
              MAGICSMOKE
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#1677ff]/10 text-[#1677ff] border border-[#1677ff]/20 leading-none">
              v1.21
            </span>
          </div>
          {subtitle && (
            <span
              className={`text-[11px] font-medium leading-none mt-1 ${
                theme === 'light' ? 'text-[#64748b]' : 'text-[#94a3b8]'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
