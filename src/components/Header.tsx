import {
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router";
import { Menu, Moon, Phone, Sun, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa6";
import { PRIMARY_NAVIGATION } from "../data/routes";
import { SITE, SITE_LINKS } from "../data/site";
import BrandLogo from "./BrandLogo";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: SITE.social.facebook,
    Icon: FaFacebook,
  },
  {
    name: "Instagram",
    href: SITE.social.instagram,
    Icon: FaInstagram,
  },
  {
    name: "TikTok",
    href: SITE.social.tiktok,
    Icon: FaTiktok,
  },
] as const;

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Header({
  isDark,
  onToggleTheme,
}: HeaderProps) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSolid =
    mobileMenuOpen || isScrolled || location.pathname !== "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>(focusableSelector)
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
        window.requestAnimationFrame(() => toggleRef.current?.focus());
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;
      const focusable = [
        ...(toggleRef.current ? [toggleRef.current] : []),
        ...Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(focusableSelector),
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
  }, [mobileMenuOpen]);

  const textClass = isSolid
    ? "text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
    : "text-slate-100 hover:text-white";

  return (
    <header
      className={`fixed inset-x-0 top-[calc(1.75rem+env(safe-area-inset-top))] ${
        mobileMenuOpen ? "z-[60]" : "z-50"
      } transition-all duration-300 ${
        isSolid
          ? "bg-white/95 pt-3 pb-3 shadow-sm backdrop-blur-md dark:bg-slate-950/95"
          : "bg-transparent pt-5 pb-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="group z-50 flex min-h-12 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <BrandLogo
              alt=""
              className={`object-contain transition-all duration-300 ${
                isSolid ? "h-12 w-12" : "h-16 w-16"
              }`}
            />
            <span className="flex flex-col">
              <span className="text-xl leading-none font-black tracking-tight text-blue-500 uppercase">
                Ultra
              </span>
              <span
                className={`mt-1 text-[10px] leading-none font-bold tracking-[0.2em] uppercase ${
                  isSolid ? "text-blue-600 dark:text-blue-400" : "text-blue-300"
                }`}
              >
                Pressure Washing
              </span>
              <span
                className={`mt-1 text-[8px] leading-none font-medium tracking-widest uppercase ${
                  isSolid
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-blue-100"
                }`}
              >
                And Window Cleaning
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {PRIMARY_NAVIGATION.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`min-h-11 rounded-sm px-1 py-3 text-sm font-semibold tracking-wide uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 ${textClass}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden flex-col items-end gap-1.5 lg:flex">
            <div className="flex items-center gap-4">
              <a
                href={SITE_LINKS.phone}
                className={`flex min-h-11 items-center gap-2 rounded-sm px-1 font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 ${textClass}`}
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                <span>{SITE.phone}</span>
              </a>
              <Link
                to="/#quote-form"
                className="inline-flex min-h-11 items-center rounded-sm bg-blue-600 px-5 py-2.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/20 outline-none transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
              >
                Get a Quote
              </Link>
            </div>

            <div className="mt-1 flex items-center gap-2 pr-1">
              <span
                className={`flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase ${
                  isSolid ? "text-blue-600 dark:text-blue-400" : "text-blue-300"
                }`}
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                Check Out Our Work Here
              </span>
              <div className="flex items-center">
                {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ultra Pressure Washing on ${name}`}
                    className={`flex h-11 w-11 items-center justify-center rounded-full outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-400 motion-reduce:hover:scale-100 ${
                      isSolid
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-blue-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="z-50 flex items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={`flex h-12 w-12 items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isSolid || mobileMenuOpen
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-blue-100"
              }`}
            >
              {isDark ? (
                <Sun className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Moon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
            <button
              ref={toggleRef}
              type="button"
              aria-label={
                mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className={`flex h-12 w-12 items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isSolid || mobileMenuOpen
                  ? "text-slate-900 dark:text-white"
                  : "text-white"
              }`}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X className="h-7 w-7" aria-hidden="true" />
              ) : (
                <Menu className="h-7 w-7" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={menuRef}
        id="mobile-navigation"
        data-visible={mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
        className="ui-presence ui-presence--menu absolute inset-x-0 top-0 flex h-[calc(100dvh-1.75rem-env(safe-area-inset-top))] flex-col overflow-y-auto overscroll-contain bg-white px-6 pt-24 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-950 lg:hidden"
      >
            <nav
              aria-label="Mobile navigation"
              className="flex flex-col items-stretch gap-2 text-center"
            >
              {PRIMARY_NAVIGATION.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 items-center justify-center rounded-lg text-xl font-black tracking-tight text-slate-900 uppercase outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:hover:bg-slate-900"
                >
                  {link.name}
                </Link>
              ))}
              <div className="mx-auto my-4 h-1 w-12 bg-blue-600" aria-hidden="true" />
              <a
                href={SITE_LINKS.phone}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg text-xl font-bold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white"
              >
                <Phone className="h-6 w-6 text-blue-600" aria-hidden="true" />
                {SITE.phone}
              </a>

              <div className="mt-2 flex items-center justify-center gap-2">
                {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={`Ultra Pressure Washing on ${name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400"
                  >
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </a>
                ))}
              </div>

              <Link
                to="/#quote-form"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 flex min-h-14 items-center justify-center rounded-lg bg-blue-600 px-5 py-4 font-bold tracking-widest text-white uppercase outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Request a Quote
              </Link>

              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-3 flex min-h-11 items-center justify-center rounded-lg text-xs font-bold tracking-widest text-slate-500 uppercase outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Admin Login
              </Link>
            </nav>
      </div>
    </header>
  );
}
