#!/usr/bin/env node
/**
 * scripts/generate-dashboard-icons.js
 *
 * Generates the dashboard's PWA icons from app/apple-icon.png.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * A manifest needs real PNGs at the sizes it declares — a wrong `sizes` value
 * makes the manifest invalid and Chrome falls back to a screenshot or refuses to
 * install. This repo has no image library (no sharp, no jimp) and this is a
 * one-off, so the two obvious "fixes" were both wrong:
 *
 *   * adding `sharp` is a heavy dependency for three files generated once;
 *   * declaring 180x180 (the source) as "512x512" would be a lie that quietly
 *     breaks installation, which is the one thing the PWA has to do.
 *
 * So this decodes the source PNG and re-encodes it at each required size using
 * only Node's built-in `zlib`. It is deliberately narrow: 8-bit RGBA, no
 * interlacing, which is exactly what the source is (verified — the script
 * asserts it and refuses rather than guessing).
 *
 * The same applies to `public/manifest.json`, which declares
 * /icon-192x192.png and /icon-512x512.png — files that do not exist. That is a
 * pre-existing bug on the marketing site's manifest and is NOT fixed here; it is
 * reported rather than silently touched, because changing site-wide assets is a
 * different change from building a private dashboard.
 *
 * Usage: node scripts/generate-dashboard-icons.js
 * Outputs to public/dashboard/ (committed; they are brand assets, not build
 * artefacts, and generating them at build time would need this script in the
 * production image for no benefit).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SOURCE = path.join(process.cwd(), 'app', 'apple-icon.png');
const OUT_DIR = path.join(process.cwd(), 'public', 'dashboard');

/** Brand navy, matching tailwind's brand.navy and the manifest theme_color. */
const NAVY = { r: 0x0a, g: 0x1f, b: 0x44 };

// ── PNG decoding ─────────────────────────────────────────────────────────────

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Split a PNG into its chunks. */
function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  const chunks = {};
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    // IDAT is split across several chunks in practice; concatenate all of them.
    if (type === 'IDAT') chunks.IDAT = chunks.IDAT ? Buffer.concat([chunks.IDAT, data]) : data;
    else chunks[type] = data;
    off += 12 + len;
  }
  return chunks;
}

/** The five PNG row filters, from the spec. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decode an 8-bit RGBA non-interlaced PNG to {width, height, data} where data is
 * RGBA bytes, row-major.
 */
function decodePng(buf) {
  const chunks = readChunks(buf);
  if (!chunks.IHDR) throw new Error('no IHDR');

  const width = chunks.IHDR.readUInt32BE(0);
  const height = chunks.IHDR.readUInt32BE(4);
  const bitDepth = chunks.IHDR[8];
  const colorType = chunks.IHDR[9];
  const interlace = chunks.IHDR[12];

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth} (expected 8)`);
  if (colorType !== 6) throw new Error(`unsupported colour type ${colorType} (expected 6 = RGBA)`);
  if (interlace !== 0) throw new Error('interlaced PNGs are not supported');

  const raw = zlib.inflateSync(chunks.IDAT);
  const bpp = 4; // RGBA, 8-bit
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos + x];
      const a = x >= bpp ? out[rowStart + x - bpp] : 0; // left
      const b = y > 0 ? out[prevStart + x] : 0; // above
      const c = y > 0 && x >= bpp ? out[prevStart + x - bpp] : 0; // above-left
      let value;
      switch (filter) {
        case 0: value = cur; break;
        case 1: value = cur + a; break;
        case 2: value = cur + b; break;
        case 3: value = cur + ((a + b) >> 1); break;
        case 4: value = cur + paeth(a, b, c); break;
        default: throw new Error(`unknown row filter ${filter} on row ${y}`);
      }
      out[rowStart + x] = value & 0xff;
    }
    pos += stride;
  }

  return { width, height, data: out };
}

// ── PNG encoding ─────────────────────────────────────────────────────────────

/** CRC32 over a buffer. Node's zlib.crc32 exists on 20.15+/22+, else fall back. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode RGBA bytes as a PNG. Filter 0 (None) on every row — these are flat
 *  icons, so the compressed size is dominated by the palette, not the filter. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (stride + 1)] = 0; // filter: None
    rgba.copy(rawData, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rawData, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Compositing ──────────────────────────────────────────────────────────────

/**
 * Draw the source logo onto a square navy canvas, nearest-neighbour, centred,
 * covering `scale` of the canvas.
 *
 * Nearest-neighbour rather than smooth: it is a handful of lines instead of a
 * resampling kernel, and it is genuinely the right choice for the 180→192 case
 * where the scale is 1.07. At 180→512 it is visibly soft, which is the honest
 * cost of not shipping an image library for three files.
 *
 * Alpha is composited over navy so the icon is opaque. A transparent icon reads
 * as a floating logo on some Android launchers and as a black square on others.
 */
function compositeOnNavy(src, size, scale) {
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = NAVY.r;
    out[i * 4 + 1] = NAVY.g;
    out[i * 4 + 2] = NAVY.b;
    out[i * 4 + 3] = 255;
  }

  const drawSize = Math.round(size * scale);
  const offset = Math.round((size - drawSize) / 2);

  for (let y = 0; y < drawSize; y++) {
    const destY = y + offset;
    if (destY < 0 || destY >= size) continue;
    for (let x = 0; x < drawSize; x++) {
      const destX = x + offset;
      if (destX < 0 || destX >= size) continue;

      const sx = Math.min(src.width - 1, Math.floor((x / drawSize) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / drawSize) * src.height));
      const si = (sy * src.width + sx) * 4;

      const alpha = src.data[si + 3] / 255;
      const di = (destY * size + destX) * 4;
      out[di] = Math.round(src.data[si] * alpha + out[di] * (1 - alpha));
      out[di + 1] = Math.round(src.data[si + 1] * alpha + out[di + 1] * (1 - alpha));
      out[di + 2] = Math.round(src.data[si + 2] * alpha + out[di + 2] * (1 - alpha));
      out[di + 3] = 255;
    }
  }

  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source icon not found: ${SOURCE}`);
    process.exit(1);
  }

  const src = decodePng(fs.readFileSync(SOURCE));
  console.log(`Source ${path.relative(process.cwd(), SOURCE)}: ${src.width}x${src.height} RGBA`);

  // Report the corners so a baked-in white background is caught here rather than
  // discovered as an ugly white square on a phone home screen.
  const corners = [
    ['top-left', 0],
    ['top-right', (src.width - 1) * 4],
    ['bottom-left', (src.height - 1) * src.width * 4],
    ['bottom-right', (src.width * src.height - 1) * 4],
  ];
  for (const [name, i] of corners) {
    console.log(
      `  ${name}: rgba(${src.data[i]},${src.data[i + 1]},${src.data[i + 2]},${src.data[i + 3]})`,
    );
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // `any` icons: the logo fills most of the frame. Slightly inset so it does not
  // touch the edge on launchers that add their own corner radius.
  const files = [
    { name: 'icon-192.png', size: 192, scale: 0.92 },
    { name: 'icon-512.png', size: 512, scale: 0.92 },
    // `maskable`: Android crops to its own shape, so the logo must sit inside
    // the guaranteed-safe central circle (~80%). 0.62 keeps it comfortably in.
    { name: 'icon-512-maskable.png', size: 512, scale: 0.62 },
  ];

  for (const f of files) {
    const rgba = compositeOnNavy(src, f.size, f.scale);
    const png = encodePng(f.size, f.size, rgba);
    const outPath = path.join(OUT_DIR, f.name);
    fs.writeFileSync(outPath, png);
    console.log(`  wrote ${path.relative(process.cwd(), outPath)} (${f.size}x${f.size}, ${png.length} bytes)`);
  }
}

main();
