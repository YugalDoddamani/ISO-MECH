/**
 * IsoMech V2 · Construction site · interactive yard
 *
 * Physics-backed props, loose soil particles, stockpile deformation, the per-step yard update
 * (props, bucket digging and dumping, track ruts, soil relaxation), terrain-following vehicle pose
 * and Reset Yard.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Lightweight, bounded yard interactions. Dynamic meshes must never enter bakeSite.
const yardRoot = group('Interactive yard', scene),
  yardBodies = [],
  yardHeaps = [],
  boreholes = [];
let activeBorehole = null,
  soilSimulation = null,
  soilSurfaceMesh = null,
  soilSurfaceDirty = true,
  lastBucketCutPoint = null;
function yardBody(object, kind) {
  const b = {
    object,
    kind,
    home: object.position.clone(),
    homeQuaternion: object.quaternion.clone(),
    vx: 0,
    vz: 0,
    fall: 0,
    active: false,
    impactCooldown: 0,
  };
  b.physics = yardPhysics.createProp(object, kind);
  yardBodies.push(b);
  return b;
}
const soilCount = 96,
  soilParticles = [],
  soilMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), S.sand, soilCount);
soilMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
soilMesh.frustumCulled = false;
yardRoot.add(soilMesh);
let soilCursor = 0;
for (let i = 0; i < soilCount; i++) soilParticles.push({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0 });
function scatterSoil(x, y, z) {
  for (let i = 0; i < 4; i++) {
    const p = soilParticles[soilCursor++ % soilCount];
    Object.assign(p, {
      life: 0.6 + rand() * 0.5,
      x,
      y,
      z,
      vx: (rand() - 0.5) * 1.8,
      vy: 0.8 + rand(),
      vz: (rand() - 0.5) * 1.8,
    });
  }
}
function deformHeap(heap, point, dt) {
  const a = heap.geometry.attributes.position;
  let changed = false;
  for (let i = 0; i < a.count; i++) {
    const dx = a.getX(i) + heap.position.x - point.x,
      dz = a.getZ(i) + heap.position.z - point.z,
      d = Math.hypot(dx, dz);
    if (d < 1.15 && a.getY(i) > 0.04 && point.y < a.getY(i) + 0.4) {
      const old = a.getY(i),
        next = Math.max(0.035, old - dt * 0.65 * (1 - d / 1.15));
      a.setY(i, next);
      changed = changed || next !== old;
    }
  }
  if (changed) {
    a.needsUpdate = true;
    heap.geometry.computeVertexNormals();
    heap.geometry.computeBoundingSphere();
    heap.userData.emission = (heap.userData.emission || 0) + dt;
    if (heap.userData.emission > 0.08) {
      heap.userData.emission = 0;
      scatterSoil(point.x, Math.max(0.08, point.y), point.z);
    }
  }
  return changed;
}
function stepYard(dt) {
  if (exploreMode) return;
  driveRoot.updateMatrixWorld(true);
  const tip = new THREE.Vector3();
  bucket.localToWorld(tip.set(-0.8, -0.65, 0));
  const speed = Math.abs(drive.left) + Math.abs(drive.right);
  yardPhysics.syncFleet(vehicleFleet, activeVehicle, driveRoot.position, drive.heading, dt);
  yardPhysics.step(dt);
  for (const b of yardBodies) {
    const body = yardPhysics.syncProp(b.object);
    if (!body) continue;
    b.impactCooldown = Math.max(0, b.impactCooldown - dt);
    b.vx = body.velocity.x;
    b.vz = body.velocity.z;
    const linear = body.velocity.lengthSquared(),
      angular = body.angularVelocity.lengthSquared();
    if (linear > 0.035 || angular > 0.08) b.active = true;
    if (b.active && b.impactCooldown <= 0 && linear > 1.2) {
      spawnEffect(dustPool, b.object.position.x, 0.18, b.object.position.z, 4, 'dust');
      b.impactCooldown = 0.34;
    }
    if (b.kind === 'cone') {
      const rotation = new window.CANNON.Vec3();
      body.quaternion.toEuler(rotation);
      b.fall = Math.max(b.fall, Math.min(Math.PI / 2, Math.hypot(rotation.x, rotation.z)));
    }
  }
  if (activeVehicle === 'excavator' && soilSimulation) {
    if (!lastBucketCutPoint) lastBucketCutPoint = tip.clone();
    const removed = soilSimulation.scoopSweep(lastBucketCutPoint, tip, {
      radius: 0.72,
      capacity: soilSimulation.payloadCapacity,
    });
    if (removed > 1e-10) {
      soilSurfaceDirty = true;
      updateBucketPayloadVisual();
      scatterSoil(tip.x, Math.max(0.08, tip.y), tip.z);
    }
    lastBucketCutPoint.copy(tip);
    if (angles.bucket >= 128 && soilSimulation.bucketPayload > 1e-8) {
      const dumped = soilSimulation.dumpBucket(tip.x, tip.z, 1.2);
      if (dumped > 0) {
        soilSurfaceDirty = true;
        updateBucketPayloadVisual();
      }
    }
  }
  if (speed > 0.03 && soilSimulation) {
    const offsets =
      activeVehicle === 'dumper'
        ? [-3.55, -1.85, 2.65].flatMap(x => [-1.58, 1.58].map(z => [x, z]))
        : activeVehicle === 'dozer'
          ? [-2.4, 2.4].flatMap(x => [-1.58, 1.58].map(z => [x, z]))
          : activeVehicle === 'drill'
            ? [-2.4, 2.4].flatMap(x => [-1.6, 1.6].map(z => [x, z]))
            : [-1.48, 1.48].flatMap(x => [-1.13, 1.13].map(z => [x, z]));
    const c = Math.cos(drive.heading),
      s = Math.sin(drive.heading);
    for (const [localX, localZ] of offsets) {
      const x = driveRoot.position.x + c * localX + s * localZ,
        z = driveRoot.position.z - s * localX + c * localZ;
      soilSimulation.compact(x, z, 0.62, 0.0025);
    }
  }
  if (soilSimulation.relax(dt, 1) > 1e-10) soilSurfaceDirty = true;
  if (soilSurfaceDirty) updateSoilSurface();
  updateTerrainPose();
}
function updateTerrainPose() {
  if (exploreMode || !soilSimulation) return;
  let offsets, wheelbase, trackWidth;
  if (activeVehicle === 'dumper') {
    offsets = [-3.55, -1.85, 2.65].flatMap(x => [-1.58, 1.58].map(z => [x, z]));
    wheelbase = dumper.dimensions.wheelbase;
    trackWidth = dumper.dimensions.trackWidth;
  } else if (activeVehicle === 'drill') {
    offsets = [-2.4, 2.4].flatMap(x => [-1.6, 1.6].map(z => [x, z]));
    wheelbase = 4.8;
    trackWidth = 3.2;
  } else if (activeVehicle === 'dozer') {
    offsets = [-2.4, 2.4].flatMap(x => [-1.58, 1.58].map(z => [x, z]));
    wheelbase = 4.8;
    trackWidth = 3.16;
  } else {
    offsets = [-1.48, 1.48].flatMap(x => [-1.13, 1.13].map(z => [x, z]));
    wheelbase = 2.96;
    trackWidth = 2.26;
  }
  const c = Math.cos(drive.heading),
    s = Math.sin(drive.heading),
    samples = offsets.map(([lx, lz]) => {
      const x = driveRoot.position.x + c * lx + s * lz,
        z = driveRoot.position.z - s * lx + c * lz,
        sample = soilSimulation.sample(x, z);
      return { x: lx, z: lz, height: clamp(sample.height, -0.06, 4), softness: sample.softness };
    });
  const average = list => (list.length ? list.reduce((sum, p) => sum + p.height, 0) / list.length : 0),
    front = average(samples.filter(p => p.x > 0)),
    rear = average(samples.filter(p => p.x < 0)),
    left = average(samples.filter(p => p.z < 0)),
    right = average(samples.filter(p => p.z > 0));
  terrainResponse.height = average(samples);
  terrainResponse.pitch = clamp(Math.atan2(front - rear, wheelbase), -0.28, 0.28);
  terrainResponse.roll = clamp(Math.atan2(right - left, trackWidth), -0.22, 0.22);
  terrainResponse.softness = samples.reduce((sum, p) => sum + p.softness, 0) / Math.max(1, samples.length);
  driveRoot.position.y = terrainResponse.height;
  const record = vehicleFleet[activeVehicle];
  if (record) record.position.y = driveRoot.position.y;
  if (activeVehicle === 'excavator') {
    machine.rotation.z = rock.pitch + terrainResponse.pitch;
    machine.rotation.x = rock.roll + terrainResponse.roll;
  } else {
    const model = vehicleFleet[activeVehicle].model;
    model.rotation.x = terrainResponse.roll;
    model.rotation.z = terrainResponse.pitch;
  }
}
function updateSoilParticles(dt) {
  for (let i = 0; i < soilCount; i++) {
    const p = soilParticles[i];
    p.life -= dt;
    if (p.life > 0) {
      p.vy -= 5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.035, p.y + p.vy * dt);
      p.z += p.vz * dt;
    }
    effectDummy.position.set(p.x, p.life > 0 ? p.y : -10, p.z);
    effectDummy.rotation.set(0, 0, 0);
    effectDummy.scale.setScalar(p.life > 0 ? 1 : 0);
    effectDummy.updateMatrix();
    soilMesh.setMatrixAt(i, effectDummy.matrix);
  }
  soilMesh.instanceMatrix.needsUpdate = true;
}
function resetYard() {
  for (const b of yardBodies) {
    b.object.position.copy(b.home);
    b.object.quaternion.copy(b.homeQuaternion);
    yardPhysics.resetProp(b.object, b.home, b.homeQuaternion);
    b.vx = b.vz = b.fall = 0;
    b.active = false;
    b.impactCooldown = 0;
  }
  dumper.reset();
  lastDumperDumped = false;
  lastDumperDeposit = null;
  for (const h of yardHeaps) {
    h.userData.emission = 0;
    h.geometry.attributes.position.array.set(h.userData.original);
    h.geometry.attributes.position.needsUpdate = true;
    h.geometry.computeVertexNormals();
    h.geometry.computeBoundingSphere();
  }
  soilSimulation?.reset();
  soilSurfaceDirty = true;
  lastBucketCutPoint = null;
  updateSoilSurface();
  updateBucketPayloadVisual();
  for (let i = 0; i < soilCount; i++) {
    soilParticles[i].life = 0;
    dummy.position.set(0, -10, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    soilMesh.setMatrixAt(i, dummy.matrix);
  }
  soilMesh.instanceMatrix.needsUpdate = true;
  for (const hole of boreholes) yardRoot.remove(hole.root);
  boreholes.length = 0;
  activeBorehole = null;
  effectClock.drill = 0;
  clearEffectPool(dustPool);
  clearEffectPool(smokePool);
}
