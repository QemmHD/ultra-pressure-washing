import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import type { Service } from "../data/services";
import ServiceIcon from "./ServiceIcon";
import ProjectImage from "./ProjectImage";

export default function ServiceCard({
  service,
  compact = false,
  priority = false,
}: {
  service: Service;
  compact?: boolean;
  priority?: boolean;
}) {
  const mediaHeight =
    service.imagePresentation === "portrait-focus"
      ? "h-80 md:h-[28rem]"
      : compact
        ? "h-52"
        : "h-60";

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <figure className={`relative ${mediaHeight}`}>
        {service.image ? (
          service.image.startsWith("/gallery/") ||
          service.optimizedImageBasePath ? (
            <ProjectImage
              src={service.image}
              alt={service.imageAlt ?? ""}
              width={service.imageWidth ?? 1280}
              height={service.imageHeight ?? 960}
              sizes={
                compact
                  ? "(min-width: 1280px) 288px, (min-width: 1024px) calc(25vw - 2rem), (min-width: 768px) calc(50vw - 2rem), calc(100vw - 2rem)"
                  : "(min-width: 1280px) 592px, (min-width: 768px) calc(50vw - 2.5rem), calc(100vw - 2rem)"
              }
              priority={priority}
              optimizedBasePath={service.optimizedImageBasePath}
              candidateWidths={
                compact
                  ? (service.compactImageWidths ??
                    service.optimizedImageWidths)
                  : service.optimizedImageWidths
              }
              objectPosition={service.imageObjectPosition}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <img
              src={service.image}
              alt={service.imageAlt ?? ""}
              width={service.imageWidth ?? 1280}
              height={service.imageHeight ?? 960}
              fetchPriority={priority ? "high" : "auto"}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              style={
                service.imageObjectPosition
                  ? { objectPosition: service.imageObjectPosition }
                  : undefined
              }
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-slate-900 text-white">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-sm">
              <ServiceIcon name={service.icon} className="h-12 w-12" />
            </div>
          </div>
        )}
      </figure>
      <div className={compact ? "p-6" : "p-7"}>
        <div className="mb-4 flex items-center gap-3 text-blue-600 dark:text-blue-400">
          <ServiceIcon name={service.icon} />
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {service.title}
          </h3>
        </div>
        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
          {service.description}
        </p>
        {!compact && (
          <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {service.expectation}
          </p>
        )}
        <Link
          to="/#quote-form"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm font-bold uppercase tracking-wider text-blue-600 outline-none transition-all hover:gap-3 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 dark:text-blue-400 dark:focus-visible:ring-offset-slate-800"
        >
          Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
