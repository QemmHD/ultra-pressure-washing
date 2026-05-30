import { Phone, ArrowRight } from "lucide-react";

// Always-visible call / quote bar pinned to the bottom of the screen on mobile.
// Hidden on md+ where the header CTA is always in view.
export default function StickyMobileBar() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
      <a
        href="tel:865-236-9240"
        aria-label="Call Ultra Pressure Washing at (865) 236-9240"
        className="flex-1 flex items-center justify-center gap-2 py-4 font-bold uppercase tracking-wider text-sm text-slate-900 dark:text-white"
      >
        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Call Now
      </a>
      <a
        href="/#quote-form"
        aria-label="Get a free quote"
        className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-sm transition-colors"
      >
        Free Quote
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
