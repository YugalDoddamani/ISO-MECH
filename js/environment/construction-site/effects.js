/**
 * IsoMech V2 · Construction site · effects
 *
 * Instanced dust and exhaust-smoke particle pools and the per-step effect emitters.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
function makeEffectPool(name, color, count, opacity) {
  const geometry = new THREE.SphereGeometry(1, 7, 5),
    material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    }),
    instances = new THREE.InstancedMesh(geometry, material, count),
    particles = [];
  instances.name = name;
  instances.frustumCulled = false;
  instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  yardRoot.add(instances);
  for (let i = 0; i < count; i++)
    particles.push({ life: 0, ttl: 1, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, size: 0 });
  return { mesh: instances, particles, cursor: 0 };
}
const dustPool = makeEffectPool('Soft drifting dust', '#b9a77b', 128, 0.22),
  smokePool = makeEffectPool('Engine exhaust smoke', '#60665f', 72, 0.16);
const effectClock = { dust: 0, smoke: 0, drill: 0 },
  effectDummy = new THREE.Object3D();
function spawnEffect(pool, x, y, z, count, kind = 'dust') {
  for (let i = 0; i < count; i++) {
    const p = pool.particles[pool.cursor++ % pool.particles.length],
      smoke = kind === 'smoke',
      duration = smoke ? 1.2 + rand() * 0.9 : 0.7 + rand() * 0.8;
    Object.assign(p, {
      life: duration,
      ttl: duration,
      x: x + (rand() - 0.5) * 0.28,
      y: y + rand() * 0.16,
      z: z + (rand() - 0.5) * 0.28,
      vx: (rand() - 0.5) * (smoke ? 0.35 : 1.3),
      vy: smoke ? 0.45 + rand() * 0.55 : 0.35 + rand() * 1.15,
      vz: (rand() - 0.5) * (smoke ? 0.35 : 1.3),
      size: (smoke ? 0.11 : 0.08) + rand() * (smoke ? 0.13 : 0.11),
    });
  }
}
function updateEffectPool(pool, dt, smoke = false) {
  for (let i = 0; i < pool.particles.length; i++) {
    const p = pool.particles[i];
    p.life = Math.max(0, p.life - dt);
    if (p.life > 0) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.exp(-0.7 * dt);
      p.vz *= Math.exp(-0.7 * dt);
      p.vy += (smoke ? 0.08 : -0.35) * dt;
      const age = 1 - p.life / p.ttl,
        fade = Math.min(1, p.life / (p.ttl * 0.22)),
        size = p.size * (0.65 + age * (smoke ? 2.4 : 1.5)) * fade;
      effectDummy.position.set(p.x, p.y, p.z);
      effectDummy.scale.setScalar(size);
      effectDummy.rotation.set(0, 0, 0);
    } else {
      effectDummy.position.set(0, -100, 0);
      effectDummy.scale.setScalar(0);
    }
    effectDummy.updateMatrix();
    pool.mesh.setMatrixAt(i, effectDummy.matrix);
  }
  pool.mesh.instanceMatrix.needsUpdate = true;
}
function clearEffectPool(pool) {
  for (const p of pool.particles) p.life = 0;
}
function stepEffects(dt) {
  effectClock.smoke -= dt;
  effectClock.dust -= dt;
  if (!exploreMode) {
    const record = vehicleFleet[activeVehicle],
      heading = drive.heading,
      c = Math.cos(heading),
      s = Math.sin(heading),
      localPoint = (x, y, z) => ({
        x: driveRoot.position.x + c * x + s * z,
        y,
        z: driveRoot.position.z - s * x + c * z,
      }),
      exhaust =
        record.exhaust ||
        (activeVehicle === 'excavator' ? { x: -1.72, y: 2.35, z: -0.62 } : { x: -1.8, y: 2.4, z: -0.7 });
    if (effectClock.smoke <= 0) {
      const p = localPoint(exhaust.x, exhaust.y, exhaust.z);
      spawnEffect(smokePool, p.x, p.y, p.z, 1, 'smoke');
      effectClock.smoke = 0.34;
    }
    const velocity = (Math.abs(drive.left) + Math.abs(drive.right)) * 0.5;
    if (velocity > 0.12 && effectClock.dust <= 0) {
      const back =
          activeVehicle === 'dumper'
            ? 3.5
            : activeVehicle === 'dozer'
              ? 2.7
              : activeVehicle === 'drill'
                ? 2.2
                : 1.45,
        lateral =
          activeVehicle === 'dumper' || activeVehicle === 'dozer'
            ? 1.55
            : activeVehicle === 'drill'
              ? 1.45
              : 1.05;
      for (const side of [-1, 1]) {
        const p = localPoint(-back, 0, side * lateral);
        spawnEffect(dustPool, p.x, 0.08, p.z, 3, 'dust');
      }
      effectClock.dust = 0.14;
    }
    if (activeVehicle === 'dumper' && dumper.state.dumped && !lastDumperDumped) {
      const p = localPoint(-4.35, 0.1, 0);
      spawnEffect(dustPool, p.x, 0.14, p.z, 28, 'dust');
      for (let i = 0; i < 8; i++) scatterSoil(p.x, 0.18, p.z);
      if (soilSimulation && dumper.state.payloadVolume > 0) {
        const volume = dumper.state.payloadVolume,
          placed = soilSimulation.deposit(p.x, p.z, volume, 1.45);
        dumper.state.payloadVolume = Math.max(0, volume - placed);
        lastDumperDeposit = { x: p.x, z: p.z, volume: placed };
        soilSurfaceDirty = true;
      }
    }
  }
  lastDumperDumped = dumper.state.dumped;
  updateSoilParticles(dt);
  updateEffectPool(dustPool, dt);
  updateEffectPool(smokePool, dt, true);
}
