import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, MoveHorizontal, X, Expand } from "lucide-react";

const pairs = [
  {
    title: "Driveway Deep Clean",
    location: "Sevierville, TN",
    service: "Concrete & Driveway Cleaning",
    before: "/gallery/before1.jpg",
    after: "/gallery/after1.jpg",
  },
  {
    title: "House Soft Wash",
    location: "Pigeon Forge, TN",
    service: "House & Building Soft Wash",
    before: "/gallery/before2.jpg",
    after: "/gallery/after2.jpg",
  },
  {
    title: "Roof Algae Removal",
    location: "Gatlinburg, TN",
    service: "Roof Wash & Soft Wash",
    before: "/gallery/before3.jpg",
    after: "/gallery/after3.jpg",
  },
  {
    title: "Concrete Patio Restoration",
    location: "Maryville, TN",
    service: "Concrete Cleaning",
    before: "/gallery/before4.jpg",
    after: "/gallery/after4.jpg",
  },
  {
    title: "Exterior Surface Wash",
    location: "Kodak, TN",
    service: "House & Building Soft Wash",
    before: "/gallery/before5.jpg",
    after: "/gallery/after5.jpg",
  },
  {
    title: "Pressure Wash Transformation",
    location: "Knoxville, TN",
    service: "Concrete & Driveway Cleaning",
    before: "/gallery/before6.jpg",
    after: "/gallery/after6.jpg",
  },
];

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging) handleMove(e.clientX); };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden cursor-ew-resize select-none shadow-xl"
      onMouseDown={() => setIsDragging(true)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* After image (full background) */}
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute top-4 right-4 z-10 bg-green-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
        After ✓
      </div>

      {/* Before image (clipped to left of handle) */}
      <img
        src={before}
        alt="Before"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <div
        className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg"
        style={{ opacity: position > 10 ? 1 : 0, transition: "opacity 0.2s" }}
      >
        Before
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 z-20 flex items-center justify-center"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-0.5 h-full bg-white/80 absolute" />
        <div className="relative w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-blue-500 z-10">
          <MoveHorizontal className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Drag hint on first load */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none"
        style={{ opacity: position === 50 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        ← Drag to reveal →
      </div>
    </div>
  );
}

interface LightboxProps {
  pair: typeof pairs[0];
  onClose: () => void;
}

function Lightbox({ pair, onClose }: LightboxProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
          >
            <X className="w-5 h-5" /> Close
          </button>
          <BeforeAfterSlider before={pair.before} after={pair.after} />
          <div className="mt-4 flex items-center justify-between px-1">
            <div>
              <h3 className="text-white font-bold text-lg">{pair.title}</h3>
              <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {pair.location}
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-700/40">
              {pair.service}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BeforeAfter() {
  const [activePair, setActivePair] = useState<typeof pairs[0] | null>(null);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.2 } }
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="pt-32 pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">The Results Speak</span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Before & After Gallery
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Drag the slider to see real transformations across East Tennessee — driveways, roofs, siding, and more.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 gap-10"
        >
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 group"
            >
              <div className="relative">
                <BeforeAfterSlider before={pair.before} after={pair.after} />
                {/* Expand button */}
                <button
                  onClick={() => setActivePair(pair)}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/50 hover:bg-black/70 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
                >
                  <Expand className="w-3.5 h-3.5" /> Expand
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{pair.title}</h3>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      {pair.location}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                    {pair.service}
                  </span>
                </div>
                <button
                  onClick={() => setActivePair(pair)}
                  className="mt-4 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 hover:gap-2.5 transition-all"
                >
                  <Expand className="w-3.5 h-3.5" /> View Full Size
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {activePair && <Lightbox pair={activePair} onClose={() => setActivePair(null)} />}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-lg">Want results like these at your property?</p>
          <a
            href="/#quote-form"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-all hover:-translate-y-1 shadow-lg shadow-blue-600/20"
          >
            Get My Free Quote <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
