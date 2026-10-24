import React from 'react';

export const TinktoberBanner: React.FC = () => {
  return (
    <div className="bg-white border border-[#e2e4e7] rounded-xl overflow-hidden shadow-xs flex flex-col md:flex-row mb-6">
      {/* Left Column: Spooky Tinktober Illustration (~40%) */}
      <div className="md:w-[42%] bg-[#1c1b1b] relative overflow-hidden flex items-center justify-center min-h-[170px] select-none p-4">
        {/* Background Spooky Atmosphere: Moon, webs, bats */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 400 180"
          fill="none"
        >
          {/* Subtle dark slate gradient background */}
          <rect width="400" height="180" fill="#242323" />
          
          {/* Glowing Harvest Moon */}
          <circle cx="260" cy="40" r="28" fill="#fef08a" opacity="0.85" filter="blur(1px)" />
          <circle cx="266" cy="38" r="24" fill="#242323" />

          {/* Spiderwebs in top corners */}
          <path
            d="M0 0 L60 0 M0 0 L55 20 M0 0 L40 40 M0 0 L20 55 M0 0 L0 60
               M20 0 Q18 8 0 20 M35 0 Q30 18 0 35 M50 0 Q45 28 0 50"
            stroke="#64748b"
            strokeWidth="1.2"
            opacity="0.4"
          />
          <path
            d="M400 0 L340 0 M400 0 L345 20 M400 0 L360 40 M400 0 L380 55 M400 0 L400 60
               M380 0 Q382 8 400 20 M365 0 Q370 18 400 35 M350 0 Q355 28 400 50"
            stroke="#64748b"
            strokeWidth="1.2"
            opacity="0.4"
          />

          {/* Hanging spiders */}
          <line x1="90" y1="0" x2="90" y2="45" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
          <circle cx="90" cy="47" r="3" fill="#94a3b8" />
          <path d="M87 45 Q84 48 85 52 M93 45 Q96 48 95 52" stroke="#94a3b8" strokeWidth="0.8" />

          <line x1="310" y1="0" x2="310" y2="35" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
          <circle cx="310" cy="37" r="2.5" fill="#94a3b8" />

          {/* Silhouetted Flying Bats */}
          <path
            d="M60 70 Q70 60 75 66 Q80 60 90 70 Q78 72 75 76 Q72 72 60 70 Z"
            fill="#e2e8f0"
            opacity="0.6"
          />
          <path
            d="M330 80 Q338 72 342 77 Q346 72 354 80 Q344 82 342 85 Q340 82 330 80 Z"
            fill="#e2e8f0"
            opacity="0.5"
          />
          <path
            d="M200 25 Q206 18 209 22 Q212 18 218 25 Q210 26 209 29 Q208 26 200 25 Z"
            fill="#e2e8f0"
            opacity="0.7"
          />
        </svg>

        {/* Foreground Banner Content: Chalk text & ribbon */}
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight font-sans drop-shadow-md">
            Join us for
          </div>
          <div className="text-[#fef08a] text-3xl sm:text-4xl font-black tracking-wide drop-shadow-[0_2px_8px_rgba(254,240,138,0.4)] my-1">
            Tinktober!
          </div>
          <div className="mt-2 bg-[#2d2c2c] border border-neutral-700/80 px-3.5 py-1 rounded-full text-[12px] font-medium text-neutral-200 shadow-sm flex items-center gap-1.5">
            <span className="text-orange-400 font-bold">31 days</span> of designing with Autodesk Tinkercad
          </div>
        </div>
      </div>

      {/* Right Column: Copy & CTA (~60%) */}
      <div className="md:w-[58%] p-6 flex flex-col justify-center items-start">
        <h2 className="text-[22px] sm:text-[25px] font-bold text-[#1b1a1a] leading-tight mb-2 tracking-tight">
          Take the Tinktober Challenge
        </h2>
        <p className="text-[14px] sm:text-[15px] text-[#414651] leading-relaxed mb-5 max-w-xl">
          Design something spooky, strange, or surprising! Explore 31 Halloween-inspired themes, from haunted houses and monsters to robots and more.
        </p>
        <button
          onClick={() => alert("Welcome to the Tinktober Challenge! Check out the spooky prompts.")}
          className="px-6 py-2 rounded-full border-2 border-[#0175da] text-[#0175da] font-bold text-sm hover:bg-[#0175da] hover:text-white transition-all duration-150 cursor-pointer shadow-xs active:scale-98"
        >
          Join the challenge
        </button>
      </div>
    </div>
  );
};
