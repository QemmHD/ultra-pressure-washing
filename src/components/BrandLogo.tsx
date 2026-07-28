export default function BrandLogo({
  className,
  alt,
  loading = "eager",
}: {
  className: string;
  alt: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <picture className="block">
      <source
        type="image/webp"
        srcSet="/optimized/logo/logo-96.webp 96w, /optimized/logo/logo-160.webp 160w, /optimized/logo/logo-256.webp 256w"
        sizes="(min-width: 768px) 80px, 64px"
      />
      <img
        src="/optimized/logo/logo-160.png"
        srcSet="/optimized/logo/logo-96.png 96w, /optimized/logo/logo-160.png 160w, /optimized/logo/logo-256.png 256w"
        sizes="(min-width: 768px) 80px, 64px"
        alt={alt}
        width="160"
        height="168"
        loading={loading}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
