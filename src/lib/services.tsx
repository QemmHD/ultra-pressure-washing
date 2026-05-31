import { Droplets, Sparkles, Shield, LucideIcon } from "lucide-react";

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
      "Homes, vacation cabins, and commercial buildings across Sevierville, Pigeon Forge, and Gatlinburg. Our low-pressure soft wash safely eliminates mold, mildew, algae, and road grime without damaging siding, paint, or trim. We also offer streak-free window cleaning to finish the job — leaving your whole property looking like new.",
    image: "/gallery/after6.jpg",
    Icon: Droplets,
    badge: "Most Popular",
  },
  {
    id: "concrete-driveway",
    title: "Concrete & Driveway Cleaning",
    description:
      "Deep-set oil stains, tire marks, rust, and years of grime don't stand a chance. We restore driveways, walkways, sidewalks, pool decks, and patios across East Tennessee — including Maryville, Kodak, Seymour, and Knoxville — bringing dingy concrete back to life.",
    image: "/gallery/after4.jpg",
    Icon: Sparkles,
  },
  {
    id: "roof-wash",
    title: "Roof Wash, Soft Wash & Gutters",
    description:
      "Black streaks, algae, and moss shorten your roof's lifespan and curb appeal. Our ground-level soft wash equipment safely treats shingles up to 3–4 stories — no walking your roof, no pressure damage. We'll clean out your gutters and downspouts too, so rainwater flows freely and your home stays protected year-round.",
    image: "/roof-wash.jpeg",
    Icon: Shield,
    badge: "🎉 FREE Gutters w/ Roof + House Package",
  },
];
