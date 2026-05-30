// Lightweight per-page SEO using React 19's native support for hoisting
// <title>, <meta>, and <link> tags rendered anywhere in the tree into <head>.
// No extra dependencies required.

const SITE_URL = "https://ultrapressurewashing.net";

interface SeoProps {
  title: string;
  description: string;
  /** Path beginning with "/" — used for the canonical URL. */
  path: string;
  image?: string;
}

export default function Seo({ title, description, path, image = "/hero-bg.jpg" }: SeoProps) {
  const canonical = `${SITE_URL}${path === "/" ? "" : path}`;
  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </>
  );
}
