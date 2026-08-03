export const SERVICE_IDS = [
  "house-building-soft-wash",
  "roof-washing",
  "concrete-driveway-cleaning",
  "window-cleaning",
  "gutter-cleaning",
  "deck-patio-cleaning",
  "fence-cleaning",
  "commercial-exterior-cleaning",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

export type ServiceIcon =
  | "home"
  | "roof"
  | "driveway"
  | "windows"
  | "gutters"
  | "deck"
  | "fence"
  | "commercial";

export interface Service {
  id: ServiceId;
  title: string;
  shortTitle: string;
  listLabel: string;
  description: string;
  expectation: string;
  icon: ServiceIcon;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  optimizedImageBasePath?: string;
  optimizedImageWidths?: readonly number[];
  compactImageWidths?: readonly number[];
  imageObjectPosition?: string;
  imagePresentation?: "standard" | "portrait-focus";
  imageLocation?: string;
  imageLocationVerified?: boolean;
  availability: "standalone-and-add-on";
  featured?: boolean;
}

export const SERVICES: readonly Service[] = [
  {
    id: "house-building-soft-wash",
    title: "House & Building Soft Wash",
    shortTitle: "House Soft Washing",
    listLabel: "house and building soft washing",
    description:
      "Low-pressure exterior cleaning for siding and building exteriors. The cleaning approach is selected for the surface and the type of buildup present.",
    expectation:
      "We review the exterior, discuss areas of concern, and explain what results are realistic before approved work begins.",
    icon: "home",
    image: "/gallery/project-2-after.jpg",
    imageAlt: "Clean house exterior after professional soft washing",
    imageWidth: 1280,
    imageHeight: 960,
    compactImageWidths: [384, 480, 640, 672, 768, 1024, 1280],
    availability: "standalone-and-add-on",
    featured: true,
  },
  {
    id: "roof-washing",
    title: "Roof Washing",
    shortTitle: "Roof Washing",
    listLabel: "roof washing",
    description:
      "Exterior roof cleaning for organic buildup and visible streaking, using a method chosen for the roof material and its condition.",
    expectation:
      "Roof condition and access are considered before work is scheduled, and expectations are discussed as part of the quote.",
    icon: "roof",
    image: "/roof-wash.jpeg",
    imageAlt: "Roof washing equipment beside a property",
    imageWidth: 686,
    imageHeight: 386,
    optimizedImageBasePath: "/optimized/services/roof-wash",
    optimizedImageWidths: [384, 686],
    availability: "standalone-and-add-on",
    featured: true,
  },
  {
    id: "concrete-driveway-cleaning",
    title: "Concrete & Driveway Cleaning",
    shortTitle: "Driveway Cleaning",
    listLabel: "concrete and driveway cleaning",
    description:
      "Cleaning for driveways, walkways, and other concrete surfaces affected by dirt, traffic marks, and outdoor buildup.",
    expectation:
      "Existing stains and surface wear are reviewed so the quote reflects the area and condition to be cleaned.",
    icon: "driveway",
    image: "/gallery/after3.jpg",
    imageAlt: "Clean driveway and house exterior after professional washing",
    imageWidth: 1536,
    imageHeight: 2048,
    compactImageWidths: [384, 480, 640, 672, 768, 1024, 1280],
    availability: "standalone-and-add-on",
    featured: true,
  },
  {
    id: "window-cleaning",
    title: "Window Cleaning",
    shortTitle: "Window Cleaning",
    listLabel: "window cleaning",
    description:
      "Exterior window cleaning available as a standalone service or alongside other exterior cleaning work.",
    expectation:
      "Window count, access, screens, and the requested scope are confirmed before scheduling.",
    icon: "windows",
    image: "/services/window-cleaning.jpg",
    imageAlt: "Exterior window being cleaned with a water-fed pole",
    imageWidth: 652,
    imageHeight: 1280,
    optimizedImageBasePath: "/optimized/services/window-cleaning",
    optimizedImageWidths: [384, 652],
    imageObjectPosition: "center 32%",
    availability: "standalone-and-add-on",
  },
  {
    id: "gutter-cleaning",
    title: "Gutter Cleaning",
    shortTitle: "Gutter Cleaning",
    listLabel: "gutter cleaning",
    description:
      "Gutter cleaning for accessible roofline drainage areas, available on its own or with other exterior services.",
    expectation:
      "Access and the requested gutter scope are reviewed before the work is approved.",
    icon: "gutters",
    image: "/services/gutter-cleaning.jpg",
    imageAlt: "Exterior gutter being cleaned by hand",
    imageWidth: 590,
    imageHeight: 1042,
    optimizedImageBasePath: "/optimized/services/gutter-cleaning",
    optimizedImageWidths: [384, 590],
    imageObjectPosition: "center 32%",
    imagePresentation: "portrait-focus",
    availability: "standalone-and-add-on",
  },
  {
    id: "deck-patio-cleaning",
    title: "Deck & Patio Cleaning",
    shortTitle: "Deck & Patio Cleaning",
    listLabel: "deck and patio cleaning",
    description:
      "Exterior cleaning for decks and patios, with the cleaning method selected for the material and current condition.",
    expectation:
      "We identify the surface type and discuss sensitive or worn areas before cleaning.",
    icon: "deck",
    image: "/gallery/project-5-after.jpg",
    imageAlt: "Clean deck in Wears Valley after professional deck washing",
    imageWidth: 1280,
    imageHeight: 720,
    availability: "standalone-and-add-on",
  },
  {
    id: "fence-cleaning",
    title: "Fence Cleaning",
    shortTitle: "Fence Cleaning",
    listLabel: "fence cleaning",
    description:
      "Cleaning for residential and commercial fencing affected by dirt and outdoor organic buildup.",
    expectation:
      "Fence material, condition, and access are considered when the quote is prepared.",
    icon: "fence",
    image: "/services/fence-cleaning.jpg",
    imageAlt:
      "Clean white vinyl privacy fence in Gatlinburg after professional fence cleaning",
    imageWidth: 3840,
    imageHeight: 2880,
    optimizedImageBasePath: "/optimized/services/fence-cleaning",
    optimizedImageWidths: [384, 640, 960, 1280],
    imageObjectPosition: "center 55%",
    imageLocation: "Gatlinburg, TN",
    imageLocationVerified: true,
    availability: "standalone-and-add-on",
  },
  {
    id: "commercial-exterior-cleaning",
    title: "Commercial Exterior Cleaning",
    shortTitle: "Commercial Cleaning",
    listLabel: "commercial exterior cleaning",
    description:
      "Exterior cleaning for commercial properties, with scope and scheduling discussed around the needs of the property.",
    expectation:
      "We confirm surfaces, access, and the approved work area before scheduling.",
    icon: "commercial",
    image: "/services/commercial-exterior-cleaning.jpg",
    imageAlt:
      "Worker pressure washing a restaurant storefront sign in Gatlinburg, Tennessee",
    imageWidth: 590,
    imageHeight: 1280,
    optimizedImageBasePath: "/optimized/services/commercial-exterior-cleaning",
    optimizedImageWidths: [384, 590],
    imageObjectPosition: "center 10%",
    imagePresentation: "portrait-focus",
    imageLocation: "Gatlinburg, TN",
    imageLocationVerified: true,
    availability: "standalone-and-add-on",
  },
] as const;

export const SERVICE_BY_ID = new Map<ServiceId, Service>(
  SERVICES.map((service) => [service.id, service]),
);

const serviceListLabels = SERVICES.map((service) => service.listLabel);
export const SERVICE_LIST_TEXT = `${serviceListLabels
  .slice(0, -1)
  .join(", ")}, and ${serviceListLabels[serviceListLabels.length - 1]}`;
