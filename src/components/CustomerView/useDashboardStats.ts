import { useEffect, useState } from 'react';
import { items } from '@wix/data';
import { getContact, queryAllRules } from '../../backend/pricing.client';

const APPLICATIONS_COLLECTION = '@wd-strategies/wholesale-appllication/application';

export interface PendingApplication {
    id: string;
    businessName: string;
    businessType: string;
    submittedDate: string;
}

export interface DashboardStats {
    pendingApplications: PendingApplication[];
    activePricingRules: number | null;
    isLoading: boolean;
}

// Mirrors Application.tsx: a contact tagged "wholesale" means the application was already approved.
const isWholesaleContact = (contact: any): boolean => {
    const payload = contact?.contact || contact;
    const extendedFields = payload?.info?.extendedFields?.items || payload?.extendedFields?.items || {};
    const key = Object.keys(extendedFields).find(k => k.includes('customer'));
    return key ? String(extendedFields[key]) === 'wholesale' : false;
};

const fetchPendingApplications = async (): Promise<PendingApplication[]> => {
    const results = await items
        .query(APPLICATIONS_COLLECTION)
        .eq('status', 'pending')
        .descending('submissionDate')
        .limit(100)
        .find();

    const checked = await Promise.all(
        results.items.map(async (item: any) => {
            if (item.contactId) {
                try {
                    if (isWholesaleContact(await getContact(item.contactId))) return null;
                } catch {
                    // Keep the application if the contact lookup fails
                }
            }
            return {
                id: item._id || '',
                businessName: item.businessName || item.contactName || item.email || 'Unnamed business',
                businessType: item.businessType || '',
                submittedDate: item.submissionDate || item._createdDate || '',
            };
        })
    );

    return checked.filter((app): app is PendingApplication => app !== null);
};

const fetchActivePricingRuleCount = async (): Promise<number> => {
    const response: any = await queryAllRules({ active: true });
    return (response?._items || response?.items || []).length;
};

/** Refetches whenever `refreshKey` changes (e.g. the active tab), so counts stay current after edits elsewhere. */
export const useDashboardStats = (refreshKey?: string): DashboardStats => {
    const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
    const [activePricingRules, setActivePricingRules] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        Promise.allSettled([fetchPendingApplications(), fetchActivePricingRuleCount()]).then(
            ([pending, rules]) => {
                if (cancelled) return;
                if (pending.status === 'fulfilled') setPendingApplications(pending.value);
                if (rules.status === 'fulfilled') setActivePricingRules(rules.value);
                setIsLoading(false);
            }
        );

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return { pendingApplications, activePricingRules, isLoading };
};

export const formatRelativeDate = (dateString: string): string => {
    const time = new Date(dateString).getTime();
    if (!dateString || isNaN(time)) return '';
    const days = Math.floor((Date.now() - time) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
