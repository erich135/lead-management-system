import React from 'react';

export interface FormWizardStep {
  id: string;
  label: string;
}

interface FormWizardProgressProps {
  steps: FormWizardStep[];
  currentStep: number;
  onStepChange?: (index: number) => void;
}

/**
 * Horizontal step indicator for multi-step request / diary form chrome.
 */
export function FormWizardProgress({
  steps,
  currentStep,
  onStepChange,
}: FormWizardProgressProps) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-muted">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="truncate text-xs font-medium text-brand">
          {steps[currentStep]?.label}
        </p>
      </div>
      <div className="flex gap-1.5">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              title={step.label}
              disabled={!onStepChange}
              onClick={() => onStepChange?.(index)}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                active
                  ? 'bg-brand shadow-crm-glow'
                  : done
                    ? 'bg-brand/50'
                    : 'bg-surface-muted'
              }`}
              aria-label={`Go to ${step.label}`}
              aria-current={active ? 'step' : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
