import { ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router";
import { createRouteMeta, NOT_FOUND_ROUTE } from "../data/routes";
import { SITE_LINKS } from "../data/site";

export const meta = () => createRouteMeta(NOT_FOUND_ROUTE);

export default function NotFound() {
  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-slate-50 px-4 pt-28 pb-20 dark:bg-slate-900">
      <div className="max-w-xl text-center">
        <p className="text-7xl font-black text-blue-600 md:text-8xl dark:text-blue-400" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 text-4xl font-black text-slate-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="mt-5 text-xl leading-relaxed text-slate-600 dark:text-slate-300">
          The address may be outdated or the page may have moved. Use the links
          below to return to the website or contact Ultra.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3 font-black tracking-wider text-white uppercase outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Go Home <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={SITE_LINKS.phone}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3 font-black tracking-wider text-slate-900 uppercase outline-none hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Phone className="h-4 w-4 text-blue-600" aria-hidden="true" /> Call Ultra
          </a>
        </div>
      </div>
    </div>
  );
}
