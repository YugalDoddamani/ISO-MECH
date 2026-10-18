/**
 * IsoMech V2 · Construction site · foundation and stockpiles
 *
 * Reinforced-concrete foundation bay and the faceted earth and aggregate stockpiles.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Reinforced-concrete foundation bay.
const foundation = group('Foundation works', siteProps, -11.6, 0, -9.2);
box(8.8, 0.16, 6.1, S.concrete, foundation, 0, 0.05, 0);
box(8.9, 0.14, 0.12, S.timber, foundation, 0, 0.17, -3.08);
box(8.9, 0.14, 0.12, S.timber, foundation, 0, 0.17, 3.08);
box(0.12, 0.14, 6.1, S.timber, foundation, -4.45, 0.17, 0);
box(0.12, 0.14, 6.1, S.timber, foundation, 4.45, 0.17, 0);
for (let x = -3.7; x <= 3.8; x += 1.85)
  for (let z = -2.2; z <= 2.3; z += 2.2) {
    box(0.85, 0.42, 0.85, S.concreteEdge, foundation, x, 0.34, z);
    [-0.22, 0.22].forEach(dx =>
      [-0.22, 0.22].forEach(dz => cylinder(0.025, 0.8, M.red, foundation, x + dx, 0.9, z + dz, 'y', 6))
    );
  }
for (let i = -4; i <= 4; i++) box(0.018, 0.014, 5.7, M.dark, foundation, i, 0.139, 0);
for (let i = -2; i <= 2; i++) box(8.5, 0.014, 0.018, M.dark, foundation, 0, 0.141, i);
obstacle(-11.6, -9.2, 9.1, 6.4, 'foundation works');
groundText('01 / FOUNDATION', -11.6, -5.3, 4.3, 0.35);
// Low-poly earth and aggregate heaps, built as faceted radial layers.
function heap(x, z, r, h, color, name) {
  const verts = [],
    idx = [],
    rings = 3,
    segments = 13;
  for (let j = 0; j < rings; j++) {
    const scale = [1, 0.78, 0.35][j],
      y = [0.02, h * 0.4, h * 0.85][j];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        rr = r * scale * (0.88 + rand() * 0.24);
      verts.push(Math.cos(a) * rr, y + (j ? rand() * 0.12 : 0), Math.sin(a) * rr);
    }
  }
  verts.push(-r * 0.08, h, 0);
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < segments; i++) {
      let a = j * segments + i,
        b = j * segments + ((i + 1) % segments),
        c = (j + 1) * segments + i,
        d = (j + 1) * segments + ((i + 1) % segments);
      idx.push(a, c, b, b, c, d);
    }
  for (let i = 0; i < segments; i++)
    idx.push(2 * segments + i, 3 * segments, 2 * segments + ((i + 1) % segments));
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const material = mat(color, 0.98, 0);
  material.flatShading = true;
  const m = mesh(geo, material, yardRoot, x, 0, z);
  m.name = name;
  m.userData.original = geo.attributes.position.array.slice();
  yardHeaps.push(m);
  obstacle(x, z, r * 1.75, r * 1.75, name);
  return m;
}
heap(11.5, -9.2, 3.15, 1.65, '#b7a477', 'earth stockpile');
heap(15.9, 9.9, 2.6, 1.45, '#909585', 'aggregate stockpile');
heap(11.5, 11.6, 1.9, 0.9, '#a7ab95', 'gravel bay');
groundText('02 / EARTHWORKS', 11.5, -5.15, 4.0, 0.35);
groundText('04 / AGGREGATE', 14.4, 6.1, 4, 0.34);
