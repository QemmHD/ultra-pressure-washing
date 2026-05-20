import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Award, MapPin, Star, ThumbsUp } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

function AnimatedCounter({ target, suffix, started }: { target: number; suffix: string; started: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const totalFrames = 80;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (frame >= totalFrames) {
        setCount(target);
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [target, started]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats: StatItem[] = [
  {
    icon: <Award className="w-6 h-6" />,
    value: 500,
    suffix: "+",
    label: "Jobs Completed",
    color: "text-blue-400",
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    value: 25,
    suffix: "+",
    label: "Cities Served",
    color: "text-emerald-400",
  },
  {
    icon: <Star className="w-6 h-6" />,
    value: 5,
    suffix: ".0",
    label: "Star Rating",
    color: "text-amber-400",
  },
  {
    icon: <ThumbsUp className="w-6 h-6" />,
    value: 100,
    suffix: "%",
    label: "Satisfaction Guaranteed",
    color: "text-violet-400",
  },
];

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-slate-950 py-14 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center gap-2"
            >
              <div className={`${stat.color} mb-1`}>{stat.icon}</div>
              <p className={`text-4xl md:text-5xl font-black text-white tracking-tight`}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} started={inView} />
              </p>
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider leading-tight">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
