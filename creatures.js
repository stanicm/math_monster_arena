// ============================================================
// creatures.js — Math Monster Arena: Procedural Canvas Renderer
// All drawing is done with Canvas 2D API. No images or assets.
// ============================================================

// --------------- Color Constants ---------------
const COLORS = {
  // Stage 1: Hatchling
  eggCream: '#FFF8E7',
  eggShadow: '#E8D8B8',
  eggCrack: '#C8B898',
  eggSpotGreen: '#88CC88',
  eggSpotPink: '#FF99AA',
  eggSpotBlue: '#88AAEE',

  // Stage 2: Sparky
  sparkyYellow: '#FFD644',
  sparkyOrange: '#FFA822',
  sparkyEarTip: '#CC8800',
  sparkyVest: '#8B5E3C',
  sparkyVestDark: '#6B3E1C',
  sparkyCyan: 'rgba(0, 220, 255, 0.35)',
  sparkyCyanSolid: '#00DCFF',

  // Stage 3: Blazer
  blazerOrange: '#FF6622',
  blazerRed: '#DD2200',
  blazerSilver: '#B8C4D0',
  blazerSteel: '#8899AA',
  blazerGem: '#FF2244',

  // Stage 4: Stormclaw
  stormPurple: '#6622CC',
  stormBlue: '#3344AA',
  stormCyan: '#00EEFF',
  stormDarkSteel: '#445577',
  stormHornDark: '#3A1166',

  // Stage 5: Legendragon
  legendGold: '#FFD700',
  legendGoldDark: '#CC9900',
  legendPurple: '#9944FF',
  legendDiamond: '#DDEEFF',
  legendRuby: '#FF2233',

  // General
  white: '#FFFFFF',
  black: '#000000',
  pupilBlack: '#111111',
  highlightWhite: '#FFFFFF',

  // Aliens
  alienGreen: '#44DD44',
  alienDarkGreen: '#228822',
  alienEyeBlack: '#111111',

  // Asteroid
  asteroidDark: '#5A4E44',
  asteroidLight: '#7A6E64',
  asteroidCrater: '#3A3430',

  // Bubbles
  bubbleBlue: 'rgba(68, 136, 255, 0.3)',
  bubbleBorder: 'rgba(255, 255, 255, 0.8)',
  bubbleCorrect: '#44FF66',
  bubbleWrong: '#FF4444',
};

// --------------- Utility Helpers ---------------
function lerpColor(a, b, t) {
  // Only used for simple alpha lerps — not full hex parse
  return a; // fallback, we use gradients instead
}

function drawEye(ctx, ex, ey, sR, iR, pR, irisColor, dirX, highlight) {
  // sR = sclera radius, iR = iris/pupil radius, pR = pupil radius
  const shift = (dirX || 0) * (sR * 0.2);
  // Sclera
  ctx.beginPath();
  ctx.arc(ex, ey, sR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  // Iris
  ctx.beginPath();
  ctx.arc(ex + shift, ey, iR, 0, Math.PI * 2);
  ctx.fillStyle = irisColor;
  ctx.fill();
  // Pupil
  ctx.beginPath();
  ctx.arc(ex + shift, ey, pR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.pupilBlack;
  ctx.fill();
  // Highlight
  if (highlight !== false) {
    const hR = highlight || sR * 0.22;
    ctx.beginPath();
    ctx.arc(ex + shift - sR * 0.2, ey - sR * 0.25, hR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.highlightWhite;
    ctx.fill();
  }
}

function drawSlitEye(ctx, ex, ey, sR, iR, pW, pH, irisColor, dirX, glowing) {
  const shift = (dirX || 0) * (sR * 0.18);
  // Sclera (almond shape)
  ctx.beginPath();
  ctx.ellipse(ex, ey, sR * 1.3, sR * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  // Iris
  ctx.beginPath();
  ctx.arc(ex + shift, ey, iR, 0, Math.PI * 2);
  ctx.fillStyle = irisColor;
  ctx.fill();
  if (glowing) {
    ctx.shadowBlur = 6;
    ctx.shadowColor = irisColor;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Slit pupil
  ctx.beginPath();
  ctx.ellipse(ex + shift, ey, pW, pH, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.pupilBlack;
  ctx.fill();
  // Highlights
  ctx.beginPath();
  ctx.arc(ex + shift - sR * 0.3, ey - sR * 0.3, sR * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.highlightWhite;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex + shift + sR * 0.15, ey + sR * 0.2, sR * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
}

// --------------- CreatureRenderer ---------------
const CreatureRenderer = {

  // =========== PLAYER ===========
  drawPlayer(ctx, x, y, stage, frame, dirX, options) {
    ctx.save();
    options = options || {};
    if (options.invulnerable && frame % 10 < 5) {
      ctx.globalAlpha = 0.5;
    }
    switch (stage) {
      case 1: this._drawHatchling(ctx, x, y, frame, dirX); break;
      case 2: this._drawSparky(ctx, x, y, frame, dirX); break;
      case 3: this._drawBlazer(ctx, x, y, frame, dirX); break;
      case 4: this._drawStormclaw(ctx, x, y, frame, dirX); break;
      case 5: this._drawLegendragon(ctx, x, y, frame, dirX); break;
      default: this._drawHatchling(ctx, x, y, frame, dirX);
    }
    if (options.shieldActive) {
      this.drawShield(ctx, x, y, this.getPlayerRadius(stage) + 12, frame);
    }
    ctx.restore();
  },

  // ---------- Stage 1: Hatchling ----------
  _drawHatchling(ctx, x, y, frame, dirX) {
    ctx.save();
    ctx.translate(x, y);
    const wobble = Math.sin(frame * 0.05) * 0.05;
    ctx.rotate(wobble);

    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFF0CC';

    // Egg body
    const grd = ctx.createRadialGradient(0, -4, 5, 0, 4, 28);
    grd.addColorStop(0, COLORS.eggCream);
    grd.addColorStop(1, COLORS.eggShadow);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = '#D8C8A8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Zigzag crack across middle
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-6, 0);
    ctx.lineTo(0, -5);
    ctx.lineTo(6, 1);
    ctx.lineTo(12, -4);
    ctx.lineTo(18, -1);
    ctx.strokeStyle = COLORS.eggCrack;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Colored spots below crack
    ctx.beginPath();
    ctx.arc(-7, 10, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.eggSpotGreen;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, 12, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.eggSpotPink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 16, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.eggSpotBlue;
    ctx.fill();

    // Eyes peeking above crack
    drawEye(ctx, -8, -10, 7, 4, 3, COLORS.pupilBlack, dirX, 1.5);
    drawEye(ctx, 8, -10, 7, 4, 3, COLORS.pupilBlack, dirX, 1.5);

    ctx.restore();
  },

  // ---------- Stage 2: Sparky ----------
  _drawSparky(ctx, x, y, frame, dirX) {
    ctx.save();
    const bob = Math.sin(frame * 0.08) * 3;
    ctx.translate(x, y + bob);

    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFD644';

    // Body
    const bodyGrd = ctx.createRadialGradient(0, 4, 5, 0, 0, 26);
    bodyGrd.addColorStop(0, COLORS.sparkyYellow);
    bodyGrd.addColorStop(1, COLORS.sparkyOrange);
    ctx.beginPath();
    ctx.ellipse(0, 2, 22, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrd;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ears
    ctx.fillStyle = COLORS.sparkyYellow;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(-18, -32);
    ctx.lineTo(-6, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.sparkyEarTip;
    ctx.beginPath();
    ctx.moveTo(-15, -26);
    ctx.lineTo(-18, -32);
    ctx.lineTo(-12, -24);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.fillStyle = COLORS.sparkyYellow;
    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(18, -32);
    ctx.lineTo(6, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.sparkyEarTip;
    ctx.beginPath();
    ctx.moveTo(15, -26);
    ctx.lineTo(18, -32);
    ctx.lineTo(12, -24);
    ctx.closePath();
    ctx.fill();

    // Leather vest
    ctx.fillStyle = COLORS.sparkyVest;
    const vx = -12, vy = -3, vw = 24, vh = 16;
    ctx.beginPath();
    ctx.moveTo(vx + 4, vy);
    ctx.lineTo(vx + vw - 4, vy);
    ctx.quadraticCurveTo(vx + vw, vy, vx + vw, vy + 4);
    ctx.lineTo(vx + vw, vy + vh - 4);
    ctx.quadraticCurveTo(vx + vw, vy + vh, vx + vw - 4, vy + vh);
    ctx.lineTo(vx + 4, vy + vh);
    ctx.quadraticCurveTo(vx, vy + vh, vx, vy + vh - 4);
    ctx.lineTo(vx, vy + 4);
    ctx.quadraticCurveTo(vx, vy, vx + 4, vy);
    ctx.closePath();
    ctx.fill();
    // Stitch marks
    ctx.strokeStyle = COLORS.sparkyVestDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-4, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(4, 5);
    ctx.stroke();

    // Tiny energy wings
    const wingFlap = Math.sin(frame * 0.15) * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.35;
    // Left wing
    ctx.save();
    ctx.translate(-20, -4);
    ctx.rotate(-0.5 + wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 6, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.sparkyCyanSolid;
    ctx.fill();
    ctx.restore();
    // Right wing
    ctx.save();
    ctx.translate(20, -4);
    ctx.rotate(0.5 - wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 6, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.sparkyCyanSolid;
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Eyes
    const sq = dirX ? 0.92 : 1;
    ctx.save();
    ctx.scale(1, sq);
    drawEye(ctx, -8, -10 / sq, 9, 5, 3, COLORS.pupilBlack, dirX, 2);
    drawEye(ctx, 8, -10 / sq, 9, 5, 3, COLORS.pupilBlack, dirX, 2);
    ctx.restore();

    // Mouth
    ctx.beginPath();
    ctx.arc(0, 4, 5, 0.15, Math.PI - 0.15, false);
    ctx.strokeStyle = '#AA6600';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  },

  // ---------- Stage 3: Blazer ----------
  _drawBlazer(ctx, x, y, frame, dirX) {
    ctx.save();
    const hover = Math.sin(frame * 0.07) * 2.5;
    const lean = dirX * 0.06;
    ctx.translate(x, y + hover);
    ctx.rotate(lean);

    // Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF4400';

    // Body
    const bodyGrd = ctx.createRadialGradient(0, 0, 8, 0, 5, 32);
    bodyGrd.addColorStop(0, COLORS.blazerOrange);
    bodyGrd.addColorStop(1, COLORS.blazerRed);
    ctx.beginPath();
    // Rounded-square body
    const bw = 27, bh = 25, br = 10;
    ctx.moveTo(-bw + br, -bh);
    ctx.lineTo(bw - br, -bh);
    ctx.quadraticCurveTo(bw, -bh, bw, -bh + br);
    ctx.lineTo(bw, bh - br);
    ctx.quadraticCurveTo(bw, bh, bw - br, bh);
    ctx.lineTo(-bw + br, bh);
    ctx.quadraticCurveTo(-bw, bh, -bw, bh - br);
    ctx.lineTo(-bw, -bh + br);
    ctx.quadraticCurveTo(-bw, -bh, -bw + br, -bh);
    ctx.closePath();
    ctx.fillStyle = bodyGrd;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Flame tail
    for (let i = 0; i < 3; i++) {
      const flicker = Math.sin(frame * 0.2 + i * 1.8) * 3;
      const tx = -2 + i * 4 - 4;
      const ty = bh + 4 + i * 3;
      ctx.beginPath();
      ctx.ellipse(tx + flicker, ty, 4 - i, 7 - i * 1.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#FF6622' : i === 1 ? '#FF9944' : '#FFCC44';
      ctx.globalAlpha = 0.8 - i * 0.15;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fire wings
    const wingBeat = Math.sin(frame * 0.12) * 0.25;
    // Left wing
    ctx.save();
    ctx.translate(-26, -8);
    ctx.rotate(-0.6 + wingBeat);
    const wgL = ctx.createLinearGradient(0, 0, -20, -12);
    wgL.addColorStop(0, 'rgba(255,100,30,0.6)');
    wgL.addColorStop(1, 'rgba(255,200,50,0.2)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-10, -18, -28, -14, -22, 4);
    ctx.bezierCurveTo(-16, 8, -4, 4, 0, 0);
    ctx.fillStyle = wgL;
    ctx.fill();
    ctx.restore();
    // Right wing
    ctx.save();
    ctx.translate(26, -8);
    ctx.rotate(0.6 - wingBeat);
    const wgR = ctx.createLinearGradient(0, 0, 20, -12);
    wgR.addColorStop(0, 'rgba(255,100,30,0.6)');
    wgR.addColorStop(1, 'rgba(255,200,50,0.2)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(10, -18, 28, -14, 22, 4);
    ctx.bezierCurveTo(16, 8, 4, 4, 0, 0);
    ctx.fillStyle = wgR;
    ctx.fill();
    ctx.restore();

    // Armor chest plate
    const agrd = ctx.createLinearGradient(0, -12, 0, 12);
    agrd.addColorStop(0, COLORS.blazerSilver);
    agrd.addColorStop(1, COLORS.blazerSteel);
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = agrd;
    ctx.fill();
    ctx.strokeStyle = '#9AA8B8';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Gem
    const gemGrd = ctx.createRadialGradient(0, 3, 1, 0, 3, 5);
    gemGrd.addColorStop(0, '#FF8899');
    gemGrd.addColorStop(0.6, COLORS.blazerGem);
    gemGrd.addColorStop(1, '#AA0020');
    ctx.beginPath();
    ctx.arc(0, 3, 5, 0, Math.PI * 2);
    ctx.fillStyle = gemGrd;
    ctx.fill();
    // Gem highlight
    ctx.beginPath();
    ctx.arc(-1.5, 1.5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    // Shoulder guards
    ctx.fillStyle = COLORS.blazerSteel;
    ctx.beginPath();
    ctx.moveTo(-24, -10);
    ctx.lineTo(-18, -20);
    ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, -10);
    ctx.lineTo(18, -20);
    ctx.lineTo(12, -10);
    ctx.closePath();
    ctx.fill();

    // Stubby arms with gauntlets
    ctx.fillStyle = COLORS.blazerOrange;
    ctx.beginPath();
    ctx.ellipse(-28, 6, 6, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(28, 6, 6, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Gauntlet cuffs
    ctx.fillStyle = COLORS.blazerSteel;
    ctx.fillRect(-33, 2, 10, 4);
    ctx.fillRect(23, 2, 10, 4);

    // Eyes
    drawSlitEye(ctx, -10, -10, 7, 4, 1.5, 4, '#FF6622', dirX, false);
    drawSlitEye(ctx, 10, -10, 7, 4, 1.5, 4, '#FF6622', dirX, false);

    // Mouth — grin with fang
    ctx.beginPath();
    ctx.arc(0, 2, 8, 0.1, Math.PI - 0.1, false);
    ctx.strokeStyle = '#AA2200';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Small fang
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.moveTo(4, 9);
    ctx.lineTo(6, 13);
    ctx.lineTo(8, 9);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  // ---------- Stage 4: Stormclaw ----------
  _drawStormclaw(ctx, x, y, frame, dirX) {
    ctx.save();
    const hover = Math.sin(frame * 0.06) * 2;
    ctx.translate(x, y + hover);

    // Glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#6644FF';

    // Body — angular shape
    const bodyGrd = ctx.createRadialGradient(0, 0, 8, 0, 5, 38);
    bodyGrd.addColorStop(0, COLORS.stormBlue);
    bodyGrd.addColorStop(1, COLORS.stormPurple);
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(28, -18);
    ctx.lineTo(32, 8);
    ctx.lineTo(22, 28);
    ctx.lineTo(-22, 28);
    ctx.lineTo(-32, 8);
    ctx.lineTo(-28, -18);
    ctx.closePath();
    ctx.fillStyle = bodyGrd;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Horns
    const hornGrd1 = ctx.createLinearGradient(-16, -30, -14, -50);
    hornGrd1.addColorStop(0, COLORS.stormHornDark);
    hornGrd1.addColorStop(1, COLORS.stormCyan);
    ctx.beginPath();
    ctx.moveTo(-12, -26);
    ctx.quadraticCurveTo(-20, -42, -10, -50);
    ctx.lineTo(-6, -28);
    ctx.closePath();
    ctx.fillStyle = hornGrd1;
    ctx.fill();
    const hornGrd2 = ctx.createLinearGradient(16, -30, 14, -50);
    hornGrd2.addColorStop(0, COLORS.stormHornDark);
    hornGrd2.addColorStop(1, COLORS.stormCyan);
    ctx.beginPath();
    ctx.moveTo(12, -26);
    ctx.quadraticCurveTo(20, -42, 10, -50);
    ctx.lineTo(6, -28);
    ctx.closePath();
    ctx.fillStyle = hornGrd2;
    ctx.fill();

    // Electric wings
    const wingAng = Math.sin(frame * 0.1) * 0.2;
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.translate(side * 30, -6);
      ctx.rotate(side * (0.4 - wingAng));
      const wg = ctx.createLinearGradient(0, 0, side * 30, -20);
      wg.addColorStop(0, 'rgba(0,238,255,0.5)');
      wg.addColorStop(1, 'rgba(102,34,204,0.15)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 8, -26, side * 32, -22, side * 28, 0);
      ctx.bezierCurveTo(side * 24, 10, side * 6, 8, 0, 0);
      ctx.fillStyle = wg;
      ctx.fill();
      // Lightning pattern inside wing
      ctx.strokeStyle = 'rgba(0,238,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(side * 4, -4);
      ctx.lineTo(side * 12, -14);
      ctx.lineTo(side * 10, -8);
      ctx.lineTo(side * 20, -16);
      ctx.stroke();
      ctx.restore();
    }

    // Heavy armor
    const armorGrd = ctx.createLinearGradient(0, -14, 0, 18);
    armorGrd.addColorStop(0, '#556688');
    armorGrd.addColorStop(1, COLORS.stormDarkSteel);
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(18, -6);
    ctx.lineTo(18, 16);
    ctx.lineTo(-18, 16);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fillStyle = armorGrd;
    ctx.fill();
    ctx.strokeStyle = '#667799';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lightning bolt rune
    ctx.shadowBlur = 8;
    ctx.shadowColor = COLORS.stormCyan;
    ctx.strokeStyle = COLORS.stormCyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(2, -1);
    ctx.lineTo(-1, 0);
    ctx.lineTo(4, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shoulder pauldrons
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = COLORS.stormDarkSteel;
      ctx.beginPath();
      ctx.ellipse(side * 26, -10, 10, 7, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#667799';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Claws
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = COLORS.stormPurple;
      ctx.beginPath();
      ctx.ellipse(side * 34, 10, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // 3 claws
      for (let c = -1; c <= 1; c++) {
        ctx.fillStyle = '#AABBCC';
        ctx.beginPath();
        ctx.moveTo(side * 34 + c * 4, 16);
        ctx.lineTo(side * 34 + c * 4 + side * 2, 22);
        ctx.lineTo(side * 34 + c * 4 - side * 1, 17);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Eyes with electric spark
    const sparkFlash = frame % 30 < 3;
    drawSlitEye(ctx, -11, -12, 8, 5, 1.5, 5, COLORS.stormCyan, dirX, true);
    drawSlitEye(ctx, 11, -12, 8, 5, 1.5, 5, COLORS.stormCyan, dirX, true);
    if (sparkFlash) {
      ctx.strokeStyle = COLORS.stormCyan;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = COLORS.stormCyan;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(side * 18, -14);
        ctx.lineTo(side * 22, -18);
        ctx.lineTo(side * 20, -12);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // Mouth
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(0, 5);
    ctx.lineTo(6, 4);
    ctx.strokeStyle = '#8866CC';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Electric particles
    if (frame % 8 < 2) {
      const px = Math.sin(frame * 0.7) * 25;
      const py = Math.cos(frame * 0.9) * 20;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.stormCyan;
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS.stormCyan;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  // ---------- Stage 5: Legendragon ----------
  _drawLegendragon(ctx, x, y, frame, dirX) {
    ctx.save();
    const hover = Math.sin(frame * 0.05) * 3;
    const sway = Math.sin(frame * 0.03) * 0.03;
    ctx.translate(x, y + hover);
    ctx.rotate(sway);

    // Aura ring
    const auraPulse = 0.85 + Math.sin(frame * 0.04) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(frame * 0.04) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, 44 * auraPulse, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.legendGold;
    ctx.fill();
    ctx.restore();

    // Glow
    ctx.shadowBlur = 30;
    // Rainbow shimmer
    const hue = (frame * 2) % 360;
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;

    // Body
    const bodyGrd = ctx.createRadialGradient(0, 0, 6, 0, 5, 40);
    bodyGrd.addColorStop(0, COLORS.legendGold);
    bodyGrd.addColorStop(0.7, COLORS.legendGoldDark);
    bodyGrd.addColorStop(1, '#AA7700');
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(20, -34, 36, -18, 36, 0);
    ctx.bezierCurveTo(36, 18, 22, 34, 0, 34);
    ctx.bezierCurveTo(-22, 34, -36, 18, -36, 0);
    ctx.bezierCurveTo(-36, -18, -20, -34, 0, -34);
    ctx.closePath();
    ctx.fillStyle = bodyGrd;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rainbow shimmer overlay
    ctx.save();
    ctx.globalAlpha = 0.12;
    const shimmer = ctx.createLinearGradient(-36, -34, 36, 34);
    const shimOff = (frame * 0.01) % 1;
    shimmer.addColorStop((0 + shimOff) % 1, '#FF0000');
    shimmer.addColorStop((0.17 + shimOff) % 1, '#FF8800');
    shimmer.addColorStop((0.33 + shimOff) % 1, '#FFFF00');
    shimmer.addColorStop((0.5 + shimOff) % 1, '#00FF00');
    shimmer.addColorStop((0.67 + shimOff) % 1, '#0088FF');
    shimmer.addColorStop((0.83 + shimOff) % 1, '#8800FF');
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(20, -34, 36, -18, 36, 0);
    ctx.bezierCurveTo(36, 18, 22, 34, 0, 34);
    ctx.bezierCurveTo(-22, 34, -36, 18, -36, 0);
    ctx.bezierCurveTo(-36, -18, -20, -34, 0, -34);
    ctx.closePath();
    ctx.fillStyle = shimmer;
    ctx.fill();
    ctx.restore();

    // Massive dragon wings
    const wingBeat = Math.sin(frame * 0.06) * 0.3;
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.translate(side * 32, -10);
      ctx.rotate(side * (0.35 - wingBeat));
      // Wing frame (golden)
      ctx.strokeStyle = COLORS.legendGold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 10, -32, side * 42, -30, side * 38, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 6, -14, side * 28, -12, side * 38, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(side * 14, 8, side * 30, 2, side * 36, 4);
      ctx.stroke();
      // Wing membrane
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 10, -32, side * 42, -30, side * 38, -4);
      ctx.bezierCurveTo(side * 30, 2, side * 14, 8, 0, 4);
      ctx.closePath();
      const memGrd = ctx.createLinearGradient(0, 0, side * 38, -4);
      memGrd.addColorStop(0, 'rgba(255,215,0,0.6)');
      memGrd.addColorStop(1, 'rgba(153,68,255,0.3)');
      ctx.fillStyle = memGrd;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Energy tail
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const tx = Math.sin(frame * 0.04 + i * 0.5) * (3 + i * 1.5);
      const ty = 30 + i * 7;
      const tSize = 6 - i * 0.7;
      const tAlpha = 0.8 - i * 0.1;
      ctx.globalAlpha = tAlpha;
      const tc = i < 3 ? COLORS.legendGold : COLORS.legendPurple;
      ctx.beginPath();
      ctx.ellipse(tx, ty, tSize, tSize * 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = tc;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Royal golden armor
    const armorGrd = ctx.createLinearGradient(0, -18, 0, 18);
    armorGrd.addColorStop(0, '#FFE066');
    armorGrd.addColorStop(0.5, COLORS.legendGold);
    armorGrd.addColorStop(1, COLORS.legendGoldDark);
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(20, -8);
    ctx.lineTo(20, 16);
    ctx.quadraticCurveTo(0, 22, -20, 16);
    ctx.lineTo(-20, -8);
    ctx.closePath();
    ctx.fillStyle = armorGrd;
    ctx.fill();
    ctx.strokeStyle = '#DDAA00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Ornate edge lines
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-16, -2);
    ctx.lineTo(-18, 2);
    ctx.strokeStyle = '#FFEE88';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, -6);
    ctx.lineTo(16, -2);
    ctx.lineTo(18, 2);
    ctx.stroke();

    // Diamond gem
    const diamGrd = ctx.createRadialGradient(0, 2, 1, 0, 2, 8);
    diamGrd.addColorStop(0, '#FFFFFF');
    diamGrd.addColorStop(0.4, COLORS.legendDiamond);
    diamGrd.addColorStop(1, '#88AAFF');
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = diamGrd;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#AACCFF';
    ctx.fill();
    ctx.shadowBlur = 0;
    // Diamond highlight
    ctx.beginPath();
    ctx.arc(-2, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    // Shoulder pieces
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = COLORS.legendGold;
      ctx.beginPath();
      ctx.ellipse(side * 26, -12, 10, 8, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#DDAA00';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Curved decoration
      ctx.beginPath();
      ctx.arc(side * 26, -12, 6, -0.5 * side, Math.PI * 0.5 * side, side < 0);
      ctx.strokeStyle = '#FFEE88';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Crown
    ctx.fillStyle = COLORS.legendGold;
    ctx.beginPath();
    ctx.moveTo(-14, -30);
    ctx.lineTo(-12, -38);
    ctx.lineTo(-6, -32);
    ctx.lineTo(0, -42);
    ctx.lineTo(6, -32);
    ctx.lineTo(12, -38);
    ctx.lineTo(14, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#DDAA00';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Jewels on crown points
    const crownJewels = [[-12, -36], [0, -40], [12, -36]];
    for (const [jx, jy] of crownJewels) {
      ctx.beginPath();
      ctx.arc(jx, jy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.legendRuby;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(jx - 0.7, jy - 0.7, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    // Eyes — majestic golden
    const eyePulse = 0.7 + Math.sin(frame * 0.06) * 0.3;
    ctx.shadowBlur = 4 * eyePulse;
    ctx.shadowColor = COLORS.legendGold;
    drawEye(ctx, -12, -16, 10, 6, 3, '#DDAA00', dirX, 2.5);
    drawEye(ctx, 12, -16, 10, 6, 3, '#DDAA00', dirX, 2.5);
    // Second highlight
    ctx.beginPath();
    ctx.arc(-12 + (dirX || 0) * 2 + 2, -16 + 2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12 + (dirX || 0) * 2 + 2, -16 + 2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mouth — noble smile
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = '#AA7700';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  },

  // =========== ASTEROID ===========
  drawAsteroid(ctx, x, y, size, rotation, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const baseR = size === 'small' ? 15 : size === 'medium' ? 25 : 35;
    const points = 10;

    // Glow
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#666655';

    // Rocky shape
    const grd = ctx.createRadialGradient(0, 0, baseR * 0.2, 0, 0, baseR * 1.1);
    grd.addColorStop(0, COLORS.asteroidLight);
    grd.addColorStop(1, COLORS.asteroidDark);
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = baseR + Math.sin(i * 2.7) * baseR * 0.3;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = '#4A3E34';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Craters
    const craters = [
      { cx: baseR * 0.25, cy: -baseR * 0.2, cr: baseR * 0.15 },
      { cx: -baseR * 0.3, cy: baseR * 0.15, cr: baseR * 0.12 },
      { cx: baseR * 0.05, cy: baseR * 0.3, cr: baseR * 0.1 },
    ];
    for (const c of craters) {
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.cr, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.asteroidCrater;
      ctx.fill();
    }

    ctx.restore();
  },

  // =========== ALIEN ===========
  drawAlien(ctx, x, y, type, frame) {
    ctx.save();
    const bob = Math.sin(frame * 0.1) * 3;
    ctx.translate(x, y + bob);

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22CC22';

    // Body
    const grd = ctx.createRadialGradient(0, 0, 3, 0, 4, 16);
    grd.addColorStop(0, '#66FF66');
    grd.addColorStop(1, COLORS.alienGreen);
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Antennae
    ctx.strokeStyle = COLORS.alienDarkGreen;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.quadraticCurveTo(-10, -24, -8, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.quadraticCurveTo(10, -24, 8, -26);
    ctx.stroke();
    // Antenna dots
    ctx.beginPath();
    ctx.arc(-8, -26, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#88FF88';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -26, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#88FF88';
    ctx.fill();

    // Eyes
    ctx.beginPath();
    ctx.arc(-6, -2, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.alienEyeBlack;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -2, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.alienEyeBlack;
    ctx.fill();
    // Eye iris
    ctx.beginPath();
    ctx.arc(-5, -3, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#33CC33';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -3, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#33CC33';
    ctx.fill();
    // Highlights
    ctx.beginPath();
    ctx.arc(-7, -4, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    // Tentacles
    for (let i = -1; i <= 1; i++) {
      const wave = Math.sin(frame * 0.12 + i * 1.5) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 6, 14);
      ctx.quadraticCurveTo(i * 6 + wave, 22, i * 6 + wave * 0.5, 26);
      ctx.strokeStyle = COLORS.alienGreen;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  },

  // =========== ANSWER BUBBLE ===========
  drawAnswerBubble(ctx, x, y, radius, text, state, frame) {
    ctx.save();
    ctx.translate(x, y);

    let bgColor, borderColor, glow, extraScale = 1, shakeX = 0;

    if (state === 'correct') {
      bgColor = 'rgba(40, 220, 80, 0.4)';
      borderColor = COLORS.bubbleCorrect;
      glow = COLORS.bubbleCorrect;
      extraScale = 1.1;
    } else if (state === 'wrong') {
      bgColor = 'rgba(255, 50, 50, 0.4)';
      borderColor = COLORS.bubbleWrong;
      glow = COLORS.bubbleWrong;
      shakeX = Math.sin(frame * 0.8) * 4;
    } else {
      bgColor = COLORS.bubbleBlue;
      borderColor = COLORS.bubbleBorder;
      glow = '#4488FF';
    }

    ctx.translate(shakeX, 0);
    ctx.scale(extraScale, extraScale);

    // Glow pulse
    const pulse = 0.6 + Math.sin(frame * 0.08) * 0.2;
    ctx.shadowBlur = 12 * pulse;
    ctx.shadowColor = glow;

    // Orb background
    const orbGrd = ctx.createRadialGradient(0, -radius * 0.2, radius * 0.15, 0, 0, radius);
    orbGrd.addColorStop(0, 'rgba(255,255,255,0.3)');
    orbGrd.addColorStop(1, bgColor);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = orbGrd;
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text
    const fontSize = Math.max(10, Math.round(radius * 0.7));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  },

  // =========== EXPLOSION ===========
  drawExplosion(ctx, x, y, progress, color) {
    ctx.save();
    ctx.translate(x, y);

    const numParticles = 10;
    const maxRadius = 50;
    const alpha = Math.max(0, 1 - progress);

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + i * 0.3;
      const dist = progress * maxRadius * (0.7 + Math.sin(i * 1.7) * 0.3);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const size = (1 - progress) * (4 + Math.sin(i * 2.3) * 2);

      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * (0.6 + Math.sin(i) * 0.4);
      ctx.fill();
    }

    // Central flash
    if (progress < 0.3) {
      const flashAlpha = (0.3 - progress) / 0.3;
      ctx.globalAlpha = flashAlpha * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, (1 - progress) * 18, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
    }

    ctx.restore();
  },

  // =========== TRAIL ===========
  drawTrail(ctx, x, y, stage, frame, dirX) {
    ctx.save();
    ctx.translate(x, y);

    const r = this.getPlayerRadius(stage);
    const colors = {
      1: ['#FFF8E7', '#F0E8D0'],
      2: ['#FFD644', '#FFA822', '#FFEE88'],
      3: ['#FF6622', '#FF4400', '#FFAA44'],
      4: ['#00EEFF', '#8844FF', '#66BBFF'],
      5: ['#FFD700', '#FF66AA', '#66DDFF', '#AABB00'],
    };
    const stageColors = colors[stage] || colors[1];
    const count = stage >= 4 ? 5 : stage >= 2 ? 4 : 3;
    const driftX = -(dirX || 0) * 3;

    for (let i = 0; i < count; i++) {
      const t = ((frame * 0.08 + i * 0.6) % 3) / 3;
      const px = driftX * (i + 1) * 0.6 + Math.sin(frame * 0.1 + i) * 2;
      const py = r + 4 + t * 18;
      const sz = (1 - t) * (3 + stage * 0.5);
      const alpha = (1 - t) * 0.7;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, sz), 0, Math.PI * 2);
      ctx.fillStyle = stageColors[i % stageColors.length];
      if (stage >= 4) {
        ctx.shadowBlur = 4;
        ctx.shadowColor = stageColors[0];
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  // =========== SHIELD ===========
  drawShield(ctx, x, y, radius, frame) {
    ctx.save();
    ctx.translate(x, y);

    const alpha = 0.3 + 0.15 * Math.sin(frame * 0.1);
    ctx.globalAlpha = alpha;

    // Rotating dashed circle
    ctx.save();
    ctx.rotate(frame * 0.02);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00DDFF';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00DDFF';
    ctx.stroke();
    ctx.restore();

    // Inner solid ring
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#00EEFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  },

  // =========== STAR ===========
  drawStar(ctx, x, y, size, brightness) {
    ctx.save();
    ctx.globalAlpha = brightness;
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (size > 1.5) {
      ctx.strokeStyle = `rgba(255,255,255,${brightness * 0.5})`;
      ctx.lineWidth = 0.5;
      const len = size * 2;
      ctx.beginPath();
      ctx.moveTo(x - len, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - len);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    }

    ctx.restore();
  },

  // =========== BEAM ===========
  drawBeam(ctx, x, y, tier, frame) {
    ctx.save();
    ctx.translate(x, y);

    switch (tier) {
      case 1: this._drawBeamTier1(ctx, frame); break;
      case 2: this._drawBeamTier2(ctx, frame); break;
      case 3: this._drawBeamTier3(ctx, frame); break;
      case 4: this._drawBeamTier4(ctx, frame); break;
      case 5: this._drawBeamTier5(ctx, frame); break;
      default: this._drawBeamTier1(ctx, frame);
    }

    ctx.restore();
  },

  // Tier 1: Cyan energy bolt — small round projectile
  _drawBeamTier1(ctx, frame) {
    const pulse = 0.8 + Math.sin(frame * 0.3) * 0.2;
    const r = 5 * pulse;

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00DDFF';

    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.4, '#66EEFF');
    grd.addColorStop(1, 'rgba(0,200,255,0.3)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.shadowBlur = 0;
  },

  // Tier 2: Green plasma shot — wider, glow ring, trailing dots
  _drawBeamTier2(ctx, frame) {
    const pulse = 0.85 + Math.sin(frame * 0.25) * 0.15;
    const r = 7 * pulse;

    ctx.shadowBlur = 14;
    ctx.shadowColor = '#44FF66';

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(68,255,102,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Main body
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.3, '#88FF88');
    grd.addColorStop(1, 'rgba(34,200,60,0.4)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Trailing dots
    for (let i = 1; i <= 2; i++) {
      const ty = i * 8;
      const tr = (r - i * 1.5) * 0.6;
      ctx.globalAlpha = 0.6 - i * 0.2;
      ctx.beginPath();
      ctx.arc(0, ty, Math.max(1, tr), 0, Math.PI * 2);
      ctx.fillStyle = '#66FF88';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
  },

  // Tier 3: Orange fire beam — elongated, flame trail
  _drawBeamTier3(ctx, frame) {
    const pulse = 0.9 + Math.sin(frame * 0.2) * 0.1;

    ctx.shadowBlur = 18;
    ctx.shadowColor = '#FF6622';

    // Flame trail particles behind
    for (let i = 1; i <= 4; i++) {
      const flicker = Math.sin(frame * 0.4 + i * 2.1) * 3;
      const ty = i * 7;
      const tr = (5 - i * 0.8);
      ctx.globalAlpha = 0.7 - i * 0.15;
      ctx.beginPath();
      ctx.ellipse(flicker, ty, Math.max(1, tr), Math.max(1, tr * 1.5), 0, 0, Math.PI * 2);
      const fc = i < 2 ? '#FF8833' : i < 3 ? '#FFAA44' : '#FFCC66';
      ctx.fillStyle = fc;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Main elongated body
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 12 * pulse);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.25, '#FFDD44');
    grd.addColorStop(0.6, '#FF6622');
    grd.addColorStop(1, 'rgba(255,80,0,0.2)');
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * pulse, 12 * pulse, 0, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Hot core
    ctx.beginPath();
    ctx.ellipse(0, -1, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.shadowBlur = 0;
  },

  // Tier 4: Purple lightning bolt — diamond shape, electric sparks
  _drawBeamTier4(ctx, frame) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#AA66FF';

    // Electric spark lines radiating outward
    const sparkCount = 4;
    ctx.strokeStyle = '#BB88FF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + frame * 0.15;
      const len = 8 + Math.sin(frame * 0.5 + i * 1.7) * 4;
      const midLen = len * 0.5;
      const jitter = Math.sin(frame * 0.8 + i * 3) * 3;
      ctx.globalAlpha = 0.6 + Math.sin(frame * 0.3 + i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * midLen + jitter,
        Math.sin(angle) * midLen
      );
      ctx.lineTo(
        Math.cos(angle) * len,
        Math.sin(angle) * len + jitter
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Diamond shape body
    const sz = 8;
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.3, '#CC88FF');
    grd.addColorStop(0.7, '#7733DD');
    grd.addColorStop(1, 'rgba(100,30,200,0.3)');
    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.4);
    ctx.lineTo(sz, 0);
    ctx.lineTo(0, sz * 1.4);
    ctx.lineTo(-sz, 0);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    // Inner glow core
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#EEDDFF';
    ctx.fill();

    // Occasional bright flash
    if (frame % 6 < 2) {
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, sz + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(170,100,255,0.3)';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
  },

  // Tier 5: Golden legendary beam — large, rainbow shimmer, intense aura
  _drawBeamTier5(ctx, frame) {
    const pulse = 0.9 + Math.sin(frame * 0.15) * 0.1;
    const r = 9 * pulse;

    // Rainbow shimmer hue
    const hue = (frame * 4) % 360;

    // Intense outer aura
    ctx.shadowBlur = 30;
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;

    // Aura ring
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Rainbow shimmer ring
    ctx.save();
    ctx.rotate(frame * 0.08);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `hsl(${(hue + 90) % 360}, 90%, 65%)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Main golden body
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.25, '#FFE866');
    grd.addColorStop(0.6, '#FFD700');
    grd.addColorStop(1, 'rgba(204,153,0,0.4)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Rainbow shimmer overlay on the body
    ctx.save();
    ctx.globalAlpha = 0.2;
    const shimmer = ctx.createLinearGradient(-r, -r, r, r);
    const shimOff = (frame * 0.02) % 1;
    shimmer.addColorStop((0 + shimOff) % 1, '#FF0000');
    shimmer.addColorStop((0.2 + shimOff) % 1, '#FFFF00');
    shimmer.addColorStop((0.4 + shimOff) % 1, '#00FF00');
    shimmer.addColorStop((0.6 + shimOff) % 1, '#0088FF');
    shimmer.addColorStop((0.8 + shimOff) % 1, '#AA00FF');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = shimmer;
    ctx.fill();
    ctx.restore();

    // Bright white core flash
    const coreFlash = 0.7 + Math.sin(frame * 0.4) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3 * coreFlash, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Trailing stardust
    for (let i = 1; i <= 3; i++) {
      const ty = i * 9;
      const tr = (r - i * 1.8) * 0.5;
      const twinkle = Math.sin(frame * 0.3 + i * 2) * 0.3 + 0.5;
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(Math.sin(frame * 0.2 + i) * 3, ty, Math.max(1, tr), 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF88CC';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
  },

  // =========== NUMBER EXPLOSION ===========
  drawNumberExplosion(ctx, x, y, progress, tier, text) {
    ctx.save();
    ctx.translate(x, y);

    const alpha = Math.max(0, 1 - progress);

    // Tier-based colors
    const tierColors = {
      1: { primary: '#00DDFF', secondary: '#66EEFF' },
      2: { primary: '#44FF66', secondary: '#88FF88' },
      3: { primary: '#FF6622', secondary: '#FFAA44' },
      4: { primary: '#AA66FF', secondary: '#CC88FF' },
      5: { primary: '#FFD700', secondary: '#FFE866' },
    };
    const colors = tierColors[tier] || tierColors[1];

    // 1. Central white flash (fades quickly)
    if (progress < 0.25) {
      const flashAlpha = (0.25 - progress) / 0.25;
      ctx.globalAlpha = flashAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, (1 - progress * 2) * 30 + tier * 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // 2. Colored particle ring expanding outward
    const ringRadius = progress * (60 + tier * 15);
    const particleCount = 12 + tier * 3;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const jitter = Math.sin(i * 3.7) * progress * 8;
      const px = Math.cos(angle) * (ringRadius + jitter);
      const py = Math.sin(angle) * (ringRadius + jitter);
      const pSize = (1 - progress) * (3 + tier * 0.8 + Math.sin(i * 2.3) * 1.5);

      ctx.globalAlpha = alpha * (0.5 + Math.sin(i) * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, pSize), 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? colors.primary : colors.secondary;
      ctx.shadowBlur = 6;
      ctx.shadowColor = colors.primary;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. Number fragments flying outward in 6 directions
    if (text) {
      const fragmentCount = 6;
      const fontSize = Math.max(8, 16 - progress * 14);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < fragmentCount; i++) {
        const angle = (i / fragmentCount) * Math.PI * 2 + 0.3;
        const dist = progress * (50 + tier * 10);
        const fx = Math.cos(angle) * dist;
        const fy = Math.sin(angle) * dist;
        const rotation = progress * (i % 2 === 0 ? 1 : -1) * 2;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = colors.secondary;
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }

    // 4. Shockwave ring for tiers 3+
    if (tier >= 3 && progress < 0.7) {
      const shockRadius = progress * (80 + tier * 12);
      const shockAlpha = (0.7 - progress) / 0.7 * 0.5;
      ctx.globalAlpha = shockAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, shockRadius, 0, Math.PI * 2);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 3 - progress * 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors.primary;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. Secondary inner shockwave for tier 5
    if (tier >= 5 && progress < 0.5) {
      const innerShock = progress * 2 * 50;
      const innerAlpha = (0.5 - progress) / 0.5 * 0.6;
      ctx.globalAlpha = innerAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, innerShock, 0, Math.PI * 2);
      const hue = (progress * 720) % 360;
      ctx.strokeStyle = `hsl(${hue}, 90%, 65%)`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 6. Screen flash effect for tier 5 (drawn relative to world, not local)
    // (This is a brief full-screen overlay handled in the local coords — 
    //  works because it's big enough to cover visible area)
    if (tier >= 5 && progress < 0.1) {
      ctx.globalAlpha = (0.1 - progress) / 0.1 * 0.15;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-2000, -2000, 4000, 4000);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // =========== HELPERS ===========
  getPlayerRadius(stage) {
    switch (stage) {
      case 1: return 22;
      case 2: return 24;
      case 3: return 28;
      case 4: return 32;
      case 5: return 36;
      default: return 22;
    }
  },

  getCreatureName(stage) {
    switch (stage) {
      case 1: return 'Hatchling';
      case 2: return 'Sparky';
      case 3: return 'Blazer';
      case 4: return 'Stormclaw';
      case 5: return 'Legendragon';
      default: return 'Hatchling';
    }
  },
};
