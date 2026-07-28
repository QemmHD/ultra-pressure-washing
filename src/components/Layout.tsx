import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  Outlet,
  useLocation,
} from "react-router";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Moon,
  Phone,
  Sun,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import { SITE, SITE_LINKS } from "../data/site";
import {
  getBrowserBackendRuntimeMode,
  type BackendRuntimeMode,
} from "../lib/backend-runtime";

export default function SiteLayout() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [showBookNow, setShowBookNow] = useState(false);
  const [backendMode, setBackendMode] =
    useState<BackendRuntimeMode>(
      import.meta.env.VITE_QUOTE_MODE === "live" ? "production" : "preview",
    );
  const firstRoute = useRef(true);

  useEffect(() => {
    setBackendMode(getBrowserBackendRuntimeMode());
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ultra-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBookNow(window.scrollY > 480);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (firstRoute.current && !location.hash) {
      firstRoute.current = false;
      return;
    }
    firstRoute.current = false;

    const target = location.hash
      ? document.getElementById(location.hash.slice(1))
      : document.querySelector<HTMLElement>("main h1");
    if (!target) return;

    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: Boolean(location.hash) });
    if (location.hash) {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [location.hash, location.pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("ultra-theme", next ? "dark" : "light");
  };

  const scrollToSection = (direction: "up" | "down") => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("main section, footer"),
    );
    if (elements.length === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

    if (direction === "down") {
      const next = elements.find((element) => element.getBoundingClientRect().top > 120);
      window.scrollTo({
        top: next
          ? window.scrollY + next.getBoundingClientRect().top - 88
          : document.documentElement.scrollHeight,
        behavior,
      });
      return;
    }

    const previous = [...elements]
      .reverse()
      .find((element) => element.getBoundingClientRect().top < -20);
    window.scrollTo({
      top: previous
        ? window.scrollY + previous.getBoundingClientRect().top - 88
        : 0,
      behavior,
    });
  };

  return (
    <div
      className={`flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 selection:bg-blue-600 selection:text-white dark:bg-slate-950 dark:text-slate-100 ${
        showBookNow ? "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0" : ""
      }`}
    >
        <div
          data-preview-mode={backendMode}
          role={backendMode === "production" ? undefined : "status"}
          className="fixed inset-x-0 top-0 z-[70] flex h-[calc(1.75rem+env(safe-area-inset-top))] items-end justify-center bg-blue-700 px-3 pb-1 text-center text-[10px] font-black tracking-[0.14em] text-white uppercase shadow-sm"
        >
          {backendMode === "staging"
            ? "Integrated staging preview — fake test data only; no business notification"
            : backendMode === "production"
              ? "Sevierville • Serving East Tennessee"
              : "Public Foundation Preview — forms do not send or store data"}
        </div>
        <a
          href="#main-content"
          className="fixed top-[calc(2.25rem+env(safe-area-inset-top))] left-2 z-[100] -translate-y-24 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white shadow-xl outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip to main content
        </a>
        <Header isDark={isDark} onToggleTheme={toggleTheme} />
        <main id="main-content" tabIndex={-1} className="flex-grow outline-none">
          <Outlet />
        </main>
        <Footer />

        <div
          data-visible={showBookNow}
          aria-hidden={!showBookNow}
          inert={!showBookNow}
          className="ui-presence ui-presence--mobile-cta fixed inset-x-0 bottom-0 z-40 flex pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden"
        >
                <a
                  href={SITE_LINKS.phone}
                  aria-label={`Call ${SITE.name} at ${SITE.phone}`}
                  className="flex min-h-14 flex-1 items-center justify-center gap-2 bg-slate-900 px-3 py-4 text-sm font-black tracking-widest text-white uppercase outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> Call
                </a>
                <Link
                  to="/#quote-form"
                  className="flex min-h-14 flex-1 items-center justify-center gap-2 bg-blue-600 px-3 py-4 text-sm font-black tracking-widest text-white uppercase outline-none hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
                >
                  Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
        </div>

        <div
          data-visible={showBookNow}
          aria-hidden={!showBookNow}
          inert={!showBookNow}
          className="ui-presence ui-presence--desktop-cta fixed bottom-6 left-6 z-40 hidden lg:block"
        >
                <Link
                  to="/#quote-form"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black tracking-widest text-white uppercase shadow-2xl shadow-blue-600/30 outline-none transition hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
        </div>

        <div
          className={`fixed right-4 z-50 hidden flex-col gap-3 transition-all lg:flex ${
            showBookNow ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]" : "bottom-6"
          } md:right-6 md:bottom-6`}
        >
          {location.pathname === "/" && (
            <div className="flex flex-col gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => scrollToSection("up")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 outline-none hover:bg-slate-100 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Scroll to previous section"
              >
                <ChevronUp className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("down")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 outline-none hover:bg-slate-100 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Scroll to next section"
              >
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={isDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl outline-none transition hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
          >
            {isDark ? (
              <Sun className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Moon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
    </div>
  );
}
