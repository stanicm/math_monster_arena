// ============================================================
// Math Monster Arena — Main Game Engine
// A Space-Invaders-style math game for kids
// ============================================================

'use strict';

// ------------------------------------------------------------
// Game States
// ------------------------------------------------------------
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

// ------------------------------------------------------------
// Creature & Title Lookup Tables
// ------------------------------------------------------------
const CREATURES = [
  { stage: 1, name: 'Hatchling',   minLevel: 1,  className: 'creature-stage-1' },
  { stage: 2, name: 'Sparky',      minLevel: 3,  className: 'creature-stage-2' },
  { stage: 3, name: 'Blazer',      minLevel: 6,  className: 'creature-stage-3' },
  { stage: 4, name: 'Stormclaw',   minLevel: 10, className: 'creature-stage-4' },
  { stage: 5, name: 'Legendragon', minLevel: 15, className: 'creature-stage-5' },
];

const TITLES = [
  { minLevel: 1,  title: 'Math Rookie' },
  { minLevel: 3,  title: 'Number Explorer' },
  { minLevel: 6,  title: 'Math Ninja' },
  { minLevel: 10, title: 'Math Champion' },
  { minLevel: 15, title: 'Math Legend' },
];

// ------------------------------------------------------------
// Core Game State
// ------------------------------------------------------------
const state = {
  gameState: GameState.MENU,
  level: 1,
  xp: 0,
  xpToNext: 10,
  questionsInLevel: 0,
  streak: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalWrong: 0,
  fastAnswers: 0,
  creatureStage: 1,
  health: 3,
  maxHealth: 3,
  frame: 0,

  // Player
  player: { x: 0, y: 0, vx: 0, vy: 0, invulnTimer: 0, shieldTimer: 0 },

  // Current math problem
  currentProblem: null,
  problemStartTime: 0,

  // Delayed problem regeneration timer (ms timestamp, 0 = none)
  nextProblemTime: 0,

  // Entities
  entities: [],    // { type, x, y, vx, vy, radius, data }
  particles: [],   // { x, y, vx, vy, life, maxLife, color, size, text? }
  explosions: [],  // { x, y, progress, speed, color }
  numberExplosions: [], // { x, y, progress, speed, tier, text }
  stars: [],       // { x, y, size, speed, brightness, twinkleOffset }
  beams: [],       // { x, y, vx, vy, tier, life }
  shootingDisabled: false, // true while answers are transitioning

  // Timing
  lastSpawnTime: 0,
  spawnInterval: 2000,
  lastBeamTime: 0,

  // Canvas
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
};

// Active keys tracking
const keysDown = new Set();

// Badges state — track which have been awarded
const badgesAwarded = {
  'badge-streak5': false,
  'badge-streak10': false,
  'badge-speed': false,
  'badge-perfect': false,
  'badge-century': false,
};

// ------------------------------------------------------------
// Audio — Web Audio API sound effects
// ------------------------------------------------------------
let audioCtx = null;

function ensureAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (_) {
    // Audio not available — that's fine
  }
}

/** Play a simple oscillator tone */
function playTone(freq, duration, type = 'sine', startDelay = 0, gain = 0.15) {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const vol = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.value = gain;
    // Quick fade-out to avoid clicks
    const t = audioCtx.currentTime + startDelay;
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(vol);
    vol.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (_) {
    // Audio might not be available — that's fine
  }
}

function soundCorrect() {
  playTone(523, 0.12, 'sine', 0, 0.18);
  playTone(659, 0.12, 'sine', 0.08, 0.18);
  playTone(784, 0.18, 'sine', 0.16, 0.18);
}

function soundWrong() {
  playTone(220, 0.15, 'sawtooth', 0, 0.12);
  playTone(180, 0.2, 'sawtooth', 0.1, 0.12);
}

function soundLevelUp() {
  playTone(523, 0.1, 'sine', 0, 0.15);
  playTone(659, 0.1, 'sine', 0.08, 0.15);
  playTone(784, 0.1, 'sine', 0.16, 0.15);
  playTone(1047, 0.25, 'triangle', 0.24, 0.2);
}

function soundHit() {
  playTone(100, 0.15, 'square', 0, 0.2);
  playTone(80, 0.1, 'square', 0.05, 0.15);
}

function soundCollect() {
  playTone(880, 0.08, 'sine', 0, 0.12);
  playTone(1100, 0.1, 'sine', 0.06, 0.12);
}

function soundShoot(tier) {
  // Higher tiers get deeper, more powerful sounds
  const baseFreq = 600 + tier * 120;
  playTone(baseFreq, 0.06, 'sine', 0, 0.10);
  playTone(baseFreq * 1.4, 0.04, 'triangle', 0.02, 0.08);
  if (tier >= 3) {
    playTone(baseFreq * 0.5, 0.08, 'square', 0, 0.05);
  }
}

// ------------------------------------------------------------
// Utility Helpers
// ------------------------------------------------------------
function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

function getCurrentTitle() {
  let title = TITLES[0].title;
  for (const t of TITLES) {
    if (state.level >= t.minLevel) title = t.title;
  }
  return title;
}

function getCreatureStageForLevel(level) {
  let stage = 1;
  for (const c of CREATURES) {
    if (level >= c.minLevel) stage = c.stage;
  }
  return stage;
}

function xpForLevel(level) {
  return Math.floor(30 * Math.pow(1.3, level - 1));
}

/** Return weapon visual tier (1-5) based on current level */
function getWeaponTier(level) {
  if (level <= 3)  return 1;
  if (level <= 6)  return 2;
  if (level <= 9)  return 3;
  if (level <= 12) return 4;
  return 5;
}

/** Spawn a beam projectile from the player's position */
function spawnBeam() {
  if (state.shootingDisabled) return; // disabled while new answers spawn
  const now = performance.now();
  if (now - state.lastBeamTime < 250) return; // cooldown
  state.lastBeamTime = now;

  const tier = getWeaponTier(state.level);
  const speed = 10 + tier * 1; // slightly faster at higher tiers
  const p = state.player;

  state.beams.push({
    x: p.x,
    y: p.y - CreatureRenderer.getPlayerRadius(state.creatureStage) - 4,
    vx: 0,
    vy: -speed,
    tier,
    life: 120, // ~2 seconds max
  });

  soundShoot(tier);
}

// ------------------------------------------------------------
// Starfield
// ------------------------------------------------------------
function generateStars() {
  state.stars = [];
  const count = randInt(100, 150);
  for (let i = 0; i < count; i++) {
    state.stars.push({
      x: Math.random() * (state.width || 800),
      y: Math.random() * (state.height || 600),
      size: randRange(0.5, 2.5),
      speed: randRange(0.3, 1.5),
      brightness: Math.random(),
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
}

function updateStarfield() {
  for (const s of state.stars) {
    s.y += s.speed;
    if (s.y > state.height) {
      s.y = 0;
      s.x = Math.random() * state.width;
    }
  }
}

function drawStarfield() {
  const { ctx } = state;
  for (const s of state.stars) {
    CreatureRenderer.drawStar(ctx, s.x, s.y, s.size, s.brightness);
  }
}

// ------------------------------------------------------------
// Math Problem Generation
// ------------------------------------------------------------
/** Return operand ranges based on level tier:
 *  Levels 1-9:  num2 is 1-9  (single-digit second operand)
 *  Levels 10-14: num2 is 10-20 (teens second operand)
 *  Levels 15+:  num2 is unrestricted (full difficulty)
 */
function getNumberRanges(level) {
  let maxNum1, minNum2, maxNum2;
  if (level <= 9) {
    maxNum1 = level <= 2 ? 20 : level <= 5 ? 50 : 75;
    minNum2 = 1;
    maxNum2 = 9;
  } else if (level <= 14) {
    maxNum1 = 80;
    minNum2 = 10;
    maxNum2 = 20;
  } else {
    maxNum1 = 99;
    minNum2 = 1;
    maxNum2 = 99;
  }
  return { maxNum1, minNum2, maxNum2 };
}

function generateProblem() {
  const { maxNum1, minNum2, maxNum2 } = getNumberRanges(state.level);
  const isAdd = Math.random() < 0.5;

  let num1, num2, answer;
  if (isAdd) {
    // Addition — result capped at 100
    num1 = randInt(1, maxNum1);
    num2 = randInt(minNum2, Math.min(maxNum2, 100 - num1));
    // If num1 is too large for even minNum2, shrink num1
    if (100 - num1 < minNum2) {
      num1 = randInt(1, 100 - minNum2);
      num2 = randInt(minNum2, Math.min(maxNum2, 100 - num1));
    }
    answer = num1 + num2;
  } else {
    // Subtraction — result always non-negative, num2 >= minNum2
    num1 = randInt(minNum2, maxNum1);  // num1 must be at least minNum2
    num2 = randInt(minNum2, Math.min(maxNum2, num1));
    answer = num1 - num2;
  }

  const operator = isAdd ? '+' : '−';
  state.currentProblem = { num1, num2, operator, answer };
  state.problemStartTime = performance.now();

  // Update HUD problem display
  const problemEl = document.getElementById('problem-display');
  if (problemEl) {
    problemEl.textContent = `${num1} ${operator} ${num2} = ?`;
  }

  // Spawn answer bubbles
  spawnAnswerBubbles(answer);
}

/** Generate three unique wrong answers close to the correct one */
function generateWrongAnswers(correct, count = 3) {
  const wrongs = new Set();
  let attempts = 0;
  while (wrongs.size < count && attempts < 200) {
    attempts++;
    let wrong = correct + randInt(-10, 10);
    // Ensure valid: non-negative, not equal to correct, unique
    if (wrong < 0) wrong = correct + randInt(1, 10);
    if (wrong === correct) continue;
    if (wrongs.has(wrong)) continue;
    wrongs.add(wrong);
  }
  // Fallback in case we struggle (shouldn't happen often)
  while (wrongs.size < count) {
    const fallback = correct + wrongs.size + 1;
    if (!wrongs.has(fallback) && fallback !== correct) wrongs.add(fallback);
  }
  return [...wrongs];
}

function spawnAnswerBubbles(correctAnswer) {
  const wrongs = generateWrongAnswers(correctAnswer);
  const values = [correctAnswer, ...wrongs];

  // Shuffle the values
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const fallSpeed = Math.min(4.0, 1.0 + state.level * 0.15);
  const bubbleRadius = 72;
  const bubbleDiameter = bubbleRadius * 2;
  const padding = 8; // minimum gap between bubbles

  // Distribute 4 bubbles evenly across the screen width, clamped to edges
  const usableWidth = state.width - bubbleDiameter; // leftmost center to rightmost center
  const positions = [];
  const count = 4;

  // Calculate evenly-spaced positions with small random jitter
  const spacing = usableWidth / (count - 1);
  for (let i = 0; i < count; i++) {
    const baseX = bubbleRadius + spacing * i;
    const maxJitter = Math.min(spacing * 0.2, 20);
    let x = baseX + randRange(-maxJitter, maxJitter);
    // Clamp to screen edges
    x = clamp(x, bubbleRadius, state.width - bubbleRadius);
    positions.push(x);
  }

  // Resolve overlaps: push bubbles apart so they don't intersect
  positions.sort((a, b) => a - b);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < positions.length; i++) {
      const minDist = bubbleDiameter + padding;
      if (positions[i] - positions[i - 1] < minDist) {
        const overlap = minDist - (positions[i] - positions[i - 1]);
        positions[i - 1] -= overlap / 2;
        positions[i] += overlap / 2;
        // Re-clamp after adjustment
        positions[i - 1] = clamp(positions[i - 1], bubbleRadius, state.width - bubbleRadius);
        positions[i] = clamp(positions[i], bubbleRadius, state.width - bubbleRadius);
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const value = values[i];
    state.entities.push({
      type: 'answer',
      x: positions[i],
      y: -bubbleRadius,
      vx: randRange(-0.3, 0.3),
      vy: fallSpeed,
      radius: bubbleRadius,
      data: {
        value,
        isCorrect: value === correctAnswer,
        state: 'normal',
      },
    });
  }
}

// ------------------------------------------------------------
// Entity Spawning
// ------------------------------------------------------------
function maybeSpawnAsteroid() {
  const now = performance.now();
  state.spawnInterval = Math.max(800, 2000 - state.level * 100);

  if (now - state.lastSpawnTime < state.spawnInterval) return;
  state.lastSpawnTime = now;

  // 5% chance of alien instead
  if (Math.random() < 0.05) {
    spawnAlien();
    return;
  }

  spawnAsteroid();
}

function spawnAsteroid() {
  const roll = Math.random();
  let size, radius;
  if (roll < 0.6)      { size = 'small';  radius = 15; }
  else if (roll < 0.9) { size = 'medium'; radius = 25; }
  else                  { size = 'large';  radius = 35; }

  const baseVy = 1.0 + state.level * 0.1 + Math.random() * 0.5;
  // Smaller asteroids tend to be a bit faster
  const sizeBoost = size === 'small' ? 0.5 : size === 'medium' ? 0.25 : 0;

  state.entities.push({
    type: 'asteroid',
    x: randRange(radius, state.width - radius),
    y: -40,
    vx: randRange(-0.5, 0.5),
    vy: Math.min(4.0, baseVy + sizeBoost),
    radius,
    data: {
      size,
      hp: size === 'small' ? 1 : size === 'medium' ? 2 : 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: randRange(-0.04, 0.04),
    },
  });
}

function spawnAlien() {
  const spawnX = randRange(30, state.width - 30);
  state.entities.push({
    type: 'alien',
    x: spawnX,
    y: -30,
    vx: 0,
    vy: 1.5,
    radius: 18,
    data: {
      type: 'basic',
      baseX: spawnX,
    },
  });
}

// ------------------------------------------------------------
// Input Handling
// ------------------------------------------------------------
function setupInput() {
  window.addEventListener('keydown', (e) => {
    keysDown.add(e.key);
    // Prevent arrow keys and space from scrolling the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    // Escape toggles pause
    if (e.key === 'Escape') {
      if (state.gameState === GameState.PLAYING) {
        pauseGame();
      } else if (state.gameState === GameState.PAUSED) {
        // Only resume from user-initiated pause (not level-up/evolution overlays)
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) {
          resumeFromPause();
        }
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.key);
  });
}

function handleInput() {
  const p = state.player;
  const accel = 0.84;

  // Left
  if (keysDown.has('ArrowLeft') || keysDown.has('a') || keysDown.has('A')) {
    p.vx -= accel;
  }
  // Right
  if (keysDown.has('ArrowRight') || keysDown.has('d') || keysDown.has('D')) {
    p.vx += accel;
  }
  // Up
  if (keysDown.has('ArrowUp') || keysDown.has('w') || keysDown.has('W')) {
    p.vy -= accel;
  }
  // Down
  if (keysDown.has('ArrowDown') || keysDown.has('s') || keysDown.has('S')) {
    p.vy += accel;
  }

  // Shoot beam
  if (keysDown.has(' ')) {
    spawnBeam();
  }
}

// ------------------------------------------------------------
// Player Update
// ------------------------------------------------------------
function updatePlayer() {
  const p = state.player;

  // Friction
  p.vx *= 0.88;
  p.vy *= 0.88;

  // Clamp max speed
  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > 9.6) {
    p.vx *= 9.6 / speed;
    p.vy *= 9.6 / speed;
  }

  // Update position
  p.x += p.vx;
  p.y += p.vy;

  // Clamp to canvas bounds
  const r = CreatureRenderer.getPlayerRadius(state.creatureStage);
  p.x = clamp(p.x, r, state.width - r);
  p.y = clamp(p.y, r, state.height - r);

  // Decrement invulnerability timer
  if (p.invulnTimer > 0) p.invulnTimer--;

  // Decrement shield timer
  if (p.shieldTimer > 0) p.shieldTimer--;
}

// ------------------------------------------------------------
// Entity Updates
// ------------------------------------------------------------
function updateEntities() {
  for (const e of state.entities) {
    // Alien sine-wave movement
    if (e.type === 'alien') {
      e.vx = Math.sin(state.frame * 0.03) * 1.5;
    }

    // Rotate asteroids
    if (e.type === 'asteroid') {
      e.data.rotation += e.data.rotSpeed;
    }

    e.x += e.vx;
    e.y += e.vy;

    // Keep answer bubbles within screen bounds horizontally
    if (e.type === 'answer') {
      if (e.x - e.radius < 0) { e.x = e.radius; e.vx = Math.abs(e.vx); }
      else if (e.x + e.radius > state.width) { e.x = state.width - e.radius; e.vx = -Math.abs(e.vx); }
    }
  }

  // Re-enable shooting once all answer bubbles are fully visible on screen
  if (state.shootingDisabled) {
    const answers = state.entities.filter(e => e.type === 'answer');
    if (answers.length > 0 && answers.every(a => a.y >= a.radius)) {
      state.shootingDisabled = false;
    }
  }
}

function cleanupEntities() {
  state.entities = state.entities.filter((e) => {
    // Remove if fallen well below canvas or gone off sides/top
    if (e.y > state.height + 50) return false;
    if (e.y < -100) return false;
    if (e.x < -100 || e.x > state.width + 100) return false;
    return true;
  });

  // Auto-generate new problem if no answer bubbles remain
  if (state.gameState === GameState.PLAYING && state.nextProblemTime === 0) {
    const hasAnswers = state.entities.some((e) => e.type === 'answer');
    if (!hasAnswers && state.currentProblem !== null) {
      // Schedule a new problem soon
      state.nextProblemTime = performance.now() + 300;
    }
  }
}

// ------------------------------------------------------------
// Beam Update & Collision
// ------------------------------------------------------------
function updateBeams() {
  // Clear all in-flight beams when shooting is disabled (answer was just hit)
  if (state.shootingDisabled) {
    state.beams = [];
    return;
  }
  for (let i = state.beams.length - 1; i >= 0; i--) {
    const b = state.beams[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    if (b.life <= 0 || b.y < -20 || b.y > state.height + 20) {
      state.beams.splice(i, 1);
    }
  }
}

function checkBeamCollisions() {
  for (let bi = state.beams.length - 1; bi >= 0; bi--) {
    const beam = state.beams[bi];
    const beamRadius = 4 + beam.tier * 1.5; // larger hit area for higher tiers
    let consumed = false;

    // Pass 1: check hazards first (asteroids, aliens) — priority targets
    for (let ei = state.entities.length - 1; ei >= 0; ei--) {
      const entity = state.entities[ei];
      if (entity.type !== 'asteroid' && entity.type !== 'alien') continue;

      const dx = beam.x - entity.x;
      const dy = beam.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < beamRadius + entity.radius) {
        handleBeamHazardHit(entity, beam);
        state.beams.splice(bi, 1);
        consumed = true;
        break;
      }
    }

    if (consumed) continue;

    // Pass 2: check answer bubbles (only if beam wasn't consumed by a hazard)
    for (let ei = state.entities.length - 1; ei >= 0; ei--) {
      const entity = state.entities[ei];
      if (entity.type !== 'answer') continue;

      const dx = beam.x - entity.x;
      const dy = beam.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < beamRadius + entity.radius) {
        handleBeamAnswerHit(entity, beam);
        state.beams.splice(bi, 1);
        consumed = true;
        break;
      }
    }

    if (consumed) continue;
  }
}

function handleBeamHazardHit(entity, beam) {
  const tier = beam.tier;

  if (entity.type === 'asteroid') {
    // Decrement HP
    entity.data.hp--;
    if (entity.data.hp <= 0) {
      // Destroy asteroid
      soundHit();
      state.explosions.push({
        x: entity.x,
        y: entity.y,
        progress: 0,
        speed: 0.03,
        color: '#fb923c',
      });
      spawnParticleBurst(entity.x, entity.y, 15 + tier * 3, '#fb923c');
      const idx = state.entities.indexOf(entity);
      if (idx !== -1) state.entities.splice(idx, 1);
      // Brief invulnerability after destroying a hazard
      if (state.player.invulnTimer < 20) {
        state.player.invulnTimer = 20;
      }
    } else {
      // Hit but not destroyed — small particle burst as feedback
      soundHit();
      spawnParticleBurst(entity.x, entity.y, 6, '#ffaa44');
    }
  } else if (entity.type === 'alien') {
    // Aliens die in 1 hit
    soundHit();
    state.explosions.push({
      x: entity.x,
      y: entity.y,
      progress: 0,
      speed: 0.03,
      color: '#a78bfa',
    });
    spawnParticleBurst(entity.x, entity.y, 18 + tier * 3, '#a78bfa');
    const idx = state.entities.indexOf(entity);
    if (idx !== -1) state.entities.splice(idx, 1);
    // Brief invulnerability after destroying a hazard
    if (state.player.invulnTimer < 20) {
      state.player.invulnTimer = 20;
    }
  }
}

function handleBeamAnswerHit(entity, beam) {
  const tier = beam.tier;

  // Spawn a number explosion at the hit location
  state.numberExplosions.push({
    x: entity.x,
    y: entity.y,
    progress: 0,
    speed: 0.025,
    tier,
    text: String(entity.data.value),
  });

  if (entity.data.isCorrect) {
    // --- Correct! ---
    entity.data.state = 'correct';
    soundCorrect();

    // Calculate XP
    const elapsed = (performance.now() - state.problemStartTime) / 1000;
    let xpAmount = 10;
    if (elapsed < 5) {
      xpAmount += Math.round((1 - elapsed / 5) * 10);
    }
    if (elapsed < 3) {
      state.fastAnswers++;
    }

    // Streak
    state.streak++;
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
    }

    // Streak multiplier
    if (state.streak >= 5) xpAmount *= 3;
    else if (state.streak >= 3) xpAmount *= 2;

    state.totalCorrect++;

    // Enhanced particle burst (more particles for higher tiers)
    const burstCount = 15 + tier * 5;
    spawnParticleBurst(entity.x, entity.y, burstCount, '#4ade80');

    // Floating XP text
    state.particles.push({
      x: entity.x,
      y: entity.y - 40,
      vx: 0,
      vy: -1.5,
      life: 60,
      maxLife: 60,
      color: '#fbbf24',
      size: 14 + tier,
      text: `+${xpAmount} XP`,
    });

    // Award XP
    awardXP(xpAmount);
  } else {
    // --- Wrong answer ---
    entity.data.state = 'wrong';
    soundWrong();

    state.streak = 0;
    state.totalWrong++;

    // Red particle burst
    spawnParticleBurst(entity.x, entity.y, 12 + tier * 3, '#f87171');

    // Take damage
    takeDamage();
  }

  // Disable shooting; beams are cleared safely in updateBeams() next frame
  state.shootingDisabled = true;

  // Remove all answer bubbles
  removeAllAnswers();

  // Track question progress toward level-up
  checkLevelProgress();

  // Schedule new problem
  const delay = entity.data.isCorrect ? 500 : 1000;
  state.nextProblemTime = performance.now() + delay;
  state.currentProblem = null;

  // Update HUD & badges
  updateHUD();
  checkBadges();
}

// ------------------------------------------------------------
// Collision Detection
// ------------------------------------------------------------
function checkCollisions() {
  const p = state.player;
  const pRadius = CreatureRenderer.getPlayerRadius(state.creatureStage);

  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    const dist = distance(p, e);

    if (dist < pRadius + e.radius) {
      handleCollision(e);
      break; // Process one collision per frame to avoid double-hits
    }
  }
}

function handleCollision(entity) {
  if (entity.type === 'answer') {
    handleAnswerCollision(entity);
  } else if (entity.type === 'asteroid' || entity.type === 'alien') {
    handleHazardCollision(entity);
  }
}

// ------------------------------------------------------------
// Answer Collection
// ------------------------------------------------------------
function handleAnswerCollision(entity) {
  // Skip collision during invulnerability to prevent double-damage
  if (state.player.invulnTimer > 0) return;

  if (entity.data.isCorrect) {
    // --- Correct! ---
    entity.data.state = 'correct';
    soundCorrect();

    // Calculate XP
    const elapsed = (performance.now() - state.problemStartTime) / 1000;
    let xpAmount = 10;
    // Speed bonus: up to +10 if answered within 5 seconds
    if (elapsed < 5) {
      xpAmount += Math.round((1 - elapsed / 5) * 10);
    }
    // Track fast answers (under 3 seconds)
    if (elapsed < 3) {
      state.fastAnswers++;
    }

    // Streak
    state.streak++;
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
    }

    // Streak multiplier
    if (state.streak >= 5) xpAmount *= 3;
    else if (state.streak >= 3) xpAmount *= 2;

    state.totalCorrect++;

    // Green particle burst
    spawnParticleBurst(entity.x, entity.y, 15, '#4ade80');

    // Floating XP text
    state.particles.push({
      x: state.player.x,
      y: state.player.y - 40,
      vx: 0,
      vy: -1.5,
      life: 60,
      maxLife: 60,
      color: '#fbbf24',
      size: 14,
      text: `+${xpAmount} XP`,
    });

    // Award XP
    awardXP(xpAmount);
  } else {
    // --- Wrong answer ---
    entity.data.state = 'wrong';
    soundWrong();

    state.streak = 0;
    state.totalWrong++;

    // Red particle burst
    spawnParticleBurst(entity.x, entity.y, 12, '#f87171');

    // Take damage
    takeDamage();
  }

  // Disable shooting; beams are cleared safely in updateBeams() next frame
  state.shootingDisabled = true;

  // Remove all answer bubbles
  removeAllAnswers();

  // Track question progress toward level-up
  checkLevelProgress();

  // Schedule new problem
  const delay = entity.data.isCorrect ? 500 : 1000;
  state.nextProblemTime = performance.now() + delay;
  state.currentProblem = null;

  // Update HUD & badges
  updateHUD();
  checkBadges();
}

// ------------------------------------------------------------
// Hazard (Asteroid/Alien) Collision
// ------------------------------------------------------------
function handleHazardCollision(entity) {
  const p = state.player;

  // If invulnerable or shielded, ignore
  if (p.invulnTimer > 0 || p.shieldTimer > 0) return;

  soundHit();

  // Explosion at collision point
  const midX = (p.x + entity.x) / 2;
  const midY = (p.y + entity.y) / 2;
  state.explosions.push({
    x: midX,
    y: midY,
    progress: 0,
    speed: 0.03,
    color: entity.type === 'alien' ? '#a78bfa' : '#fb923c',
  });

  // Orange/purple particle burst
  const burstColor = entity.type === 'alien' ? '#a78bfa' : '#fb923c';
  spawnParticleBurst(midX, midY, 20, burstColor);

  // Remove the hazard entity
  const idx = state.entities.indexOf(entity);
  if (idx !== -1) state.entities.splice(idx, 1);

  // Take damage & invulnerability
  takeDamage();
  p.invulnTimer = 90; // ~1.5 seconds at 60 fps

  updateHUD();
}

// ------------------------------------------------------------
// Damage & Game Over
// ------------------------------------------------------------
function takeDamage() {
  state.health--;
  state.player.invulnTimer = 90;

  // Update hearts
  const hearts = document.querySelectorAll('#health-display .heart');
  hearts.forEach((h, i) => {
    h.classList.toggle('lost', i >= state.health);
  });

  if (state.health <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  state.gameState = GameState.GAMEOVER;

  // Populate stats
  const statsEl = document.getElementById('gameover-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <p>Level Reached: <strong>${state.level}</strong></p>
      <p>Title: <strong>${getCurrentTitle()}</strong></p>
      <p>Correct Answers: <strong>${state.totalCorrect}</strong></p>
      <p>Wrong Answers: <strong>${state.totalWrong}</strong></p>
      <p>Best Streak: <strong>${state.bestStreak}</strong></p>
    `;
  }

  showOverlay('gameover-overlay');
}

// ------------------------------------------------------------
// XP / Level Up / Evolution
// ------------------------------------------------------------
function awardXP(amount) {
  // XP is now cosmetic — leveling is driven by question count
  // The floating "+XP" text is still shown for feedback
  updateHUD();
}

/** Track questions answered per level; level up after 10 */
function checkLevelProgress() {
  state.questionsInLevel++;
  state.xp = state.questionsInLevel;

  if (state.questionsInLevel >= 10) {
    state.questionsInLevel = 0;
    state.xp = 0;
    state.level++;
    onLevelUp();
  }

  updateHUD();
}

function onLevelUp() {
  soundLevelUp();
  state.gameState = GameState.PAUSED;

  // Restore lives
  state.health = state.maxHealth;

  // Gold particle celebration
  spawnParticleBurst(state.player.x, state.player.y, 30, '#fbbf24');

  // Update level-up overlay text
  const levelEl = document.getElementById('new-level-display');
  const titleEl = document.getElementById('new-title-display');
  if (levelEl) levelEl.textContent = `Level ${state.level}`;
  if (titleEl) titleEl.textContent = getCurrentTitle();

  showOverlay('level-up-overlay');
  updateHUD();
}

function checkEvolution() {
  const newStage = getCreatureStageForLevel(state.level);
  if (newStage > state.creatureStage) {
    showEvolutionOverlay(state.creatureStage, newStage);
    state.creatureStage = newStage;
    return true;
  }
  return false;
}

function showEvolutionOverlay(oldStage, newStage) {
  state.gameState = GameState.PAUSED;

  // Draw old creature on the evolution-old-canvas
  const oldCanvas = document.getElementById('evolution-old-canvas');
  if (oldCanvas) {
    const octx = oldCanvas.getContext('2d');
    octx.clearRect(0, 0, oldCanvas.width, oldCanvas.height);
    CreatureRenderer.drawPlayer(
      octx,
      oldCanvas.width / 2,
      oldCanvas.height / 2,
      oldStage,
      state.frame,
      0,
      {}
    );
  }

  // Draw new creature on the evolution-new-canvas
  const newCanvas = document.getElementById('evolution-new-canvas');
  if (newCanvas) {
    const nctx = newCanvas.getContext('2d');
    nctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
    CreatureRenderer.drawPlayer(
      nctx,
      newCanvas.width / 2,
      newCanvas.height / 2,
      newStage,
      state.frame,
      0,
      {}
    );
  }

  // Creature name
  const nameEl = document.getElementById('evolution-name');
  if (nameEl) {
    nameEl.textContent = CreatureRenderer.getCreatureName(newStage);
  }

  showOverlay('evolution-overlay');
}

// ------------------------------------------------------------
// Particles
// ------------------------------------------------------------
function spawnParticleBurst(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(1, 4);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randInt(20, 45),
      maxLife: 45,
      color,
      size: randRange(2, 5),
    });
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    // Slight gravity on non-text particles
    if (!p.text) p.vy += 0.03;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  const { ctx } = state;
  for (const p of state.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;

    if (p.text) {
      // Floating text particle
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      // Circle particle
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------
// Explosions
// ------------------------------------------------------------
function updateExplosions() {
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const exp = state.explosions[i];
    exp.progress += exp.speed;
    if (exp.progress >= 1) {
      state.explosions.splice(i, 1);
    }
  }
  // Number explosions (from beam hits)
  for (let i = state.numberExplosions.length - 1; i >= 0; i--) {
    const exp = state.numberExplosions[i];
    exp.progress += exp.speed;
    if (exp.progress >= 1) {
      state.numberExplosions.splice(i, 1);
    }
  }
}

// ------------------------------------------------------------
// Answer Helpers
// ------------------------------------------------------------
function removeAllAnswers() {
  state.entities = state.entities.filter((e) => e.type !== 'answer');
}

// ------------------------------------------------------------
// Overlay Helpers
// ------------------------------------------------------------
function showOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ------------------------------------------------------------
// HUD Update
// ------------------------------------------------------------
function updateHUD() {
  // Title & level
  const titleEl = document.getElementById('player-title');
  if (titleEl) titleEl.textContent = getCurrentTitle();

  const levelEl = document.getElementById('player-level');
  if (levelEl) levelEl.textContent = `Lv. ${state.level}`;

  // XP bar (shows question progress)
  const pct = Math.min(100, (state.questionsInLevel / 10) * 100);
  const xpFill = document.getElementById('xp-bar-fill');
  if (xpFill) xpFill.style.width = `${pct}%`;

  const xpText = document.getElementById('xp-text');
  if (xpText) xpText.textContent = `${state.questionsInLevel} / 10 Questions`;

  // Health hearts
  const hearts = document.querySelectorAll('#health-display .heart');
  hearts.forEach((h, i) => {
    h.classList.toggle('lost', i >= state.health);
  });

  // Streak
  const streakCount = document.getElementById('streak-count');
  if (streakCount) streakCount.textContent = state.streak;

  const streakDisplay = document.getElementById('streak-display');
  if (streakDisplay) streakDisplay.classList.toggle('streak-fire', state.streak >= 3);

  // Stats panel
  const statCorrect = document.getElementById('stat-correct');
  if (statCorrect) statCorrect.textContent = state.totalCorrect;

  const statWrong = document.getElementById('stat-wrong');
  if (statWrong) statWrong.textContent = state.totalWrong;

  const statBest = document.getElementById('stat-best-streak');
  if (statBest) statBest.textContent = state.bestStreak;
}

// ------------------------------------------------------------
// Badge / Achievement System
// ------------------------------------------------------------
function checkBadges() {
  const checks = [
    { id: 'badge-streak5',  condition: state.bestStreak >= 5 },
    { id: 'badge-streak10', condition: state.bestStreak >= 10 },
    { id: 'badge-speed',    condition: state.fastAnswers >= 10 },
    { id: 'badge-perfect',  condition: state.totalCorrect >= 10 && state.totalWrong === 0 },
    { id: 'badge-century',  condition: state.totalCorrect >= 100 },
  ];

  for (const { id, condition } of checks) {
    if (condition && !badgesAwarded[id]) {
      badgesAwarded[id] = true;
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('badge-earned');
        // Little celebration particles at badge position
        soundCollect();
      }
    }
  }
}

// ------------------------------------------------------------
// Canvas Resize
// ------------------------------------------------------------
function resizeCanvas() {
  state.canvas.width = window.innerWidth;
  state.canvas.height = window.innerHeight;
  state.width = state.canvas.width;
  state.height = state.canvas.height;

  // Ensure player stays in bounds
  if (state.player.x || state.player.y) {
    const r = CreatureRenderer.getPlayerRadius(state.creatureStage);
    state.player.x = clamp(state.player.x, r, state.width - r);
    state.player.y = clamp(state.player.y, r, state.height - r);
  }
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function render() {
  const { ctx } = state;
  ctx.clearRect(0, 0, state.width, state.height);

  // 1. Scrolling star background
  drawStarfield();

  // 2. Entities (asteroids, aliens, answer bubbles)
  for (const entity of state.entities) {
    if (entity.type === 'asteroid') {
      CreatureRenderer.drawAsteroid(
        ctx, entity.x, entity.y,
        entity.data.size, entity.data.rotation, state.frame
      );
    } else if (entity.type === 'alien') {
      CreatureRenderer.drawAlien(ctx, entity.x, entity.y, entity.data.type, state.frame);
    } else if (entity.type === 'answer') {
      CreatureRenderer.drawAnswerBubble(
        ctx, entity.x, entity.y,
        entity.radius, String(entity.data.value),
        entity.data.state, state.frame
      );
    }
  }

  // 3. Beams
  for (const beam of state.beams) {
    CreatureRenderer.drawBeam(ctx, beam.x, beam.y, beam.tier, state.frame);
  }

  // 4. Particles
  drawParticles();

  // 5. Explosions
  for (const exp of state.explosions) {
    CreatureRenderer.drawExplosion(ctx, exp.x, exp.y, exp.progress, exp.color);
  }

  // 6. Number explosions (beam hits)
  for (const exp of state.numberExplosions) {
    CreatureRenderer.drawNumberExplosion(ctx, exp.x, exp.y, exp.progress, exp.tier, exp.text);
  }

  // Only draw player when game is active (PLAYING or PAUSED with visible player)
  if (state.gameState === GameState.PLAYING || state.gameState === GameState.PAUSED) {
    const dirX = Math.abs(state.player.vx) > 0.5 ? Math.sign(state.player.vx) : 0;

    // 5. Player trail
    CreatureRenderer.drawTrail(
      ctx, state.player.x, state.player.y,
      state.creatureStage, state.frame, dirX
    );

    // 6. Player creature (blink when invulnerable)
    const invuln = state.player.invulnTimer > 0;
    if (!invuln || Math.floor(state.frame / 4) % 2 === 0) {
      CreatureRenderer.drawPlayer(
        ctx, state.player.x, state.player.y,
        state.creatureStage, state.frame, dirX,
        { invulnerable: invuln, shieldActive: state.player.shieldTimer > 0 }
      );
    }

    // 7. Shield effect
    if (state.player.shieldTimer > 0) {
      const shieldR = CreatureRenderer.getPlayerRadius(state.creatureStage) + 10;
      CreatureRenderer.drawShield(ctx, state.player.x, state.player.y, shieldR, state.frame);
    }
  }
}

// ------------------------------------------------------------
// Delayed Problem Timer
// ------------------------------------------------------------
function checkProblemTimer() {
  if (state.nextProblemTime > 0 && performance.now() >= state.nextProblemTime) {
    state.nextProblemTime = 0;
    generateProblem();
  }
}

// ------------------------------------------------------------
// Main Game Loop
// ------------------------------------------------------------
function gameLoop() {
  state.frame++;

  if (state.gameState === GameState.PLAYING) {
    handleInput();
    updatePlayer();
    updateBeams();
    checkBeamCollisions();
    updateEntities();
    checkCollisions();
    maybeSpawnAsteroid();
    updateParticles();
    updateExplosions();
    cleanupEntities();
    checkProblemTimer();
  }

  // Always update starfield and particles for visual continuity
  updateStarfield();
  if (state.gameState !== GameState.PLAYING) {
    updateParticles();
    updateExplosions();
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// Game Start / Reset
// ------------------------------------------------------------
function startGame() {
  resetGameState();
  hideOverlay('start-overlay');
  state.gameState = GameState.PLAYING;

  // Position player at center-bottom
  state.player.x = state.width / 2;
  state.player.y = state.height * 0.8;

  // Initial HUD
  updateHUD();

  // First problem!
  generateProblem();

  ensureAudio();
}

function resetGameState() {
  state.level = 1;
  state.xp = 0;
  state.xpToNext = 10;
  state.questionsInLevel = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.totalCorrect = 0;
  state.totalWrong = 0;
  state.fastAnswers = 0;
  state.creatureStage = 1;
  state.health = 3;
  state.maxHealth = 3;
  state.frame = 0;

  state.player = { x: 0, y: 0, vx: 0, vy: 0, invulnTimer: 0, shieldTimer: 0 };

  state.currentProblem = null;
  state.problemStartTime = 0;
  state.nextProblemTime = 0;

  state.entities = [];
  state.particles = [];
  state.explosions = [];
  state.numberExplosions = [];
  state.beams = [];
  state.shootingDisabled = false;

  state.lastSpawnTime = 0;
  state.spawnInterval = 2000;
  state.lastBeamTime = 0;

  // Reset badges
  for (const key of Object.keys(badgesAwarded)) {
    badgesAwarded[key] = false;
    const el = document.getElementById(key);
    if (el) el.classList.remove('badge-earned');
  }

  // Regenerate stars for fresh look
  generateStars();
}

// Resume game after level-up (possibly showing evolution overlay)
function resumeFromLevelUp() {
  hideOverlay('level-up-overlay');

  // Check if creature should evolve
  if (checkEvolution()) {
    // Evolution overlay is now showing — don't resume yet
    return;
  }

  resumeGame();
}

function resumeFromEvolution() {
  hideOverlay('evolution-overlay');
  resumeGame();
}

function resumeGame() {
  state.gameState = GameState.PLAYING;

  // If no problem is active, generate one
  if (!state.currentProblem && state.nextProblemTime === 0) {
    generateProblem();
  }
}

function retryGame() {
  hideOverlay('gameover-overlay');
  startGame();
}

// ------------------------------------------------------------
// Pause / Resume
// ------------------------------------------------------------
function pauseGame() {
  state.gameState = GameState.PAUSED;
  showOverlay('pause-overlay');
}

function resumeFromPause() {
  hideOverlay('pause-overlay');
  resumeGame();
}

// ------------------------------------------------------------
// Save / Load
// ------------------------------------------------------------
const SAVE_KEY = 'mathMonsterArena_save';

function flashButtonText(buttonId, text, color, duration = 1500) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const originalText = btn.textContent;
  const originalBg = btn.style.background;
  btn.textContent = text;
  btn.style.background = color;
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = originalBg;
  }, duration);
}

function saveGame() {
  const saveData = {
    level: state.level,
    xp: state.xp,
    xpToNext: state.xpToNext,
    questionsInLevel: state.questionsInLevel,
    streak: state.streak,
    bestStreak: state.bestStreak,
    totalCorrect: state.totalCorrect,
    totalWrong: state.totalWrong,
    fastAnswers: state.fastAnswers,
    creatureStage: state.creatureStage,
    health: state.health,
    maxHealth: state.maxHealth,
    badgesAwarded: { ...badgesAwarded },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    flashButtonText('save-btn', 'SAVED!', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
  } catch (_) {
    flashButtonText('save-btn', 'SAVE FAILED!', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      // No save found — flash the load button(s) with feedback
      flashButtonText('load-btn', 'NO SAVE FOUND', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
      flashButtonText('start-load-btn', 'NO SAVE FOUND', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
      return false;
    }
    const data = JSON.parse(raw);

    // Reset transient state first
    state.entities = [];
    state.particles = [];
    state.explosions = [];
    state.numberExplosions = [];
    state.beams = [];
    state.shootingDisabled = false;
    state.currentProblem = null;
    state.problemStartTime = 0;
    state.nextProblemTime = 0;
    state.lastSpawnTime = 0;
    state.lastBeamTime = 0;
    state.frame = 0;

    // Restore progress
    state.level = data.level || 1;
    state.xp = data.xp || 0;
    state.xpToNext = 10;
    state.questionsInLevel = data.questionsInLevel || 0;
    state.streak = data.streak || 0;
    state.bestStreak = data.bestStreak || 0;
    state.totalCorrect = data.totalCorrect || 0;
    state.totalWrong = data.totalWrong || 0;
    state.fastAnswers = data.fastAnswers || 0;
    state.creatureStage = data.creatureStage || getCreatureStageForLevel(state.level);
    state.health = data.health || 3;
    state.maxHealth = data.maxHealth || 3;

    // Restore badges
    if (data.badgesAwarded) {
      for (const key of Object.keys(badgesAwarded)) {
        badgesAwarded[key] = !!data.badgesAwarded[key];
        const el = document.getElementById(key);
        if (el) {
          el.classList.toggle('badge-earned', badgesAwarded[key]);
        }
      }
    }

    // Reposition player
    state.player = { x: state.width / 2, y: state.height * 0.8, vx: 0, vy: 0, invulnTimer: 0, shieldTimer: 0 };

    // Regenerate stars
    generateStars();

    // Hide all overlays and start playing
    hideOverlay('start-overlay');
    hideOverlay('pause-overlay');
    hideOverlay('gameover-overlay');

    state.gameState = GameState.PLAYING;

    updateHUD();
    generateProblem();

    ensureAudio();

    // Show "Game Loaded!" confirmation
    state.particles.push({
      x: state.width / 2,
      y: state.height / 2 - 60,
      vx: 0,
      vy: -1,
      life: 90,
      maxLife: 90,
      color: '#60a5fa',
      size: 20,
      text: 'Game Loaded!',
    });

    return true;
  } catch (_) {
    flashButtonText('load-btn', 'LOAD FAILED!', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
    flashButtonText('start-load-btn', 'LOAD FAILED!', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
    return false;
  }
}

function hasSaveData() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (_) {
    return false;
  }
}

// ------------------------------------------------------------
// Button Event Wiring
// ------------------------------------------------------------
function setupButtons() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', startGame);

  const levelUpBtn = document.getElementById('level-up-btn');
  if (levelUpBtn) levelUpBtn.addEventListener('click', resumeFromLevelUp);

  const evolutionBtn = document.getElementById('evolution-btn');
  if (evolutionBtn) evolutionBtn.addEventListener('click', resumeFromEvolution);

  const gameoverBtn = document.getElementById('gameover-btn');
  if (gameoverBtn) gameoverBtn.addEventListener('click', retryGame);

  // Pause overlay buttons
  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', resumeFromPause);

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveGame);

  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) loadBtn.addEventListener('click', loadGame);

  // Start overlay load button
  const startLoadBtn = document.getElementById('start-load-btn');
  if (startLoadBtn) startLoadBtn.addEventListener('click', loadGame);
}

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------
function init() {
  // Grab canvas
  state.canvas = document.getElementById('game-canvas');
  state.ctx = state.canvas.getContext('2d');

  // Set canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Generate initial starfield
  generateStars();

  // Wire input
  setupInput();

  // Wire buttons
  setupButtons();

  // Initial HUD
  updateHUD();

  // Show start overlay
  showOverlay('start-overlay');

  // Show/hide the load button on start screen
  const startLoadBtn = document.getElementById('start-load-btn');
  if (startLoadBtn) {
    startLoadBtn.style.display = hasSaveData() ? 'inline-block' : 'none';
  }

  // Kick off the game loop (runs continuously, renders even on menu)
  requestAnimationFrame(gameLoop);
}

// Start everything when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
