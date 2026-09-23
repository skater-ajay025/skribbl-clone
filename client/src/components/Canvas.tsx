import { useEffect, useRef } from 'react';
import type { Stroke } from '../types';

const W = 900;
const H = 560;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y + 0.01);
  ctx.stroke();
  ctx.restore();
}

export default function Canvas({ strokes, drawing, color, size, tool, onStart, onMove, onEnd }: {
  strokes: Stroke[]; drawing: boolean; color: string; size: number; tool: 'brush' | 'eraser';
  onStart: (p: {x:number;y:number}) => void; onMove: (p: {x:number;y:number}) => void; onEnd: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const active = useRef(false);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    strokes.forEach(s => drawStroke(ctx, s));
  }, [strokes]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };
  return <canvas
    ref={ref} width={W} height={H} className="draw-canvas"
    onPointerDown={e => { if (!drawing) return; active.current = true; e.currentTarget.setPointerCapture(e.pointerId); onStart(point(e)); }}
    onPointerMove={e => { if (!active.current || !drawing) return; onMove(point(e)); }}
    onPointerUp={() => { if (active.current) { active.current = false; onEnd(); } }}
    onPointerCancel={() => { if (active.current) { active.current = false; onEnd(); } }}
    style={{ cursor: drawing ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default' }}
    aria-label="Drawing canvas"
  />;
}
