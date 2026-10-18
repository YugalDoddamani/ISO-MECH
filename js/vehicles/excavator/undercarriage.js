/**
 * IsoMech V2 · EX–240 excavator · undercarriage
 *
 * Main chassis, both crawler tracks (instanced shoes on a stadium path) and the slewing bearing.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Chassis and crawler tracks. Each shoe is instanced along a stadium-shaped path.
const under = group('Undercarriage');
box(3.5, 0.38, 1.7, M.dark, under, 0, 0.65, 0);
box(2.2, 0.28, 2.5, M.dark, under, 0, 0.86, 0);
const trackGeo = new THREE.BoxGeometry(0.18, 0.115, 0.69),
  ridgeGeo = new THREE.BoxGeometry(0.055, 0.035, 0.71),
  dummy = new THREE.Object3D();
const trackSystems = [];
const half = 1.48,
  rr = 0.54,
  cy = 0.64,
  straight = half * 2,
  total = 2 * straight + 2 * Math.PI * rr,
  N = 64;
function path(t) {
  let d = (((t % 1) + 1) % 1) * total;
  if (d < straight) return { x: -half + d, y: cy + rr, a: 0 };
  d -= straight;
  if (d < Math.PI * rr) {
    const a = Math.PI / 2 - d / rr;
    return { x: half + rr * Math.cos(a), y: cy + rr * Math.sin(a), a: a - Math.PI / 2 };
  }
  d -= Math.PI * rr;
  if (d < straight) return { x: half - d, y: cy - rr, a: -Math.PI };
  d -= straight;
  const a = -Math.PI / 2 - d / rr;
  return { x: -half + rr * Math.cos(a), y: cy + rr * Math.sin(a), a: a - Math.PI / 2 };
}
[-1, 1].forEach(side => {
  const tr = group(side === -1 ? 'Left crawler' : 'Right crawler', under, 0, 0, side * 1.13),
    wheels = [];
  const band = new THREE.Shape();
  band.absarc(-half, cy, rr, Math.PI / 2, Math.PI * 1.5, false);
  band.lineTo(half, cy - rr);
  band.absarc(half, cy, rr, -Math.PI / 2, Math.PI / 2, false);
  band.closePath();
  extrude(band, 0.56, M.rubber, tr, 0, 0, 0, 0);
  box(2.75, 0.36, 0.63, M.dark, tr, 0, 0.68, 0);
  for (let i = 0; i < 6; i++) {
    let x = -1.25 + i * 0.5;
    const w = group('Lower roller', tr, x, 0.52, 0);
    wheels.push({ obj: w, r: 0.245 });
    cylinder(0.245, 0.65, M.steel, w);
    cylinder(0.16, 0.68, M.dark, w);
    cylinder(0.075, 0.7, M.red, w);
  }
  [-half, half].forEach((x, index) => {
    const w = group(index ? 'Idler' : 'Drive sprocket', tr, x, cy, 0);
    wheels.push({ obj: w, r: rr });
    cylinder(0.45, 0.59, M.dark, w);
    cylinder(0.35, 0.64, index ? M.steel : M.red, w);
    cylinder(0.24, 0.67, M.dark, w);
    cylinder(0.13, 0.7, M.steel, w);
    [-1, 1].forEach(f => {
      for (let i = 0; i < 10; i++) {
        let a = (i * Math.PI) / 5;
        cylinder(0.024, 0.025, M.chrome, w, Math.cos(a) * 0.27, Math.sin(a) * 0.27, f * 0.336, 'z', 6);
      }
    });
  });
  for (let i = 0; i < 3; i++) {
    const w = group('Return roller', tr, -0.8 + i * 0.8, 1.03, 0);
    cylinder(0.105, 0.64, M.steel, w);
    wheels.push({ obj: w, r: 0.105 });
  }
  const shoes = new THREE.InstancedMesh(trackGeo, M.track, N),
    ridges = new THREE.InstancedMesh(ridgeGeo, M.tread, N);
  shoes.castShadow = true;
  shoes.receiveShadow = true;
  ridges.castShadow = true;
  for (let i = 0; i < N; i++) {
    const p = path(i / N);
    dummy.position.set(p.x, p.y, 0);
    dummy.rotation.set(0, 0, p.a);
    dummy.updateMatrix();
    shoes.setMatrixAt(i, dummy.matrix);
    dummy.position.x -= Math.sin(p.a) * 0.075;
    dummy.position.y += Math.cos(p.a) * 0.075;
    dummy.updateMatrix();
    ridges.setMatrixAt(i, dummy.matrix);
  }
  tr.add(shoes, ridges);
  shoes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ridges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trackSystems.push({ side, shoes, ridges, wheels, phase: 0, distance: 0 });
  box(2.65, 0.08, 0.08, M.steel, tr, 0, 0.84, side * 0.35);
});
const slewGroup = group('Slewing bearing', under);
cylinder(0.87, 0.2, M.black, slewGroup, 0, 1.12, 0, 'y', 48);
cylinder(0.78, 0.13, M.steel, slewGroup, 0, 1.25, 0, 'y', 48);
for (let i = 0; i < 24; i++) {
  let a = (i * Math.PI) / 12;
  cylinder(0.027, 0.05, M.chrome, slewGroup, Math.cos(a) * 0.79, 1.33, Math.sin(a) * 0.79, 'y', 6);
}
