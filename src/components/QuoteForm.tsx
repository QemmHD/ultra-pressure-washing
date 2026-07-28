import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SERVICES, type ServiceId } from "../data/services";
import {
  isLiveQuoteSubmissionAvailable,
  PREVIEW_QUOTE_MESSAGE,
  QuoteSubmissionError,
  submitQuoteRequest,
} from "../lib/quote-client";

interface QuoteFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  services: ServiceId[];
  contactPreference: "" | "call" | "text";
}

type FieldErrors = Partial<Record<keyof QuoteFormState, string>>;

const EMPTY_FORM: QuoteFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  services: [],
  contactPreference: "",
};

export default function QuoteForm() {
  const formId = useId();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<QuoteFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const formStartedAtRef = useRef("");
  const idempotencyKeyRef = useRef("");

  useEffect(() => {
    setIsHydrated(true);
    setIsLiveMode(isLiveQuoteSubmissionAvailable());
    formStartedAtRef.current = new Date().toISOString();
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  const inputClass =
    "min-h-12 w-full rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400";

  const updateField = <K extends keyof QuoteFormState>(
    field: K,
    value: QuoteFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (successMessage || submissionError) {
      idempotencyKeyRef.current = crypto.randomUUID();
      formStartedAtRef.current = new Date().toISOString();
    }
    setSuccessMessage(null);
    setSubmissionError(null);
  };

  const toggleService = (id: ServiceId) => {
    const services = form.services.includes(id)
      ? form.services.filter((serviceId) => serviceId !== id)
      : [...form.services, id];
    updateField("services", services);
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!form.firstName.trim()) next.firstName = "Enter your first name.";
    if (!form.lastName.trim()) next.lastName = "Enter your last name.";
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) {
      next.phone = "Enter a phone number.";
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      next.phone = "Enter a valid phone number.";
    }
    if (!form.address.trim()) {
      next.address = "Enter the property address.";
    } else if (form.address.trim().length < 5) {
      next.address = "Enter the full property address.";
    }
    if (form.services.length === 0) {
      next.services = "Select at least one service.";
    }
    if (!form.contactPreference) {
      next.contactPreference = "Choose call or text.";
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      next.email = "Enter a valid email address or leave it blank.";
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setSuccessMessage(null);
    setSubmissionError(null);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("input[aria-invalid='true']")
          ?.focus();
      });
      return;
    }

    if (!isLiveMode) {
      // Local development and deploy previews intentionally remain non-sending.
      setSuccessMessage(PREVIEW_QUOTE_MESSAGE);
      return;
    }

    if (!form.contactPreference) return;
    const contactPreference = form.contactPreference;

    setIsSubmitting(true);
    try {
      const message = await submitQuoteRequest({
        ...form,
        contactPreference,
        idempotencyKey:
          idempotencyKeyRef.current || crypto.randomUUID(),
        formStartedAt:
          formStartedAtRef.current || new Date().toISOString(),
        website,
      });
      setSuccessMessage(message);
    } catch (error) {
      if (error instanceof QuoteSubmissionError && error.fieldErrors) {
        setErrors(mapServerErrors(error.fieldErrors));
      }
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "We could not safely send your request. Please call or text us.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
      <h3 className="text-2xl font-black text-white">Request Your Quote</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {isLiveMode
          ? "Share the property details below. We respond within 24 hours."
          : "Preview form only. Complete the fields to test the experience; nothing will be sent or stored."}
      </p>

      {(Object.keys(errors).length > 0 || submissionError) && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100"
        >
          {submissionError ??
            "Please correct the highlighted fields before continuing."}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-4 text-emerald-100"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">{successMessage}</p>
            {!isLiveMode && (
              <p className="mt-1 text-sm text-emerald-200">
                Your information remains in this browser only until you leave
                or refresh the page.
              </p>
            )}
          </div>
        </div>
      )}

      <form
        className="mt-7 space-y-6"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={!isHydrated || isSubmitting}
        data-preview-form-ready={isHydrated ? "true" : "false"}
        data-quote-mode={isLiveMode ? "live" : "preview"}
      >
        <div
          className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor={`${formId}-website`}>Leave this field empty</label>
          <input
            id={`${formId}-website`}
            name="website"
            type="text"
            autoComplete="off"
            tabIndex={-1}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            disabled={!isHydrated || isSubmitting}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={`${formId}-first-name`}
            label="First name"
            error={errors.firstName}
            required
          >
            <input
              id={`${formId}-first-name`}
              name="firstName"
              autoComplete="given-name"
              disabled={!isHydrated}
              required
              maxLength={80}
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? `${formId}-first-name-error` : undefined
              }
              className={inputClass}
            />
          </Field>
          <Field
            id={`${formId}-last-name`}
            label="Last name"
            error={errors.lastName}
            required
          >
            <input
              id={`${formId}-last-name`}
              name="lastName"
              autoComplete="family-name"
              disabled={!isHydrated}
              required
              maxLength={80}
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={
                errors.lastName ? `${formId}-last-name-error` : undefined
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={`${formId}-phone`}
            label="Phone"
            error={errors.phone}
            required
          >
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              disabled={!isHydrated}
              required
              maxLength={24}
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? `${formId}-phone-error` : undefined
              }
              className={inputClass}
            />
          </Field>
          <Field
            id={`${formId}-email`}
            label="Email"
            hint="Optional"
            error={errors.email}
          >
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              disabled={!isHydrated}
              maxLength={160}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? `${formId}-email-error` : undefined
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          id={`${formId}-address`}
          label="Full property address"
          error={errors.address}
          required
        >
          <input
            id={`${formId}-address`}
            name="address"
            autoComplete="street-address"
            disabled={!isHydrated}
            required
            minLength={5}
            maxLength={200}
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={
              errors.address ? `${formId}-address-error` : undefined
            }
            className={inputClass}
          />
        </Field>

        <fieldset
          aria-invalid={Boolean(errors.services)}
          aria-describedby={
            errors.services ? `${formId}-services-error` : undefined
          }
        >
          <legend className="text-sm font-black uppercase tracking-wider text-white">
            Services <span className="text-blue-300">(required)</span>
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <label
                key={service.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400"
              >
                <input
                  type="checkbox"
                  name="services"
                  value={service.id}
                  disabled={!isHydrated}
                  checked={form.services.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  aria-invalid={Boolean(errors.services)}
                  className="h-5 w-5 accent-blue-600"
                />
                <span>{service.title}</span>
              </label>
            ))}
          </div>
          {errors.services && (
            <p
              id={`${formId}-services-error`}
              className="mt-2 text-sm font-semibold text-red-300"
            >
              {errors.services}
            </p>
          )}
        </fieldset>

        <fieldset
          aria-invalid={Boolean(errors.contactPreference)}
          aria-describedby={
            errors.contactPreference
              ? `${formId}-contact-preference-error`
              : undefined
          }
        >
          <legend className="text-sm font-black uppercase tracking-wider text-white">
            Preferred contact <span className="text-blue-300">(required)</span>
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["call", "text"] as const).map((preference) => (
              <label
                key={preference}
                className="flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 font-bold capitalize text-white transition hover:border-blue-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400"
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value={preference}
                  disabled={!isHydrated}
                  required
                  checked={form.contactPreference === preference}
                  onChange={() =>
                    updateField("contactPreference", preference)
                  }
                  aria-invalid={Boolean(errors.contactPreference)}
                  className="h-5 w-5 accent-blue-600"
                />
                {preference}
              </label>
            ))}
          </div>
          {errors.contactPreference && (
            <p
              id={`${formId}-contact-preference-error`}
              className="mt-2 text-sm font-semibold text-red-300"
            >
              {errors.contactPreference}
            </p>
          )}
        </fieldset>

        <button
          type="submit"
          disabled={!isHydrated || isSubmitting}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 outline-none transition hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900"
        >
          {isSubmitting
            ? "Sending Safely…"
            : isLiveMode
              ? "Request My Quote"
              : "Test Quote Form"}{" "}
          {!isSubmitting && (
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}

function mapServerErrors(
  fieldErrors: Record<string, string[]>,
): FieldErrors {
  const mapped: FieldErrors = {};
  for (const key of Object.keys(fieldErrors)) {
    if (
      key === "firstName" ||
      key === "lastName" ||
      key === "phone" ||
      key === "email" ||
      key === "address" ||
      key === "services" ||
      key === "contactPreference"
    ) {
      mapped[key] = "Please review this field.";
    }
  }
  return mapped;
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-black uppercase tracking-wider text-white"
      >
        {label}{" "}
        <span className="font-semibold normal-case tracking-normal text-blue-300">
          {required ? "(required)" : hint ? `(${hint})` : ""}
        </span>
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-sm font-semibold text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
