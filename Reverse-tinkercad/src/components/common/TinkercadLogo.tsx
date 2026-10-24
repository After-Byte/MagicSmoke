import React from 'react';

interface TinkercadLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: 'white' | 'dark';
  className?: string;
}

export const TinkercadLogo: React.FC<TinkercadLogoProps> = ({
  size = 32,
  showWordmark = false,
  wordmarkColor = 'white',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3x3 Colorful Cube Grid */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        {/* Row 1 */}
        <rect x="1" y="1" width="10" height="10" rx="2" fill="#E73205" />
        <text x="6" y="8.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">T</text>
        
        <rect x="13" y="1" width="10" height="10" rx="2" fill="#FF7119" />
        <text x="18" y="8.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">I</text>
        
        <rect x="25" y="1" width="10" height="10" rx="2" fill="#FC822A" />
        <text x="30" y="8.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">N</text>

        {/* Row 2 */}
        <rect x="1" y="13" width="10" height="10" rx="2" fill="#009737" />
        <text x="6" y="20.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">K</text>
        
        <rect x="13" y="13" width="10" height="10" rx="2" fill="#67DE67" />
        <text x="18" y="20.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">E</text>
        
        <rect x="25" y="13" width="10" height="10" rx="2" fill="#D6D300" />
        <text x="30" y="20.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">R</text>

        {/* Row 3 */}
        <rect x="1" y="25" width="10" height="10" rx="2" fill="#0175DA" />
        <text x="6" y="32.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">C</text>
        
        <rect x="13" y="25" width="10" height="10" rx="2" fill="#009CD1" />
        <text x="18" y="32.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">A</text>
        
        <rect x="25" y="25" width="10" height="10" rx="2" fill="#4BBCE1" />
        <text x="30" y="32.5" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">D</text>
      </svg>

      {/* Autodesk Tinkercad Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={`text-[10px] tracking-[0.14em] font-extrabold uppercase ${
              wordmarkColor === 'white' ? 'text-white/90' : 'text-[#414651]'
            }`}
          >
            AUTODESK
          </span>
          <span
            className={`text-[19px] font-bold tracking-tight -mt-0.5 ${
              wordmarkColor === 'white' ? 'text-white' : 'text-[#1b1a1a]'
            }`}
          >
            Tinkercad
          </span>
        </div>
      )}
    </div>
  );
};
