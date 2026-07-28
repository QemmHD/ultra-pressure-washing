import type { ServiceId } from "./services";

export interface Project {
  id: string;
  title: string;
  serviceIds: ServiceId[];
  beforeImage: string;
  afterImage: string;
  location: string;
  locationVerified: boolean;
  description: string;
  beforeAlt: string;
  afterAlt: string;
  beforeWidth: number;
  beforeHeight: number;
  afterWidth: number;
  afterHeight: number;
  featured: boolean;
  displayOrder: number;
  status: "published" | "pending-images";
}

export const PROJECTS: readonly Project[] = [
  {
    id: "sevierville-patio-wash",
    title: "Sevierville Patio Wash",
    serviceIds: ["deck-patio-cleaning"],
    beforeImage: "/gallery/before1.jpg",
    afterImage: "/gallery/after1.jpg",
    location: "Sevierville, TN",
    locationVerified: true,
    description:
      "Patio washing completed in Sevierville, with the original project photographs shown in before-and-after order.",
    beforeAlt: "Patio in Sevierville before professional cleaning",
    afterAlt: "Patio in Sevierville after professional patio washing",
    beforeWidth: 1536,
    beforeHeight: 2048,
    afterWidth: 1536,
    afterHeight: 2048,
    featured: true,
    displayOrder: 1,
    status: "published",
  },
  {
    id: "sevierville-house-soft-wash",
    title: "Sevierville House Soft Wash",
    serviceIds: ["house-building-soft-wash"],
    beforeImage: "/gallery/project-2-before.jpg",
    afterImage: "/gallery/project-2-after.jpg",
    location: "Sevierville, TN",
    locationVerified: true,
    description:
      "House soft washing in Sevierville, shown with the owner-supplied photographs of the same exterior before and after cleaning.",
    beforeAlt: "House exterior in Sevierville before professional soft washing",
    afterAlt: "House exterior in Sevierville after professional soft washing",
    beforeWidth: 1280,
    beforeHeight: 960,
    afterWidth: 1280,
    afterHeight: 960,
    featured: true,
    displayOrder: 2,
    status: "published",
  },
  {
    id: "seymour-driveway-house-wash",
    title: "Seymour Driveway & House Wash",
    serviceIds: [
      "concrete-driveway-cleaning",
      "house-building-soft-wash",
    ],
    beforeImage: "/gallery/before3.jpg",
    afterImage: "/gallery/after3.jpg",
    location: "Seymour, TN",
    locationVerified: true,
    description:
      "A combined driveway and house washing project completed in Seymour.",
    beforeAlt: "Driveway and house exterior in Seymour before cleaning",
    afterAlt:
      "Driveway and house exterior in Seymour after driveway and house washing",
    beforeWidth: 1536,
    beforeHeight: 2048,
    afterWidth: 1536,
    afterHeight: 2048,
    featured: true,
    displayOrder: 3,
    status: "published",
  },
  {
    id: "knox-county-patio-wash",
    title: "Knox County Patio Wash",
    serviceIds: ["deck-patio-cleaning"],
    beforeImage: "/gallery/before4.jpg",
    afterImage: "/gallery/after4.jpg",
    location: "Knox County, TN",
    locationVerified: true,
    description: "Patio washing completed at a property in Knox County.",
    beforeAlt: "Knox County patio before professional cleaning",
    afterAlt: "Knox County patio after professional patio washing",
    beforeWidth: 2048,
    beforeHeight: 1536,
    afterWidth: 2048,
    afterHeight: 1536,
    featured: true,
    displayOrder: 4,
    status: "published",
  },
  {
    id: "wears-valley-deck-wash",
    title: "Wears Valley Deck Wash",
    serviceIds: ["deck-patio-cleaning"],
    beforeImage: "/gallery/project-5-before.jpg",
    afterImage: "/gallery/project-5-after.jpg",
    location: "Wears Valley, TN",
    locationVerified: true,
    description:
      "Deck washing completed in Wears Valley, shown from matching aerial views before and after cleaning.",
    beforeAlt: "Deck in Wears Valley before professional cleaning",
    afterAlt: "Deck in Wears Valley after professional deck washing",
    beforeWidth: 1280,
    beforeHeight: 720,
    afterWidth: 1280,
    afterHeight: 720,
    featured: false,
    displayOrder: 5,
    status: "published",
  },
  {
    id: "seymour-shed-roof-wash",
    title: "Seymour Shed Roof Wash",
    serviceIds: ["roof-washing"],
    beforeImage: "/gallery/before6.jpg",
    afterImage: "/gallery/after6.jpg",
    location: "Seymour, TN",
    locationVerified: true,
    description: "A shed roof washing project completed in Seymour.",
    beforeAlt: "Shed roof in Seymour before roof washing",
    afterAlt: "Shed roof in Seymour after professional roof washing",
    beforeWidth: 2048,
    beforeHeight: 1536,
    afterWidth: 2048,
    afterHeight: 1536,
    featured: false,
    displayOrder: 6,
    status: "published",
  },
] as const;

export const PUBLISHED_PROJECTS = PROJECTS.filter(
  (project) => project.status === "published",
).sort((a, b) => a.displayOrder - b.displayOrder);

export const FEATURED_PROJECTS = PUBLISHED_PROJECTS.filter(
  (project) => project.featured,
);
