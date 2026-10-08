import { useEffect, useRef, useState } from "react";
import {
  findExistingApplication,
  loadSiteMember,
  submitSiteApplication,
  type SiteMember,
} from "./wholesale-form";
import {
  errorMessage,
  text,
  type RecordData,
} from "../backend/wholesale/types";

export const emptyForm = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  businessType: "",
  yearsInBusiness: "",
  annualRevenue: "",
  numberOfLocations: "",
  resaleCertificate: "",
  taxId: "",
  website: "",
  hearAboutUs: "",
  interestedProducts: [] as string[],
  estimatedMonthlyVolume: "",
  additionalInfo: "",
};
export type ApplicationFormData = typeof emptyForm;

export function useWholesaleApplication(enabled: boolean) {
  const [data, setData] = useState(emptyForm);
  const [member, setMember] = useState<SiteMember | null>(null);
  const [application, setApplication] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const locked = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    setMember(null);
    setApplication(null);
    setSubmitted(false);
    setError("");
    setData(emptyForm);
    setLoading(enabled);
    if (enabled) {
      loadSiteMember()
        .then(async (member) => {
          if (generation.current !== current) return;
          const application = await findExistingApplication(member);
          if (generation.current !== current) return;
          setMember(member);
          setApplication(application);
          setData({
            ...emptyForm,
            email: member?.member.loginEmail || "",
            businessName: member?.contact?.company || "",
            contactName: [member?.contact?.firstName, member?.contact?.lastName]
              .filter(Boolean)
              .join(" "),
            phone: member?.contact?.phones?.[0]?.phone || "",
          });
        })
        .catch((error) => {
          if (generation.current === current) setError(errorMessage(error));
        })
        .finally(() => {
          if (generation.current === current) setLoading(false);
        });
    }
    return () => {
      generation.current++;
    };
  }, [enabled]);

  async function submit(input: ApplicationFormData = data) {
    if (
      !enabled ||
      loading ||
      application ||
      submitted ||
      locked.current ||
      error
    )
      return;
    locked.current = true;
    const current = generation.current;
    setSubmitting(true);
    try {
      const saved = await submitSiteApplication(input, member);
      if (generation.current === current) {
        setApplication(saved);
        setSubmitted(true);
      }
    } catch (error) {
      if (generation.current === current) setError(errorMessage(error));
    } finally {
      locked.current = false;
      if (generation.current === current) setSubmitting(false);
    }
  }
  return {
    data,
    setData,
    member,
    application,
    status: text(application?.["status"]),
    loading,
    submitting,
    submitted,
    error,
    submit,
  };
}
