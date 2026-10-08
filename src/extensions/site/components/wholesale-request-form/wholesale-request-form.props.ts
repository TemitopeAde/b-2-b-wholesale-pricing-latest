import type { A11y, Direction } from "@wix/editor-react-types";
import type {
  MouseEventHandler,
  FocusEventHandler,
  ChangeEventHandler,
} from "react";

type Part = { className?: string };
export type WholesaleRequestFormProps = {
  id: string;
  className?: string;
  direction?: Direction;
  a11y?: A11y;
  title?: string;
  language?: string;
  benefitsText?: string;
  submitButtonText?: string;
  successTitle?: string;
  successMessage?: string;
  productCategoriesList?: string;
  hearAboutUsList?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseIn?: MouseEventHandler<HTMLElement>;
  onMouseOut?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  onChange?: ChangeEventHandler<HTMLFormElement>;
  showBusinessName?: boolean;
  showBusinessType?: boolean;
  showYearsInBusiness?: boolean;
  showAnnualRevenue?: boolean;
  showNumberOfLocations?: boolean;
  showWebsite?: boolean;
  showContactName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showResaleCertificate?: boolean;
  showTaxId?: boolean;
  showProductCategories?: boolean;
  showEstimatedVolume?: boolean;
  showHearAboutUs?: boolean;
  showAdditionalInfo?: boolean;
  businessNameLabel?: string;
  businessTypeLabel?: string;
  yearsInBusinessLabel?: string;
  annualRevenueLabel?: string;
  numberOfLocationsLabel?: string;
  websiteLabel?: string;
  contactNameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  resaleCertificateLabel?: string;
  taxIdLabel?: string;
  productCategoriesLabel?: string;
  estimatedVolumeLabel?: string;
  hearAboutUsLabel?: string;
  additionalInfoFieldLabel?: string;
  businessInfoSectionLabel?: string;
  contactInfoSectionLabel?: string;
  credentialsSectionLabel?: string;
  productInterestSectionLabel?: string;
  additionalInfoSectionLabel?: string;
  showBusinessInfoHeader?: boolean;
  showContactInfoHeader?: boolean;
  showCredentialsHeader?: boolean;
  showProductInterestHeader?: boolean;
  showAdditionalInfoHeader?: boolean;
  elementProps?: {
    heading?: Part;
    description?: Part;
    sectionHeading?: Part;
    fieldLabel?: Part;
    input?: Part;
    select?: Part;
    textarea?: Part;
    productOption?: Part;
    productCheckbox?: Part;
    status?: Part;
    statusHeading?: Part;
    statusMessage?: Part;
    error?: Part;
    submitButton?: Part;
  };
};

export const defaultProps = {
  language: "en",
  benefitsText: "Apply for exclusive wholesale pricing and bulk discounts.",
  productCategoriesList:
    "Hardware & Tools\nBuilding Materials\nElectrical & Lighting\nPlumbing",
  hearAboutUsList: "Search Engine\nSocial Media\nReferral\nTrade Show\nOther",
  showBusinessName: false,
  showBusinessType: false,
  showYearsInBusiness: false,
  showAnnualRevenue: false,
  showNumberOfLocations: false,
  showWebsite: false,
  showContactName: true,
  showEmail: true,
  showPhone: true,
  showResaleCertificate: false,
  showTaxId: false,
  showProductCategories: false,
  showEstimatedVolume: false,
  showHearAboutUs: false,
  showAdditionalInfo: false,
  showBusinessInfoHeader: true,
  showContactInfoHeader: true,
  showCredentialsHeader: true,
  showProductInterestHeader: true,
  showAdditionalInfoHeader: true,
} satisfies Omit<WholesaleRequestFormProps, "id" | "className">;
