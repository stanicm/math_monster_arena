// ============================================================
// creatures.js — Math Monster Arena: Three.js 3D Mesh Factories
// All visuals built from Three.js primitives. No textures or models.
// ============================================================

'use strict';

const CreatureRenderer = (() => {
  const STAGE_COLORS = {
    1: { body: 0xFFF8E7, accent: 0x88CC88 },
    2: { body: 0xFFD644, accent: 0xFFA822 },
    3: { body: 0xFF6622, accent: 0xDD2200 },
    4: { body: 0x6622CC, accent: 0x00EEFF },
    5: { body: 0xFFD700, accent: 0x9944FF },
  };

  const BEAM_COLORS = [0x88CCFF, 0x44FF88, 0xFFAA22, 0xFF4488, 0xDD44FF];

  const CREATURE_NAMES = {
    1: 'Scout Pod',
    2: 'Viper',
    3: 'Phantom',
    4: 'Dreadnought',
    5: 'Celestial Titan',
  };

  const PLAYER_RADII = { 1: 1.5, 2: 1.8, 3: 2.0, 4: 2.3, 5: 2.8 };

  const _eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const _darkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

  // ---- Player Creature Factories ----

  function createPlayer(stage) {
    const group = new THREE.Group();
    const c = STAGE_COLORS[stage] || STAGE_COLORS[1];
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.4 });
    const accentMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.3 });

    switch (stage) {
      case 2: _buildSparky(group, bodyMat, accentMat); break;
      case 3: _buildBlazer(group, bodyMat, accentMat); break;
      case 4: _buildStormclaw(group, bodyMat, accentMat); break;
      case 5: _buildLegendragon(group, bodyMat, accentMat); break;
      default: _buildHatchling(group, bodyMat, accentMat);
    }
    return group;
  }

  function _addEyes(group, positions) {
    for (const p of positions) {
      const eye = new THREE.Mesh(_eyeGeo, _darkMat);
      eye.position.set(p[0], p[1], p[2]);
      group.add(eye);
    }
  }

  function _buildHatchling(g, bodyMat, accentMat) {
    const r = PLAYER_RADII[1];

    // Main egg body
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), bodyMat);
    body.scale.set(1, 1.25, 1.1);
    g.add(body);

    // Shell crack lines on back (visible from behind)
    const crackMat = new THREE.MeshStandardMaterial({ color: 0xD8C8A8, roughness: 0.6 });
    const crackGeo = new THREE.BoxGeometry(0.06, 0.7, 0.06);
    [[0, 0.6, r * 0.85, 0, 0, 0.2],
     [-0.3, 0.3, r * 0.9, 0, 0, -0.3],
     [0.25, 0.5, r * 0.8, 0, 0, 0.15]].forEach(d => {
      const crack = new THREE.Mesh(crackGeo, crackMat);
      crack.position.set(d[0], d[1], d[2]);
      crack.rotation.set(d[3], d[4], d[5]);
      g.add(crack);
    });

    // Dorsal ridge bumps along the top-back (visible from camera)
    const bumpGeo = new THREE.SphereGeometry(0.18, 6, 6);
    [[0, r * 1.15, 0.3],
     [0, r * 1.0, 0.7],
     [0, r * 0.8, 1.0]].forEach(p => {
      const bump = new THREE.Mesh(bumpGeo, accentMat);
      bump.position.set(p[0], p[1], p[2]);
      g.add(bump);
    });

    // Colored spots (distributed around so some face back)
    const spotGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xFF99AA, roughness: 0.4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x88AAEE, roughness: 0.4 });
    [[-0.6, 0.8, 0.6, accentMat],
     [0.5, 1.0, -0.3, pinkMat],
     [0.1, 0.4, -1.0, blueMat],
     [-0.4, -0.2, r * 0.9, pinkMat],
     [0.5, 0.2, r * 0.85, accentMat],
     [0, -0.5, r * 0.7, blueMat]].forEach(d => {
      const s = new THREE.Mesh(spotGeo, d[3]);
      s.position.set(d[0], d[1], d[2]);
      g.add(s);
    });

    // Small stubby tail on back
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xE8D8B8, roughness: 0.5 });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), tailMat);
    tail.position.set(0, -0.3, r * 1.05);
    tail.scale.set(1, 0.8, 1.3);
    g.add(tail);

    // Small nubby wings (visible from behind and sides)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xDDEECC, roughness: 0.4, metalness: 0.05 });
    const wingGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const lWing = new THREE.Mesh(wingGeo, wingMat);
    lWing.position.set(-r * 0.85, 0.2, r * 0.3);
    lWing.scale.set(1.4, 0.4, 1.1);
    lWing.rotation.z = -0.3;
    g.add(lWing);
    const rWing = new THREE.Mesh(wingGeo, wingMat);
    rWing.position.set(r * 0.85, 0.2, r * 0.3);
    rWing.scale.set(1.4, 0.4, 1.1);
    rWing.rotation.z = 0.3;
    g.add(rWing);

    // Wing tips (slight color accent)
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xBBDDAA, roughness: 0.3 });
    const tipGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const lTip = new THREE.Mesh(tipGeo, tipMat);
    lTip.position.set(-r * 1.3, 0.3, r * 0.35);
    g.add(lTip);
    const rTip = new THREE.Mesh(tipGeo, tipMat);
    rTip.position.set(r * 1.3, 0.3, r * 0.35);
    g.add(rTip);

    // Eyes (front-facing)
    _addEyes(g, [[-0.4, 0.4, -(r - 0.1)], [0.4, 0.4, -(r - 0.1)]]);
  }

  function _buildSparky(g, bodyMat, accentMat) {
    const r = PLAYER_RADII[2];
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), bodyMat);
    g.add(body);

    // Ear cones
    const earGeo = new THREE.ConeGeometry(0.4, 1.4, 8);
    const lEar = new THREE.Mesh(earGeo, accentMat);
    lEar.position.set(-0.8, r + 0.4, 0);
    lEar.rotation.z = 0.3;
    g.add(lEar);
    const rEar = new THREE.Mesh(earGeo, accentMat);
    rEar.position.set(0.8, r + 0.4, 0);
    rEar.rotation.z = -0.3;
    g.add(rEar);

    // Bushy tail (group of overlapping spheres, visible from behind)
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xFFA822, roughness: 0.4, emissive: 0xFFA822, emissiveIntensity: 0.1 });
    [[0, 0, r + 0.2, 0.5],
     [0, 0.3, r + 0.5, 0.4],
     [0, -0.2, r + 0.45, 0.35],
     [0.2, 0.1, r + 0.6, 0.3],
     [-0.2, 0.15, r + 0.55, 0.28]].forEach(d => {
      const t = new THREE.Mesh(new THREE.SphereGeometry(d[3], 8, 8), tailMat);
      t.position.set(d[0], d[1], d[2]);
      g.add(t);
    });

    // Lightning bolt stripe on back (thin box)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xFFFF44, emissive: 0xFFFF00, emissiveIntensity: 0.4 });
    const seg = new THREE.BoxGeometry(0.12, 0.5, 0.06);
    [[-0.15, 0.6, r * 0.95, 0.3],
     [0.15, 0.15, r * 0.98, -0.3],
     [-0.1, -0.3, r * 0.95, 0.2]].forEach(d => {
      const s = new THREE.Mesh(seg, boltMat);
      s.position.set(d[0], d[1], d[2]);
      s.rotation.z = d[3];
      g.add(s);
    });

    // Cheek spots visible from behind
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xFF8844, roughness: 0.3 });
    const cheekGeo = new THREE.SphereGeometry(0.25, 8, 8);
    [[-r * 0.7, -0.1, r * 0.5], [r * 0.7, -0.1, r * 0.5]].forEach(p => {
      const ch = new THREE.Mesh(cheekGeo, cheekMat);
      ch.position.set(p[0], p[1], p[2]);
      g.add(ch);
    });

    _addEyes(g, [[-0.5, 0.3, -(r - 0.3)], [0.5, 0.3, -(r - 0.3)]]);
  }

  function _buildBlazer(g, bodyMat, accentMat) {
    const r = PLAYER_RADII[3];
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), bodyMat);
    body.scale.set(1, 0.9, 1.4);
    g.add(body);

    // Wings with swept-back shape (visible from behind)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xB8C4D0, roughness: 0.5, metalness: 0.3 });
    const wingGeo = new THREE.BoxGeometry(2.5, 0.1, 1.4);
    const lWing = new THREE.Mesh(wingGeo, wingMat);
    lWing.position.set(-1.8, 0, 0.4);
    lWing.rotation.z = -0.15;
    lWing.rotation.y = 0.15;
    g.add(lWing);
    const rWing = new THREE.Mesh(wingGeo, wingMat);
    rWing.position.set(1.8, 0, 0.4);
    rWing.rotation.z = 0.15;
    rWing.rotation.y = -0.15;
    g.add(rWing);

    // Dorsal fin
    const finMat = new THREE.MeshStandardMaterial({ color: 0xDD2200, roughness: 0.3 });
    const finGeo = new THREE.BoxGeometry(0.1, 0.8, 1.6);
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, r * 0.7, 0.3);
    g.add(fin);

    // Engine exhaust glow on back
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xFF6622, transparent: true, opacity: 0.6 });
    const exhaustGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.position.set(0, -0.2, r * 1.3 + 0.3);
    exhaust.rotation.x = Math.PI / 2;
    g.add(exhaust);

    // Gem on forehead
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xFF2244, emissive: 0xFF2244, emissiveIntensity: 0.5 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), gemMat);
    gem.position.set(0, 0.6, -(r * 1.3));
    g.add(gem);

    _addEyes(g, [[-0.5, 0.3, -(r * 1.3 - 0.3)], [0.5, 0.3, -(r * 1.3 - 0.3)]]);
  }

  function _buildStormclaw(g, bodyMat, accentMat) {
    const r = PLAYER_RADII[4];
    const body = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, r * 1.4, r * 1.8), bodyMat);
    g.add(body);

    // Horns (tilting forward-ish)
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x3A1166, roughness: 0.3 });
    const hornGeo = new THREE.ConeGeometry(0.25, 1.5, 6);
    [[-0.5, r * 0.8, -(r * 0.5)], [0.5, r * 0.8, -(r * 0.5)]].forEach(p => {
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(p[0], p[1], p[2]);
      horn.rotation.x = -Math.PI / 4;
      g.add(horn);
    });

    // Dorsal spikes (visible from behind)
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x4422AA, roughness: 0.3 });
    const spikeGeo = new THREE.ConeGeometry(0.2, 0.8, 5);
    [[0, r * 0.8, 0], [0, r * 0.75, r * 0.4], [0, r * 0.6, r * 0.75]].forEach(p => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(p[0], p[1], p[2]);
      g.add(spike);
    });

    // Energy ring
    const ringGeo = new THREE.TorusGeometry(r * 0.9, 0.12, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00EEFF, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);

    // Tail claws on back
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x00EEFF, emissive: 0x00EEFF, emissiveIntensity: 0.3 });
    const clawGeo = new THREE.ConeGeometry(0.15, 0.9, 5);
    [[-0.6, -0.3, r * 0.9, 0.4], [0, -0.2, r * 0.95, 0.3], [0.6, -0.3, r * 0.9, 0.4]].forEach(d => {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(d[0], d[1], d[2]);
      claw.rotation.x = d[3] + Math.PI / 2;
      g.add(claw);
    });

    // Glowing eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xCCDDFF, emissive: 0x00EEFF, emissiveIntensity: 0.5 });
    const eyeGeo = new THREE.SphereGeometry(0.22, 8, 8);
    [[-0.4, 0.3, -(r * 0.9)], [0.4, 0.3, -(r * 0.9)]].forEach(p => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(p[0], p[1], p[2]);
      g.add(eye);
    });
  }

  function _buildLegendragon(g, bodyMat, accentMat) {
    const r = PLAYER_RADII[5];
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), bodyMat);
    body.scale.set(1, 0.95, 1.2);
    g.add(body);

    // Large swept wings
    const wingGeo = new THREE.BoxGeometry(3.5, 0.1, 2.2);
    const lWing = new THREE.Mesh(wingGeo, accentMat);
    lWing.position.set(-2.5, 0.5, 0.5);
    lWing.rotation.z = -0.2;
    lWing.rotation.y = 0.15;
    g.add(lWing);
    const rWing = new THREE.Mesh(wingGeo, accentMat);
    rWing.position.set(2.5, 0.5, 0.5);
    rWing.rotation.z = 0.2;
    rWing.rotation.y = -0.15;
    g.add(rWing);

    // Crown spikes on top
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.3 });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), crownMat);
      spike.position.set(Math.cos(angle) * 0.8, r * 0.9 + 0.3, Math.sin(angle) * 0.8);
      g.add(spike);
    }

    // Dorsal scales along back (visible from behind)
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0xCC8800, roughness: 0.3, metalness: 0.4 });
    const scaleGeo = new THREE.OctahedronGeometry(0.25, 0);
    [[0, r * 0.85, 0.5], [0, r * 0.65, 1.2], [0, r * 0.4, 1.8], [0, r * 0.1, 2.2]].forEach(p => {
      const sc = new THREE.Mesh(scaleGeo, scaleMat);
      sc.position.set(p[0], p[1], p[2]);
      sc.scale.set(1.2, 0.6, 1.2);
      g.add(sc);
    });

    // Tail flame
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x9944FF, transparent: true, opacity: 0.5 });
    const flameGeo = new THREE.ConeGeometry(0.5, 2.0, 8);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, -0.2, r * 1.15 + 0.8);
    flame.rotation.x = Math.PI / 2;
    g.add(flame);

    // Ruby gem on forehead
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xFF2233, emissive: 0xFF2233, emissiveIntensity: 0.5 });
    const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), rubyMat);
    ruby.position.set(0, 0.7, -(r * 1.1));
    g.add(ruby);

    // Glowing eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFF2233, emissive: 0xFF2233, emissiveIntensity: 0.3 });
    const eyeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    [[-0.6, 0.4, -(r * 1.1)], [0.6, 0.4, -(r * 1.1)]].forEach(p => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(p[0], p[1], p[2]);
      g.add(eye);
    });
  }

  // ---- World Entity Factories ----

  function createAsteroid(size) {
    const radii = { small: 1.0, medium: 1.8, large: 1.25 };
    const r = radii[size] || 1.0;
    // Use detail level 1 for smoother base shape
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const pos = geo.attributes.position;
    const normal = geo.attributes.normal;

    // Displace each vertex along its normal for a natural rocky look
    // Use a deterministic seed per-vertex based on position for consistency
    for (let i = 0; i < pos.count; i++) {
      const nx = normal.getX(i);
      const ny = normal.getY(i);
      const nz = normal.getZ(i);
      // Use sine of position components as a cheap coherent noise
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const noise = Math.sin(px * 3.7 + py * 2.3) * Math.cos(pz * 4.1 + px * 1.9) * 0.5 + 0.5;
      const displacement = (noise - 0.5) * r * 0.25;
      pos.setX(i, px + nx * displacement);
      pos.setY(i, py + ny * displacement);
      pos.setZ(i, pz + nz * displacement);
    }
    geo.computeVertexNormals();

    const group = new THREE.Group();

    // Main body
    const mainMat = new THREE.MeshStandardMaterial({
      color: 0x7A6E64, roughness: 0.85, flatShading: true,
    });
    group.add(new THREE.Mesh(geo, mainMat));

    // Crater indentations (dark circles embedded in surface)
    const craterCount = size === 'large' ? 3 : size === 'medium' ? 2 : 1;
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x3A3430, roughness: 1.0 });
    for (let i = 0; i < craterCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const cr = r * (0.2 + Math.random() * 0.15);
      const crater = new THREE.Mesh(new THREE.SphereGeometry(cr, 8, 8), craterMat);
      crater.position.set(
        r * 0.8 * Math.sin(phi) * Math.cos(theta),
        r * 0.8 * Math.sin(phi) * Math.sin(theta),
        r * 0.8 * Math.cos(phi)
      );
      crater.scale.set(1, 1, 0.3);
      crater.lookAt(0, 0, 0);
      group.add(crater);
    }

    // Lighter mineral streaks
    const streakMat = new THREE.MeshStandardMaterial({ color: 0x9A8E84, roughness: 0.7 });
    for (let i = 0; i < 2; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const streak = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 6, 6), streakMat);
      streak.position.set(
        r * 0.9 * Math.sin(phi) * Math.cos(theta),
        r * 0.9 * Math.sin(phi) * Math.sin(theta),
        r * 0.9 * Math.cos(phi)
      );
      group.add(streak);
    }

    return group;
  }

  function createAlien() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x44DD44, roughness: 0.4 });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), bodyMat));

    const antMat = new THREE.MeshStandardMaterial({ color: 0x228822 });
    const antGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
    [[-0.4, 1.2, 0], [0.4, 1.2, 0]].forEach(p => {
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(p[0], p[1], p[2]);
      group.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bodyMat);
      tip.position.set(p[0], p[1] + 0.5, p[2]);
      group.add(tip);
    });

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const whiteGeo = new THREE.SphereGeometry(0.3, 8, 8);
    [[-0.35, 0.2, -1.0], [0.35, 0.2, -1.0]].forEach(p => {
      const eye = new THREE.Mesh(whiteGeo, whiteMat);
      eye.position.set(p[0], p[1], p[2]);
      group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), _darkMat);
      pupil.position.set(p[0], p[1], p[2] - 0.18);
      group.add(pupil);
    });
    return group;
  }

  function createAnswerBubble(value, isCorrect) {
    const group = new THREE.Group();

    // Outer shell
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6366F1, transparent: true, opacity: 0.35,
      roughness: 0.2, metalness: 0.1, depthWrite: false,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.0, 20, 20), mat);
    shell.renderOrder = 0;
    group.add(shell);

    // Inner glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: isCorrect ? 0x60A5FA : 0xA78BFA,
      transparent: true, opacity: 0.15, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), glowMat);
    glow.renderOrder = 1;
    group.add(glow);

    // Text sprite — rendered on top of the bubble, no depth test
    const sprite = _makeTextSprite(String(value), '#ffffff', 256);
    sprite.material.depthTest = false;
    sprite.material.depthWrite = false;
    sprite.renderOrder = 10;
    sprite.scale.set(3.5, 3.5, 1);
    group.add(sprite);

    return group;
  }

  // ---- Beam Glow Texture (cached) ----

  let _glowTexture = null;
  function getGlowTexture() {
    if (_glowTexture) return _glowTexture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    _glowTexture = new THREE.CanvasTexture(canvas);
    return _glowTexture;
  }

  function _glowSprite(color, opacity) {
    return new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTexture(), color, transparent: true, opacity, depthWrite: false,
    }));
  }

  // ---- Beam Factory ----

  function createBeam(tier) {
    const t = Math.max(1, Math.min(5, tier));
    const color = BEAM_COLORS[t - 1];
    const group = new THREE.Group();
    const boltMat = new THREE.MeshBasicMaterial({ color });

    if (t === 1) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), boltMat);
      bolt.scale.set(1, 1, 3);
      group.add(bolt);

    } else if (t === 2) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), boltMat);
      bolt.scale.set(0.8, 0.8, 5);
      group.add(bolt);
      const glowSprite = _glowSprite(color, 0.35);
      glowSprite.scale.set(1.2, 1.2, 1);
      glowSprite.position.z = 0.6;
      group.add(glowSprite);

    } else if (t === 3) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), boltMat);
      bolt.scale.set(0.8, 0.8, 4.5);
      group.add(bolt);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.06, 8, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const glow = _glowSprite(color, 0.3);
      glow.scale.set(1.6, 1.6, 1);
      group.add(glow);

    } else if (t === 4) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), boltMat);
      core.scale.set(0.9, 0.9, 5);
      group.add(core);
      const innerGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
      );
      innerGlow.scale.set(1, 1, 3);
      group.add(innerGlow);
      for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.05, 8, 16),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
        );
        ring.position.z = (i - 0.5) * 0.6;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
      const glow = _glowSprite(color, 0.3);
      glow.scale.set(2.0, 2.0, 1);
      group.add(glow);

    } else {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), boltMat);
      core.scale.set(1, 1, 4.5);
      group.add(core);
      const hotCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      hotCore.scale.set(1, 1, 3);
      group.add(hotCore);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.6, 0.06, 8, 20),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
        );
        ring.rotation.x = Math.PI / 2 + (i - 1) * 0.4;
        ring.rotation.y = i * Math.PI / 3;
        group.add(ring);
      }
      const glow = _glowSprite(color, 0.3);
      glow.scale.set(2.8, 2.8, 1);
      group.add(glow);
      const trail = _glowSprite(color, 0.2);
      trail.scale.set(1.5, 1.5, 1);
      trail.position.z = 1.5;
      group.add(trail);
    }

    return group;
  }

  // ---- Text Sprite Helpers ----

  function _makeTextSprite(text, color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark background circle for contrast
    ctx.fillStyle = 'rgba(30, 20, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Text with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = size * 0.06;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false,
    }));
  }

  function createTextSprite(text, color, scale) {
    const sprite = _makeTextSprite(text, color || '#ffffff', 256);
    const s = scale || 2;
    sprite.scale.set(s, s, 1);
    return sprite;
  }

  // ---- Utilities ----

  // ---- OBJ Loader & Ship Models ----

  // One geometry per stage (1-5), loaded from OBJ files
  const _shipGeometries = {};
  let _shipsLoaded = 0;

  // Ship definitions: url, rotY for simple cases, forward vector for diagonal models
  const SHIP_DEFS = {
    1: { url: 'spaceship7.obj', forward: [0.537, -0.398, 0.744], roll: -Math.PI / 2 },
    2: { url: 'spaceship.obj',  rotY: Math.PI },
    3: { url: 'spaceship3.obj', rotY: Math.PI },
    4: { url: 'spaceship5.obj', rotY: -Math.PI / 2 },
    5: { url: 'spaceship6.obj', rotY: 0 },
  };

  function parseOBJ(text) {
    const verts = [];
    const normals = [];
    const outPos = [];
    const outNorm = [];

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('v ')) {
        const p = line.split(/\s+/);
        verts.push(parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3]));
      } else if (line.startsWith('vn ')) {
        const p = line.split(/\s+/);
        normals.push(parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3]));
      } else if (line.startsWith('f ')) {
        const parts = line.split(/\s+/).slice(1);
        const vertCount = verts.length / 3;
        const normCount = normals.length / 3;
        const indices = parts.map(f => {
          const ids = f.split('/');
          let vi = parseInt(ids[0]);
          let ni = ids[2] ? parseInt(ids[2]) : 0;
          // Resolve negative (relative) indices
          vi = vi < 0 ? vertCount + vi : vi - 1;
          ni = ni < 0 ? normCount + ni : ni - 1;
          return { v: vi, n: ni };
        });
        for (let t = 1; t < indices.length - 1; t++) {
          for (const idx of [indices[0], indices[t], indices[t + 1]]) {
            outPos.push(verts[idx.v * 3], verts[idx.v * 3 + 1], verts[idx.v * 3 + 2]);
            if (idx.n >= 0 && normals.length > 0) {
              outNorm.push(normals[idx.n * 3], normals[idx.n * 3 + 1], normals[idx.n * 3 + 2]);
            }
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
    if (outNorm.length === outPos.length) {
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNorm, 3));
    } else {
      geo.computeVertexNormals();
    }

    // Auto-center the geometry
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    geo.translate(-cx, -cy, -cz);

    // Compute bounding sphere for uniform scaling later
    geo.computeBoundingSphere();

    return geo;
  }

  async function loadShipModels() {
    const entries = Object.entries(SHIP_DEFS);
    const promises = entries.map(async ([stage, def]) => {
      try {
        const resp = await fetch(def.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        const geo = parseOBJ(text);
        _shipGeometries[stage] = geo;
        _shipsLoaded++;
        console.log(`Ship ${stage} loaded: ${geo.attributes.position.count} verts, radius=${geo.boundingSphere.radius.toFixed(2)}`);
      } catch (e) {
        console.warn(`Failed to load ship ${stage} (${def.url}):`, e);
      }
    });
    await Promise.all(promises);
    console.log(`Ships loaded: ${_shipsLoaded}/${entries.length}`);
  }

  function createShipMesh(stage) {
    const geo = _shipGeometries[stage];
    if (!geo) return null;

    const def = SHIP_DEFS[stage];
    const c = STAGE_COLORS[stage] || STAGE_COLORS[1];
    const mat = new THREE.MeshStandardMaterial({
      color: c.body, roughness: 0.35, metalness: 0.6,
    });

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mat);

    // Uniform scale so the model fits within the player radius for this stage
    const targetSize = PLAYER_RADII[stage] || 1.5;
    const modelRadius = geo.boundingSphere.radius || 1;
    const scale = targetSize / modelRadius;
    mesh.scale.set(scale, scale, scale);

    // Orientation: use quaternion alignment if a forward vector is given,
    // otherwise fall back to simple Y rotation
    if (def.forward) {
      const fwd = new THREE.Vector3(def.forward[0], def.forward[1], def.forward[2]).normalize();
      const target = new THREE.Vector3(0, 0, -1);
      const q = new THREE.Quaternion().setFromUnitVectors(fwd, target);
      mesh.quaternion.premultiply(q);
      if (def.roll) {
        const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), def.roll);
        mesh.quaternion.premultiply(rollQ);
      }
    } else if (def.rotY) {
      mesh.rotation.y = def.rotY;
    }

    group.add(mesh);

    return group;
  }

  function isShipLoaded(stage) {
    return !!_shipGeometries[stage || 1];
  }

  // ---- Utilities ----

  function getPlayerRadius(stage) {
    return PLAYER_RADII[stage] || PLAYER_RADII[1];
  }

  function getCreatureName(stage) {
    return CREATURE_NAMES[stage] || CREATURE_NAMES[1];
  }

  function disposeObject(obj) {
    if (!obj) return;
    if (obj.traverse) {
      obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    } else {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    }
  }

  return {
    createPlayer,
    createShipMesh,
    loadShipModels,
    isShipLoaded,
    createAsteroid,
    createAlien,
    createAnswerBubble,
    createBeam,
    createTextSprite,
    getPlayerRadius,
    getCreatureName,
    disposeObject,
    BEAM_COLORS,
  };
})();
