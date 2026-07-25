/**
 * Rasterise the PWA icons from the two SVG sources.
 *
 *   npm run icons
 *
 * Run this whenever public/icon.svg or public/icon-maskable.svg changes. The
 * PNGs are committed, so the app never needs sharp at build or run time — it is
 * a devDependency used by this script only.
 *
 * Why PNGs at all when an SVG icon exists: Chrome will accept an SVG in the
 * manifest, but iOS ignores it for the home-screen icon and several Android
 * launchers still prefer a raster. Shipping both is the reliable path.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const PUBLIC = path.join(process.cwd(), "public");
const APP = path.join(process.cwd(), "app");

type Target = { from: string; to: string; size: number };

const TARGETS: Target[] = [
  // Standard any-purpose icons.
  { from: "icon.svg", to: path.join(PUBLIC, "icon-192.png"), size: 192 },
  { from: "icon.svg", to: path.join(PUBLIC, "icon-512.png"), size: 512 },
  // Maskable, for adaptive launcher shapes.
  { from: "icon-maskable.svg", to: path.join(PUBLIC, "icon-maskable-512.png"), size: 512 },
  // iOS home screen. iOS does not apply the manifest's maskable padding, and it
  // composites on white, so the padded square variant reads best here.
  { from: "icon-maskable.svg", to: path.join(PUBLIC, "apple-touch-icon.png"), size: 180 },
  // Next.js picks up app/icon.png automatically as the favicon.
  { from: "icon.svg", to: path.join(APP, "icon.png"), size: 192 },
];

async function main() {
  await mkdir(PUBLIC, { recursive: true });

  for (const target of TARGETS) {
    const svg = await readFile(path.join(PUBLIC, target.from));
    const png = await sharp(svg, { density: 384 })
      .resize(target.size, target.size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(target.to, png);
    console.log(`✓ ${path.relative(process.cwd(), target.to)}  ${target.size}x${target.size}  ${(png.length / 1024).toFixed(1)} kB`);
  }

  console.log("\n✓ Icons generated. Commit the PNGs.");
}

main().catch((error) => {
  console.error("✗ Icon generation failed:", error?.message ?? error);
  process.exit(1);
});
