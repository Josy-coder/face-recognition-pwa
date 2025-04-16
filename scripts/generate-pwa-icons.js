/**
 * This script generates PWA icons in various sizes.
 * You would normally use a real icon and a tool like sharp to generate
 * all the required sizes.
 *
 * To use this script:
 * 1. Create a public/icons folder
 * 2. Install sharp: npm install sharp
 * 3. Run: node scripts/generate-pwa-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Define the sizes you need
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];


async function generateIcons() {
    // Create a basic SVG with text
    const svgBuffer = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="64" fill="#f59e0b"/>
      <text x="50%" y="50%" font-family="Arial" font-size="220" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">PNG</text>
    </svg>
  `);

    // Generate a favicon.ico (very simplistic approach)
    await sharp(svgBuffer)
        .resize(32, 32)
        .toFile(path.join(iconsDir, 'favicon.ico'));

    // Generate all size variations
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

        console.log(`Generated icon-${size}x${size}.png`);
    }

    // Generate Safari pinned tab icon
    const safariSvg = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" font-family="Arial" font-size="400" fill="black" text-anchor="middle" dominant-baseline="middle" font-weight="bold">PNG</text>
    </svg>
  `);

    fs.writeFileSync(
        path.join(iconsDir, 'safari-pinned-tab.svg'),
        safariSvg
    );

    console.log('Generated all PWA icons');
}

generateIcons().catch(console.error);