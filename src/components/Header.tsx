import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Services", href: "/services" },
    { name: "Gallery", href: "/before-after" },
    { name: "Reviews", href: "/reviews" },
    { name: "Process", href: "/process" },
    { name: "FAQ", href: "/faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group z-50">
            <img src="/logo-transparent.png" alt="Ultra Logo" className={`object-contain transition-all duration-300 ${isScrolled ? "h-12" : "h-16"}`} />
            <div className="flex flex-col">
              <span className={`font-black text-xl tracking-tight uppercase leading-none ${isScrolled ? "text-blue-600 dark:text-blue-400" : "text-blue-500"}`}>
                Ultra
              </span>
              <span className={`text-[10px] font-bold tracking-[0.2em] uppercase leading-none mt-1 ${isScrolled ? "text-blue-600 dark:text-blue-400" : "text-blue-400"}`}>
                Pressure Washing
              </span>
              <span className={`text-[8px] font-medium tracking-widest uppercase leading-none mt-1 ${isScrolled ? "text-slate-500 dark:text-slate-400" : "text-blue-200"}`}>
                And Window Cleaning
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-semibold tracking-wide uppercase transition-colors ${
                  isScrolled ? "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" : "text-slate-200 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-4">
              <a
                href="tel:865-236-9240"
                className={`flex items-center gap-2 font-bold transition-colors ${
                  isScrolled ? "text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400" : "text-white hover:text-blue-200"
                }`}
              >
                <Phone className="w-5 h-5" />
                <span>(865) 236-9240</span>
              </a>
              <a
                href="/#quote-form"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-sm font-bold tracking-wide uppercase text-sm transition-all transform hover:scale-105 shadow-lg shadow-blue-600/20"
              >
                Get a Quote
              </a>
            </div>
            
            {/* Subtle Socials Under Quote */}
            <div className="flex items-center gap-3 pr-2 mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isScrolled ? "text-blue-600 dark:text-blue-400" : "text-blue-300"}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Check Out Our Work Here
              </span>
              <div className="flex items-center gap-2">
                <a href="https://www.facebook.com/UltraPressureWashingWindowCleaning" target="_blank" rel="noreferrer" className={`transition-all hover:scale-125 ${isScrolled ? "text-blue-600 dark:text-blue-400 hover:text-blue-700" : "text-blue-300 hover:text-blue-100"}`}>
                  <FaFacebook className="w-4 h-4" />
                </a>
                <a href="https://www.instagram.com/ultrapressurewashing?igsh=YzVkOXduY2dpaXRj" target="_blank" rel="noreferrer" className={`transition-all hover:scale-125 ${isScrolled ? "text-blue-600 dark:text-blue-400 hover:text-blue-700" : "text-blue-300 hover:text-blue-100"}`}>
                  <FaInstagram className="w-4 h-4" />
                </a>
                <a href="https://www.tiktok.com/@ultrapressurewash?_r=1&_t=ZT-96L2f95v0MI" target="_blank" rel="noreferrer" className={`transition-all hover:scale-125 ${isScrolled ? "text-blue-600 dark:text-blue-400 hover:text-blue-700" : "text-blue-300 hover:text-blue-100"}`}>
                  <FaTiktok className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`md:hidden z-50 p-2 -mr-2 ${
              isScrolled || mobileMenuOpen ? "text-slate-900 dark:text-white" : "text-white"
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-950 h-screen pt-24 px-6 shadow-2xl flex flex-col md:hidden transition-colors duration-300"
          >
            <nav className="flex flex-col gap-6 text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight"
                >
                  {link.name}
                </Link>
              ))}
              <div className="w-12 h-1 bg-blue-600 dark:bg-blue-500 mx-auto my-4"></div>
              <a
                href="tel:865-236-9240"
                className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2"
              >
                <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                (865) 236-9240
              </a>

              {/* Mobile Socials */}
              <div className="flex items-center justify-center gap-6 mt-2">
                <a href="https://www.facebook.com/UltraPressureWashingWindowCleaning" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-transform hover:scale-110">
                  <FaFacebook className="w-7 h-7" />
                </a>
                <a href="https://www.instagram.com/ultrapressurewashing?igsh=YzVkOXduY2dpaXRj" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-transform hover:scale-110">
                  <FaInstagram className="w-7 h-7" />
                </a>
                <a href="https://www.tiktok.com/@ultrapressurewash?_r=1&_t=ZT-96L2f95v0MI" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-transform hover:scale-110">
                  <FaTiktok className="w-7 h-7" />
                </a>
              </div>

              <a
                href="/#quote-form"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-sm font-bold uppercase tracking-widest mt-4"
              >
                Get Your Free Quote
              </a>
              
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400 uppercase tracking-widest mt-4"
              >
                Admin Login
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
