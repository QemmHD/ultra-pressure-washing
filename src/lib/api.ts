/**
 * ==========================================
 * ULTRA PRESSURE WASHING — API LAYER
 * Backed by Supabase (persistent, cross-device)
 * ==========================================
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers() {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
}

async function sbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string> || {}) }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

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
  created_at?: string;
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
  created_at?: string;
}

export interface SiteSettings {
  heroHeadline: string;
  heroSubtext: string;
  contactPhone: string;
  contactEmail: string;
  serviceArea: string;
  /** First line of the hero headline (white text). */
  heroHeadlineLine1: string;
  /** Second line of the hero headline (gradient/highlighted text). */
  heroHeadlineLine2: string;
  /** Whether the homepage "Special Offer" banner is shown. */
  offerEnabled: boolean;
  /** The promo text shown in the Special Offer banner (supports plain text). */
  offerText: string;
  /** Service ids (from lib/services) that are hidden from the public site. */
  hiddenServices: string[];
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
    const data = await sbFetch("reviews?order=created_at.desc");
    return (data || []).map((r: any) => ({
      id: r.id,
      text: r.text,
      author: r.author,
      service: r.service,
      rating: r.rating,
      createdAt: r.created_at
    }));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

export async function createReview(
  reviewData: Omit<Review, 'id' | 'createdAt'>,
  photoFile?: File | null
): Promise<Review | null> {
  try {
    if (!reviewData.author || !reviewData.text || !reviewData.rating) {
      throw new Error("Missing required review fields");
    }

    // Fire Chariot notification in background
    const formData = new FormData();
    formData.append("_chariot_form_token", "chf_cQ4S8MZ3RKS5kwr5zZYaGB5fASWHqZMP");
    formData.append("_chariot_form_name", "New Review Submitted");
    formData.append("Name", reviewData.author);
    formData.append("Service", reviewData.service);
    formData.append("Rating", reviewData.rating.toString() + " Stars");
    formData.append("Review Text", reviewData.text);
    if (photoFile) formData.append("Customer Photo", photoFile);
    fetch("https://chariotai.com/api/forms/submit", {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: formData
    }).catch(console.error);

    const data = await sbFetch("reviews", {
      method: "POST",
      body: JSON.stringify({
        text: reviewData.text,
        author: reviewData.author,
        service: reviewData.service,
        rating: reviewData.rating
      })
    });

    const r = Array.isArray(data) ? data[0] : data;
    return {
      id: r?.id ?? Date.now().toString(),
      text: r?.text ?? reviewData.text,
      author: r?.author ?? reviewData.author,
      service: r?.service ?? reviewData.service,
      rating: r?.rating ?? reviewData.rating,
      createdAt: r?.created_at ?? new Date().toISOString()
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return null;
  }
}

export async function deleteReview(indexOrId: number | string): Promise<boolean> {
  try {
    await sbFetch(`reviews?id=eq.${indexOrId}`, { method: "DELETE" });
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
    const data = await sbFetch("quotes?order=created_at.desc");
    return (data || []).map((q: any) => ({
      id: q.id,
      name: q.name,
      email: q.email,
      phone: q.phone,
      address: q.address,
      service: q.service,
      status: q.status,
      date: q.date || new Date(q.created_at).toLocaleDateString(),
      createdAt: q.created_at
    }));
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }
}

export async function submitQuoteRequest(
  quoteData: Omit<QuoteRequest, 'id' | 'status' | 'date'>
): Promise<{ success: boolean; message: string }> {
  try {
    if (!quoteData.name || !quoteData.phone || !quoteData.address) {
      throw new Error("Missing required quote fields");
    }

    // Send email via Chariot
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

    // Push notification via ntfy
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
    }).catch(() => {});

    // Save to Supabase
    await sbFetch("quotes", {
      method: "POST",
      body: JSON.stringify({
        name: quoteData.name,
        email: quoteData.email,
        phone: quoteData.phone,
        address: quoteData.address,
        service: quoteData.service,
        status: "New",
        date: new Date().toLocaleDateString()
      })
    });

    return { success: true, message: "Quote submitted successfully! We will contact you soon." };
  } catch (error: any) {
    console.error("Error submitting quote:", error);
    return { success: false, message: error.message || "Failed to submit quote. Please try again." };
  }
}

export async function updateQuoteStatus(
  id: number | string,
  status: QuoteRequest['status']
): Promise<boolean> {
  try {
    await sbFetch(`quotes?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    return true;
  } catch (error) {
    console.error("Error updating quote status:", error);
    return false;
  }
}

export async function deleteQuote(id: number | string): Promise<boolean> {
  try {
    await sbFetch(`quotes?id=eq.${id}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.error("Error deleting quote:", error);
    return false;
  }
}

// ==============================
// SITE SETTINGS API
// ==============================

export const DEFAULT_SETTINGS: SiteSettings = {
  heroHeadline: "Spotless Results. 100% Ultra Clean.",
  heroSubtext: "Serving Sevierville, Pigeon Forge, Gatlinburg, Knoxville & surrounding East Tennessee — we use professional-grade soft wash equipment to safely restore your home or business without damage.",
  contactPhone: "(865) 236-9240",
  contactEmail: "Ultrapressureandclean@gmail.com",
  serviceArea: "Sevierville, Pigeon Forge, Gatlinburg, Knoxville, Maryville, Kodak, Seymour, Wears Valley & East Tennessee",
  heroHeadlineLine1: "Spotless Results.",
  heroHeadlineLine2: "100% Ultra Clean.",
  offerEnabled: true,
  offerText: "Get FREE Gutter Cleaning with any Roof and House Wash package!",
  hiddenServices: [],
};

// Parse the hidden_services column, which may arrive as a JSON string, a
// native array (jsonb), or null — be tolerant of all three.
function parseHiddenServices(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchSettings(): Promise<SiteSettings> {
  const defaults = DEFAULT_SETTINGS;

  try {
    const data = await sbFetch("settings?id=eq.1");
    if (!data || data.length === 0) return defaults;
    const s = data[0];
    return {
      heroHeadline: s.hero_headline || defaults.heroHeadline,
      heroSubtext: s.hero_subtext || defaults.heroSubtext,
      contactPhone: s.contact_phone || defaults.contactPhone,
      contactEmail: s.contact_email || defaults.contactEmail,
      serviceArea: s.service_area || defaults.serviceArea,
      heroHeadlineLine1: s.hero_headline_line1 || defaults.heroHeadlineLine1,
      heroHeadlineLine2: s.hero_headline_line2 || defaults.heroHeadlineLine2,
      offerEnabled: s.offer_enabled ?? defaults.offerEnabled,
      offerText: s.offer_text || defaults.offerText,
      hiddenServices: parseHiddenServices(s.hidden_services),
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return defaults;
  }
}

export async function updateSettings(settingsData: Partial<SiteSettings>): Promise<boolean> {
  try {
    // Only send columns that were actually provided, so partial saves (e.g. just
    // toggling the offer) never overwrite unrelated fields with undefined.
    const payload: Record<string, unknown> = {};
    const map: Record<keyof SiteSettings, string> = {
      heroHeadline: "hero_headline",
      heroSubtext: "hero_subtext",
      contactPhone: "contact_phone",
      contactEmail: "contact_email",
      serviceArea: "service_area",
      heroHeadlineLine1: "hero_headline_line1",
      heroHeadlineLine2: "hero_headline_line2",
      offerEnabled: "offer_enabled",
      offerText: "offer_text",
      hiddenServices: "hidden_services",
    };
    (Object.keys(settingsData) as (keyof SiteSettings)[]).forEach((key) => {
      const value = settingsData[key];
      if (value === undefined) return;
      payload[map[key]] = key === "hiddenServices" ? JSON.stringify(value) : value;
    });

    await sbFetch("settings?id=eq.1", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
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
  localStorage.removeItem('admin_token');
}

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = localStorage.getItem('admin_token');
    return !!token;
  } catch (error) {
    return false;
  }
}
