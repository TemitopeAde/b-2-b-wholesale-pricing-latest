import { type CatalogProduct, type UserCatalogData, type CatalogConfig } from './PDFCatalogGenerator';
import { getContact, handleCatalogLogic } from '../../backend/pricing.client'; // Adjust import path as needed
import { getCurrentMember } from '../../utils/utils';
import { items } from '@wix/data';

// Service to fetch and prepare catalog data
export class CatalogDataService {

    /**
     * Fetches user-specific catalog data including products, pricing, and access rules
     */
    static async getUserCatalogData(userId: string): Promise<UserCatalogData> {
        try {
            // Fetch user information and access groups
            const user = await this.fetchUserInfo(userId);

            // Fetch user's access groups and pricing rules
            const accessGroups = await this.fetchUserAccessGroups(userId);

            // Fetch all products using your backend catalog logic
            const catalogData = await handleCatalogLogic();

            // Filter products based on user access
            const accessibleProducts = this.filterProductsByUserAccess(catalogData.products, accessGroups);

            // Apply pricing rules to products
            const productsWithPricing = await this.applyPricingRules(accessibleProducts, accessGroups);

            // Apply MOQ rules
            const productsWithMOQ = await this.applyMOQRules(productsWithPricing, accessGroups);

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    company: user.company || 'N/A',
                    accessGroups: accessGroups.map(group => group.name)
                },
                products: productsWithMOQ,
                generatedAt: new Date(),
                validUntil: this.calculateValidityDate()
            };

        } catch {
            throw new Error('Failed to fetch catalog data');
        }
    }


    private static async fetchUserInfo(userId: string): Promise<any> {
        try {
            const currentMember = await getCurrentMember();

            if (!currentMember?.member) {
                throw new Error('No current member found');
            }

            const member = currentMember.member;

            let contactInfo = null;
            if (member.contactId) {
                try {
                    contactInfo = await getContact(member.contactId);
                } catch {
                    // Ignore contact error
                }
            }

            const user = {
                id: member._id || userId,
                name: member.profile?.nickname ||
                    contactInfo?.info?.name?.first + ' ' + contactInfo?.info?.name?.last ||
                    member.loginEmail ||
                    'Unknown User',
                email: member.loginEmail ||
                    contactInfo?.info?.emails?.items?.[0]?.email ||
                    'no-email@domain.com',
                company: contactInfo?.info?.company ||
                    member.profile?.slug ||
                    'N/A'
            };

            return user;
        } catch {
            const fallbackUser = {
                id: userId,
                name: 'Current User',
                email: 'user@domain.com',
                company: 'N/A'
            };

            return fallbackUser;
        }
    }


    private static async fetchUserAccessGroups(userId: string): Promise<any[]> {
        try {
            const currentMember = await getCurrentMember();

            if (!currentMember?.member) {
                throw new Error('No current member found');
            }

            const memberId = currentMember.member._id || userId;

            const accessGroupsResults = await items.query('@wd-strategies/wholesale-appllication/Accessgroup')
                .hasSome('memberIds', [memberId])
                .find();

            if (accessGroupsResults.items.length === 0) {
                return [];
            }

            const accessGroups = accessGroupsResults.items.map(group => ({
                id: group._id,
                name: group.name || 'Unnamed Group',
                discount: group.discount || '0%',
                minOrder: group.minOrder || '0',
                allowedCategories: group.allowedCategories || [],
                description: group.description || '',
                isActive: group.isActive !== false,
                createdDate: group._createdDate,
                updatedDate: group._updatedDate
            }));

            return accessGroups;

        } catch {
            try {
                const fallbackGroups = await items.query('@wd-strategies/wholesale-appllication/Accessgroup')
                    .eq('isDefault', true)
                    .limit(1)
                    .find();

                if (fallbackGroups.items.length > 0) {
                    const defaultGroup = fallbackGroups.items[0];
                    return [{
                        id: defaultGroup._id,
                        name: defaultGroup.name || 'Default Group',
                        discount: defaultGroup.discount || '0%',
                        minOrder: defaultGroup.minOrder || '0',
                        allowedCategories: defaultGroup.allowedCategories || [],
                        description: defaultGroup.description || 'Default access group',
                        isActive: true,
                        createdDate: defaultGroup._createdDate,
                        updatedDate: defaultGroup._updatedDate
                    }];
                }
            } catch {
                // Ignore fallback error
            }

            return [];
        }
    }

    /**
     * Filters products based on user's access groups and permissions
     */
    private static filterProductsByUserAccess(products: any[], accessGroups: any[]): any[] {
        // Get all allowed categories from access groups
        const allowedCategories = new Set<string>();

        accessGroups.forEach(group => {
            if (group.allowedCategories && Array.isArray(group.allowedCategories)) {
                group.allowedCategories.forEach((category: string) => {
                    allowedCategories.add(category.toLowerCase());
                });
            }
        });

        // If no category restrictions, return all products
        if (allowedCategories.size === 0) {
            return products;
        }

        // Filter products based on categories
        return products.filter(product => {
            // Handle different product structure based on catalog version
            let productCategories: string[] = [];

            // For V1 catalog structure
            if (product.collections && Array.isArray(product.collections)) {
                productCategories = product.collections.map((col: any) =>
                    (col.name || col.slug || '').toLowerCase()
                );
            }

            // For V3 catalog structure
            if (product.ribbon && typeof product.ribbon === 'string') {
                productCategories.push(product.ribbon.toLowerCase());
            }

            // Check if product has any allowed category
            return productCategories.some(category => allowedCategories.has(category)) ||
                allowedCategories.size === 0; // If no restrictions, include all
        });
    }

    /**
     * Applies pricing rules based on user's access groups
     */
    private static async applyPricingRules(products: any[], accessGroups: any[]): Promise<CatalogProduct[]> {
        const pricingRules = await this.fetchPricingRules(accessGroups);

        return products.map(product => {
            const applicableRule = this.findApplicablePricingRule(product, pricingRules);

            // Handle different price structures for V1/V3 catalogs
            let originalPrice = 0;

            if (product.price && typeof product.price === 'number') {
                originalPrice = product.price;
            } else if (product.priceData?.price) {
                originalPrice = parseFloat(product.priceData.price) || 0;
            } else if (product.price?.value) {
                originalPrice = parseFloat(product.price.value) || 0;
            }

            let wholesalePrice = originalPrice;
            let discount = 0;

            if (applicableRule) {
                if (applicableRule.discountType === 'percentage') {
                    discount = applicableRule.discountValue;
                    wholesalePrice = originalPrice * (1 - discount / 100);
                } else if (applicableRule.discountType === 'fixed') {
                    wholesalePrice = Math.max(0, originalPrice - applicableRule.discountValue);
                    discount = originalPrice > 0 ? ((originalPrice - wholesalePrice) / originalPrice) * 100 : 0;
                }
            }

            return {
                id: product._id || product.id,
                name: product.name || 'Unnamed Product',
                sku: product.sku || product._id || product.id,
                imageUrl: this.getProductImageUrl(product),
                originalPrice,
                wholesalePrice: Math.round(wholesalePrice * 100) / 100,
                discount: Math.round(discount * 100) / 100,
                moq: 1, // Will be updated by MOQ rules
                stockStatus: this.mapStockStatus(product),
                category: this.getProductCategory(product),
                description: product.description || ''
            };
        });
    }

    /**
     * Extracts product image URL from different catalog structures
     */
    private static getProductImageUrl(product: any): string | undefined {
        // V3 catalog structure
        if (product.media?.mainMedia?.image?.url) {
            return product.media.mainMedia.image.url;
        }

        // V1 catalog structure
        if (product.mainMedia?.image?.url) {
            return product.mainMedia.image.url;
        }

        // Alternative structures
        if (product.media?.items?.[0]?.image?.url) {
            return product.media.items[0].image.url;
        }

        if (product.productImageUrl) {
            return product.productImageUrl;
        }

        return undefined;
    }

    /**
     * Extracts product category from different catalog structures
     */
    private static getProductCategory(product: any): string {
        // V3 catalog structure
        if (product.collections?.[0]?.name) {
            return product.collections[0].name;
        }

        // V1 catalog structure  
        if (product.collection?.name) {
            return product.collection.name;
        }

        // Ribbon as category
        if (product.ribbon) {
            return product.ribbon;
        }

        return 'General';
    }

    /**
     * Applies MOQ (Minimum Order Quantity) rules
     */
    private static async applyMOQRules(products: CatalogProduct[], accessGroups: any[]): Promise<CatalogProduct[]> {
        const moqRules = await this.fetchMOQRules(accessGroups);

        return products.map(product => {
            const applicableRule = this.findApplicableMOQRule(product, moqRules);

            if (applicableRule) {
                product.moq = applicableRule.minimumQuantity || 1;
            }

            return product;
        });
    }

    /**
     * Fetches pricing rules applicable to the user's access groups
     */
    private static async fetchPricingRules(accessGroups: any[]): Promise<any[]> {
        try {
            // TODO: Replace with your actual pricing rules fetching logic
            // This should integrate with your PricingRulesService

            // Mock pricing rules based on access groups
            const mockPricingRules = accessGroups.map(group => ({
                id: `rule-${group.id}`,
                type: 'general',
                discountType: 'percentage',
                discountValue: parseFloat(group.discount?.replace('%', '') || '0'),
                accessGroupId: group.id
            }));

            return mockPricingRules;
        } catch {
            return [];
        }
    }

    /**
     * Fetches MOQ rules applicable to the user's access groups
     */
    private static async fetchMOQRules(accessGroups: any[]): Promise<any[]> {
        try {
            // TODO: Replace with your actual MOQ rules fetching logic
            // Mock MOQ rules
            const mockMOQRules = [
                {
                    id: 'moq-1',
                    type: 'general',
                    minimumQuantity: 5,
                    accessGroupId: accessGroups[0]?.id
                }
            ];

            return mockMOQRules;
        } catch {
            return [];
        }
    }

    /**
     * Gets default catalog configuration
     */
    static getDefaultCatalogConfig(): CatalogConfig {
        return {
            companyName: 'Your Company Name',
            logo: '/assets/company-logo.png',
            contactInfo: {
                email: 'wholesale@yourcompany.com',
                phone: '+1 (555) 123-4567',
                website: 'www.yourcompany.com',
                address: '123 Business St, City, State 12345'
            },
            branding: {
                primaryColor: '#2563eb',
                secondaryColor: '#64748b',
                accentColor: '#10b981'
            }
        };
    }

    /**
     * Helper methods
     */
    private static findApplicablePricingRule(product: any, rules: any[]): any {
        // Find the most specific applicable rule
        // Priority: Product-specific > Category-specific > General

        // Product-specific rules
        const productRule = rules.find(rule =>
            rule.type === 'product' && rule.targetId === product.id
        );
        if (productRule) return productRule;

        // Category-specific rules
        const productCategory = this.getProductCategory(product);
        const categoryRule = rules.find(rule =>
            rule.type === 'category' && rule.targetName?.toLowerCase() === productCategory.toLowerCase()
        );
        if (categoryRule) return categoryRule;

        // General rules - return the highest discount
        const generalRules = rules.filter(rule => rule.type === 'general');
        if (generalRules.length > 0) {
            return generalRules.reduce((best, current) =>
                current.discountValue > best.discountValue ? current : best
            );
        }

        return null;
    }

    private static findApplicableMOQRule(product: CatalogProduct, rules: any[]): any {
        // Similar logic to pricing rules but for MOQ
        const productRule = rules.find(rule =>
            rule.type === 'product' && rule.targetId === product.id
        );
        if (productRule) return productRule;

        const categoryRule = rules.find(rule =>
            rule.type === 'category' && rule.targetName?.toLowerCase() === product.category.toLowerCase()
        );
        if (categoryRule) return categoryRule;

        return rules.find(rule => rule.type === 'general');
    }

    private static mapStockStatus(product: any): 'in_stock' | 'low_stock' | 'out_of_stock' {
        // Handle different stock structures for V1/V3 catalogs
        let quantity = 0;

        if (product.stock?.quantity !== undefined) {
            quantity = product.stock.quantity;
        } else if (product.manageVariants && product.variants?.length > 0) {
            // For products with variants, sum up variant stock
            quantity = product.variants.reduce((total: number, variant: any) =>
                total + (variant.stock?.quantity || 0), 0
            );
        } else if (product.productType === 'physical' && product.stock?.trackQuantity) {
            quantity = product.stock.quantity || 0;
        } else {
            // If stock tracking is disabled, assume in stock
            return 'in_stock';
        }

        if (quantity === 0) return 'out_of_stock';
        if (quantity < 10) return 'low_stock';
        return 'in_stock';
    }

    private static calculateValidityDate(): Date {
        // Catalog valid for 30 days
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        return validUntil;
    }

    private static getAuthToken(): string {
        // Get authentication token from your auth system
        return localStorage.getItem('authToken') || '';
    }
}