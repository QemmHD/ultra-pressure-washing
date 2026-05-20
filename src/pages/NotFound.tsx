import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, Phone } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 not found: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 transition-colors duration-300">
      <div className="text-center max-w-lg">
        <p className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4">Page Not Found</p>
        <h1 className="text-8xl font-black text-slate-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-10">
          Sorry, we couldn't find that page. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all shadow-lg"
          >
            Go Home <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="tel:865-236-9240"
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-500 px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all"
          >
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Call Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
