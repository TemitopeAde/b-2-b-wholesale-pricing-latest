import React from 'react';
import styles from '../Dashboard/dashboard.module.css';

interface LoadingStateProps {
    message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading customers...",
}) => {
    return (
        <div className={styles.stateBox} role="status" aria-live="polite">
            <span className={`${styles.spinner} ${styles.spinnerLarge}`} aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
};
