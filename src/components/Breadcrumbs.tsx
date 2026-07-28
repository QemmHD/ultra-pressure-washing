import { Link } from "react-router";

export default function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
        <li>
          <Link
            to="/"
            className="rounded-sm hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-slate-700 dark:text-slate-200">
          {current}
        </li>
      </ol>
    </nav>
  );
}
