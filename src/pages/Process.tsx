import { ArrowRight, CheckCircle, Clock, Shield } from "lucide-react";

export default function Process() {
  const steps = [
    {
      number: "01",
      title: "Request a Free Quote",
      description: "Fill out our online form or give us a call. We'll gather some details about your property and the services you need.",
      icon: <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    },
    {
      number: "02",
      title: "Custom Evaluation",
      description: "We'll come out to your property to check things out in person, take pictures of the areas needing work, and send you a final estimate.",
      icon: <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    },
    {
      number: "03",
      title: "Easy Scheduling",
      description: "Once you approve the quote, we'll work with you to find a convenient date and time to perform the cleaning.",
      icon: <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    },
    {
      number: "04",
      title: "The Ultra Clean",
      description: "Our professional team arrives on time, fully equipped. We protect your landscaping and property while delivering a spotless clean.",
      icon: <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    }
  ];

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">How It Works</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Our Process</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          We've streamlined our booking and cleaning process to make it as easy and stress-free as possible for you.
        </p>
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
        
        <div className="space-y-12 md:space-y-24">
          {steps.map((step, index) => (
            <div key={index} className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className={`md:w-1/2 ${index % 2 === 1 ? 'md:text-left' : 'md:text-right'}`}>
                <div className={`text-6xl font-black text-slate-100 dark:text-slate-800 mb-4 ${index % 2 === 1 ? 'md:text-left' : 'md:text-right'}`}>
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  {step.description}
                </p>
              </div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-900 shadow-xl z-10 shrink-0">
                {step.icon}
              </div>
              <div className="md:w-1/2"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-24 text-center">
        <a href="/#quote-form" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-sm font-bold tracking-widest uppercase text-sm transition-all transform hover:scale-105 shadow-xl shadow-blue-600/20">
          Start The Process
        </a>
      </div>
    </div>
  );
}