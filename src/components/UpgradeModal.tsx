import React, { useState } from 'react';
import { getUpgradeUrl } from '../backend/pricing.client';
import { Box, Button, ChoiceTile, FormField, Modal, Notice } from './ui';
import { DashIcons } from './Dashboard/icons';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading?: boolean;
}

const PLANS = [
    { value: 'pro', name: 'Pro', price: '$14.99/month' },
    { value: 'business', name: 'Business', price: '$29.99/month' },
    { value: 'enterprise', name: 'Enterprise', price: '$49.99/month' },
];

const BILLING = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' },
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    const [planType, setPlanType] = useState('');
    const [billingCycle, setBillingCycle] = useState('MONTHLY');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!planType || !billingCycle) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await getUpgradeUrl(planType, billingCycle);
            if (response && response.checkoutUrl) {
                window.location.href = response.checkoutUrl;
            } else {
                setError('Could not start checkout. Please try again.');
            }
        } catch {
            setError('Could not start checkout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            busy={isLoading}
            size="medium"
            title="Upgrade your plan"
            subtitle="Choose a plan and billing cycle to unlock advanced features and remove limits."
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={isLoading} disabled={!planType || !billingCycle}>
                        {isLoading ? 'Opening checkout…' : 'Continue to checkout'}
                    </Button>
                </>
            }
        >
            <Box direction="vertical" gap="18px">
                <FormField label="Plan">
                    <Box direction="vertical" gap="8px">
                        {PLANS.map(plan => (
                            <ChoiceTile
                                key={plan.value}
                                active={planType === plan.value}
                                onClick={() => setPlanType(plan.value)}
                                icon={<DashIcons.Star size={16} />}
                                title={plan.name}
                                description={plan.price}
                                disabled={isLoading}
                            />
                        ))}
                    </Box>
                </FormField>
                <FormField label="Billing cycle">
                    <Box gap="8px">
                        {BILLING.map(option => (
                            <ChoiceTile
                                key={option.value}
                                active={billingCycle === option.value}
                                onClick={() => setBillingCycle(option.value)}
                                title={option.label}
                                disabled={isLoading}
                            />
                        ))}
                    </Box>
                </FormField>
                {error && <Notice tone="error">{error}</Notice>}
            </Box>
        </Modal>
    );
};
