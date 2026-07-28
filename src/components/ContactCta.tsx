import { ArrowRight, MessageSquare, Phone } from "lucide-react";
import { Link } from "react-router";
import { SITE, SITE_LINKS } from "../data/site";

export default function ContactCta({
  title = "Ready to Talk About Your Property?",
  description = "Call, text, or share your property details through the quote form. We respond within 24 hours.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section
      aria-labelledby="contact-cta-heading"
      className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 text-center text-white shadow-xl sm:p-12"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)]" aria-hidden="true" />
      <div className="relative">
        <h2
          id="contact-cta-heading"
          className="text-3xl font-black tracking-tight md:text-4xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-blue-100">
          {description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={SITE_LINKS.phone}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-black text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> {SITE.phone}
          </a>
          <a
            href={SITE_LINKS.text}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 font-black text-white outline-none hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-white"
          >
            <MessageSquare className="h-5 w-5" aria-hidden="true" /> Text Us
          </a>
          <Link
            to="/#quote-form"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-300 px-6 py-3 font-black text-white outline-none hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-white"
          >
            Quote Form <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
