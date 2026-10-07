import React, { type FC, useState, useEffect } from 'react';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  FormField,
  Input,
  LoadingBlock,
  Notice,
  Page,
  PageHeader,
  Text,
  ToggleSwitch,
} from './ui';
import { DashIcons } from './Dashboard/icons';
import st from './Setting.module.css';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getConfiguration, saveConfiguration } from '../backend/pricing.client';

interface NotificationSettings {
  customerRegistrations: boolean;
  approvalEmails: boolean;
  rejectionEmails: boolean;
}

interface EmailTemplate {
  subject: string;
  bodyText: string;
}

interface EmailTemplates {
  approval: EmailTemplate;
  rejection: EmailTemplate;
  customerRegistration: EmailTemplate;
}

interface ConfigurationData {
  _id?: string;
  notificationSettings: NotificationSettings;
  emailTemplates?: EmailTemplates;
  updatedDate?: Date;
  updatedBy?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  approval: {
    subject: 'Wholesale Application Approved',
    bodyText: '<p>We are thrilled to let you know that your wholesale application has been <strong>approved</strong>!</p><p>You now have access to exclusive wholesale pricing on all eligible products. Simply log in to your account to start browsing and placing orders at your discounted rates.</p><p>If you have any questions about your account or need assistance getting started, please don\'t hesitate to reach out to our team — we\'re happy to help.</p><p>We look forward to growing together!</p>',
  },
  rejection: {
    subject: 'Wholesale Application Status',
    bodyText: '<p>Thank you for taking the time to apply for our wholesale program. We truly appreciate your interest.</p><p>After careful review, we are <strong>unable to approve</strong> your application at this time. This decision may be based on a number of factors, and we encourage you to reapply in the future as your business grows.</p><p>In the meantime, you are still welcome to shop with us at our regular retail prices.</p><p>If you have any questions or would like more information about our requirements, please feel free to contact us — we are always happy to assist.</p>',
  },
  customerRegistration: {
    subject: 'New Wholesale Application Received',
    bodyText: '<p>A new wholesale partner application has been submitted and is awaiting your review.</p><p>Please log into your dashboard to view the full application details and take action.</p>',
  },
};

export const SettingsView: FC = () => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    customerRegistrations: true,
    approvalEmails: true,
    rejectionEmails: true,
  });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(DEFAULT_EMAIL_TEMPLATES);
  const [originalEmailTemplates, setOriginalEmailTemplates] = useState<EmailTemplates>(DEFAULT_EMAIL_TEMPLATES);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<NotificationSettings | null>(null);
  const [configurationId, setConfigurationId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    if (originalSettings) {
      const notifChanged = Object.keys(notifications).some(
        key => notifications[key as keyof NotificationSettings] !== originalSettings[key as keyof NotificationSettings]
      );
      const templateChanged =
        emailTemplates.approval.subject !== originalEmailTemplates.approval.subject ||
        emailTemplates.approval.bodyText !== originalEmailTemplates.approval.bodyText ||
        emailTemplates.rejection.subject !== originalEmailTemplates.rejection.subject ||
        emailTemplates.rejection.bodyText !== originalEmailTemplates.rejection.bodyText ||
        emailTemplates.customerRegistration.subject !== originalEmailTemplates.customerRegistration.subject ||
        emailTemplates.customerRegistration.bodyText !== originalEmailTemplates.customerRegistration.bodyText;
      setHasChanges(notifChanged || templateChanged);
    }
  }, [notifications, originalSettings, emailTemplates, originalEmailTemplates]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const configData = await getConfiguration();

      if (configData && configData.notificationSettings) {
        setNotifications(configData.notificationSettings);
        setOriginalSettings(configData.notificationSettings);
        setConfigurationId(configData._id || null);
        const loadedTemplates = (configData as any).emailTemplates;
        if (loadedTemplates) {
          const merged: EmailTemplates = {
            approval: { ...DEFAULT_EMAIL_TEMPLATES.approval, ...loadedTemplates.approval },
            rejection: { ...DEFAULT_EMAIL_TEMPLATES.rejection, ...loadedTemplates.rejection },
            customerRegistration: { ...DEFAULT_EMAIL_TEMPLATES.customerRegistration, ...loadedTemplates.customerRegistration },
          };
          setEmailTemplates(merged);
          setOriginalEmailTemplates(merged);
        }
      } else {
        setOriginalSettings({ ...notifications });
      }
    } catch {
      setSaveError('Failed to load settings. Using default values.');
      setOriginalSettings({ ...notifications });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    setSuccess(null);
    setSaveError(null);

    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: ValidationErrors = {};

    const criticalNotifications = [
      notifications.customerRegistrations,
    ];

    if (!criticalNotifications.some(enabled => enabled)) {
      newErrors.critical = 'At least one critical notification must be enabled.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setSuccess(null);
    setSaveError(null);

    if (!validateSettings()) {
      return;
    }

    setIsSaving(true);

    try {
      const configurationData: ConfigurationData = {
        notificationSettings: notifications,
        emailTemplates,
      };

      if (configurationId) {
        configurationData._id = configurationId;
      }

      const savedConfig = await saveConfiguration(configurationData);

      setOriginalSettings({ ...notifications });
      setOriginalEmailTemplates({ ...emailTemplates });
      setConfigurationId(savedConfig._id || configurationId);
      setSuccess('Settings saved successfully!');
      setHasChanges(false);

      setTimeout(() => setSuccess(null), 3000);

    } catch {
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setNotifications({ ...originalSettings });
      setEmailTemplates({ ...originalEmailTemplates });
      setErrors({});
      setSuccess(null);
      setSaveError(null);
    }
  };

  const notificationItems = [
    {
      key: 'customerRegistrations' as keyof NotificationSettings,
      label: 'Customer Registrations',
      description: 'Receive alerts for new wholesale customer sign-ups',
      critical: true
    },
    {
      key: 'approvalEmails' as keyof NotificationSettings,
      label: 'Approval Emails',
      description: 'Send email notifications to customers when their application is approved',
      critical: false
    },
    {
      key: 'rejectionEmails' as keyof NotificationSettings,
      label: 'Rejection Emails',
      description: 'Send email notifications to customers when their application is rejected or set to pending',
      critical: false
    },
  ];

  const QUILL_MODULES = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  const templateSections: Array<{ key: keyof EmailTemplates; title: string; description: string; placeholder: string; hint: string }> = [
    {
      key: 'approval',
      title: 'Approval email',
      description: 'Sent to the customer when their application is approved.',
      placeholder: 'Wholesale Application Approved',
      hint: 'The greeting (“Hello,”) and sign-off (“Best regards”) are added automatically.',
    },
    {
      key: 'rejection',
      title: 'Rejection email',
      description: 'Sent to the customer when their application is rejected or set back to pending.',
      placeholder: 'Wholesale Application Status',
      hint: 'The greeting (“Hello,”) and sign-off (“Best regards”) are added automatically.',
    },
    {
      key: 'customerRegistration',
      title: 'New application alert',
      description: 'Sent to you when someone submits a wholesale application.',
      placeholder: 'New Wholesale Application Received',
      hint: 'Applicant details are added to the end automatically.',
    },
  ];

  const updateTemplate = (key: keyof EmailTemplates, field: 'subject' | 'bodyText', value: string) =>
    setEmailTemplates(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const header = (
    <PageHeader
      breadcrumb="Wholesale › Settings"
      title="Settings"
      subtitle="Choose which emails the app sends and customize what they say."
      actions={!isLoading && (
        <>
          {hasChanges && <Badge tone="warning">Unsaved changes</Badge>}
          <Button variant="secondary" onClick={handleReset} disabled={!hasChanges || isSaving}>
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} loading={isSaving}>
            {isSaving ? 'Saving…' : 'Save settings'}
          </Button>
        </>
      )}
    />
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Card><LoadingBlock message="Loading settings…" /></Card>
      </Page>
    );
  }

  return (
    <Page>
      {header}

      {success && <Notice tone="success">{success}</Notice>}
      {saveError && <Notice tone="error">{saveError}</Notice>}
      {Object.keys(errors).length > 0 && (
        <Notice tone="warning" title="Please fix the following">
          <ul className={st.errorList}>
            {Object.values(errors).map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        </Notice>
      )}

      <Card aria-label="Notifications">
        <Card.Header title="Email notifications" subtitle="Turn each email on or off." />
        <div className={st.toggleList}>
          {notificationItems.map((item) => (
            <div key={item.key} className={st.toggleRow} onClick={() => handleNotificationChange(item.key)}>
              <span className={st.toggleIcon}><DashIcons.Mail size={16} /></span>
              <span className={st.toggleText}>
                <span className={st.toggleLabel}>
                  {item.label}
                  {item.critical && <Badge tone="danger" dot={false}>Required</Badge>}
                </span>
                <Text size="small" secondary>{item.description}</Text>
              </span>
              <ToggleSwitch
                aria-label={item.label}
                checked={notifications[item.key]}
                onChange={() => handleNotificationChange(item.key)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card aria-label="Email templates">
        <Card.Header title="Email templates" subtitle="Customize the subject and message of each email." />
        <Accordion
          items={templateSections.map(section => ({
            title: (
              <span className={st.accordionTitle}>
                <span>{section.title}</span>
                <span className={st.accordionSub}>{section.description}</span>
              </span>
            ),
            children: (
              <Box direction="vertical" gap="16px">
                <FormField label="Subject line">
                  <Input
                    value={emailTemplates[section.key].subject}
                    onChange={(e) => updateTemplate(section.key, 'subject', e.target.value)}
                    placeholder={section.placeholder}
                  />
                </FormField>
                <FormField label="Message" hint={section.hint}>
                  <div className={st.editor}>
                    <ReactQuill
                      value={emailTemplates[section.key].bodyText}
                      onChange={(html) => updateTemplate(section.key, 'bodyText', html)}
                      theme="snow"
                      modules={QUILL_MODULES}
                    />
                  </div>
                </FormField>
              </Box>
            ),
          }))}
        />
      </Card>
    </Page>
  );
};