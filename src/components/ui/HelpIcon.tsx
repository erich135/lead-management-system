/**
 * HelpIcon Component
 * 
 * A contextual help icon (ⓘ) that shows explanatory text on hover/click.
 * Can be used inline with labels or standalone.
 * 
 * Usage:
 *   <HelpIcon content="This explains what this field means" />
 *   
 *   <label>
 *     Status <HelpIcon content="The current stage of the job" />
 *   </label>
 */
import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface HelpIconProps {
  content: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'modal';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function HelpIcon({
  content,
  title,
  size = 'sm',
  variant = 'inline',
  position = 'top',
  className = '',
}: HelpIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'modal') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center justify-center text-gray-400 hover:text-ars-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ars-primary/50 rounded-full ${className}`}
          aria-label="Help"
        >
          <HelpCircle className={sizeClasses[size]} />
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-ars-heading">
                  {title || 'Help'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 text-sm text-ars-body leading-relaxed">
                {content}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Tooltip content={content} position={position} maxWidth={300}>
      <span
        className={`inline-flex items-center justify-center text-gray-400 hover:text-ars-primary transition-colors cursor-help ${className}`}
        aria-label="Help"
      >
        <HelpCircle className={sizeClasses[size]} />
      </span>
    </Tooltip>
  );
}

export default HelpIcon;
