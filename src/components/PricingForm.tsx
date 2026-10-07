import React, { type FC, useState } from 'react';
import { type Category, LoaderSVG } from './Icons';
import styles from '../dashboard/pages/element.module.css';

interface DiscountRule {
  name: string;
  active: boolean;
  activeTimeInfo?: {
    start: string;
    end: string;
  };
  discounts: {
    values: Array<{
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FIXED_PRICE';
      targetType: 'SPECIFIC_ITEMS';
      percentage?: number;
      fixedAmount?: string;
      fixedPrice?: string;
      specificItemsInfo?: {
        scopes: Array<{
          _id: string;
          type: 'CATALOG_ITEM' | 'CUSTOM_FILTER';
        }>;
      };
    }>;
  };
  trigger?: {
    triggerType: 'AND' | 'SUBTOTAL_RANGE' | 'ITEM_QUANTITY_RANGE' | 'CUSTOM';
    accessGroupIds?: string[];
    minValue?: number;
    maxValue?: number;
  };
}

interface AccessGroup {
  id: string;
  name: string;
  description: string;
  discount: string;
  minOrder: string;
}

interface Product {
  _id: string;
  name: string;
  price: { price: number };
}

interface DiscountRuleFormProps {
  initialRule?: DiscountRule;
  onSubmit: (rule: DiscountRule) => void;
  onCancel: () => void;
  categories: Category[];
  products: Product[];
  accessGroups: AccessGroup[];
  loadingCatalog: boolean;
  loadingAccessGroups: boolean;
  isEditing?: boolean;
}

const DiscountRuleForm: FC<DiscountRuleFormProps> = ({
  initialRule,
  onSubmit,
  onCancel,
  categories,
  products,
  accessGroups,
  loadingCatalog,
  loadingAccessGroups,
  isEditing = false,
}) => {
  const [rule, setRule] = useState<DiscountRule>(
    initialRule || {
      name: '',
      active: true,
      activeTimeInfo: {
        start: '',
        end: '',
      },
      discounts: {
        values: [{
          discountType: 'PERCENTAGE',
          targetType: 'SPECIFIC_ITEMS',
          percentage: 0,
        }],
      },
      trigger: {
        triggerType: 'AND',
        accessGroupIds: [],
      },
    }
  );

  const handleSubmit = () => {
    onSubmit(rule);
  };

  const updateDiscountValue = (field: string, value: any) => {
    setRule(prev => ({
      ...prev,
      discounts: {
        values: [{
          ...prev.discounts.values[0],
          [field]: value,
        }],
      },
    }));
  };

  const AccessGroupsSelector = () => (
    <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
        Access Groups
      </label>
      {loadingAccessGroups ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#f9fafb'
        }}>
          <LoaderSVG />
          Loading access groups...
        </div>
      ) : accessGroups.length === 0 ? (
        <div style={{
          padding: '0.75rem',
          border: '1px solid #fbbf24',
          borderRadius: '4px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          fontSize: '0.875rem'
        }}>
          No access groups found. Create access groups first to assign them to pricing rules.
        </div>
      ) : (
        <div style={{
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          padding: '0.75rem',
          backgroundColor: 'white',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {accessGroups.map((group) => (
            <div key={group.id} style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={(rule.trigger?.accessGroupIds || []).includes(group.id)}
                  onChange={(e) => {
                    const currentIds = rule.trigger?.accessGroupIds || [];
                    const newIds = e.target.checked
                      ? [...currentIds, group.id]
                      : currentIds.filter(id => id !== group.id);
                    setRule(prev => ({
                      ...prev,
                      trigger: {
                        ...prev.trigger,
                        triggerType: prev.trigger?.triggerType || 'AND',
                        accessGroupIds: newIds,
                      },
                    }));
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <span style={{ fontWeight: '500', color: '#111827' }}>{group.name}</span>
                  <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    {group.discount} discount • {group.minOrder} min order
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      )}
      <p style={{
        margin: '0.5rem 0 0 0',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        Select which access groups this pricing rule applies to.
      </p>
    </div>
  );

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Edit Discount Rule' : 'Create New Discount Rule'}</h2>
          <button className={styles.modalClose} onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Rule Name
            </label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule(prev => ({ ...prev, name: e.target.value }))}
              className={styles.input}
              placeholder="e.g., Seasonal Discount"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.formGroup}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Discount Type
              </label>
              <select
                value={rule.discounts.values[0].discountType}
                onChange={(e) => {
                  const discountType = e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FIXED_PRICE';
                  setRule(prev => ({
                    ...prev,
                    discounts: {
                      values: [{
                        ...prev.discounts.values[0],
                        discountType,
                        percentage: discountType === 'PERCENTAGE' ? prev.discounts.values[0].percentage || 0 : undefined,
                        fixedAmount: discountType === 'FIXED_AMOUNT' ? prev.discounts.values[0].fixedAmount || '0' : undefined,
                        fixedPrice: discountType === 'FIXED_PRICE' ? prev.discounts.values[0].fixedPrice || '0' : undefined,
                      }],
                    },
                  }));
                }}
                className={styles.input}
              >
                <option value="PERCENTAGE">% Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
                <option value="FIXED_PRICE">$ Fixed Price</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Discount Value
              </label>
              <input
                type="number"
                value={
                  rule.discounts.values[0].discountType === 'PERCENTAGE'
                    ? rule.discounts.values[0].percentage || 0
                    : rule.discounts.values[0].discountType === 'FIXED_AMOUNT'
                    ? rule.discounts.values[0].fixedAmount || '0'
                    : rule.discounts.values[0].fixedPrice || '0'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (rule.discounts.values[0].discountType === 'PERCENTAGE') {
                    updateDiscountValue('percentage', Number(value));
                  } else if (rule.discounts.values[0].discountType === 'FIXED_AMOUNT') {
                    updateDiscountValue('fixedAmount', value);
                  } else {
                    updateDiscountValue('fixedPrice', value);
                  }
                }}
                className={styles.input}
                placeholder={rule.discounts.values[0].discountType === 'PERCENTAGE' ? '15' : '100'}
                min="0"
                step={rule.discounts.values[0].discountType === 'PERCENTAGE' ? '0.1' : '1'}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Target Items
            </label>
            {loadingCatalog ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#f9fafb'
              }}>
                <LoaderSVG />
                Loading items...
              </div>
            ) : (
              <select
                value={rule.discounts.values[0].specificItemsInfo?.scopes[0]?._id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedItem = [...categories, ...products].find(item => item.id === selectedId || item._id === selectedId);
                  setRule(prev => ({
                    ...prev,
                    discounts: {
                      values: [{
                        ...prev.discounts.values[0],
                        specificItemsInfo: {
                          scopes: [{
                            _id: selectedId,
                            type: categories.some(c => c.id === selectedId) ? 'CATALOG_ITEM' : 'CUSTOM_FILTER',
                          }],
                        },
                      }],
                    },
                  }));
                }}
                className={styles.input}
              >
                <option value="">Select items...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    Category: {category.name}
                  </option>
                ))}
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    Product: {product.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <AccessGroupsSelector />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.formGroup}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Start Date
              </label>
              <input
                type="datetime-local"
                value={rule.activeTimeInfo?.start ? new Date(rule.activeTimeInfo.start).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const startValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                  setRule(prev => ({
                    ...prev,
                    activeTimeInfo: {
                      start: startValue,
                      end: prev.activeTimeInfo?.end || '',
                    },
                  }));
                }}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                End Date
              </label>
              <input
                type="datetime-local"
                value={rule.activeTimeInfo?.end ? new Date(rule.activeTimeInfo.end).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const endValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                  setRule(prev => ({
                    ...prev,
                    activeTimeInfo: {
                      start: prev.activeTimeInfo?.start || '',
                      end: endValue,
                    },
                  }));
                }}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Trigger Type
            </label>
            <select
              value={rule.trigger?.triggerType || 'AND'}
              onChange={(e) => {
                const triggerType = e.target.value as 'AND' | 'SUBTOTAL_RANGE' | 'ITEM_QUANTITY_RANGE' | 'CUSTOM';
                setRule(prev => ({
                  ...prev,
                  trigger: {
                    ...prev.trigger,
                    triggerType,
                    accessGroupIds: prev.trigger?.accessGroupIds || [],
                  },
                }));
              }}
              className={styles.input}
            >
              <option value="AND">AND</option>
              <option value="SUBTOTAL_RANGE">Subtotal Range</option>
              <option value="ITEM_QUANTITY_RANGE">Item Quantity Range</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {(rule.trigger?.triggerType === 'SUBTOTAL_RANGE' || rule.trigger?.triggerType === 'ITEM_QUANTITY_RANGE') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {rule.trigger.triggerType === 'SUBTOTAL_RANGE' ? 'Min Subtotal' : 'Min Quantity'}
                </label>
                <input
                  type="number"
                  value={rule.trigger?.minValue || 0}
                  onChange={(e) => {
                    setRule(prev => ({
                      ...prev,
                      trigger: {
                        ...prev.trigger,
                        minValue: Number(e.target.value),
                      },
                    }));
                  }}
                  className={styles.input}
                  min="0"
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {rule.trigger.triggerType === 'SUBTOTAL_RANGE' ? 'Max Subtotal' : 'Max Quantity'}
                </label>
                <input
                  type="number"
                  value={rule.trigger?.maxValue || ''}
                  onChange={(e) => {
                    setRule(prev => ({
                      ...prev,
                      trigger: {
                        ...prev.trigger,
                        maxValue: Number(e.target.value) || undefined,
                      },
                    }));
                  }}
                  className={styles.input}
                  min="0"
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rule.active}
                onChange={(e) => setRule(prev => ({ ...prev, active: e.target.checked }))}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontWeight: '500' }}>
                {isEditing ? 'Rule is active' : 'Activate this rule immediately'}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className={styles.secondaryButton} onClick={onCancel}>
              Cancel
            </button>
            <button
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={
                !rule.name.trim() ||
                !rule.discounts.values[0].discountType ||
                (rule.discounts.values[0].discountType === 'PERCENTAGE' && !rule.discounts.values[0].percentage) ||
                (rule.discounts.values[0].discountType === 'FIXED_AMOUNT' && !rule.discounts.values[0].fixedAmount) ||
                (rule.discounts.values[0].discountType === 'FIXED_PRICE' && !rule.discounts.values[0].fixedPrice)
              }
            >
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountRuleForm;
