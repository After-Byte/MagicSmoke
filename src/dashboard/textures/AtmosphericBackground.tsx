import React, { useEffect, useRef } from 'react';

/**
 * AtmosphericBackground:
 * Procedural HTML5 <canvas id="cyber-brush-canvas"> dry-brush & stipple-dither background.
 * Rendered at 0.5x pixel scale (image-rendering: pixelated) with a base of #080326,
 * sweeping quadratic bezier bristle-brush strokes in electric cobalt (#1D2BFF, #3A52FF),
 * deep navy-black carve-outs (#040118), and left-edge/bottom-left magenta-violet grunge strokes (#C81EFF, #E028FF).
 * Performs an ImageData pixel pass using a 4x4 Bayer dither matrix + cross-hatch weave + stochastic stipple spray.
 */
export const AtmosphericBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function renderCyberBrushTexture() {
      if (!canvas || !ctx) return;
      if (typeof window === 'undefined') return;

      // Render at 0.5x pixel scale (scale = 2) with image-rendering: pixelated
      const scale = 2;
      const w = Math.max(Math.ceil((window.innerWidth || 1440) / scale), 200);
      const h = Math.max(Math.ceil((window.innerHeight || 900) / scale), 150);
      canvas.width = w;
      canvas.height = h;

      // 1. Base Deep Ultramarine Fill
      ctx.fillStyle = '#080326';
      ctx.fillRect(0, 0, w, h);

      // Helper: Draw sweeping multi-bristle dry-brush strokes
      function drawBristleStroke(
        x1: number,
        y1: number,
        cx: number,
        cy: number,
        x2: number,
        y2: number,
        thickness: number,
        color: string,
        bristleCount = 45,
        alpha = 0.25
      ) {
        ctx!.save();
        ctx!.strokeStyle = color;
        for (let i = 0; i < bristleCount; i++) {
          const offset = (Math.random() - 0.5) * thickness;
          const offset2 = (Math.random() - 0.5) * thickness * 1.2;
          ctx!.globalAlpha = alpha * (0.3 + Math.random() * 0.7);
          ctx!.lineWidth = 0.8 + Math.random() * 2.4;
          ctx!.beginPath();
          ctx!.moveTo(x1 + offset, y1 + offset * 0.5);
          ctx!.quadraticCurveTo(cx + offset2, cy + offset, x2 + offset, y2 + offset2 * 0.5);
          ctx!.stroke();
        }
        ctx!.restore();
      }

      // 2. Paint Cobalt & Royal Blue Diagonal Brush Sweeps (matching reference design)
      // Top-center / navbar sweep
      drawBristleStroke(w * 0.28, -20, w * 0.45, h * 0.14, w * 0.75, h * 0.05, 85, '#1D2BFF', 90, 0.35);
      drawBristleStroke(w * 0.32, h * 0.02, w * 0.48, h * 0.1, w * 0.62, -10, 55, '#3A52FF', 65, 0.35);

      // Left sidebar & mid-left cobalt sweep
      drawBristleStroke(-30, h * 0.05, w * 0.06, h * 0.38, w * 0.12, h * 0.95, 95, '#1B28FF', 110, 0.4);

      // Bottom-center & under-hero sweeping diagonal brush strokes
      drawBristleStroke(w * 0.06, h * 0.74, w * 0.28, h * 0.68, w * 0.56, h * 0.96, 120, '#1D2BFF', 130, 0.42);
      drawBristleStroke(w * 0.18, h * 0.78, w * 0.38, h * 0.72, w * 0.52, h * 0.88, 70, '#384CFF', 85, 0.38);
      drawBristleStroke(w * 0.52, h * 0.65, w * 0.72, h * 0.72, w * 0.92, h * 0.88, 95, '#1922B8', 90, 0.35);

      // Dark navy-black diagonal carve-outs (creates the high-contrast brush valleys)
      drawBristleStroke(w * 0.34, h * 0.64, w * 0.46, h * 0.77, w * 0.4, h * 0.98, 55, '#040118', 85, 0.65);
      drawBristleStroke(w * 0.68, h * 0.64, w * 0.78, h * 0.74, w * 0.95, h * 0.79, 65, '#040118', 85, 0.65);

      // 3. Paint Left-Edge & Bottom-Left Magenta/Violet Grunge Patches
      drawBristleStroke(-15, h * 0.02, w * 0.03, h * 0.22, w * 0.01, h * 0.42, 48, '#C81EFF', 70, 0.42);
      drawBristleStroke(-10, h * 0.48, w * 0.035, h * 0.62, w * 0.01, h * 0.76, 52, '#E028FF', 85, 0.48);
      drawBristleStroke(w * 0.12, h * 0.72, w * 0.24, h * 0.78, w * 0.35, h * 0.84, 55, '#9C1AFF', 70, 0.32);

      // 4. Pixel-Level Stipple Noise + Woven Bitmap Cross-Hatch Pass
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // 4x4 Bayer Dither Matrix (normalized 0..1)
        const bayer = [
          [0 / 16, 8 / 16, 2 / 16, 10 / 16],
          [12 / 16, 4 / 16, 14 / 16, 6 / 16],
          [3 / 16, 11 / 16, 1 / 16, 9 / 16],
          [15 / 16, 7 / 16, 13 / 16, 5 / 16],
        ];

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];

            // Woven cross-hatch dither bands
            const inWovenZone =
              (y > h * 0.66 && y < h * 0.86 && x > w * 0.04 && x < w * 0.85) ||
              (y < h * 0.12 && x > w * 0.35 && x < w * 0.75) ||
              x < w * 0.07;

            const bayerVal = bayer[y % 4][x % 4];
            const rand = Math.random();

            if (inWovenZone && b > 90) {
              // Create woven horizontal/vertical pixel-hatch texture
              const hatch = (x % 2 === 0) !== (y % 3 === 0);
              if (hatch && rand < 0.65) {
                r = Math.min(255, r + 35);
                g = Math.min(255, g + 25);
                b = Math.min(255, b + 85);
              } else if (!hatch && rand < 0.55) {
                r = Math.max(4, r - 25);
                g = Math.max(2, g - 20);
                b = Math.max(30, b - 65);
              }
            }

            // Stochastic Dry-Brush Stipple Spray
            if (rand > 0.72) {
              const stippleStrength = (bayerVal - 0.45) * 95;
              r = Math.max(4, Math.min(245, r + stippleStrength * (x < w * 0.08 ? 1.4 : 0.6)));
              g = Math.max(2, Math.min(180, g + stippleStrength * 0.35));
              b = Math.max(28, Math.min(255, b + stippleStrength * 1.35));
            }

            // Occasional bright cyan/magenta risograph grain dot on active brush edges
            if (b > 130 && rand > 0.965) {
              if (x < w * 0.08 || (y > h * 0.52 && x < w * 0.32)) {
                r = 235;
                g = 45;
                b = 255; // Magenta speckle
              } else {
                r = 55;
                g = 90;
                b = 255; // Electric blue speckle
              }
            }

            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        // Fallback for non-canvas environments
      }
    }

    renderCyberBrushTexture();
    window.addEventListener('resize', renderCyberBrushTexture);

    return () => {
      window.removeEventListener('resize', renderCyberBrushTexture);
    };
  }, []);

  return (
    <>
      {/* SVG Filters for Analog Noise and Dry-Brush Edge Roughening */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <filter id="ms-analog-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.07 0" />
        </filter>
        <filter id="dry-brush-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.08 0.35" numOctaves={3} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={4} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Procedural Canvas Background */}
      <canvas
        id="cyber-brush-canvas"
        ref={canvasRef}
        className="fixed inset-0 w-screen h-screen z-0 pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
        aria-hidden="true"
      />
    </>
  );
};
