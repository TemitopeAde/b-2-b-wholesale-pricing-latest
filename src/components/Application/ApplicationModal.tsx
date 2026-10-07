import React, { type FC, useState, useEffect } from 'react';
import { type FormData } from '../Application';
import { isContactWholesale } from '../../backend/pricing.client';
import { Badge, type BadgeTone, Box, Button, Detail, Details, Modal, Notice } from '../ui';
import { DashIcons } from '../Dashboard/icons';

interface ApplicationModalProps {
  application: FormData;
  loadingActions: { [key: string]: boolean };
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRevoke: (id: string) => void;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (!dateString || isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const websiteHref = (website: string) => (/^https?:\/\//i.test(website) ? website : `https://${website}`);

export const ApplicationModal: FC<ApplicationModalProps> = ({
  application,
  loadingActions,
  onClose,
  onApprove,
  onReject,
  onRevoke
}) => {
  const [isAlreadyWholesale, setIsAlreadyWholesale] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (application.contactId) {
        try {
          const result = await isContactWholesale(application.contactId);
          setIsAlreadyWholesale(result);
        } catch {
          // Ignore error
        }
      }
    };
    checkStatus();
  }, [application.contactId]);

  const id = application.id;
  const approving = !!loadingActions[`${id}-approved`];
  const rejecting = !!loadingActions[`${id}-rejected`];
  const resetting = !!loadingActions[`${id}-pending`];
  const busy = approving || rejecting || resetting;
  const status = application.status;

  const interested = Array.isArray(application.interestedProducts)
    ? application.interestedProducts.join(', ')
    : (application.interestedProducts as unknown as string) || '';

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={busy}>Close</Button>
      {status === 'approved' && (
        <Button variant="secondary" onClick={() => onRevoke(id)} loading={resetting} disabled={busy} prefixIcon={<DashIcons.Undo size={16} />}>
          Revoke approval
        </Button>
      )}
      {status === 'rejected' && (
        <Button variant="secondary" onClick={() => onRevoke(id)} loading={resetting} disabled={busy} prefixIcon={<DashIcons.Undo size={16} />}>
          Reset to pending
        </Button>
      )}
      {(status === 'pending' || status === 'approved') && (
        <Button variant="dangerSecondary" onClick={() => onReject(id)} loading={rejecting} disabled={busy} prefixIcon={<DashIcons.X size={16} />}>
          Reject
        </Button>
      )}
      {(status === 'pending' || status === 'rejected') && (
        <Button variant="success" onClick={() => onApprove(id)} loading={approving} disabled={busy} prefixIcon={<DashIcons.Check size={16} />}>
          Approve
        </Button>
      )}
    </>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={busy}
      size="large"
      title={application.businessName || application.contactName || 'Application'}
      subtitle={
        <Box verticalAlign="middle" gap="8px" wrap>
          <Badge tone={STATUS_TONE[status] || 'neutral'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
          {formatDate(application.submittedDate) && <span>Submitted {formatDate(application.submittedDate)}</span>}
        </Box>
      }
      footer={footer}
    >
      <Box direction="vertical" gap="16px">
        {isAlreadyWholesale && status === 'pending' && (
          <Notice tone="info" title="Already has wholesale access">
            Rejecting this application won't remove that access.
          </Notice>
        )}

        <Details>
          <Detail label="Contact">{application.contactName}</Detail>
          <Detail label="Email">
            {application.email && <a href={`mailto:${application.email}`} style={{ color: 'var(--wh-accent)' }}>{application.email}</a>}
          </Detail>
          <Detail label="Phone">{application.phone}</Detail>
          <Detail label="Website">
            {application.website && (
              <a href={websiteHref(application.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wh-accent)' }}>
                {application.website}
              </a>
            )}
          </Detail>
          <Detail label="Business type">{application.businessType}</Detail>
          <Detail label="Years in business">{application.yearsInBusiness}</Detail>
          <Detail label="Annual revenue">{application.annualRevenue}</Detail>
          <Detail label="Locations">{application.numberOfLocations}</Detail>
          <Detail label="Tax ID">{application.taxId}</Detail>
          <Detail label="Resale certificate">{application.resaleCertificate}</Detail>
          <Detail label="Monthly volume">{application.estimatedMonthlyVolume}</Detail>
          <Detail label="Heard about us">{application.hearAboutUs}</Detail>
          <Detail label="Interested products" full>{interested}</Detail>
          {application.additionalInfo && (
            <Detail label="Additional information" full>
              <span style={{ whiteSpace: 'pre-wrap' }}>{application.additionalInfo}</span>
            </Detail>
          )}
        </Details>
      </Box>
    </Modal>
  );
};
