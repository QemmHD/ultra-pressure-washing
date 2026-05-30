import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, Phone, Shield, Star, MapPin, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";
import BeforeAfterCard from "../components/BeforeAfterCard";
import { beforeAfterPairs } from "../lib/gallery";
import NotFound from "./NotFound";

interface CityData {
  slug: string;
  city: string;
  blurb: string;
  neighborhoods: string[];
}

const CITIES: Record<string, CityData> = {
  "pressure-washing-sevierville": {
    slug: "pressure-washing-sevierville",
    city: "Sevierville",
    blurb:
      "We're proud to call Sevierville home. From homes off Dolly Parton Parkway to cabins in the hills, our soft wash and pressure washing services safely restore your property without damage.",
    neighborhoods: ["Downtown Sevierville", "Kodak", "Boyds Creek", "Pittman Center", "Wears Valley", "Seymour"],
  },
  "pressure-washing-pigeon-forge": {
    slug: "pressure-washing-pigeon-forge",
    city: "Pigeon Forge",
    blurb:
      "Pigeon Forge cabins and rental properties take a beating from weather, pollen, and algae. We keep your investment looking guest-ready with professional soft washing, roof washing, and concrete cleaning.",
    neighborhoods: ["The Parkway", "Wears Valley", "Upper Middle Creek", "Pine Mountain", "Walden's Creek"],
  },
  "pressure-washing-gatlinburg": {
    slug: "pressure-washing-gatlinburg",
    city: "Gatlinburg",
    blurb:
      "Gatlinburg's mountain climate means moss, mildew, and black streaks on cabins and decks. Our ground-level soft wash equipment safely reaches multi-story chalets and rentals — no damage, just results.",
    neighborhoods: ["Downtown Gatlinburg", "Ski Mountain", "Chalet Village", "Cobbly Nob", "Glades Road"],
  },
};

const SERVICES = [
  "House & Cabin Soft Wash",
  "Roof Wash & Algae Removal",
  "Concrete & Driveway Cleaning",
  "Window Cleaning",
  "Gutter Cleaning",
  "Deck & Patio Washing",
];

export default function CityPage({ slug: propSlug }: { slug?: string } = {}) {
  const params = useParams();
  const slug = propSlug ?? params.slug;
  const data = slug ? CITIES[slug] : undefined;

  if (!data) return <NotFound />;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Seo
        title={`Pressure Washing in ${data.city}, TN | Ultra Pressure Washing`}
        description={`Professional pressure washing, soft wash, roof wash & window cleaning in ${data.city}, TN. Licensed & insured, locally owned. Free same-day quotes — call (865) 236-9240.`}
        path={`/${data.slug}`}
      />

      {/* HERO */}
      <section className="relative bg-slate-950 text-white py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.jpg" alt={`Pressure washing in ${data.city}, TN`} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm mb-6 hover:gap-3 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-semibold tracking-wide uppercase backdrop-blur-sm mb-6">
              <MapPin className="w-4 h-4" /> {data.city}, Tennessee
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
              Pressure Washing in <span className="text-blue-400">{data.city}, TN</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">{data.blurb}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/#quote-form" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all transform hover:scale-105 shadow-xl shadow-blue-600/20">
                Get My Free Quote <ArrowRight className="w-5 h-5" />
              </a>
              <a href="tel:865-236-9240" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all">
                <Phone className="w-5 h-5" /> (865) 236-9240
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-400 font-medium">
              <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Licensed & Insured</div>
              <div className="flex items-center gap-2"><Star className="w-5 h-5 text-blue-500" /> 5-Star Rated</div>
              <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> Locally Owned</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Our {data.city} Services</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Exterior Cleaning for {data.city} Homes & Businesses
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{s}</span>
              </motion.div>
            ))}
          </div>

          {/* Neighborhoods */}
          <div className="mt-14 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Areas We Serve Around {data.city}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {data.neighborhoods.map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                  <MapPin className="w-3 h-3" /> {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Recent Transformations</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">See the Difference</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {beforeAfterPairs.slice(0, 2).map((pair, i) => (
              <BeforeAfterCard key={i} pair={pair} index={i} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/before-after" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-sm hover:gap-3 transition-all">
              View Full Gallery <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
            Ready for a Spotless {data.city} Property?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Free, no-obligation quotes — we usually respond the same day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/#quote-form" className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-slate-50 px-8 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-colors shadow-lg">
              Get My Free Quote <ArrowRight className="w-5 h-5" />
            </a>
            <a href="tel:865-236-9240" className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-colors">
              <Phone className="w-5 h-5" /> (865) 236-9240
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-blue-100 text-sm font-medium">
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Licensed & Insured</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> 100% Satisfaction Guarantee</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export const CITY_SLUGS = Object.keys(CITIES);
