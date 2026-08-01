import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";
import BeforeAfterCard from "../components/BeforeAfterCard";
import ContactCta from "../components/ContactCta";
import HeroImage from "../components/HeroImage";
import ServiceIcon from "../components/ServiceIcon";
import ServiceCard from "../components/ServiceCard";
import StructuredData from "../components/StructuredData";
import type { LocationPage } from "../data/locations";
import { PUBLISHED_PROJECTS } from "../data/projects";
import type { SiteRoute } from "../data/routes";
import { SERVICES, SERVICE_LIST_TEXT } from "../data/services";
import { SITE, SITE_LINKS } from "../data/site";

const UNIQUE_CONTENT = {
  sevierville: {
    heading: "Exterior Cleaning from a Sevierville-Based Business",
    paragraphs: [
      "Ultra Pressure Washing & Window Cleaning is based in Sevierville. Homeowners, rental-property owners, property managers, and local businesses can request any of the eight confirmed exterior-cleaning services shown below.",
      "Exterior surfaces around East Tennessee can collect dirt, pollen, traffic residue, and organic buildup. The right cleaning approach depends on the material, its current condition, access, and the type of buildup. Ultra reviews those details instead of promising that every stain or discoloration can be removed.",
      "Two Sevierville projects are included on this page because their locations and services were confirmed by the owner. Other gallery projects keep their own verified East Tennessee locations and are not presented as Sevierville work.",
    ],
  },
  "pigeon-forge": {
    heading: "Exterior Cleaning Available in Pigeon Forge",
    paragraphs: [
      `Pigeon Forge is a confirmed active service area. Home, cabin, rental-property, and commercial-exterior owners can request ${SERVICE_LIST_TEXT}.`,
      "The quote process begins with the property address and the surfaces you want cleaned. Photographs may help clarify access and condition. If submitted details are not enough, Ultra may arrange an in-person evaluation before the work is scheduled.",
      "No project currently displayed in the gallery has been verified as a Pigeon Forge job. This page links to the full East Tennessee gallery without relabeling work from another community as local proof.",
    ],
  },
  gatlinburg: {
    heading: "Exterior Cleaning Available in Gatlinburg",
    paragraphs: [
      "Gatlinburg is a confirmed active service area for Ultra Pressure Washing & Window Cleaning. Owners and managers of homes, cabins, rental properties, and commercial exteriors can request any of the confirmed services listed below.",
      "Access, surface material, existing wear, shade, moisture exposure, and the kind of outdoor buildup can all affect the appropriate cleaning approach. Ultra uses the quote process to understand those details and discuss realistic expectations before approved work begins.",
      "Two real service photographs show verified Gatlinburg work: a clean vinyl fence after fence cleaning and commercial storefront sign cleaning in progress. They are presented as individual job photos, not as before-and-after pairs.",
    ],
  },
} as const;

export default function CityPage({
  location,
  route,
}: {
  location: LocationPage;
  route: SiteRoute;
}) {
  const localProjects = PUBLISHED_PROJECTS.filter((project) =>
    location.projectIds.includes(project.id),
  );
  const localServicePhotos = SERVICES.filter(
    (service) =>
      service.imageLocationVerified &&
      service.imageLocation === location.shortLocation,
  );
  const hasLocalWork = localProjects.length > 0 || localServicePhotos.length > 0;
  const unique = UNIQUE_CONTENT[location.slug];

  return (
    <div className="bg-slate-50 dark:bg-slate-900">
      <StructuredData route={route} />

      <section className="relative overflow-hidden bg-slate-950 pt-36 pb-24 text-white">
        <div className="absolute inset-0">
          <HeroImage
            priority
            className="h-full w-full object-cover object-[center_38%] opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-900/35" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-7 text-sm">
            <ol className="flex items-center gap-2 text-slate-300">
              <li>
                <Link
                  to="/"
                  className="rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-bold text-white">
                {location.city}
              </li>
            </ol>
          </nav>

          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm font-bold tracking-wider text-blue-300 uppercase outline-none hover:text-blue-100 focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Home
          </Link>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600/20 px-4 py-2 font-bold tracking-wider text-blue-200 uppercase">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {location.eyebrow}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl leading-tight font-black tracking-tight md:text-6xl">
            {route.h1}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-slate-200">
            {location.introduction}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/#quote-form"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-4 font-black tracking-wider text-white uppercase outline-none hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Request a Quote <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a
              href={SITE_LINKS.phone}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-7 py-4 font-black tracking-wider text-white uppercase outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Phone className="h-5 w-5" aria-hidden="true" /> {SITE.phone}
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-slate-200">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
              {SITE.trust}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-400" aria-hidden="true" />
              Owner-operated since 2025
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-400" aria-hidden="true" />
              Response within 24 hours
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="city-overview-heading"
        className="py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] sm:px-6 lg:px-8">
          <div>
            <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              {location.shortLocation}
            </p>
            <h2
              id="city-overview-heading"
              className="mt-4 text-3xl font-black text-slate-900 md:text-4xl dark:text-white"
            >
              {unique.heading}
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {unique.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>{location.detail}</p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="city-services-heading"
        className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Available Services
            </p>
            <h2
              id="city-services-heading"
              className="mt-4 text-3xl font-black text-slate-900 md:text-4xl dark:text-white"
            >
              Exterior Cleaning in {location.city}
            </h2>
            <p className="mt-5 leading-relaxed text-slate-600 dark:text-slate-300">
              All eight confirmed services are available as standalone work or
              as an add-on.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <ServiceIcon name={service.icon} className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                <h3 className="mt-4 font-black text-slate-900 dark:text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            The service list describes availability, not a promise that every
            surface or condition is suitable for the same cleaning method.
          </p>
        </div>
      </section>

      <section aria-labelledby="local-work-heading" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {hasLocalWork ? (
            <>
              <div className="mx-auto max-w-3xl text-center">
                <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
                  Verified Local Projects
                </p>
                <h2
                  id="local-work-heading"
                  className="mt-4 text-3xl font-black text-slate-900 md:text-4xl dark:text-white"
                >
                  Confirmed Work in {location.city}
                </h2>
                <p className="mt-5 text-slate-600 dark:text-slate-300">
                  {localProjects.length > 0
                    ? `These before-and-after projects are shown here because both their service and ${location.city} location were confirmed.`
                    : `These individual job photos are shown here because both the service and ${location.city} location were confirmed.`}
                </p>
              </div>
              <div className="mt-12 grid gap-8 md:grid-cols-2">
                {localProjects.map((project) => (
                  <BeforeAfterCard
                    key={project.id}
                    project={project}
                  />
                ))}
                {localServicePhotos.map((service) => (
                  <ServiceCard key={service.id} service={service} compact />
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-800">
              <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
                Real East Tennessee Work
              </p>
              <h2
                id="local-work-heading"
                className="mt-4 text-3xl font-black text-slate-900 dark:text-white"
              >
                View the Verified Project Gallery
              </h2>
              <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">
                No displayed project is currently verified for {location.city}.
                The full gallery keeps each project attached to its confirmed
                service and location.
              </p>
              <Link
                to="/before-after"
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-7 py-3 font-black tracking-wider text-white uppercase outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Open Full Gallery <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <aside
          aria-labelledby="city-offer-heading"
          className="mb-10 rounded-3xl border border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-700 dark:bg-amber-950/30"
        >
          <p className="font-black tracking-widest text-amber-700 uppercase dark:text-amber-300">
            Special Offer
          </p>
          <h2 id="city-offer-heading" className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {SITE.offer}
          </h2>
        </aside>
        <ContactCta
          title={`Request Exterior Cleaning in ${location.city}`}
          description="Call, text, or use the quote form anytime. Ultra responds within 24 hours."
        />
      </section>
    </div>
  );
}
