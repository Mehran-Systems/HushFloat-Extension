import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Enables direct mouse scrolling without a scrollbar:
 * 1. Left-click & drag anywhere in the scrollable container (with inertial momentum on release).
 * 2. Suppresses accidental child click events when a drag-scroll occurred (> 4px movement).
 * 3. Middle-click (button 1) autoscroll (move mouse up/down to scroll continuously).
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const suppressNextClickRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const autoScrollRef = useRef<{ active: boolean; anchorY: number; currentY: number }>({
    active: false,
    anchorY: 0,
    currentY: 0,
  });

  const stopMomentum = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMomentum();
      document.body.classList.remove('hf-is-dragging-scroll');
    };
  }, [stopMomentum]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = ref.current;
      if (!el) return;

      // Ignore interactive slider controls or text inputs so they can be dragged/selected normally
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('.hf-slider-container') ||
        target?.closest('input') ||
        target?.closest('textarea') ||
        target?.closest('select')
      ) {
        return;
      }

      // If middle-click autoscroll is currently active, any click stops it
      if (autoScrollRef.current.active) {
        autoScrollRef.current.active = false;
        stopMomentum();
        document.body.classList.remove('hf-is-dragging-scroll');
        suppressNextClickRef.current = true;
        e.preventDefault();
        return;
      }

      // Middle mouse button (button === 1): toggle continuous autoscroll
      if (e.button === 1) {
        e.preventDefault();
        stopMomentum();
        autoScrollRef.current = {
          active: true,
          anchorY: e.clientY,
          currentY: e.clientY,
        };
        document.body.classList.add('hf-is-dragging-scroll');

        const stepAutoScroll = () => {
          if (!autoScrollRef.current.active || !ref.current) return;
          const dy = autoScrollRef.current.currentY - autoScrollRef.current.anchorY;
          if (Math.abs(dy) > 5) {
            ref.current.scrollTop += dy * 0.16;
          }
          rafRef.current = requestAnimationFrame(stepAutoScroll);
        };
        rafRef.current = requestAnimationFrame(stepAutoScroll);

        const handleAutoMove = (moveEvt: MouseEvent) => {
          autoScrollRef.current.currentY = moveEvt.clientY;
        };
        const handleAutoUp = (upEvt: MouseEvent) => {
          // If user held middle click and dragged, stop on release
          if (
            upEvt.button === 1 &&
            Math.abs(upEvt.clientY - autoScrollRef.current.anchorY) > 10
          ) {
            autoScrollRef.current.active = false;
            stopMomentum();
            document.body.classList.remove('hf-is-dragging-scroll');
            window.removeEventListener('mousemove', handleAutoMove);
            window.removeEventListener('mouseup', handleAutoUp);
          }
        };
        window.addEventListener('mousemove', handleAutoMove);
        window.addEventListener('mouseup', handleAutoUp);
        return;
      }

      // Left mouse button (button === 0): direct grab-and-drag scroll with momentum
      if (e.button !== 0) return;

      stopMomentum();
      suppressNextClickRef.current = false;

      const startY = e.clientY;
      const startScrollTop = el.scrollTop;
      let lastY = e.clientY;
      let lastTime = performance.now();
      let velocityY = 0; // px per ms
      let isDragging = false;

      const handleMouseMove = (moveEvt: MouseEvent) => {
        const dy = moveEvt.clientY - startY;
        if (!isDragging && Math.abs(dy) > 4) {
          isDragging = true;
          suppressNextClickRef.current = true;
          document.body.classList.add('hf-is-dragging-scroll');
        }

        if (isDragging) {
          moveEvt.preventDefault();
          const now = performance.now();
          const dt = Math.max(1, now - lastTime);
          const stepDy = moveEvt.clientY - lastY;
          velocityY = 0.75 * (stepDy / dt) + 0.25 * velocityY;
          el.scrollTop = startScrollTop - dy;
          lastY = moveEvt.clientY;
          lastTime = now;
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.classList.remove('hf-is-dragging-scroll');

        if (isDragging) {
          // If mouse rested before release, decay velocity
          const idleMs = performance.now() - lastTime;
          if (idleMs > 60) {
            velocityY = 0;
          }

          if (Math.abs(velocityY) > 0.12) {
            const stepMomentum = () => {
              if (!ref.current) return;
              ref.current.scrollTop -= velocityY * 16;
              velocityY *= 0.92;
              if (Math.abs(velocityY) > 0.02) {
                rafRef.current = requestAnimationFrame(stepMomentum);
              } else {
                rafRef.current = null;
              }
            };
            rafRef.current = requestAnimationFrame(stepMomentum);
          }

          // Clear click suppression right after the current event loop tick
          setTimeout(() => {
            suppressNextClickRef.current = false;
          }, 40);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [stopMomentum]
  );

  const onClickCapture = useCallback((e: React.MouseEvent<T>) => {
    if (suppressNextClickRef.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressNextClickRef.current = false;
    }
  }, []);

  return {
    ref,
    onMouseDown,
    onClickCapture,
  };
}
