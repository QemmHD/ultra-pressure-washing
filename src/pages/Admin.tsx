import {
  AlertTriangle,
  DatabaseZap,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import { createRouteMeta, ADMIN_ROUTE } from "../data/routes";

export const meta = () => createRouteMeta(ADMIN_ROUTE);

export default function Admin() {
  return (
    <div className="min-h-[80vh] bg-slate-50 px-4 pt-36 pb-24 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-amber-300 bg-white p-8 shadow-xl sm:p-12 dark:border-amber-800 dark:bg-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <LockKeyhole className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mt-7 font-black tracking-widest text-amber-700 uppercase dark:text-amber-300">
            Public Foundation Preview
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            Admin Preview
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            Admin tools are unavailable in this preview-only mode. No
            production data was accessed or changed.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: DatabaseZap,
                title: "No Data Access",
                text: "No Supabase reads, writes, uploads, or settings requests.",
              },
              {
                icon: ShieldAlert,
                title: "Not Secured Yet",
                text: "The production admin security redesign is postponed.",
              },
              {
                icon: AlertTriangle,
                title: "Not Merge-Ready",
                text: "Backend Security requires separate planning and approval.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <section
                key={title}
                aria-labelledby={`admin-${title.replace(/\s+/g, "-").toLowerCase()}`}
                className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900"
              >
                <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h2
                  id={`admin-${title.replace(/\s+/g, "-").toLowerCase()}`}
                  className="mt-4 font-black text-slate-900 dark:text-white"
                >
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {text}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            The live admin page remains actively used. This local foundation
            branch intentionally replaces it with a fail-closed notice until
            authenticated administration, authorization, and database policies
            are separately reviewed and approved.
          </div>
        </div>
      </div>
    </div>
  );
}
