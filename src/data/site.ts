const MOTTO_LINES = ["Spotless Results.", "100% Ultra Clean."] as const;

export const SITE = {
  name: "Ultra Pressure Washing & Window Cleaning",
  shortName: "Ultra Pressure Washing",
  domain: "https://ultrapressurewashing.net",
  phone: "(865) 236-9240",
  phoneDigits: "8652369240",
  email: "Ultrapressureandclean@gmail.com",
  baseLocation: "Sevierville, Tennessee",
  coverage: "East Tennessee",
  copyrightYear: 2026,
  motto: MOTTO_LINES.join(" "),
  mottoLines: MOTTO_LINES,
  heroSupportingLine:
    "Professional Pressure Washing & Exterior Cleaning in Sevierville and East Tennessee",
  offer: "Get FREE Gutter Cleaning with any Roof and House Wash package!",
  trust: "Licensed & Insured",
  ownership: "Locally owned and owner-operated.",
  availability: "Call, text, or request a quote anytime.",
  responseTime: "We respond within 24 hours.",
  payments: ["Card", "Cash", "Check", "Cash App"],
  social: {
    facebook:
      "https://www.facebook.com/UltraPressureWashingWindowCleaning",
    instagram:
      "https://www.instagram.com/ultrapressurewashing?igsh=YzVkOXduY2dpaXRj",
    tiktok:
      "https://www.tiktok.com/@ultrapressurewash?_r=1&_t=ZT-96L2f95v0MI",
  },
} as const;

export const SITE_LINKS = {
  phone: `tel:${SITE.phoneDigits}`,
  text: `sms:${SITE.phoneDigits}`,
  email: `mailto:${SITE.email}`,
  quote: "/#quote-form",
} as const;
