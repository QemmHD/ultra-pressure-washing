import {
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import BeforeAfterCard from "../components/BeforeAfterCard";
import ContactCta from "../components/ContactCta";
import PageIntro from "../components/PageIntro";
import StructuredData from "../components/StructuredData";
import { PUBLISHED_PROJECTS, type Project } from "../data/projects";
import { getRoute, createRouteMeta } from "../data/routes";

const route = getRoute("/before-after");

export const meta = () => createRouteMeta(route);

export default function BeforeAfter() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const openProject = (project: Project) => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setSelectedProject(project);
  };

  const closeProject = () => {
    setSelectedProject(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  useEffect(() => {
    if (!selectedProject) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeRef.current?.focus());

    const focusSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProject();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusSelector),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProject]);

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24 dark:bg-slate-900">
      <StructuredData route={route} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Real Project Photography"
          title={route.h1}
          breadcrumb={route.breadcrumb}
          description="Compare six owner-confirmed exterior-cleaning projects. The service, location, and before-and-after order shown for every project have been verified."
        />

        <section aria-labelledby="project-gallery-heading" className="mt-16">
          <h2 id="project-gallery-heading" className="sr-only">
            Six verified before and after projects
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {PUBLISHED_PROJECTS.map((project, index) => (
              <BeforeAfterCard
                key={project.id}
                project={project}
                priority={index === 0}
                onExpand={() => openProject(project)}
              />
            ))}
          </div>
        </section>

        <p className="mx-auto mt-12 max-w-3xl text-center leading-relaxed text-slate-600 dark:text-slate-300">
          These projects are shown only with their confirmed locations. Visit
          the Sevierville page for verified Sevierville examples; the Pigeon
          Forge and Gatlinburg pages link here without presenting unrelated
          projects as local work.
        </p>

        <div className="mt-16">
          <ContactCta
            title="Want to Discuss a Similar Project?"
            description="Share the property address and the surfaces you want cleaned. Photographs may help Ultra prepare the next step in your quote."
          />
        </div>
      </div>

      {selectedProject && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 sm:p-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProject();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comparison-dialog-title"
            className="relative my-auto w-full max-w-5xl rounded-3xl bg-slate-100 p-4 shadow-2xl sm:p-6 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="comparison-dialog-title"
                className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white"
              >
                {selectedProject.title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeProject}
                aria-label="Close larger comparison"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white outline-none hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-700"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <BeforeAfterCard project={selectedProject} />
          </div>
        </div>
      )}
    </div>
  );
}
