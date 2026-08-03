import { ArrowRight, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa6";
import { Link } from "react-router";
import { SERVICE_AREAS } from "../data/locations";
import { SERVICES } from "../data/services";
import { SITE, SITE_LINKS } from "../data/site";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-16 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-6">
            <Link
              to="/"
              className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <BrandLogo
                alt={SITE.name}
                loading="lazy"
                className="h-20 w-20 object-contain opacity-95"
              />
            </Link>
            <p className="text-sm leading-relaxed text-slate-300">
              Exterior cleaning based in Sevierville. Locally owned and
              owner-operated, serving East Tennessee.
            </p>
            <div className="flex items-center gap-2">
              {[
                { name: "Facebook", href: SITE.social.facebook, Icon: FaFacebook },
                { name: "Instagram", href: SITE.social.instagram, Icon: FaInstagram },
                { name: "TikTok", href: SITE.social.tiktok, Icon: FaTiktok },
              ].map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ultra Pressure Washing on ${name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-slate-400 outline-none transition hover:bg-blue-600 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <FooterSection title="Services">
            <ul className="space-y-2 text-sm">
              {SERVICES.map((service) => (
                <li key={service.id}>
                  <Link
                    to="/services"
                    className="rounded-sm outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/#quote-form"
              className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-sm font-bold tracking-wider text-blue-400 uppercase outline-none hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </FooterSection>

          <FooterSection title="Service Area">
            <ul className="space-y-2 text-sm">
              {SERVICE_AREAS.map((area) => (
                <li key={area.label} className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                  {area.path ? (
                    <Link
                      to={area.path}
                      className="rounded-sm outline-none transition hover:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      {area.label}, TN
                    </Link>
                  ) : (
                    <span>{area.label}, TN</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate-400">
              Plus surrounding East Tennessee communities.
            </p>
          </FooterSection>

          <FooterSection title="Contact Us">
            <ul className="space-y-4">
              <li>
                <a
                  href={SITE_LINKS.phone}
                  className="flex min-h-11 items-center gap-3 rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a
                  href={SITE_LINKS.text}
                  className="flex min-h-11 items-center gap-3 rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Text Us
                </a>
              </li>
              <li>
                <a
                  href={SITE_LINKS.email}
                  className="flex min-h-11 items-center gap-3 break-all rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                Sevierville, Tennessee
              </li>
            </ul>
          </FooterSection>

          <FooterSection title="Contact Anytime">
            <p className="leading-relaxed">{SITE.availability}</p>
            <p className="mt-3 font-semibold text-white">{SITE.responseTime}</p>
            <p className="mt-5 text-sm text-slate-400">
              Quotes may use submitted property details and photographs. An
              in-person evaluation may be arranged when needed.
            </p>
            <Link
              to="/#quote-form"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold tracking-wide uppercase outline-none transition hover:bg-slate-700 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Request a Quote
            </Link>
          </FooterSection>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-800 px-4 pt-8 text-slate-400 md:flex-row sm:px-6 lg:px-8">
        <p className="text-sm">
          &copy; {SITE.copyrightYear} {SITE.name}. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
          <Link to="/admin" className="rounded-sm font-bold tracking-wider text-slate-400 uppercase outline-none hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-400">
            Admin Login
          </Link>
          <Link to="/privacy-policy" className="rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const sectionId = `footer-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={sectionId}>
      <h2
        id={sectionId}
        className="mb-6 font-bold tracking-wider text-slate-200 uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
