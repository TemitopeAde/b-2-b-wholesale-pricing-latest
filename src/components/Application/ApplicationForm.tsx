import React, { type FC } from 'react';
import { type FormData } from '../Application';
import { LoaderIcon } from './Icons';
import { currencySymbol, useSiteCurrency } from '../../utils/currency';

// Fields whose values must keep the user's casing (everything else gets its first letter uppercased)
const UNCAPITALIZED_FIELDS: (keyof FormData)[] = ['email', 'website', 'phone'];


interface ApplicationFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}

export const ApplicationForm: FC<ApplicationFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isLoading
}) => {
  const businessTypes = [
    'Retail Store', 'Online Retailer', 'Distributor', 'Reseller',
    'Restaurant/Food Service', 'Construction Company', 'Manufacturing', 'Other'
  ];

  const yearsOptions = [
    'Less than 1 year', '1-2 years', '3-5 years', '6-10 years', '11-20 years', 'More than 20 years'
  ];

  const { currency } = useSiteCurrency();
  const c = currencySymbol(currency);

  const revenueOptions = [
    `Under ${c}100K`, `${c}100K - ${c}500K`, `${c}500K - ${c}1M`, `${c}1M - ${c}5M`, `${c}5M - ${c}10M`, `Over ${c}10M`
  ];

  const productCategories = [
    'Hardware & Tools', 'Building Materials', 'Electrical Supplies',
    'Plumbing Supplies', 'Safety Equipment', 'Industrial Equipment', 'Other'
  ];

  const volumeOptions = [
    `Under ${c}1,000`, `${c}1,000 - ${c}5,000`, `${c}5,000 - ${c}10,000`,
    `${c}10,000 - ${c}25,000`, `${c}25,000 - ${c}50,000`, `Over ${c}50,000`
  ];

  const hearAboutOptions = [
    'Search Engine', 'Social Media', 'Referral', 'Trade Show',
    'Industry Publication', 'Existing Customer', 'Other'
  ];

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (!UNCAPITALIZED_FIELDS.includes(field)) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (category: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interestedProducts: checked
        ? [...prev.interestedProducts, category]
        : prev.interestedProducts.filter(item => item !== category)
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="wholesale-card">
      <div className="wholesale-card-content">
        <div className="wholesale-form-section">
          <h2 className="wholesale-section-title">Business Information</h2>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label wholesale-required">Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="wholesale-input"
                placeholder="Enter business name"
              />
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label wholesale-required">Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="wholesale-select"
              >
                <option value="">Select business type</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Years in Business</label>
              <select
                value={formData.yearsInBusiness}
                onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                className="wholesale-select"
              >
                <option value="">Select years</option>
                {yearsOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Annual Revenue</label>
              <select
                value={formData.annualRevenue}
                onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                className="wholesale-select"
              >
                <option value="">Select revenue</option>
                {revenueOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="wholesale-form-section">
          <h2 className="wholesale-section-title">Contact Information</h2>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label wholesale-required">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => handleInputChange('contactName', e.target.value)}
                className="wholesale-input"
                placeholder="Primary contact"
              />
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label wholesale-required">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="wholesale-input"
                placeholder="business@email.com"
              />
            </div>
          </div>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="wholesale-input"
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="wholesale-input"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </div>

        <div className="wholesale-form-section">
          <h2 className="wholesale-section-title">Business Details</h2>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Number of Locations</label>
              <input
                type="number"
                value={formData.numberOfLocations}
                onChange={(e) => handleInputChange('numberOfLocations', e.target.value.replace(/^-+/, ''))}
                onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                onWheel={(e) => e.currentTarget.blur()}
                className="wholesale-input"
                placeholder="1"
                min="1"
              />
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Tax ID</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                className="wholesale-input"
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>
          <div className="wholesale-form-row">
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">Resale Certificate</label>
              <input
                type="text"
                value={formData.resaleCertificate}
                onChange={(e) => handleInputChange('resaleCertificate', e.target.value)}
                className="wholesale-input"
                placeholder="Certificate number"
              />
            </div>
            <div className="wholesale-form-group">
              <label className="wholesale-form-label">How did you hear about us?</label>
              <select
                value={formData.hearAboutUs}
                onChange={(e) => handleInputChange('hearAboutUs', e.target.value)}
                className="wholesale-select"
              >
                <option value="">Select source</option>
                {hearAboutOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="wholesale-form-section">
          <h2 className="wholesale-section-title">Product Interest</h2>
          <div className="wholesale-form-group">
            <label className="wholesale-form-label">Interested Product Categories</label>
            <div className="wholesale-checkbox-grid">
              {productCategories.map(category => (
                <label key={category} className="wholesale-checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.interestedProducts.includes(category)}
                    onChange={(e) => handleCheckboxChange(category, e.target.checked)}
                    className="wholesale-checkbox"
                  />
                  <span className="wholesale-checkbox-label">{category}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="wholesale-form-group">
            <label className="wholesale-form-label">Estimated Monthly Volume</label>
            <select
              value={formData.estimatedMonthlyVolume}
              onChange={(e) => handleInputChange('estimatedMonthlyVolume', e.target.value)}
              className="wholesale-select"
            >
              <option value="">Select volume</option>
              {volumeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="wholesale-form-section">
          <h2 className="wholesale-section-title">Additional Information</h2>
          <div className="wholesale-form-group">
            <label className="wholesale-form-label">Additional Information (Optional)</label>
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              className="wholesale-textarea"
              placeholder="Tell us more about your business, specific needs, or any questions you have..."
              rows={4}
            />
          </div>
        </div>

        <div className="wholesale-submit-section">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="wholesale-btn wholesale-btn-primary wholesale-btn-submit"
          >
            {isLoading && <LoaderIcon />}
            Submit Application
          </button>
        </div>
      </div>
    </div>
  );
};