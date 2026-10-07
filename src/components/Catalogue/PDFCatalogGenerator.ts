import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Types for PDF catalog generation
export interface CatalogProduct {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string;
    originalPrice: number;
    wholesalePrice: number;
    discount: number;
    moq: number;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    category: string;
    description?: string;
}

export interface CatalogConfig {
    companyName: string;
    logo?: string;
    contactInfo: {
        email: string;
        phone: string;
        website: string;
        address: string;
    };
    branding: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
    };
}

export interface UserCatalogData {
    user: {
        id: string;
        name: string;
        email: string;
        company: string;
        accessGroups: string[];
    };
    products: CatalogProduct[];
    generatedAt: Date;
    validUntil?: Date;
}

export class PDFCatalogGenerator {
    private doc: jsPDF;
    private config: CatalogConfig;
    private pageMargin = 20;
    private pageWidth: number;
    private pageHeight: number;
    private currentY: number;
    private currencyCode: string;

    constructor(config: CatalogConfig, currencyCode: string) {
        this.config = config;
        this.currencyCode = currencyCode;
        this.doc = new jsPDF('p', 'mm', 'a4');
        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.currentY = this.pageMargin;
    }

    async generateCatalog(catalogData: UserCatalogData): Promise<Blob> {
        try {
            await this.addHeader();
            this.addUserInfo(catalogData.user);
            this.addCatalogInfo(catalogData);
            const productsByCategory = this.groupProductsByCategory(catalogData.products);
            
            for (const [category, products] of Object.entries(productsByCategory)) {
                await this.addCategorySection(category, products);
            }
            
            this.addFooter();
            
            return new Blob([this.doc.output('blob')], { type: 'application/pdf' });
            
        } catch {
            throw new Error('Failed to generate PDF catalog');
        }
    }

    private async addHeader(): Promise<void> {
       
        if (this.config.logo) {
            try {
                const logoImg = await this.loadImage(this.config.logo);
                this.doc.addImage(logoImg, 'PNG', this.pageMargin, this.currentY, 40, 20);
            } catch {
                // Ignore logo load failure
            }
        }

        this.doc.setFontSize(24);
        this.setTextColorSafe(this.config.branding.primaryColor);
        this.doc.text(this.config.companyName, this.pageWidth - this.pageMargin, this.currentY + 15, { align: 'right' });

        // Add title
        this.currentY += 35;
        this.doc.setFontSize(20);
        this.doc.setTextColor(40, 40, 40);
        this.doc.text('Wholesale Product Catalog', this.pageMargin, this.currentY);

        this.currentY += 20;
        this.addHorizontalLine();
    }

    private addUserInfo(user: any): void {
        this.currentY += 10;
        
        this.doc.setFontSize(12);
        this.doc.setTextColor(60, 60, 60);
        
        const userInfo = [
            `Customer: ${user.name}`,
            `Company: ${user.company}`,
            `Email: ${user.email}`,
            `Access Groups: ${user.accessGroups.join(', ')}`
        ];

        userInfo.forEach((info, index) => {
            this.doc.text(info, this.pageMargin, this.currentY + (index * 6));
        });

        this.currentY += 35;
        this.addHorizontalLine();
    }

    private addCatalogInfo(catalogData: UserCatalogData): void {
        this.currentY += 10;
        
        this.doc.setFontSize(10);
        this.doc.setTextColor(100, 100, 100);
        
        const catalogInfo = [
            `Generated: ${catalogData.generatedAt.toLocaleDateString()} ${catalogData.generatedAt.toLocaleTimeString()}`,
            `Total Products: ${catalogData.products.length}`,
            catalogData.validUntil ? `Valid Until: ${catalogData.validUntil.toLocaleDateString()}` : '',
            'Note: Prices and availability subject to change. Contact us for current pricing.'
        ].filter(Boolean);

        catalogInfo.forEach((info, index) => {
            this.doc.text(info, this.pageMargin, this.currentY + (index * 5));
        });

        this.currentY += 35;
    }

    private groupProductsByCategory(products: CatalogProduct[]): Record<string, CatalogProduct[]> {
        return products.reduce((groups, product) => {
            const category = product.category || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(product);
            return groups;
        }, {} as Record<string, CatalogProduct[]>);
    }

    private async addCategorySection(category: string, products: CatalogProduct[]): Promise<void> {
        // Check if we need a new page
        if (this.currentY > this.pageHeight - 100) {
            this.addNewPage();
        }

        // Category header
        this.doc.setFontSize(16);
        this.setTextColorSafe(this.config.branding.primaryColor);
        this.doc.text(category.toUpperCase(), this.pageMargin, this.currentY);
        
        this.currentY += 15;
        this.addHorizontalLine();
        this.currentY += 10;

        // Create product table
        const tableData = products.map(product => [
            product.sku,
            this.truncateText(product.name, 30),
            this.formatPrice(product.originalPrice),
            this.formatPrice(product.wholesalePrice),
            `${product.discount}%`,
            product.moq.toString(),
            this.formatStockStatus(product.stockStatus)
        ]);

        const primaryColorRgb = this.hexToRgb(this.config.branding.primaryColor);

        (this.doc as any).autoTable({
            startY: this.currentY,
            head: [['SKU', 'Product Name', 'MSRP', 'Your Price', 'Discount', 'MOQ', 'Stock']],
            body: tableData,
            margin: { left: this.pageMargin, right: this.pageMargin },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            headStyles: {
                fillColor: primaryColorRgb,
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { cellWidth: 20 }, // SKU
                1: { cellWidth: 45 }, // Product Name
                2: { cellWidth: 20 }, // MSRP
                3: { cellWidth: 20 }, // Your Price
                4: { cellWidth: 15 }, // Discount
                5: { cellWidth: 15 }, // MOQ
                6: { cellWidth: 20 }  // Stock
            }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    }

    private addNewPage(): void {
        this.doc.addPage();
        this.currentY = this.pageMargin;
        
        // Add simplified header for continuation pages
        this.doc.setFontSize(12);
        this.setTextColorSafe(this.config.branding.primaryColor);
        this.doc.text(`${this.config.companyName} - Wholesale Catalog (Continued)`, this.pageMargin, this.currentY);
        this.currentY += 15;
        this.addHorizontalLine();
        this.currentY += 15;
    }

    private addFooter(): void {
        const totalPages = this.doc.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            
            // Add contact information
            this.doc.setFontSize(9);
            this.doc.setTextColor(100, 100, 100);
            
            const footerY = this.pageHeight - 20;
            
            // Contact info
            const contactInfo = [
                `Email: ${this.config.contactInfo.email}`,
                `Phone: ${this.config.contactInfo.phone}`,
                `Website: ${this.config.contactInfo.website}`
            ].join(' | ');
            
            this.doc.text(contactInfo, this.pageMargin, footerY);
            
            // Page number
            this.doc.text(`Page ${i} of ${totalPages}`, this.pageWidth - this.pageMargin, footerY, { align: 'right' });
            
            // Add footer line
            this.doc.setDrawColor(200, 200, 200);
            this.doc.line(this.pageMargin, footerY - 5, this.pageWidth - this.pageMargin, footerY - 5);
        }
    }

    private addHorizontalLine(): void {
        const secondaryColorRgb = this.hexToRgb(this.config.branding.secondaryColor);
        this.doc.setDrawColor(secondaryColorRgb[0], secondaryColorRgb[1], secondaryColorRgb[2]);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.pageMargin, this.currentY, this.pageWidth - this.pageMargin, this.currentY);
    }

    private formatPrice(price: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: this.currencyCode
        }).format(price);
    }

    private formatStockStatus(status: string): string {
        const statusMap = {
            'in_stock': 'In Stock',
            'low_stock': 'Low Stock',
            'out_of_stock': 'Out of Stock'
        };
        return statusMap[status as keyof typeof statusMap] || status;
    }

    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    private setTextColorSafe(hexColor: string): void {
        try {
            const rgb = this.hexToRgb(hexColor);
            this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        } catch {
            this.doc.setTextColor(0, 0, 0); // Default to black
        }
    }

    private hexToRgb(hex: string): [number, number, number] {
        // Remove # if present and ensure we have a valid hex string
        const cleanHex = hex.replace('#', '');
        
        // Validate hex string
        if (!/^[0-9A-F]{6}$/i.test(cleanHex)) {
            return [0, 0, 0]; // Default to black
        }
        
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
        
        if (!result) {
            return [0, 0, 0]; // Default to black
        }
        
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ];
    }

    private loadImage(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    }
}
