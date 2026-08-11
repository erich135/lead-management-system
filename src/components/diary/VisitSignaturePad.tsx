import React, { useEffect, useRef } from 'react';
import { Eraser } from 'lucide-react';

interface VisitSignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/**
 * Lightweight canvas signature pad for customer sign-off during a visit.
 * Touch-optimized with larger drawing surface and clear affordance.
 */
const VisitSignaturePad: React.FC<VisitSignaturePadProps> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  /**
   * Resolves pointer coordinates relative to the canvas element.
   */
  function getPoint(event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  /**
   * Starts a new signature stroke.
   */
  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    context.strokeStyle = '#1e293b';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  /**
   * Continues the active signature stroke.
   */
  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  /**
   * Ends the active signature stroke and saves the canvas image.
   */
  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
      onChange(canvas.toDataURL('image/png'));
    }
  }

  /**
   * Clears the signature canvas.
   */
  function handleClear(): void {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-crm-lg border-2 border-dashed border-line bg-white shadow-crm">
        <p className="border-b border-line bg-surface-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Sign here with finger or stylus
        </p>
        <canvas
          ref={canvasRef}
          width={700}
          height={240}
          className="h-44 w-full touch-none cursor-crosshair sm:h-52"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-crm border border-line bg-white px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-brand/30 hover:text-ink"
      >
        <Eraser className="h-4 w-4" />
        Clear signature
      </button>
    </div>
  );
};

export default VisitSignaturePad;
