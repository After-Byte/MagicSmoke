import React from 'react';

// Robot Profile Avatar
export const RobotAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full overflow-hidden border-2 border-white/90 shadow-sm flex items-center justify-center bg-[#172033] select-none shrink-0 ${className}`}
  >
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#172033" />
      {/* Mecha robot helmet avatar silhouette */}
      <path d="M16 6 L22 11 L22 18 L18 25 L14 25 L10 18 L10 11 Z" fill="#38bdf8" />
      <path d="M16 8 L20 12 L20 17 L16 23 L12 17 L12 12 Z" fill="#0284c7" />
      <rect x="13" y="14" width="6" height="2" rx="1" fill="#34d399" />
      <path d="M7 14 L10 12 L10 17 L7 18 Z" fill="#94a3b8" />
      <path d="M25 14 L22 12 L22 17 L25 18 Z" fill="#94a3b8" />
      <circle cx="16" cy="15" r="1.5" fill="#fef08a" />
      <path d="M16 4 L16 8" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

// Circuits Schematic Vector Icon
export const SchematicVectorIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="6" cy="12" r="1" fill="currentColor" />
    <circle cx="18" cy="12" r="1" fill="currentColor" />
    <path d="M6 12h2l2-6 4 12 2-6h2" />
  </svg>
);
