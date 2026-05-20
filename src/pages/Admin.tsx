import { useState, useEffect } from "react";
import { Lock, LogOut, Save, AlertCircle, MessageSquare, ClipboardList, Trash2, CheckCircle, Star, LayoutDashboard, Settings, Briefcase, Users, ChartLine, PlusCircle, X } from "lucide-react";
import { fetchReviews, fetchQuotes, fetchSettings, updateSettings, deleteReview, deleteQuote, updateQuoteStatus, loginAdmin, checkAuthStatus, logoutAdmin, createReview, Review, QuoteRequest, SiteSettings } from "../lib/api";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    heroHeadline: "",
    heroSubtext: "",
    contactPhone: "",
    contactEmail: "",
    serviceArea: ""
  });

  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({ author: "", service: "", text: "", rating: 5 });
  const [addingReview, setAddingReview] = useState(false);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingReview(true);
    const result = await createReview(newReview);
    if (result) {
      await loadData();
      setNewReview({ author: "", service: "", text: "", rating: 5 });
      setShowAddReview(false);
    }
    setAddingReview(false);
  };

  const [services, setServices] = useState([
    { id: 1, name: "House & Building Soft Wash", active: true },
    { id: 2, name: "Concrete & Driveway Cleaning", active: true },
    { id: 3, name: "Roof Wash & Soft Wash", active: true },
    { id: 4, name: "Window Cleaning", active: true },
    { id: 5, name: "Gutter Cleaning", active: true },
    { id: 6, name: "Seals & Surface Protection", active: true },
  ]);

  useEffect(() => {
    const initAuth = async () => {
      const isAuth = await checkAuthStatus();
      if (isAuth) {
        setIsLoggedIn(true);
        loadData();
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [revData, quoteData, settingsData] = await Promise.all([
      fetchReviews(),
      fetchQuotes(),
      fetchSettings()
    ]);
    setReviews(revData);
    setQuotes(quoteData);
    setSettings(settingsData);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await loginAdmin(password);
    if (result.success) {
      setIsLoggedIn(true);
      setError(false);
      loadData();
    } else {
      setError(true);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsLoggedIn(false);
    setPassword("");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSettings(settings);
    if (success) {
      alert("Settings updated successfully!");
    } else {
      alert("Failed to update settings.");
    }
  };

  const handleDeleteReview = async (indexOrId: number | string) => {
    if(confirm("Are you sure you want to delete this review?")) {
      const success = await deleteReview(indexOrId);
      if (success) loadData();
    }
  };

  const handleDeleteQuote = async (id: number | string) => {
    if(confirm("Are you sure you want to delete this quote request?")) {
      const success = await deleteQuote(id);
      if (success) loadData();
    }
  };

  const handleUpdateQuoteStatus = async (id: number | string, newStatus: string) => {
    const success = await updateQuoteStatus(id, newStatus as any);
    if (success) loadData();
  };

  const toggleServiceActive = (id: number) => {
    setServices(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">Admin Access</h1>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8 text-sm">
            Enter your password to access the site dashboard.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Incorrect password
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-3 rounded-sm transition-colors"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your website content and leads</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8 flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Dashboard Info:</strong> Quotes and reviews are stored in this browser's local storage and will reset if you clear your browser data. Quote form submissions are sent to your email in real time via the Chariot form service.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
          { id: "quotes", icon: ClipboardList, label: "Quotes", badge: quotes.filter(q => q.status === 'New').length },
          { id: "reviews", icon: MessageSquare, label: "Reviews", badge: reviews.length },
          { id: "services", icon: Briefcase, label: "Services" },
          { id: "content", icon: Settings, label: "Settings" }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-t-lg" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-lg"}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: Dashboard */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                {quotes.filter(q => q.status === 'New').length > 0 && (
                  <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                    {quotes.filter(q => q.status === 'New').length} New
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Quote Requests</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{quotes.length}</h3>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Completed Jobs</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{quotes.filter(q => q.status === 'Completed').length}</h3>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Scheduled</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{quotes.filter(q => q.status === 'Scheduled').length}</h3>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Total Reviews</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{reviews.length}</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <ChartLine className="w-5 h-5 text-blue-500" /> Recent Activity
              </h3>
              <div className="space-y-6">
                {[
                  ...quotes.slice(0, 2).map(q => ({
                    text: `Quote request from ${q.name} — ${q.service}`,
                    time: q.date,
                    type: "quote" as const
                  })),
                  ...reviews.slice(0, 2).map(r => ({
                    text: `${r.rating}-star review from ${r.author} (${r.service})`,
                    time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recently",
                    type: "review" as const
                  }))
                ].slice(0, 4).map((act, i, arr) => (
                  <div key={i} className={`flex gap-4 items-start relative ${i < arr.length - 1 ? 'before:absolute before:left-[11px] before:top-8 before:bottom-[-24px] before:w-px before:bg-slate-200 dark:before:bg-slate-700' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${act.type === 'quote' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/50'}`}>
                      {act.type === 'quote' ? <ClipboardList className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{act.text}</p>
                      <p className="text-xs text-slate-500">{act.time}</p>
                    </div>
                  </div>
                ))}
                {quotes.length === 0 && reviews.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No activity yet. Quote requests and reviews will appear here.</p>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setActiveTab("quotes")} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group">
                    <ClipboardList className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-2" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">View Quotes</span>
                 </button>
                 <button onClick={() => setActiveTab("content")} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group">
                    <Settings className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-2" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Edit Settings</span>
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Services */}
      {activeTab === "services" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Services</h2>
            <button className="bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-sm text-sm font-bold tracking-wide uppercase hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors">
              + Add Service
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {services.map((service) => (
              <div key={service.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-3">
                    {service.name}
                    {!service.active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-sm uppercase tracking-wider">Hidden</span>}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleServiceActive(service.id)} className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors border ${service.active ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20' : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/50 dark:hover:bg-green-900/20'}`}>
                    {service.active ? 'Hide Service' : 'Show Service'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Site Content / Settings */}
      {activeTab === "content" && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              Homepage Content
            </h2>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Hero Headline</label>
                <input
                  type="text"
                  value={settings.heroHeadline}
                  onChange={(e) => setSettings({...settings, heroHeadline: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Hero Subtext</label>
                <textarea
                  rows={3}
                  value={settings.heroSubtext}
                  onChange={(e) => setSettings({...settings, heroSubtext: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" className="flex items-center justify-center w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest px-8 py-3 rounded-sm transition-colors">
                  <Save className="w-5 h-5" />
                  Save Content Changes
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              Business Information
            </h2>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Contact Phone</label>
                <input 
                  type="text" 
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Contact Email</label>
                <input 
                  type="email" 
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Service Area</label>
                <input 
                  type="text" 
                  value={settings.serviceArea}
                  onChange={(e) => setSettings({...settings, serviceArea: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" className="flex items-center justify-center w-full gap-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold uppercase tracking-widest px-8 py-3 rounded-sm transition-colors">
                  <Save className="w-5 h-5" />
                  Update Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Quotes */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 justify-between transition-colors hover:shadow-md">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{quote.name}</h3>
                  <span className="text-xs text-slate-400 font-medium">{quote.date}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${quote.status === 'New' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : quote.status === 'Contacted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {quote.status}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mt-4">
                  <p className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Email</span> <a href={`mailto:${quote.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quote.email}</a></p>
                  <p className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Phone</span> <a href={`tel:${quote.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quote.phone}</a></p>
                  <p className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Service</span> {quote.service}</p>
                  <p className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Address</span> {quote.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:flex-col md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                <select 
                  value={quote.status}
                  onChange={(e) => handleUpdateQuoteStatus(quote.id, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="New">Mark New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                </select>
                <button 
                  onClick={() => handleDeleteQuote(quote.id)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 transition-colors flex items-center justify-center gap-2 text-sm font-bold w-full"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Quotes</h3>
              <p className="text-slate-500 dark:text-slate-400">You don't have any quote requests yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Reviews */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {/* Header + Add button */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""} total</p>
            <button
              onClick={() => setShowAddReview(!showAddReview)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs px-4 py-2.5 rounded-sm transition-colors shadow"
            >
              {showAddReview ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><PlusCircle className="w-3.5 h-3.5" /> Add Review Manually</>}
            </button>
          </div>

          {/* Manual add form */}
          {showAddReview && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Add a Review</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Use this to add reviews customers gave you by phone, text, Facebook, or in person. They'll show on the public Reviews page immediately.</p>
              <form onSubmit={handleAddReview} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={newReview.author}
                      onChange={e => setNewReview({ ...newReview, author: e.target.value })}
                      placeholder="Jane D."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Service Received</label>
                    <input
                      type="text"
                      required
                      value={newReview.service}
                      onChange={e => setNewReview({ ...newReview, service: e.target.value })}
                      placeholder="House Soft Wash"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Star Rating</label>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setNewReview({ ...newReview, rating: star })}>
                        <Star className={`w-7 h-7 transition-colors ${newReview.rating >= star ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Review Text</label>
                  <textarea
                    required
                    rows={3}
                    value={newReview.text}
                    onChange={e => setNewReview({ ...newReview, text: e.target.value })}
                    placeholder="What did the customer say?"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingReview}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-sm transition-colors"
                >
                  {addingReview ? "Saving..." : "Save Review"}
                </button>
              </form>
            </div>
          )}

          {/* Review list */}
          {reviews.map((review, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 justify-between transition-colors">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{review.author}</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-sm">{review.service}</span>
                </div>
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic text-sm">"{review.text}"</p>
              </div>
              <div className="flex items-center justify-end shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
                <button
                  onClick={() => handleDeleteReview(review.id ?? i)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-bold bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-sm"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}

          {reviews.length === 0 && !showAddReview && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Reviews Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Add your first review manually or wait for customers to submit one.</p>
              <button onClick={() => setShowAddReview(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-sm transition-colors">
                <PlusCircle className="w-3.5 h-3.5" /> Add First Review
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}