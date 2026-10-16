const sharp = require('sharp');
const fs = require('fs');

async function updateSplashIcons() {
  const logoPath = 'public/logo.png';
  const logoResized = await sharp(logoPath)
    .resize(380)
    .png()
    .toBuffer();
    
  const splash512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 22, g: 101, b: 52, alpha: 1 } // #166534
    }
  })
  .composite([{ input: logoResized, gravity: 'center' }])
  .png()
  .toBuffer();
  
  await sharp(splash512).toFile('public/icons/icon-512.png');
  await sharp(splash512).resize(192, 192).toFile('public/icons/icon-192.png');
  await sharp(splash512).resize(180, 180).toFile('public/icons/apple-touch-icon.png');
  
  const b64 = splash512.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>`;
  fs.writeFileSync('public/icons/icon.svg', svg);

  const artifactDir = 'C:/Users/Familia/.gemini/antigravity-ide/brain/8a996f5b-60d2-4f19-b827-9ff339b8abb0';
  fs.copyFileSync('public/icons/icon-512.png', artifactDir + '/splash_preview.png');
  fs.copyFileSync('public/logo.png', artifactDir + '/logo_white_preview.png');
  
  console.log('Splash icons updated with exact untouched logo!');
}

updateSplashIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
