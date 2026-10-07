import React, { useState, useEffect } from 'react';
import { getProductById } from '../backend/pricing.client';
import { Badge, Box, Button, LoadingBlock, Modal, Notice } from './ui';
import { DashIcons } from './Dashboard/icons';

interface ProductDetailModalProps {
    productId: string;
    productName?: string;
    onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
    productId,
    productName,
    onClose,
}) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getProductById(productId);
                setProduct(data);
            } catch (err: any) {
                setError(err?.message || 'Failed to load product');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    const p = product as any;
    const productImage = p?.media?.mainMedia?.image?.url || p?.media?.items?.[0]?.image?.url || p?.mainMedia?.url || null;
    const productPrice = p?.priceData?.price ?? p?.price?.price ?? p?.priceData?.formattedPrice ?? null;
    const productSku = p?.sku || p?.variants?.[0]?.variant?.sku || null;
    const stockStatus = p?.stock?.inventoryStatus || p?.inventoryStatus || (p?.stock?.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK') || null;

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="medium"
            title="Product details"
            subtitle={productName}
            footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
        >
            {loading ? (
                <LoadingBlock message="Loading product…" />
            ) : error ? (
                <Notice tone="error" title="Couldn't load this product">{error}</Notice>
            ) : (
                <Box gap="20px" verticalAlign="top">
                    {productImage ? (
                        <img
                            src={productImage}
                            alt=""
                            style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--wh-line)', flexShrink: 0 }}
                        />
                    ) : (
                        <Box width="112px" height="112px" borderRadius="12px" backgroundColor="var(--wh-sunk)" color="var(--wh-disabled)" align="center" verticalAlign="middle" style={{ flexShrink: 0 }}>
                            <DashIcons.Box size={28} />
                        </Box>
                    )}
                    <Box direction="vertical" gap="8px" flex="1">
                        <Box gap="6px" wrap>
                            {stockStatus && (
                                <Badge tone={stockStatus === 'IN_STOCK' ? 'success' : 'danger'}>
                                    {stockStatus === 'IN_STOCK' ? 'In stock' : 'Out of stock'}
                                </Badge>
                            )}
                            {productSku && <Badge tone="neutral" dot={false}>SKU {productSku}</Badge>}
                        </Box>
                        <h3 style={{ margin: 0, fontFamily: 'var(--wh-display)', fontSize: 20, fontWeight: 700 }}>{product?.name}</h3>
                        {productPrice !== null && (
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--wh-accent)' }}>
                                ${typeof productPrice === 'number' ? productPrice.toFixed(2) : productPrice}
                            </span>
                        )}
                    </Box>
                </Box>
            )}
        </Modal>
    );
};
