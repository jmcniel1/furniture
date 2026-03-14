// Canvas rendering — web-only
import { ZONE_COLORS_LCH } from '../engine/state.js';
import { midiToName } from '../engine/scales.js';

// Convert OKLCH to sRGB for canvas (approximate via OKLab)
function oklchToRgb(l, c, h) {
  const hRad = h * Math.PI / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to linear sRGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const ll = l_ * l_ * l_;
  const mm = m_ * m_ * m_;
  const ss = s_ * s_ * s_;

  let r = +4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  let g = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  let bl = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;

  // Gamma
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl;

  return {
    r: Math.round(Math.max(0, Math.min(1, r)) * 255),
    g: Math.round(Math.max(0, Math.min(1, g)) * 255),
    b: Math.round(Math.max(0, Math.min(1, bl)) * 255),
  };
}

// Pre-compute RGB versions of zone colors + lighter/darker variants
const zoneRgb = ZONE_COLORS_LCH.map(([l, c, h]) => ({
  base: oklchToRgb(l, c, h),
  light: oklchToRgb(Math.min(1, l + 0.15), c * 0.8, h),
  dark: oklchToRgb(Math.max(0, l - 0.12), c * 1.1, h),
  bright: oklchToRgb(Math.min(1, l + 0.25), c * 0.5, h),
}));

export function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return canvas.getContext('2d');
  const needsResize = canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr);
  if (needsResize) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function render(canvas, ctx, persistent, transient) {
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  const { zones, ballSize } = persistent;
  const { balls, zoneFlash, selectedZone, audioStarted } = transient;
  const ballRadius = 0.005 + (ballSize / 18) * 0.015;

  // Background
  ctx.fillStyle = 'oklch(0.07 0 0)';
  ctx.fillRect(0, 0, w, h);

  // Dot grid
  const gridSize = 40;
  ctx.fillStyle = 'oklch(0.35 0 0 / 0.3)';
  for (let x = gridSize; x < w; x += gridSize) {
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Zones
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const flash = zoneFlash[i] || 0;
    const ci = zone.colorIndex % zoneRgb.length;
    const colors = zoneRgb[ci];
    const { base, light, dark, bright } = colors;

    const zx = (zone.cx - zone.hw) * w;
    const zy = (zone.cy - zone.hh) * h;
    const zw = zone.hw * 2 * w;
    const zh = zone.hh * 2 * h;
    const cx = zx + zw / 2;
    const cy = zy + zh / 2;

    // Rounded rect path
    const r = 12;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(zx, zy, zw, zh, r);
    ctx.clip();

    // Base linear gradient (top-left lighter → bottom-right darker)
    const fillAlpha = 0.45 + flash * 0.45;
    const baseGrad = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
    baseGrad.addColorStop(0, `rgba(${light.r},${light.g},${light.b},${fillAlpha})`);
    baseGrad.addColorStop(1, `rgba(${dark.r},${dark.g},${dark.b},${fillAlpha})`);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(zx, zy, zw, zh);

    // Radial shine overlay (bright center fading out)
    const shineRadius = Math.max(zw, zh) * 0.8;
    const shineGrad = ctx.createRadialGradient(
      cx - zw * 0.15, cy - zh * 0.2, 0,
      cx, cy, shineRadius
    );
    const shineAlpha = 0.18 + flash * 0.25;
    shineGrad.addColorStop(0, `rgba(${bright.r},${bright.g},${bright.b},${shineAlpha})`);
    shineGrad.addColorStop(0.5, `rgba(${bright.r},${bright.g},${bright.b},${shineAlpha * 0.3})`);
    shineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shineGrad;
    ctx.fillRect(zx, zy, zw, zh);

    ctx.restore();

    // Selected indicator (subtle dashed outline only)
    if (selectedZone === i) {
      ctx.strokeStyle = 'oklch(0.95 0 0 / 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.roundRect(zx - 3, zy - 3, zw + 6, zh + 6, r + 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Label
    const labelAlpha = 0.55 + flash * 0.45;
    const fontSize = (zw < 35 || zh < 25) ? 9 : 11;
    ctx.fillStyle = `oklch(1 0 0 / ${labelAlpha})`;
    ctx.font = `450 ${fontSize}px 'SF Pro Display', -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(midiToName(zone.midi), cx, cy);
  }

  // Ball trails and balls
  for (let b = 0; b < balls.length; b++) {
    const ball = balls[b];

    // Trail
    if (ball.trail.length > 1) {
      for (let t = 1; t < ball.trail.length; t++) {
        const alpha = (t / ball.trail.length) * 0.3;
        const lw = 1 + (t / ball.trail.length) * 2;
        ctx.strokeStyle = `oklch(0.85 0.15 105 / ${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(ball.trail[t - 1].x * w, ball.trail[t - 1].y * h);
        ctx.lineTo(ball.trail[t].x * w, ball.trail[t].y * h);
        ctx.stroke();
      }
    }

    // Ball
    const bx = ball.x * w;
    const by = ball.y * h;
    const br = ballRadius * w;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, 'oklch(0.92 0.15 105)');
    grad.addColorStop(1, 'oklch(0.62 0.18 125)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Audio overlay
  if (!audioStarted) {
    ctx.fillStyle = 'oklch(0 0 0 / 0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'oklch(0.95 0 0 / 0.85)';
    ctx.font = "450 18px 'SF Pro Display', -apple-system, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click to start', w / 2, h / 2);
  }
}
