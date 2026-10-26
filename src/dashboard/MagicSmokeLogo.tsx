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
      {/* Square Logo */}
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 rounded-none overflow-hidden flex items-center justify-center"
      >
        {!imageFailed ? (
          <img
            src="/magicsmoke-logo.jpg"
            alt="MagicSmoke Logo"
            className="w-full h-full object-cover object-center"
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
            <span
              className="font-black tracking-[0.14em] text-[15px] leading-none bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(rgba(255, 70, 240, 0.28) 0% 25%, rgba(30, 64, 255, 0.28) 0% 50%), linear-gradient(90deg, #ff4df0 0%, #b833ff 45%, #3b6cff 100%)',
                backgroundSize: '3px 3px, 100% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 0 6px rgba(184, 51, 255, 0.45))',
              }}
            >
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
