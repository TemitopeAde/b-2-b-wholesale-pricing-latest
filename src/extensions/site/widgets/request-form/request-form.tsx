import React, { type FC, useEffect, useMemo, useState } from 'react';
import ReactDOMClient from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';
import { fieldLabels, validationMessages } from '../../../../site/wholesale-translations';
import { findExistingApplication, submitSiteApplication, validateSiteForm, normalizeMember } from '../../../../site/wholesale-form';
import styles from './request-form.module.css';
import { getCurrentMember } from '../../../../backend/pricing.client';


// ─── Translation dictionaries ────────────────────────────────────────────────

// ─── Props ───────────────────────────────────────────────────────────────────

export interface Props {
  displayName?: string;
  language?: string;
  benefitsText?: string;
  showBusinessName?: string;
  showBusinessType?: string;
  showYearsInBusiness?: string;
  showAnnualRevenue?: string;
  showNumberOfLocations?: string;
  showWebsite?: string;
  showContactName?: string;
  showEmail?: string;
  showPhone?: string;
  showResaleCertificate?: string;
  showTaxId?: string;
  showProductCategories?: string;
  showEstimatedVolume?: string;
  showHearAboutUs?: string;
  showAdditionalInfo?: string;
  submitButtonText?: string;
  successMessage?: string;
  successTitle?: string;
  collectionName?: string;
  productCategoriesList?: string;

  // Style props
  pageBg?: string;
  formBg?: string;
  titleColor?: string;
  labelColor?: string;
  inputBg?: string;
  inputBorderColor?: string;
  inputTextColor?: string;
  buttonBg?: string;
  buttonTextColor?: string;
  errorColor?: string;
  successColor?: string;
  inputBorderRadius?: string;
  buttonBorderRadius?: string;
  formBorderRadius?: string;
  titleFont?: string;
  labelFont?: string;
  inputFont?: string;
  buttonFont?: string;

  // Label override props
  businessNameLabel?: string;
  businessTypeLabel?: string;
  yearsInBusinessLabel?: string;
  annualRevenueLabel?: string;
  numberOfLocationsLabel?: string;
  websiteLabel?: string;
  contactNameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  resaleCertificateLabel?: string;
  taxIdLabel?: string;
  productCategoriesLabel?: string;
  estimatedVolumeLabel?: string;
  hearAboutUsLabel?: string;
  additionalInfoFieldLabel?: string;
  businessInfoSectionLabel?: string;
  contactInfoSectionLabel?: string;
  credentialsSectionLabel?: string;
  productInterestSectionLabel?: string;
  additionalInfoSectionLabel?: string;
  showBusinessInfoHeader?: string;
  showContactInfoHeader?: string;
  showCredentialsHeader?: string;
  showProductInterestHeader?: string;
  showAdditionalInfoHeader?: string;
  hearAboutUsList?: string;
}

export interface FormData {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  businessType: string;
  yearsInBusiness: string;
  annualRevenue: string;
  numberOfLocations: string;
  resaleCertificate: string;
  taxId: string;
  website: string;
  hearAboutUs: string;
  interestedProducts: string[];
  estimatedMonthlyVolume: string;
  additionalInfo: string;
}

export interface ValidationErrors {
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface Member {
  member?: {
    _id?: string;
    contactId?: string;
    status?: string;
    loginEmail?: string;
    profile?: {
      nickname?: string;
      slug?: string;
    };
    privacyStatus?: string;
    activityStatus?: string;
    creationDate?: string;
    lastUpdateDate?: string;
    lastLoginDate?: string;
    emailVerified?: boolean;
    role?: string;
  };
  contact?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    emails?: Array<{
      email?: string;
      primary?: boolean;
    }>;
    phones?: Array<{
      phone?: string;
      primary?: boolean;
    }>;
    addresses?: Array<{
      street?: string;
      city?: string;
      subdivision?: string;
      country?: string;
      postalCode?: string;
    }>;
    company?: string;
    jobTitle?: string;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const CustomElement: FC<Props> = ({
  displayName,
  language = 'en',
  benefitsText = 'Join our wholesale program and get access to exclusive pricing, bulk discounts, and priority support.',
  showBusinessName = 'false',
  showBusinessType = 'false',
  showYearsInBusiness = 'false',
  showAnnualRevenue = 'false',
  showNumberOfLocations = 'false',
  showWebsite = 'false',
  showContactName = 'true',
  showEmail = 'true',
  showPhone = 'true',
  showResaleCertificate = 'false',
  showTaxId = 'false',
  showProductCategories = 'false',
  showEstimatedVolume = 'false',
  showHearAboutUs = 'false',
  showAdditionalInfo = 'false',
  productCategoriesList = 'Hardware & Tools\nBuilding Materials\nElectrical Supplies\nPlumbing Supplies\nSafety Equipment\nIndustrial Equipment\nOther',
  submitButtonText,
  successMessage = 'Thank you for your interest in becoming a wholesale partner. Our team will review your application and contact you within 2-3 business days.',
  successTitle = '',
  // Style props with defaults
  pageBg = '#f8f9fa',
  formBg = '#ffffff',
  titleColor = '#333333',
  labelColor = '#333333',
  inputBg = '#ffffff',
  inputBorderColor = '#e0e0e0',
  inputTextColor = '#333333',
  buttonBg = '#4361ee',
  buttonTextColor = '#ffffff',
  errorColor = '#dc3545',
  successColor = '#28a745',
  inputBorderRadius = '6',
  buttonBorderRadius = '8',
  formBorderRadius = '12',
  titleFont = '',
  labelFont = '',
  inputFont = '',
  buttonFont = '',
  // Label overrides
  businessNameLabel,
  businessTypeLabel,
  yearsInBusinessLabel,
  annualRevenueLabel,
  numberOfLocationsLabel,
  websiteLabel,
  contactNameLabel,
  emailLabel,
  phoneLabel,
  resaleCertificateLabel,
  taxIdLabel,
  productCategoriesLabel,
  estimatedVolumeLabel,
  hearAboutUsLabel,
  additionalInfoFieldLabel,
  businessInfoSectionLabel,
  contactInfoSectionLabel,
  credentialsSectionLabel,
  productInterestSectionLabel,
  additionalInfoSectionLabel,
  showBusinessInfoHeader = 'true',
  showContactInfoHeader = 'true',
  showCredentialsHeader = 'true',
  showProductInterestHeader = 'true',
  showAdditionalInfoHeader = 'true',
  hearAboutUsList = 'Search Engine\nSocial Media\nReferral\nTrade Show\nIndustry Publication\nExisting Customer\nOther',
}) => {

  // ── Active labels (translation + overrides) ──────────────────────────────
  const currentLang = useMemo(() => language || 'en', [language]);
  const baseLabels = useMemo(() => fieldLabels[currentLang] || fieldLabels['en'], [currentLang]);
  const currentLabels = useMemo(() => {
    const overrides: Record<string, string> = {};
    if (businessNameLabel) overrides.businessName = businessNameLabel;
    if (businessTypeLabel) overrides.businessType = businessTypeLabel;
    if (yearsInBusinessLabel) overrides.yearsInBusiness = yearsInBusinessLabel;
    if (annualRevenueLabel) overrides.annualRevenue = annualRevenueLabel;
    if (numberOfLocationsLabel) overrides.numberOfLocations = numberOfLocationsLabel;
    if (websiteLabel) overrides.website = websiteLabel;
    if (contactNameLabel) overrides.contactName = contactNameLabel;
    if (emailLabel) overrides.email = emailLabel;
    if (phoneLabel) overrides.phone = phoneLabel;
    if (resaleCertificateLabel) overrides.resaleCertificate = resaleCertificateLabel;
    if (taxIdLabel) overrides.taxId = taxIdLabel;
    if (productCategoriesLabel) overrides.productCategories = productCategoriesLabel;
    if (estimatedVolumeLabel) overrides.estimatedVolume = estimatedVolumeLabel;
    if (hearAboutUsLabel) overrides.hearAboutUs = hearAboutUsLabel;
    if (additionalInfoFieldLabel) overrides.additionalInfoField = additionalInfoFieldLabel;
    if (businessInfoSectionLabel) overrides.businessInfo = businessInfoSectionLabel;
    if (contactInfoSectionLabel) overrides.contactInfo = contactInfoSectionLabel;
    if (credentialsSectionLabel) overrides.credentials = credentialsSectionLabel;
    if (productInterestSectionLabel) overrides.productInterest = productInterestSectionLabel;
    if (additionalInfoSectionLabel) overrides.additionalInfo = additionalInfoSectionLabel;
    return { ...baseLabels, ...overrides };
  }, [
    baseLabels,
    businessNameLabel, businessTypeLabel, yearsInBusinessLabel, annualRevenueLabel,
    numberOfLocationsLabel, websiteLabel, contactNameLabel, emailLabel, phoneLabel,
    resaleCertificateLabel, taxIdLabel, productCategoriesLabel, estimatedVolumeLabel,
    hearAboutUsLabel, additionalInfoFieldLabel, businessInfoSectionLabel,
    contactInfoSectionLabel, credentialsSectionLabel, productInterestSectionLabel,
    additionalInfoSectionLabel,
  ]);

  const currentValidation = useMemo(
    () => validationMessages[currentLang] || validationMessages['en'],
    [currentLang]
  );

  // ── Effective title ──────────────────────────────────────────────────────
  const effectiveTitle = displayName || currentLabels.formTitle;
  const effectiveSubmitLabel = submitButtonText || currentLabels.submitButton;

  // ── Inline style helpers ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    backgroundColor: inputBg,
    color: inputTextColor,
    borderColor: inputBorderColor,
    borderRadius: `${inputBorderRadius}px`,
    font: inputFont || undefined,
  };

  const labelStyle: React.CSSProperties = {
    color: labelColor,
    font: labelFont || undefined,
  };

  // The login email is what the member signs in with, so prefer it over contact emails.
  const getMemberEmail = (memberData: Member | null): string =>
    (memberData?.member?.loginEmail ||
      memberData?.contact?.emails?.find(email => email.primary)?.email ||
      '').trim();

  const getInitialFormData = (memberData: Member | null): FormData => {
    if (!memberData) {
      return {
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        businessType: '',
        yearsInBusiness: '',
        annualRevenue: '',
        numberOfLocations: '',
        resaleCertificate: '',
        taxId: '',
        website: '',
        hearAboutUs: '',
        interestedProducts: [],
        estimatedMonthlyVolume: '',
        additionalInfo: '',
      };
    }

    const fullName = [memberData.contact?.firstName, memberData.contact?.lastName]
      .filter(Boolean)
      .join(' ');

    const primaryEmail = getMemberEmail(memberData);

    const primaryPhone = memberData.contact?.phones?.find(phone => phone.primary)?.phone || '';

    const businessName = memberData.contact?.company || '';

    return {
      businessName,
      contactName: fullName,
      email: primaryEmail,
      phone: primaryPhone,
      businessType: '',
      yearsInBusiness: '',
      annualRevenue: '',
      numberOfLocations: '',
      resaleCertificate: '',
      taxId: '',
      website: '',
      hearAboutUs: '',
      interestedProducts: [],
      estimatedMonthlyVolume: '',
      additionalInfo: '',
    };
  };

  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    businessType: 'Retail Store',
    yearsInBusiness: '1-2 years',
    annualRevenue: '$100K - $500K',
    numberOfLocations: '1',
    resaleCertificate: '',
    taxId: '',
    website: '',
    hearAboutUs: 'Search Engine',
    interestedProducts: ['Hardware & Tools'],
    estimatedMonthlyVolume: '$5,000 - $10,000',
    additionalInfo: '',
  });

  const collectionName = "@wd-strategies/wholesale-appllication/application";
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(true);
  const [isApprovedMember, setIsApprovedMember] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  const toBool = (prop: string) => prop !== 'false';

  const cleanFormData = (data: FormData): Partial<FormData> => {
    const cleaned: Partial<FormData> = {};

    const isFilled = (value: any): boolean => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'number') return !isNaN(value) && value > 0;
      return value != null && value !== '';
    };

    Object.entries(data).forEach(([key, value]) => {
      if (isFilled(value)) {
        (cleaned as any)[key] = value;
      }
    });

    return cleaned;
  };

  const businessTypes = [
    'Retail Store', 'Online Retailer', 'Distributor', 'Reseller',
    'Restaurant/Food Service', 'Construction Company', 'Manufacturing', 'Other',
  ];

  const yearsOptions = [
    'Less than 1 year', '1-2 years', '3-5 years', '6-10 years',
    '11-20 years', 'More than 20 years',
  ];

  const revenueOptions = [
    'Under $100K', '$100K - $500K', '$500K - $1M',
    '$1M - $5M', '$5M - $10M', 'Over $10M',
  ];

  const productCategories = productCategoriesList
    .split('\n')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);

  const volumeOptions = [
    'Under $1,000', '$1,000 - $5,000', '$5,000 - $10,000',
    '$10,000 - $25,000', '$25,000 - $50,000', 'Over $50,000',
  ];

  const hearAboutOptions = hearAboutUsList
    .split('\n')
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0);

  const handleInputChange = (field: keyof FormData, value: string) => {
    // Uppercase the first letter, except for fields where casing matters
    if (!['email', 'website', 'phone'].includes(field)) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCheckboxChange = (category: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interestedProducts: checked
        ? [...prev.interestedProducts, category]
        : prev.interestedProducts.filter(item => item !== category),
    }));
  };

  const validateForm = (): boolean => {
    const errors = validateSiteForm(formData, { contactName: toBool(showContactName), email: toBool(showEmail), phone: toBool(showPhone) }, currentValidation);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveToWixCollection = (data: FormData, member: Member | null) => submitSiteApplication(data, normalizeMember(member));

  const handleSubmit = async () => {
    if (isLoading || isLoadingMember || submitError === currentLabels.submissionError) return;
    if (existingApplication) {
      const status = existingApplication.status || 'pending';
      if (status === 'approved') {
        setSubmitError(currentLabels.approvedError);
      } else if (status === 'pending') {
        setSubmitError(currentLabels.pendingError);
      } else if (status === 'rejected') {
        setSubmitError(currentLabels.rejectedError);
      } else {
        setSubmitError(currentLabels.existingError);
      }
      return;
    }

    // Applications must belong to a logged-in member so approval can find their contact.
    const memberEmail = getMemberEmail(memberData);
    if (!memberData?.member?._id || !memberEmail) {
      setSubmitError(currentValidation.loginRequired);
      return;
    }

    setSubmitError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await saveToWixCollection({ ...formData, email: memberEmail }, memberData);
      setIsSubmitted(true);
    } catch {
      setSubmitError(currentLabels.submissionError);
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingApplication = (member: Member | null) => findExistingApplication(normalizeMember(member));

  const fetchMember = async () => {
    try {
      setIsLoadingMember(true);
      // Arrives as JSON from /api/pricing, so dates are strings, matching the local Member shape.
      const member = normalizeMember(await getCurrentMember()) as Member | null;

      if (member) {
        setMemberData(member);
        const existingApp = await checkExistingApplication(member);
        if (existingApp) {
          setExistingApplication(existingApp);
          setIsApprovedMember(existingApp.status === 'approved');
        } else {
          setExistingApplication(null);
          setIsApprovedMember(false);
          const initialFormData = getInitialFormData(member);
          setFormData(initialFormData);
        }
      } else {
        setFormData(getInitialFormData(null));
        setExistingApplication(null);
        setIsApprovedMember(false);
      }
    } catch {
      setSubmitError(currentLabels.submissionError);
      setFormData(getInitialFormData(null));
      setIsApprovedMember(false);
    } finally {
      setIsLoadingMember(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, []);

  
  if (isSubmitted) {
    return (
      <div className={styles.root} style={{ backgroundColor: pageBg }}>
        <div className={styles.successMessage} style={{ backgroundColor: formBg, borderRadius: `${formBorderRadius}px`, color: successColor }}>
          <div className={styles.successIcon}>✅</div>
          <h2 style={{ color: titleColor, font: titleFont || undefined }}>{successTitle || currentLabels.successTitle}</h2>
          <p style={{ color: labelColor }}>{successMessage}</p>
        </div>
      </div>
    );
  }

  if (existingApplication && !isLoadingMember) {
    const status = existingApplication.status || 'pending';

    if (status === 'approved') {
      return (
        <div className={styles.root} style={{ backgroundColor: pageBg }}>
          <div className={styles.successMessage} style={{ backgroundColor: formBg, borderRadius: `${formBorderRadius}px` }}>
            <div className={styles.successIcon}>✅</div>
            <h2 style={{ color: titleColor, font: titleFont || undefined }}>{currentLabels.alreadyApprovedTitle}</h2>
            <p style={{ color: labelColor }}>{currentLabels.alreadyApprovedMsg}</p>
          </div>
        </div>
      );
    } else if (status === 'pending') {
      return (
        <div className={styles.root} style={{ backgroundColor: pageBg }}>
          <div className={styles.successMessage} style={{ backgroundColor: formBg, borderRadius: `${formBorderRadius}px` }}>
            <div className={styles.successIcon}>⏳</div>
            <h2 style={{ color: titleColor, font: titleFont || undefined }}>{currentLabels.pendingTitle}</h2>
            <p style={{ color: labelColor }}>{currentLabels.pendingMsg}</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9em', color: labelColor, opacity: 0.7 }}>
              {currentLabels.submittedOn} {new Date(existingApplication.submissionDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      );
    } else if (status === 'rejected') {
      return (
        <div className={styles.root} style={{ backgroundColor: pageBg }}>
          <div className={styles.successMessage} style={{ backgroundColor: formBg, borderRadius: `${formBorderRadius}px` }}>
            <div className={styles.successIcon}>❌</div>
            <h2 style={{ color: titleColor, font: titleFont || undefined }}>{currentLabels.rejectedTitle}</h2>
            <p style={{ color: labelColor }}>{currentLabels.rejectedMsg}</p>
          </div>
        </div>
      );
    }
  }

  const hasBusinessInfoFields = toBool(showBusinessName) || toBool(showBusinessType) ||
    toBool(showYearsInBusiness) || toBool(showAnnualRevenue) ||
    toBool(showNumberOfLocations) || toBool(showWebsite);

  const hasContactInfoFields = toBool(showContactName) || toBool(showEmail) || toBool(showPhone);
  const hasCredentialsFields = toBool(showResaleCertificate) || toBool(showTaxId);
  const hasProductInterestFields = toBool(showProductCategories) || toBool(showEstimatedVolume);
  const hasAdditionalInfoFields = toBool(showHearAboutUs) || toBool(showAdditionalInfo);

  return (
    <div className={styles.root} style={{ backgroundColor: pageBg }}>
      <h1
        className={styles.display_name}
        style={{ color: titleColor, font: titleFont || undefined }}
      >
        {effectiveTitle}
      </h1>
      <div className={styles.formContainer}>
        <div className={styles.form} style={{ backgroundColor: formBg, borderRadius: `${formBorderRadius}px` }}>

          {submitError && (
            <div className={styles.errorMessage} style={{ color: errorColor, borderColor: errorColor }}>
              <span className={styles.errorIcon}>❌</span>
              {submitError}
            </div>
          )}

          {hasBusinessInfoFields && (
            <div className={styles.section}>
              {toBool(showBusinessInfoHeader) && (
                <h2 style={{ color: titleColor, font: titleFont || undefined }}>
                  {currentLabels.businessInfo}
                </h2>
              )}
              <div className={styles.row}>
                {toBool(showBusinessName) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="businessName" style={labelStyle}>{currentLabels.businessName}</label>
                    <input
                      id="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className={styles.input}
                      placeholder={currentLabels.businessName}
                      style={inputStyle}
                    />
                  </div>
                )}
                {toBool(showBusinessType) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="businessType" style={labelStyle}>{currentLabels.businessType}</label>
                    <select
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
                      className={styles.select}
                      style={inputStyle}
                    >
                      <option value="">{currentLabels.selectBusinessType}</option>
                      {businessTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.row}>
                {toBool(showYearsInBusiness) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="yearsInBusiness" style={labelStyle}>{currentLabels.yearsInBusiness}</label>
                    <select
                      id="yearsInBusiness"
                      value={formData.yearsInBusiness}
                      onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                      className={styles.select}
                      style={inputStyle}
                    >
                      <option value="">{currentLabels.selectYears}</option>
                      {yearsOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
                {toBool(showAnnualRevenue) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="annualRevenue" style={labelStyle}>{currentLabels.annualRevenue}</label>
                    <select
                      id="annualRevenue"
                      value={formData.annualRevenue}
                      onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                      className={styles.select}
                      style={inputStyle}
                    >
                      <option value="">{currentLabels.selectRevenue}</option>
                      {revenueOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.row}>
                {toBool(showNumberOfLocations) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="numberOfLocations" style={labelStyle}>{currentLabels.numberOfLocations}</label>
                    <input
                      id="numberOfLocations"
                      type="number"
                      value={formData.numberOfLocations}
                      onChange={(e) => handleInputChange('numberOfLocations', e.target.value.replace(/^-+/, ''))}
                      onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={styles.input}
                      placeholder="e.g., 1"
                      min="1"
                      style={inputStyle}
                    />
                  </div>
                )}
                {toBool(showWebsite) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="website" style={labelStyle}>{currentLabels.website}</label>
                    <input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className={styles.input}
                      placeholder="https://yourwebsite.com"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {hasContactInfoFields && (
            <div className={styles.section}>
              {toBool(showContactInfoHeader) && (
                <h2 style={{ color: titleColor, font: titleFont || undefined }}>
                  {currentLabels.contactInfo}
                </h2>
              )}
              <div className={styles.row}>
                {toBool(showContactName) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="contactName" className={styles.required} style={labelStyle}>
                      {currentLabels.contactName}
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      className={`${styles.input} ${validationErrors.contactName ? styles.inputError : ''}`}
                      placeholder={currentLabels.contactName}
                      style={inputStyle}
                    />
                    {validationErrors.contactName && (
                      <div className={styles.errorText} style={{ color: errorColor }}>{validationErrors.contactName}</div>
                    )}
                  </div>
                )}
                {toBool(showEmail) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.required} style={labelStyle}>
                      {currentLabels.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={getMemberEmail(memberData)}
                      readOnly
                      aria-readonly="true"
                      className={`${styles.input} ${styles.inputReadOnly} ${validationErrors.email ? styles.inputError : ''}`}
                      placeholder={memberData?.member?._id ? '' : currentValidation.emailRequired}
                      style={inputStyle}
                    />
                    {validationErrors.email && (
                      <div className={styles.errorText} style={{ color: errorColor }}>{validationErrors.email}</div>
                    )}
                  </div>
                )}
              </div>

              {toBool(showPhone) && (
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.required} style={labelStyle}>
                      {currentLabels.phone}
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`${styles.input} ${validationErrors.phone ? styles.inputError : ''}`}
                      placeholder="(555) 123-4567"
                      style={inputStyle}
                    />
                    {validationErrors.phone && (
                      <div className={styles.errorText} style={{ color: errorColor }}>{validationErrors.phone}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasCredentialsFields && (
            <div className={styles.section}>
              {toBool(showCredentialsHeader) && (
                <h2 style={{ color: titleColor, font: titleFont || undefined }}>
                  {currentLabels.credentials}
                </h2>
              )}
              <div className={styles.row}>
                {toBool(showResaleCertificate) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="resaleCertificate" style={labelStyle}>{currentLabels.resaleCertificate}</label>
                    <input
                      id="resaleCertificate"
                      type="text"
                      value={formData.resaleCertificate}
                      onChange={(e) => handleInputChange('resaleCertificate', e.target.value)}
                      className={styles.input}
                      placeholder={currentLabels.resaleCertificate}
                      style={inputStyle}
                    />
                  </div>
                )}
                {toBool(showTaxId) && (
                  <div className={styles.formGroup}>
                    <label htmlFor="taxId" style={labelStyle}>{currentLabels.taxId}</label>
                    <input
                      id="taxId"
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className={styles.input}
                      placeholder="XX-XXXXXXX"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {hasProductInterestFields && (
            <div className={styles.section}>
              {toBool(showProductInterestHeader) && (
                <h2 style={{ color: titleColor, font: titleFont || undefined }}>
                  {currentLabels.productInterest}
                </h2>
              )}
              {toBool(showProductCategories) && (
                <div className={styles.formGroup}>
                  <label style={labelStyle}>{currentLabels.productCategories}</label>
                  <div className={styles.checkboxGroup}>
                    {productCategories.map(category => (
                      <label key={category} className={styles.checkboxLabel} style={labelStyle}>
                        <input
                          type="checkbox"
                          checked={formData.interestedProducts.includes(category)}
                          onChange={(e) => handleCheckboxChange(category, e.target.checked)}
                          className={styles.checkbox}
                          style={{ accentColor: buttonBg }}
                        />
                        <span className={styles.checkboxText}>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {toBool(showEstimatedVolume) && (
                <div className={styles.formGroup}>
                  <label htmlFor="estimatedMonthlyVolume" style={labelStyle}>{currentLabels.estimatedVolume}</label>
                  <select
                    id="estimatedMonthlyVolume"
                    value={formData.estimatedMonthlyVolume}
                    onChange={(e) => handleInputChange('estimatedMonthlyVolume', e.target.value)}
                    className={styles.select}
                    style={inputStyle}
                  >
                    <option value="">{currentLabels.selectVolume}</option>
                    {volumeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {hasAdditionalInfoFields && (
            <div className={styles.section}>
              {toBool(showAdditionalInfoHeader) && (
                <h2 style={{ color: titleColor, font: titleFont || undefined }}>
                  {currentLabels.additionalInfo}
                </h2>
              )}
              {toBool(showHearAboutUs) && (
                <div className={styles.formGroup}>
                  <label htmlFor="hearAboutUs" style={labelStyle}>{currentLabels.hearAboutUs}</label>
                  <select
                    id="hearAboutUs"
                    value={formData.hearAboutUs}
                    onChange={(e) => handleInputChange('hearAboutUs', e.target.value)}
                    className={styles.select}
                    style={inputStyle}
                  >
                    <option value="">{currentLabels.selectOption}</option>
                    {hearAboutOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
              {toBool(showAdditionalInfo) && (
                <div className={styles.formGroup}>
                  <label htmlFor="additionalInfo" style={labelStyle}>{currentLabels.additionalInfoField}</label>
                  <textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    className={styles.textarea}
                    rows={4}
                    placeholder={currentLabels.additionalInfoField}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          )}

          <div className={styles.submitSection}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isLoadingMember || !!existingApplication}
              className={styles.submitButton}
              style={{
                backgroundColor: existingApplication || isLoading ? undefined : buttonBg,
                color: buttonTextColor,
                borderRadius: `${buttonBorderRadius}px`,
                font: buttonFont || undefined,
              }}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  {currentLabels.submitting}
                </>
              ) : existingApplication ? (
                existingApplication.status === 'approved'
                  ? currentLabels.alreadyApprovedBtn
                  : existingApplication.status === 'pending'
                    ? currentLabels.alreadySubmittedBtn
                    : currentLabels.alreadyExistsBtn
              ) : (
                effectiveSubmitLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Web component registration ───────────────────────────────────────────────

const customElement = reactToWebComponent(
  CustomElement,
  React,
  ReactDOMClient,
  {
    props: {
      displayName: 'string',
      language: 'string',
      benefitsText: 'string',
      showBusinessName: 'string',
      showBusinessType: 'string',
      showYearsInBusiness: 'string',
      showAnnualRevenue: 'string',
      showNumberOfLocations: 'string',
      showWebsite: 'string',
      showContactName: 'string',
      showEmail: 'string',
      showPhone: 'string',
      showResaleCertificate: 'string',
      showTaxId: 'string',
      showProductCategories: 'string',
      showEstimatedVolume: 'string',
      showHearAboutUs: 'string',
      showAdditionalInfo: 'string',
      submitButtonText: 'string',
      successMessage: 'string',
      successTitle: 'string',
      collectionName: 'string',
      productCategoriesList: 'string',
      // Style props
      pageBg: 'string',
      formBg: 'string',
      titleColor: 'string',
      labelColor: 'string',
      inputBg: 'string',
      inputBorderColor: 'string',
      inputTextColor: 'string',
      buttonBg: 'string',
      buttonTextColor: 'string',
      errorColor: 'string',
      successColor: 'string',
      inputBorderRadius: 'string',
      buttonBorderRadius: 'string',
      formBorderRadius: 'string',
      titleFont: 'string',
      labelFont: 'string',
      inputFont: 'string',
      buttonFont: 'string',
      // Label overrides
      businessNameLabel: 'string',
      businessTypeLabel: 'string',
      yearsInBusinessLabel: 'string',
      annualRevenueLabel: 'string',
      numberOfLocationsLabel: 'string',
      websiteLabel: 'string',
      contactNameLabel: 'string',
      emailLabel: 'string',
      phoneLabel: 'string',
      resaleCertificateLabel: 'string',
      taxIdLabel: 'string',
      productCategoriesLabel: 'string',
      estimatedVolumeLabel: 'string',
      hearAboutUsLabel: 'string',
      additionalInfoFieldLabel: 'string',
      businessInfoSectionLabel: 'string',
      contactInfoSectionLabel: 'string',
      credentialsSectionLabel: 'string',
      productInterestSectionLabel: 'string',
      additionalInfoSectionLabel: 'string',
      showBusinessInfoHeader: 'string',
      showContactInfoHeader: 'string',
      showCredentialsHeader: 'string',
      showProductInterestHeader: 'string',
      showAdditionalInfoHeader: 'string',
      hearAboutUsList: 'string',
    },
  }
);

export default customElement;
