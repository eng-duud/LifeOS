import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = join(import.meta.dirname, "..", "client", "public");
const COLORS = {
  background: "#0f172a",
  foreground: "#f8fafc",
  accent: "#2563eb",
  accentLight: "#3b82f6",
};
const SIZES = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

// ── SVG template ──────────────────────────────────────────────────────────────
function svgIcon(size, opts = {}) {
  const {
    bg = COLORS.background,
    fg = COLORS.foreground,
    accent = COLORS.accent,
    accentL = COLORS.accentLight,
    maskable = false,
  } = opts;

  const viewBox = 512;

  // If maskable, apply "safe zone" — icon fits within 80% centered area
  const cx = viewBox / 2;
  const cy = viewBox / 2 + 16; // slight optical center
  const r = maskable ? 140 : 152;

  // The "Life OS" icon: a stylized hexagon/circuit pattern representing life areas
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentL}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="${cx}" cy="${cy}" r="${viewBox * (maskable ? 0.45 : 0.5)}" fill="${bg}" />
  <!-- Outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#g)" stroke-width="24" />
  <!-- Inner hexagon-like shape -->
  <polygon points="${cx},${cy - 80} ${cx + 70},${cy - 40} ${cx + 70},${cy + 40} ${cx},${cy + 80} ${cx - 70},${cy + 40} ${cx - 70},${cy - 40}"
    fill="url(#g)" opacity="0.9" />
  <!-- Center dot -->
  <circle cx="${cx}" cy="${cy}" r="18" fill="${fg}" opacity="0.95" />
  <!-- Small orbital dots -->
  ${[0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const ox = cx + (r + 28) * Math.cos(rad);
      const oy = cy + (r + 28) * Math.sin(rad);
      return `<circle cx="${ox}" cy="${oy}" r="8" fill="${accentL}" opacity="0.7" />`;
    })
    .join("")}
  <!-- Inner orbital arc -->
  <circle cx="${cx}" cy="${cy}" r="100" fill="none" stroke="${fg}" stroke-width="2" opacity="0.15"
    stroke-dasharray="8 12" />
</svg>`;
}

// ── Monochrome variant ────────────────────────────────────────────────────────
function svgMonochrome(size) {
  const viewBox = 512;
  const cx = viewBox / 2;
  const cy = viewBox / 2 + 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${size}" height="${size}">
  <circle cx="${cx}" cy="${cy}" r="220" fill="#f8fafc" />
  <polygon points="${cx},${cy - 60} ${cx + 52},${cy - 30} ${cx + 52},${cy + 30} ${cx},${cy + 60} ${cx - 52},${cy + 30} ${cx - 52},${cy - 30}"
    fill="#0f172a" opacity="0.9" />
  <circle cx="${cx}" cy="${cy}" r="14" fill="#2563eb" />
</svg>`;
}

// ── SVG favicon (minimal) ────────────────────────────────────────────────────
function svgFavicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="48" height="48">
  <circle cx="64" cy="64" r="60" fill="#0f172a"/>
  <polygon points="64,24 98,48 98,80 64,104 30,80 30,48" fill="#2563eb" opacity="0.9"/>
  <circle cx="64" cy="64" r="8" fill="#f8fafc"/>
</svg>`;
}

// ── Screenshot SVG ────────────────────────────────────────────────────────────
function svgScreenshot(title, subtitle, isWide = false) {
  const w = isWide ? 1280 : 750;
  const h = isWide ? 800 : 1334;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#0f172a" />
  <!-- Sidebar -->
  <rect x="0" y="0" width="${Math.round(w * 0.22)}" height="${h}" fill="#1e293b" rx="0" />
  <rect x="16" y="32" width="${Math.round(w * 0.18)}" height="12" rx="4" fill="#334155" />
  <rect x="16" y="56" width="${Math.round(w * 0.12)}" height="12" rx="4" fill="#334155" />
  <rect x="16" y="80" width="${Math.round(w * 0.15)}" height="12" rx="4" fill="#334155" />
  <rect x="16" y="104" width="${Math.round(w * 0.1)}" height="12" rx="4" fill="#334155" />
  <!-- Main content area -->
  <rect x="${Math.round(w * 0.22) + 24}" y="24" width="${Math.round(w * 0.7)}" height="36" rx="8" fill="#1e293b" />
  <!-- Cards -->
  <rect x="${Math.round(w * 0.22) + 24}" y="76" width="${Math.round(w * 0.32)}" height="${Math.round(h * 0.35)}" rx="12" fill="#1e293b" />
  <rect x="${Math.round(w * 0.22) + 24 + Math.round(w * 0.32) + 12}" y="76" width="${Math.round(w * 0.32)}" height="${Math.round(h * 0.35)}" rx="12" fill="#1e293b" />
  <rect x="${Math.round(w * 0.22) + 24}" y="${76 + Math.round(h * 0.35) + 12}" width="${Math.round(w * 0.66)}" height="${Math.round(h * 0.25)}" rx="12" fill="#2563eb" opacity="0.15" />
  <!-- Content lines on cards -->
  <rect x="${Math.round(w * 0.22) + 40}" y="96" width="140" height="8" rx="4" fill="#334155" />
  <rect x="${Math.round(w * 0.22) + 40}" y="114" width="100" height="6" rx="3" fill="#334155" opacity="0.6" />
  <rect x="${Math.round(w * 0.22) + 40}" y="132" width="160" height="6" rx="3" fill="#334155" opacity="0.5" />
  <!-- Second card lines -->
  <rect x="${Math.round(w * 0.22) + 24 + Math.round(w * 0.32) + 28}" y="96" width="120" height="8" rx="4" fill="#334155" />
  <rect x="${Math.round(w * 0.22) + 24 + Math.round(w * 0.32) + 28}" y="114" width="80" height="6" rx="3" fill="#334155" opacity="0.6" />
  <!-- Title -->
  <text x="${Math.round(w * 0.22) + 40}" y="${76 + Math.round(h * 0.35) + 12 + 40}" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="28" font-weight="700">${title}</text>
  <text x="${Math.round(w * 0.22) + 40}" y="${76 + Math.round(h * 0.35) + 12 + 72}" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="18">${subtitle}</text>
  <!-- Status bar -->
  <circle cx="${w - 40}" cy="40" r="6" fill="#22c55e" />
  <text x="${w - 48}" y="44" fill="#22c55e" font-family="system-ui,sans-serif" font-size="12" text-anchor="end">متصل</text>
</svg>`;
}

async function main() {
  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // 1. Write SVG sources for maskable and standard variants
  writeFileSync(join(PUBLIC_DIR, "icon.svg"), svgIcon(512));
  writeFileSync(join(PUBLIC_DIR, "icon-maskable.svg"), svgIcon(512, { maskable: true }));
  writeFileSync(join(PUBLIC_DIR, "icon-monochrome.svg"), svgMonochrome(512));
  writeFileSync(join(PUBLIC_DIR, "favicon.svg"), svgFavicon());

  // 2. Generate PNG icons from SVG
  const svgBuffer = Buffer.from(svgIcon(512, { maskable: true }));

  for (const size of SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(PUBLIC_DIR, `icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);
  }

  // 3. Apple touch icons
  const appleSizes = [152, 167, 180];
  for (const size of appleSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(PUBLIC_DIR, `apple-touch-icon-${size}.png`));
    console.log(`  ✓ apple-touch-icon-${size}.png`);
  }

  // 4. Favicon (multi-size ICO — we'll use SVG instead for modern browsers, but also a 32x32 PNG for fallback)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(PUBLIC_DIR, "favicon-32x32.png"));
  await sharp(svgBuffer).resize(16, 16).png().toFile(join(PUBLIC_DIR, "favicon-16x16.png"));

  // 5. Generate maskable icon specifically for PWA (standard size)
  const maskableSvg = Buffer.from(svgIcon(512, { maskable: true }));
  await sharp(maskableSvg).resize(192, 192).png().toFile(join(PUBLIC_DIR, "icon-192-maskable.png"));
  await sharp(maskableSvg).resize(512, 512).png().toFile(join(PUBLIC_DIR, "icon-512-maskable.png"));
  console.log("  ✓ maskable icons");

  // 6. Monochrome icon
  const monoBuffer = Buffer.from(svgMonochrome(512));
  await sharp(monoBuffer)
    .resize(96, 96)
    .png()
    .toFile(join(PUBLIC_DIR, "icon-96.png"));
  await sharp(monoBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(PUBLIC_DIR, "icon-192.png"));
  console.log("  ✓ monochrome icons");

  // 7. Screenshots
  const screenshots = [
    { name: "screenshot-dashboard-wide", title: "مركز القيادة", subtitle: "نظرة شاملة على أدائك اليومي", wide: true },
    { name: "screenshot-tasks", title: "إدارة المهام", subtitle: "من الفكرة إلى الإنجاز", wide: false },
    { name: "screenshot-stats", title: "الإحصائيات", subtitle: "قياس الأداء وتحليل الاتجاهات", wide: false },
  ];
  for (const s of screenshots) {
    const buf = Buffer.from(svgScreenshot(s.title, s.subtitle, s.wide));
    const w = s.wide ? 1280 : 750;
    const h = s.wide ? 800 : 1334;
    await sharp(buf).resize(w, h).png().toFile(join(PUBLIC_DIR, `${s.name}.png`));
    console.log(`  ✓ ${s.name}.png`);
  }

  // 8. Generate a single multi-resolution ico using sharp (PNG-to-ICO not natively supported, so we provide the SVG as primary)
  // Modern browsers prefer SVG favicon. For legacy, copy the 32x32 as favicon.ico
  await sharp(svgBuffer).resize(32, 32).png().toFile(join(PUBLIC_DIR, "favicon.ico"));

  console.log("\n✅ All icons generated in:", PUBLIC_DIR);
}

main().catch(console.error);
