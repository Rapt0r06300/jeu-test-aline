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
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = profile.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', `Scène 3D fantasy jouable · qualité ${profile.id}`);
  root.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8fc9ff, 0x172416, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b6, 2.4);
  sun.position.set(-28, 44, 22);
  sun.castShadow = profile.shadows;
  if (profile.shadows) sun.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
  scene.add(sun);

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
  const npc = new THREE.Group();
  const npcBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.15, 4, 8), new THREE.MeshStandardMaterial({ color: 0x6e7ec7, roughness: 0.58 }));
  npcBody.position.y = 1.15;
  const npcHalo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0x9adfff }));
  npcHalo.rotation.x = -Math.PI / 2;
  npcHalo.position.y = 0.1;
  npc.add(npcBody, npcHalo);
  npc.position.set(npcConfig.x, 0, npcConfig.z);
  world.add(npc);

  const player = new THREE.Group();
  const playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 1.25, 5, 10), new THREE.MeshStandardMaterial({ color: 0x76d7ff, roughness: 0.42, metalness: 0.12 }));
  playerBody.position.y = 1.25;
  playerBody.castShadow = profile.shadows;
  const playerMarker = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 8), new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x4ebce8, emissiveIntensity: 0.7 }));
  playerMarker.position.set(0, 2.75, 0);
  player.add(playerBody, playerMarker);
  scene.add(player);

  const enemyMeshes = new Map();
  function ensureEnemy(enemy) {
    if (enemyMeshes.has(enemy.id)) return enemyMeshes.get(enemy.id);
    const group = new THREE.Group();
    const size = enemy.isBoss ? 1.75 : 0.95;
    const body = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, quality === 'low' ? 0 : 1),
      new THREE.MeshStandardMaterial({ color: enemy.isBoss ? 0xd27838 : enemy.id.startsWith('sentinel') ? 0xb58858 : 0x923e48, roughness: 0.72, emissive: enemy.isBoss ? 0x4f1b08 : 0x000000, emissiveIntensity: enemy.isBoss ? 0.45 : 0 }),
    );
    body.position.y = enemy.isBoss ? 1.85 : 1.05;
    body.castShadow = profile.shadows;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(enemy.isBoss ? 0.55 : 0.25, enemy.isBoss ? 1.4 : 0.8, 7), new THREE.MeshStandardMaterial({ color: 0xd7c7a2, roughness: 1 }));
    horn.position.set(0, enemy.isBoss ? 3.7 : 2, 0);
    group.add(body, horn);
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
      player.position.x += (p.x - player.position.x) * 0.34;
      player.position.z += (p.z - player.position.z) * 0.34;
      player.visible = latestState.player.hp > 0;

      for (const enemy of latestState.enemies) {
        const mesh = ensureEnemy(enemy);
        mesh.visible = enemy.state !== 'dead';
        mesh.position.x += (enemy.position.x - mesh.position.x) * 0.3;
        mesh.position.z += (enemy.position.z - mesh.position.z) * 0.3;
        if (mesh.visible) mesh.rotation.y += enemy.isBoss ? 0.0015 : 0.003;
      }

      const target = latestState.enemies.find((enemy) => enemy.id === latestState.targetId && enemy.state !== 'dead');
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
      camera.lookAt(player.position.x, 1.2, player.position.z);
    }

    npcHalo.rotation.z = elapsed * 0.35;
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
    getMetrics: () => ({ renderedFrames, quality: profile.id, treeCount, rockCount, crystalCount }),
  };
}
