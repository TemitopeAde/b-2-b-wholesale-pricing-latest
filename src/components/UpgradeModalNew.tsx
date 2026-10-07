import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LoaderSVG } from './Icons';
import { getUpgradeUrl } from '../backend/pricing.client';
import './upgrade.css';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpgradeModalNew: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose
}) => {
    const [planType, setPlanType] = useState('');
    const [billingCycle, setBillingCycle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Create or get the modal root element
        let root = document.getElementById('modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'modal-root';
            document.body.appendChild(root);
        }
        setModalRoot(root);

        // Cleanup on unmount
        return () => {
            if (root && root.childNodes.length === 0) {
                document.body.removeChild(root);
            }
        };
    }, []);

    useEffect(() => {
        // Prevent body scroll when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const planOptions = [
        { value: 'pro', label: 'Pro - $14.99/month' },
        { value: 'business', label: 'Business - $29.99/month' },
        { value: 'enterprise', label: 'Enterprise - $49.99/month' }
    ];

    const billingOptions = [
        { value: 'MONTHLY', label: 'Monthly Billing' },
        { value: 'YEARLY', label: 'Yearly Billing' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planType || !billingCycle) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await getUpgradeUrl(planType, billingCycle);
            if (response && response.checkoutUrl) {
                window.location.href = response.checkoutUrl;
            }
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    const modalContent = (
        <div className="modalOverlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="modal" style={{
                position: 'relative',
                zIndex: 10000
            }}>
                <div className="modalHeader">
                    <h2 className="modalTitle">Upgrade Your Plan</h2>
                    <button
                        className="modalCloseButton"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modalBody">
                        <p className="modalDescription">
                            Choose your plan and billing cycle to unlock advanced features and remove limitations.
                        </p>

                        <div className="formGroup">
                            <label htmlFor="planType" className="label">
                                Select Plan
                            </label>
                            <select
                                id="planType"
                                value={planType}
                                onChange={(e) => setPlanType(e.target.value)}
                                className="select"
                                required
                                disabled={isLoading}
                            >
                                <option value="">Choose a plan...</option>
                                {planOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="formGroup">
                            <label htmlFor="billingCycle" className="label">
                                Billing Cycle
                            </label>
                            <select
                                id="billingCycle"
                                value={billingCycle}
                                onChange={(e) => setBillingCycle(e.target.value)}
                                className="select"
                                required
                                disabled={isLoading}
                            >
                                <option value="">Choose billing cycle...</option>
                                {billingOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="modalFooter">
                        <button
                            type="button"
                            className="secondaryButton"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primaryButton"
                            disabled={!planType || !billingCycle || isLoading}
                        >
                            {isLoading && <LoaderSVG />}
                            {isLoading ? 'Processing...' : 'Upgrade Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
};