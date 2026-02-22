#!/usr/bin/env node
/**
 * Generate PNG icons from icon.svg.
 *
 * Usage: node scripts/gen-icons.mjs
 *
 * Requires a canvas-capable environment. If sharp or canvas aren't available,
 * this script generates simple placeholder PNGs using a minimal PNG encoder.
 *
 * The PNGs are just solid-color placeholders — replace with real artwork for production.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Minimal PNG encoder (RGBA, uncompressed, no dependency)
function createPng(width, height, r, g, b) {
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT — raw image data (store, no compression for simplicity)
  const rawRow = Buffer.alloc(1 + width * 3); // filter byte + RGB
  rawRow[0] = 0; // no filter
  for (let x = 0; x < width; x++) {
    rawRow[1 + x * 3] = r;
    rawRow[1 + x * 3 + 1] = g;
    rawRow[1 + x * 3 + 2] = b;
  }

  // Build zlib stream: stored blocks
  const rowBuf = rawRow;
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(rowBuf);
  }
  const rawData = Buffer.concat(rows);

  // Wrap in zlib (deflate stored)
  // zlib header: 0x78 0x01, then stored blocks, then adler32
  const blocks = [];
  const BLOCK_SIZE = 65535;
  for (let i = 0; i < rawData.length; i += BLOCK_SIZE) {
    const end = Math.min(i + BLOCK_SIZE, rawData.length);
    const slice = rawData.subarray(i, end);
    const isLast = end === rawData.length;
    const header = Buffer.alloc(5);
    header[0] = isLast ? 1 : 0;
    header.writeUInt16LE(slice.length, 1);
    header.writeUInt16LE(~slice.length & 0xffff, 3);
    blocks.push(header, slice);
  }

  // Adler32
  let a = 1, bs = 0;
  for (let i = 0; i < rawData.length; i++) {
    a = (a + rawData[i]) % 65521;
    bs = (bs + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE((bs << 16) | a);

  const zlibData = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adler]);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlibData), iend]);
}

// Generate blue placeholder icons
const sizes = [192, 512];
for (const size of sizes) {
  const png = createPng(size, size, 0x1d, 0x4e, 0xd8);
  const path = join(iconsDir, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`Generated ${path} (${size}x${size})`);
}
