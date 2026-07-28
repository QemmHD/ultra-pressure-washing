import { useId, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { SERVICE_BY_ID } from "../data/services";
import type { Project } from "../data/projects";
import ProjectImage from "./ProjectImage";

export default function BeforeAfterCard({
  project,
  priority = false,
  onExpand,
}: {
  project: Project;
  priority?: boolean;
  onExpand?: () => void;
}) {
  const [position, setPosition] = useState(50);
  const titleId = useId();
  const serviceNames = project.serviceIds
    .map((id) => SERVICE_BY_ID.get(id)?.title)
    .filter(Boolean)
    .join(" + ");

  return (
    <article
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
      aria-labelledby={titleId}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <ProjectImage
          src={project.afterImage}
          alt={project.afterAlt}
          width={project.afterWidth}
          height={project.afterHeight}
          priority={priority}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <ProjectImage
            src={project.beforeImage}
            alt={project.beforeAlt}
            width={project.beforeWidth}
            height={project.beforeHeight}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-xl"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-xl">
            <MoveHorizontal className="h-5 w-5" />
          </span>
        </div>

        <span className="absolute top-4 left-4 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
          Before
        </span>
        <span className="absolute top-4 right-4 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
          After
        </span>

        <label
          htmlFor={`${titleId}-slider`}
          className="sr-only"
        >{`Compare before and after images for ${project.title}`}</label>
        <input
          id={`${titleId}-slider`}
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-valuetext={`${position}% of the before image visible`}
          className="absolute right-5 bottom-5 left-5 h-11 cursor-ew-resize accent-blue-600 outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        />
      </div>

      <div className="p-6">
        <h3
          id={titleId}
          className="text-xl font-black text-slate-900 dark:text-white"
        >
          {project.title}
        </h3>
        <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">
          {serviceNames}
        </p>
        {project.locationVerified && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {project.location}
          </p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {project.description}
        </p>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="mt-5 min-h-11 rounded-sm px-1 font-bold uppercase tracking-wider text-blue-600 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
          >
            Open larger comparison
          </button>
        )}
      </div>
    </article>
  );
}
