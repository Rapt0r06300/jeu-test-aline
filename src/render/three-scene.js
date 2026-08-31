import { APP_CONFIG } from '../data/config.js';
import { SCENE_CONFIG } from '../data/scene-config.js';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

export function createThreeScene(THREE, root) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_CONFIG.colors.sky);
  scene.fog = new THREE.FogExp2(SCENE_CONFIG.colors.fog, SCENE_CONFIG.fogDensity);

  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 240);
  camera.position.set(0, 12, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Scène 3D fantasy jouable');
  root.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8fc9ff, 0x172416, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b6, 2.4);
  sun.position.set(-28, 44, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(SCENE_CONFIG.worldRadius, 96),
    new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.ground, roughness: 0.97, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const pathMaterial = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.path, roughness: 1 });
  for (let i = -11; i <= 11; i++) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(2.4 + (i % 3) * 0.18, 0.18, 1.55), pathMaterial);
    stone.position.set(i * 2.45, 0.12, Math.sin(i * 0.6) * 1.9);
    stone.rotation.y = Math.sin(i * 0.77) * 0.24;
    stone.receiveShadow = true;
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

  for (let i = 0; i < SCENE_CONFIG.treeCount; i++) {
    const [x, z] = randomRing(15, 65);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
    trunk.position.y = 1.65;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(crownGeo, leavesMat);
    crown.position.y = 4.45;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(0.72 + rand() * 0.7);
    world.add(tree);
  }

  for (let i = 0; i < SCENE_CONFIG.rockCount; i++) {
    const [x, z] = randomRing(10, 63);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.5, z);
    rock.scale.set(0.45 + rand() * 1.3, 0.35 + rand() * 0.8, 0.5 + rand() * 1.2);
    rock.rotation.set(rand() * 0.8, rand() * Math.PI, rand() * 0.5);
    rock.castShadow = true;
    world.add(rock);
  }

  for (let i = 0; i < SCENE_CONFIG.crystalCount; i++) {
    const [x, z] = randomRing(18, 54);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(x, 1, z);
    crystal.scale.set(0.7, 1.8, 0.7);
    world.add(crystal);
  }

  const player = new THREE.Group();
  const playerBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.58, 1.25, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0x76d7ff, roughness: 0.42, metalness: 0.12 }),
  );
  playerBody.position.y = 1.25;
  playerBody.castShadow = true;
  const playerMarker = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.65, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x4ebce8, emissiveIntensity: 0.7 }),
  );
  playerMarker.position.set(0, 2.75, 0);
  player.add(playerBody, playerMarker);
  scene.add(player);

  const enemyMeshes = new Map();
  function ensureEnemy(enemy) {
    if (enemyMeshes.has(enemy.id)) return enemyMeshes.get(enemy.id);
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      new THREE.MeshStandardMaterial({ color: enemy.id.startsWith('sentinel') ? 0xb58858 : 0x923e48, roughness: 0.72 }),
    );
    body.position.y = 1.05;
    body.castShadow = true;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 7), new THREE.MeshStandardMaterial({ color: 0xd7c7a2, roughness: 1 }));
    horn.position.set(0, 2, 0);
    group.add(body, horn);
    scene.add(group);
    enemyMeshes.set(enemy.id, group);
    return group;
  }

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.09, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffdd73, transparent: true, opacity: 0.92 }),
  );
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

  const actionColors = { basic: 0xffffff, skill1: 0x75d6ff, skill2: 0xb783ff, skill3: 0x79ffc6, skill4: 0xffd16f };
  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;
  let latestState = null;
  let lastFeedbackKey = '';
  let effectEndAt = 0;

  function resize() {
    if (disposed) return;
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, APP_CONFIG.render.maxPixelRatio);
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

      for (const enemy of latestState.enemies) {
        const mesh = ensureEnemy(enemy);
        mesh.visible = enemy.state !== 'dead';
        mesh.position.x += (enemy.position.x - mesh.position.x) * 0.3;
        mesh.position.z += (enemy.position.z - mesh.position.z) * 0.3;
        if (mesh.visible) mesh.rotation.y += 0.003;
      }

      const target = latestState.enemies.find((enemy) => enemy.id === latestState.targetId && enemy.state !== 'dead');
      targetRing.visible = Boolean(target);
      if (target) targetRing.position.set(target.position.x, 0.12, target.position.z);

      if (effectEndAt > elapsed && latestState.feedback?.targetId) {
        const effectTarget = latestState.enemies.find((enemy) => enemy.id === latestState.feedback.targetId);
        effectRing.visible = Boolean(effectTarget);
        if (effectTarget) {
          const progress = 1 - (effectEndAt - elapsed) / 0.42;
          effectRing.position.set(effectTarget.position.x, 0.3, effectTarget.position.z);
          effectRing.scale.setScalar(0.7 + progress * 1.45);
          effectMaterial.opacity = Math.max(0, 0.8 * (1 - progress));
        }
      } else {
        effectRing.visible = false;
      }

      const desiredCamera = new THREE.Vector3(player.position.x + 11, 10.5, player.position.z + 15);
      camera.position.lerp(desiredCamera, 0.08);
      camera.lookAt(player.position.x, 1.2, player.position.z);
    }

    crystalMat.emissiveIntensity = 1.05 + Math.sin(elapsed * 1.8) * 0.25;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function disposeMaterial(material) {
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else material?.dispose?.();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    scene.traverse((object) => {
      object.geometry?.dispose?.();
      disposeMaterial(object.material);
    });
    renderer.dispose();
    renderer.forceContextLoss?.();
    root.replaceChildren();
  }

  resize();
  raf = requestAnimationFrame(frame);
  return { kind: 'three-webgl', canvas: renderer.domElement, resize, update, stop, dispose };
}
