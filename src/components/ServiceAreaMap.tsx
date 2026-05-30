import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

// Service-area map. Uses Google Maps' keyless embed (no API key required)
// centered on Sevierville, TN with the surrounding East Tennessee region.
export default function ServiceAreaMap() {
  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> Find Us
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4 transition-colors duration-300">
            Based in Sevierville, Serving East Tennessee
          </h2>
          <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">
            Centrally located in Sevier County — we travel throughout the Smokies, Knoxville, and surrounding counties.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700"
        >
          <iframe
            title="Ultra Pressure Washing service area map — Sevierville, TN"
            src="https://www.google.com/maps?q=Sevierville,+TN&z=10&output=embed"
            width="100%"
            height="450"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </motion.div>
      </div>
    </section>
  );
}
