

export interface AccessGroup {
    id: string;
    name: string;
    discount: string;
    minOrder: string;
}

export interface WholesaleApplication {
    id: string;
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
    status: 'pending' | 'approved' | 'rejected';
    submittedDate: string;
    // Extended fields for customer management
    accessGroupIds: string[];
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    memberId: string;
}

export interface EditFormData {
    accessGroupIds: string[];
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    status: 'pending' | 'approved' | 'rejected';
}

export type EditFormField = keyof EditFormData;

export type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

export interface LoadingActions {
    [key: string]: boolean;
}

export interface CustomerStats {
    approved: number;
    pending: number;
    rejected: number;
    totalRevenue: number;
    total: number;
}