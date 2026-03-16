// ============================================================
// Math Monster Arena — Main Game Engine (Three.js 3D)
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
  { stage: 1, name: 'Scout Pod',        minLevel: 1,  className: 'creature-stage-1' },
  { stage: 2, name: 'Viper',            minLevel: 3,  className: 'creature-stage-2' },
  { stage: 3, name: 'Phantom',          minLevel: 6,  className: 'creature-stage-3' },
  { stage: 4, name: 'Dreadnought',      minLevel: 10, className: 'creature-stage-4' },
  { stage: 5, name: 'Celestial Titan',  minLevel: 15, className: 'creature-stage-5' },
];

const TITLES = [
  { minLevel: 1,  title: 'Cadet Pilot' },
  { minLevel: 3,  title: 'Star Navigator' },
  { minLevel: 6,  title: 'Ace Pilot' },
  { minLevel: 10, title: 'Fleet Commander' },
  { minLevel: 15, title: 'Galactic Legend' },
];

// ------------------------------------------------------------
// 3D Field Constants
// ------------------------------------------------------------
const FIELD = {
  PLAYER_Z: 0,
  SPAWN_Z: -50,
  SPAWN_Z_VARIANCE: 15,
  DESPAWN_Z: 5,
  HALF_WIDTH: 12,
  HALF_HEIGHT: 6,
};

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

  player: { x: 0, y: 0, vx: 0, vy: 0, invulnTimer: 0, shieldTimer: 0 },

  currentProblem: null,
  problemStartTime: 0,
  nextProblemTime: 0,

  entities: [],    // { type, x, y, z, vx, vy, vz, radius, data, mesh }
  particles: [],   // { x, y, z, vx, vy, vz, life, maxLife, color, size, mesh, isText }
  beams: [],       // { x, y, z, vx, vy, vz, tier, life, mesh }
  shootingDisabled: false,

  lastSpawnTime: 0,
  spawnInterval: 4000,
  lastBeamTime: 0,

  // Three.js
  scene: null,
  camera: null,
  renderer: null,
  playerMesh: null,
  starField: null,
  aimLine: null,
  nebulaTextures: [],
  nebulaSprites: [],
};

const keysDown = new Set();

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
  } catch (_) { /* Audio not available */ }
}

function playTone(freq, duration, type = 'sine', startDelay = 0, gain = 0.15) {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const vol = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.value = gain;
    const t = audioCtx.currentTime + startDelay;
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(vol);
    vol.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (_) { /* Audio might not be available */ }
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

function soundDestroy() {
  playTone(260, 0.08, 'sine', 0, 0.14);
  playTone(520, 0.06, 'sine', 0.04, 0.10);
  playTone(400, 0.10, 'triangle', 0.02, 0.12);
}

function soundDamage() {
  playTone(90, 0.20, 'sawtooth', 0, 0.22);
  playTone(60, 0.25, 'square', 0.08, 0.18);
}

function soundCollect() {
  playTone(880, 0.08, 'sine', 0, 0.12);
  playTone(1100, 0.1, 'sine', 0.06, 0.12);
}

function soundShoot(tier) {
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

function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dz * dz);
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

function getWeaponTier(level) {
  if (level <= 3)  return 1;
  if (level <= 6)  return 2;
  if (level <= 9)  return 3;
  if (level <= 12) return 4;
  return 5;
}

// ------------------------------------------------------------
// Three.js Mesh Helpers
// ------------------------------------------------------------
function removeMesh(mesh) {
  if (!mesh) return;
  state.scene.remove(mesh);
  CreatureRenderer.disposeObject(mesh);
}

function makePlayerMesh(stage) {
  return CreatureRenderer.createShipMesh(stage) || CreatureRenderer.createPlayer(stage);
}

// Shared geometry for particle spheres
let _particleGeo = null;
function getParticleGeo() {
  if (!_particleGeo) _particleGeo = new THREE.SphereGeometry(0.15, 4, 4);
  return _particleGeo;
}

// Cache particle textures by color
const _particleTextures = {};
function getParticleTexture(color) {
  if (_particleTextures[color]) return _particleTextures[color];
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(8, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  _particleTextures[color] = new THREE.CanvasTexture(canvas);
  return _particleTextures[color];
}

// ------------------------------------------------------------
// Starfield
// ------------------------------------------------------------
function generateStars() {
  if (state.starField) {
    state.scene.remove(state.starField);
    CreatureRenderer.disposeObject(state.starField);
  }

  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = -Math.random() * 300 - 10;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });
  state.starField = new THREE.Points(geo, mat);
  state.scene.add(state.starField);
}

function updateStarfield() {
  if (!state.starField) return;
  const positions = state.starField.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    let z = positions.getZ(i);
    z += 0.15;
    if (z > 20) {
      z = -300;
      positions.setX(i, (Math.random() - 0.5) * 200);
      positions.setY(i, (Math.random() - 0.5) * 200);
    }
    positions.setZ(i, z);
  }
  positions.needsUpdate = true;
}

// ------------------------------------------------------------
// Nebula Backgrounds
// ------------------------------------------------------------
const NEBULA_FILES = [
  '1279429613057.jpg', '1279429683266.jpg', '1349845977987.jpg',
  '7069361003_0ac446e61c_k.jpg', '7400311000_4da68b1022_k.jpg',
  'Andromeda_4k.jpg', 'Eastern_Veil_50pct.jpg',
  'heic0515a.jpg', 'heic0601a.jpg', 'heic0612d.jpg',
  'heic0707a.jpg', 'heic0906a.jpg', 'heic1007a.jpg',
  'hs-2003-28-a-full_jpg.jpg', 'neb2.jpg',
];

function loadNebulaTextures() {
  const loader = new THREE.TextureLoader();
  for (const file of NEBULA_FILES) {
    loader.load('nebuale/' + file, (tex) => {
      state.nebulaTextures.push(tex);
      if (state.nebulaSprites.length === 0 && state.nebulaTextures.length >= 1) {
        initNebulaSprites();
      }
    });
  }
}

function initNebulaSprites() {
  const mat = new THREE.SpriteMaterial({
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = -10;
  sprite.scale.set(600, 350, 1);
  sprite.position.set(0, 0, -240);
  state.scene.add(sprite);
  state.nebulaSprites.push(sprite);
  swapNebulae();
}

function swapNebulae() {
  if (state.nebulaTextures.length === 0 || state.nebulaSprites.length === 0) return;
  const tex = state.nebulaTextures[Math.floor(Math.random() * state.nebulaTextures.length)];
  const sprite = state.nebulaSprites[0];
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
}

function updateNebulae() {}

// ------------------------------------------------------------
// Math Problem Generation
// ------------------------------------------------------------
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

function pickOperation(level) {
  const ops = ['+', '−'];
  if (level >= 5) ops.push('×');
  if (level >= 10) ops.push('÷');
  return ops[Math.floor(Math.random() * ops.length)];
}

function generateProblem() {
  const { maxNum1, minNum2, maxNum2 } = getNumberRanges(state.level);
  const operator = pickOperation(state.level);

  let num1, num2, answer;

  if (operator === '+') {
    num1 = randInt(1, maxNum1);
    num2 = randInt(minNum2, Math.min(maxNum2, 100 - num1));
    if (100 - num1 < minNum2) {
      num1 = randInt(1, 100 - minNum2);
      num2 = randInt(minNum2, Math.min(maxNum2, 100 - num1));
    }
    answer = num1 + num2;

  } else if (operator === '−') {
    num1 = randInt(minNum2, maxNum1);
    num2 = randInt(minNum2, Math.min(maxNum2, num1));
    answer = num1 - num2;

  } else if (operator === '×') {
    num1 = randInt(1, 10);
    num2 = randInt(1, 10);
    answer = num1 * num2;

  } else {
    num2 = randInt(1, 10);
    const quotient = randInt(1, 10);
    num1 = quotient * num2;
    answer = quotient;
  }

  state.currentProblem = { num1, num2, operator, answer };
  state.problemStartTime = performance.now();

  const problemEl = document.getElementById('problem-display');
  if (problemEl) {
    problemEl.textContent = `${num1} ${operator} ${num2} = ?`;
  }

  spawnAnswerBubbles(answer);
}

function generateWrongAnswers(correct, count = 3) {
  const spread = Math.max(3, Math.min(10, Math.ceil(correct * 0.5)));
  const wrongs = new Set();
  let attempts = 0;
  while (wrongs.size < count && attempts < 200) {
    attempts++;
    let wrong = correct + randInt(-spread, spread);
    if (wrong < 0) wrong = correct + randInt(1, spread);
    if (wrong === correct) continue;
    if (wrongs.has(wrong)) continue;
    wrongs.add(wrong);
  }
  while (wrongs.size < count) {
    const fallback = correct + wrongs.size + 1;
    if (!wrongs.has(fallback) && fallback !== correct) wrongs.add(fallback);
  }
  return [...wrongs];
}

// ------------------------------------------------------------
// Answer Bubble Spawning (3D)
// ------------------------------------------------------------
function spawnAnswerBubbles(correctAnswer) {
  const wrongs = generateWrongAnswers(correctAnswer);
  const values = [correctAnswer, ...wrongs];

  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const fallSpeed = 0.1;
  const bubbleRadius = 2.0;
  const bubbleDiameter = bubbleRadius * 2;
  const padding = 0.8;
  const minDist = bubbleDiameter + padding;
  const count = 4;
  const totalWidth = FIELD.HALF_WIDTH * 2 - bubbleDiameter;
  const spacing = totalWidth / (count - 1);

  // Place bubbles evenly with small jitter
  const positions = [];
  for (let i = 0; i < count; i++) {
    const baseX = -FIELD.HALF_WIDTH + bubbleRadius + spacing * i;
    positions.push(baseX + randRange(-0.8, 0.8));
  }

  // Push apart overlapping bubbles (several passes)
  positions.sort((a, b) => a - b);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - positions[i - 1] < minDist) {
        const overlap = minDist - (positions[i] - positions[i - 1]);
        positions[i - 1] -= overlap / 2;
        positions[i] += overlap / 2;
        positions[i - 1] = clamp(positions[i - 1], -FIELD.HALF_WIDTH + bubbleRadius, FIELD.HALF_WIDTH - bubbleRadius);
        positions[i] = clamp(positions[i], -FIELD.HALF_WIDTH + bubbleRadius, FIELD.HALF_WIDTH - bubbleRadius);
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const value = values[i];
    const x = positions[i];
    const y = 0;
    const z = FIELD.SPAWN_Z;

    const mesh = CreatureRenderer.createAnswerBubble(value, value === correctAnswer);
    mesh.position.set(x, y, z);
    state.scene.add(mesh);

    state.entities.push({
      type: 'answer',
      x, y, z,
      vx: 0,
      vy: 0,
      vz: fallSpeed,
      radius: bubbleRadius,
      data: { value, isCorrect: value === correctAnswer, state: 'normal' },
      mesh,
    });
  }

}

// ------------------------------------------------------------
// Entity Spawning (3D)
// ------------------------------------------------------------
function maybeSpawnAsteroid() {
  const now = performance.now();
  state.spawnInterval = 3500;
  if (now - state.lastSpawnTime < state.spawnInterval) return;
  state.lastSpawnTime = now;

  if (Math.random() < 0.05) {
    spawnAlien();
    return;
  }
  spawnAsteroid();
}

function spawnAsteroid() {
  const roll = Math.random();
  let size, radius;
  if (roll < 0.6)      { size = 'small';  radius = 1.0; }
  else if (roll < 0.9) { size = 'medium'; radius = 1.8; }
  else                  { size = 'large';  radius = 1.25; }

  const baseVz = 0.072 + Math.random() * 0.024;
  const sizeBoost = size === 'small' ? 0.024 : size === 'medium' ? 0.012 : 0;

  const x = randRange(-FIELD.HALF_WIDTH, FIELD.HALF_WIDTH);
  const y = randRange(-FIELD.HALF_HEIGHT * 0.8, FIELD.HALF_HEIGHT * 0.8);
  const z = FIELD.SPAWN_Z - Math.random() * FIELD.SPAWN_Z_VARIANCE;

  const mesh = CreatureRenderer.createAsteroid(size);
  mesh.position.set(x, y, z);
  state.scene.add(mesh);

  state.entities.push({
    type: 'asteroid',
    x, y, z,
    vx: randRange(-0.018, 0.018),
    vy: randRange(-0.012, 0.012),
    vz: Math.min(0.24, baseVz + sizeBoost),
    radius,
    data: {
      size,
      hp: size === 'small' ? 1 : size === 'medium' ? 2 : 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: randRange(-0.04, 0.04),
    },
    mesh,
  });
}

function spawnAlien() {
  const x = randRange(-FIELD.HALF_WIDTH * 0.8, FIELD.HALF_WIDTH * 0.8);
  const y = randRange(-FIELD.HALF_HEIGHT * 0.5, FIELD.HALF_HEIGHT * 0.5);
  const z = FIELD.SPAWN_Z;

  const mesh = CreatureRenderer.createAlien();
  mesh.position.set(x, y, z);
  state.scene.add(mesh);

  state.entities.push({
    type: 'alien',
    x, y, z,
    vx: 0, vy: 0, vz: 0.108,
    radius: 1.2,
    data: { type: 'basic', baseX: x },
    mesh,
  });
}

// ------------------------------------------------------------
// Beam Spawning
// ------------------------------------------------------------
function spawnBeam() {
  const now = performance.now();
  const tier = getWeaponTier(state.level);
  const cooldown = tier >= 5 ? 180 : tier >= 3 ? 200 : 250;
  if (now - state.lastBeamTime < cooldown) return;
  state.lastBeamTime = now;

  const speed = 0.9 + tier * 0.15;
  const p = state.player;
  const pr = CreatureRenderer.getPlayerRadius(state.creatureStage);
  const bz = FIELD.PLAYER_Z - pr - 0.5;

  if (tier >= 5) {
    _fireOneBeam(p.x - 0.8, p.y, bz, -0.012, 0, -speed, tier);
    _fireOneBeam(p.x,       p.y, bz,  0,      0, -speed, tier);
    _fireOneBeam(p.x + 0.8, p.y, bz,  0.012,  0, -speed, tier);
  } else if (tier >= 4) {
    _fireOneBeam(p.x - 0.5, p.y, bz, 0, 0, -speed, tier);
    _fireOneBeam(p.x + 0.5, p.y, bz, 0, 0, -speed, tier);
  } else {
    _fireOneBeam(p.x, p.y, bz, 0, 0, -speed, tier);
  }

  soundShoot(tier);
}

function _fireOneBeam(x, y, z, vx, vy, vz, tier) {
  const mesh = CreatureRenderer.createBeam(tier);
  mesh.position.set(x, y, z);
  state.scene.add(mesh);
  state.beams.push({ x, y, z, vx, vy, vz, tier, life: 200, mesh });
}

// ------------------------------------------------------------
// Input Handling
// ------------------------------------------------------------
function setupInput() {
  window.addEventListener('keydown', (e) => {
    keysDown.add(e.key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    // Debug: press 1-5 to preview ship models and matching weapon tiers
    if (state.gameState === GameState.PLAYING && '12345'.includes(e.key)) {
      const stage = parseInt(e.key);
      state.creatureStage = stage;
      const tierLevels = { 1: 1, 2: 4, 3: 7, 4: 10, 5: 13 };
      state.level = tierLevels[stage];
      if (state.playerMesh) removeMesh(state.playerMesh);
      state.playerMesh = makePlayerMesh(stage);
      state.playerMesh.position.set(state.player.x, state.player.y, FIELD.PLAYER_Z);
      state.scene.add(state.playerMesh);
      updateHUD();
    }
    if (e.key === 'Escape') {
      if (state.gameState === GameState.PLAYING) {
        pauseGame();
      } else if (state.gameState === GameState.PAUSED) {
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
  const accel = 0.05;

  if (keysDown.has('ArrowLeft') || keysDown.has('a') || keysDown.has('A')) p.vx -= accel;
  if (keysDown.has('ArrowRight') || keysDown.has('d') || keysDown.has('D')) p.vx += accel;
  if (keysDown.has('ArrowUp') || keysDown.has('w') || keysDown.has('W')) p.vy += accel;
  if (keysDown.has('ArrowDown') || keysDown.has('s') || keysDown.has('S')) p.vy -= accel;
  if (keysDown.has(' ')) spawnBeam();
}

// ------------------------------------------------------------
// Player Update
// ------------------------------------------------------------
function updatePlayer() {
  const p = state.player;

  p.vx *= 0.88;
  p.vy *= 0.88;

  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > 0.6) {
    p.vx *= 0.6 / speed;
    p.vy *= 0.6 / speed;
  }

  p.x += p.vx;
  p.y += p.vy;

  const r = CreatureRenderer.getPlayerRadius(state.creatureStage);
  p.x = clamp(p.x, -FIELD.HALF_WIDTH + r, FIELD.HALF_WIDTH - r);
  p.y = clamp(p.y, -FIELD.HALF_HEIGHT + r, FIELD.HALF_HEIGHT - r);

  if (p.invulnTimer > 0) p.invulnTimer--;
  if (p.shieldTimer > 0) p.shieldTimer--;
}

// ------------------------------------------------------------
// Entity Updates
// ------------------------------------------------------------
function updateEntities() {
  for (const e of state.entities) {
    if (e.type === 'alien') {
      e.vx = Math.sin(state.frame * 0.03) * 0.08;
    }

    if (e.type === 'asteroid') {
      e.data.rotation += e.data.rotSpeed;
    }

    e.x += e.vx;
    e.y += e.vy;
    e.z += e.vz;

    if (e.type === 'answer') {
      const limit = FIELD.HALF_WIDTH - e.radius;
      if (e.x < -limit) { e.x = -limit; e.vx = Math.abs(e.vx); }
      else if (e.x > limit) { e.x = limit; e.vx = -Math.abs(e.vx); }
    }

    if (e.mesh) {
      e.mesh.position.set(e.x, e.y, e.z);
      if (e.type === 'asteroid') {
        e.mesh.rotation.x = e.data.rotation;
        e.mesh.rotation.y = e.data.rotation * 0.7;
      }
      if (e.type === 'alien') {
        e.mesh.rotation.y = Math.sin(state.frame * 0.04) * 0.3;
      }
      if (e.type === 'answer') {
        const pulse = 1 + Math.sin(state.frame * 0.05) * 0.04;
        e.mesh.scale.set(pulse, pulse, pulse);
      }
    }
  }

}

function cleanupEntities() {
  state.entities = state.entities.filter(e => {
    if (e.z > FIELD.DESPAWN_Z || e.z < FIELD.SPAWN_Z - 60) {
      removeMesh(e.mesh);
      return false;
    }
    if (Math.abs(e.x) > FIELD.HALF_WIDTH + 15) {
      removeMesh(e.mesh);
      return false;
    }
    return true;
  });

  if (state.gameState === GameState.PLAYING && state.nextProblemTime === 0) {
    const hasAnswers = state.entities.some(e => e.type === 'answer');
    if (!hasAnswers && state.currentProblem !== null) {
      state.nextProblemTime = performance.now() + 300;
    }
  }
}

// ------------------------------------------------------------
// Beam Update & Collision
// ------------------------------------------------------------
function updateBeams() {
  for (let i = state.beams.length - 1; i >= 0; i--) {
    const b = state.beams[i];
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    b.life--;
    if (b.mesh) {
      b.mesh.position.set(b.x, b.y, b.z);
      const spin = 0.08 + b.tier * 0.05;
      b.mesh.rotation.z += spin;
      if (b.tier >= 4) {
        b.mesh.rotation.x += spin * 0.3;
      }
    }
    if (b.life <= 0 || b.z < FIELD.SPAWN_Z - 30 || b.z > FIELD.DESPAWN_Z + 10) {
      removeMesh(b.mesh);
      state.beams.splice(i, 1);
    }
  }
}

function checkBeamCollisions() {
  for (let bi = state.beams.length - 1; bi >= 0; bi--) {
    const beam = state.beams[bi];
    const beamRadius = 0.5 + beam.tier * 0.15;
    let consumed = false;

    for (let ei = state.entities.length - 1; ei >= 0; ei--) {
      const entity = state.entities[ei];
      if (entity.type !== 'asteroid' && entity.type !== 'alien') continue;
      if (distanceXZ(beam, entity) < beamRadius + entity.radius * 1.5) {
        handleBeamHazardHit(entity, beam);
        removeMesh(beam.mesh);
        state.beams.splice(bi, 1);
        consumed = true;
        break;
      }
    }
    if (consumed) continue;

    for (let ei = state.entities.length - 1; ei >= 0; ei--) {
      const entity = state.entities[ei];
      if (entity.type !== 'answer') continue;
      if (distanceXZ(beam, entity) < beamRadius + entity.radius * 1.5) {
        handleBeamAnswerHit(entity, beam);
        removeMesh(beam.mesh);
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
    entity.data.hp--;
    if (entity.data.hp <= 0) {
      soundDestroy();
      spawnParticleBurst(entity.x, entity.y, entity.z, 15 + tier * 3, '#fb923c');
      const idx = state.entities.indexOf(entity);
      if (idx !== -1) {
        removeMesh(entity.mesh);
        state.entities.splice(idx, 1);
      }
      if (state.player.invulnTimer < 20) state.player.invulnTimer = 20;
    } else {
      soundDestroy();
      spawnParticleBurst(entity.x, entity.y, entity.z, 6, '#ffaa44');
    }
  } else if (entity.type === 'alien') {
    soundDestroy();
    spawnParticleBurst(entity.x, entity.y, entity.z, 18 + tier * 3, '#a78bfa');
    const idx = state.entities.indexOf(entity);
    if (idx !== -1) {
      removeMesh(entity.mesh);
      state.entities.splice(idx, 1);
    }
    if (state.player.invulnTimer < 20) state.player.invulnTimer = 20;
  }
}

function handleBeamAnswerHit(entity, beam) {
  const tier = beam.tier;

  // Text burst showing the number
  spawnTextParticle(entity.x, entity.y + 1, entity.z,
    String(entity.data.value),
    entity.data.isCorrect ? '#4ade80' : '#f87171');

  if (entity.data.isCorrect) {
    entity.data.state = 'correct';
    soundCorrect();

    const elapsed = (performance.now() - state.problemStartTime) / 1000;
    let xpAmount = 10;
    if (elapsed < 5) xpAmount += Math.round((1 - elapsed / 5) * 10);
    if (elapsed < 3) state.fastAnswers++;

    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    if (state.streak >= 5) xpAmount *= 3;
    else if (state.streak >= 3) xpAmount *= 2;

    state.totalCorrect++;

    spawnParticleBurst(entity.x, entity.y, entity.z, 15 + tier * 5, '#4ade80');
    spawnTextParticle(entity.x, entity.y + 3, entity.z, `+${xpAmount} XP`, '#fbbf24');

    awardXP(xpAmount);
  } else {
    entity.data.state = 'wrong';
    soundWrong();
    state.streak = 0;
    state.totalWrong++;

    spawnParticleBurst(entity.x, entity.y, entity.z, 12 + tier * 3, '#f87171');
    takeDamage();
  }

  removeAllAnswers();
  checkLevelProgress();

  state.nextProblemTime = performance.now() + 4000;
  state.currentProblem = null;
  updateHUD();
  checkBadges();
}

// ------------------------------------------------------------
// Collision Detection (Player vs Entities)
// ------------------------------------------------------------
function checkCollisions() {
  const p = state.player;
  const pRadius = CreatureRenderer.getPlayerRadius(state.creatureStage);
  const playerPos = { x: p.x, y: p.y, z: FIELD.PLAYER_Z };

  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    const hitDist = e.type === 'answer'
      ? pRadius + e.radius
      : pRadius * 0.5 + e.radius * 0.6;
    if (distance3D(playerPos, e) < hitDist) {
      handleCollision(e);
      break;
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
// Answer Collection (Direct Contact)
// ------------------------------------------------------------
function handleAnswerCollision(entity) {
  if (state.player.invulnTimer > 0) return;

  spawnTextParticle(entity.x, entity.y + 1, entity.z,
    String(entity.data.value),
    entity.data.isCorrect ? '#4ade80' : '#f87171');

  if (entity.data.isCorrect) {
    entity.data.state = 'correct';
    soundCorrect();

    const elapsed = (performance.now() - state.problemStartTime) / 1000;
    let xpAmount = 10;
    if (elapsed < 5) xpAmount += Math.round((1 - elapsed / 5) * 10);
    if (elapsed < 3) state.fastAnswers++;

    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    if (state.streak >= 5) xpAmount *= 3;
    else if (state.streak >= 3) xpAmount *= 2;

    state.totalCorrect++;

    spawnParticleBurst(entity.x, entity.y, entity.z, 15, '#4ade80');
    spawnTextParticle(state.player.x, state.player.y + 2, FIELD.PLAYER_Z, `+${xpAmount} XP`, '#fbbf24');

    awardXP(xpAmount);
  } else {
    entity.data.state = 'wrong';
    soundWrong();
    state.streak = 0;
    state.totalWrong++;

    spawnParticleBurst(entity.x, entity.y, entity.z, 12, '#f87171');
    takeDamage();
  }

  removeAllAnswers();
  checkLevelProgress();

  state.nextProblemTime = performance.now() + 4000;
  state.currentProblem = null;
  updateHUD();
  checkBadges();
}

// ------------------------------------------------------------
// Hazard Collision (Player vs Asteroid/Alien)
// ------------------------------------------------------------
function handleHazardCollision(entity) {
  const p = state.player;
  if (p.invulnTimer > 0 || p.shieldTimer > 0) return;

  soundDamage();

  const midX = (p.x + entity.x) / 2;
  const midY = (p.y + entity.y) / 2;
  const midZ = (FIELD.PLAYER_Z + entity.z) / 2;
  const burstColor = entity.type === 'alien' ? '#a78bfa' : '#fb923c';
  spawnParticleBurst(midX, midY, midZ, 20, burstColor);

  const idx = state.entities.indexOf(entity);
  if (idx !== -1) {
    removeMesh(entity.mesh);
    state.entities.splice(idx, 1);
  }

  takeDamage();
  p.invulnTimer = 90;
  updateHUD();
}

// ------------------------------------------------------------
// Damage & Game Over
// ------------------------------------------------------------
function takeDamage() {
  state.health--;
  state.player.invulnTimer = 90;

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
  updateHUD();
}

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
  state.health = state.maxHealth;

  swapNebulae();
  spawnParticleBurst(state.player.x, state.player.y, FIELD.PLAYER_Z, 30, '#fbbf24');

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

    if (state.playerMesh) removeMesh(state.playerMesh);
    state.playerMesh = makePlayerMesh(newStage);
    state.playerMesh.position.set(state.player.x, state.player.y, FIELD.PLAYER_Z);
    state.scene.add(state.playerMesh);

    return true;
  }
  return false;
}

function showEvolutionOverlay(oldStage, newStage) {
  state.gameState = GameState.PAUSED;

  const oldEl = document.getElementById('evolution-old-stage');
  if (oldEl) oldEl.textContent = CreatureRenderer.getCreatureName(oldStage);

  const newEl = document.getElementById('evolution-new-stage');
  if (newEl) newEl.textContent = CreatureRenderer.getCreatureName(newStage);

  const nameEl = document.getElementById('evolution-name');
  if (nameEl) nameEl.textContent = CreatureRenderer.getCreatureName(newStage);

  showOverlay('evolution-overlay');
}

// ------------------------------------------------------------
// Particles (3D)
// ------------------------------------------------------------
function spawnParticleBurst(x, y, z, count, color) {
  const texture = getParticleTexture(color);
  for (let i = 0; i < count; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI;
    const spd = 0.08 + Math.random() * 0.25;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.4, 0.4, 1);
    state.scene.add(sprite);

    state.particles.push({
      x, y, z,
      vx: Math.cos(angle1) * Math.cos(angle2) * spd,
      vy: Math.sin(angle2) * spd + 0.04,
      vz: Math.sin(angle1) * Math.cos(angle2) * spd,
      life: 20 + Math.floor(Math.random() * 25),
      maxLife: 45,
      color,
      size: 0.4,
      mesh: sprite,
      isText: false,
    });
  }
}

function spawnTextParticle(x, y, z, text, color) {
  const sprite = CreatureRenderer.createTextSprite(text, color, 3);
  sprite.position.set(x, y, z);
  state.scene.add(sprite);
  state.particles.push({
    x, y, z,
    vx: 0, vy: 0.04, vz: 0.02,
    life: 60, maxLife: 60,
    color, size: 3,
    mesh: sprite,
    isText: true,
  });
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.life--;
    if (!p.isText) p.vy -= 0.001;

    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.mesh.material) {
        p.mesh.material.opacity = alpha;
      }
      if (p.isText) {
        const s = p.size * (0.5 + alpha * 0.5);
        p.mesh.scale.set(s, s, 1);
      } else {
        const s = p.size * alpha;
        p.mesh.scale.set(s, s, 1);
      }
    }

    if (p.life <= 0) {
      removeMesh(p.mesh);
      state.particles.splice(i, 1);
    }
  }
}

// ------------------------------------------------------------
// Answer / Overlay / HUD Helpers
// ------------------------------------------------------------
function removeAllAnswers() {
  state.entities = state.entities.filter(e => {
    if (e.type === 'answer') {
      removeMesh(e.mesh);
      return false;
    }
    return true;
  });
}

function showOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function updateHUD() {
  const titleEl = document.getElementById('player-title');
  if (titleEl) titleEl.textContent = getCurrentTitle();

  const levelEl = document.getElementById('player-level');
  if (levelEl) levelEl.textContent = `Lv. ${state.level}`;

  const pct = Math.min(100, (state.questionsInLevel / 10) * 100);
  const xpFill = document.getElementById('xp-bar-fill');
  if (xpFill) xpFill.style.width = `${pct}%`;

  const xpText = document.getElementById('xp-text');
  if (xpText) xpText.textContent = `${state.questionsInLevel} / 10 Questions`;

  const hearts = document.querySelectorAll('#health-display .heart');
  hearts.forEach((h, i) => {
    h.classList.toggle('lost', i >= state.health);
  });

  const streakCount = document.getElementById('streak-count');
  if (streakCount) streakCount.textContent = state.streak;

  const streakDisplay = document.getElementById('streak-display');
  if (streakDisplay) streakDisplay.classList.toggle('streak-fire', state.streak >= 3);

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
        soundCollect();
      }
    }
  }
}

// ------------------------------------------------------------
// Resize
// ------------------------------------------------------------
function resizeRenderer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function render() {
  if (state.playerMesh) {
    state.playerMesh.position.set(state.player.x, state.player.y, FIELD.PLAYER_Z);
    const dirX = Math.abs(state.player.vx) > 0.02 ? Math.sign(state.player.vx) : 0;
    state.playerMesh.rotation.z = -dirX * 0.2;
    state.playerMesh.position.y += Math.sin(state.frame * 0.05) * 0.12;

    const invuln = state.player.invulnTimer > 0;
    state.playerMesh.visible =
      (state.gameState === GameState.PLAYING || state.gameState === GameState.PAUSED) &&
      (!invuln || Math.floor(state.frame / 4) % 2 === 0);
  }

  // Aim guide follows player
  if (state.aimLine) {
    const playing = state.gameState === GameState.PLAYING;
    state.aimLine.visible = playing;
    if (state.aimLine.visible) {
      state.aimLine.position.set(state.player.x, state.player.y, FIELD.PLAYER_Z);
    }
  }

  state.renderer.render(state.scene, state.camera);
}

// ------------------------------------------------------------
// Lock-On Targeting Highlight
// ------------------------------------------------------------
const _lockOnColor = new THREE.Color(0xff2222);
const _zeroColor = new THREE.Color(0x000000);

function updateLockOn() {
  const p = state.player;
  const tier = getWeaponTier(state.level);
  const beamRadius = 0.5 + tier * 0.15;

  let closest = null;
  let closestZ = -Infinity;

  for (const e of state.entities) {
    const dx = Math.abs(e.x - p.x);
    if (e.z < FIELD.PLAYER_Z && dx < beamRadius + e.radius * 1.5) {
      if (e.z > closestZ) {
        closestZ = e.z;
        closest = e;
      }
    }
  }

  for (const e of state.entities) {
    const shouldLock = e === closest;
    const wasLocked = !!e._lockedOn;
    e._lockedOn = shouldLock;

    if (shouldLock && !wasLocked) {
      _setMeshEmissive(e.mesh, _lockOnColor, 0.4);
    } else if (!shouldLock && wasLocked) {
      _setMeshEmissive(e.mesh, _zeroColor, 0);
    }
  }
}

function _setMeshEmissive(obj, color, intensity) {
  if (!obj) return;
  const apply = (child) => {
    if (child.material && child.material.emissive) {
      child.material.emissive.copy(color);
      child.material.emissiveIntensity = intensity;
    }
  };
  if (obj.traverse) obj.traverse(apply);
  else apply(obj);
}

function clearAllLockOn() {
  for (const e of state.entities) {
    if (e._lockedOn) {
      _setMeshEmissive(e.mesh, _zeroColor, 0);
      e._lockedOn = false;
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
  try {
    state.frame++;

    if (state.gameState === GameState.PLAYING) {
      handleInput();
      updatePlayer();
      updateBeams();
      checkBeamCollisions();
      updateEntities();
      updateLockOn();
      checkCollisions();
      maybeSpawnAsteroid();
      updateParticles();
      cleanupEntities();
      checkProblemTimer();
    }

    updateStarfield();
    updateNebulae();
    if (state.gameState !== GameState.PLAYING) {
      updateParticles();
    }

    render();
  } catch (err) {
    // Temporary: show crash info on screen for debugging
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;font:14px monospace;z-index:99999;white-space:pre-wrap;max-height:50vh;overflow:auto';
    d.textContent = 'GAME CRASH:\n' + err.message + '\n\nStack:\n' + err.stack;
    document.body.appendChild(d);
    return; // Stop the loop
  }
  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// Game Start / Reset
// ------------------------------------------------------------
function startGame() {
  resetGameState();
  hideOverlay('start-overlay');
  state.gameState = GameState.PLAYING;

  state.playerMesh = makePlayerMesh(state.creatureStage);
  state.playerMesh.position.set(0, 0, FIELD.PLAYER_Z);
  state.scene.add(state.playerMesh);

  state.player.x = 0;
  state.player.y = 0;

  updateHUD();
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

  for (const e of state.entities) removeMesh(e.mesh);
  for (const b of state.beams) removeMesh(b.mesh);
  for (const p of state.particles) removeMesh(p.mesh);
  if (state.playerMesh) {
    removeMesh(state.playerMesh);
    state.playerMesh = null;
  }

  state.entities = [];
  state.particles = [];
  state.beams = [];
  state.shootingDisabled = false;
  state.lastSpawnTime = 0;
  state.spawnInterval = 2000;
  state.lastBeamTime = 0;

  for (const key of Object.keys(badgesAwarded)) {
    badgesAwarded[key] = false;
    const el = document.getElementById(key);
    if (el) el.classList.remove('badge-earned');
  }

  generateStars();
}

function resumeFromLevelUp() {
  hideOverlay('level-up-overlay');
  if (checkEvolution()) return;
  resumeGame();
}

function resumeFromEvolution() {
  hideOverlay('evolution-overlay');
  resumeGame();
}

function resumeGame() {
  state.gameState = GameState.PLAYING;
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
      flashButtonText('load-btn', 'NO SAVE FOUND', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
      flashButtonText('start-load-btn', 'NO SAVE FOUND', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
      return false;
    }
    const data = JSON.parse(raw);

    // Clean up existing meshes
    for (const e of state.entities) removeMesh(e.mesh);
    for (const b of state.beams) removeMesh(b.mesh);
    for (const p of state.particles) removeMesh(p.mesh);
    if (state.playerMesh) removeMesh(state.playerMesh);

    state.entities = [];
    state.particles = [];
    state.beams = [];
    state.shootingDisabled = false;
    state.currentProblem = null;
    state.problemStartTime = 0;
    state.nextProblemTime = 0;
    state.lastSpawnTime = 0;
    state.lastBeamTime = 0;
    state.frame = 0;

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

    if (data.badgesAwarded) {
      for (const key of Object.keys(badgesAwarded)) {
        badgesAwarded[key] = !!data.badgesAwarded[key];
        const el = document.getElementById(key);
        if (el) el.classList.toggle('badge-earned', badgesAwarded[key]);
      }
    }

    state.player = { x: 0, y: 0, vx: 0, vy: 0, invulnTimer: 0, shieldTimer: 0 };
    state.playerMesh = makePlayerMesh(state.creatureStage);
    state.playerMesh.position.set(0, 0, FIELD.PLAYER_Z);
    state.scene.add(state.playerMesh);

    generateStars();

    hideOverlay('start-overlay');
    hideOverlay('pause-overlay');
    hideOverlay('gameover-overlay');

    state.gameState = GameState.PLAYING;
    updateHUD();
    generateProblem();
    ensureAudio();

    spawnTextParticle(0, 3, -10, 'Game Loaded!', '#60a5fa');
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

  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', resumeFromPause);

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveGame);

  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) loadBtn.addEventListener('click', loadGame);

  const startLoadBtn = document.getElementById('start-load-btn');
  if (startLoadBtn) startLoadBtn.addEventListener('click', loadGame);
}

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------
function init() {
  // Three.js scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x050510);
  state.scene.fog = new THREE.FogExp2(0x050510, 0.006);

  // Camera
  state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  state.camera.position.set(0, 8, 15);
  state.camera.lookAt(0, 0, -25);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('game-wrapper').appendChild(state.renderer.domElement);

  // Lighting
  state.scene.add(new THREE.AmbientLight(0x404070, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(5, 15, 10);
  state.scene.add(dir);
  const backLight = new THREE.DirectionalLight(0x4466ff, 0.4);
  backLight.position.set(-5, 5, -20);
  state.scene.add(backLight);

  // Laser aim guide — two thin converging rails from the player forward
  {
    const aimGroup = new THREE.Group();
    const aimLen = 45;
    const nearSpread = 0.35;
    const farSpread = 0.05;
    const aimMat = new THREE.LineBasicMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.18, depthWrite: false,
    });

    // Left and right converging guide rails
    for (const side of [-1, 1]) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([
        side * nearSpread, 0, 0,
        side * farSpread, 0, -aimLen,
      ], 3));
      aimGroup.add(new THREE.Line(geo, aimMat));
    }

    // Depth tick marks at regular intervals
    const tickMat = new THREE.LineBasicMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.12, depthWrite: false,
    });
    for (let d = 8; d <= aimLen; d += 8) {
      const t = d / aimLen;
      const w = nearSpread + (farSpread - nearSpread) * t;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([
        -w, 0, -d, w, 0, -d,
      ], 3));
      aimGroup.add(new THREE.Line(geo, tickMat));
    }

    aimGroup.visible = false;
    state.scene.add(aimGroup);
    state.aimLine = aimGroup;
  }

  // Load all spaceship models (async, falls back to procedural creatures per stage)
  CreatureRenderer.loadShipModels();

  // Load nebula background textures
  loadNebulaTextures();

  window.addEventListener('resize', resizeRenderer);
  generateStars();
  setupInput();
  setupButtons();
  updateHUD();
  showOverlay('start-overlay');

  const startLoadBtn = document.getElementById('start-load-btn');
  if (startLoadBtn) {
    startLoadBtn.style.display = hasSaveData() ? 'inline-block' : 'none';
  }

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
