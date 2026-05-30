import { useState } from "react";
import { ArrowRight, Shield, Star, CheckCircle, Sparkles, Quote, MapPin, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { submitQuoteRequest } from "../lib/api";
import StatsBar from "../components/StatsBar";
import Seo from "../components/Seo";
import BeforeAfterCard from "../components/BeforeAfterCard";
import { beforeAfterPairs } from "../lib/gallery";
import { SERVICES } from "../lib/services";
import { useSettings } from "../lib/settings-context";

export default function Home() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    services: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const { settings: siteSettings, phone, telHref, smsHref } = useSettings();
  const visibleServices = SERVICES.filter((s) => !siteSettings.hiddenServices.includes(s.id));

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service) 
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const result = await submitQuoteRequest({
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      service: formData.services.join(", ")
    });

    setSubmitStatus(result);
    setIsSubmitting(false);

    if (result.success) {
      setFormData({ firstName: "", lastName: "", email: "", phone: "", address: "", services: [] });
      setTimeout(() => setSubmitStatus(null), 5000);
    }
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Seo
        title="Ultra Pressure Washing | Sevierville, Pigeon Forge, Gatlinburg & East TN"
        description="Licensed & insured pressure washing, soft wash, roof wash & window cleaning serving Sevierville, Pigeon Forge, Gatlinburg, Knoxville & all of East Tennessee. Free same-day quotes — call (865) 236-9240."
        path="/"
      />
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.jpg"
            alt="Ultra Pressure Washing at work"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide uppercase backdrop-blur-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>5-Star Rated</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide uppercase backdrop-blur-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Owner Operated</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide uppercase backdrop-blur-sm">
                <MapPin className="w-4 h-4 text-blue-300" />
                <span>Sevierville & East TN</span>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
              {siteSettings.heroHeadlineLine1}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
                {siteSettings.heroHeadlineLine2}
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl font-light leading-relaxed">
              {siteSettings.heroSubtext}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#quote-form"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all transform hover:scale-105 shadow-xl shadow-blue-600/20"
              >
                Get My Free Quote
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href={telHref}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all"
              >
                Call Now: {phone}
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-start gap-4 sm:gap-6 text-sm text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                <span>100% Satisfaction Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" />
                <span>5-Star Google Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span>Locally Owned, Sevierville TN</span>
              </div>
            </div>

            {siteSettings.offerEnabled && siteSettings.offerText && (
              <div className="mt-8 inline-block bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 rounded-xl p-4 backdrop-blur-sm shadow-xl">
                <p className="text-amber-300 font-bold uppercase tracking-widest text-sm mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Special Offer
                </p>
                <p className="text-white font-medium">
                  {siteSettings.offerText}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <StatsBar />

      {/* TRUST BADGES SECTION */}
      <section className="bg-white dark:bg-slate-900 py-12 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 text-center md:divide-x md:divide-slate-100 dark:md:divide-slate-800"
          >
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                <Star className="w-6 h-6 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">5.0</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Average Customer Reviews</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">Licensed & Insured</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">For Your Protection</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">Locally Owned</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Sevierville, TN</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">Spotless Results</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Guaranteed Clean</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES OVERVIEW */}
      <section id="services" className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block transition-colors">Our Services</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6 transition-colors duration-300">
              Professional Exterior Cleaning in Sevierville & East Tennessee
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 transition-colors duration-300">
              From cabin soft washes to driveway restoration, we handle every surface on your Pigeon Forge, Gatlinburg, or Knoxville property with professional-grade equipment and proven techniques.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {visibleServices.slice(0, 3).map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <service.Icon className="w-8 h-8 text-white mb-2" />
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 transition-colors duration-300">{service.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed transition-colors duration-300">
                    {service.description}
                  </p>
                  <a href="#quote-form" className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:gap-3 transition-all">
                    Request Quote <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <a href="/services" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all shadow-lg hover:-translate-y-1">
              View All Services <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* SERVICE AREA SECTION */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Where We Work</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4 transition-colors duration-300">
              Serving All of East Tennessee
            </h2>
            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">
              From the Smokies to Knoxville and everywhere in between — if you're in East Tennessee, we've got you covered.
            </p>
          </motion.div>

          {/* Major cities */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {[
              "Sevierville",
              "Pigeon Forge",
              "Gatlinburg",
              "Knoxville",
              "Maryville",
              "Seymour",
              "Kodak",
            ].map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-semibold"
              >
                <MapPin className="w-3.5 h-3.5" />
                {city}, TN
              </span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center text-slate-600 dark:text-slate-400 mt-8 max-w-2xl mx-auto"
          >
            Plus all the surrounding towns across East Tennessee. Don't see your area listed?{" "}
            <a href="#quote-form" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Just send us a request
            </a>{" "}
            — there's a good chance we serve you.
          </motion.p>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
           <img
            src="https://images.pexels.com/photos/16631149/pexels-photo-16631149.jpeg?auto=compress&cs=tinysrgb&w=1260"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="text-blue-500 font-bold tracking-widest uppercase text-sm mb-4 block">The Ultra Difference</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Not Just Clean. <span className="text-blue-400">Ultra Clean.</span>
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              We aren't just guys with a pressure washer. We're a locally owned, owner-operated business serving East Tennessee homeowners and businesses — and we treat every property like it's our own. From your first call to the final rinse, we deliver a professional experience from start to finish.
            </p>

            <div className="space-y-6 text-left inline-block">
              {[
                "Fast quotes & easy scheduling — we respond same day",
                "Safe soft wash methods that protect your siding, roof & paint",
                "Highly detailed work — we don't miss a spot",
                "Fully licensed & insured for your peace of mind",
                "Proudly serving Sevierville, Pigeon Forge, Gatlinburg & beyond"
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-slate-200 font-medium">{point}</p>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <a
                href="#quote-form"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-colors"
              >
                Get My Free Quote <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* REVIEWS SECTION */}
      <section id="reviews" className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm block mb-3">5-Star Reviews</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6 transition-colors duration-300">
              Trusted by East Tennessee Homeowners
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 transition-colors duration-300">
              Don't just take our word for it — see what your neighbors across Sevierville, Pigeon Forge, and beyond are saying about our results.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                text: "Excellent quality job, very prompt, extremely detailed. Our cabin in Pigeon Forge looked brand new after the soft wash. Highly recommend Ultra for any pressure washing in the area!",
                author: "Sarah M.",
                location: "Pigeon Forge, TN",
                service: "House Soft Wash"
              },
              {
                text: "Responsive, professional, and knowledgeable. They arrived on time, communicated every step, and our windows have never been this clean. Best window cleaning service in Sevierville.",
                author: "James T.",
                location: "Sevierville, TN",
                service: "Window Cleaning"
              },
              {
                text: "Fast, friendly, fair price. They removed years of grime from our driveway and back patio in Maryville. Truly a 5-star local business — won't use anyone else.",
                author: "Robert L.",
                location: "Maryville, TN",
                service: "Concrete Cleaning"
              }
            ].map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative transition-colors duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <Quote className="absolute top-6 right-6 w-10 h-10 text-slate-100 dark:text-slate-700" />
                <div className="flex gap-1 mb-6 relative z-10">
                  {[1,2,3,4,5].map(star => <Star key={star} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-lg italic mb-6 relative z-10 leading-relaxed transition-colors duration-300">"{review.text}"</p>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6 mt-auto transition-colors duration-300">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white transition-colors duration-300 block">{review.author}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{review.location}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full transition-colors duration-300">{review.service}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 text-center"
          >
            <a href="/reviews" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-sm hover:gap-3 transition-all">
              Read More Reviews <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* BEFORE & AFTER GALLERY (native) */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Before & After</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
              The Ultra Transformation
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Drag the slider on each photo to see the difference. Real results from real East Tennessee properties.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {beforeAfterPairs.slice(0, 4).map((pair, i) => (
              <BeforeAfterCard key={i} pair={pair} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center"
          >
            <a href="/before-after" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all shadow-lg hover:-translate-y-1">
              See the Full Gallery <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* RECENT WORK SECTION */}
      <section className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Latest Projects</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
              See Our Recent Work
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Check out what we've been up to lately. We regularly post our newest transformations!
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="flex justify-center w-full relative z-10"
          >
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/20 blur-[100px] rounded-full max-w-lg mx-auto -z-10 transition-colors duration-300"></div>
            
            <div className="w-full max-w-[500px] bg-white dark:bg-slate-800 shadow-2xl dark:shadow-blue-900/10 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-700 p-2 sm:p-4 transition-colors duration-300 ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col items-center">
              <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative min-h-[650px]">
                <iframe
                  title="Ultra Pressure Washing on Facebook"
                  loading="lazy"
                  src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FUltraPressureWashingWindowCleaning&tabs=timeline&width=500&height=650&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false"
                  width="100%"
                  height="650"
                  style={{ border: 'none', overflow: 'hidden', background: 'white' }} 
                  scrolling="no" 
                  frameBorder="0" 
                  allowFullScreen={true} 
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  className="mx-auto max-w-[500px]"
                ></iframe>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center"
          >
            <a href="https://www.facebook.com/UltraPressureWashingWindowCleaning" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all shadow-lg hover:-translate-y-1">
              See More On Facebook <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA / CONTACT FORM SECTION */}
      <section id="quote" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-blue-600 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            
            <div className="grid lg:grid-cols-2 relative z-10">
              <div className="p-12 lg:p-16 flex flex-col justify-center">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
                  Get a Free Quote — No Pressure
                </h2>
                <p className="text-blue-100 text-lg mb-10 leading-relaxed">
                  Serving Sevierville, Pigeon Forge, Gatlinburg, Knoxville, Maryville, Kodak, Seymour, Wears Valley & surrounding East Tennessee. Fill out the form and we'll get back to you fast — usually same day.
                </p>
                
                <div className="space-y-6 mb-10">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm font-bold uppercase tracking-wider">Service Area</p>
                      <p className="font-medium text-lg">Sevierville, Pigeon Forge, Gatlinburg & all of East TN</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm font-bold uppercase tracking-wider">Peace of Mind</p>
                      <p className="font-medium text-lg">Fully Licensed & Insured</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <a href={telHref} className="bg-white text-blue-600 hover:bg-slate-50 px-8 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-colors shadow-lg">
                    Call {phone}
                  </a>
                  <a href={smsHref} className="inline-flex items-center gap-2 bg-blue-500/80 hover:bg-blue-500 text-white border border-white/30 px-8 py-4 rounded-sm font-black tracking-widest uppercase text-sm transition-colors shadow-lg">
                    <MessageSquare className="w-5 h-5" /> Text Us
                  </a>
                </div>
              </div>

              {/* Quote request form */}
              <div id="quote-form" className="bg-slate-900 dark:bg-slate-950 p-12 lg:p-16 flex flex-col justify-center transition-colors duration-300">
                <h3 className="text-2xl font-bold text-white mb-2">Request Your Free Estimate</h3>
                <p className="text-slate-400 text-sm mb-4">We respond same day — usually within a few hours.</p>
                <p className="text-slate-400 text-xs mb-8 bg-slate-800/60 border border-slate-700 rounded-sm px-4 py-3 leading-relaxed">
                  Every job is priced individually — your quote depends on the size of the area and how much buildup needs to be removed. Tell us what you need and we'll give you a fair, no-obligation price.
                </p>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                      <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                      <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Doe" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                      <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="(123) 456-7890" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Property Address</label>
                    <input type="text" required autoComplete="street-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="123 Main St, Sevierville, TN" />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Services Needed (Select all that apply)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "Soft Wash",
                        "Concrete",
                        "Windows",
                        "Gutters",
                        "Roof Wash",
                        "Seals"
                      ].map((service) => (
                        <label key={service} className="flex items-center gap-3 cursor-pointer group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 p-3 rounded-sm transition-all">
                          <div className="relative flex items-center justify-center w-5 h-5 border border-slate-600 rounded bg-slate-900 group-hover:border-blue-500 transition-colors">
                            <input type="checkbox" checked={formData.services.includes(service)} onChange={() => handleServiceToggle(service)} className="peer absolute opacity-0 w-full h-full cursor-pointer" />
                            <CheckCircle className="w-3.5 h-3.5 text-blue-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {submitStatus && (
                    <div className={`p-4 rounded-sm ${submitStatus.success ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                      {submitStatus.message}
                    </div>
                  )}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-sm transition-colors mt-6 flex items-center justify-center gap-2">
                    {isSubmitting ? "Sending..." : <><span>Get My Free Quote</span><ArrowRight className="w-5 h-5" /></>}
                  </button>
                  <p className="text-slate-500 text-xs text-center mt-4">No obligation. We usually respond the same day.</p>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
