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
  const foreground = theme === 'light' ? '#111214' : '#f7f7f2';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div style={{ width: size, height: size }} className="relative shrink-0 overflow-hidden border border-[#111214] bg-[#b8e0d8] shadow-[3px_3px_0_#111214]">
        {!imageFailed ? (
          <img src="/magicsmoke-emblem.jpg" alt="MagicSmoke Emblem" className="w-full h-full object-cover mix-blend-multiply" onError={() => setImageFailed(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#111214]"><Cpu size={Math.round(size * 0.55)} /></div>
        )}
      </div>
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span style={{ color: foreground }} className="font-black tracking-[0.16em] text-[15px] leading-none">MAGICSMOKE</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[#e6321f] text-white leading-none">v1.21</span>
          </div>
          {subtitle && <span style={{ color: theme === 'light' ? '#777d80' : '#cbd1cf' }} className="text-[10px] font-medium tracking-wide leading-none mt-1.5">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
