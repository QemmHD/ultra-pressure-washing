export default function HeroImage({
  className,
  priority = false,
}: {
  className: string;
  priority?: boolean;
}) {
  const widths = [480, 768, 1024, 1440, 1656];
  const srcSet = (extension: "avif" | "webp") =>
    widths
      .map(
        (width) =>
          `/optimized/hero/hero-${width}.${extension} ${width}w`,
      )
      .join(", ");

  return (
    <picture className="block h-full w-full">
      <source
        type="image/avif"
        srcSet={srcSet("avif")}
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet={srcSet("webp")}
        sizes="100vw"
      />
      <img
        src="/hero-bg.jpg"
        alt=""
        width="1656"
        height="2208"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
