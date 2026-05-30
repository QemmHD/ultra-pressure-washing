import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { BeforeAfterPair } from "../lib/gallery";

export default function BeforeAfterCard({ pair, index }: { pair: BeforeAfterPair; index: number }) {
  const [sliderPosition, setSliderPosition] = useState(50);

  const moveSlider = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700"
    >
      <div
        className="relative h-80 overflow-hidden cursor-ew-resize select-none touch-none"
        onMouseMove={(e) => moveSlider(e.clientX, e.currentTarget)}
        onTouchMove={(e) => moveSlider(e.touches[0].clientX, e.currentTarget)}
      >
        <img src={pair.before} alt={`Before ${pair.label}`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
          <img src={pair.after} alt={`After ${pair.label}`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPosition}%`, maxWidth: "none" }} />
        </div>
        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none" style={{ left: `${sliderPosition}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-slate-700" />
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-slate-900/70 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Before</div>
        <div className="absolute top-4 right-4 bg-blue-600/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">After</div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pair.label}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{pair.location}</p>
      </div>
    </motion.div>
  );
}
