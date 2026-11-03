// Generates the fel-fire backdrop images in src/assets/backdrop/. Run: npm run backdrop (then check the page; the CSS
// strength knobs are --fel and --smoke in src/styles/global.css).
// Fel backdrop images, drawn from noise (no outlines), the way shader fire works: a gradient that fades upward, plus
// vertically stretched noise; where the sum is high there's flame, so tongues rise out of the noise and thin to wisps.
// A second, finer noise licks the edges. Colour: translucent green, a lime core where it's densest, and a soft glow.
// Noise is generated over exactly one tile and repeated (feTile), so each image tiles sideways without a seam.
// Smoke: stitched fractal noise turned into green-grey wisps.
import fs from 'node:fs';
function fire(W,H,o){const P=120;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs>`+
  `<linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`+
  `<filter id="f" filterUnits="userSpaceOnUse" x="${-P}" y="0" width="${W+2*P}" height="${H}" color-interpolation-filters="sRGB">`+
   `<feTurbulence x="0" y="0" width="${W}" height="${H}" type="fractalNoise" baseFrequency="${o.freq}" numOctaves="4" seed="${o.seed}" stitchTiles="stitch"/><feTile/>`+
   `<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" result="n"/>`+
   `<feTurbulence x="0" y="0" width="${W}" height="${H}" type="turbulence" baseFrequency="${o.lickFreq}" numOctaves="2" seed="${o.seed+5}" stitchTiles="stitch"/><feTile result="lick"/>`+
   // flame density = gradient + noise − threshold
   `<feComposite in="SourceGraphic" in2="n" operator="arithmetic" k2="${o.base}" k3="1" k4="${-o.cut}"/>`+
   `<feDisplacementMap in2="lick" scale="${o.lick}" xChannelSelector="R" yChannelSelector="G"/>`+
   `<feGaussianBlur stdDeviation="${o.soft}"/>`+
   `<feComponentTransfer result="d"><feFuncA type="table" tableValues="0 .08 .4 .7 .88 1"/></feComponentTransfer>`+
   `<feFlood flood-color="#2fe82a"/><feComposite in2="d" operator="in" result="green"/>`+
   `<feComponentTransfer in="d" result="dense"><feFuncA type="table" tableValues="0 0 0 .15 .55 .9"/></feComponentTransfer>`+
   `<feFlood flood-color="#b4ff4a"/><feComposite in2="dense" operator="in" result="core"/>`+
   `<feGaussianBlur in="green" stdDeviation="${o.glow}" result="glow"/>`+
   `<feMerge><feMergeNode in="glow"/><feMergeNode in="green"/><feMergeNode in="core"/></feMerge></filter>`+
  `</defs><rect x="${-P}" width="${W+2*P}" height="${H}" fill="url(#g)" filter="url(#f)"/></svg>\n`;}
const smoke=(W,H)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>`+
 `<linearGradient id="m" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset=".3" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`+
 `<filter id="s" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0035 0.009" numOctaves="5" seed="4" stitchTiles="stitch"/>`+
 `<feColorMatrix values="0 0 0 0 .62  0 0 0 0 .78  0 0 0 0 .6  2.4 0 0 0 -1.05"/><feComposite in2="SourceGraphic" operator="in"/></filter>`+
 `</defs><rect width="${W}" height="${H}" fill="url(#m)" filter="url(#s)"/></svg>\n`;
const out=new URL('../src/assets/backdrop/',import.meta.url);
fs.writeFileSync(new URL('fel-back.svg',out),fire(1200,440,{seed:11,freq:'0.012 0.0015',lickFreq:'0.025 0.012',lick:22,base:1.05,cut:.88,soft:1.4,glow:10}));
fs.writeFileSync(new URL('fel-front.svg',out),fire(1200,320,{seed:29,freq:'0.02 0.0025',lickFreq:'0.04 0.02',lick:14,base:1.1,cut:.95,soft:.9,glow:7}));
fs.writeFileSync(new URL('fel-smoke.svg',out),smoke(1200,640));
