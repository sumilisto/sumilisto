const sharp = require('sharp');
const fs = require('fs');

async function createSquareSIcon() {
  const inputPath = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0/.user_uploaded/media_1792134289822.png';
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  
  // Crop the letter 'S': x: [112, 301], y: [118, 398]
  const sWidth = 301 - 112 + 1; // 190
  const sHeight = 398 - 118 + 1; // 281
  
  // Extract S mask: where srcAlpha < 100 is S
  const sMask = Buffer.alloc(sWidth * sHeight * 4);
  for (let y = 0; y < sHeight; y++) {
    for (let x = 0; x < sWidth; x++) {
      const origX = 112 + x;
      const origY = 118 + y;
      const srcIdx = (origY * info.width + origX) * 4;
      const sIdx = (y * sWidth + x) * 4;
      
      const isS = data[srcIdx + 3] < 100;
      if (isS) {
        // Verde Bosque (#166534): 22, 101, 52, 255
        sMask[sIdx] = 22;
        sMask[sIdx + 1] = 101;
        sMask[sIdx + 2] = 52;
        sMask[sIdx + 3] = 255;
      } else {
        // transparent
        sMask[sIdx] = 0;
        sMask[sIdx + 1] = 0;
        sMask[sIdx + 2] = 0;
        sMask[sIdx + 3] = 0;
      }
    }
  }
  
  // Save isolated S
  const sPngBuffer = await sharp(sMask, { raw: { width: sWidth, height: sHeight, channels: 4 } }).png().toBuffer();
  
  // Resize S to height = 340px (width ~ 230px) so it fills the square box boldly and clearly
  const sResized = await sharp(sPngBuffer).resize(null, 340).toBuffer();
  const sResizedMeta = await sharp(sResized).metadata();
  
  // Create 512x512 background:
  // Rounded square badge: 480x480, rx=96, border in #166534 (width 28px), fill in #ffffff
  const badgeSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <!-- White badge with thick Verde Bosque border like the logo's frame -->
      <rect x="20" y="20" width="472" height="472" rx="100" fill="#ffffff" stroke="#166534" stroke-width="28" />
    </svg>
  `);
  
  // Composite S in the center of badge
  const sIcon512 = await sharp(badgeSvg)
    .composite([{ input: sResized, gravity: 'center' }])
    .png()
    .toBuffer();
    
  await sharp(sIcon512).toFile('public/icons/icon-512.png');
  await sharp(sIcon512).resize(192, 192).toFile('public/icons/icon-192.png');
  await sharp(sIcon512).resize(180, 180).toFile('public/icons/apple-touch-icon.png');
  await sharp(sIcon512).resize(64, 64).toFile('public/icons/icon-64.png');
  await sharp(sIcon512).resize(32, 32).toFile('public/favicon.png');
  await sharp(sIcon512).resize(32, 32).toFile('public/favicon.ico');
  
  // Also create icon.svg with this new design
  const b64 = sIcon512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>`;
  fs.writeFileSync('public/icons/icon.svg', svgContent);
  
  console.log('Square S icon created successfully with dimensions:', sResizedMeta.width, 'x', sResizedMeta.height);
}

createSquareSIcon().catch(err => {
  console.error(err);
  process.exit(1);
});
