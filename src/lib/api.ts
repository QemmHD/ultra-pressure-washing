/**
 * ==========================================
 * CHAIROT BACKEND API SHELL - PRODUCTION READY
 * ==========================================
 * 
 * This file acts as the central bridge between your frontend UI and your future backend database.
 * Right now, it simulates a live database using browser LocalStorage and mock data so your UI works perfectly.
 * 
 * WHEN YOU ARE READY TO CONNECT A REAL BACKEND (like Supabase, Firebase, or a custom server):
 * See README_BACKEND.md for full instructions.
 */

// ==============================
// TYPES & INTERFACES
// ==============================

export interface Review {
  id?: string;
  text: string;
  author: string;
  service: string;
  rating: number;
  createdAt?: string;
}

export interface QuoteRequest {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  address: string;
  service: string;
  status: 'New' | 'Contacted' | 'Scheduled' | 'Completed';
  date: string;
  createdAt?: string;
}

export interface SiteSettings {
  heroHeadline: string;
  heroSubtext: string;
  contactPhone: string;
  contactEmail: string;
  serviceArea: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'editor';
}

// ==============================
// REVIEWS API
// ==============================

export async function fetchReviews(): Promise<Review[]> {
  try {
    // REAL BACKEND EXAMPLE:
    // const res = await fetch(`${import.meta.env.VITE_API_URL}/reviews`);
    // if (!res.ok) throw new Error('Failed to fetch reviews');
    // return res.json();

    const saved = localStorage.getItem("ultra_reviews");
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      {
        text: "Excellent quality job, very prompt, extremely detailed. Highly recommended for pressure washing & soft wash. Our home looks brand new!",
        author: "Sarah M.",
        service: "Building Wash",
        rating: 5,
      },
      {
        text: "Responsive, professional, knowledgeable. They arrived on time, communicated perfectly, and the windows are sparkling clean.",
        author: "James T.",
        service: "Window Cleaning",
        rating: 5,
      }
    ];
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return []; // Safe fallback
  }
}

export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt'>, photoFile?: File | null): Promise<Review | null> {
  try {
    // Basic validation
    if (!reviewData.author || !reviewData.text || !reviewData.rating) {
      throw new Error("Missing required review fields");
    }

    // REAL BACKEND EXAMPLE (Connected via Chariot Form Service):
    const formData = new FormData();
    formData.append("_chariot_form_token", "chf_cQ4S8MZ3RKS5kwr5zZYaGB5fASWHqZMP");
    formData.append("_chariot_form_name", "New Review Submitted");
    formData.append("Name", reviewData.author);
    formData.append("Service", reviewData.service);
    formData.append("Rating", reviewData.rating.toString() + " Stars");
    formData.append("Review Text", reviewData.text);
    
    if (photoFile) {
      formData.append("Customer Photo", photoFile);
    }

    // To receive SMS notifications, the business owner can configure an email forwarding rule 
    // to their carrier's email-to-SMS gateway (e.g. 8652369240@vtext.com)
    
    // We fetch in the background to send the notification
    fetch("https://chariotai.com/api/forms/submit", { 
      method: "POST", 
      headers: { "Accept": "application/json" },
      body: formData 
    }).catch(console.error);

    const currentReviews = await fetchReviews();
    const newReview = { ...reviewData, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const updatedReviews = [newReview, ...currentReviews];
    localStorage.setItem("ultra_reviews", JSON.stringify(updatedReviews));
    return newReview;
  } catch (error) {
    console.error("Error creating review:", error);
    return null;
  }
}

export async function deleteReview(indexOrId: number | string): Promise<boolean> {
  try {
    // REAL BACKEND EXAMPLE:
    // const res = await fetch(`${import.meta.env.VITE_API_URL}/reviews/${indexOrId}`, { 
    //   method: 'DELETE',
    //   headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    // });
    // return res.ok;

    const currentReviews = await fetchReviews();
    if (typeof indexOrId === 'number') {
      currentReviews.splice(indexOrId, 1);
    } else {
      // Logic for ID based deletion
      const index = currentReviews.findIndex(r => r.id === indexOrId);
      if(index > -1) currentReviews.splice(index, 1);
    }
    localStorage.setItem("ultra_reviews", JSON.stringify(currentReviews));
    return true;
  } catch (error) {
    console.error("Error deleting review:", error);
    return false;
  }
}


// ==============================
// QUOTES / LEADS API
// ==============================

export async function fetchQuotes(): Promise<QuoteRequest[]> {
  try {
    const saved = localStorage.getItem("ultra_quotes");
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 1, name: "John Smith", email: "john@example.com", phone: "(865) 555-0123", service: "House Wash & Driveway", address: "123 Main St, Sevierville", date: "2 hrs ago", status: "New" },
      { id: 2, name: "Mary Johnson", email: "maryj@email.com", phone: "(865) 555-9876", service: "Roof Wash", address: "456 Oak Ave, Pigeon Forge", date: "1 day ago", status: "Contacted" },
      { id: 3, name: "Robert Davis", email: "robertd@test.com", phone: "(865) 555-4567", service: "Window Cleaning", address: "789 Pine Ln, Gatlinburg", date: "2 days ago", status: "Scheduled" },
    ];
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }
}

export async function submitQuoteRequest(quoteData: Omit<QuoteRequest, 'id' | 'status' | 'date'>): Promise<{ success: boolean; message: string }> {
  try {
    // Basic validation
    if (!quoteData.name || !quoteData.phone || !quoteData.address) {
      throw new Error("Missing required quote fields");
    }

    // REAL BACKEND EXAMPLE (Connected via Chariot Form Service):
    // This sends an email directly to the site owner.
    const formData = new FormData();
    formData.append("_chariot_form_token", "chf_cQ4S8MZ3RKS5kwr5zZYaGB5fASWHqZMP");
    formData.append("_chariot_form_name", "New Quote Request");
    formData.append("Name", quoteData.name);
    formData.append("Phone", quoteData.phone);
    formData.append("Email", quoteData.email || "Not provided");
    formData.append("Address", quoteData.address);
    formData.append("Services Needed", quoteData.service || "None selected");

    const res = await fetch("https://chariotai.com/api/forms/submit", { 
      method: "POST", 
      headers: { "Accept": "application/json" },
      body: formData 
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to submit quote");
    }

    // ── Push notification via ntfy.sh ──────────────────────────────────
    // Business owner installs the free ntfy app (iOS/Android) and subscribes
    // to the topic below. Every quote submission fires an instant phone alert.
    // Set VITE_NTFY_TOPIC in your .env file to your private topic name.
    const ntfyTopic = import.meta.env.VITE_NTFY_TOPIC || "ultrapw-sevierville-leads";
    fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: "POST",
      headers: {
        "Title": "New Quote Request — Ultra PW",
        "Priority": "urgent",
        "Tags": "bell,moneybag",
        "Content-Type": "text/plain"
      },
      body: [
        `👤 ${quoteData.name}`,
        `📞 ${quoteData.phone}`,
        `🧹 ${quoteData.service || "No service selected"}`,
        `📍 ${quoteData.address}`,
        `✉️ ${quoteData.email || "No email"}`,
      ].join("\n")
    }).catch(() => {}); // fire-and-forget, never block the form

    // Save locally so it appears in the Admin Dashboard immediately
    const currentQuotes = await fetchQuotes();
    const newQuote: QuoteRequest = {
      ...quoteData,
      id: Date.now().toString(),
      status: 'New',
      date: 'Just now',
      createdAt: new Date().toISOString()
    };
    const updatedQuotes = [newQuote, ...currentQuotes];
    localStorage.setItem("ultra_quotes", JSON.stringify(updatedQuotes));

    console.log("New quote submitted successfully via Chariot.");
    return { success: true, message: "Quote submitted successfully! We will contact you soon." };
  } catch (error: any) {
    console.error("Error submitting quote:", error);
    return { success: false, message: error.message || "Failed to submit quote. Please try again." };
  }
}

export async function updateQuoteStatus(id: number | string, status: QuoteRequest['status']): Promise<boolean> {
  try {
    const currentQuotes = await fetchQuotes();
    const index = currentQuotes.findIndex(q => q.id.toString() === id.toString());
    if (index > -1) {
      currentQuotes[index].status = status;
      localStorage.setItem("ultra_quotes", JSON.stringify(currentQuotes));
    }
    return true;
  } catch (error) {
    console.error("Error updating quote status:", error);
    return false;
  }
}

export async function deleteQuote(id: number | string): Promise<boolean> {
  try {
    const currentQuotes = await fetchQuotes();
    const filteredQuotes = currentQuotes.filter(q => q.id.toString() !== id.toString());
    localStorage.setItem("ultra_quotes", JSON.stringify(filteredQuotes));
    return true;
  } catch (error) {
    console.error("Error deleting quote:", error);
    return false;
  }
}


// ==============================
// SITE SETTINGS API
// ==============================

export async function fetchSettings(): Promise<SiteSettings> {
  try {
    const saved = localStorage.getItem("ultra_settings");
    if (saved) return JSON.parse(saved);

    return {
      heroHeadline: "East Tennessee's #1 Pressure Wash.",
      heroSubtext: "Serving Sevierville, Pigeon Forge, Gatlinburg, Knoxville & surrounding East Tennessee — we use professional-grade soft wash equipment to safely restore your home or business without damage.",
      contactPhone: "(865) 236-9240",
      contactEmail: "Ultrapressureandclean@gmail.com",
      serviceArea: "Sevierville, Pigeon Forge, Gatlinburg, Knoxville, Maryville, Kodak, Seymour, Wears Valley & East Tennessee"
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {
      heroHeadline: "East Tennessee's #1 Pressure Wash.",
      heroSubtext: "Serving Sevierville, Pigeon Forge, Gatlinburg & East Tennessee.",
      contactPhone: "(865) 236-9240",
      contactEmail: "Ultrapressureandclean@gmail.com",
      serviceArea: "Sevierville & East Tennessee"
    };
  }
}

export async function updateSettings(settingsData: Partial<SiteSettings>): Promise<boolean> {
  try {
    const currentSettings = await fetchSettings();
    const updatedSettings = { ...currentSettings, ...settingsData };
    localStorage.setItem("ultra_settings", JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error("Error updating settings:", error);
    return false;
  }
}


// ==============================
// ADMIN AUTHENTICATION API
// ==============================

export async function loginAdmin(password: string): Promise<{ success: boolean; token?: string; user?: AdminUser }> {
  try {
    // REAL BACKEND EXAMPLE:
    // const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ password })
    // });
    // if (!res.ok) throw new Error('Invalid credentials');
    // const data = await res.json();
    // localStorage.setItem('admin_token', data.token);
    // return { success: true, token: data.token, user: data.user };

    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      const token = "ultra_admin_" + Date.now();
      localStorage.setItem('admin_token', token);
      return {
        success: true,
        token,
        user: { id: "1", email: "admin@ultra.com", role: "admin" }
      };
    }
    return { success: false };
  } catch (error) {
    console.error("Error logging in:", error);
    return { success: false };
  }
}

export function logoutAdmin(): void {
  // REAL BACKEND EXAMPLE:
  // localStorage.removeItem('admin_token');
  // Optional: await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, { method: 'POST' });
  
  localStorage.removeItem('admin_token');
}

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) return false;

    // REAL BACKEND EXAMPLE:
    // const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // return res.ok;

    return true; // Mock true if token exists
  } catch (error) {
    return false;
  }
}