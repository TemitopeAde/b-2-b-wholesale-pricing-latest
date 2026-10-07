// onboardingConfig.ts - Configuration for onboarding steps

export interface OnboardingStep {
  tab: string;
  title: string;
  description: string;
  highlight: string;
  action: string;
  nextAction: string;
  icon: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    tab: 'customers',
    title: 'Welcome to Your Wholesale Dashboard!',
    description: 'Let\'s get you started with managing your wholesale business. First, let\'s explore your customer management.',
    highlight: 'This is where you\'ll manage all your wholesale customers and their applications.',
    action: 'View customer applications, approve new wholesale partners, and track their order history.',
    nextAction: 'Go to Customers',
    icon: 'users'
  },
  {
    tab: 'groups',
    title: 'Set Up Access Groups',
    description: 'Create different pricing tiers and access levels for your wholesale customers.',
    highlight: 'Access groups allow you to organize customers into different pricing tiers (e.g., Silver, Gold, Platinum).',
    action: 'Create your first access group with specific pricing rules and minimum order requirements.',
    nextAction: 'Create Access Group',
    icon: 'groups'
  },
  {
    tab: 'pricing',
    title: 'Configure Pricing Rules',
    description: 'Set up discount rules and minimum order quantities for different customer segments.',
    highlight: 'Pricing rules automatically apply discounts based on order value, quantity, or customer group.',
    action: 'Create volume discounts, category-specific pricing, or customer group discounts.',
    nextAction: 'Add Pricing Rule',
    icon: 'pricing'
  },
  {
    tab: 'applications',
    title: 'Manage Applications',
    description: 'Review and approve new wholesale partner applications.',
    highlight: 'New businesses apply to become wholesale partners. Review their details and approve qualified applicants.',
    action: 'Check for pending applications and approve legitimate wholesale businesses.',
    nextAction: 'Review Applications',
    icon: 'applications'
  },
  {
    tab: 'settings',
    title: 'Configure Your Settings',
    description: 'Set up notifications and customize your wholesale app preferences.',
    highlight: 'Configure how you want to be notified about new applications, large orders, and system updates.',
    action: 'Enable notifications for important events to stay on top of your wholesale business.',
    nextAction: 'Update Settings',
    icon: 'settings'
  }
];

// Storage keys
export const STORAGE_KEYS = {
  ONBOARDING_SEEN: 'wholesale-app-onboarding-seen',
  CURRENT_STEP: 'wholesale-app-onboarding-step',
  USER_PREFERENCES: 'wholesale-app-user-preferences'
} as const;

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FADE_IN: 300,
  FADE_OUT: 300,
  SLIDE_TRANSITION: 250
} as const;

// Onboarding configuration options
export interface OnboardingConfig {
  AUTO_ADVANCE_TIMEOUT: number;
  SHOW_ONCE_PER_SESSION: boolean;
  ALLOW_STEP_SKIP: boolean;
  SHOW_PROGRESS: boolean;
  BLUR_BACKGROUND: boolean;
}

export const ONBOARDING_CONFIG: OnboardingConfig = {
  // Auto-advance after inactivity (in seconds, 0 to disable)
  AUTO_ADVANCE_TIMEOUT: 0,
  
  // Show onboarding on every session or just first time
  SHOW_ONCE_PER_SESSION: true,
  
  // Allow skipping individual steps
  ALLOW_STEP_SKIP: true,
  
  // Show progress indicator
  SHOW_PROGRESS: true,
  
  // Blur background
  BLUR_BACKGROUND: true
};