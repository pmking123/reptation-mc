
import React, { useRef, useEffect } from 'react';
import { PolymerChain } from '../types';

interface LatticeCanvasProps {
  chains: PolymerChain[];
  obstacles: Set<string>;
  latticeSize: number;
}

const LatticeCanvas: React.FC<LatticeCanvasProps> = ({ chains, obstacles, latticeSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cellSize = size / latticeSize;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Subtle Grid
    if (latticeSize <= 60) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= latticeSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, size); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize); ctx.lineTo(size, i * cellSize); ctx.stroke();
      }
    }

    // Obstacles - Glowing Bricks
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    obstacles.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
    });

    // Chains
    const colors = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#2dd4bf'];

    chains.forEach((chain, idx) => {
      const color = colors[idx % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, cellSize * 0.4);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Glow effect for chains
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;

      for (let i = 0; i < chain.length - 1; i++) {
        const p1 = chain[i];
        const p2 = chain[i + 1];
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);

        if (dx <= 1 && dy <= 1) {
          ctx.beginPath();
          ctx.moveTo(p1.x * cellSize + cellSize / 2, p1.y * cellSize + cellSize / 2);
          ctx.lineTo(p2.x * cellSize + cellSize / 2, p2.y * cellSize + cellSize / 2);
          ctx.stroke();
        }
      }

      // Chain Head
      if (chain.length > 0) {
        const head = chain[0];
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(head.x * cellSize + cellSize / 2, head.y * cellSize + cellSize / 2, cellSize / 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;

  }, [chains, obstacles, latticeSize]);

  return (
    <div className="flex justify-center items-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 p-2">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={600} 
        className="max-w-full h-auto aspect-square rounded-lg cursor-crosshair"
      />
    </div>
  );
};

export default LatticeCanvas;
