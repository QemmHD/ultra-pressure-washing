import { CheckCircle2, Sparkles } from "lucide-react";
import ContactCta from "../components/ContactCta";
import PageIntro from "../components/PageIntro";
import ServiceCard from "../components/ServiceCard";
import StructuredData from "../components/StructuredData";
import { getRoute, createRouteMeta } from "../data/routes";
import { SERVICES } from "../data/services";
import { SITE } from "../data/site";

const route = getRoute("/services");

export const meta = () => createRouteMeta(route);

export default function Services() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 dark:bg-slate-900">
      <StructuredData route={route} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="What We Do"
          title={route.h1}
          breadcrumb={route.breadcrumb}
          description="Choose from eight confirmed exterior-cleaning services for homes, rental properties, and businesses in East Tennessee. Each service is available on its own or as an add-on."
        />

        <section
          aria-labelledby="services-list-heading"
          className="mt-16"
        >
          <h2 id="services-list-heading" className="sr-only">
            Available exterior cleaning services
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {SERVICES.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                priority={index === 0}
              />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="quote-expectations-heading"
          className="mt-20 grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-[0.8fr_1.2fr] md:p-12 dark:border-slate-700 dark:bg-slate-800"
        >
          <div>
            <Sparkles className="h-10 w-10 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2
              id="quote-expectations-heading"
              className="mt-5 text-3xl font-black text-slate-900 dark:text-white"
            >
              What to Expect
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
              A quote starts with the property details and services you share.
              Ultra may request photographs or schedule an in-person evaluation
              when the property or scope needs a closer look.
            </p>
          </div>
          <ul className="grid content-center gap-4 sm:grid-cols-2">
            {[
              SITE.trust,
              SITE.responseTime,
              SITE.ownership,
              "Cleaning methods selected for the surface",
              "Realistic expectations discussed before work",
              `Payment options: ${SITE.payments.join(", ")}`,
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <aside
          aria-labelledby="services-offer-heading"
          className="mt-12 rounded-3xl border border-amber-300 bg-amber-50 p-8 text-center shadow-sm dark:border-amber-700 dark:bg-amber-950/30"
        >
          <p className="font-black tracking-widest text-amber-700 uppercase dark:text-amber-300">
            Special Offer
          </p>
          <h2
            id="services-offer-heading"
            className="mt-3 text-2xl font-black text-slate-900 md:text-3xl dark:text-white"
          >
            {SITE.offer}
          </h2>
        </aside>

        <div className="mt-16">
          <ContactCta />
        </div>
      </div>
    </div>
  );
}
