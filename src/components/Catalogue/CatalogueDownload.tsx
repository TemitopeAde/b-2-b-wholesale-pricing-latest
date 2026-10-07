import React, { useState } from 'react';
import { PDFCatalogGenerator } from './PDFCatalogGenerator';
import { CatalogDataService } from './CatalogDataService';
import { useSiteCurrency } from '../../utils/currency';

interface CatalogDownloadProps {
    userId: string;
    className?: string;
    buttonText?: string;
    showProductCount?: boolean;
}

export const CatalogDownload: React.FC<CatalogDownloadProps> = ({
    userId,
    className = '',
    buttonText = 'Download Wholesale Catalog',
    showProductCount = true
}) => {
    const { currency, isLoading: isCurrencyLoading, error: currencyError } = useSiteCurrency();
    const [isGenerating, setIsGenerating] = useState(false);
    const [productCount, setProductCount] = useState<number | null>(null);
    const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateAndDownloadCatalog = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            if (!currency) {
                throw currencyError || new Error('Site currency is unavailable.');
            }
            // Fetch user-specific catalog data
            const catalogData = await CatalogDataService.getUserCatalogData(userId);
            
            // Get catalog configuration
            const config = CatalogDataService.getDefaultCatalogConfig();
            
            // Generate PDF
            const pdfGenerator = new PDFCatalogGenerator(config, currency);
            const pdfBlob = await pdfGenerator.generateCatalog(catalogData);
            
            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `wholesale-catalog-${catalogData.user.company.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Update state
            setProductCount(catalogData.products.length);
            setLastGenerated(new Date());
            
        } catch {
            setError('Failed to generate catalog. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`catalog-download-container ${className}`}>
            <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                    </div>
                    <div>
                        <h3 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            Wholesale Product Catalog
                        </h3>
                        <p style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            Download a personalized PDF with your pricing and product access
                        </p>
                    </div>
                </div>

                {showProductCount && productCount !== null && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.875rem',
                            color: '#1e40af'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                                <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>
                            {productCount} products available in your catalog
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.875rem',
                            color: '#dc2626'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            {error}
                        </div>
                    </div>
                )}

                <button
                    onClick={generateAndDownloadCatalog}
                disabled={isGenerating || isCurrencyLoading || !currency}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (!isGenerating) {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isGenerating) {
                            e.currentTarget.style.backgroundColor = '#3b82f6';
                        }
                    }}
                >
                    {isGenerating ? (
                        <>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }}
                            >
                                <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                            </svg>
                            Generating PDF...
                        </>
                    ) : (
                        <>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ marginRight: '0.5rem' }}
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            {buttonText}
                        </>
                    )}
                </button>

                {lastGenerated && (
                    <div style={{
                        marginTop: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textAlign: 'center'
                    }}>
                        Last generated: {lastGenerated.toLocaleDateString()} at {lastGenerated.toLocaleTimeString()}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
};
