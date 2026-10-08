import React, { type FC, useState, useEffect, useCallback, useRef } from 'react';
import { widget, inputs } from '@wix/editor';
import {
  SidePanel,
  Accordion,
  accordionItemBuilder,
  FormField,
  Input,
  InputArea,
  ToggleSwitch,
  Dropdown,
  ColorInput,
  NumberInput,
  Box,
  Text,
  Divider,
  TextButton,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const extractFontFamily = (fontString: string): string => {
  if (!fontString || typeof fontString !== 'string') return 'Select Font';
  const match = fontString.match(/"([^"]+)"\s*$/);
  if (match && match[1]) return match[1];
  return fontString || 'Select Font';
};

const LANGUAGE_OPTIONS = [
  { id: 'en', value: 'English' },
  { id: 'ar', value: 'العربية' },
  { id: 'zh', value: '中文' },
  { id: 'nl', value: 'Nederlands' },
  { id: 'fr', value: 'Français' },
  { id: 'de', value: 'Deutsch' },
  { id: 'it', value: 'Italiano' },
  { id: 'ja', value: '日本語' },
  { id: 'ko', value: '한국어' },
  { id: 'pl', value: 'Polski' },
  { id: 'pt', value: 'Português' },
  { id: 'ru', value: 'Русский' },
  { id: 'es', value: 'Español' },
  { id: 'tr', value: 'Türkçe' },
];

const Panel: FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [benefitsText, setBenefitsText] = useState('');
  const [productCategoriesList, setProductCategoriesList] = useState('');
  const [hearAboutUsList, setHearAboutUsList] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [language, setLanguage] = useState('en');

  // Section header toggles
  const [showBusinessInfoHeader, setShowBusinessInfoHeader] = useState(true);
  const [showContactInfoHeader, setShowContactInfoHeader] = useState(true);
  const [showCredentialsHeader, setShowCredentialsHeader] = useState(true);
  const [showProductInterestHeader, setShowProductInterestHeader] = useState(true);
  const [showAdditionalInfoHeader, setShowAdditionalInfoHeader] = useState(true);

  // Field toggles
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showBusinessType, setShowBusinessType] = useState(true);
  const [showYearsInBusiness, setShowYearsInBusiness] = useState(true);
  const [showAnnualRevenue, setShowAnnualRevenue] = useState(true);
  const [showNumberOfLocations, setShowNumberOfLocations] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  const [showContactName, setShowContactName] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showResaleCertificate, setShowResaleCertificate] = useState(true);
  const [showTaxId, setShowTaxId] = useState(true);
  const [showProductCategories, setShowProductCategories] = useState(true);
  const [showEstimatedVolume, setShowEstimatedVolume] = useState(true);
  const [showHearAboutUs, setShowHearAboutUs] = useState(true);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(true);

  // Style states
  const [pageBg, setPageBg] = useState('#f8f9fa');
  const [formBg, setFormBg] = useState('#ffffff');
  const [titleColor, setTitleColor] = useState('#333333');
  const [labelColor, setLabelColor] = useState('#333333');
  const [inputBg, setInputBg] = useState('#ffffff');
  const [inputBorderColor, setInputBorderColor] = useState('#e0e0e0');
  const [inputTextColor, setInputTextColor] = useState('#333333');
  const [buttonBg, setButtonBg] = useState('#4361ee');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');
  const [errorColor, setErrorColor] = useState('#dc3545');
  const [successColor, setSuccessColor] = useState('#28a745');
  const [inputBorderRadius, setInputBorderRadius] = useState(6);
  const [buttonBorderRadius, setButtonBorderRadius] = useState(8);
  const [formBorderRadius, setFormBorderRadius] = useState(12);
  const [titleFont, setTitleFont] = useState('');
  const [labelFont, setLabelFont] = useState('');
  const [inputFont, setInputFont] = useState('');
  const [buttonFont, setButtonFont] = useState('');

  // Label override states
  const [businessNameLabel, setBusinessNameLabel] = useState('');
  const [businessTypeLabel, setBusinessTypeLabel] = useState('');
  const [yearsInBusinessLabel, setYearsInBusinessLabel] = useState('');
  const [annualRevenueLabel, setAnnualRevenueLabel] = useState('');
  const [numberOfLocationsLabel, setNumberOfLocationsLabel] = useState('');
  const [websiteLabel, setWebsiteLabel] = useState('');
  const [contactNameLabel, setContactNameLabel] = useState('');
  const [emailLabel, setEmailLabel] = useState('');
  const [phoneLabel, setPhoneLabel] = useState('');
  const [resaleCertificateLabel, setResaleCertificateLabel] = useState('');
  const [taxIdLabel, setTaxIdLabel] = useState('');
  const [productCategoriesLabel, setProductCategoriesLabel] = useState('');
  const [estimatedVolumeLabel, setEstimatedVolumeLabel] = useState('');
  const [hearAboutUsLabel, setHearAboutUsLabel] = useState('');
  const [additionalInfoFieldLabel, setAdditionalInfoFieldLabel] = useState('');
  const [businessInfoSectionLabel, setBusinessInfoSectionLabel] = useState('');
  const [contactInfoSectionLabel, setContactInfoSectionLabel] = useState('');
  const [credentialsSectionLabel, setCredentialsSectionLabel] = useState('');
  const [productInterestSectionLabel, setProductInterestSectionLabel] = useState('');
  const [additionalInfoSectionLabel, setAdditionalInfoSectionLabel] = useState('');

  const debounceTimers = useRef<Record<string, number>>({});

  const debouncedSetProp = useCallback((propName: string, value: string, delay = 1500) => {
    if (debounceTimers.current[propName]) clearTimeout(debounceTimers.current[propName]);
    debounceTimers.current[propName] = window.setTimeout(() => {
      widget.setProp(propName, value);
      delete debounceTimers.current[propName];
    }, delay);
  }, []);

  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const fontsToPreload = [titleFont, labelFont, inputFont, buttonFont].filter(
      (f) => f && typeof f === 'string' && f.trim() !== '',
    );
    if (fontsToPreload.length > 0) {
      widget.setPreloadFonts(fontsToPreload);
    }
  }, [titleFont, labelFont, inputFont, buttonFont]);

  useEffect(() => {
    const loadProps = async () => {
      try {
        const props = await Promise.all([
          widget.getProp('display-name'),
          widget.getProp('benefits-text'),
          widget.getProp('show-business-name'),
          widget.getProp('show-business-type'),
          widget.getProp('show-years-in-business'),
          widget.getProp('show-annual-revenue'),
          widget.getProp('show-number-of-locations'),
          widget.getProp('show-website'),
          widget.getProp('show-contact-name'),
          widget.getProp('show-email'),
          widget.getProp('show-phone'),
          widget.getProp('show-resale-certificate'),
          widget.getProp('show-tax-id'),
          widget.getProp('show-product-categories'),
          widget.getProp('show-estimated-volume'),
          widget.getProp('show-hear-about-us'),
          widget.getProp('show-additional-info'),
          widget.getProp('submit-button-text'),
          widget.getProp('success-message'),
          widget.getProp('product-categories-list'),
          widget.getProp('language'),
          widget.getProp('page-bg'),
          widget.getProp('form-bg'),
          widget.getProp('title-color'),
          widget.getProp('label-color'),
          widget.getProp('input-bg'),
          widget.getProp('input-border-color'),
          widget.getProp('input-text-color'),
          widget.getProp('button-bg'),
          widget.getProp('button-text-color'),
          widget.getProp('error-color'),
          widget.getProp('success-color'),
          widget.getProp('input-border-radius'),
          widget.getProp('button-border-radius'),
          widget.getProp('form-border-radius'),
          widget.getProp('title-font'),
          widget.getProp('label-font'),
          widget.getProp('input-font'),
          widget.getProp('button-font'),
          widget.getProp('business-name-label'),
          widget.getProp('business-type-label'),
          widget.getProp('years-in-business-label'),
          widget.getProp('annual-revenue-label'),
          widget.getProp('number-of-locations-label'),
          widget.getProp('website-label'),
          widget.getProp('contact-name-label'),
          widget.getProp('email-label'),
          widget.getProp('phone-label'),
          widget.getProp('resale-certificate-label'),
          widget.getProp('tax-id-label'),
          widget.getProp('product-categories-label'),
          widget.getProp('estimated-volume-label'),
          widget.getProp('hear-about-us-label'),
          widget.getProp('additional-info-field-label'),
          widget.getProp('business-info-section-label'),
          widget.getProp('contact-info-section-label'),
          widget.getProp('credentials-section-label'),
          widget.getProp('product-interest-section-label'),
          widget.getProp('additional-info-section-label'),
          widget.getProp('show-business-info-header'),
          widget.getProp('show-contact-info-header'),
          widget.getProp('show-credentials-header'),
          widget.getProp('show-product-interest-header'),
          widget.getProp('show-additional-info-header'),
          widget.getProp('hear-about-us-list'),
          widget.getProp('success-title'),
        ]);

        setDisplayName(props[0] || 'Wholesale Partner Application');
        setBenefitsText(props[1] || 'Join our wholesale program and get access to exclusive pricing, bulk discounts, and priority support.');
        setShowBusinessName(props[2] !== 'false');
        setShowBusinessType(props[3] !== 'false');
        setShowYearsInBusiness(props[4] === 'true');
        setShowAnnualRevenue(props[5] === 'true');
        setShowNumberOfLocations(props[6] === 'true');
        setShowWebsite(props[7] === 'true');
        setShowContactName(props[8] !== 'false');
        setShowEmail(props[9] !== 'false');
        setShowPhone(props[10] !== 'false');
        setShowResaleCertificate(props[11] === 'true');
        setShowTaxId(props[12] === 'true');
        setShowProductCategories(props[13] === 'true');
        setShowEstimatedVolume(props[14] === 'true');
        setShowHearAboutUs(props[15] === 'true');
        setShowAdditionalInfo(props[16] === 'true');
        setSubmitButtonText(props[17] || 'Submit Application');
        setSuccessMessage(props[18] || 'Thank you for your interest in becoming a wholesale partner. Our team will review your application and contact you within 2-3 business days.');
        setProductCategoriesList(props[19] || 'Hardware & Tools\nBuilding Materials\nElectrical Supplies\nPlumbing Supplies\nSafety Equipment\nIndustrial Equipment\nOther');
        setLanguage(props[20] || 'en');
        setPageBg(props[21] || '#f8f9fa');
        setFormBg(props[22] || '#ffffff');
        setTitleColor(props[23] || '#333333');
        setLabelColor(props[24] || '#333333');
        setInputBg(props[25] || '#ffffff');
        setInputBorderColor(props[26] || '#e0e0e0');
        setInputTextColor(props[27] || '#333333');
        setButtonBg(props[28] || '#4361ee');
        setButtonTextColor(props[29] || '#ffffff');
        setErrorColor(props[30] || '#dc3545');
        setSuccessColor(props[31] || '#28a745');
        setInputBorderRadius(parseInt(props[32] || '6', 10));
        setButtonBorderRadius(parseInt(props[33] || '8', 10));
        setFormBorderRadius(parseInt(props[34] || '12', 10));
        setTitleFont(props[35] || '');
        setLabelFont(props[36] || '');
        setInputFont(props[37] || '');
        setButtonFont(props[38] || '');
        setBusinessNameLabel(props[39] || '');
        setBusinessTypeLabel(props[40] || '');
        setYearsInBusinessLabel(props[41] || '');
        setAnnualRevenueLabel(props[42] || '');
        setNumberOfLocationsLabel(props[43] || '');
        setWebsiteLabel(props[44] || '');
        setContactNameLabel(props[45] || '');
        setEmailLabel(props[46] || '');
        setPhoneLabel(props[47] || '');
        setResaleCertificateLabel(props[48] || '');
        setTaxIdLabel(props[49] || '');
        setProductCategoriesLabel(props[50] || '');
        setEstimatedVolumeLabel(props[51] || '');
        setHearAboutUsLabel(props[52] || '');
        setAdditionalInfoFieldLabel(props[53] || '');
        setBusinessInfoSectionLabel(props[54] || '');
        setContactInfoSectionLabel(props[55] || '');
        setCredentialsSectionLabel(props[56] || '');
        setProductInterestSectionLabel(props[57] || '');
        setAdditionalInfoSectionLabel(props[58] || '');
        setShowBusinessInfoHeader(props[59] !== 'false');
        setShowContactInfoHeader(props[60] !== 'false');
        setShowCredentialsHeader(props[61] !== 'false');
        setShowProductInterestHeader(props[62] !== 'false');
        setShowAdditionalInfoHeader(props[63] !== 'false');
        setHearAboutUsList(props[64] || 'Search Engine\nSocial Media\nReferral\nTrade Show\nIndustry Publication\nExisting Customer\nOther');
        setSuccessTitle(props[65] || '');
      } catch {
        // Ignore prop load error
      }
    };
    loadProps();
  }, []);

  const toggle = (propKey: string, setter: (v: boolean) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.checked);
      widget.setProp(propKey, e.target.checked.toString());
    };

  const onColor = (propKey: string, setter: (v: string) => void) =>
    (color: string | object) => {
      const value = typeof color === 'string' ? color : (color as any).hex ?? String(color);
      setter(value);
      debouncedSetProp(propKey, value, 500);
    };

  const onNumber = (propKey: string, setter: (v: number) => void) =>
    (value: number) => {
      setter(value);
      debouncedSetProp(propKey, value.toString(), 800);
    };

  const onText = (propKey: string, setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      debouncedSetProp(propKey, e.target.value);
    };

  // ── Reusable row for toggle fields ──────────────────────────────────────
  const ToggleRow = ({ label, checked, propKey, setter }: { label: string; checked: boolean; propKey: string; setter: (v: boolean) => void }) => (
    <Box align="space-between" verticalAlign="middle" paddingTop="SP1" paddingBottom="SP1">
      <Text size="small">{label}</Text>
      <ToggleSwitch size="small" checked={checked} onChange={toggle(propKey, setter)} />
    </Box>
  );

  // ── Accordion items ──────────────────────────────────────────────────────
  const fieldVisibilityContent = (
    <Box direction="vertical" paddingTop="SP2" paddingBottom="SP2" paddingLeft="SP1" paddingRight="SP1" gap="0">
      <Text size="tiny" weight="bold" secondary>Business Information</Text>
      <ToggleRow label="Section Header" checked={showBusinessInfoHeader} propKey="show-business-info-header" setter={setShowBusinessInfoHeader} />
      <ToggleRow label="Business Name" checked={showBusinessName} propKey="show-business-name" setter={setShowBusinessName} />
      <ToggleRow label="Business Type" checked={showBusinessType} propKey="show-business-type" setter={setShowBusinessType} />
      <ToggleRow label="Years in Business" checked={showYearsInBusiness} propKey="show-years-in-business" setter={setShowYearsInBusiness} />
      <ToggleRow label="Annual Revenue" checked={showAnnualRevenue} propKey="show-annual-revenue" setter={setShowAnnualRevenue} />
      <ToggleRow label="Number of Locations" checked={showNumberOfLocations} propKey="show-number-of-locations" setter={setShowNumberOfLocations} />
      <ToggleRow label="Website" checked={showWebsite} propKey="show-website" setter={setShowWebsite} />

      <Box paddingTop="SP3" paddingBottom="SP1"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Contact Information</Text>
      <ToggleRow label="Section Header" checked={showContactInfoHeader} propKey="show-contact-info-header" setter={setShowContactInfoHeader} />
      <ToggleRow label="Contact Name" checked={showContactName} propKey="show-contact-name" setter={setShowContactName} />
      <ToggleRow label="Email Address" checked={showEmail} propKey="show-email" setter={setShowEmail} />
      <ToggleRow label="Phone Number" checked={showPhone} propKey="show-phone" setter={setShowPhone} />

      <Box paddingTop="SP3" paddingBottom="SP1"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Business Credentials</Text>
      <ToggleRow label="Section Header" checked={showCredentialsHeader} propKey="show-credentials-header" setter={setShowCredentialsHeader} />
      <ToggleRow label="Resale Certificate" checked={showResaleCertificate} propKey="show-resale-certificate" setter={setShowResaleCertificate} />
      <ToggleRow label="Tax ID / EIN" checked={showTaxId} propKey="show-tax-id" setter={setShowTaxId} />

      <Box paddingTop="SP3" paddingBottom="SP1"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Product Interest</Text>
      <ToggleRow label="Section Header" checked={showProductInterestHeader} propKey="show-product-interest-header" setter={setShowProductInterestHeader} />
      <ToggleRow label="Product Categories" checked={showProductCategories} propKey="show-product-categories" setter={setShowProductCategories} />
      <ToggleRow label="Estimated Volume" checked={showEstimatedVolume} propKey="show-estimated-volume" setter={setShowEstimatedVolume} />

      <Box paddingTop="SP3" paddingBottom="SP1"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Additional Information</Text>
      <ToggleRow label="Section Header" checked={showAdditionalInfoHeader} propKey="show-additional-info-header" setter={setShowAdditionalInfoHeader} />
      <ToggleRow label="Hear About Us" checked={showHearAboutUs} propKey="show-hear-about-us" setter={setShowHearAboutUs} />
      <ToggleRow label="Additional Info Field" checked={showAdditionalInfo} propKey="show-additional-info" setter={setShowAdditionalInfo} />
    </Box>
  );

  const stylesContent = (
    <Box direction="vertical" paddingTop="SP2" paddingBottom="SP3" paddingLeft="SP1" paddingRight="SP1" gap="SP2">
      <Text size="tiny" weight="bold" secondary>Colors</Text>
      {([
        ['Page Background', pageBg, 'page-bg', setPageBg],
        ['Form Background', formBg, 'form-bg', setFormBg],
        ['Title Color', titleColor, 'title-color', setTitleColor],
        ['Label Color', labelColor, 'label-color', setLabelColor],
        ['Input Background', inputBg, 'input-bg', setInputBg],
        ['Input Border', inputBorderColor, 'input-border-color', setInputBorderColor],
        ['Input Text', inputTextColor, 'input-text-color', setInputTextColor],
        ['Button Background', buttonBg, 'button-bg', setButtonBg],
        ['Button Text', buttonTextColor, 'button-text-color', setButtonTextColor],
        ['Error Color', errorColor, 'error-color', setErrorColor],
        ['Success Color', successColor, 'success-color', setSuccessColor],
      ] as [string, string, string, (v: string) => void][]).map(([label, value, propKey, setter]) => (
        <Box key={propKey} align="space-between" verticalAlign="middle">
          <Text size="small">{label}</Text>
          <ColorInput value={value} onConfirm={onColor(propKey, setter)} popoverAppendTo="window" />
        </Box>
      ))}

      <Box paddingTop="SP2"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Border Radius</Text>
      <Box align="space-between" verticalAlign="middle">
        <Text size="small">Input (px)</Text>
        <Box width="80px"><NumberInput value={inputBorderRadius} onChange={onNumber('input-border-radius', setInputBorderRadius)} min={0} max={50} /></Box>
      </Box>
      <Box align="space-between" verticalAlign="middle">
        <Text size="small">Button (px)</Text>
        <Box width="80px"><NumberInput value={buttonBorderRadius} onChange={onNumber('button-border-radius', setButtonBorderRadius)} min={0} max={50} /></Box>
      </Box>
      <Box align="space-between" verticalAlign="middle">
        <Text size="small">Form (px)</Text>
        <Box width="80px"><NumberInput value={formBorderRadius} onChange={onNumber('form-border-radius', setFormBorderRadius)} min={0} max={50} /></Box>
      </Box>

      <Box paddingTop="SP2"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Font Families</Text>
      <FormField label="Title Font" labelPlacement="top">
        <TextButton
          onClick={() =>
            inputs.selectFont(
              { font: titleFont },
              {
                onChange: (value: any) => {
                  const newFont = value?.font ?? '';
                  setTitleFont(newFont);
                  widget.setProp('title-font', newFont);
                },
              },
            )
          }
        >
          {extractFontFamily(titleFont)}
        </TextButton>
      </FormField>
      <FormField label="Labels Font" labelPlacement="top">
        <TextButton
          onClick={() =>
            inputs.selectFont(
              { font: labelFont },
              {
                onChange: (value: any) => {
                  const newFont = value?.font ?? '';
                  setLabelFont(newFont);
                  widget.setProp('label-font', newFont);
                },
              },
            )
          }
        >
          {extractFontFamily(labelFont)}
        </TextButton>
      </FormField>
      <FormField label="Inputs Font" labelPlacement="top">
        <TextButton
          onClick={() =>
            inputs.selectFont(
              { font: inputFont },
              {
                onChange: (value: any) => {
                  const newFont = value?.font ?? '';
                  setInputFont(newFont);
                  widget.setProp('input-font', newFont);
                },
              },
            )
          }
        >
          {extractFontFamily(inputFont)}
        </TextButton>
      </FormField>
      <FormField label="Button Font" labelPlacement="top">
        <TextButton
          onClick={() =>
            inputs.selectFont(
              { font: buttonFont },
              {
                onChange: (value: any) => {
                  const newFont = value?.font ?? '';
                  setButtonFont(newFont);
                  widget.setProp('button-font', newFont);
                },
              },
            )
          }
        >
          {extractFontFamily(buttonFont)}
        </TextButton>
      </FormField>
    </Box>
  );

  const labelsContent = (
    <Box direction="vertical" paddingTop="SP2" paddingBottom="SP3" paddingLeft="SP1" paddingRight="SP1" gap="SP2">
      <Text size="tiny" secondary>Leave blank to use the default label for the selected language.</Text>

      <Text size="tiny" weight="bold" secondary>Section Headers</Text>
      {([
        ['Business Info', businessInfoSectionLabel, 'business-info-section-label', setBusinessInfoSectionLabel, 'Business Information'],
        ['Contact Info', contactInfoSectionLabel, 'contact-info-section-label', setContactInfoSectionLabel, 'Contact Information'],
        ['Credentials', credentialsSectionLabel, 'credentials-section-label', setCredentialsSectionLabel, 'Business Credentials'],
        ['Product Interest', productInterestSectionLabel, 'product-interest-section-label', setProductInterestSectionLabel, 'Product Interest'],
        ['Additional Info', additionalInfoSectionLabel, 'additional-info-section-label', setAdditionalInfoSectionLabel, 'Additional Information'],
      ] as [string, string, string, (v: string) => void, string][]).map(([label, value, propKey, setter, placeholder]) => (
        <FormField key={propKey} label={label}>
          <Input value={value} onChange={onText(propKey, setter)} placeholder={placeholder} />
        </FormField>
      ))}

      <Box paddingTop="SP2"><Divider /></Box>
      <Text size="tiny" weight="bold" secondary>Field Labels</Text>
      {([
        ['Business Name', businessNameLabel, 'business-name-label', setBusinessNameLabel, 'Business Name'],
        ['Business Type', businessTypeLabel, 'business-type-label', setBusinessTypeLabel, 'Business Type'],
        ['Years in Business', yearsInBusinessLabel, 'years-in-business-label', setYearsInBusinessLabel, 'Years in Business'],
        ['Annual Revenue', annualRevenueLabel, 'annual-revenue-label', setAnnualRevenueLabel, 'Annual Revenue'],
        ['No. of Locations', numberOfLocationsLabel, 'number-of-locations-label', setNumberOfLocationsLabel, 'Number of Locations'],
        ['Website', websiteLabel, 'website-label', setWebsiteLabel, 'Website'],
        ['Contact Name', contactNameLabel, 'contact-name-label', setContactNameLabel, 'Contact Name'],
        ['Email', emailLabel, 'email-label', setEmailLabel, 'Email Address'],
        ['Phone', phoneLabel, 'phone-label', setPhoneLabel, 'Phone Number'],
        ['Resale Certificate', resaleCertificateLabel, 'resale-certificate-label', setResaleCertificateLabel, 'Resale Certificate Number'],
        ['Tax ID', taxIdLabel, 'tax-id-label', setTaxIdLabel, 'Tax ID / EIN'],
        ['Product Categories', productCategoriesLabel, 'product-categories-label', setProductCategoriesLabel, 'Product Categories'],
        ['Estimated Volume', estimatedVolumeLabel, 'estimated-volume-label', setEstimatedVolumeLabel, 'Estimated Monthly Volume'],
        ['Hear About Us', hearAboutUsLabel, 'hear-about-us-label', setHearAboutUsLabel, 'How did you hear about us?'],
        ['Additional Info', additionalInfoFieldLabel, 'additional-info-field-label', setAdditionalInfoFieldLabel, 'Additional Information'],
      ] as [string, string, string, (v: string) => void, string][]).map(([label, value, propKey, setter, placeholder]) => (
        <FormField key={propKey} label={label}>
          <Input value={value} onChange={onText(propKey, setter)} placeholder={placeholder} />
        </FormField>
      ))}
    </Box>
  );

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
    <SidePanel width="100%">
      <SidePanel.Header title="Form Settings" />

      <SidePanel.Content noPadding>
        <Box direction="vertical" gap="0">

          {/* Language */}
          <SidePanel.Section title="Language">
            <Box paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="Form Language">
                <Dropdown
                  selectedId={language}
                  options={LANGUAGE_OPTIONS}
                  onSelect={(option) => {
                    setLanguage(option.id as string);
                    widget.setProp('language', option.id as string);
                  }}
                />
              </FormField>
            </Box>
          </SidePanel.Section>

          <SidePanel.Divider />

          {/* Form Title */}
          <SidePanel.Section title="Form Title">
            <Box paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="Title Text">
                <Input
                  value={displayName}
                  onChange={onText('display-name', setDisplayName)}
                  placeholder="Wholesale Partner Application"
                />
              </FormField>
            </Box>
          </SidePanel.Section>

          <SidePanel.Divider />

          {/* Collapsible sections via Accordion */}
          <Accordion
            multiple
            hideShadow
            skin="standard"
            items={[
              accordionItemBuilder({
                title: 'Field Visibility',
                initiallyOpen: false,
                children: fieldVisibilityContent,
              }),
              accordionItemBuilder({
                title: 'Form Styles',
                initiallyOpen: false,
                children: stylesContent,
              }),
              accordionItemBuilder({
                title: 'Field Labels',
                initiallyOpen: false,
                children: labelsContent,
              }),
            ]}
          />

          <SidePanel.Divider />

          {/* Product Categories */}
          <SidePanel.Section title="Product Categories">
            <Box paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="Categories (one per line)">
                <InputArea
                  value={productCategoriesList}
                  onChange={onText('product-categories-list', setProductCategoriesList)}
                  placeholder={'Hardware & Tools\nBuilding Materials\nElectrical Supplies'}
                  rows={6}
                />
              </FormField>
            </Box>
          </SidePanel.Section>

          <SidePanel.Divider />

          {/* Hear About Us Options */}
          <SidePanel.Section title="How Did You Hear About Us">
            <Box paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="Options (one per line)">
                <InputArea
                  value={hearAboutUsList}
                  onChange={onText('hear-about-us-list', setHearAboutUsList)}
                  placeholder={'Search Engine\nSocial Media\nReferral\nOther'}
                  rows={6}
                />
              </FormField>
            </Box>
          </SidePanel.Section>

          <SidePanel.Divider />

          {/* Form Behavior */}
          <SidePanel.Section title="Form Behavior">
            <Box direction="vertical" gap="SP3" paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="Submit Button Text">
                <Input
                  value={submitButtonText}
                  onChange={onText('submit-button-text', setSubmitButtonText)}
                  placeholder="Submit Application"
                />
              </FormField>
              <FormField label="Success Title">
                <Input
                  value={successTitle}
                  onChange={onText('success-title', setSuccessTitle)}
                  placeholder="Application Submitted Successfully!"
                />
              </FormField>
              <FormField label="Success Message">
                <InputArea
                  value={successMessage}
                  onChange={onText('success-message', setSuccessMessage)}
                  placeholder="Thank you for your interest..."
                  rows={4}
                />
              </FormField>
              <FormField label="Benefits Banner Text">
                <InputArea
                  value={benefitsText}
                  onChange={onText('benefits-text', setBenefitsText)}
                  placeholder="Join our wholesale program..."
                  rows={3}
                />
              </FormField>
            </Box>
          </SidePanel.Section>

        </Box>
      </SidePanel.Content>
    </SidePanel>
    </div>
  );
};

export default Panel;
