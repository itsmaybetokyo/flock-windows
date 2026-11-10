#!/usr/bin/env node

// Flock ships one Icon Composer-style SVG, while Android needs separate adaptive
// layers. Render the birds without the rounded-square background, add the sky
// gradient full bleed, and center the mark inside Android's 72dp safe zone.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const repo = join(import.meta.dirname, "..");
const source = await readFile(join(repo, "assets/flock/flock.svg"), "utf8");
const out = join(repo, "apps/mobile/assets/flock");
await mkdir(out, { recursive: true });

const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";
const birds = source.match(/<g transform="[^"]*"[^>]*>[\s\S]*?<\/g>/g) ?? [];
if (birds.length !== 3) throw new Error(`Expected 3 birds in flock.svg, found ${birds.length}.`);

const birdsSvg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${birds
    .map((bird) =>
      fill === null
        ? bird
        : bird
            .replace(/ filter="url\(#cc-drop\)"/g, "")
            .replaceAll('fill="url(#cc-ink)"', `fill="${fill}"`),
    )
    .join("")}</svg>`;

const skySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B48F"/><stop offset="0.5" stop-color="#D97757"/><stop offset="1" stop-color="#B9583A"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#sky)"/></svg>`;

const render = (svg, size) =>
  sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();

const trimmed = async (svg) => {
  const full = await sharp(Buffer.from(svg), { density: 300 })
    .resize(2048, 2048)
    .png()
    .toBuffer();
  return sharp(full).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
};

const fit = async (buffer, box) => {
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  const scale = box / Math.max(width, height);
  return sharp(buffer)
    .resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
    .png()
    .toBuffer();
};

const center = async (size, mark) => {
  const { width = 0, height = 0 } = await sharp(mark).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: mark, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) },
    ])
    .png()
    .toBuffer();
};

const foreground = await center(432, await fit(await trimmed(birdsSvg(null)), 288));
const monochrome = await center(432, await fit(await trimmed(birdsSvg("#000000")), 288));
const notification = await center(96, await fit(await trimmed(birdsSvg("#FFFFFF")), 72));
// Transparent mark, not a gradient tile: the splash config draws this over a solid
// Flock background, and a baked-in square would show its own edges on Android 11-.
const splash = await center(1152, await fit(await trimmed(birdsSvg(null)), 460));

await Promise.all([
  sharp(foreground).toFile(join(out, "android-icon-foreground.png")),
  sharp(await render(skySvg, 432)).toFile(join(out, "android-icon-background.png")),
  sharp(monochrome).toFile(join(out, "android-icon-mark.png")),
  sharp(splash).toFile(join(out, "android-splash-icon.png")),
  sharp(notification).toFile(join(out, "android-notification-icon.png")),
  copyFile(join(repo, "assets/flock/flock-universal-1024.png"), join(out, "app-icon-1024.png")),
]);

console.log(`Wrote Android Flock artwork to ${out}`);
