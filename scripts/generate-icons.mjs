import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";

const OUT_DIR = "public/icons";
const svg = await readFile("design/icon.svg", "utf8");

async function renderSvg(size, outPath, markup = svg) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // Replace width/height attributes and add display:block to prevent inline baseline gaps
  const scaled = markup
    .replace(/width="512"/, `width="${size}"`)
    .replace(/height="512"/, `height="${size}"`)
    .replace('<svg ', '<svg style="display:block" ');
  await page.setContent(`<body style="margin:0;background:transparent">${scaled}</body>`);
  await page.locator("svg").screenshot({ path: outPath, omitBackground: true });
  await browser.close();
  console.log(`generated ${outPath} (${size}x${size})`);
}

// maskable 版：背景铺满（无圆角），内容不超出 80% 安全区
const maskable = svg
  .replace(
    '<rect width="512" height="512" rx="88" fill="#4f46e5"/>',
    '<rect width="512" height="512" fill="#4f46e5"/>',
  )
  // 缩放内容到安全区（中心 300px 见方 ≈ 58% < 80%）
  .replace('r="140"', 'r="120"')
  .replace('points="220,180 220,332 350,256"', 'points="228,190 228,322 336,256"');

await mkdir(OUT_DIR, { recursive: true });
await renderSvg(192, `${OUT_DIR}/icon-192.png`);
await renderSvg(512, `${OUT_DIR}/icon-512.png`);
await renderSvg(512, `${OUT_DIR}/maskable-512.png`, maskable);