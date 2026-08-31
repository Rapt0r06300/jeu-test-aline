import { APP_CONFIG } from '../data/config.js';
import { QUALITY_PROFILES } from '../data/quality.js';
import { SCENE_CONFIG } from '../data/scene-config.js';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function setShadow(object, enabled) {
  object.castShadow = enabled;
  object.receiveShadow = enabled;
  return object;
}

function createHumanoidCharacter(THREE, {
  primary = 0x5fa9d8,
  secondary = 0x1b2942,
  skin = 0xc89573,
  metal = 0xaeb8c8,
  accent = 0x78dcff,
  scale = 1,
  shadows = true,
  cape = true,
  weapon = 'sword',
  boss = false,
} = {}) {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  root.scale.setScalar(scale);

  const clothMat = new THREE.MeshStandardMaterial({ color: primary, roughness: 0.7, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: secondary, roughness: 0.82, metalness: 0.04 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.82 });
  const metalMat = new THREE.MeshStandardMaterial({ color: metal, roughness: 0.32, metalness: 0.72 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.18, roughness: 0.4, metalness: 0.18 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x38291f, roughness: 0.95 });

  const pelvis = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.48), darkMat), shadows);
  pelvis.position.y = 1.03;
  model.add(pelvis);

  const torso = setShadow(new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.52), clothMat), shadows);
  torso.position.y = 1.72;
  model.add(torso);

  const chest = setShadow(new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.42, 0.62), metalMat), shadows);
  chest.position.set(0, 1.94, 0.02);
  model.add(chest);

  const belt = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.16, 0.58), leatherMat), shadows);
  belt.position.y = 1.18;
  model.add(belt);

  const neck = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.24, 10), skinMat), shadows);
  neck.position.y = 2.34;
  model.add(neck);

  const head = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), skinMat), shadows);
  head.scale.set(0.92, 1.08, 0.9);
  head.position.y = 2.68;
  model.add(head);

  const hair = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.395, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), darkMat), shadows);
  hair.scale.set(0.96, 0.72, 0.96);
  hair.position.y = 2.83;
  model.add(hair);

  const faceMark = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.025), accentMat);
  faceMark.position.set(0, 2.67, 0.345);
  model.add(faceMark);

  function createArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.67, 2.08, 0);
    const pauldron = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 7), metalMat), shadows);
    pauldron.scale.set(1.25, 0.75, 1);
    pauldron.position.set(side * 0.02, -0.05, 0);
    const upper = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 9), clothMat), shadows);
    upper.position.y = -0.36;
    const elbow = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), metalMat), shadows);
    elbow.position.y = -0.73;
    const forearm = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.62, 9), skinMat), shadows);
    forearm.position.y = -1.01;
    const glove = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.28, 0.24), darkMat), shadows);
    glove.position.y = -1.34;
    arm.add(pauldron, upper, elbow, forearm, glove);
    model.add(arm);
    return arm;
  }

  function createLeg(side) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.27, 1.02, 0);
    const thigh = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.82, 10), darkMat), shadows);
    thigh.position.y = -0.4;
    const knee = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), metalMat), shadows);
    knee.scale.set(1, 0.82, 1.1);
    knee.position.y = -0.82;
    const shin = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.7, 9), clothMat), shadows);
    shin.position.y = -1.13;
    const boot = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.58), leatherMat), shadows);
    boot.position.set(0, -1.5, 0.11);
    leg.add(thigh, knee, shin, boot);
    model.add(leg);
    return leg;
  }

  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);

  const capePivot = new THREE.Group();
  capePivot.position.set(0, 2.18, -0.32);
  if (cape) {
    const capeMesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.48, 0.08), darkMat), shadows);
    capeMesh.position.set(0, -0.72, -0.05);
    capePivot.add(capeMesh);
    model.add(capePivot);
  }

  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.03, -1.25, 0.08);
  if (weapon === 'staff') {
    const shaft = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.25, 8), leatherMat), shadows);
    shaft.position.y = -0.72;
    const focus = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), accentMat);
    focus.position.y = 0.47;
    weaponPivot.add(shaft, focus);
  } else if (weapon === 'axe') {
    const handle = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.55, 8), leatherMat), shadows);
    handle.position.y = -0.48;
    const headMesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.12), metalMat), shadows);
    headMesh.position.set(0.18, 0.25, 0);
    weaponPivot.add(handle, headMesh);
  } else {
    const blade = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.45, 0.08), metalMat), shadows);
    blade.position.y = -0.68;
    const guard = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.12), accentMat), shadows);
    guard.position.y = 0.02;
    const grip = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.48, 8), leatherMat), shadows);
    grip.position.y = 0.29;
    weaponPivot.add(blade, guard, grip);
  }
  rightArm.add(weaponPivot);

  if (boss) {
    const leftHorn = setShadow(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 8), metalMat), shadows);
    const rightHorn = leftHorn.clone();
    leftHorn.position.set(-0.28, 3.2, 0);
    rightHorn.position.set(0.28, 3.2, 0);
    leftHorn.rotation.z = -0.28;
    rightHorn.rotation.z = 0.28;
    model.add(leftHorn, rightHorn);
    const bossCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), accentMat);
    bossCore.position.set(0, 1.88, 0.34);
    model.add(bossCore);
  }

  root.userData.rig = {
    model,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    capePivot,
    clothMat,
    accentMat,
  };
  root.userData.phase = Math.random() * Math.PI * 2;
  return root;
}

function faceDirection(character, dx, dz, amount = 0.18) {
  if (Math.hypot(dx, dz) < 0.001) return;
  const desired = Math.atan2(dx, dz);
  const delta = Math.atan2(Math.sin(desired - character.rotation.y), Math.cos(desired - character.rotation.y));
  character.rotation.y += delta * amount;
}

function poseHumanoid(character, elapsed, { moving = false, attacking = false, dead = false, enraged = false } = {}) {
  const rig = character.userData.rig;
  if (!rig) return;
  const phase = character.userData.phase ?? 0;
  const stride = moving ? Math.sin(elapsed * 8.5 + phase) * 0.62 : Math.sin(elapsed * 1.8 + phase) * 0.055;
  const breathe = Math.sin(elapsed * 2.1 + phase) * 0.018;

  rig.model.rotation.z += ((dead ? -Math.PI / 2 : 0) - rig.model.rotation.z) * 0.12;
  rig.model.position.y += ((dead ? 0.54 : Math.abs(stride) * 0.055 + breathe) - rig.model.position.y) * 0.2;
  rig.model.rotation.y = Math.sin(elapsed * 1.2 + phase) * (dead ? 0 : 0.012);

  if (dead) {
    rig.leftArm.rotation.x += (-0.35 - rig.leftArm.rotation.x) * 0.18;
    rig.rightArm.rotation.x += (0.55 - rig.rightArm.rotation.x) * 0.18;
    rig.leftLeg.rotation.x += (0.18 - rig.leftLeg.rotation.x) * 0.18;
    rig.rightLeg.rotation.x += (-0.15 - rig.rightLeg.rotation.x) * 0.18;
    return;
  }

  const attackSwing = attacking ? -1.55 + Math.sin(elapsed * 22) * 0.35 : stride * 0.76;
  rig.leftArm.rotation.x += ((-stride * 0.72) - rig.leftArm.rotation.x) * 0.28;
  rig.rightArm.rotation.x += (attackSwing - rig.rightArm.rotation.x) * (attacking ? 0.5 : 0.28);
  rig.rightArm.rotation.z += ((attacking ? -0.32 : 0.06) - rig.rightArm.rotation.z) * 0.28;
  rig.leftArm.rotation.z += ((attacking ? 0.18 : -0.06) - rig.leftArm.rotation.z) * 0.28;
  rig.leftLeg.rotation.x += (stride - rig.leftLeg.rotation.x) * 0.32;
  rig.rightLeg.rotation.x += (-stride - rig.rightLeg.rotation.x) * 0.32;
  rig.head.rotation.y = Math.sin(elapsed * 0.75 + phase) * 0.08;
  rig.capePivot.rotation.x = 0.06 + (moving ? 0.18 : 0.04) + Math.sin(elapsed * 3 + phase) * 0.035;
  rig.accentMat.emissiveIntensity = (enraged ? 0.75 : 0.18) + Math.max(0, Math.sin(elapsed * 4 + phase)) * (enraged ? 0.4 : 0.08);
}

export function createThreeScene(THREE, root, { quality = 'medium' } = {}) {
  const profile = QUALITY_PROFILES[quality] ?? QUALITY_PROFILES.medium;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_CONFIG.colors.sky);
  scene.fog = new THREE.FogExp2(SCENE_CONFIG.colors.fog, SCENE_CONFIG.fogDensity);

  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 240);
  camera.position.set(0, 12, 18);
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', `Scène 3D fantasy jouable · qualité ${profile.id}`);
  root.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8fc9ff, 0x172416, 1.42));
  const sun = new THREE.DirectionalLight(0xffe4b6, 2.45);
  sun.position.set(-28, 44, 22);
  sun.castShadow = profile.shadows;
  if (profile.shadows) sun.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x6ab8ff, 0.7);
  rim.position.set(18, 18, -24);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(SCENE_CONFIG.worldRadius, quality === 'low' ? 48 : 96),
    new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.ground, roughness: 0.97, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = profile.shadows;
  world.add(ground);

  const pathMaterial = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.path, roughness: 1 });
  for (let i = -11; i <= 11; i++) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(2.4 + (i % 3) * 0.18, 0.18, 1.55), pathMaterial);
    stone.position.set(i * 2.45, 0.12, Math.sin(i * 0.6) * 1.9);
    stone.rotation.y = Math.sin(i * 0.77) * 0.24;
    stone.receiveShadow = profile.shadows;
    world.add(stone);
  }

  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.trunk, roughness: 1 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.leaves, roughness: 0.93 });
  const rockMat = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.stone, roughness: 0.9 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.crystal, emissive: 0x1d7689, emissiveIntensity: 1.25, roughness: 0.28 });
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.45, 3.3, 7);
  const crownGeo = new THREE.ConeGeometry(1.85, 4.9, 8);
  const rockGeo = new THREE.DodecahedronGeometry(1.1, 0);
  const crystalGeo = new THREE.OctahedronGeometry(0.75, 0);
  const rand = seededRandom(0xA11CE);

  function randomRing(minRadius, maxRadius) {
    const a = rand() * Math.PI * 2;
    const r = minRadius + rand() * (maxRadius - minRadius);
    return [Math.cos(a) * r, Math.sin(a) * r];
  }

  const treeCount = Math.max(10, Math.round(SCENE_CONFIG.treeCount * profile.density));
  const rockCount = Math.max(8, Math.round(SCENE_CONFIG.rockCount * profile.density));
  const crystalCount = Math.max(4, Math.round(SCENE_CONFIG.crystalCount * profile.density));

  for (let i = 0; i < treeCount; i++) {
    const [x, z] = randomRing(15, 65);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
    trunk.position.y = 1.65;
    trunk.castShadow = profile.shadows;
    const crown = new THREE.Mesh(crownGeo, leavesMat);
    crown.position.y = 4.45;
    crown.castShadow = profile.shadows;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(0.72 + rand() * 0.7);
    world.add(tree);
  }

  for (let i = 0; i < rockCount; i++) {
    const [x, z] = randomRing(10, 63);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.5, z);
    rock.scale.set(0.45 + rand() * 1.3, 0.35 + rand() * 0.8, 0.5 + rand() * 1.2);
    rock.rotation.set(rand() * 0.8, rand() * Math.PI, rand() * 0.5);
    rock.castShadow = profile.shadows;
    world.add(rock);
  }

  for (let i = 0; i < crystalCount; i++) {
    const [x, z] = randomRing(18, 54);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(x, 1, z);
    crystal.scale.set(0.7, 1.8, 0.7);
    world.add(crystal);
  }

  const poiColors = [0x69d7ff, 0xb7d384, 0xe2a968, 0xffc15f];
  Object.values(APP_CONFIG.gameplay.world.points).forEach((poi, index) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(index === 3 ? 6.5 : 3.2, index === 3 ? 6.7 : 3.35, 0.18, quality === 'low' ? 18 : 32),
      new THREE.MeshStandardMaterial({ color: poiColors[index], transparent: true, opacity: index === 3 ? 0.22 : 0.12, roughness: 0.8 }),
    );
    marker.position.set(poi.x, 0.1, poi.z);
    marker.receiveShadow = profile.shadows;
    world.add(marker);
  });

  const npcConfig = APP_CONFIG.gameplay.world.npc;
  const npc = createHumanoidCharacter(THREE, {
    primary: 0x6d6ab5,
    secondary: 0x2a244c,
    accent: 0xa7dcff,
    metal: 0x8d95aa,
    scale: 0.92,
    shadows: profile.shadows,
    cape: true,
    weapon: 'staff',
  });
  const npcHalo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0x9adfff }));
  npcHalo.rotation.x = -Math.PI / 2;
  npcHalo.position.y = 0.1;
  npc.add(npcHalo);
  npc.position.set(npcConfig.x, 0, npcConfig.z);
  world.add(npc);

  const player = createHumanoidCharacter(THREE, {
    primary: 0x287da8,
    secondary: 0x101d34,
    accent: 0x79e7ff,
    metal: 0xc9d7e4,
    scale: 1.08,
    shadows: profile.shadows,
    cape: true,
    weapon: 'sword',
  });
  const playerAura = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.035, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x76d7ff, transparent: true, opacity: 0.42 }),
  );
  playerAura.rotation.x = -Math.PI / 2;
  playerAura.position.y = 0.08;
  player.add(playerAura);
  const playerMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x4ebce8, emissiveIntensity: 0.9, roughness: 0.25 }),
  );
  playerMarker.position.set(0, 3.55, 0);
  player.add(playerMarker);
  scene.add(player);

  const enemyMeshes = new Map();
  function ensureEnemy(enemy) {
    if (enemyMeshes.has(enemy.id)) return enemyMeshes.get(enemy.id);
    const sentinel = enemy.id.startsWith('sentinel');
    const group = createHumanoidCharacter(THREE, {
      primary: enemy.isBoss ? 0x7d2d20 : sentinel ? 0x6f573d : 0x6a2636,
      secondary: enemy.isBoss ? 0x24100d : 0x26191c,
      skin: enemy.isBoss ? 0x9b5a42 : 0x9c725e,
      metal: enemy.isBoss ? 0xb97a45 : 0x88766f,
      accent: enemy.isBoss ? 0xff6c3f : sentinel ? 0xe0b274 : 0xff697e,
      scale: enemy.isBoss ? 1.72 : sentinel ? 1.02 : 0.94,
      shadows: profile.shadows,
      cape: enemy.isBoss || sentinel,
      weapon: enemy.isBoss ? 'axe' : sentinel ? 'sword' : 'axe',
      boss: enemy.isBoss,
    });
    scene.add(group);
    enemyMeshes.set(enemy.id, group);
    return group;
  }

  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.09, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffdd73, transparent: true, opacity: 0.92 }));
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.y = 0.12;
  targetRing.visible = false;
  scene.add(targetRing);

  const effectMaterial = new THREE.MeshBasicMaterial({ color: 0x7cdcff, transparent: true, opacity: 0.78 });
  const effectRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.12, 8, 48), effectMaterial);
  effectRing.rotation.x = -Math.PI / 2;
  effectRing.position.y = 0.28;
  effectRing.visible = false;
  scene.add(effectRing);

  const bossTelegraph = new THREE.Mesh(new THREE.RingGeometry(2.1, 4.8, quality === 'low' ? 28 : 56), new THREE.MeshBasicMaterial({ color: 0xff5d3f, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  bossTelegraph.rotation.x = -Math.PI / 2;
  bossTelegraph.position.y = 0.09;
  bossTelegraph.visible = false;
  scene.add(bossTelegraph);

  const actionColors = { basic: 0xffffff, skill1: 0x75d6ff, skill2: 0xb783ff, skill3: 0x79ffc6, skill4: 0xffd16f };
  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;
  let latestState = null;
  let lastFeedbackKey = '';
  let effectEndAt = 0;
  let renderedFrames = 0;

  function resize() {
    if (disposed) return;
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, APP_CONFIG.render.maxPixelRatio, profile.maxPixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
  }

  function update(state) {
    latestState = state;
    const feedback = state.feedback;
    if (feedback?.type === 'player-action') {
      const key = `${feedback.actionId}:${feedback.targetId}:${feedback.at}`;
      if (key !== lastFeedbackKey) {
        lastFeedbackKey = key;
        effectMaterial.color.setHex(actionColors[feedback.actionId] ?? 0xffffff);
        effectEndAt = clock.getElapsedTime() + 0.42;
      }
    }
  }

  function frame() {
    if (disposed) return;
    const elapsed = clock.getElapsedTime();
    if (latestState) {
      const p = latestState.player.position;
      const pdx = p.x - player.position.x;
      const pdz = p.z - player.position.z;
      const playerMoving = Math.hypot(pdx, pdz) > 0.035;
      player.position.x += pdx * 0.34;
      player.position.z += pdz * 0.34;
      player.visible = latestState.player.hp > 0;

      const target = latestState.enemies.find((enemy) => enemy.id === latestState.targetId && enemy.state !== 'dead');
      const playerAttacking = effectEndAt > elapsed && latestState.feedback?.type === 'player-action';
      if (playerAttacking && target) faceDirection(player, target.position.x - player.position.x, target.position.z - player.position.z, 0.34);
      else if (playerMoving) faceDirection(player, pdx, pdz, 0.26);
      poseHumanoid(player, elapsed, { moving: playerMoving, attacking: playerAttacking, dead: latestState.player.hp <= 0 });

      for (const enemy of latestState.enemies) {
        const mesh = ensureEnemy(enemy);
        const dx = enemy.position.x - mesh.position.x;
        const dz = enemy.position.z - mesh.position.z;
        const moving = Math.hypot(dx, dz) > 0.035 && enemy.state !== 'dead';
        mesh.visible = true;
        mesh.position.x += dx * 0.3;
        mesh.position.z += dz * 0.3;
        if (moving) faceDirection(mesh, dx, dz, enemy.isBoss ? 0.08 : 0.2);
        const attacking = enemy.state === 'attack' || enemy.state === 'attacking' || enemy.pendingDamageAt > latestState.time;
        poseHumanoid(mesh, elapsed, {
          moving,
          attacking,
          dead: enemy.state === 'dead',
          enraged: enemy.isBoss && enemy.phase === 'enraged',
        });
      }

      targetRing.visible = Boolean(target);
      if (target) {
        targetRing.scale.setScalar(target.isBoss ? 1.8 : 1);
        targetRing.position.set(target.position.x, 0.12, target.position.z);
      }

      if (effectEndAt > elapsed && latestState.feedback?.targetId) {
        const effectTarget = latestState.enemies.find((enemy) => enemy.id === latestState.feedback.targetId);
        effectRing.visible = Boolean(effectTarget);
        if (effectTarget) {
          const progress = 1 - (effectEndAt - elapsed) / 0.42;
          effectRing.position.set(effectTarget.position.x, 0.3, effectTarget.position.z);
          effectRing.scale.setScalar((effectTarget.isBoss ? 1.4 : 0.7) + progress * 1.45);
          effectMaterial.opacity = Math.max(0, 0.8 * (1 - progress));
        }
      } else effectRing.visible = false;

      const boss = latestState.enemies.find((enemy) => enemy.id === APP_CONFIG.gameplay.boss.id);
      bossTelegraph.visible = Boolean(boss && boss.state !== 'dead' && boss.pendingDamageAt > latestState.time);
      if (bossTelegraph.visible) {
        bossTelegraph.position.set(boss.position.x, 0.09, boss.position.z);
        const pulse = 0.92 + Math.sin(elapsed * 18) * 0.08;
        bossTelegraph.scale.setScalar(boss.phase === 'enraged' ? 1.25 * pulse : pulse);
      }

      const desiredCamera = new THREE.Vector3(player.position.x + 11, 10.5, player.position.z + 15);
      camera.position.lerp(desiredCamera, 0.08);
      camera.lookAt(player.position.x, 1.45, player.position.z);
    }

    poseHumanoid(npc, elapsed, { moving: false, attacking: false, dead: false });
    npcHalo.rotation.z = elapsed * 0.35;
    playerAura.material.opacity = 0.28 + Math.sin(elapsed * 2.5) * 0.08;
    playerMarker.rotation.y = elapsed * 0.9;
    playerMarker.position.y = 3.55 + Math.sin(elapsed * 2) * 0.08;
    crystalMat.emissiveIntensity = 1.05 + Math.sin(elapsed * 1.8) * 0.25;
    renderer.render(scene, camera);
    renderedFrames++;
    raf = requestAnimationFrame(frame);
  }

  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function disposeMaterial(material) { if (Array.isArray(material)) material.forEach(disposeMaterial); else material?.dispose?.(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    scene.traverse((object) => { object.geometry?.dispose?.(); disposeMaterial(object.material); });
    renderer.dispose();
    renderer.forceContextLoss?.();
    root.replaceChildren();
  }

  resize();
  raf = requestAnimationFrame(frame);
  return {
    kind: 'three-webgl',
    quality: profile.id,
    canvas: renderer.domElement,
    resize,
    update,
    stop,
    dispose,
    getMetrics: () => ({ renderedFrames, quality: profile.id, treeCount, rockCount, crystalCount, humanoidVisuals: true }),
  };
}