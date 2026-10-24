import React from 'react';

/**
 * AtmosphericBackground:
 * Renders the authentic retro-futuristic cyberpunk digital noise, CRT scanlines,
 * analog signal interference, and irregular blue-purple texture clusters matching Image 2.
 */
export const AtmosphericBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. Base deep midnight-indigo gradient */}
      <div
        className="absolute inset-0 bg-[#07081e]"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #151042 0%, #0b0c2a 45%, #060718 100%)',
        }}
      />

      {/* 2. Rich Irregular Glitch & Analog Texture Blobs (Cyan, Cobalt, Violet, Deep Purple) */}
      {/* Top Left intense interference region */}
      <div
        className="absolute -top-10 -left-10 w-[550px] h-[450px] opacity-45 mix-blend-screen filter blur-[40px]"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, #00f0ff 0%, #3a1cf5 35%, #8816f5 65%, transparent 85%)',
        }}
      />

      {/* Top Right digital noise strip */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[350px] opacity-35 mix-blend-screen filter blur-[50px]"
        style={{
          background:
            'radial-gradient(circle at 70% 30%, #00e5ff 0%, #5d22f7 40%, #1b0c68 70%, transparent 90%)',
        }}
      />

      {/* Center Left digital glitch band */}
      <div
        className="absolute top-1/3 -left-20 w-[450px] h-[500px] opacity-40 mix-blend-screen filter blur-[45px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #2a4bf7 0%, #7d15f0 45%, transparent 80%)',
        }}
      />

      {/* Bottom Center / Right texture cloud */}
      <div
        className="absolute -bottom-20 right-1/4 w-[700px] h-[450px] opacity-30 mix-blend-screen filter blur-[60px]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, #4b1df0 0%, #00e5ff 30%, #120945 70%, transparent 90%)',
        }}
      />

      {/* 3. High-Frequency Analog CRT Noise & Pixel Dither via SVG Filter */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.28] mix-blend-overlay">
        <filter id="ms-analog-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82 0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="
              1.2  0    0    0    0
              0    0.8  0    0    0
              0    0    1.6  0    0
              0    0    0    0.9  0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#ms-analog-noise)" />
      </svg>

      {/* 4. Fine CRT Raster Scanlines (Horizontal 1px bands) */}
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-soft-light"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0px, rgba(0, 0, 0, 0.6) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* 5. Horizontal Glitch Interference Bands */}
      <div
        className="absolute inset-x-0 top-[18%] h-[2px] opacity-40 bg-[#00f0ff]"
        style={{
          boxShadow: '0 0 12px 2px #00f0ff, 0 0 25px 4px #7777ff',
        }}
      />
      <div
        className="absolute inset-x-0 top-[52%] h-[1px] opacity-25 bg-[#8b5cf6]"
        style={{
          boxShadow: '0 0 8px 1px #8b5cf6',
        }}
      />

      {/* 6. Precision Micro-Grid Overlay for Robotics Lab Atmosphere */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#fff000 1px, transparent 1px), linear-gradient(90deg, #fff000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
};
