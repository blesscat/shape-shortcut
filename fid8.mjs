import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
function line(im, label, x0,x1,dx, y0,y1,dy, vert=false) {
  console.log('\n' + label);
  const out = [];
  if (!vert) {
    let hdr = '     ';
    for (let x=x0;x<=x1;x+=dx) hdr += String(x).padStart(8);
    console.log(hdr);
    for (let y=y0;y<=y1;y+=dy) {
      let l = String(y).padStart(4)+' ';
      for (let x=x0;x<=x1;x+=dx) l += hex(px(im,x,y)).padStart(8);
      console.log(l);
    }
  }
}
// vertical scans for hairlines
function vscan(im, label, x, y0, y1) {
  console.log('\n' + label + ' (x=' + x + ')');
  for (let y=y0;y<=y1;y++) {
    const c = px(im,x,y);
    const lum = Math.round(0.299*c[0]+0.587*c[1]+0.114*c[2]);
    if (y===y0 || lum < 235) console.log('  y'+String(y).padStart(4), hex(c), 'lum'+lum);
  }
}
// coral search
function coral(im, label, x0,x1,y0,y1, dark=false) {
  let n=0, sum=[0,0,0], xs=[], ys=[];
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) {
    const c = px(im,x,y);
    if (c[0]>130 && c[0]-c[2]>50 && c[0]-c[1]>40 && (!dark || c[1]>60)) { n++; sum[0]+=c[0];sum[1]+=c[1];sum[2]+=c[2]; xs.push(x); ys.push(y); }
  }
  if (n) console.log(label + ': CORAL px=' + n, 'mean=#' + sum.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join(''), 'bbox x[' + Math.min(...xs) + '-' + Math.max(...xs) + '] y[' + Math.min(...ys) + '-' + Math.max(...ys) + ']');
  else console.log(label + ': no coral found');
}
// green stamp search
function green(im, label, x0,x1,y0,y1) {
  let n=0, sum=[0,0,0], xs=[], ys=[];
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) {
    const c = px(im,x,y);
    if (c[1]-c[0]>15 && c[1]-c[2]>10 && c[1]>90) { n++; sum[0]+=c[0];sum[1]+=c[1];sum[2]+=c[2]; xs.push(x); ys.push(y); }
  }
  if (n) console.log(label + ': GREEN px=' + n, 'mean=#' + sum.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join(''), 'bbox x[' + Math.min(...xs) + '-' + Math.max(...xs) + '] y[' + Math.min(...ys) + '-' + Math.max(...ys) + ']');
  else console.log(label + ': no green found');
}
const mock = await load('/tmp/design-mockup-v2.png');
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');

line(mock, 'MOCKUP hero thumb left edge (x44-64, y105-165)', 44,64,2, 105,165,6);
line(mock, 'MOCKUP hero thumb right edge (x100-120, y105-165)', 100,120,2, 105,165,6);
vscan(mock, 'MOCKUP head-to-hero vertical scan x512, y60-100', 512, 60, 100);
vscan(light, 'LIGHT impl head-to-hero vertical scan x640, y485-525', 640, 485, 525);
vscan(dark, 'DARK impl head-to-hero vertical scan x640, y485-525', 640, 485, 525);
line(light, 'LIGHT impl hairline row detail: x100-1180 step 60 at hairline y (find below)', 100, 1180, 60, 0, 0, 0);
coral(mock, 'MOCKUP toggle area x930-1010 y508-540');
coral(light, 'LIGHT impl toggle area x1100-1270 y1085-1140');
coral(dark,  'DARK impl toggle area x1100-1270 y1085-1140', true);
green(mock, 'MOCKUP hero1 stamp x900-1010 y108-145');
green(mock, 'MOCKUP hero2 stamp x900-1010 y200-240');
green(light, 'LIGHT impl hero1 stamp x1100-1270 y530-600');
green(light, 'LIGHT impl hero2 stamp x1100-1270 y670-720');
green(dark, 'DARK impl hero1 stamp x1100-1270 y530-600');
green(dark, 'DARK impl hero2 stamp x1100-1270 y670-720');
