import { useRef, useState, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface Props {
  beforeSrc: string;
  afterSrc: string;
}

export function BeforeAfterSlider({ beforeSrc, afterSrc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[16/10] rounded-xl overflow-hidden select-none cursor-col-resize border border-border shadow-lg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After (full) */}
      <img src={afterSrc} alt="Después" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {/* Before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={beforeSrc} alt="Antes" className="w-full h-full object-cover" draggable={false} />
      </div>
      {/* Divider line */}
      <div className="absolute top-0 bottom-0" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
        <div className="w-0.5 h-full bg-white/80 shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-primary">
          <GripVertical className="h-5 w-5 text-primary" />
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium">Antes</span>
      <span className="absolute top-3 right-3 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">Después</span>
    </div>
  );
}
