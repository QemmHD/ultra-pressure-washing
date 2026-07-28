import {
  ArrowRight,
  ClipboardCheck,
  Images,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router";
import ContactCta from "../components/ContactCta";
import PageIntro from "../components/PageIntro";
import StructuredData from "../components/StructuredData";
import { getRoute, createRouteMeta } from "../data/routes";

const route = getRoute("/reviews");

export const meta = () => createRouteMeta(route);

export default function Reviews() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 dark:bg-slate-900">
      <StructuredData route={route} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Truthful Customer Feedback"
          title={route.h1}
          breadcrumb={route.breadcrumb}
          description="Ultra does not currently publish a Google rating or customer testimonials. Genuine feedback will be added only after it has been verified and approved for publication."
        />

        <section
          aria-labelledby="reviews-status-heading"
          className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-14 dark:border-slate-700 dark:bg-slate-800"
        >
          <MessageSquare className="mx-auto h-14 w-14 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2
            id="reviews-status-heading"
            className="mt-6 text-3xl font-black text-slate-900 dark:text-white"
          >
            Approved Reviews Will Appear Here
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            There are no approved customer reviews to display yet. This page
            intentionally contains no placeholder customers, invented review
            text, star rating, or unverified Google link.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <Link
              to="/before-after"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left outline-none transition hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <Images className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                View Real Project Results
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Explore owner-supplied before-and-after photographs with
                confirmed services and locations.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 font-bold text-blue-600 group-hover:gap-3 dark:text-blue-400">
                Open gallery <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <Link
              to="/process"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left outline-none transition hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                Understand the Process
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                See how quote requests, property details, scheduling, and
                approved cleaning work fit together.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 font-bold text-blue-600 group-hover:gap-3 dark:text-blue-400">
                View process <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="reviews-verification-heading"
          className="mt-16"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="reviews-verification-heading"
              className="text-3xl font-black text-slate-900 dark:text-white"
            >
              What You Can Verify Today
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
              Customer feedback should be genuine, not manufactured to fill a
              page. Until approved reviews are available, you can use the
              business details and real project information already published
              on this website to decide whether to start a conversation.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Real Project Photography",
                description:
                  "The gallery uses owner-supplied before-and-after photographs with confirmed service and location details.",
              },
              {
                title: "Confirmed Business Details",
                description:
                  "The site clearly identifies the services offered, East Tennessee coverage, contact information, and licensed and insured status.",
              },
              {
                title: "A Clear Quote Process",
                description:
                  "The process page explains what information to share, when photographs may help, and when an evaluation may be scheduled.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-slate-600 dark:text-slate-300">
            If genuine customer feedback is supplied later, it will be
            published only after approval. No rating average or review count
            will be shown unless the underlying information is real and
            available to visitors. You can also call or text to ask about
            available services, property preparation, or the quote process
            before deciding whether to request an estimate for an East
            Tennessee property.
          </p>
        </section>

        <div className="mt-16">
          <ContactCta />
        </div>
      </div>
    </div>
  );
}
