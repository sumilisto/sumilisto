const sharp = require('sharp');
const fs = require('fs');

async function makeIcons() {
  const bgSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#166534" />
          <stop offset="100%" stop-color="#14532D" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#g)" />
    </svg>
  `);
  
  // Resize logo.png to fit nicely (width 400, height proportional ~202)
  const logoResized = await sharp('public/logo.png')
    .resize(400)
    .toBuffer();
  
  // Composite logo over background
  await sharp(bgSvg)
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toFile('public/icons/icon-512.png');
    
  // 192x192
  await sharp('public/icons/icon-512.png')
    .resize(192, 192)
    .png()
    .toFile('public/icons/icon-192.png');
    
  // apple-touch-icon.png (180x180)
  await sharp('public/icons/icon-512.png')
    .resize(180, 180)
    .png()
    .toFile('public/icons/apple-touch-icon.png');

  // favicon.png (32x32)
  await sharp('public/icons/icon-512.png')
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');

  // favicon.ico
  await sharp('public/favicon.png')
    .toFile('public/favicon.ico');

  // Embed high-res icon into icon.svg
  const b64 = fs.readFileSync('public/icons/icon-512.png').toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>`;
  fs.writeFileSync('public/icons/icon.svg', svg);
    
  console.log('App icons and splash icons generated successfully with exact logo!');
}

makeIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
