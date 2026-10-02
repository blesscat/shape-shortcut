import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
function avg(im, x0, y0, x1, y1) {
  let r=0,g=0,b=0,n=0;
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){ const c=px(im,x,y); r+=c[0];g+=c[1];b+=c[2];n++; }
  return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];
}
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');
console.log('Plate bg uniformity (avg of 20x8 patch per card, top strip of plate y806-814):');
for (const [name, im] of [['light',light],['dark',dark]]) {
  const spots = [['card1',100,806],['card2',330,806],['card3',660,806],['card4',930,806]];
  for (const [n,x,y] of spots) {
    // find a 24px window in the top strip with minimal variance; just report two windows per card
    const a = avg(im, x, y, x+24, y+8);
    const b = avg(im, x+150, y, x+174, y+8);
    console.log(' ', name, n, hex(a), hex(b));
  }
}
// text metrics: card1 white area rows containing dark pixels (light)
console.log('\nLIGHT card1 text rows (x80-320, y975-1080):');
for (let y=975;y<1080;y++) {
  let dark_=0, first=-1, last=-1;
  for (let x=80;x<320;x++){ const c=px(light,x,y); if (0.3*c[0]+0.59*c[1]+0.11*c[2] < 140) { dark_++; if(first<0)first=x; last=x; } }
  if (dark_>2) console.log('  y'+y, 'darkpx'+String(dark_).padStart(4), 'x'+first+'-'+last);
}
