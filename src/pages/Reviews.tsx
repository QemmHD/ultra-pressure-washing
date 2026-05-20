import { useState, useEffect } from "react";
import { Star, Quote, ExternalLink } from "lucide-react";
import { fetchReviews, createReview, Review } from "../lib/api";

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      const data = await fetchReviews();
      setReviews(data);
      setLoading(false);
    };
    loadReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReview = await createReview({
      text: message,
      author: name,
      service: service,
      rating: rating
    }, photo);
    
    if (newReview) {
      setReviews([newReview, ...reviews]);
      setName("");
      setService("");
      setMessage("");
      setRating(5);
      setPhoto(null);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">5-Star Reviews</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
          Trusted Across East Tennessee
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          See why homeowners and businesses in Sevierville, Pigeon Forge, Gatlinburg, Knoxville, Maryville, and surrounding East Tennessee trust Ultra Pressure Washing for spotless results every time.
        </p>
      </div>

      {/* Google Reviews banner */}
      <div className="mb-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white border border-slate-200 dark:border-slate-600 shadow flex items-center justify-center">
          {/* Google "G" logo colors */}
          <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            <span className="ml-2 font-black text-slate-900 dark:text-white text-sm">5.0</span>
          </div>
          <p className="font-bold text-slate-900 dark:text-white">Google Reviews — Coming Soon</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We're finishing our Google Business verification. Once live, reviews will appear here automatically. In the meantime, leave us a review below!
          </p>
        </div>
        <a
          href="https://g.page/r/ultrapressurewashing/review"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-sm transition-colors shadow-md"
        >
          Leave a Google Review <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center text-slate-500 py-12">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 py-12">No reviews yet. Be the first!</div>
        ) : (
          reviews.map((review, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative transition-colors duration-300">
              <Quote className="absolute top-6 right-6 w-10 h-10 text-slate-100 dark:text-slate-700" />
              <div className="flex gap-1 mb-6 relative z-10">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-lg italic mb-6 relative z-10 leading-relaxed">"{review.text}"</p>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6 mt-auto">
                <span className="font-bold text-slate-900 dark:text-white">{review.author}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">{review.service}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-24 max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4 text-center">Share Your Experience</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
          Happy with your results? We'd love to hear about it — and so would your neighbors in East Tennessee!
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Service Received</label>
              <input type="text" value={service} onChange={(e) => setService(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="House Wash" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((star) => (
                <button 
                  key={star} 
                  type="button" 
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star className={`w-8 h-8 transition-colors ${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Your Review</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Tell us about your experience..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Upload a Photo of Our Work (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setPhoto(e.target.files?.[0] || null)} 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-200 dark:hover:file:bg-blue-900/50 cursor-pointer transition-colors" 
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-4 rounded-sm transition-colors shadow-lg shadow-blue-600/20">
            {submitted ? "Review Posted!" : "Submit Review"}
          </button>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
            Thank you for taking the time to leave a review!
          </p>
        </form>
      </div>
    </div>
  );
}