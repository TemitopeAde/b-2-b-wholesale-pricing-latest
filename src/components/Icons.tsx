import React from 'react'

export interface PricingRule {
    id: string;
    name: string;
    description: string;
    type: 'global' | 'category' | 'product';
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    targetId?: string;
    targetName?: string;
    isActive: boolean;
    minimumOrder?: number;
    accessGroups: string[];
    createdDate: string;
    updatedDate: string;
    productId?: string
}

export interface Category {
    id: string;
    name: string;
}

export interface Product {
    _id: string;
    name: string;
    price?: {
        price: number;
    };
}


export const LoaderSVG: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        {...props}
    >
        <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray="18.84"
            strokeLinecap="round"
        >
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 8 8"
                to="360 8 8"
                dur="1s"
                repeatCount="indefinite"
            />
        </circle>
    </svg>
);

export const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z" />
    </svg>
);

export const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L9.708 9.708a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168L12.146.146zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293L12.793 5.5z" />
        <path d="M2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 1 1 0v7A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5v-11A1.5 1.5 0 0 1 2.5 1h7a.5.5 0 0 1 0 1h-7z" />
    </svg>
);

export const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
    </svg>
);


export const MoreVerticalIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="2" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="8" cy="14" r="1.5" />
    </svg>
);