// Generates every icon the site serves, from one definition of the mark.
//
//   node scripts/generate-icons.mjs
//
// This script owns the geometry and writes the SVGs as well as the rasters, so
// the pinned-tab silhouette and the maskable Android icon cannot drift away
// from the favicon. The outputs are committed because a browser asking for
// /favicon.ico cannot wait for a build step.

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
await mkdir(publicDir, { recursive: true });

// ── The mark ────────────────────────────────────────────────────────────────
// A crescent is a disc with a second disc bitten out of it. The login screen
// draws lucide's outline Moon, but an outline thins to nothing at 16 px, so
// the icon uses a solid body instead.
//
// The centres sit up and to the right of the tile's middle: a crescent's mass
// is low and left, so a geometrically centred one looks off.
const MOON = { cx: 33.5, cy: 31, r: 23.5, biteX: 48.5, biteY: 16, biteR: 19.5 };

const GOLD = ['#F3E6BE', '#E9D8A6', '#BFA76F'];
const NIGHT = ['#141B33', '#05070F'];

/**
 * @param {object} opts
 * @param {number} opts.radius  corner radius; 0 for icons the OS masks itself
 * @param {number} opts.inset   shrinks the moon towards the centre, for the
 *                              maskable icon whose corners get cropped
 */
function tileSvg({ radius = 15, inset = 0 } = {}) {
    const scale = (64 - inset * 2) / 64;
    const m = {
        cx: 32 + (MOON.cx - 32) * scale,
        cy: 32 + (MOON.cy - 32) * scale,
        r: MOON.r * scale,
        biteX: 32 + (MOON.biteX - 32) * scale,
        biteY: 32 + (MOON.biteY - 32) * scale,
        biteR: MOON.biteR * scale
    };

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="DreamOff">
    <title>DreamOff</title>
    <defs>
        <linearGradient id="gold" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${GOLD[0]}" />
            <stop offset="0.55" stop-color="${GOLD[1]}" />
            <stop offset="1" stop-color="${GOLD[2]}" />
        </linearGradient>
        <linearGradient id="night" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${NIGHT[0]}" />
            <stop offset="1" stop-color="${NIGHT[1]}" />
        </linearGradient>
        <mask id="crescent">
            <rect width="64" height="64" fill="black" />
            <circle cx="${m.cx}" cy="${m.cy}" r="${m.r}" fill="white" />
            <circle cx="${m.biteX}" cy="${m.biteY}" r="${m.biteR}" fill="black" />
        </mask>
    </defs>
    <rect width="64" height="64" rx="${radius}" fill="url(#night)" />
    <rect width="64" height="64" fill="url(#gold)" mask="url(#crescent)" />
</svg>
`;
}

/** Single-colour silhouette; Safari tints pinned tabs itself. */
function maskIconSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <title>DreamOff</title>
    <defs>
        <mask id="crescent">
            <rect width="64" height="64" fill="black" />
            <circle cx="${MOON.cx}" cy="${MOON.cy}" r="${MOON.r}" fill="white" />
            <circle cx="${MOON.biteX}" cy="${MOON.biteY}" r="${MOON.biteR}" fill="black" />
        </mask>
    </defs>
    <rect width="64" height="64" fill="black" mask="url(#crescent)" />
</svg>
`;
}

// density scales SVG rasterisation up front, so small sizes stay crisp instead
// of being downscaled from a 64 px render.
const render = (svg, size) =>
    sharp(Buffer.from(svg), { density: 384 })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toBuffer();

/**
 * Packs PNGs into an ICO container. ICO allows a PNG payload per entry, so no
 * BMP encoding is needed: a 6-byte header, a 16-byte directory entry per
 * image, then the PNG bytes.
 */
function buildIco(images) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2); // type 1 = icon
    header.writeUInt16LE(images.length, 4);

    const directory = Buffer.alloc(16 * images.length);
    let offset = header.length + directory.length;

    images.forEach(({ size, data }, i) => {
        const at = i * 16;
        directory.writeUInt8(size >= 256 ? 0 : size, at); // 0 means 256
        directory.writeUInt8(size >= 256 ? 0 : size, at + 1);
        directory.writeUInt16LE(1, at + 4); // colour planes
        directory.writeUInt16LE(32, at + 6); // bits per pixel
        directory.writeUInt32LE(data.length, at + 8);
        directory.writeUInt32LE(offset, at + 12);
        offset += data.length;
    });

    return Buffer.concat([header, directory, ...images.map(i => i.data)]);
}

const write = async (name, data) => {
    await writeFile(join(publicDir, name), data);
    const kb = (data.length / 1024).toFixed(1);
    console.log(`  ${name.padEnd(24)} ${kb.padStart(6)} kB`);
};

const rounded = tileSvg();
// iOS rounds the corners itself, and Android crops a maskable icon to its own
// shape, so both take a square tile. Only the maskable one is inset, because
// only its corners are actually cut off.
const square = tileSvg({ radius: 0 });
const maskable = tileSvg({ radius: 0, inset: 6.5 });

console.log('Vector:');
await write('favicon.svg', Buffer.from(rounded));
await write('mask-icon.svg', Buffer.from(maskIconSvg()));

console.log('\nRaster:');
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) icoImages.push({ size, data: await render(rounded, size) });
await write('favicon.ico', buildIco(icoImages));

await write('apple-touch-icon.png', await render(square, 180));
await write('icon-192.png', await render(rounded, 192));
await write('icon-512.png', await render(rounded, 512));
await write('icon-maskable-512.png', await render(maskable, 512));

console.log('\nDone. favicon.ico packs', icoSizes.join(', '), 'px.');
