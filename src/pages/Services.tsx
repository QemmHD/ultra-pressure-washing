import { Droplets, Sparkles, Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";

export default function Services() {
  const services = [
    {
      title: "House & Building Soft Wash",
      icon: <Droplets className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      description: "Homes, vacation cabins, and commercial buildings across Sevierville, Pigeon Forge, and Gatlinburg. Our low-pressure soft wash safely eliminates mold, mildew, algae, and road grime without damaging siding, paint, or trim — leaving your property looking like new.",
      image: "https://images.pexels.com/photos/5652626/pexels-photo-5652626.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      badge: "Most Popular"
    },
    {
      title: "Concrete & Driveway Cleaning",
      icon: <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      description: "Deep-set oil stains, tire marks, rust, and years of grime don't stand a chance. We restore driveways, walkways, pool decks, and patios across East Tennessee — including Maryville, Kodak, Seymour, and Knoxville.",
      image: "https://images.pexels.com/photos/14965464/pexels-photo-14965464.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      badge: ""
    },
    {
      title: "Roof Wash & Soft Wash",
      icon: <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      description: "Black streaks, algae, and moss shorten your roof's lifespan and curb appeal. Our ground-level soft wash equipment safely treats shingles up to 3–4 stories — no walking your roof, no pressure damage, just a clean roof that lasts.",
      image: "/roof-wash.jpeg",
      badge: "🎉 FREE Gutters w/ Roof + House Package"
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.18 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50">
      <Seo
        title="Our Services | Ultra Pressure Washing — Sevierville & East TN"
        description="House & building soft wash, roof wash, concrete & driveway cleaning, window cleaning, and gutter cleaning across Sevierville, Pigeon Forge, Gatlinburg & East Tennessee. Free quotes."
        path="/services"
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">What We Do</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
          Pressure Washing Services in East Tennessee
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Professional exterior cleaning for homes, cabins, and businesses throughout Sevierville, Pigeon Forge, Gatlinburg, Knoxville, Maryville, and all of East Tennessee.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-3 gap-10"
      >
        {services.map((service, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            whileHover={{ y: -8, transition: { duration: 0.25 } }}
            className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl border border-slate-100 dark:border-slate-700 transition-shadow duration-300 flex flex-col"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              {service.badge && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-full shadow-lg">
                  {service.badge}
                </div>
              )}
            </div>
            <div className="p-10 flex flex-col flex-1">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
                {service.icon}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{service.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed flex-1">
                {service.description}
              </p>
              <a
                href="/#quote-form"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-sm group-hover:gap-3 transition-all"
              >
                Get a Quote <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-20 bg-blue-600 rounded-3xl p-12 text-center text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <h2 className="text-3xl md:text-4xl font-black mb-4 relative z-10">Ready for a Spotless Property?</h2>
        <p className="text-blue-100 mb-8 text-lg relative z-10">Get a free, no-obligation quote from East Tennessee's favorite pressure washing crew.</p>
        <a
          href="/#quote-form"
          className="relative z-10 inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-slate-50 px-10 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-all hover:-translate-y-1 shadow-xl"
        >
          Get My Free Quote <ArrowRight className="w-5 h-5" />
        </a>
      </motion.div>
    </div>
  );
}
