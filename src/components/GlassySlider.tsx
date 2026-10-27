import React, { useRef } from 'react';

interface GlassySliderProps {
  value: number;
  onChange: (newVal: number) => void;
  onChangeEnd?: () => void;
  trackHeight?: number;
  thumbSize?: number;
  thumbBorder?: number;
  className?: string;
}

export const GlassySlider: React.FC<GlassySliderProps> = ({
  value,
  onChange,
  onChangeEnd,
  trackHeight = 4,
  thumbSize = 10,
  thumbBorder = 1.6,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clamped = Math.min(1, Math.max(0, value));
  const halfThumb = thumbSize / 2;
  const bloomSize = thumbSize * 2.7;

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const usableWidth = rect.width - thumbSize;
    if (usableWidth <= 0) return;
    const next = Math.min(1, Math.max(0, (clientX - (rect.left + halfThumb)) / usableWidth));
    onChange(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    e.stopPropagation();
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    onChangeEnd?.();
  };

  return (
    <div
      ref={containerRef}
      className={`hf-slider-container ${className}`}
      style={{ paddingLeft: `${halfThumb}px`, paddingRight: `${halfThumb}px` }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className="hf-slider-track" style={{ height: `${trackHeight}px` }}>
        {clamped > 0 && (
          <>
            <div
              className="hf-slider-fill-glow"
              style={{
                width: `${clamped * 100}%`,
                height: `${trackHeight * 2.6}px`,
              }}
            />
            <div
              className="hf-slider-fill"
              style={{
                width: `${clamped * 100}%`,
                height: `${trackHeight}px`,
              }}
            />
            <div
              className="hf-slider-thumb-bloom"
              style={{
                left: `${clamped * 100}%`,
                width: `${bloomSize}px`,
                height: `${bloomSize}px`,
              }}
            />
            <div
              className="hf-slider-thumb"
              style={{
                left: `${clamped * 100}%`,
                width: `${thumbSize}px`,
                height: `${thumbSize}px`,
                borderWidth: `${thumbBorder}px`,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};
