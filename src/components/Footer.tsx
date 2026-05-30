import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, ArrowRight, MessageSquare } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa6";
import { useSettings } from "../lib/settings-context";

export default function Footer() {
  const { phone, telHref, smsHref, email, mailtoHref } = useSettings();
  return (
    <footer className="bg-slate-950 text-slate-300 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="inline-block group">
              <img src="/logo-transparent.png" alt="Ultra Pressure Washing Sevierville TN" className="h-20 object-contain drop-shadow-md opacity-90 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed">
              East Tennessee's premier pressure washing, soft wash, and window cleaning service. Locally owned and operated in Sevierville, TN — serving Pigeon Forge, Gatlinburg, Knoxville, Maryville, Kodak, Seymour, Wears Valley & beyond.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/UltraPressureWashingWindowCleaning" target="_blank" rel="noreferrer" aria-label="Ultra Pressure Washing on Facebook" className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-[#1877F2] hover:text-white transition-all duration-300 hover:scale-110 shadow-lg">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/ultrapressurewashing?igsh=YzVkOXduY2dpaXRj" target="_blank" rel="noreferrer" aria-label="Ultra Pressure Washing on Instagram" className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F56040] hover:text-white transition-all duration-300 hover:scale-110 shadow-lg">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@ultrapressurewash?_r=1&_t=ZT-96L2f95v0MI" target="_blank" rel="noreferrer" aria-label="Ultra Pressure Washing on TikTok" className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-black hover:text-white hover:ring-2 hover:ring-[#69C9D0] transition-all duration-300 hover:scale-110 shadow-lg">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-slate-300 font-bold uppercase tracking-wider mb-6">Services</h3>
            <ul className="space-y-3">
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">House & Building Soft Wash</Link></li>
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">Concrete & Driveway Cleaning</Link></li>
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">Window Cleaning</Link></li>
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">Roof Wash</Link></li>
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">Gutter Cleaning</Link></li>
              <li><Link to="/services" className="hover:text-slate-100 transition-colors">Seals & Surface Protection</Link></li>
            </ul>
            <a href="/#quote-form" className="inline-flex items-center gap-1 mt-6 text-blue-400 hover:text-blue-300 font-bold text-sm uppercase tracking-wider transition-colors">
              Get a Free Quote <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Service Area */}
          <div>
            <h3 className="text-slate-300 font-bold uppercase tracking-wider mb-6">Service Area</h3>
            <ul className="space-y-2 text-sm">
              {[
                { city: "Sevierville, TN", to: "/pressure-washing-sevierville" },
                { city: "Pigeon Forge, TN", to: "/pressure-washing-pigeon-forge" },
                { city: "Gatlinburg, TN", to: "/pressure-washing-gatlinburg" },
                { city: "Knoxville, TN" },
                { city: "Maryville, TN" },
                { city: "Kodak, TN" },
                { city: "Seymour, TN" },
                { city: "Wears Valley, TN" },
              ].map(({ city, to }) => (
                <li key={city} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  {to ? <Link to={to} className="hover:text-blue-400 transition-colors">{city}</Link> : city}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-slate-300 font-bold uppercase tracking-wider mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <a href={telHref} className="flex items-start gap-3 hover:text-slate-100 transition-colors">
                  <Phone className="w-5 h-5 text-slate-300 shrink-0" />
                  <span>{phone}</span>
                </a>
              </li>
              <li>
                <a href={smsHref} className="flex items-start gap-3 hover:text-slate-100 transition-colors">
                  <MessageSquare className="w-5 h-5 text-slate-300 shrink-0" />
                  <span>Text Us</span>
                </a>
              </li>
              <li>
                <a href={mailtoHref} className="flex items-start gap-3 hover:text-slate-100 transition-colors">
                  <Mail className="w-5 h-5 text-slate-300 shrink-0" />
                  <span className="break-all">{email}</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-300 shrink-0" />
                <span>Sevierville, TN &<br />All of East Tennessee</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-slate-300 font-bold uppercase tracking-wider mb-6">Business Hours</h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Monday - Saturday</span>
                <span>Anytime</span>
              </li>
              <li className="flex justify-between pb-2">
                <span>Sunday</span>
                <span>Closed</span>
              </li>
            </ul>
            <a href="/#quote-form" className="inline-block mt-6 w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-3 rounded-sm font-bold uppercase tracking-wide text-sm transition-colors border border-slate-700">
              Request Free Estimate
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-300">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Ultra Pressure Washing And Window Cleaning. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/admin" className="hover:text-slate-100 font-bold uppercase tracking-wider text-slate-500">Admin Login</Link>
          <Link to="/privacy-policy" className="hover:text-slate-100">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-slate-100">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
