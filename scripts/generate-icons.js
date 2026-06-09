const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // 圆角矩形背景
  const radius = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(s - radius, 0);
  ctx.quadraticCurveTo(s, 0, s, radius);
  ctx.lineTo(s, s - radius);
  ctx.quadraticCurveTo(s, s, s - radius, s);
  ctx.lineTo(radius, s);
  ctx.quadraticCurveTo(0, s, 0, s - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  // 渐变背景：温暖的琥珀色 → 橙色
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#F5A623');
  grad.addColorStop(0.5, '#F7941D');
  grad.addColorStop(1, '#E8731A');
  ctx.fillStyle = grad;
  ctx.fill();

  // 内部微光
  const glow = ctx.createRadialGradient(s * 0.3, s * 0.25, 0, s * 0.5, s * 0.5, s * 0.7);
  glow.addColorStop(0, 'rgba(255,255,255,0.25)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fill();

  // 信笺主体
  ctx.save();
  const cx = s * 0.48;
  const cy = s * 0.5;
  const pw = s * 0.34;
  const ph = s * 0.42;

  // 纸张阴影
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = s * 0.03;
  ctx.shadowOffsetY = s * 0.015;

  // 纸张底色
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2, cy - ph / 2);
  ctx.lineTo(cx + pw / 2 - s * 0.06, cy - ph / 2);
  ctx.lineTo(cx + pw / 2, cy - ph / 2 + s * 0.06);
  ctx.lineTo(cx + pw / 2, cy + ph / 2);
  ctx.lineTo(cx - pw / 2, cy + ph / 2);
  ctx.closePath();
  ctx.fill();

  // 折角效果
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(245,166,35,0.15)';
  ctx.beginPath();
  ctx.moveTo(cx + pw / 2 - s * 0.06, cy - ph / 2);
  ctx.lineTo(cx + pw / 2 - s * 0.06, cy - ph / 2 + s * 0.06);
  ctx.lineTo(cx + pw / 2, cy - ph / 2 + s * 0.06);
  ctx.closePath();
  ctx.fill();

  // 文字线条
  ctx.strokeStyle = 'rgba(245,166,35,0.35)';
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.lineCap = 'round';
  const lines = [0.3, 0.55, 0.75, 0.5];
  lines.forEach((w, i) => {
    const y = cy - ph * 0.2 + ph * 0.15 * i;
    const x1 = cx - pw * 0.35;
    const x2 = cx - pw * 0.35 + pw * w;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  });

  // 飞行动线（弧形箭头）
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.5, s * 0.025);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 弧线
  const arcR = s * 0.2;
  ctx.beginPath();
  ctx.arc(cx + pw * 0.1, cy + ph * 0.05, arcR, -Math.PI * 0.85, -Math.PI * 0.15, false);
  ctx.stroke();

  // 箭头
  const arrowAngle = -Math.PI * 0.15;
  const arrowX = cx + pw * 0.1 + arcR * Math.cos(arrowAngle);
  const arrowY = cy + ph * 0.05 + arcR * Math.sin(arrowAngle);
  const arrowSize = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX + arrowSize * Math.cos(-0.3), arrowY + arrowSize * Math.sin(-0.3));
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX + arrowSize * Math.cos(-Math.PI * 0.45), arrowY + arrowSize * Math.sin(-Math.PI * 0.45));
  ctx.stroke();

  ctx.restore();
  return canvas;
}

// 生成各尺寸
const sizes = [
  { size: 32, name: '32x32.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 512, name: 'icon.png' },
];

const outDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

sizes.forEach(({ size, name }) => {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, name), buffer);
  console.log(`✅ ${name} (${size}x${size})`);
});

// 也生成一份 SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F5A623"/>
      <stop offset="50%" stop-color="#F7941D"/>
      <stop offset="100%" stop-color="#E8731A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(245,256)">
    <rect x="-87" y="-107" width="174" height="214" rx="8" fill="rgba(255,255,255,0.95)"/>
    <path d="M 87 -107 L 87 -107 L 87 -77 Z" fill="rgba(245,166,35,0.15)"/>
    <line x1="-60" y1="-42" x2="6" y2="-42" stroke="rgba(245,166,35,0.35)" stroke-width="8" stroke-linecap="round"/>
    <line x1="-60" y1="-10" x2="-20" y2="-10" stroke="rgba(245,166,35,0.35)" stroke-width="8" stroke-linecap="round"/>
    <line x1="-60" y1="22" x2="12" y2="22" stroke="rgba(245,166,35,0.35)" stroke-width="8" stroke-linecap="round"/>
    <line x1="-60" y1="54" x2="-30" y2="54" stroke="rgba(245,166,35,0.35)" stroke-width="8" stroke-linecap="round"/>
  </g>
  <path d="M 310 200 A 100 100 0 0 1 390 320" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="13" stroke-linecap="round"/>
  <path d="M 380 310 L 395 325 M 380 310 L 365 325" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync(path.join(outDir, 'icon.svg'), svg);
console.log('✅ icon.svg');
