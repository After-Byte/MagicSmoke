import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

interface MagicSmokeLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'cyber' | 'light' | 'dark' | 'on-red';
  className?: string;
  subtitle?: string;
}

export const MagicSmokeLogo: React.FC<MagicSmokeLogoProps> = ({
  size = 40,
  showWordmark = true,
  theme = 'cyber',
  className = '',
  subtitle = 'Robotics & Circuits IDE',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Circular Emblem matching Image 2 */}
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 rounded-full overflow-hidden border-2 border-[#fff000] bg-[#0c0d2b] flex items-center justify-center shadow-[0_0_12px_rgba(255,240,0,0.35)]"
      >
        {!imageFailed ? (
          <img
            src="/magicsmoke-emblem.jpg"
            alt="MagicSmoke Emblem"
            className="w-full h-full object-cover filter contrast-125 brightness-110"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#fff000]">
            <Cpu size={Math.round(size * 0.55)} />
          </div>
        )}
      </div>

      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-[0.14em] text-[15px] leading-none text-[#fff000]">
              MAGICSMOKE
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 border border-[#fff000] text-[#fff000] rounded leading-none">
              v1.27
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-mono font-medium tracking-wide text-[#a5b4fc] leading-none mt-1.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
