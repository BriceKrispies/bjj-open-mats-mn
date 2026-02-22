/**
 * scripts/gen-icons.mjs
 *
 * Generates PNG icon files for the PWA manifest.
 * Run once during project setup: npm run icons
 *
 * Requires: npm install -D sharp  (add to devDependencies as needed)
 *
 * If you'd prefer not to install sharp, you can:
 *   - Export your icon.svg to PNG using Inkscape/Figma/etc.
 *   - Place icon-192.png and icon-512.png in public/icons/
 *   - The app works fine without this script (SVG icon is used as fallback)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicIcons = join(__dir, '..', 'public', 'icons');

// Try to use sharp if available, otherwise emit instructions
try {
  const sharp = (await import('sharp')).default;
  const svgBuffer = readFileSync(join(publicIcons, 'icon.svg'));

  for (const size of [192, 512]) {
    const outPath = join(publicIcons, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`✓ Generated ${outPath}`);
  }

  // Maskable variant (slightly smaller content, larger safe zone)
  const maskablePath = join(publicIcons, 'icon-512-maskable.png');
  await sharp(readFileSync(join(publicIcons, 'icon.svg')))
    .resize(512, 512)
    .png()
    .toFile(maskablePath);
  console.log(`✓ Generated ${maskablePath}`);

  console.log('\n✅ All icons generated successfully!');
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') {
    console.log(`
ℹ️  sharp is not installed. To generate PNG icons automatically:

    npm install -D sharp
    npm run icons

Alternatively, export public/icons/icon.svg to PNG manually:
  • icon-192.png  (192×192)
  • icon-512.png  (512×512)
  • icon-512-maskable.png  (512×512, with 80% safe zone)

The app works without PNG icons — the SVG fallback is used instead.
`);
  } else {
    throw e;
  }
}
