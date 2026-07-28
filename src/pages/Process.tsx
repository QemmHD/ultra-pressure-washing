import {
  CalendarCheck2,
  Camera,
  ClipboardCheck,
  MessageSquareText,
} from "lucide-react";
import ContactCta from "../components/ContactCta";
import PageIntro from "../components/PageIntro";
import StructuredData from "../components/StructuredData";
import { getRoute, createRouteMeta } from "../data/routes";

const route = getRoute("/process");

export const meta = () => createRouteMeta(route);

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Request a Quote",
    description:
      "Call, text, or use the quote form to share your name, phone number, property address, preferred contact method, and the services you are considering.",
  },
  {
    icon: Camera,
    title: "Share Property Details",
    description:
      "Ultra may ask for photographs or additional information about surfaces, access, and areas of concern. An in-person evaluation may be scheduled when needed.",
  },
  {
    icon: ClipboardCheck,
    title: "Review the Scope",
    description:
      "Review the proposed work and ask questions about the cleaning approach, surfaces included, realistic expectations, and payment options.",
  },
  {
    icon: CalendarCheck2,
    title: "Schedule Approved Work",
    description:
      "Once the quote and scope are agreed on, schedule the exterior-cleaning work and follow the preparation guidance provided for the property.",
  },
] as const;

export default function Process() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 dark:bg-slate-900">
      <StructuredData route={route} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Clear from Start to Finish"
          title={route.h1}
          breadcrumb={route.breadcrumb}
          description="The process begins with property information, moves through a clear scope and scheduling, and ends with the approved exterior-cleaning work."
        />

        <section aria-labelledby="process-steps-heading" className="mt-16">
          <h2 id="process-steps-heading" className="sr-only">
            Four steps in the quote and service process
          </h2>
          <ol className="grid gap-8 md:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="absolute top-6 right-7 text-5xl font-black text-slate-500 dark:text-slate-400" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
                  {index + 1}. {title}
                </h2>
                <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="preparation-heading"
          className="mt-16 rounded-3xl border border-blue-200 bg-blue-50 p-8 md:p-12 dark:border-blue-900 dark:bg-blue-950/30"
        >
          <h2
            id="preparation-heading"
            className="text-3xl font-black text-slate-900 dark:text-white"
          >
            Property Preparation
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-700 dark:text-slate-200">
            Preparation can vary by service. Before scheduled work, confirm the
            instructions for your property and tell Ultra about sensitive,
            damaged, leaking, or difficult-to-access areas.
          </p>
          <ul className="mt-7 grid gap-4 sm:grid-cols-2">
            {[
              "Close windows and exterior doors.",
              "Move fragile outdoor items away from the work area.",
              "Keep pets safely away from active work areas.",
              "Identify damaged, leaking, or sensitive surfaces.",
              "Confirm access to approved work areas.",
              "Follow any property-specific instructions provided.",
            ].map((item) => (
              <li
                key={item}
                className="rounded-xl border border-blue-200 bg-white p-4 text-slate-700 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="request-details-heading"
          className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12 dark:border-slate-700 dark:bg-slate-800"
        >
          <h2
            id="request-details-heading"
            className="text-3xl font-black text-slate-900 dark:text-white"
          >
            What to Include in Your Request
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
            Clear starting information helps Ultra review the property without
            assuming that every quote needs an immediate site visit. Include
            the details you know, and the business can follow up if more
            information is needed.
          </p>
          <ul className="mt-7 grid gap-4 sm:grid-cols-2">
            {[
              "Your full property address.",
              "The exterior-cleaning services you are considering.",
              "Whether you prefer a call or text response.",
              "Photographs or access details when requested.",
            ].map((item) => (
              <li
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16">
          <ContactCta
            title="Ready to Start with a Quote?"
            description="Share the property address and requested services. Ultra responds within 24 hours and may ask for photographs or arrange an evaluation when needed."
          />
        </div>
      </div>
    </div>
  );
}
