import React from 'react';
import { type EditFormData, type WholesaleApplication } from './types';
import { type AccessGroup } from '../AccessGroupType';
import { Badge, Box, Button, Checkbox, Detail, Details, FormField, Modal, Notice, Select } from '../ui';

interface EditCustomerModalProps {
    isOpen: boolean;
    customer: WholesaleApplication | null;
    editForm: EditFormData;
    accessGroups: AccessGroup[];
    isLoading: boolean;
    onClose: () => void;
    onSubmit: () => void;
    onFormChange: (field: keyof EditFormData, value: any) => void;
}

const groupLimits = (group: AccessGroup) =>
    [group.minOrder && `Min order ${group.minOrder}`, group.maxOrder && `Max order ${group.maxOrder}`]
        .filter(Boolean)
        .join(' · ');

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
    isOpen,
    customer,
    editForm,
    accessGroups,
    isLoading,
    onClose,
    onSubmit,
    onFormChange
}) => {
    if (!isOpen || !customer) return null;

    const toggleGroup = (groupId: string, checked: boolean) => {
        onFormChange(
            'accessGroupIds',
            checked ? [...editForm.accessGroupIds, groupId] : editForm.accessGroupIds.filter(id => id !== groupId),
        );
    };

    const hasApplicationDetails =
        customer.interestedProducts.length > 0 || !!customer.additionalInfo || !!customer.estimatedMonthlyVolume;

    return (
        <Modal
            isOpen
            onClose={onClose}
            busy={isLoading}
            size="medium"
            title="Edit customer"
            subtitle={[customer.businessName, customer.email !== customer.businessName ? customer.email : null].filter(Boolean).join(' · ')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={onSubmit} loading={isLoading}>{isLoading ? 'Saving…' : 'Save changes'}</Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                <Box direction="vertical" gap="20px">
                    <FormField label="Application status">
                        <Select value={editForm.status} onChange={(e) => onFormChange('status', e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </Select>
                    </FormField>

                    <FormField
                        label="Access groups"
                        hint={editForm.accessGroupIds.length > 0
                            ? `${editForm.accessGroupIds.length} group${editForm.accessGroupIds.length !== 1 ? 's' : ''} selected`
                            : undefined}
                    >
                        {accessGroups.length === 0 ? (
                            <Notice tone="warning" title="No access groups yet">
                                Create an access group first to assign it to customers.
                            </Notice>
                        ) : (
                            <Box direction="vertical" gap="8px" maxHeight="240px" overflowY="auto">
                                {accessGroups.map((group) => (
                                    <Box
                                        key={group.id}
                                        padding="12px 14px"
                                        border="1px solid var(--wh-line)"
                                        borderRadius="12px"
                                        verticalAlign="middle"
                                    >
                                        <Checkbox
                                            checked={editForm.accessGroupIds.includes(group.id)}
                                            onChange={(e) => toggleGroup(group.id, e.target.checked)}
                                        >
                                            <Box direction="vertical">
                                                <strong style={{ fontSize: 14 }}>{group.name}</strong>
                                                {groupLimits(group) && (
                                                    <span style={{ fontSize: 13, color: 'var(--wh-muted)' }}>{groupLimits(group)}</span>
                                                )}
                                            </Box>
                                        </Checkbox>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </FormField>

                    {hasApplicationDetails && (
                        <Details>
                            {customer.interestedProducts.length > 0 && (
                                <Detail label="Interested products" full>
                                    <Box gap="6px" wrap>
                                        {customer.interestedProducts.map((product, index) => (
                                            <Badge key={index} tone="info" dot={false}>{product}</Badge>
                                        ))}
                                    </Box>
                                </Detail>
                            )}
                            {customer.estimatedMonthlyVolume && (
                                <Detail label="Estimated monthly volume" full>{customer.estimatedMonthlyVolume}</Detail>
                            )}
                            {customer.additionalInfo && (
                                <Detail label="Additional information" full>
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{customer.additionalInfo}</span>
                                </Detail>
                            )}
                        </Details>
                    )}
                </Box>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};
