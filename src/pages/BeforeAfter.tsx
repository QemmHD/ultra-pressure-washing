import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import BeforeAfterCard, { beforeAfterPairs } from "../components/BeforeAfterCard";
import Seo from "../components/Seo";

export default function BeforeAfter() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Seo
        title="Before & After Gallery | Ultra Pressure Washing — Sevierville, TN"
        description="See real before & after pressure washing, soft wash, and roof wash transformations from customers across Sevierville, Pigeon Forge, Gatlinburg & East Tennessee."
        path="/before-after"
      />
      {/* HERO */}
      <section className="relative bg-slate-950 text-white py-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <img src="/hero-bg.jpg" alt="Gallery background" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <a href="/" className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm mb-6 hover:gap-3 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </a>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Before & After Gallery</h1>
            <p className="text-xl text-slate-300 max-w-2xl">
              Real results from real customers across East Tennessee. Drag the slider to see the transformation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* GALLERY GRID */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {beforeAfterPairs.map((pair, i) => (
              <BeforeAfterCard key={i} pair={pair} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
