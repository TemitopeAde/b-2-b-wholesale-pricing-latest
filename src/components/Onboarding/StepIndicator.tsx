// StepIndicator.tsx - Step indicator component

import React from 'react';
import { CheckIcon } from './OnboardingIcons';
import { type OnboardingStep } from './onboardConfig';

interface StepIndicatorProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  showNumbers?: boolean;
  allowClickNavigation?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  steps, 
  currentStep, 
  onStepClick, 
  showNumbers = true,
  allowClickNavigation = true 
}) => {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`step-dot ${
            index === currentStep 
              ? 'active' 
              : index < currentStep 
                ? 'completed' 
                : ''
          }`}
          onClick={allowClickNavigation ? () => onStepClick(index) : undefined}
          role={allowClickNavigation ? "button" : "presentation"}
          tabIndex={allowClickNavigation ? 0 : -1}
          onKeyDown={allowClickNavigation ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onStepClick(index);
            }
          } : undefined}
          aria-label={`Step ${index + 1}: ${step.title}`}
          style={{ cursor: allowClickNavigation ? 'pointer' : 'default' }}
        >
          {index < currentStep ? (
            <CheckIcon size={12} />
          ) : showNumbers ? (
            index + 1
          ) : (
            ''
          )}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;