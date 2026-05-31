import { Droplets, Sparkles, Shield, Wind, ShieldCheck, LucideIcon } from "lucide-react";

export interface ServiceItem {
  /** Stable id used to persist visibility in site settings. Never change these. */
  id: string;
  title: string;
  description: string;
  /** Real photo URL. When omitted, the card shows a branded icon panel instead. */
  image?: string;
  Icon: LucideIcon;
  badge?: string;
}

// Canonical list of services. The Services page and the Admin "Services" tab
// both read from this list so they always stay in sync.
export const SERVICES: ServiceItem[] = [
  {
    id: "house-soft-wash",
    title: "House & Building Soft Wash",
    description:
      "Homes, vacation cabins, and commercial buildings across Sevierville, Pigeon Forge, and Gatlinburg. Our low-pressure soft wash safely eliminates mold, mildew, algae, and road grime without damaging siding, paint, or trim — leaving your property looking like new.",
    image: "/gallery/after6.jpg",
    Icon: Droplets,
    badge: "Most Popular",
  },
  {
    id: "concrete-driveway",
    title: "Concrete & Driveway Cleaning",
    description:
      "Deep-set oil stains, tire marks, rust, and years of grime don't stand a chance. We restore driveways, walkways, pool decks, and patios across East Tennessee — including Maryville, Kodak, Seymour, and Knoxville.",
    image: "/gallery/after2.jpg",
    Icon: Sparkles,
  },
  {
    id: "roof-wash",
    title: "Roof Wash & Soft Wash",
    description:
      "Black streaks, algae, and moss shorten your roof's lifespan and curb appeal. Our ground-level soft wash equipment safely treats shingles up to 3–4 stories — no walking your roof, no pressure damage, just a clean roof that lasts.",
    image: "/roof-wash.jpeg",
    Icon: Shield,
    badge: "🎉 FREE Gutters w/ Roof + House Package",
  },
  {
    // Branded panel until a real window-cleaning photo is added.
    id: "window-cleaning",
    title: "Window Cleaning",
    description:
      "Streak-free, crystal-clear windows inside and out. We remove hard water spots, pollen, and grime from residential and commercial glass — brightening your home or storefront across Sevierville, Pigeon Forge, and Gatlinburg.",
    Icon: Sparkles,
  },
  {
    // Branded panel until a real gutter-cleaning photo is added.
    id: "gutter-cleaning",
    title: "Gutter Cleaning",
    description:
      "Clogged gutters cause water damage, rot, and foundation issues. We clear out leaves, debris, and buildup, then flush your downspouts so rainwater flows freely and your home stays protected year-round.",
    Icon: Wind,
    badge: "FREE w/ Roof + House Package",
  },
  {
    // Branded panel until a real sealing photo is added.
    id: "surface-sealing",
    title: "Deck, Patio & Surface Sealing",
    description:
      "After a deep clean, we can seal and protect your wood decks, paver patios, and concrete surfaces — locking out moisture, resisting stains, and extending the life of your investment so it looks great for seasons to come.",
    Icon: ShieldCheck,
  },
];
