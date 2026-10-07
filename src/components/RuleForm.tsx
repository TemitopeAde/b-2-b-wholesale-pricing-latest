import React, { type FC, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Box,
  Heading,
  Text,
  Button,
  Loader,
  Input,
  FormField,
  Dropdown,
  MultiSelect,
  ToggleSwitch,
  Checkbox,
  Notification,
  Notice,
  Divider,
  Modal,
  Tabs,
} from './ui';
import { DashIcons } from './Dashboard/icons';
import rf from './RuleForm.module.css';
import { processBulkCsvData } from '../backend/pricing.client';
import { dashboard } from '@wix/dashboard';
import { useAppInstance } from '../utils/appInstance';
import { currencySymbol, useSiteCurrency } from '../utils/currency';

interface RuleFormProps {
  mode: 'create' | 'edit';
  rule?: any;
  onClose: () => void;
  onSubmit: (newRule: any) => void;
  categories: any[];
  products: any[];
  accessGroups: any[];
  loadingCatalog: boolean;
  loadingAccessGroups: boolean;
  isFree?: boolean;
  pricingRulesCount?: number;
  moqRulesCount?: number;
  shippingRulesCount?: number;
  b2cShippingRulesCount?: number;
}

interface FormData {
  name: string;
  type: 'global' | 'category' | 'product' | 'bulk_csv';
  discountType: 'percentage' | 'fixed' | undefined;
  discountValue: number | undefined;
  minimumOrder: number | undefined;
  maximumOrder: number | undefined;
  minQuantity: number | undefined;
  maxQuantity: number | undefined;
  targetId: string;
  targetIds: string[]; // For products (optional, for future)
  categoryIds: string[]; // For categories
  targetName: string;
  accessGroups: string[];
  isActive: boolean;
  ruleCategory: 'pricing' | 'moq' | 'shipping';
  startDate: Date | null;
  endDate: Date | null;
  moqMinQuantity: number | undefined;
  casePackSize: number | undefined;
  enforceMultiples: boolean;
  moqType: 'minimum_units' | 'case_pack' | 'both';
  shippingType: 'free_shipping' | 'flat_rate' | 'threshold';
  shippingRate: number | undefined;
  freeShippingThreshold: number | undefined;
  b2cOnly: boolean;
  belowMinimumShippingRate: number | undefined;
  bulkCsvItems: any[];
}

export const RuleForm: FC<RuleFormProps> = ({
  mode,
  rule,
  onClose,
  onSubmit,
  categories,
  products,
  accessGroups,
  loadingCatalog,
  loadingAccessGroups,
  isFree = false,
  pricingRulesCount = 0,
  moqRulesCount = 0,
  shippingRulesCount = 0,
  b2cShippingRulesCount = 0,
}) => {
  const [formData, setFormData] = useState<FormData>(() => {
    let initialAccessGroups = rule?.accessGroups || [];
    
    // Only infer from memberIds if initialAccessGroups is empty
    if (initialAccessGroups.length === 0 && rule?.memberIds && rule.memberIds.length > 0 && rule?.ruleCategory === 'pricing') {
      initialAccessGroups = accessGroups
        .filter(group => group.members.length > 0 && group.members.every((m: any) => rule.memberIds.includes(m.id)))
        .map((g: any) => g.id);
    }

    const initialData = {
      name: rule?.name || '',
      type: rule?.ruleCategory === 'moq' ? 'global' : (rule?.type || 'global'),
      discountType: rule?.discountType || undefined,
      discountValue: rule?.discountValue !== undefined && rule?.discountValue !== null
        ? (typeof rule.discountValue === 'string' ? parseFloat(rule.discountValue) || rule.discountValue : rule.discountValue)
        : undefined,
      minimumOrder: rule?.minimumOrder || undefined,
      maximumOrder: rule?.maximumOrder || undefined,
      minQuantity: rule?.minQuantity || undefined,
      maxQuantity: rule?.maxQuantity || undefined,
      targetId: rule?.ruleCategory === 'moq' ? '' : (rule?.targetId || ''),
      targetIds: rule?.targetProducts || [],
      categoryIds: rule?.targetCategories || (rule?.type === 'category' && rule?.targetId ? [rule.targetId] : []),
      targetName: rule?.ruleCategory === 'moq' ? '' : (rule?.targetName || ''),
      accessGroups: initialAccessGroups,
      isActive: rule?.isActive !== false,
      ruleCategory: rule?.ruleCategory || 'pricing',
      startDate: rule?.startDate ? new Date(rule.startDate) : null,
      endDate: rule?.endDate ? new Date(rule.endDate) : null,
      moqMinQuantity: rule?.moqMinQuantity || rule?.minQuantity || undefined,
      casePackSize: rule?.casePackSize || undefined,
      enforceMultiples: rule?.enforceMultiples || false,
      moqType: rule?.moqType || 'minimum_units',
      shippingType: rule?.shippingType || 'free_shipping',
      shippingRate: rule?.shippingRate || undefined,
      freeShippingThreshold: rule?.freeShippingThreshold || undefined,
      b2cOnly: rule?.b2cOnly ?? false,
      belowMinimumShippingRate: rule?.belowMinimumShippingRate || undefined,
      bulkCsvItems: rule?.bulkCsvItems || [],
    };

    return initialData;
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { appInstance, isLoading: isInstanceLoading, error: instanceError, retry: retryInstance } = useAppInstance();
  const { currency } = useSiteCurrency();
  const symbol = currencySymbol(currency);
  const money = (label: string) => (symbol ? `${label} (${symbol})` : label);
  const moneyAffix = symbol ? <Box verticalAlign="middle"><Text size="small">{symbol}</Text></Box> : undefined;
  const packageName = appInstance?.instance?.billing?.packageName || '';
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvProgress, setCsvProgress] = useState('');
  const [csvProcessed, setCsvProcessed] = useState(false);
  const [csvMode, setCsvMode] = useState<'sku' | 'productId'>('sku');


  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Rule name is required');
    }

    // Free tier validation - only for create mode
    if (mode === 'create' && isFree) {
      if (formData.ruleCategory === 'pricing' && pricingRulesCount >= 1) {
        newErrors.push('Free plan allows only 1 Pricing Rule. Upgrade to create more.');
      }
      if (formData.ruleCategory === 'moq' && moqRulesCount >= 1) {
        newErrors.push('Free plan allows only 1 MOQ Rule. Upgrade to create more.');
      }
      if (formData.ruleCategory === 'shipping' && shippingRulesCount >= 1) {
        newErrors.push('Free plan allows only 1 Shipping Rule. Upgrade to create more.');
      }
    }

    // Validation for pricing rules
    if (formData.ruleCategory === 'pricing' && formData.type !== 'bulk_csv') {
      if (!formData.discountType) {
        newErrors.push('Discount type is required');
      }
      if (!formData.discountValue || formData.discountValue <= 0) {
        newErrors.push('Discount value must be greater than 0');
      } else {
        if (formData.discountType === 'percentage' && formData.discountValue > 100) {
          newErrors.push('Percentage cannot exceed 100%');
        }

        if (formData.discountType === 'percentage' && formData.discountValue < 0.1) {
          newErrors.push('Percentage must be at least 0.1%');
        }
      }
    }

    // Validation for MOQ rules
    if (formData.ruleCategory === 'moq') {
      if (formData.moqType === 'minimum_units' || formData.moqType === 'both') {
        if (!formData.moqMinQuantity || formData.moqMinQuantity <= 0) {
          newErrors.push('Minimum quantity is required for minimum units MOQ');
        }
      }

      if (formData.moqType === 'case_pack' || formData.moqType === 'both') {
        if (!formData.casePackSize || formData.casePackSize <= 0) {
          newErrors.push('Case pack size is required for case pack MOQ');
        }
      }
    }

    // Validation for Shipping rules
    if (formData.ruleCategory === 'shipping') {
      if (formData.shippingType === 'flat_rate') {
        if (!formData.shippingRate || formData.shippingRate < 0) {
          newErrors.push('Shipping rate is required for flat rate shipping');
        }
      }
      if (formData.shippingType === 'threshold') {
        if (!formData.freeShippingThreshold || formData.freeShippingThreshold <= 0) {
          newErrors.push('Minimum order value is required for threshold-based free shipping');
        }
      }
    }

    if (formData.ruleCategory === 'shipping' && formData.b2cOnly && b2cShippingRulesCount >= 1) {
      newErrors.push('A B2C shipping rule already exists. Delete the existing one before creating another.');
    }

    // No numeric field may be negative
    const numericFields: Array<[number | undefined, string]> = [
      [formData.discountValue, 'Discount value'],
      [formData.moqMinQuantity, 'Minimum units per order'],
      [formData.casePackSize, 'Case pack size'],
      [formData.shippingRate, 'Shipping rate'],
      [formData.freeShippingThreshold, 'Free shipping threshold'],
      [formData.belowMinimumShippingRate, 'Shipping rate if below minimum'],
      [formData.minimumOrder, 'Minimum order value'],
      [formData.maximumOrder, 'Maximum order value'],
      [formData.minQuantity, 'Minimum quantity'],
      [formData.maxQuantity, 'Maximum quantity'],
    ];
    numericFields.forEach(([value, label]) => {
      if (typeof value === 'number' && value < 0) newErrors.push(`${label} cannot be negative`);
    });

    // Order value validation
    if (formData.minimumOrder && formData.maximumOrder) {
      if (formData.maximumOrder <= formData.minimumOrder) {
        newErrors.push('Maximum order value must be greater than minimum order value');
      }
    }

    // Quantity validation
    if (formData.minQuantity && formData.maxQuantity) {
      if (formData.maxQuantity <= formData.minQuantity) {
        newErrors.push('Maximum quantity must be greater than minimum quantity');
      }
    }

    if (formData.type === 'category' && formData.categoryIds.length === 0) {
      newErrors.push('Please select at least one category');
    }

    if (formData.type === 'product' && !formData.targetId) {
      newErrors.push('Please select a product');
    }

    if (formData.type === 'bulk_csv' && (!formData.bulkCsvItems || formData.bulkCsvItems.length === 0)) {
      newErrors.push('Please upload and process a valid CSV file before saving.');
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      if (formData.endDate <= formData.startDate) {
        newErrors.push('End date must be after start date');
      }
    }

    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // compare at day level — today is valid
      if (formData.startDate < today) {
        newErrors.push('Start date cannot be in the past');
      }
    }

    // Access group validation (skipped for all shipping rules)
    const skipAccessGroupValidation = formData.ruleCategory === 'shipping';
    if (!skipAccessGroupValidation && accessGroups.length === 0) {
      newErrors.push('No access groups exist. Please create an access group with members before creating a discount rule.');
    } else if (!skipAccessGroupValidation && formData.accessGroups.length === 0) {
      newErrors.push('Please select at least one access group. Discount rules must be assigned to a specific customer group.');
    } else if (!skipAccessGroupValidation) {
      const emptyGroups = formData.accessGroups
        .map(id => accessGroups.find((g: any) => g.id === id))
        .filter((g: any) => g && (!g.members || g.members.length === 0))
        .map((g: any) => g.name || '(Unnamed Group)');

      if (emptyGroups.length > 0) {
        newErrors.push(`The following selected access group(s) have no members: ${emptyGroups.join(', ')}. Please add members to the group(s) before assigning a rule.`);
      }
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      dashboard.showToast({ message: validationErrors[0], type: 'error', timeout: 'normal' });
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      // Convert dates to ISO-8601 strings
      const submitData = {
        ...formData,
        startDate: formData.startDate ? formData.startDate.toISOString() : undefined,
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
      };

      await onSubmit(submitData);
    } catch {
      setErrors(['Failed to save rule. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: 'global' | 'category' | 'product' | 'bulk_csv') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      targetId: '',
      categoryIds: [],
      targetIds: [],
      targetName: ''
    }));
    if (newType !== 'bulk_csv') {
      setCsvFile(null);
      setCsvProcessed(false);
      setCsvMode('sku');
      setFormData(prev => ({ ...prev, bulkCsvItems: [] }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode?: 'sku' | 'productId') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const activeMode = mode ?? csvMode;

    setCsvFile(file);
    setIsProcessingCsv(true);
    setErrors([]);
    setWarnings([]);
    setCsvProgress('');
    setCsvProcessed(false);

    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

      if (activeMode === 'productId') {
        // --- Product ID mode: productId,quantity,price (no backend lookup needed) ---
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const parsedData: any[] = [];
        const invalidProductIds: string[] = [];
        const invalidPriceRows: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 3 && parts[0]) {
            const rawId = parts[0];
            const parsedPrice = parseFloat(parts[2].trim().replace(/^[^\d.]+/, ''));
            const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;

            if (!UUID_REGEX.test(rawId)) {
              invalidProductIds.push(rawId);
            } else if (!validPrice) {
              invalidPriceRows.push(`${rawId} (price: "${parts[2]}")`);
            } else {
              parsedData.push({
                productId: rawId,
                sku: rawId,
                quantity: parseInt(parts[1], 10) || 1,
                price: parsedPrice
              });
            }
          }
        }

        // Reject if any invalid UUIDs found
        if (invalidProductIds.length > 0) {
          const examples = invalidProductIds.slice(0, 3).join(', ');
          const moreText = invalidProductIds.length > 3 ? ` and ${invalidProductIds.length - 3} more` : '';
          const msg = `Invalid Product ID${invalidProductIds.length > 1 ? 's' : ''} (must be UUID format): ${examples}${moreText}`;
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        // Reject if any invalid prices found
        if (invalidPriceRows.length > 0) {
          const examples = invalidPriceRows.slice(0, 3).join('; ');
          const moreText = invalidPriceRows.length > 3 ? ` and ${invalidPriceRows.length - 3} more` : '';
          const msg = `Invalid price value${invalidPriceRows.length > 1 ? 's' : ''} — must be a number greater than 0: ${examples}${moreText}`;
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        if (parsedData.length === 0) {
          const msg = 'No valid data found in CSV. Expected columns: productId, quantity, price';
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        setCsvProcessed(true);
        setFormData(prev => ({ ...prev, bulkCsvItems: parsedData }));
        dashboard.showToast({ message: `CSV processed: ${parsedData.length} items ready. Click Save Rule to apply.`, type: 'success' });
      } else {
        // --- SKU mode: sku,quantity,price (resolves productId via backend) ---
        const parsedData: any[] = [];
        const invalidPriceRows: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 3 && parts[0]) {
            const parsedPrice = parseFloat(parts[2].trim().replace(/^[^\d.]+/, ''));
            const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;
            if (!validPrice) {
              invalidPriceRows.push(`SKU "${parts[0]}" (price: "${parts[2]}")`);
            } else {
              parsedData.push({
                sku: parts[0],
                quantity: parseInt(parts[1], 10) || 1,
                price: parsedPrice
              });
            }
          }
        }

        // Reject if any invalid prices found
        if (invalidPriceRows.length > 0) {
          const examples = invalidPriceRows.slice(0, 3).join('; ');
          const moreText = invalidPriceRows.length > 3 ? ` and ${invalidPriceRows.length - 3} more` : '';
          const msg = `Invalid price value${invalidPriceRows.length > 1 ? 's' : ''} — must be a number greater than 0: ${examples}${moreText}`;
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        if (parsedData.length === 0) {
          const msg = 'No valid data found in CSV. Expected: sku, quantity, price';
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        const BATCH_SIZE = 10;
        const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);
        const allValidItems: any[] = [];
        const allUnfoundSkus: string[] = [];

        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const batch = parsedData.slice(i, i + BATCH_SIZE);
          const result = await processBulkCsvData(batch);
          if (result.success) {
            allValidItems.push(...result.items);
            allUnfoundSkus.push(...(result.unfoundSkus || []));
          }
          setCsvProgress(`Processing SKUs... ${Math.round(batchNum / totalBatches * 100)}%`);
        }

        if (allValidItems.length === 0) {
          const unfound = allUnfoundSkus.slice(0, 5).join(', ') || 'unknown';
          const msg = `None of the SKUs were found in the catalog. Check your SKUs and try again. Examples not found: ${unfound}`;
          dashboard.showToast({ message: msg, type: 'error', timeout: 'normal' });
          throw new Error(msg);
        }

        if (allUnfoundSkus.length > 0) {
          const unfound = allUnfoundSkus.slice(0, 5).join(', ');
          const moreCount = allUnfoundSkus.length - 5;
          const moreText = moreCount > 0 ? ` and ${moreCount} more` : '';
          setWarnings([
            `${allUnfoundSkus.length} SKU(s) not found and were skipped: ${unfound}${moreText}. Proceeding with ${allValidItems.length} found SKU(s).`
          ]);
        }

        setCsvProcessed(true);
        setFormData(prev => ({ ...prev, bulkCsvItems: allValidItems }));
        dashboard.showToast({ message: `CSV processed: ${allValidItems.length} items ready. Click Save Rule to apply.`, type: 'success' });
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to process CSV']);
      setCsvProcessed(false);
      setFormData(prev => ({ ...prev, bulkCsvItems: [] }));
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#0058e6';
    e.currentTarget.style.backgroundColor = 'rgba(0, 88, 230, 0.05)';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, mode?: 'sku' | 'productId') => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.backgroundColor = 'transparent';

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      // Simulate an input event to reuse handleFileUpload logic
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileUpload(fakeEvent, mode ?? csvMode);
    } else {
      setErrors(['Please upload a valid .csv file']);
    }
  };

  const handleTargetChange = (targetId: string) => {
    let targetName = '';
    if (formData.type === 'category') {
      const category = categories.find(c => c.id === targetId);
      targetName = category?.name || '';
    } else if (formData.type === 'product') {
      const product = products.find(p => p._id === targetId);
      targetName = product?.name || '';
    }

    setFormData(prev => ({
      ...prev,
      targetId,
      targetName
    }));
  };

  const isMultiTarget =
    (formData.type === 'category' && formData.categoryIds.length > 1) ||
    (formData.type === 'product' && formData.targetIds.length > 1);

  useEffect(() => {
    if (isMultiTarget && formData.discountType !== 'percentage') {
      setFormData(prev => ({ ...prev, discountType: 'percentage' }));
    }
  }, [isMultiTarget]);

  const DateInput = React.forwardRef(({ value, onClick, placeholder, ...rest }: any, ref: any) => (
    <div onClick={onClick} style={{ width: '100%' }}>
      <Input
        {...rest}
        ref={ref}
        value={value}
        readOnly
        placeholder={placeholder}
        prefix={
          <Box color="94A3B8" verticalAlign="middle">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Box>
        }
      />
    </div>
  ));
  DateInput.displayName = 'DateInput';

  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={loading}
      size="large"
      closeOnOverlayClick={false}
      title={mode === 'create' ? 'New rule' : 'Edit rule'}
      subtitle="Set what the rule does, which products it covers and who gets it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={isInstanceLoading || !!instanceError}>
            {loading ? 'Saving…' : (mode === 'create' ? 'Create rule' : 'Save changes')}
          </Button>
        </>
      }
    >
        <Box direction="vertical" gap="24px" className={rf.form}>
          {instanceError && (
            <Notice
              tone="error"
              title="Plan information couldn't be loaded"
              action={<Button variant="secondary" size="small" onClick={retryInstance}>Retry</Button>}
            >
              Retry before saving this rule.
            </Notice>
          )}

          {/* Basic Information */}
          <Box direction="vertical" gap="small">
            <Heading appearance="H4" className={rf.sectionTitle}>Basic Information</Heading>
            <Box direction="vertical" gap="medium">
              <FormField label="Rule Name *" required>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, name: value }));
                  }}
                  placeholder="Enter a descriptive name for this rule"
                />
              </FormField>

              <FormField label="Rule Type *">
                <Box direction="vertical" gap="small">
                  <Dropdown
                    options={[
                      { id: 'pricing', value: 'Pricing — discounts' },
                      {
                        id: 'moq',
                        value: `MOQ — minimum order quantity${packageName === 'pro' ? ' (Business plan)' : ''}`,
                        disabled: packageName === 'pro'
                      },
                      { id: 'shipping', value: 'Shipping' }
                    ]}
                    selectedId={formData.ruleCategory}
                    onSelect={(option) => {
                      const value = option.id as 'pricing' | 'moq' | 'shipping';
                      if (value === 'moq' && packageName === 'pro') {
                        alert('Upgrade to Business or Enterprise plan to access MOQ rules');
                        return;
                      }

                      setFormData(prev => ({
                        ...prev,
                        ruleCategory: value,
                        type: (value === 'moq' || value === 'shipping') ? 'global' : prev.type,
                        targetId: (value === 'moq' || value === 'shipping') ? '' : prev.targetId,
                        targetName: (value === 'moq' || value === 'shipping') ? '' : prev.targetName,
                        discountValue: undefined,
                        minimumOrder: undefined,
                        maximumOrder: undefined,
                        minQuantity: undefined,
                        maxQuantity: undefined,
                        moqMinQuantity: undefined,
                        casePackSize: undefined,
                        moqType: 'minimum_units',
                        shippingType: 'free_shipping',
                        shippingRate: undefined,
                        freeShippingThreshold: undefined,
                        b2cOnly: false,
                      }));
                    }}
                    placeholder="Select rule type"
                  />
                  {packageName === 'pro' && (
                    <Text size="small" color="orange" weight="bold">
                      MOQ rules are available in Business and Enterprise plans only.
                    </Text>
                  )}
                  {mode === 'create' && isFree && (
                    <Notice tone="warning" title="Free plan limit">
                      <Text size="small">
                        {formData.ruleCategory === 'pricing' ? (
                          pricingRulesCount >= 1 ? (
                            <Text size="small" color="critical">You have reached the limit of 1 Pricing Rule. Upgrade to create more.</Text>
                          ) : (
                            <Text size="small">You can create {1 - pricingRulesCount} more Pricing Rule.</Text>
                          )
                        ) : formData.ruleCategory === 'moq' ? (
                          moqRulesCount >= 1 ? (
                            <Text size="small" color="critical">You have reached the limit of 1 MOQ Rule. Upgrade to create more.</Text>
                          ) : (
                            <Text size="small">You can create {1 - moqRulesCount} more MOQ Rule.</Text>
                          )
                        ) : (
                          shippingRulesCount >= 1 ? (
                            <Text size="small" color="critical">You have reached the limit of 1 Shipping Rule. Upgrade to create more.</Text>
                          ) : (
                            <Text size="small">You can create {1 - shippingRulesCount} more Shipping Rule.</Text>
                          )
                        )}
                      </Text>
                    </Notice>
                  )}
                </Box>
              </FormField>

              {formData.ruleCategory === 'moq' && (
                <FormField label="MOQ Type *" required>
                  <Dropdown
                    options={[
                      { id: 'minimum_units', value: 'Minimum Units per Order' },
                      { id: 'case_pack', value: 'Case Pack (Enforce Multiples)' },
                      { id: 'both', value: 'Both Minimum Units & Case Pack' }
                    ]}
                    selectedId={formData.moqType}
                    onSelect={(opt) => setFormData(prev => ({ ...prev, moqType: opt.id as any }))}
                  />
                </FormField>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Rule Scope */}
          <Box direction="vertical" gap="small">
            <Heading appearance="H4" className={rf.sectionTitle}>Rule Scope</Heading>
            {(formData.ruleCategory === 'moq' || formData.ruleCategory === 'shipping') ? (
              <Box direction="vertical" gap="tiny">
                <Text weight="bold">All products</Text>
                <Text secondary size="small">
                  {formData.ruleCategory === 'moq'
                    ? 'MOQ rules automatically apply to all products in your catalog.'
                    : 'Shipping rules apply globally to all orders.'}
                </Text>
              </Box>
            ) : (
              <Box direction="vertical" gap="medium">
                <FormField label="Apply To">
                  <Dropdown
                    options={[
                      { id: 'global', value: 'All products' },
                      { id: 'category', value: 'Specific collections' },
                      { id: 'product', value: 'Specific products' },
                      ...(mode === 'create' ? [{ id: 'bulk_csv', value: 'Bulk upload from CSV (fixed prices)' }] : [])
                    ]}
                    selectedId={formData.type}
                    onSelect={(opt) => handleTypeChange(opt.id as any)}
                  />
                </FormField>

                {formData.type === 'bulk_csv' && (
                  <Box direction="vertical" gap="small">
                    <Tabs
                      aria-label="CSV identifier"
                      activeId={csvMode}
                      items={[
                        { id: 'sku', title: 'Match by SKU' },
                        { id: 'productId', title: 'Match by product ID' },
                      ]}
                      onClick={(item) => {
                        const next = item.id as 'sku' | 'productId';
                        if (csvMode !== next) {
                          setCsvMode(next);
                          setCsvFile(null);
                          setCsvProcessed(false);
                          setFormData(prev => ({ ...prev, bulkCsvItems: [] }));
                        }
                      }}
                    />

                    <Notice tone="neutral">
                      {csvMode === 'sku'
                        ? "Use your product SKUs — we'll match them to products automatically."
                        : 'Use Wix product IDs directly. No lookup needed, so processing is faster.'}
                    </Notice>

                    {/* Drop zone */}
                    <FormField label={csvMode === 'sku' ? 'Upload CSV (sku, quantity, price) *' : 'Upload CSV (productId, quantity, price) *'}>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, csvMode)}
                        onClick={() => document.getElementById('csv-file-upload')?.click()}
                        style={{ cursor: 'pointer' }}
                      >
                        <Box className={rf.dropzone} direction="vertical" align="center" gap="6px">
                          <input
                            id="csv-file-upload"
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => handleFileUpload(e, csvMode)}
                            disabled={isProcessingCsv}
                            style={{ display: 'none' }}
                          />
                          <span className={rf.dropIcon}><DashIcons.Upload size={22} /></span>
                          <Text weight="bold">Click to upload or drag and drop</Text>
                          <Text size="small" secondary>
                            {csvMode === 'sku'
                              ? 'CSV with columns: sku, quantity, price'
                              : 'CSV with columns: productId, quantity, price'}
                          </Text>
                          <Button
                            size="small"
                            priority="secondary"
                            prefixIcon={<DashIcons.Download size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (csvMode === 'sku') {
                                const csvContent = "sku,quantity,price\nEXAMPLE-SKU1,10,4.99\nEXAMPLE-SKU2,5,12.50";
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'sample_sku_bulk_upload.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                              } else {
                                const csvContent = "productId,quantity,price\nyour-wix-product-id-here,10,4.99\nanother-product-id-here,5,12.50";
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'sample_productid_bulk_upload.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            style={{ marginTop: '8px' }}
                          >
                            Download sample CSV
                          </Button>
                        </Box>
                      </div>
                      {isProcessingCsv && (
                        <Box marginTop="small" verticalAlign="middle" gap="small">
                          <Loader size="tiny" />
                          <Text size="small" secondary>{csvProgress || (csvMode === 'sku' ? 'Processing SKUs...' : 'Processing Product IDs...')}</Text>
                        </Box>
                      )}
                      {csvProcessed && (
                        <Notice tone="success">
                          Processed {formData.bulkCsvItems.length} item{formData.bulkCsvItems.length !== 1 ? 's' : ''}.
                        </Notice>
                      )}
                    </FormField>
                  </Box>
                )}

                {formData.type !== 'global' && formData.type !== 'bulk_csv' && (
                  <FormField label={`Select ${formData.type === 'category' ? 'Categories' : 'Products'} *`}>
                    {loadingCatalog ? (
                      <Box verticalAlign="middle" gap="small">
                        <Loader size="tiny" />
                        <Text>Loading {formData.type}s...</Text>
                      </Box>
                    ) : formData.type === 'category' ? (
                      <MultiSelect
                        options={categories
                          .filter(c => !formData.categoryIds.includes(c.id))
                          .map(c => ({ id: c.id, value: c.name }))
                        }
                        tags={formData.categoryIds.map(id => {
                          const cat = categories.find(c => c.id === id);
                          return { id, label: cat ? cat.name : id };
                        })}
                        onSelect={(opt: any) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            categoryIds: [...prev.categoryIds, opt.id as string] 
                          }));
                        }}
                        onRemoveTag={(id) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            categoryIds: prev.categoryIds.filter(cid => cid !== id) 
                          }));
                        }}
                        placeholder="Choose categories..."
                      />
                    ) : (
                      <MultiSelect
                        options={products
                          .filter(p => !formData.targetIds.includes(p._id))
                          .map(p => ({ id: p._id, value: p.name }))
                        }
                        tags={formData.targetIds.map(id => {
                          const product = products.find(p => p._id === id);
                          return { id, label: product ? product.name : id };
                        })}
                        onSelect={(opt: any) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            targetIds: [...prev.targetIds, opt.id as string],
                            targetId: opt.id as string, // Fallback for single product logic
                            targetName: opt.value as string
                          }));
                        }}
                        onRemoveTag={(id) => {
                          setFormData(prev => {
                            const newTargetIds = prev.targetIds.filter(pid => pid !== id);
                            return { 
                              ...prev, 
                              targetIds: newTargetIds,
                              targetId: newTargetIds.length > 0 ? newTargetIds[0] : '',
                              targetName: newTargetIds.length > 0 ? (products.find(p => p._id === newTargetIds[0])?.name || '') : ''
                            };
                          });
                        }}
                        placeholder="Choose products..."
                      />
                    )}
                  </FormField>
                )}
              </Box>
            )}
          </Box>

          <Divider />

          {/* Discount/MOQ/Shipping Configuration */}
          {formData.ruleCategory === 'pricing' && formData.type !== 'bulk_csv' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>Discount Configuration</Heading>
              <Box direction="vertical" gap="medium">
                <FormField label="Discount Type *">
                  <Dropdown
                    options={[
                      { id: 'percentage', value: 'Percentage (%)' },
                      ...(!isMultiTarget ? [{ id: 'fixed', value: 'Fixed Amount' }] : []),
                    ]}
                    selectedId={formData.discountType}
                    placeholder="Select discount type"
                    onSelect={(opt) => setFormData(prev => ({ ...prev, discountType: opt.id as any, discountValue: undefined }))}
                  />
                </FormField>
                {isMultiTarget && (
                  <Text size="tiny" secondary>
                    Fixed amount is not available when multiple {formData.type === 'category' ? 'categories' : 'products'} are selected. Percentage discount has been applied.
                  </Text>
                )}
                <FormField label={formData.discountType === 'percentage' ? 'Percentage (0.1 - 100)' : money('Amount') + ' *'}>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, discountValue: parseFloat(v) || undefined })); }}
                    placeholder={formData.discountType === 'percentage' ? 'e.g., 10' : 'e.g., 5.00'}
                    suffix={formData.discountType === 'percentage' ? <Box verticalAlign="middle"><Text size="small">%</Text></Box> : moneyAffix}
                  />
                </FormField>
              </Box>
            </Box>
          )}

          {formData.ruleCategory === 'moq' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>MOQ Configuration</Heading>
              <Text secondary size="small">Configure minimum order quantity requirements and case pack rules.</Text>
              <Box gap="medium" direction="vertical">
                <Box direction="vertical" gap="medium">
                  {(formData.moqType === 'minimum_units' || formData.moqType === 'both') && (
                    <FormField label="Minimum Units per Order *">
                      <Input
                        type="number"
                        value={formData.moqMinQuantity}
                        onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, moqMinQuantity: parseInt(v) || undefined })); }}
                        placeholder="e.g., 10"
                      />
                    </FormField>
                  )}
                  {(formData.moqType === 'case_pack' || formData.moqType === 'both') && (
                    <FormField label="Case Pack Size *">
                      <Input
                        type="number"
                        value={formData.casePackSize}
                        onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, casePackSize: parseInt(v) || undefined })); }}
                        placeholder="e.g., 6, 12"
                      />
                    </FormField>
                  )}
                </Box>
                {(formData.moqType === 'case_pack' || formData.moqType === 'both') && (
                  <Checkbox
                    checked={formData.enforceMultiples}
                    onChange={(e) => { const v = e.target.checked; setFormData(prev => ({ ...prev, enforceMultiples: v })); }}
                  >
                    Enforce multiples only (customers can only order in multiples of case pack size)
                  </Checkbox>
                )}
              </Box>
            </Box>
          )}

          {formData.ruleCategory === 'shipping' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>Shipping Configuration</Heading>
              <Box direction="vertical" gap="medium">
{formData.shippingType === 'flat_rate' && (
                  <FormField label={money('Shipping Rate') + ' *'}>
                    <Input
                      type="number"
                      value={formData.shippingRate}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, shippingRate: parseFloat(v) || 0 })); }}
                      prefix={moneyAffix}
                    />
                  </FormField>
                )}

                {formData.shippingType === 'threshold' && (
                  <FormField label={money('Free Shipping Threshold') + ' *'}>
                    <Box direction="vertical" gap="extraSmall">
                      <Input
                        type="number"
                        value={formData.freeShippingThreshold}
                        onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, freeShippingThreshold: parseFloat(v) || 0 })); }}
                        prefix={moneyAffix}
                      />
                      <Text size="tiny" secondary>Orders above this amount will qualify for free shipping.</Text>
                    </Box>
                  </FormField>
                )}

                <FormField label={money('Minimum Order Value')}>
                  <Box direction="vertical" gap="extraSmall">
                    <Input
                      type="number"
                      value={formData.minimumOrder ?? ''}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, minimumOrder: v === '' ? undefined : parseFloat(v), belowMinimumShippingRate: v === '' ? undefined : prev.belowMinimumShippingRate })); }}
                      prefix={moneyAffix}
                    />
                    <Text size="tiny" secondary>This shipping rule only applies to orders that meet this minimum order value.</Text>
                  </Box>
                </FormField>

                {formData.minimumOrder && (
                  <FormField label={money('Shipping Rate If Below Minimum')}>
                    <Box direction="vertical" gap="extraSmall">
                      <Input
                        type="number"
                        value={formData.belowMinimumShippingRate ?? ''}
                        onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, belowMinimumShippingRate: v === '' ? undefined : parseFloat(v) })); }}
                        prefix={moneyAffix}
                      />
                      <Text size="tiny" secondary>This rate will be applied to orders that do not meet the minimum order value.</Text>
                    </Box>
                  </FormField>
                )}

                <Checkbox
                  checked={formData.b2cOnly}
                  onChange={(e) => { const v = e.target.checked; setFormData(prev => ({ ...prev, b2cOnly: v })); }}
                >
                  B2C customers only
                </Checkbox>
                {formData.b2cOnly && b2cShippingRulesCount >= 1 && (
                  <Text size="tiny" skin="error">A B2C shipping rule already exists. Delete the existing one before creating another.</Text>
                )}
                {formData.b2cOnly && b2cShippingRulesCount === 0 && (
                  <Text size="tiny" secondary>This rule will only apply to retail (non-wholesale) customers.</Text>
                )}
              </Box>
            </Box>
          )}

          <Divider />

          {/* Order Requirements (Optional) */}
          {formData.ruleCategory === 'pricing' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>Order Requirements (Optional)</Heading>
              <Box gap="medium" direction="vertical">
                <Box direction="vertical" gap="medium">
                  <FormField label={money('Min Order Value')}>
                    <Input
                      type="number"
                      value={formData.minimumOrder}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, minimumOrder: parseFloat(v) || undefined })); }}
                      prefix={moneyAffix}
                    />
                  </FormField>
                  <FormField label={money('Max Order Value')}>
                    <Input
                      type="number"
                      value={formData.maximumOrder}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, maximumOrder: parseFloat(v) || undefined })); }}
                      prefix={moneyAffix}
                    />
                  </FormField>
                  <FormField label="Min Quantity">
                    <Input
                      type="number"
                      value={formData.minQuantity}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, minQuantity: parseInt(v) || undefined })); }}
                    />
                  </FormField>
                  <FormField label="Max Quantity">
                    <Input
                      type="number"
                      value={formData.maxQuantity}
                      onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, maxQuantity: parseInt(v) || undefined })); }}
                    />
                  </FormField>
                </Box>
              </Box>
            </Box>
          )}

          {/* Schedule */}
          {formData.ruleCategory === 'pricing' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>Schedule (Optional)</Heading>
              <Box direction="vertical" gap="medium">
                <FormField label="Start Date">
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date: Date | null) => setFormData(prev => ({ ...prev, startDate: date }))}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select start date"
                    minDate={new Date()}
                    isClearable
                    autoComplete="off"
                    customInput={<DateInput />}
                    wrapperClassName="full-width-datepicker"
                  />
                </FormField>
                <FormField label="End Date">
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(date: Date | null) => setFormData(prev => ({ ...prev, endDate: date }))}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select end date"
                    minDate={formData.startDate || new Date()}
                    isClearable
                    autoComplete="off"
                    customInput={<DateInput />}
                    wrapperClassName="full-width-datepicker"
                  />
                </FormField>
              </Box>
            </Box>
          )}

          {formData.ruleCategory !== 'shipping' && <Divider />}

          {/* Access Control */}
          {formData.ruleCategory !== 'shipping' && (
            <Box direction="vertical" gap="small">
              <Heading appearance="H4" className={rf.sectionTitle}>Access Control</Heading>
              <Text secondary size="small">Select which customer groups this rule applies to.</Text>
              {loadingAccessGroups ? (
                <Box verticalAlign="middle" gap="small">
                  <Loader size="tiny" />
                  <Text>Loading access groups...</Text>
                </Box>
              ) : accessGroups.length === 0 ? (
                <Notification theme="warning" type="sticky">
                  No access groups available. Create an access group first.
                </Notification>
              ) : (
                <Box direction="vertical" gap="extraSmall">
                  {accessGroups.map(group => {
                    const memberCount = group.members?.length ?? 0;
                    const hasNoMembers = memberCount === 0;
                    return (
                      <Checkbox
                        key={group.id}
                        checked={formData.accessGroups.includes(group.id)}
                        disabled={hasNoMembers}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setFormData(prev => ({ ...prev, accessGroups: [...prev.accessGroups, group.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, accessGroups: prev.accessGroups.filter(id => id !== group.id) }));
                          }
                        }}
                      >
                        <Box verticalAlign="middle" gap="tiny">
                          <Text weight={hasNoMembers ? 'normal' : 'bold'}>{group.name || '(Unnamed Group)'}</Text>
                          <Text size="tiny" secondary>({memberCount} member{memberCount !== 1 ? 's' : ''})</Text>
                          {hasNoMembers && <Text size="tiny" color="red">— no members</Text>}
                        </Box>
                      </Checkbox>
                    );
                  })}
                  {(() => {
                    if (formData.accessGroups.length === 0) return null;
                    const matchedGroups = formData.accessGroups.map(id => accessGroups.find((g: any) => g.id === id)).filter(Boolean);
                    const totalSelected = Array.from(new Set(matchedGroups.flatMap((g: any) => g.members?.map((m: any) => m.id) || []))).length;
                    const isLarge = totalSelected > 100;
                    return (
                      <Notice tone={isLarge ? 'warning' : 'info'}>
                        {isLarge
                          ? `${totalSelected} members selected. That's over the 100-member limit per rule, so the rule will be split into batches of 100 automatically.`
                          : `${totalSelected} member${totalSelected !== 1 ? 's' : ''} will get this rule.`}
                      </Notice>
                    );
                  })()}
                </Box>
              )}
            </Box>
          )}

          <Divider />

          {/* Active Status */}
          <Box direction="horizontal" gap="small" verticalAlign="middle">
            <ToggleSwitch
              checked={formData.isActive}
              onChange={(e) => { const v = e.target.checked; setFormData(prev => ({ ...prev, isActive: v })); }}
            />
            <Text weight="bold">Activate this rule immediately</Text>
          </Box>

          {/* Messages */}
          {warnings.length > 0 && (
            <Box direction="vertical" gap="tiny">
              {warnings.map((warning, index) => (
                <Notification key={index} theme="warning" type="sticky">
                  {warning}
                </Notification>
              ))}
            </Box>
          )}

          {errors.length > 0 && (
            <Box direction="vertical" gap="tiny">
              {errors.map((error, index) => (
                <Notification key={index} theme="error" type="sticky">
                  {error}
                </Notification>
              ))}
            </Box>
          )}
        </Box>

    </Modal>
  );
};
