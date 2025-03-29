/**
 * This script generates PWA icons in various sizes.
 * You would normally use a real icon and a tool like sharp to generate
 * all the required sizes. This is just a simple example.
 *
 * To use this script:
 * 1. Create a public/icons folder
 * 2. Install sharp: npm install sharp
 * 3. Run: node scripts/generate-pwa-icons.js
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Define the sizes you need
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple icon - this is very basic!
// In a real app, you'd start with a high-quality icon file
async function generateIcons() {
    // Create a basic SVG with text
    const svgBuffer = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#4f46e5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="220" fill="white" text-anchor="middle" dominant-baseline="middle">F</text>
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
      <text x="50%" y="50%" font-family="Arial" font-size="400" fill="black" text-anchor="middle" dominant-baseline="middle">F</text>
    </svg>
  `);

    fs.writeFileSync(
        path.join(iconsDir, 'safari-pinned-tab.svg'),
        safariSvg
    );

    console.log('Generated all PWA icons');
}

generateIcons().catch(console.error);