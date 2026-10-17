import React, { type FC, useEffect, useState } from 'react';
import { getReviewPromptState, updateReviewPromptState } from '../../backend/pricing.client';
import type { ReviewPromptAction } from '../../backend/pricing.server';
import { useAppInstance } from '../../utils/appInstance';
import { OnboardingStorage } from '../Onboarding/OnboardingUtils';
import { DashIcons } from '../Dashboard/icons';
import { Box, Button, Modal, Text } from '../ui';
import { REVIEW_URL, isEligibleForReviewPrompt } from './ReviewPromptUtils';

/** Wait a moment after the dashboard loads so the prompt doesn't land on the first paint. */
const SHOW_DELAY_MS = 5000;
/** Set to 'true' in localStorage to show the prompt regardless of plan (for testing). */
const FORCE_SHOW_KEY = 'wholesale_review_prompt_force';

const isForced = (): boolean => {
  try { return localStorage.getItem(FORCE_SHOW_KEY) === 'true'; }
  catch { return false; }
};

const openInNewTab = (url: string) => {
  try { window.open(url, '_blank'); }
  catch (e) { window.location.href = url; }
};

export const ReviewPrompt: FC = () => {
  const { appInstance, isLoading } = useAppInstance();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      // Never stack on top of onboarding; try again on a later visit.
      if (!OnboardingStorage.hasSeenOnboarding()) return;
      try {
        const state = await getReviewPromptState();
        if (!cancelled && (isForced() || isEligibleForReviewPrompt(appInstance, state))) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('[ReviewPrompt] failed to load prompt state', error);
      }
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoading, appInstance]);

  const close = (action: ReviewPromptAction) => {
    setIsOpen(false);
    updateReviewPromptState(action).catch((error) => {
      console.error('[ReviewPrompt] failed to save prompt state', error);
    });
  };

  const handleReview = () => {
    openInNewTab(REVIEW_URL);
    close('reviewed');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => close('snoozed')}
      size="small"
      icon={<DashIcons.Star />}
      title="Enjoying B2B Wholesale Pricing?"
      closeOnOverlayClick={false}
      footer={
        <Box gap="8px" align="right">
          <Button priority="secondary" onClick={() => close('dismissed')}>Don't ask again</Button>
          <Button priority="secondary" onClick={() => close('snoozed')}>Maybe later</Button>
          <Button onClick={handleReview}>Leave a review</Button>
        </Box>
      }
    >
      <Text secondary>
        A quick review on the Wix App Market helps other store owners find the app and tells us
        what to improve next. It only takes a minute.
      </Text>
    </Modal>
  );
};

export default ReviewPrompt;
