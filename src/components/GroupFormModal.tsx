import React, { type FC, useEffect, useState } from 'react';
import { Box, Button, FormField, Input, Modal, Notice } from './ui';
import { type NewAccessGroup } from './AccessGroupType';

type GroupFields = Pick<NewAccessGroup, 'name' | 'minOrder' | 'maxOrder' | 'minProducts' | 'maxProducts'>;

interface GroupFormModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    values: GroupFields;
    onChange: (field: keyof GroupFields, value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const hasText = (value?: string | number) => value !== undefined && value !== null && String(value).trim() !== '';

const isOrderValueGreaterThanOne = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return true;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) && numeric > 1;
};

export const validateGroup = (group: GroupFields) => {
    const errors: Partial<Record<keyof GroupFields | 'form', string>> = {};

    if (!hasText(group.name)) errors.name = 'Group name is required';
    if (!isOrderValueGreaterThanOne(group.minOrder)) errors.minOrder = 'Must be a number greater than 1';
    if (!isOrderValueGreaterThanOne(group.maxOrder)) errors.maxOrder = 'Must be a number greater than 1';

    if (!errors.minOrder && !errors.maxOrder && hasText(group.minOrder) && hasText(group.maxOrder)
        && Number(group.maxOrder) <= Number(group.minOrder)) {
        errors.maxOrder = 'Must be greater than the minimum order';
    }

    const minProducts = parseInt(String(group.minProducts ?? ''), 10);
    const maxProducts = parseInt(String(group.maxProducts ?? ''), 10);
    if (!isNaN(minProducts) && !isNaN(maxProducts) && maxProducts <= minProducts) {
        errors.maxProducts = 'Must be greater than the minimum products';
    }

    if (!hasText(group.minOrder) && !hasText(group.maxOrder) && !hasText(group.minProducts) && !hasText(group.maxProducts)) {
        errors.form = 'Set at least one order or product limit.';
    }

    return errors;
};

export const GroupFormModal: FC<GroupFormModalProps> = ({
    isOpen, mode, values, onChange, onSubmit, onCancel, isSaving,
}) => {
    const [touched, setTouched] = useState<Partial<Record<keyof GroupFields, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTouched({});
            setSubmitted(false);
        }
    }, [isOpen]);

    const errors = validateGroup(values);
    const isValid = Object.keys(errors).length === 0;
    const show = (field: keyof GroupFields) => (submitted || touched[field]) ? errors[field] : undefined;

    const field = (name: keyof GroupFields) => ({
        value: (values[name] as string) || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value),
        onBlur: () => setTouched(prev => ({ ...prev, [name]: true })),
    });

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        setSubmitted(true);
        if (isValid) onSubmit();
    };

    const isCreate = mode === 'create';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            busy={isSaving}
            size="medium"
            title={isCreate ? 'Create access group' : 'Edit access group'}
            subtitle="Groups set order and product limits for the wholesale customers in them."
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                    <Button onClick={() => handleSubmit()} loading={isSaving} disabled={submitted && !isValid}>
                        {isSaving ? (isCreate ? 'Creating…' : 'Saving…') : (isCreate ? 'Create group' : 'Save changes')}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate>
                <Box direction="vertical" gap="18px">
                    <FormField label="Group name" required error={show('name')}>
                        <Input {...field('name')} placeholder="e.g. Gold tier" />
                    </FormField>

                    <Box gap="16px" wrap>
                        <FormField label="Minimum order value" error={show('minOrder')} style={{ flex: '1 1 200px' }}>
                            <Input {...field('minOrder')} type="number" min={0} placeholder="e.g. 1000" />
                        </FormField>
                        <FormField label="Maximum order value" error={show('maxOrder')} style={{ flex: '1 1 200px' }}>
                            <Input {...field('maxOrder')} type="number" min={0} placeholder="e.g. 10000" />
                        </FormField>
                    </Box>

                    <Box gap="16px" wrap>
                        <FormField label="Minimum products" style={{ flex: '1 1 200px' }}>
                            <Input {...field('minProducts')} type="number" min={0} placeholder="e.g. 10" />
                        </FormField>
                        <FormField label="Maximum products" error={show('maxProducts')} style={{ flex: '1 1 200px' }}>
                            <Input {...field('maxProducts')} type="number" min={0} placeholder="e.g. 100" />
                        </FormField>
                    </Box>

                    {submitted && errors.form ? (
                        <Notice tone="error">{errors.form}</Notice>
                    ) : (
                        <Notice tone="neutral">A group needs a name and at least one order or product limit.</Notice>
                    )}
                </Box>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};
