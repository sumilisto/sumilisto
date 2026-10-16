const sharp = require('sharp');
const fs = require('fs');

async function buildAllAssets() {
  console.log('--- 1. Building White Logo on Transparent Background ---');
  const inputPath = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0/.user_uploaded/media_1792134289822.png';
  const { data: origData, info: origInfo } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = origInfo;
  
  // Extract pure white logo:
  // Where srcAlpha < 128 and not far outside padding, that's the strokes of the logo (border + text Sumi)
  const whiteLogoBuf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const srcAlpha = origData[idx + 3];
      const isOutside = (x < 40 || x > W - 40 || y < 40 || y > H - 40) && (srcAlpha < 100);
      const isStroke = (srcAlpha < 128 && !isOutside);
      
      if (isStroke) {
        whiteLogoBuf[idx] = 255;
        whiteLogoBuf[idx + 1] = 255;
        whiteLogoBuf[idx + 2] = 255;
        whiteLogoBuf[idx + 3] = 255;
      } else {
        whiteLogoBuf[idx] = 0;
        whiteLogoBuf[idx + 1] = 0;
        whiteLogoBuf[idx + 2] = 0;
        whiteLogoBuf[idx + 3] = 0;
      }
    }
  }
  
  // Trim any extraneous transparent padding around the logo so it centers perfectly
  const trimmedWhiteLogo = await sharp(whiteLogoBuf, { raw: { width: W, height: H, channels: 4 } })
    .trim()
    .toBuffer({ resolveWithObject: true });
    
  console.log('Trimmed white logo size:', trimmedWhiteLogo.info.width, 'x', trimmedWhiteLogo.info.height);
  
  // Save as official public/logo.png and public/logo-white.png
  await sharp(trimmedWhiteLogo.data, { raw: { width: trimmedWhiteLogo.info.width, height: trimmedWhiteLogo.info.height, channels: 4 } })
    .png()
    .toFile('public/logo.png');
    
  await sharp(trimmedWhiteLogo.data, { raw: { width: trimmedWhiteLogo.info.width, height: trimmedWhiteLogo.info.height, channels: 4 } })
    .png()
    .toFile('public/logo-white.png');
  
  console.log('--- 2. Building Splash Screen Icons (Green Background #166534 + Centered White Logo) ---');
  // For 512x512 splash icon:
  // Background: Solid Verde Bosque #166534
  // Logo: Scaled to width ~370px, centered
  const logoScaled370 = await sharp(trimmedWhiteLogo.data, {
    raw: { width: trimmedWhiteLogo.info.width, height: trimmedWhiteLogo.info.height, channels: 4 }
  })
  .resize(370)
  .png()
  .toBuffer();
  
  const splash512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 22, g: 101, b: 52, alpha: 1 } // #166534 Verde Bosque
    }
  })
  .composite([{ input: logoScaled370, gravity: 'center' }])
  .png()
  .toBuffer();
  
  await sharp(splash512).toFile('public/icons/icon-512.png');
  await sharp(splash512).resize(192, 192).toFile('public/icons/icon-192.png');
  await sharp(splash512).resize(180, 180).toFile('public/icons/apple-touch-icon.png');
  
  // SVG for splash icon
  const splashB64 = splash512.toString('base64');
  fs.writeFileSync('public/icons/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${splashB64}"/>
</svg>`);

  console.log('--- 3. Building Favicon (Green Background #166534 + White Frame + White S) ---');
  // Crop the letter 'S': x: [112, 301], y: [118, 398] in original image
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
        // Pure White: 255, 255, 255, 255
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
  
  // Scale white S to height = 330px
  const sResized = await sharp(sWhiteMask, { raw: { width: sW, height: sH, channels: 4 } })
    .resize(null, 330)
    .png()
    .toBuffer();
    
  // 512x512 Favicon canvas:
  // Fondo: Verde Bosque #166534 con esquinas redondeadas rx=96
  // Recuadro / marco: Blanco puro #ffffff (grosor 26px)
  const faviconSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <!-- Fondo Verde Bosque con esquinas redondeadas -->
      <rect width="512" height="512" rx="100" fill="#166534" />
      <!-- Recuadro blanco como el marco del logo adaptado a cuadrado -->
      <rect x="24" y="24" width="464" height="464" rx="76" fill="none" stroke="#ffffff" stroke-width="26" />
    </svg>
  `);
  
  const favicon512 = await sharp(faviconSvg)
    .composite([{ input: sResized, gravity: 'center' }])
    .png()
    .toBuffer();
    
  await sharp(favicon512).resize(64, 64).toFile('public/icons/icon-64.png');
  await sharp(favicon512).resize(32, 32).toFile('public/favicon.png');
  await sharp(favicon512).resize(32, 32).toFile('public/favicon.ico');
  
  console.log('All brand assets successfully built!');
}

buildAllAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
