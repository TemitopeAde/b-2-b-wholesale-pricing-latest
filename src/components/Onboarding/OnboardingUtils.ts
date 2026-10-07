// onboardingUtils.ts - Utility functions for onboarding system

import { type OnboardingStep, STORAGE_KEYS } from "./onboardConfig";


/**
 * Storage utilities for managing onboarding state
 */
export class OnboardingStorage {
  // Check if user has completed onboarding
  static hasSeenOnboarding(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN) === 'true';
    } catch {
      return false;
    }
  }

  // Mark onboarding as completed
  static setOnboardingSeen(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
      localStorage.setItem(`${STORAGE_KEYS.ONBOARDING_SEEN}_timestamp`, Date.now().toString());
    } catch {
      // Ignore storage error
    }
  }

  // Reset onboarding (for testing or re-onboarding)
  static resetOnboarding(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING_SEEN);
      localStorage.removeItem(`${STORAGE_KEYS.ONBOARDING_SEEN}_timestamp`);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
    } catch {
      // Ignore storage error
    }
  }

  // Save current step (for resuming onboarding)
  static saveCurrentStep(step: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, step.toString());
    } catch {
      // Ignore storage error
    }
  }

  // Get saved step
  static getCurrentStep(): number {
    try {
      const step = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      return step ? parseInt(step, 10) : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Options for determining if onboarding should be shown
 */
interface ShouldShowOnboardingOptions {
  forceShow?: boolean;
  checkUserActivity?: boolean;
  minimumTimeSinceLastVisit?: number; // milliseconds
}

/**
 * Check if user should see onboarding based on various criteria
 */
export const shouldShowOnboarding = (options: ShouldShowOnboardingOptions = {}): boolean => {
  const {
    forceShow = false,
    checkUserActivity = false,
    minimumTimeSinceLastVisit = 0
  } = options;

  // Force show for testing
  if (forceShow) return true;

  // Check if user has already seen onboarding
  if (OnboardingStorage.hasSeenOnboarding()) {
    return false;
  }

  // Additional checks can be added here
  if (checkUserActivity) {
    // You could check user activity, number of actions taken, etc.
    // For now, return true for first-time users
    return true;
  }

  return true;
};

/**
 * Analytics utilities for tracking onboarding events
 */
export class OnboardingAnalytics {
  // Track onboarding started
  static trackStart(): void {}

  // Track step viewed
  static trackStepView(_stepIndex: number, _stepName: string): void {}

  // Track onboarding completed
  static trackComplete(_totalSteps: number, _timeSpent: number): void {}

  // Track onboarding skipped
  static trackSkip(_currentStep: number, _totalSteps: number): void {}

  // Track button clicks
  static trackButtonClick(_buttonType: string, _stepIndex: number): void {}
}

/**
 * Utility to validate onboarding configuration
 */
export const validateOnboardingConfig = (steps: OnboardingStep[]): string[] => {
  const errors: string[] = [];

  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push('Steps must be a non-empty array');
    return errors;
  }

  steps.forEach((step, index) => {
    if (!step.tab) {
      errors.push(`Step ${index} is missing required 'tab' property`);
    }
    if (!step.title) {
      errors.push(`Step ${index} is missing required 'title' property`);
    }
    if (!step.description) {
      errors.push(`Step ${index} is missing required 'description' property`);
    }
    if (!step.highlight) {
      errors.push(`Step ${index} is missing required 'highlight' property`);
    }
    if (!step.action) {
      errors.push(`Step ${index} is missing required 'action' property`);
    }
    if (!step.nextAction) {
      errors.push(`Step ${index} is missing required 'nextAction' property`);
    }
  });

  return errors;
};

/**
 * Utility function to get step by tab name
 */
export const getStepByTab = (steps: OnboardingStep[], tabName: string): OnboardingStep | undefined => {
  return steps.find(step => step.tab === tabName);
};

/**
 * Utility function to get step index by tab name
 */
export const getStepIndexByTab = (steps: OnboardingStep[], tabName: string): number => {
  return steps.findIndex(step => step.tab === tabName);
};

/**
 * Format time duration for display
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${seconds}s`;
};

/**
 * Debounce function for handling rapid user interactions
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};