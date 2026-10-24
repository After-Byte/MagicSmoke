import React from 'react';

// Circuits View Icon
export const CircuitsIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="8" y="8" width="8" height="8" rx="1" />
    <path d="M4 9h4" />
    <path d="M4 15h4" />
    <path d="M16 9h4" />
    <path d="M16 15h4" />
    <path d="M9 4v4" />
    <path d="M15 4v4" />
    <path d="M9 16v4" />
    <path d="M15 16v4" />
  </svg>
);

// Schematic View Icon
export const SchematicIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="6" cy="12" r="1" fill="currentColor" />
    <circle cx="18" cy="12" r="1" fill="currentColor" />
    <path d="M6 12h2l2-6 4 12 2-6h2" />
  </svg>
);

// Components Table View Icon
export const ComponentsTableIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

// Robot Profile Avatar (matches the avatar in both uploaded photos!)
export const RobotAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full overflow-hidden border-2 border-white/80 shadow-xs flex items-center justify-center bg-[#1e293b] select-none ${className}`}
  >
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#1e293b" />
      {/* Mecha helmet / robot avatar silhouette matching screenshot */}
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

// Apple icon for teachers/classes
export const AppleIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 4c.5-1.5 2-2 3-2" />
    <path d="M12 6c-1.5-2-4-2-6 0-3 3-2 8 1 12 1.5 2 3.5 2 5 1s3.5 1 5-1c3-4 4-9 1-12-2-2-4.5-2-6 0z" />
  </svg>
);
