import { useState } from "react";
import { Plus, Minus, ArrowRight, Phone } from "lucide-react";
import Seo from "../components/Seo";
import { useSettings } from "../lib/settings-context";

export default function FAQ() {
  const { phone, telHref } = useSettings();
  const faqs = [
    {
      question: "What is soft washing vs pressure washing?",
      answer: "Pressure washing uses high pressure water to blast away dirt, which is great for concrete and tough surfaces. Soft washing uses low pressure combined with specialized cleaning solutions to safely kill mold, mildew, and algae at the root without damaging delicate surfaces like siding or roofs."
    },
    {
      question: "Will the cleaning solutions harm my plants or pets?",
      answer: "No. We thoroughly pre-wet all surrounding vegetation before, during, and after the cleaning process. Our solutions are completely safe for your landscaping and your pets once the surface is rinsed and dried."
    },
    {
      question: "Do I need to be home for the service?",
      answer: "You do not need to be home! As long as all windows and doors are closed, and we have access to a working exterior water spigot, we can complete the job and send you before/after photos upon completion."
    },
    {
      question: "How often should I have my house or roof washed?",
      answer: "We recommend a house wash once a year to prevent buildup of mold and algae, which can degrade the siding over time. Roofs generally need treatment every 3-5 years depending on tree coverage and moisture in your specific area."
    },
    {
      question: "Are you licensed and insured?",
      answer: "Yes, absolutely! We carry comprehensive liability insurance to protect your property and our team, giving you complete peace of mind."
    },
    {
      question: "How much does pressure washing cost?",
      answer: "Every job is priced individually because no two properties are the same. The cost depends on the size of the area, the surface type, and how much buildup needs to be removed. We provide free, no-obligation quotes — just call, text, or fill out our form and we'll give you a fair, upfront price."
    },
    {
      question: "What areas do you serve?",
      answer: "We're based in Sevierville and proudly serve all of East Tennessee — including Pigeon Forge, Gatlinburg, Knoxville, Maryville, Seymour, Kodak, Wears Valley, and the surrounding communities. If you don't see your town listed, just reach out — there's a good chance we cover your area."
    },
    {
      question: "How long does a typical job take?",
      answer: "Most residential jobs are completed in a few hours, though larger homes, cabins, or commercial properties may take longer. When we provide your quote, we'll also give you an estimated time frame so you know what to expect on service day."
    },
    {
      question: "What forms of payment do you accept?",
      answer: "We accept most major payment methods including cash, check, and card. Payment is due upon completion of the work unless other arrangements are made in advance."
    },
    {
      question: "Do you offer free estimates?",
      answer: "Yes! All of our quotes are completely free and come with no obligation. We usually respond the same day — often within a few hours — so you can get your project scheduled quickly."
    },
    {
      question: "Can you remove rust, oil, or stubborn stains?",
      answer: "In most cases, yes. We use specialized treatments for rust, oil, organic stains, and other tough buildup. While some deep stains can't be 100% removed depending on age and surface porosity, we'll always tell you honestly what kind of results to expect before we begin."
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50">
      <Seo
        title="Frequently Asked Questions | Ultra Pressure Washing"
        description="Answers to common questions about pressure washing, soft washing, roof cleaning, pricing, and scheduling in Sevierville & East Tennessee."
        path="/faq"
      />
      {/* FAQ structured data for rich results in Google */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="text-center mb-16">
        <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Questions?</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">FAQ</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Answers to our most commonly asked questions.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>

      <div className="mt-16 bg-blue-600 rounded-3xl p-10 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <h2 className="text-2xl md:text-3xl font-black mb-3 relative z-10">Still Have Questions?</h2>
        <p className="text-blue-100 mb-8 relative z-10">Give us a call or fill out the quote form — we're happy to help.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <a
            href={telHref}
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-slate-50 px-8 py-3 rounded-sm font-black tracking-widest uppercase text-sm transition-all"
          >
            <Phone className="w-4 h-4" /> {phone}
          </a>
          <a
            href="/#quote-form"
            className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-sm font-black tracking-widest uppercase text-sm transition-all"
          >
            Get a Free Quote <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-8 py-6 flex items-center justify-between focus:outline-none group"
      >
        <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {question}
        </span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-colors" />
        )}
      </button>
      
      <div 
        className={`px-8 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[32rem] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}