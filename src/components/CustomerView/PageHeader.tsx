import React from 'react';
import styles from '../Dashboard/dashboard.module.css';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    breadcrumb?: string;
    children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumb, children }) => {
    return (
        <header className={styles.header}>
            <div className={styles.headerText}>
                {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
            </div>
            {children}
        </header>
    );
};
