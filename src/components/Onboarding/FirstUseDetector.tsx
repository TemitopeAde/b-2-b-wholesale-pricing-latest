// FirstTimeUserDetector.tsx - Main wrapper component for onboarding

import React, { useState, useEffect, type ReactNode } from 'react';
import OnboardingModal from './OnboardingModal';
import { ONBOARDING_STEPS, type OnboardingStep } from './onboardConfig';
import { OnboardingAnalytics, OnboardingStorage, shouldShowOnboarding } from './OnboardingUtils';

interface FirstTimeUserDetectorProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  steps?: OnboardingStep[];
  forceShow?: boolean;
  onOnboardingComplete?: () => void;
  onOnboardingSkip?: (currentStep: number) => void;
}

const FirstTimeUserDetector: React.FC<FirstTimeUserDetectorProps> = ({ 
  children, 
  activeTab, 
  setActiveTab,
  steps = ONBOARDING_STEPS,
  forceShow = false,
  onOnboardingComplete,
  onOnboardingSkip
}) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenBefore = OnboardingStorage.hasSeenOnboarding();
    
    if (shouldShowOnboarding({ forceShow }) && !hasSeenBefore) {
      setShowOnboarding(true);
      setStartTime(Date.now());
      OnboardingAnalytics.trackStart();
    } else {
      setHasSeenOnboarding(true);
    }
  }, [forceShow]);

  const handleCloseOnboarding = () => {
    const timeSpent = Date.now() - startTime;
    OnboardingAnalytics.trackComplete(steps.length, timeSpent);
    
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    OnboardingStorage.setOnboardingSeen();
    
    if (onOnboardingComplete) {
      onOnboardingComplete();
    }
  };

  const handleSkipOnboarding = (currentStep: number) => {
    OnboardingAnalytics.trackSkip(currentStep, steps.length);
    
    if (onOnboardingSkip) {
      onOnboardingSkip(currentStep);
    }
    
    handleCloseOnboarding();
  };

  const handleTabNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal
          activeTab={activeTab}
          onClose={handleCloseOnboarding}
          onTabNavigation={handleTabNavigation}
          steps={steps}
        />
      )}
    </>
  );
};

export default FirstTimeUserDetector;