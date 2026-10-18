/**
 * IsoMech V2 · Construction site · props
 *
 * Aggregate bins, pallets and pipes, masonry, the site office, safety cones, fuel drums, barricades,
 * perimeter fencing, the survey station and instanced gravel.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Aggregate bin retaining walls.
box(0.14, 0.85, 7.2, S.concreteEdge, siteProps, 19.2, 0.4, 10.6);
box(9, 0.85, 0.14, S.concreteEdge, siteProps, 14.7, 0.4, 14.2);
obstacle(19.2, 10.6, 0.3, 7.2, 'aggregate bay wall');
obstacle(14.7, 14.2, 9, 0.3, 'aggregate bay wall');
// Timber pallets and a bundle of steel pipes.
function pallet(parent, x, z) {
  const g = group('Timber pallet', parent, x, 0, z);
  [-0.6, 0, 0.6].forEach(q => box(0.16, 0.16, 1.2, S.timber, g, q, 0.09, 0));
  for (let k = 0; k < 6; k++) box(1.45, 0.06, 0.14, S.timberLight, g, 0, 0.21, -0.52 + k * 0.21);
  return g;
}
const pipeRack = group('Pipe storage', siteProps, 5.5, 0, 10.3);
pallet(pipeRack, -1.4, 0);
pallet(pipeRack, 1.4, 0);
const pipeGeo = new THREE.CylinderGeometry(0.25, 0.25, 4.8, 12, 1, true);
pipeGeo.rotateZ(Math.PI / 2);
const pipeMat = mat('#687365', 0.65, 0.45);
pipeMat.side = THREE.DoubleSide;
for (let row = 0; row < 2; row++)
  for (let k = 0; k < 3 - row; k++) {
    const z = -0.57 + k * 0.57 + row * 0.28,
      g = group('Loose steel pipe', yardRoot, 5.5, 0.52 + row * 0.48, 10.3 + z);
    mesh(pipeGeo, pipeMat, g);
    [-1, 1].forEach(side => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 5, 12), M.steel);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = side * 2.4;
      rim.castShadow = true;
      g.add(rim);
    });
    yardBody(g, 'pipe');
  }
groundText('03 / MATERIALS', 5.5, 7.8, 3.6, 0.32);
const blocks = group('Masonry pallets', siteProps, -7.5, 0, 10.3);
[-1.1, 1.1].forEach(x => {
  pallet(blocks, x, 0);
  for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++)
      box(0.39, 0.22, 0.95, S.concrete, blocks, x - 0.44 + k * 0.44, 0.4 + j * 0.24, 0);
});
obstacle(-7.5, 10.3, 4, 1.65, 'masonry pallets');
// Site office, corrugated walls, windows, a door and a shallow roof overhang.
const office = group('Site office', siteProps, -15.5, 0, 10.6);
box(5.8, 0.23, 3.2, M.dark, office, 0, 0.12, 0);
box(5.6, 2.55, 3, S.office, office, 0, 1.51, 0);
box(5.95, 0.15, 3.35, S.roof, office, 0, 2.84, 0);
for (let x = -2.6; x < 2.7; x += 0.22) {
  box(0.035, 2.42, 0.035, S.roof, office, x, 1.5, 1.52);
  box(0.035, 2.42, 0.035, S.roof, office, x, 1.5, -1.52);
}
for (let z = -1.4; z < 1.5; z += 0.22) {
  box(0.035, 2.42, 0.035, S.roof, office, 2.82, 1.5, z);
  box(0.035, 2.42, 0.035, S.roof, office, -2.82, 1.5, z);
}
[-1.5, 0.15].forEach(x => {
  box(1.14, 0.89, 0.055, M.dark, office, x, 1.76, 1.56);
  box(1.0, 0.75, 0.06, M.glass, office, x, 1.76, 1.6);
  box(0.035, 0.8, 0.07, S.roof, office, x, 1.76, 1.64);
});
box(0.83, 2.0, 0.06, M.dark, office, 1.83, 1.25, 1.57);
box(0.69, 1.86, 0.07, S.roof, office, 1.83, 1.25, 1.61);
box(0.06, 0.06, 0.09, M.chrome, office, 2.06, 1.2, 1.67);
box(1.15, 0.17, 0.5, S.concrete, office, 1.8, 0.13, 1.9);
label('SITE OFFICE', 2.1, 0.27, office, -0.7, 2.5, 1.61, 0, '#e5ddbb');
obstacle(-15.5, 10.7, 6.2, 3.7, 'site office');
// Safety cones and barriers use the excavator's ochre/orange palette.
function cone(x, z, collides = true) {
  const g = group('Safety cone', yardRoot, x, 0, z);
  box(0.42, 0.055, 0.42, M.dark, g, 0, 0.03, 0);
  mesh(new THREE.ConeGeometry(0.16, 0.55, 8), S.orange, g, 0, 0.33, 0);
  mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.13, 8), S.chalk, g, 0, 0.36, 0);
  if (collides) yardBody(g, 'cone');
}
[-18, -10, 8, 18].forEach(x => [-1, 1].forEach(s => cone(x, s * 4.35)));
cone(-4.7, -13.2);
cone(4.7, 13.2);
function fuelDrum(x, z, color = '#a96d36') {
  const g = group('Interactive fuel drum', yardRoot, x, 0, z),
    paint = mat(color, 0.52, 0.62);
  cylinder(0.36, 0.84, M.dark, g, 0, 0.42, 0, 'y', 18);
  cylinder(0.33, 0.78, paint, g, 0, 0.42, 0, 'y', 18);
  [0.2, 0.64].forEach(y => cylinder(0.37, 0.06, M.steel, g, 0, y, 0, 'y', 18));
  cylinder(0.34, 0.04, M.dark, g, 0, 0.86, 0, 'y', 18);
  cylinder(0.06, 0.025, M.bright, g, 0.16, 0.89, 0.08, 'y', 10);
  yardBody(g, 'barrel');
}
[
  [-18, 15],
  [-16.5, 15],
  [-18, 17],
  [-16.5, 17],
].forEach(([x, z], i) => fuelDrum(x, z, i % 2 ? '#a96d36' : '#7b633f'));
function barricade(x, z, rotation = 0) {
  const g = group('Safety barricade', siteProps, x, 0, z);
  g.rotation.y = rotation;
  [-0.75, 0.75].forEach(q => {
    box(0.11, 1.0, 0.11, M.dark, g, q, 0.5, 0);
    box(0.16, 0.09, 0.65, M.dark, g, q, 0.06, 0);
  });
  box(1.9, 0.34, 0.09, S.chalk, g, 0, 0.87, 0);
  for (let i = -2; i <= 2; i++) {
    const m = box(0.16, 0.33, 0.012, S.orange, g, i * 0.35, 0.87, 0.056);
    m.rotation.z = -0.38;
  }
  obstacle(x, z, rotation ? 1 : 2, rotation ? 2 : 1, 'safety barrier');
}
barricade(7.6, -7.3);
barricade(-6.3, -7.1, Math.PI / 2);
// Low perimeter fencing, with vehicle gates on both ends of the access lane.
function fenceSegment(ax, az, bx, bz) {
  const a = new THREE.Vector3(ax, 0, az),
    b = new THREE.Vector3(bx, 0, bz),
    length = a.distanceTo(b),
    n = Math.ceil(length / 3);
  for (let i = 0; i <= n; i++) {
    const q = a.clone().lerp(b, i / n);
    box(0.075, 1.45, 0.075, S.fence, siteProps, q.x, 0.7, q.z);
  }
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, i / n),
      q = a.clone().lerp(b, (i + 1) / n);
    [0.24, 1.25].forEach(y =>
      rod(new THREE.Vector3(p.x, y, p.z), new THREE.Vector3(q.x, y, q.z), 0.022, S.fence, siteProps, 6)
    );
    rod(new THREE.Vector3(p.x, 0.24, p.z), new THREE.Vector3(q.x, 1.25, q.z), 0.009, S.fence, siteProps, 5);
  }
}
fenceSegment(-44.8, -33.8, 44.8, -33.8);
fenceSegment(-44.8, 33.8, 44.8, 33.8);
[-44.8, 44.8].forEach(x => {
  fenceSegment(x, -33.8, x, -4.8);
  fenceSegment(x, 4.8, x, 33.8);
});
// A small fixed survey station close to the starting lane makes camera-follow travel obvious.
const survey = group('Survey marker', siteProps, -3.5, 0, 5.6);
box(0.13, 1.2, 0.13, S.timber, survey, 0, 0.6, 0);
box(1.35, 0.72, 0.09, M.dark, survey, 0, 1.45, 0);
label('IsoMech', 1.13, 0.22, survey, 0, 1.55, 0.051, 0, '#efce70');
label('ACTIVE SITE', 1.0, 0.15, survey, 0, 1.29, 0.052, 0, '#d8e0c6');
obstacle(-3.5, 5.6, 0.45, 0.45, 'survey sign');
// Scattered low-poly gravel is instanced rather than modeled as hundreds of separate draw calls.
const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), S.stone, 720);
let stoneCount = 0;
for (let i = 0; i < 720; i++) {
  let x = (rand() - 0.5) * 87,
    z = (rand() - 0.5) * 65;
  const insideFleetApron = x > 17.5 && x < 43.5 && z > -20 && z < 34;
  if (Math.abs(x) < 4.1 || Math.abs(z) < 4.1 || insideFleetApron) continue;
  dummy.position.set(x, 0.025, z);
  dummy.rotation.set(rand(), rand() * 6, rand());
  const r = 0.025 + rand() * 0.07;
  dummy.scale.set(r, 0.02 + rand() * 0.035, r * 0.7);
  dummy.updateMatrix();
  stones.setMatrixAt(stoneCount++, dummy.matrix);
}
stones.count = stoneCount;
stones.receiveShadow = true;
siteProps.add(stones);
dummy.scale.set(1, 1, 1);
