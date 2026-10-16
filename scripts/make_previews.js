const sharp = require('sharp');
const fs = require('fs');
const artifactDir = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0';

async function generatePreviews() {
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
  
  const sResized = await sharp(sWhiteMask, { raw: { width: sW, height: sH, channels: 4 } })
    .resize(null, 330)
    .png()
    .toBuffer();
    
  // 512x512 Favicon (Solid Verde Bosque, no white border)
  const faviconSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill="#166534" />
    </svg>
  `);
  
  const favicon512 = await sharp(faviconSvg)
    .composite([{ input: sResized, gravity: 'center' }])
    .png()
    .toBuffer();
    
  await sharp(favicon512).toFile(artifactDir + '/favicon_preview_large.png');
  
  // Also create a realistic browser tab mockup (600x120)
  const tabSvg = Buffer.from(`
    <svg width="600" height="120" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="120" fill="#202124" />
      <!-- Chrome tab shape -->
      <path d="M 30,110 L 45,35 Q 50,25 60,25 L 290,25 Q 300,25 305,35 L 320,110 Z" fill="#292a2d" />
      <!-- Tab text -->
      <text x="100" y="73" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#e8eaed" font-weight="500">Sumilisto - Suministros...</text>
      <!-- Close button x -->
      <text x="280" y="73" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#9aa0a6">×</text>
    </svg>
  `);
  
  const faviconTabSize = await sharp(favicon512)
    .resize(28, 28)
    .png()
    .toBuffer();
    
  await sharp(tabSvg)
    .composite([{ input: faviconTabSize, left: 62, top: 52 }])
    .png()
    .toFile(artifactDir + '/browser_tab_preview.png');
  
  // Copy splash preview and logo preview
  fs.copyFileSync('public/icons/icon-512.png', artifactDir + '/splash_preview.png');
  fs.copyFileSync('public/logo.png', artifactDir + '/logo_white_preview.png');
  
  console.log('Previews generated successfully!');
}

generatePreviews().catch(err => {
  console.error(err);
  process.exit(1);
});
