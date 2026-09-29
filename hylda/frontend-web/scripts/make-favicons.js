const fs = require('fs');
const path = require('path');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function make(inPng, outIco) {
  const pngPath = path.resolve(inPng);
  const icoPath = path.resolve(outIco);
  if (!fs.existsSync(pngPath)) {
    console.error('PNG not found:', pngPath);
    return;
  }
  try {
    const { PNG } = require('pngjs');
    const png = PNG.sync.read(fs.readFileSync(pngPath));
    const buf = png.width === png.height ? await pngToIco(pngPath) : await pngToIco(pngPath);
    fs.writeFileSync(icoPath, buf);
    console.log('Wrote', icoPath);
  } catch (e) {
    console.error('Failed to create', icoPath, e);
  }
}

(async () => {
  await make('public/img/favicon_az.png', 'public/img/favicon-az.ico');
  await make('public/img/favicon_am.png', 'public/img/favicon-am.ico');
})();


