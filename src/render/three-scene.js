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
  camera.position.set(22, 14, 28);
  camera.lookAt(0, 3, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Scène 3D fantasy');
  root.replaceChildren(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0x8fc9ff, 0x172416, 1.45);
  scene.add(hemi);

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
  const ruinMat = new THREE.MeshStandardMaterial({ color: SCENE_CONFIG.colors.ruin, roughness: 0.88 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: SCENE_CONFIG.colors.crystal,
    emissive: 0x1d7689,
    emissiveIntensity: 1.25,
    roughness: 0.28,
    metalness: 0.12,
  });

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
    const [x, z] = randomRing(14, 65);
    const scale = 0.72 + rand() * 0.75;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
    trunk.position.y = 1.65;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(crownGeo, leavesMat);
    crown.position.y = 4.45;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = rand() * Math.PI;
    world.add(tree);
  }

  for (let i = 0; i < SCENE_CONFIG.rockCount; i++) {
    const [x, z] = randomRing(8, 63);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.45 + rand() * 0.32, z);
    rock.scale.set(0.45 + rand() * 1.5, 0.35 + rand() * 0.85, 0.5 + rand() * 1.35);
    rock.rotation.set(rand() * 0.8, rand() * Math.PI, rand() * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }

  for (let i = 0; i < SCENE_CONFIG.crystalCount; i++) {
    const [x, z] = randomRing(16, 54);
    const cluster = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set((j - 1) * 0.48, 0.75 + j * 0.17, (j % 2) * 0.25);
      crystal.scale.set(0.5 + j * 0.18, 1.1 + j * 0.36, 0.5 + j * 0.13);
      crystal.rotation.z = (j - 1) * 0.2;
      cluster.add(crystal);
    }
    cluster.position.set(x, 0, z);
    world.add(cluster);
  }

  const ruin = new THREE.Group();
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 0.7, 16), ruinMat);
  altar.position.y = 0.35;
  altar.receiveShadow = true;
  ruin.add(altar);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4 + (i % 3) * 1.1, 0.95), ruinMat);
    column.position.set(Math.cos(angle) * 7.8, 2 + (i % 3) * 0.55, Math.sin(angle) * 7.8);
    column.rotation.y = -angle + rand() * 0.25;
    column.rotation.z = (rand() - 0.5) * 0.16;
    column.castShadow = true;
    ruin.add(column);
  }
  ruin.position.set(27, 0, -21);
  world.add(ruin);

  const positions = new Float32Array(SCENE_CONFIG.fireflyCount * 3);
  for (let i = 0; i < SCENE_CONFIG.fireflyCount; i++) {
    const [x, z] = randomRing(3, 60);
    positions[i * 3] = x;
    positions[i * 3 + 1] = 1 + rand() * 8;
    positions[i * 3 + 2] = z;
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const fireflies = new THREE.Points(
    fireflyGeo,
    new THREE.PointsMaterial({ color: 0xaef9ff, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  world.add(fireflies);

  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;

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

  function frame() {
    if (disposed) return;
    const elapsed = clock.getElapsedTime();
    camera.position.x = 22 + Math.sin(elapsed * 0.055) * 2.6;
    camera.position.z = 28 + Math.cos(elapsed * 0.055) * 2.6;
    camera.lookAt(0, 3.1, 0);
    fireflies.rotation.y = elapsed * 0.018;
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

  return { kind: 'three-webgl', canvas: renderer.domElement, resize, stop, dispose };
}
