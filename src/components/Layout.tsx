import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sun, Moon, ChevronUp, ChevronDown, ArrowRight, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  const [isDark, setIsDark] = useState(false);
  const [showBookNow, setShowBookNow] = useState(false);
  const location = useLocation();

  // Show Book Now button after scrolling past the hero (~500px), hide on home page quote section
  useEffect(() => {
    const handleScroll = () => {
      setShowBookNow(window.scrollY > 480);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check initial preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const scrollToSection = (direction: 'up' | 'down') => {
    // Get all sections plus the footer to ensure we can reach the bottom properly
    const elements = Array.from(document.querySelectorAll('section, footer'));
    if (elements.length === 0) return;

    const currentScroll = window.scrollY;

    if (direction === 'down') {
      // Find the first element whose top is below the viewport's current header area
      const next = elements.find(el => el.getBoundingClientRect().top > 120);
      if (next) {
        window.scrollTo({ top: currentScroll + next.getBoundingClientRect().top - 80, behavior: 'smooth' });
      } else {
        // If no more sections are below, scroll to the absolute bottom safely
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    } else {
      // Find the last element whose top is above the current viewport
      const prev = [...elements].reverse().find(el => el.getBoundingClientRect().top < -20);
      if (prev) {
        window.scrollTo({ top: currentScroll + prev.getBoundingClientRect().top - 80, behavior: 'smooth' });
      } else {
        // If no previous section, scroll to the absolute top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`flex min-h-screen flex-col font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} selection:bg-blue-600 selection:text-white`}>
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      
      {/* Sticky Book Now — mobile bottom bar + desktop floating pill */}
      <AnimatePresence>
        {showBookNow && (
          <>
            {/* Mobile: full-width split Call / Quote bar */}
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-0 left-0 right-0 z-40 flex shadow-2xl md:hidden"
            >
              <a
                href="tel:865-236-9240"
                aria-label="Call Ultra Pressure Washing at (865) 236-9240"
                className="flex flex-1 items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-sm py-4 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
              <a
                href="/#quote-form"
                className="flex flex-1 items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm py-4 transition-colors"
              >
                Free Quote <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Desktop: floating pill bottom-left */}
            <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -80, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-6 left-6 z-40 hidden md:block"
            >
              <a
                href="/#quote-form"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm px-6 py-3.5 rounded-full shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-0.5"
              >
                Get Free Quote <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Controls */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Scroll Buttons */}
        {location.pathname === '/' && (
          <div className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 transition-colors duration-300">
            <button 
              onClick={() => scrollToSection('up')}
              className="p-2 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
              aria-label="Scroll Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full h-px bg-slate-100 dark:bg-slate-700"></div>
            <button 
              onClick={() => scrollToSection('down')}
              className="p-2 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
              aria-label="Scroll Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-500 hover:scale-110 transition-all duration-300"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
