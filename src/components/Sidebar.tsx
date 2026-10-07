import React, { type FC } from 'react';
import { getUpgradeUrl } from '../backend/pricing.client';
import { dev_mode } from '../dashboard/dev_mode';
import { useAppInstance } from '../utils/appInstance';
import { DashIcons } from './Dashboard/icons';
import styles from './Dashboard/dashboard.module.css';

const APP_ID = '0415fd4c-b629-4e16-b417-707b9ff48a14';
const FALLBACK_INSTANCE_ID = '0c78d22c-c5ab-4ed1-a0d7-0c63b6f5370d';
const USER_GUIDE_URL = 'https://35df0f92-64f5-4260-b003-37c573f99716.usrfiles.com/ugd/35df0f_559add1403a34aa0b30f975142843015.pdf';

const navigationItems = [
  { id: 'customers', icon: DashIcons.Users, label: 'Customers', requiresBusiness: false },
  { id: 'applications', icon: DashIcons.File, label: 'Applications', requiresBusiness: false },
  { id: 'groups', icon: DashIcons.Grid, label: 'Access groups', requiresBusiness: false },
  { id: 'pricing', icon: DashIcons.Tag, label: 'Pricing rules', requiresBusiness: false },
  { id: 'settings', icon: DashIcons.Settings, label: 'Settings', requiresBusiness: false },
];

const openInNewTab = (url: string) => {
  try { window.open(url, '_blank'); }
  catch (e) { window.location.href = url; }
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApplications?: number;
}

export const Sidebar: FC<SidebarProps> = ({ activeTab, setActiveTab, pendingApplications = 0 }) => {
  const { appInstance, isLoading: isInstanceLoading, error: appInstanceError, retry: retryAppInstance } = useAppInstance();
  const packageName = appInstance?.instance?.billing?.packageName || '';
  const siteName = appInstance?.site?.siteDisplayName?.trim() || (isInstanceLoading ? '' : 'My site');

  const isFree = !dev_mode && appInstance?.instance?.isFree === true;
  const freeTrialAvailable = !!appInstance?.instance?.freeTrialAvailable;

  const handleStartTrialClick = () => {
    const instanceId = appInstance?.instance?.instanceId ?? FALLBACK_INSTANCE_ID;
    openInNewTab(`https://www.wix.com/apps/upgrade/${APP_ID}?appInstanceId=${instanceId}`);
  };

  const handleUpgradeClick = async () => {
    try {
      const res: any = await getUpgradeUrl('pro', 'MONTHLY');
      const redirectUrl = res?.checkoutUrl ?? res?.url ?? null;
      if (redirectUrl) openInNewTab(redirectUrl);
    } catch {
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <DashIcons.Package size={20} />
        </div>
        <div className={styles.brandText}>
          <div className={styles.brandName} title={siteName}>{siteName}</div>
          <div className={styles.brandSub}>B2B Wholesale Pricing</div>
        </div>
      </div>

      {appInstanceError && (
        <div className={styles.sidebarError}>
          <span>Plan information unavailable.</span>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={retryAppInstance}>
            Retry
          </button>
        </div>
      )}

      <nav className={styles.nav} aria-label="Wholesale">
        <div className={styles.navLabel}>Manage</div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isLocked = item.requiresBusiness && !['business', 'enterprise'].includes(packageName);
          // The page starts on the 'dashboard' tab, which renders the Customers view
          const isActive = activeTab === item.id || (item.id === 'customers' && activeTab === 'dashboard');
          const className = [
            styles.navItem,
            isActive ? styles.navItemActive : '',
            isLocked ? styles.navItemLocked : '',
          ].join(' ');

          return (
            <button
              key={item.id}
              type="button"
              className={className}
              aria-current={isActive ? 'page' : undefined}
              data-label={item.label}
              onClick={() => {
                if (isLocked) {
                  alert('Upgrade to Business plan to access Access Groups');
                  return;
                }
                setActiveTab(item.id);
              }}
            >
              <Icon />
              <span className={styles.navText}>{item.label}</span>
              {item.id === 'applications' && pendingApplications > 0 && (
                <span className={styles.countPill} aria-label={`${pendingApplications} pending`}>
                  {pendingApplications}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={styles.spacer} />

      <a className={styles.navItem} href={USER_GUIDE_URL} target="_blank" rel="noopener noreferrer">
        <DashIcons.Book />
        <span className={styles.navText}>User guide</span>
        <DashIcons.External size={14} />
      </a>

      {!isInstanceLoading && appInstance && isFree && (
        <div className={styles.planCard}>
          <span className={styles.planEyebrow}>Free plan</span>
          <div className={styles.planTitle}>Unlock access groups and advanced pricing</div>
          <button type="button" className={styles.planPrimary} onClick={handleUpgradeClick}>
            Upgrade
          </button>
          {freeTrialAvailable && (
            <button type="button" className={styles.planSecondary} onClick={handleStartTrialClick}>
              Start free trial
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
