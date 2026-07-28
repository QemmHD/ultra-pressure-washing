import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import ContactCta from "../components/ContactCta";
import PageIntro from "../components/PageIntro";
import StructuredData from "../components/StructuredData";
import { getRoute, createRouteMeta } from "../data/routes";
import { SERVICE_LIST_TEXT } from "../data/services";
import { SITE } from "../data/site";

const route = getRoute("/faq");

export const meta = () => createRouteMeta(route);

const FAQS = [
  {
    id: "pressure-vs-soft-washing",
    question: "What is the difference between pressure washing and soft washing?",
    answer:
      "Pressure washing uses controlled water pressure for suitable hard surfaces. Soft washing uses a lower-pressure application for surfaces that call for a gentler approach. Ultra selects the cleaning method after considering the surface, its condition, and the buildup present.",
  },
  {
    id: "offered-services",
    question: "Which exterior-cleaning services are available?",
    answer:
      `Ultra offers ${SERVICE_LIST_TEXT}. Each is available as a standalone service or an add-on.`,
  },
  {
    id: "service-areas",
    question: "Which areas do you serve?",
    answer:
      "Ultra is based in Sevierville and serves East Tennessee. Confirmed active and priority areas include Sevier County, Sevierville, Pigeon Forge, Gatlinburg, Kodak, Dandridge, Knox County, Seymour, and Wears Valley, plus surrounding East Tennessee communities.",
  },
  {
    id: "quote-process",
    question: "How does the quote process work?",
    answer:
      "Start by calling, texting, or submitting property details through the quote form. Ultra may request photographs or additional information. An in-person evaluation may be scheduled when the property or requested scope needs a closer look.",
  },
  {
    id: "response-time",
    question: "How quickly will I receive a response?",
    answer:
      "Ultra responds within 24 hours. Customers may call, text, or request a quote anytime.",
  },
  {
    id: "licensed-insured",
    question: "Is Ultra Pressure Washing licensed and insured?",
    answer:
      "Yes. Ultra Pressure Washing & Window Cleaning is licensed and insured.",
  },
  {
    id: "payment-methods",
    question: "Which payment methods are accepted?",
    answer: `Accepted payment methods are ${SITE.payments.join(", ")}.`,
  },
  {
    id: "preparation",
    question: "How should I prepare the property?",
    answer:
      "Preparation depends on the service. Close windows and doors, move fragile outdoor items away from the work area, keep pets away from active work areas, and identify damaged, leaking, or sensitive surfaces. Follow any property-specific instructions provided before service.",
  },
  {
    id: "stain-results",
    question: "Will every stain or discoloration come out?",
    answer:
      "Not always. Results depend on the surface, its age and condition, and the type and depth of staining or buildup. Ultra will discuss realistic expectations for visible problem areas before approved work begins.",
  },
  {
    id: "customer-home",
    question: "Do I need to be home during the work?",
    answer:
      "Property access and attendance needs can vary by job. Confirm those details when scheduling so Ultra can explain what is needed for the approved work area.",
  },
] as const;

export default function FAQ() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 dark:bg-slate-900">
      <StructuredData route={route} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Straightforward Answers"
          title={route.h1}
          breadcrumb={route.breadcrumb}
          description="Learn about services, quotes, preparation, service areas, payment methods, and realistic cleaning expectations."
        />

        <section aria-labelledby="faq-list-heading" className="mt-16 space-y-4">
          <h2 id="faq-list-heading" className="sr-only">
            Frequently asked questions and answers
          </h2>
          {FAQS.map((faq) => (
            <FaqItem key={faq.id} {...faq} />
          ))}
        </section>

        <div className="mt-16">
          <ContactCta
            title="Still Have a Question?"
            description="Call, text, or request a quote anytime. Ultra responds within 24 hours."
          />
        </div>
      </div>
    </div>
  );
}
function FaqItem({
  id,
  question,
  answer,
}: {
  id: string;
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonId = `faq-button-${id}`;
  const panelId = `faq-panel-${id}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-16 w-full items-center justify-between gap-5 px-6 py-5 text-left text-lg font-black text-slate-900 outline-none transition hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-8 dark:text-white dark:hover:text-blue-400"
        >
          <span>{question}</span>
          {isOpen ? (
            <Minus className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          ) : (
            <Plus className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          )}
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="px-6 pb-6 sm:px-8"
      >
        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
          {answer}
        </p>
      </div>
    </article>
  );
}
