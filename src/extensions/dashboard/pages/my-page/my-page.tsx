import React, { type FC, useEffect, useState } from 'react';
import styles from '../../../../components/Dashboard/dashboard.module.css';
import { SettingsView } from '../../../../components/Setting';
import { CustomersView } from '../../../../components/CustomerView';
// import { AccessGroup } from '../../../../components/AccessGroup';
import { PricingRulesView } from '../../../../components/PricingRules';
import { Sidebar } from '../../../../components/Sidebar';
import { WholesaleApplicationsView } from '../../../../components/Application';
import { createCustomField, createMemberCustomField, createOrGetExtendedField, ExtendedFields, getAllMembers, getAppInstance, getExtendedFieldsForMember, getMemberDetails, updateContact } from '../../../../backend/pricing.client';
import { AccessGroupsView } from '../../../../components/AccessGroup';
import FirstTimeUserDetector from '../../../../components/Onboarding/FirstUseDetector';
import { useDashboardStats } from '../../../../components/CustomerView/useDashboardStats';

const DASHBOARD_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Manrope:wght@400;500;600;700;800&display=swap';

export type MyAppInstance = {
  instanceId: string;
  appName: string;
  appVersion: string;
  isFree: boolean;
  permissions: string[];
  availablePlans: any[];
  originInstanceId: string;
  isOriginSiteTemplate: boolean;
  copiedFromTemplate: boolean;
  freeTrialAvailable: boolean;
};

export type MySiteInfo = {
  siteDisplayName: string;
  locale: string;
  paymentCurrency: string;
  multilingual: {
    isMultiLingual: boolean;
    supportedLanguages: string[];
  };
  url: string;
  installedWixApps: string[];
  ownerEmail: string;
  ownerInfo: {
    email: string;
    emailStatus: string;
  };
  siteId: string;
};

export type MyGetAppInstanceResponse = {
  instance: MyAppInstance;
  site: MySiteInfo;
};

export const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 5c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
  Pricing: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
    </svg>
  ),
  Groups: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.995 2.995 0 0 0 17.06 7c-.8 0-1.54.37-2.01.97l-2.89 3.68c-.42.53-.66 1.2-.66 1.89v6.46c0 .55.45 1 1 1h.5v-6.5c0-.28.22-.5.5-.5s.5.22.5.5V22h2z" />
      <path d="M12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zm1.5 1h-3c-.83 0-1.5.67-1.5 1.5v6c0 .28.22.5.5.5s.5-.22.5-.5V16h2.5l.9 4.4c.09.43.5.73.93.6.43-.09.69-.5.6-.93l-1-4.97c.41-.16.7-.56.7-1.03V13.5h-.8z" />
      <path d="M5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm1.5 1h-3C3.45 7 3 7.45 3 8v6.5c0 .28.22.5.5.5s.5-.22.5-.5v-4c0-.28.22-.5.5-.5s.5.22.5.5v8.5c0 .28.22.5.5.5s.5-.22.5-.5V13h1v5.5c0 .28.22.5.5.5s.5-.22.5-.5V8c0-.55-.45-1-1-1z" />
    </svg>
  ),
  Quotes: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
    </svg>
  ),
  Catalogs: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  ),
  Applications: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM9 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 8v-2h6v2h-6zm0-4v-2h6v2h-6zm0-4v-2h4v2h-4z" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  ),
  Delete: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  ),
  Export: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  ),
};

const Index: FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [instance, setInstance] = useState<MyAppInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stats = useDashboardStats(activeTab);


  const renderContent = () => {
    switch (activeTab) {

      case 'groups':
        return <AccessGroupsView
        />;
      case 'pricing':
        return <PricingRulesView />;
      case 'applications':
        return <WholesaleApplicationsView />;
      case 'settings':
        return <SettingsView />;

      default:
        return <CustomersView stats={stats} onNavigate={setActiveTab} />;

    }
  };

  const createCustom = async () => {
    try {
      await createOrGetExtendedField('customer', 'TEXT');
    } catch (err) {
      setError('Failed to connect to app instance');
    }
  };


  useEffect(() => {
    createCustom()
  }, []);

  useEffect(() => {
    if (document.querySelector(`link[href="${DASHBOARD_FONTS_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = DASHBOARD_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  return (
    <FirstTimeUserDetector
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <div className={styles.shell}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingApplications={stats.pendingApplications.length}
        />
        <main className={styles.main}>
          {renderContent()}
        </main>
      </div>
    </FirstTimeUserDetector>
  );
};

export default Index;