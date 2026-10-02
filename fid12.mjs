import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
const light = await load('/tmp/faith2-light.png');
const OLD = [247,242,239];
const d2 = (a,b) => (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
// find long horizontal runs of old-bg-like pixels (warm beige #F7F2EF +- dist 12)
let runs = [];
for (let y=0;y<light.h;y++) {
  let start=-1;
  for (let x=0;x<=light.w;x++) {
    const match = x<light.w && d2(px(light,x,y),OLD) < 144;
    if (match && start<0) start=x;
    if (!match && start>=0) { if (x-start >= 60) runs.push([y,start,x-start]); start=-1; }
  }
}
// merge vertically adjacent runs into regions
console.log('horizontal runs >=60px of #F7F2EF-family pixels:', runs.length);
for (const [y,x,len] of runs.slice(0,40)) console.log('  y'+y+' x'+x+' len'+len);
// same for the dark: old dark bg #201A15 vs new plate #332A24 — check for plate-sized regions of OLD dark bg outside cards is meaningless since cards ARE #201a16 legitimately. Skip.
