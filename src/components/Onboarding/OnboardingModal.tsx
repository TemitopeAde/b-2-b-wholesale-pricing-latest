import React, { useState, useEffect } from 'react';
import StepIndicator from './StepIndicator';
import { 
  CloseIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  LightBulbIcon, 
  StarIcon 
} from './OnboardingIcons';
import './onboard.css';
import { ANIMATION_DURATIONS, ONBOARDING_STEPS, type OnboardingStep } from './onboardConfig';

interface OnboardingModalProps {
  activeTab: string;
  onClose: () => void;
  onTabNavigation: (tab: string) => void;
  steps?: OnboardingStep[];
  allowStepNavigation?: boolean;
  showProgress?: boolean;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  activeTab, 
  onClose, 
  onTabNavigation,
  steps = ONBOARDING_STEPS,
  allowStepNavigation = true,
  showProgress = true 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) {
            event.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isFirstStep, isLastStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onTabNavigation(steps[nextStep].tab);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onTabNavigation(steps[prevStep].tab);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!allowStepNavigation) return;
    
    setCurrentStep(stepIndex);
    onTabNavigation(steps[stepIndex].tab);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, ANIMATION_DURATIONS.FADE_OUT);
  };

  // Prevent rendering if not visible
  if (!isVisible) return null;

  return (
    <div className={`onboarding-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-header">
          {showProgress && (
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
              onStepClick={handleStepClick}
              allowClickNavigation={allowStepNavigation}
            />
          )}
          
          <button 
            className="close-btn"
            onClick={handleSkip}
            aria-label="Close onboarding"
            title="Skip tour (Esc)"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="onboarding-content">
          <div className="step-header">
            <h2 id="onboarding-title">{currentStepData.title}</h2>
            <span className="step-counter">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          <p className="step-description">{currentStepData.description}</p>

          <div className="highlight-box">
            <div className="highlight-icon">
              <LightBulbIcon />
            </div>
            <div>
              <strong>Key Feature:</strong> {currentStepData.highlight}
            </div>
          </div>

          <div className="action-box">
            <div className="action-icon">
              <StarIcon />
            </div>
            <div>
              <strong>What you can do:</strong> {currentStepData.action}
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <div className="left-actions">
            {!isFirstStep && (
              <button 
                className="btn-secondary" 
                onClick={handlePrevious}
                aria-label="Go to previous step"
                title="Previous step (←)"
              >
                <ChevronLeftIcon />
                Previous
              </button>
            )}
          </div>

          <div className="right-actions">
            <button 
              className="btn-ghost" 
              onClick={handleSkip}
              aria-label="Skip onboarding tour"
            >
              Skip Tour
            </button>
            
            <button 
              className="btn-primary" 
              onClick={handleNext}
              aria-label={isLastStep ? "Complete onboarding" : "Go to next step"}
              title={isLastStep ? "Complete tour" : "Next step (→)"}
            >
              {isLastStep ? 'Get Started' : currentStepData.nextAction}
              {!isLastStep && <ChevronRightIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;