import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
import fs from 'fs';

const NEW_LIGHT = [238,241,247]; // #EEF1F7
const OLD_LIGHT = [247,242,239]; // #F7F2EF
const NEW_DARK  = [51,42,36];   // #332A24
const OLD_DARK  = [32,26,21];   // #201A15
const d2 = (a,b) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;

const files = fs.readdirSync('public/model-previews').filter(f => f.endsWith('.webp')).sort();
let report = [];
for (const f of files) {
  const { data, info } = await sharp('public/model-previews/' + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const isDark = f.includes('-dark');
  const NEW = isDark ? NEW_DARK : NEW_LIGHT, OLD = isDark ? OLD_DARK : OLD_LIGHT;
  const px = (x,y) => { const i=(y*w+x)*ch; return [data[i],data[i+1],data[i+2]]; };
  const corners = [px(2,2), px(w-3,2), px(2,h-3), px(w-3,h-3), px(w>>1, 2), px(w>>1, h-3)];
  // count pixels: near-new-bg, near-old-bg, warm fringe (r-b > 6 while lightish bg luminance), cold count
  let nNew=0, nOld=0, nWarmBgLum=0, nPx=0;
  // seam check: mean bg color left 8% vs right 8% columns (using bg-classified pixels)
  let Lr=0,Lg=0,Lb=0,Ln=0, Rr=0,Rg=0,Rb=0,Rn=0, Tr=0,Tg=0,Tb=0,Tn=0, Br=0,Bg=0,Bb=0,Bn=0;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const c = px(x,y); nPx++;
    if (d2(c,NEW) < 30) nNew++;
    if (d2(c,OLD) < 30) nOld++;
    const lum = 0.299*c[0]+0.587*c[1]+0.114*c[2];
    const isBgLum = isDark ? (lum<80) : (lum>200);
    if (isBgLum && (c[0]-c[2]) > 8) nWarmBgLum++;
    if (d2(c,NEW) < 900) { // loose bg family
      if (x < w*0.08) { Lr+=c[0];Lg+=c[1];Lb+=c[2];Ln++; }
      if (x > w*0.92) { Rr+=c[0];Rg+=c[1];Rb+=c[2];Rn++; }
      if (y < h*0.08) { Tr+=c[0];Tg+=c[1];Tb+=c[2];Tn++; }
      if (y > h*0.92) { Br+=c[0];Bg+=c[1];Bb+=c[2];Bn++; }
    }
  }
  const mean = a => a.n? [Math.round(a.r/a.n),Math.round(a.g/a.n),Math.round(a.b/a.n)] : null;
  const L = mean({r:Lr,g:Lg,b:Lb,n:Ln}), R = mean({r:Rr,g:Rg,b:Rb,n:Rn});
  const T = mean({r:Tr,g:Tg,b:Tb,n:Tn}), B = mean({r:Br,g:Bg,b:Bb,n:Bn});
  const seamLR = L&&R ? Math.max(Math.abs(L[0]-R[0]),Math.abs(L[1]-R[1]),Math.abs(L[2]-R[2])) : -1;
  const seamTB = T&&B ? Math.max(Math.abs(T[0]-B[0]),Math.abs(T[1]-B[1]),Math.abs(T[2]-B[2])) : -1;
  report.push({f, size: w+'x'+h, corner: corners[0].join(','), pctNew: (100*nNew/nPx).toFixed(1), pctOld: (100*nOld/nPx).toFixed(3), nWarmBgLum, seamLR, seamTB});
}
for (const r of report) console.log(
  r.f.padEnd(42), r.size.padStart(10), 'corner['+r.corner+']', 'new%'+r.pctNew.padStart(6), 'old%'+r.pctOld.padStart(7), 'warmBgLum'+String(r.nWarmBgLum).padStart(7), 'seamLR'+String(r.seamLR).padStart(4), 'seamTB'+String(r.seamTB).padStart(4));
