import React, { type FC, useState, useEffect } from 'react';
import { items } from "@wix/data";
import { dashboard } from '@wix/dashboard';
import { getCurrentMember } from '../utils/utils';
import { getAllContacts, getContact } from '../backend/pricing.client';
import { createWholesaleApplication, reviewWholesaleApplication } from '../backend/wholesale.client';
import { ApplicationForm } from './Application/ApplicationForm';
import { StatsGrid } from './Application/StatsGrid';
import { ApplicationsList } from './Application/ApplicationsList';
import { ApplicationModal } from './Application/ApplicationModal';
import { ConfirmationModal } from './Application/ConfirmationModal';
import { SiteContactsList } from './Application/SiteContactsList';
import { Box, Button, Page, PageHeader, Tabs } from './ui';
import { DashIcons } from './Dashboard/icons';
import './element.styles.css';

export interface FormData {
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
  id: string;
  memberId?: string;
  contactId?: string;
}

const COLLECTION_NAME = "@wd-strategies/wholesale-appllication/application";

const getContactCustomerType = (contact: any): string => {
  const contactPayload = contact?.contact || contact;
  const extendedFields = contactPayload?.info?.extendedFields?.items || contactPayload?.extendedFields?.items || {};
  const customerFieldKey = Object.keys(extendedFields).find(key => key.includes('customer'));
  return customerFieldKey ? String(extendedFields[customerFieldKey]) : '';
};

const isWholesaleContactResponse = (contact: any): boolean => {
  return getContactCustomerType(contact) === 'wholesale';
};

export const WholesaleApplicationsView: FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'contacts'>('applications');
  const [activeView, setActiveView] = useState<'applications' | 'form'>('applications');
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    businessType: '',
    yearsInBusiness: '',
    annualRevenue: '',
    numberOfLocations: '',
    resaleCertificate: '',
    taxId: '',
    website: '',
    hearAboutUs: '',
    interestedProducts: [],
    estimatedMonthlyVolume: '',
    additionalInfo: '',
    status: 'pending',
    submittedDate: new Date().toISOString(),
    id: '',
  });

  const [applications, setApplications] = useState<FormData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<FormData | null>(null);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [applicationToApprove, setApplicationToApprove] = useState<string | null>(null);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [applicationToReject, setApplicationToReject] = useState<string | null>(null);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const [applicationToRevoke, setApplicationToRevoke] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});

  const fetchApplications = async () => {
    try {
      setIsLoadingData(true);

      const allItems: any[] = [];
      let skip = 0;
      const pageSize = 1000;

      while (true) {
        const results = await items
          .query(COLLECTION_NAME)
          .descending("submissionDate")
          .limit(pageSize)
          .skip(skip)
          .find();

        if (results.items.length === 0) {
          break;
        }

        allItems.push(...results.items);

        if (results.items.length < pageSize) {
          break;
        }

        skip += pageSize;
      }

      if (allItems.length > 0) {
        const transformedApplications: FormData[] = allItems.map((item: any) => ({
          id: item._id || '',
          businessName: item.businessName || '',
          contactName: item.contactName || '',
          email: item.email || '',
          phone: item.phone || '',
          businessType: item.businessType || '',
          yearsInBusiness: item.yearsInBusiness || '',
          annualRevenue: item.annualRevenue || '',
          numberOfLocations: item.numberOfLocations || '',
          resaleCertificate: item.resaleCertificate || '',
          taxId: item.taxId || '',
          website: item.website || '',
          hearAboutUs: item.hearAboutUs || '',
          interestedProducts: item.interestedProducts || [],
          estimatedMonthlyVolume: item.estimatedMonthlyVolume || '',
          additionalInfo: item.additionalInfo || '',
          status: item.status || 'pending',
          submittedDate: item.submissionDate || item._createdDate || new Date().toISOString(),
          memberId: item.memberId || undefined,
          contactId: item.contactId || undefined,
        }));

        const applicationsWithApiStatus = await Promise.all(
          transformedApplications.map(async (application) => {
            if (!application.contactId) {
              return application;
            }

            try {
              const contactResponse = await getContact(application.contactId);
              const customerType = getContactCustomerType(contactResponse);
              const contactIsWholesale = customerType === 'wholesale';
              const derivedStatus = contactIsWholesale ? 'approved' : application.status;
              return { ...application, status: derivedStatus };
            } catch {
              return application;
            }
          })
        );

        setApplications(applicationsWithApiStatus);
      } else {
        setApplications([]);
      }
    } catch {
      setApplications([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchApplications();
        await getCurrentMember();
      } catch {
        // Ignore initialization error
      }
    };
    initializeData();
  }, []);

  const handleFormSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      const dataToInsert = {
        businessName: data.businessName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        businessType: data.businessType,
        yearsInBusiness: data.yearsInBusiness,
        annualRevenue: data.annualRevenue,
        numberOfLocations: data.numberOfLocations,
        resaleCertificate: data.resaleCertificate,
        taxId: data.taxId,
        website: data.website,
        hearAboutUs: data.hearAboutUs,
        interestedProducts: data.interestedProducts,
        estimatedMonthlyVolume: data.estimatedMonthlyVolume,
        additionalInfo: data.additionalInfo,
      };

      const result = await createWholesaleApplication(dataToInsert);

      if (result['_id']) {
        setFormData({
          businessName: '', contactName: '', email: '', phone: '', businessType: '',
          yearsInBusiness: '', annualRevenue: '', numberOfLocations: '', resaleCertificate: '',
          taxId: '', website: '', hearAboutUs: '', interestedProducts: [], estimatedMonthlyVolume: '',
          additionalInfo: '', status: 'pending', submittedDate: '', id: ''
        });
        await fetchApplications();
        setActiveView('applications');
      }
    } catch (error) {
      dashboard.showToast({ message: error instanceof Error ? error.message : 'Unable to save application.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClick = (id: string) => {
    setApplicationToApprove(id);
    setShowConfirmApprove(true);
  };

  const updateApplicationStatus = async (id: string, status: 'approved' | 'rejected' | 'pending'): Promise<boolean> => {
    try {
      setLoadingActions(prev => ({ ...prev, [`${id}-${status}`]: true }));

      const application = applications.find(app => app.id === id);
      if (!application) {
        throw new Error('The application could not be found. Refresh the page and try again.');
      }

      const saved = await reviewWholesaleApplication(id, status);
      const contactId = typeof saved['contactId'] === 'string' ? saved['contactId'] : application.contactId;
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status, contactId } : app));
      if (selectedApplication?.id === id) {
        setSelectedApplication(prev => prev ? { ...prev, status, contactId } : null);
      }

      dashboard.showToast({
        message: status === 'approved' ? 'Customer approved for wholesale pricing.' : 'Wholesale access updated.',
        type: 'success',
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update the customer approval status.';
      dashboard.showToast({ message, type: 'error', timeout: 'normal' });
      return false;
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`${id}-${status}`];
        return newState;
      });
    }
  };

  const handleRejectClick = (id: string) => {
    setApplicationToReject(id);
    setShowConfirmReject(true);
  };

  const confirmApprove = async () => {
    if (applicationToApprove) {
      if (await updateApplicationStatus(applicationToApprove, 'approved')) {
        setApplicationToApprove(null);
        setShowConfirmApprove(false);
      }
    }
  };

  const handleRevokeClick = (id: string) => {
    setApplicationToRevoke(id);
    setShowConfirmRevoke(true);
  };

  const confirmReject = async () => {
    if (applicationToReject) {
      if (await updateApplicationStatus(applicationToReject, 'rejected')) {
        setApplicationToReject(null);
        setShowConfirmReject(false);
      }
    }
  };

  const confirmRevoke = async () => {
    if (applicationToRevoke) {
      if (await updateApplicationStatus(applicationToRevoke, 'pending')) {
        setApplicationToRevoke(null);
        setShowConfirmRevoke(false);
      }
    }
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const handleBulkApprove = async (ids: string[]) => {
    await Promise.all(ids.map(id => updateApplicationStatus(id, 'approved')));
  };

  const handleBulkReject = async (ids: string[]) => {
    await Promise.all(ids.map(id => updateApplicationStatus(id, 'rejected')));
  };

  if (activeView === 'form') {
    return (
      <Page>
        <PageHeader
          breadcrumb="Wholesale › Applications"
          title="New wholesale application"
          subtitle="Submit a wholesale application on a customer's behalf."
          actions={
            <Button variant="secondary" onClick={() => setActiveView('applications')} prefixIcon={<DashIcons.ChevronLeft size={16} />}>
              Back to applications
            </Button>
          }
        />
        <ApplicationForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
      </Page>
    );
  }

  const pendingCount = getApplicationsByStatus('pending').length;

  return (
    <Page>
      <PageHeader
        breadcrumb="Wholesale › Applications"
        title="Applications"
        subtitle="Review wholesale applications and manage which contacts get wholesale pricing."
      />

      <Tabs
        aria-label="Applications view"
        items={[
          { id: 'applications', title: pendingCount > 0 ? `Applications · ${pendingCount} pending` : 'Applications' },
          { id: 'contacts', title: 'Site contacts' },
        ]}
        activeId={activeTab}
        onClick={(item) => setActiveTab(item.id as any)}
      />

      {activeTab === 'applications' && (
        <Box direction="vertical" gap="20px">
          <StatsGrid applications={applications} getApplicationsByStatus={getApplicationsByStatus} />

          <ApplicationsList
            applications={applications}
            isLoading={isLoadingData}
            loadingActions={loadingActions}
            onView={setSelectedApplication}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
            onRevoke={handleRevokeClick}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
          />

          {selectedApplication && (
            <ApplicationModal
              application={selectedApplication}
              loadingActions={loadingActions}
              onClose={() => setSelectedApplication(null)}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
              onRevoke={handleRevokeClick}
            />
          )}

          {showConfirmApprove && (
            <ConfirmationModal
              title="Approve this application?"
              message="The applicant will get access to wholesale pricing."
              subMessage="If approval emails are on in Settings, they'll be notified."
              confirmText="Approve"
              tone="success"
              isLoading={applicationToApprove ? !!loadingActions[`${applicationToApprove}-approved`] : false}
              onConfirm={confirmApprove}
              onCancel={() => setShowConfirmApprove(false)}
            />
          )}

          {showConfirmReject && (
            <ConfirmationModal
              title="Reject this application?"
              message="The applicant won't get wholesale pricing."
              subMessage="You can approve the application later if you change your mind."
              confirmText="Reject"
              tone="danger"
              isLoading={applicationToReject ? !!loadingActions[`${applicationToReject}-rejected`] : false}
              onConfirm={confirmReject}
              onCancel={() => setShowConfirmReject(false)}
            />
          )}

          {showConfirmRevoke && (
            <ConfirmationModal
              title="Move back to pending?"
              message="The application's status will change back to pending."
              subMessage="You may want to let the applicant know about this change."
              confirmText="Move to pending"
              tone="warning"
              isLoading={applicationToRevoke ? !!loadingActions[`${applicationToRevoke}-pending`] : false}
              onConfirm={confirmRevoke}
              onCancel={() => setShowConfirmRevoke(false)}
            />
          )}
        </Box>
      )}

      {activeTab === 'contacts' && (
        <SiteContactsList />
      )}
    </Page>
  );
};
