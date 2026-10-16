const sharp = require('sharp');
const fs = require('fs');

async function makeFavicons() {
  const inputPath = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0/.user_uploaded/media_1792134289822.png';
  const { data: origData, info: origInfo } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const W = origInfo.width;
  
  // Crop the letter 'S': x: [112, 301], y: [118, 398]
  const sW = 301 - 112 + 1;
  const sH = 398 - 118 + 1;
  const sWhiteMask = Buffer.alloc(sW * sH * 4);
  
  for (let y = 0; y < sH; y++) {
    for (let x = 0; x < sW; x++) {
      const origX = 112 + x;
      const origY = 118 + y;
      const srcIdx = (origY * W + origX) * 4;
      const sIdx = (y * sW + x) * 4;
      
      const isS = origData[srcIdx + 3] < 100;
      if (isS) {
        sWhiteMask[sIdx] = 255;
        sWhiteMask[sIdx + 1] = 255;
        sWhiteMask[sIdx + 2] = 255;
        sWhiteMask[sIdx + 3] = 255;
      } else {
        sWhiteMask[sIdx] = 0;
        sWhiteMask[sIdx + 1] = 0;
        sWhiteMask[sIdx + 2] = 0;
        sWhiteMask[sIdx + 3] = 0;
      }
    }
  }
  
  // 512x512 Master Favicon
  // S height: 350px (fills height ~68% of canvas, perfectly proportioned)
  const sResized = await sharp(sWhiteMask, { raw: { width: sW, height: sH, channels: 4 } })
    .resize(null, 350)
    .png()
    .toBuffer();
    
  // Rounded square badge:
  // Background: Verde Bosque #166534
  // Frame: White stroke-width=36 (gives a solid 2.25px line when downscaled to 32x32!)
  const faviconSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill="#166534" />
      <rect x="28" y="28" width="456" height="456" rx="84" fill="none" stroke="#ffffff" stroke-width="36" />
    </svg>
  `);
  
  const favicon512 = await sharp(faviconSvg)
    .composite([{ input: sResized, gravity: 'center' }])
    .png()
    .toBuffer();
    
  // Write master 512 and icon-64
  await sharp(favicon512).toFile('public/icons/favicon-512.png');
  await sharp(favicon512).resize(64, 64).toFile('public/icons/icon-64.png');
  
  // 32x32 with lanczos3 kernel for maximum sharpness
  const favicon32 = await sharp(favicon512)
    .resize(32, 32, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
    
  await sharp(favicon32).toFile('public/favicon.png');
  await sharp(favicon32).toFile('public/favicon.ico');
  await sharp(favicon32).toFile('src/app/icon.png');
  
  // Also copy to artifact dir so user can view
  const artifactDir = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0';
  await sharp(favicon512).toFile(artifactDir + '/favicon_preview_large.png');
  await sharp(favicon32).resize(256, 256, { kernel: 'nearest' }).toFile(artifactDir + '/favicon_pixel_perfect_zoomed.png');
  
  console.log('Favicons generated with pixel precision!');
}

makeFavicons().catch(err => {
  console.error(err);
  process.exit(1);
});
