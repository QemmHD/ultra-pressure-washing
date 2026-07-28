export default function ProjectImage({
  src,
  alt,
  width,
  height,
  className,
  sizes = "(min-width: 1280px) 592px, (min-width: 768px) calc(50vw - 2.5rem), calc(100vw - 2rem)",
  priority = false,
  optimizedBasePath,
  candidateWidths = [480, 640, 672, 768, 1024, 1280],
  objectPosition,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  sizes?: string;
  priority?: boolean;
  optimizedBasePath?: string;
  candidateWidths?: readonly number[];
  objectPosition?: string;
}) {
  const basename = src.split("/").pop()!.replace(/\.[^.]+$/, "");
  const basePath =
    optimizedBasePath ?? `/optimized/gallery/${basename}`;
  const srcSet = (extension: "avif" | "webp") =>
    candidateWidths
      .map(
        (candidateWidth) =>
          `${basePath}-${candidateWidth}.${extension} ${candidateWidth}w`,
      )
      .join(", ");

  return (
    <picture className="block h-full w-full">
      <source
        type="image/avif"
        srcSet={srcSet("avif")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={srcSet("webp")}
        sizes={sizes}
      />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={className}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </picture>
  );
}
