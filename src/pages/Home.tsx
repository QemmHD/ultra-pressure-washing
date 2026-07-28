import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Images,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import BeforeAfterCard from "../components/BeforeAfterCard";
import HeroImage from "../components/HeroImage";
import QuoteForm from "../components/QuoteForm";
import ServiceCard from "../components/ServiceCard";
import StructuredData from "../components/StructuredData";
import { SERVICE_AREAS } from "../data/locations";
import { FEATURED_PROJECTS } from "../data/projects";
import { getRoute, createRouteMeta } from "../data/routes";
import { SERVICES, SERVICE_LIST_TEXT } from "../data/services";
import { SITE, SITE_LINKS } from "../data/site";

const route = getRoute("/");

export const meta = () => createRouteMeta(route);

const TRUST_ITEMS = [
  {
    icon: CheckCircle2,
    title: "8 Exterior Cleaning Services",
    detail: "Standalone or add-on options",
  },
  {
    icon: Sparkles,
    title: "Owner-Operated Since 2025",
    detail: "Locally owned in Sevierville",
  },
  {
    icon: MapPin,
    title: "Based in Sevierville",
    detail: "Serving East Tennessee",
  },
  {
    icon: Clock3,
    title: "Response Within 24 Hours",
    detail: "Call, text, or request a quote",
  },
] as const;

export default function Home() {
  return (
    <div className="bg-slate-50 transition-colors dark:bg-slate-900">
      <StructuredData route={route} includeBreadcrumb={false} />

      <section className="relative flex min-h-screen items-center overflow-hidden pt-32 pb-20 text-white">
        <div className="absolute inset-0">
          <HeroImage
            priority
            className="h-full w-full object-cover object-[center_38%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-900/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/95 sm:to-slate-950/50" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 flex flex-wrap gap-3">
              {[
                { icon: ShieldCheck, text: "Licensed & Insured" },
                { icon: Sparkles, text: "Owner-Operated Since 2025" },
                { icon: MapPin, text: "Sevierville & East Tennessee" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-100 uppercase backdrop-blur-sm sm:text-sm"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {text}
                </span>
              ))}
            </div>

            <h1 className="max-w-4xl text-4xl leading-[1.05] font-black tracking-tight text-white sm:text-5xl md:text-7xl">
              {SITE.mottoLines[0]}{" "}
              <span className="mt-1 block bg-gradient-to-r from-blue-400 to-blue-100 bg-clip-text text-transparent">
                {SITE.mottoLines[1]}
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed font-semibold text-white sm:text-2xl">
              {SITE.heroSupportingLine}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              {SERVICE_LIST_TEXT}.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/#quote-form"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-sm font-black tracking-widest text-white uppercase shadow-xl shadow-blue-600/25 outline-none transition hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Request a Quote <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href={SITE_LINKS.phone}
                className="inline-flex min-h-14 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-8 py-4 text-sm font-black tracking-widest text-white uppercase backdrop-blur-sm outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              >
                Call {SITE.phone}
              </a>
            </div>

            <div className="mt-10 grid max-w-3xl gap-3 text-sm font-semibold text-slate-200 sm:grid-cols-2">
              {[
                SITE.responseTime,
                SITE.availability,
                "Property details and photos accepted for quotes",
                "In-person evaluations arranged when needed",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 inline-block max-w-2xl rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-5 shadow-xl backdrop-blur-sm">
              <p className="flex items-center gap-2 text-sm font-black tracking-widest text-amber-300 uppercase">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Special Offer
              </p>
              <p className="mt-2 text-lg font-bold text-white">{SITE.offer}</p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="trust-heading"
        className="border-b border-slate-800 bg-slate-950 py-12"
      >
        <h2 id="trust-heading" className="sr-only">
          Business information
        </h2>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {TRUST_ITEMS.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="text-center">
              <Icon className="mx-auto h-7 w-7 text-blue-400" aria-hidden="true" />
              <p className="mt-3 font-black text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="services"
        aria-labelledby="services-heading"
        className="py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our Services"
            id="services-heading"
            title="Professional Exterior Cleaning for East Tennessee"
          >
            Every confirmed service is available as a standalone job or as an
            add-on. The quote is based on the property, surfaces, access, and
            requested scope.
          </SectionHeading>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {SERVICES.slice(0, 4).map((service) => (
              <ServiceCard key={service.id} service={service} compact />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/services"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-7 py-3 font-black tracking-wider text-white uppercase outline-none transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-slate-900"
            >
              View All 8 Services <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="service-area-heading"
        className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Where We Work"
            id="service-area-heading"
            title="Based in Sevierville. Serving East Tennessee."
          >
            These are the business&apos;s confirmed priority and active service
            areas. Contact us if your East Tennessee community is not listed.
          </SectionHeading>
          <div className="flex flex-wrap justify-center gap-3">
            {SERVICE_AREAS.map((area) =>
              area.path ? (
                <Link
                  key={area.label}
                  to={area.path}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 font-semibold text-blue-800 outline-none transition hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {area.label}, TN
                </Link>
              ) : (
                <span
                  key={area.label}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <MapPin className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  {area.label}, TN
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
        <div className="absolute inset-0 opacity-15" aria-hidden="true">
          <HeroImage
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-black tracking-widest text-blue-400 uppercase">
            The Ultra Difference
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Not Just Clean. <span className="text-blue-400">Ultra Clean.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Ultra is locally owned and owner-operated. We focus on clear
            communication, attention to detail, and a cleaning method selected
            for the surface and its condition.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2">
            {[
              "Cleaning methods selected for each surface",
              "Response within 24 hours",
              "Property details and photos accepted for quotes",
              "In-person evaluations arranged when needed",
              "Card, cash, check, and Cash App accepted",
              "Real project photography from East Tennessee",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="feedback-heading"
        className="bg-slate-50 py-24 dark:bg-slate-900"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-800">
            <MessageSquare className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <p className="mt-5 font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Customer Feedback
            </p>
            <h2
              id="feedback-heading"
              className="mt-3 text-3xl font-black text-slate-900 md:text-4xl dark:text-white"
            >
              Reviews Will Be Added When Approved
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">
              We do not currently publish a Google rating or customer
              testimonials. Genuine customer feedback will appear only after it
              has been verified and approved.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/before-after"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <Images className="h-5 w-5" aria-hidden="true" /> See Real Results
              </Link>
              <Link
                to="/reviews"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 px-6 py-3 font-bold text-slate-800 outline-none hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:text-white"
              >
                Visit Reviews Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="gallery-heading"
        className="border-y border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Real Before & After Results"
            id="gallery-heading"
            title="See the Difference on Real Projects"
          >
            Use each slider to compare owner-supplied before and after
            photographs. Every displayed location and service has been
            confirmed.
          </SectionHeading>
          <div className="grid gap-8 md:grid-cols-2">
            {FEATURED_PROJECTS.map((project) => (
              <BeforeAfterCard
                key={project.id}
                project={project}
              />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/before-after"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-7 py-3 font-black tracking-wider text-white uppercase outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              View Full Gallery <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="facebook-heading"
        className="border-t border-slate-100 bg-white py-24 transition-colors dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Latest Projects"
            id="facebook-heading"
            title="See Our Recent Work"
          >
            Check out what Ultra has been up to lately and follow the business
            for recent exterior-cleaning updates.
          </SectionHeading>
          <div className="relative z-10 flex w-full justify-center">
            <div className="absolute inset-0 -z-10 mx-auto max-w-lg rounded-full bg-blue-600/10 blur-[100px] dark:bg-blue-500/20" />
            <div className="flex w-full max-w-[500px] flex-col items-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-slate-900/5 sm:p-4 dark:border-slate-700 dark:bg-slate-800 dark:shadow-blue-900/10 dark:ring-white/10">
              <div className="relative min-h-[650px] w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <iframe
                  title="Ultra Pressure Washing on Facebook"
                  src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FUltraPressureWashingWindowCleaning&tabs=timeline&width=500&height=650&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false"
                  width="500"
                  height="650"
                  className="mx-auto min-h-[650px] w-full max-w-[500px] border-0 bg-white"
                  loading="lazy"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <a
              href={SITE.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-7 py-3 font-black tracking-wider text-white uppercase outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              See More on Facebook <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="quote-form"
        aria-labelledby="quote-heading"
        className="scroll-mt-28 bg-slate-950 py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="self-center">
            <p className="font-black tracking-widest text-blue-400 uppercase">
              Start the Conversation
            </p>
            <h2
              id="quote-heading"
              className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl"
            >
              Request a Quote for Your Property
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Share the property address and the services you are considering.
              Ultra may request photographs or arrange an in-person evaluation
              when needed.
            </p>
            <div className="mt-8 space-y-4">
              {[
                SITE.responseTime,
                SITE.availability,
                "Property details and photos help prepare quotes",
              ].map((item) => (
                <p key={item} className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href={SITE_LINKS.phone}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-600 px-6 py-3 font-bold text-white outline-none hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Call {SITE.phone}
              </a>
              <a
                href={SITE_LINKS.text}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-600 px-6 py-3 font-bold text-white outline-none hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Text Ultra
              </a>
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
  children,
}: {
  eyebrow: string;
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white"
      >
        {title}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </p>
    </div>
  );
}
