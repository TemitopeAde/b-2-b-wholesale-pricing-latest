import React, { useState, type FormEvent } from "react";
import classNames from "classnames";
import { useIsEditMode } from "@wix/react-component-utils";
import {
  fieldLabels,
  validationMessages,
} from "../../../../site/wholesale-translations";
import { validateSiteForm } from "../../../../site/wholesale-form";
import {
  emptyForm,
  useWholesaleApplication,
  type ApplicationFormData,
} from "../../../../site/use-wholesale-application";
import type { WholesaleRequestFormProps } from "./wholesale-request-form.props";
import styles from "./wholesale-request-form.module.css";

type Field = {
  key: Exclude<keyof ApplicationFormData, "interestedProducts">;
  label: string;
  visible?: boolean;
  type?: string;
  options?: string[];
};

export default function WholesaleRequestForm(props: WholesaleRequestFormProps) {
  const {
    id,
    className,
    direction,
    a11y,
    elementProps,
    language = "en",
    title,
    benefitsText,
    submitButtonText,
    successTitle,
    successMessage,
    productCategoriesList = "",
    hearAboutUsList = "",
    onClick,
    onMouseIn,
    onMouseOut,
    onFocus,
    onBlur,
    onChange,
  } = props;
  const editMode = useIsEditMode();
  const state = useWholesaleApplication(!editMode);
  const [errors, setErrors] = useState<{
    contactName?: string;
    email?: string;
    phone?: string;
  }>({});
  const labels = fieldLabels[language] || fieldLabels["en"]!;
  const validation = validationMessages[language] || validationMessages["en"]!;
  const parts = elementProps;
  const options = (list: string) =>
    list
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  const groups: {
    label: string;
    header?: boolean;
    fields: Field[];
    products?: boolean;
  }[] = [
    {
      label: props.businessInfoSectionLabel || labels["businessInfo"]!,
      header: props.showBusinessInfoHeader,
      fields: [
        {
          key: "businessName",
          visible: props.showBusinessName,
          label: props.businessNameLabel || labels["businessName"]!,
        },
        {
          key: "businessType",
          visible: props.showBusinessType,
          label: props.businessTypeLabel || labels["businessType"]!,
          options: [
            "Retail Store",
            "Online Retailer",
            "Distributor",
            "Reseller",
            "Restaurant/Food Service",
            "Construction Company",
            "Manufacturing",
            "Other",
          ],
        },
        {
          key: "yearsInBusiness",
          visible: props.showYearsInBusiness,
          label: props.yearsInBusinessLabel || labels["yearsInBusiness"]!,
          options: [
            "Less than 1 year",
            "1-2 years",
            "3-5 years",
            "6-10 years",
            "11-20 years",
            "More than 20 years",
          ],
        },
        {
          key: "annualRevenue",
          visible: props.showAnnualRevenue,
          label: props.annualRevenueLabel || labels["annualRevenue"]!,
          options: [
            "Under $100K",
            "$100K - $500K",
            "$500K - $1M",
            "$1M - $5M",
            "$5M - $10M",
            "Over $10M",
          ],
        },
        {
          key: "numberOfLocations",
          visible: props.showNumberOfLocations,
          label: props.numberOfLocationsLabel || labels["numberOfLocations"]!,
          type: "number",
        },
        {
          key: "website",
          visible: props.showWebsite,
          label: props.websiteLabel || labels["website"]!,
          type: "url",
        },
      ],
    },
    {
      label: props.contactInfoSectionLabel || labels["contactInfo"]!,
      header: props.showContactInfoHeader,
      fields: [
        {
          key: "contactName",
          visible: props.showContactName,
          label: props.contactNameLabel || labels["contactName"]!,
        },
        {
          key: "email",
          visible: props.showEmail,
          label: props.emailLabel || labels["email"]!,
          type: "email",
        },
        {
          key: "phone",
          visible: props.showPhone,
          label: props.phoneLabel || labels["phone"]!,
          type: "tel",
        },
      ],
    },
    {
      label: props.credentialsSectionLabel || labels["credentials"]!,
      header: props.showCredentialsHeader,
      fields: [
        {
          key: "resaleCertificate",
          visible: props.showResaleCertificate,
          label: props.resaleCertificateLabel || labels["resaleCertificate"]!,
        },
        {
          key: "taxId",
          visible: props.showTaxId,
          label: props.taxIdLabel || labels["taxId"]!,
        },
      ],
    },
    {
      label: props.productInterestSectionLabel || labels["productInterest"]!,
      header: props.showProductInterestHeader,
      products: props.showProductCategories,
      fields: [
        {
          key: "estimatedMonthlyVolume",
          visible: props.showEstimatedVolume,
          label: props.estimatedVolumeLabel || labels["estimatedVolume"]!,
          options: [
            "Under $1,000",
            "$1,000 - $5,000",
            "$5,000 - $10,000",
            "$10,000 - $25,000",
            "$25,000 - $50,000",
            "Over $50,000",
          ],
        },
      ],
    },
    {
      label: props.additionalInfoSectionLabel || labels["additionalInfo"]!,
      header: props.showAdditionalInfoHeader,
      fields: [
        {
          key: "hearAboutUs",
          visible: props.showHearAboutUs,
          label: props.hearAboutUsLabel || labels["hearAboutUs"]!,
          options: options(hearAboutUsList),
        },
        {
          key: "additionalInfo",
          visible: props.showAdditionalInfo,
          label:
            props.additionalInfoFieldLabel || labels["additionalInfoField"]!,
          type: "textarea",
        },
      ],
    },
  ];

  function update(key: Field["key"], value: string) {
    state.setData((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editMode) return;
    const errors = validateSiteForm(
      state.data,
      {
        contactName: props.showContactName !== false,
        email: props.showEmail !== false,
        phone: props.showPhone !== false,
      },
      validation,
    );
    setErrors(errors);
    if (Object.keys(errors).length) return;
    const visibleKeys = groups.flatMap((group) =>
      group.fields.filter((field) => field.visible).map((field) => field.key),
    );
    const submitted = { ...emptyForm };
    for (const key of visibleKeys) submitted[key] = state.data[key];
    if (props.showProductCategories)
      submitted.interestedProducts = state.data.interestedProducts;
    await state.submit(submitted);
  }
  const statusTitle = state.submitted
    ? successTitle || labels["successTitle"]
    : state.status === "approved"
      ? labels["alreadyApprovedTitle"]
      : state.status === "rejected"
        ? labels["rejectedTitle"]
        : labels["pendingTitle"];
  const statusMessage = state.submitted
    ? successMessage || labels["pendingMsg"]
    : state.status === "approved"
      ? labels["alreadyApprovedMsg"]
      : state.status === "rejected"
        ? labels["rejectedMsg"]
        : labels["pendingMsg"];
  const showStatus = Boolean(state.application) && !editMode;
  const formError =
    state.error ||
    (!editMode && !state.loading && !state.member
      ? validation["loginRequired"]
      : "");
  return (
    <div
      id={id}
      dir={direction}
      lang={language}
      aria-label={a11y?.ariaLabel}
      className={classNames(
        "wholesale-request-form",
        styles.root,
        styles.fallbackDirection,
        className,
      )}
    >
      <h2
        {...parts?.heading}
        className={classNames(
          "wholesale-request-form-heading",
          styles.heading,
          parts?.heading?.className,
        )}
      >
        {title || labels["formTitle"]}
      </h2>
      <p
        {...parts?.description}
        hidden={!benefitsText}
        className={classNames(
          "wholesale-request-form-description",
          styles.description,
          parts?.description?.className,
        )}
      >
        {benefitsText}
      </p>
      <div
        {...parts?.status}
        role="status"
        hidden={!showStatus}
        className={classNames(
          "wholesale-request-form-status",
          styles.status,
          parts?.status?.className,
        )}
      >
        <h3
          {...parts?.statusHeading}
          className={classNames(
            "wholesale-request-form-status-heading",
            styles.statusHeading,
            parts?.statusHeading?.className,
          )}
        >
          {statusTitle}
        </h3>
        <p
          {...parts?.statusMessage}
          className={classNames(
            "wholesale-request-form-status-message",
            styles.statusMessage,
            parts?.statusMessage?.className,
          )}
        >
          {statusMessage}
        </p>
      </div>
      <form
        hidden={showStatus}
        onSubmit={submit}
        onChange={onChange}
        onMouseEnter={onMouseIn}
        onMouseLeave={onMouseOut}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-busy={state.loading || state.submitting}
        className={styles.form}
      >
        {groups.map((group, index) => {
          const showGroup = Boolean(
            group.products || group.fields.some((field) => field.visible),
          );
          return (
            <fieldset
              key={index}
              hidden={!showGroup}
              disabled={
                state.loading || state.submitting || showStatus || !showGroup
              }
              className={styles.section}
            >
              <legend
                {...parts?.sectionHeading}
                hidden={group.header === false}
                className={classNames(
                  "wholesale-request-form-section-heading",
                  styles.sectionHeading,
                  parts?.sectionHeading?.className,
                )}
              >
                {group.label}
              </legend>
              {group.fields.map((field) => {
                const fieldId = `${id}-${field.key}`;
                const error = errors[field.key as keyof typeof errors];
                const required = ["contactName", "email", "phone"].includes(
                  field.key,
                );
                return (
                  <div
                    key={field.key}
                    hidden={!field.visible}
                    className={styles.field}
                  >
                    <label
                      {...parts?.fieldLabel}
                      htmlFor={fieldId}
                      className={classNames(
                        "wholesale-request-form-field-label",
                        styles.fieldLabel,
                        parts?.fieldLabel?.className,
                      )}
                    >
                      {field.label}
                      {required ? " *" : ""}
                    </label>
                    {field.options ? (
                      <select
                        {...parts?.select}
                        id={fieldId}
                        disabled={!field.visible}
                        value={state.data[field.key]}
                        onChange={(event) =>
                          update(field.key, event.target.value)
                        }
                        className={classNames(
                          "wholesale-request-form-select",
                          styles.select,
                          parts?.select?.className,
                        )}
                      >
                        <option value="">{labels["selectOption"]}</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        {...parts?.textarea}
                        id={fieldId}
                        disabled={!field.visible}
                        value={state.data[field.key]}
                        onChange={(event) =>
                          update(field.key, event.target.value)
                        }
                        className={classNames(
                          "wholesale-request-form-textarea",
                          styles.textarea,
                          parts?.textarea?.className,
                        )}
                      />
                    ) : (
                      <input
                        {...parts?.input}
                        id={fieldId}
                        type={field.type || "text"}
                        required={required && Boolean(field.visible)}
                        disabled={!field.visible}
                        readOnly={field.key === "email"}
                        autoComplete={
                          field.key === "contactName"
                            ? "name"
                            : field.key === "email"
                              ? "email"
                              : field.key === "phone"
                                ? "tel"
                                : "off"
                        }
                        value={state.data[field.key]}
                        onChange={(event) =>
                          update(field.key, event.target.value)
                        }
                        aria-invalid={Boolean(error)}
                        aria-describedby={
                          error ? `${fieldId}-error` : undefined
                        }
                        className={classNames(
                          "wholesale-request-form-input",
                          styles.input,
                          parts?.input?.className,
                        )}
                      />
                    )}
                    <p
                      {...parts?.error}
                      id={`${fieldId}-error`}
                      role="alert"
                      hidden={!error}
                      className={classNames(
                        "wholesale-request-form-error",
                        styles.error,
                        parts?.error?.className,
                      )}
                    >
                      {error}
                    </p>
                  </div>
                );
              })}
              {group.products !== undefined && (
                <fieldset
                  hidden={!group.products}
                  disabled={!group.products}
                  className={styles.productOptions}
                >
                  <legend>
                    {props.productCategoriesLabel ||
                      labels["productCategories"]}
                  </legend>
                  {options(productCategoriesList).map((category, index) => (
                    <label
                      key={category}
                      {...parts?.productOption}
                      className={classNames(
                        "wholesale-request-form-product-option",
                        styles.productOption,
                        parts?.productOption?.className,
                      )}
                    >
                      <input
                        {...parts?.productCheckbox}
                        id={`${id}-category-${index}`}
                        type="checkbox"
                        checked={state.data.interestedProducts.includes(
                          category,
                        )}
                        onChange={(event) =>
                          state.setData((previous) => ({
                            ...previous,
                            interestedProducts: event.target.checked
                              ? [...previous.interestedProducts, category]
                              : previous.interestedProducts.filter(
                                  (value) => value !== category,
                                ),
                          }))
                        }
                        className={classNames(
                          "wholesale-request-form-product-checkbox",
                          styles.productCheckbox,
                          parts?.productCheckbox?.className,
                        )}
                      />
                      {category}
                    </label>
                  ))}
                </fieldset>
              )}
            </fieldset>
          );
        })}
        <p
          {...parts?.error}
          role="alert"
          hidden={!formError}
          className={classNames(
            "wholesale-request-form-error",
            styles.error,
            parts?.error?.className,
          )}
        >
          {formError}
        </p>
        <button
          {...parts?.submitButton}
          onClick={onClick}
          type="submit"
          disabled={
            editMode ||
            state.loading ||
            state.submitting ||
            !state.member ||
            Boolean(state.error)
          }
          className={classNames(
            "wholesale-request-form-submit-button",
            styles.submitButton,
            parts?.submitButton?.className,
          )}
        >
          {state.submitting
            ? labels["submitting"]
            : submitButtonText || labels["submitButton"]}
        </button>
      </form>
    </div>
  );
}
