import {
  mkdir,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PROJECTS } from "../src/data/projects";

const publicRoot = path.resolve("public");
const optimizedRoot = path.resolve(publicRoot, "optimized");

await mkdir(path.join(optimizedRoot, "hero"), { recursive: true });
await mkdir(path.join(optimizedRoot, "logo"), { recursive: true });
await mkdir(path.join(optimizedRoot, "gallery"), { recursive: true });
await mkdir(path.join(optimizedRoot, "services"), { recursive: true });

async function generateHero() {
  const input = path.join(publicRoot, "hero-bg.jpg");
  for (const width of [480, 768, 1024, 1440, 1656]) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: width <= 768 ? 48 : 50, effort: 6 })
      .toFile(path.join(optimizedRoot, "hero", `hero-${width}.avif`));
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: width <= 768 ? 72 : 76, effort: 6 })
      .toFile(path.join(optimizedRoot, "hero", `hero-${width}.webp`));
  }
}

async function generateLogo() {
  const input = path.join(publicRoot, "logo-transparent.png");
  for (const width of [96, 160, 256]) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6, alphaQuality: 90 })
      .toFile(path.join(optimizedRoot, "logo", `logo-${width}.webp`));
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(optimizedRoot, "logo", `logo-${width}.png`));
  }
}

async function generateProjectImage(source: string) {
  const relative = source.replace(/^\//, "");
  const input = path.join(publicRoot, relative);
  const basename = path.basename(source, path.extname(source));

  for (const width of [480, 640, 672, 768, 1024, 1280]) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .avif({
        quality: width === 672 ? 40 : 52,
        effort: 6,
      })
      .toFile(
        path.join(optimizedRoot, "gallery", `${basename}-${width}.avif`),
      );
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: width === 672 ? 70 : 74, effort: 6 })
      .toFile(
        path.join(optimizedRoot, "gallery", `${basename}-${width}.webp`),
      );
  }
}

async function generateCompactProjectImage(source: string) {
  const relative = source.replace(/^\//, "");
  const input = path.join(publicRoot, relative);
  const basename = path.basename(source, path.extname(source));

  await sharp(input)
    .resize({ width: 384, withoutEnlargement: true })
    .avif({ quality: 48, effort: 6 })
    .toFile(path.join(optimizedRoot, "gallery", `${basename}-384.avif`));
  await sharp(input)
    .resize({ width: 384, withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(path.join(optimizedRoot, "gallery", `${basename}-384.webp`));
}

async function generateServiceImage(
  source: string,
  outputName: string,
  widths: readonly number[],
) {
  const input = path.join(publicRoot, source.replace(/^\//, ""));

  for (const width of widths) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 48, effort: 6 })
      .toFile(
        path.join(optimizedRoot, "services", `${outputName}-${width}.avif`),
      );
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(
        path.join(optimizedRoot, "services", `${outputName}-${width}.webp`),
      );
  }
}

async function generateGutterServiceImage() {
  const original = path.join(
    publicRoot,
    "services",
    "gutter-cleaning-original.jpg",
  );
  const fallback = path.join(
    publicRoot,
    "services",
    "gutter-cleaning.jpg",
  );

  await sharp(original)
    .extract({ left: 0, top: 119, width: 590, height: 1042 })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(fallback);

  await generateServiceImage(
    "/services/gutter-cleaning.jpg",
    "gutter-cleaning",
    [384, 590],
  );
}

await generateHero();
await generateLogo();
await generateServiceImage("/roof-wash.jpeg", "roof-wash", [384, 686]);
await generateServiceImage(
  "/services/window-cleaning.jpg",
  "window-cleaning",
  [384, 652],
);
await generateServiceImage(
  "/services/fence-cleaning.jpg",
  "fence-cleaning",
  [384, 640, 960, 1280],
);
await generateServiceImage(
  "/services/commercial-exterior-cleaning.jpg",
  "commercial-exterior-cleaning",
  [384, 590],
);
await generateGutterServiceImage();

const projectImages = new Set(
  PROJECTS.flatMap((project) => [project.beforeImage, project.afterImage]),
);

for (const image of projectImages) {
  await generateProjectImage(image);
}

await generateCompactProjectImage("/gallery/project-2-after.jpg");
await generateCompactProjectImage("/gallery/after3.jpg");

console.log(
  `Generated responsive hero, logo, service, and ${projectImages.size} project-image sets without modifying originals.`,
);
