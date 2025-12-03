/**
 * Tooltip Component
 * 
 * A reusable tooltip that appears on hover/focus.
 * Supports multiple positions and custom styling.
 * 
 * Usage:
 *   <Tooltip content="This is helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 */
import { useState, useRef, useEffect, ReactNode } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  maxWidth?: number;
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  maxWidth = 250,
  className = '',
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.top + scrollY - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.bottom + scrollY + 8;
        break;
      case 'left':
        x = triggerRect.left + scrollX - tooltipRect.width - 8;
        y = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = triggerRect.right + scrollX + 8;
        y = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }

    // Keep tooltip within viewport
    const padding = 10;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowPositionClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`inline-flex ${className}`}
      >
        {children}
      </div>
      {isVisible && content && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg animate-fade-in"
          style={{
            left: coords.x,
            top: coords.y,
            maxWidth: maxWidth,
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowPositionClasses[position]}`}
          />
        </div>
      )}
    </>
  );
}

export default Tooltip;
