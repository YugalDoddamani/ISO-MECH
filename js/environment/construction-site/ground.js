/**
 * IsoMech V2 · Construction site · ground
 *
 * Seeded random generator, site materials, procedural soil texture, ground planes, access lanes,
 * metre ticks, the fleet apron with four parking bays, ground lettering and the static obstacle list.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Construction yard: all surface textures and props are procedural and offline-safe.
const siteGround = group('Construction site ground', scene),
  siteProps = group('Site structures and materials', scene);
let siteSeed = 240;
const rand = () => {
  siteSeed = (Math.imul(siteSeed, 1664525) + 1013904223) >>> 0;
  return siteSeed / 4294967296;
};
const S = {
  concrete: mat('#a8ab9a', 0.96, 0.03),
  concreteEdge: mat('#838d80', 0.9, 0.06),
  timber: mat('#9c8355', 0.93, 0),
  timberLight: mat('#b49a65', 0.9, 0),
  orange: mat('#c88b39', 0.78, 0.1),
  chalk: mat('#dfd7b8', 0.95, 0),
  fence: mat('#6b7866', 0.7, 0.4),
  office: mat('#697563', 0.75, 0.15),
  roof: mat('#9aa28c', 0.78, 0.25),
  stone: mat('#8f9483', 0.95, 0),
  sand: mat('#b9a56d', 0.96, 0),
};
function soilTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#bcb9a2';
  x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 210; i++) {
    const px = rand() * 1024,
      py = rand() * 1024,
      r = 25 + rand() * 110,
      g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, i % 2 ? 'rgba(126,125,100,.08)' : 'rgba(227,218,180,.14)');
    g.addColorStop(1, 'rgba(180,176,145,0)');
    x.fillStyle = g;
    x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 14500; i++) {
    x.fillStyle = i % 3 ? 'rgba(100,104,83,.09)' : 'rgba(237,229,197,.2)';
    const size = 0.5 + rand() * 2;
    x.fillRect(rand() * 1024, rand() * 1024, size, size * 0.7);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return tex;
}
const dirtTexture = soilTexture(),
  dirtMat = new THREE.MeshBasicMaterial({ map: dirtTexture, color: 0xffffff, toneMapped: false });
const outside = mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshBasicMaterial({ color: new THREE.Color('#e5e5dc').convertSRGBToLinear(), toneMapped: false }),
  siteGround,
  0,
  -0.1,
  0
);
outside.rotation.x = -Math.PI / 2;
outside.castShadow = false;
const earth = mesh(
  new THREE.PlaneGeometry(site.bounds.width, site.bounds.depth),
  dirtMat,
  siteGround,
  0,
  -0.025,
  0
);
earth.rotation.x = -Math.PI / 2;
earth.castShadow = false;
const siteEdge = box(
  site.bounds.width,
  0.09,
  site.bounds.depth,
  mat('#a4aa91', 0.95, 0),
  siteGround,
  0,
  -0.075,
  0
);
siteEdge.castShadow = false;
const painted = (color, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(),
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
    toneMapped: false,
  });
const laneMat = painted('#a9aa91', 0.58),
  patchMat = painted('#c9bea0', 0.42),
  markMat = painted('#eee2b5', 0.67),
  darkMark = painted('#777c61', 0.5),
  apronMat = painted('#92978b', 0.88);
function groundPoly(points, material, y = -0.019) {
  const s = shape(points.map(p => [p[0], -p[1]])),
    m = mesh(new THREE.ShapeGeometry(s), material, siteGround, 0, y, 0);
  m.rotation.x = -Math.PI / 2;
  m.castShadow = false;
  return m;
}
function groundRect(w, d, x, z, material = markMat, y = -0.014, angle = 0) {
  const m = mesh(new THREE.PlaneGeometry(w, d), material, siteGround, x, y, z);
  m.rotation.set(-Math.PI / 2, 0, angle);
  m.castShadow = false;
  return m;
}
groundPoly(
  [
    [-44.5, -3.55],
    [-32, -3.7],
    [-20, -3.5],
    [-7, -3.75],
    [8, -3.55],
    [20, -3.8],
    [44.5, -3.8],
    [44.5, 3.65],
    [27, 3.45],
    [12, 3.8],
    [-9, 3.6],
    [-27, 3.8],
    [-44.5, 3.8],
  ],
  laneMat
);
groundPoly(
  [
    [-3.6, -33.4],
    [3.65, -33.4],
    [3.5, -20],
    [3.75, -8],
    [3.45, 8],
    [3.6, 33.4],
    [-3.65, 33.4],
    [-3.4, 18],
    [-3.75, -4],
  ],
  laneMat,
  -0.0185
);
for (let i = 0; i < 44; i++) {
  const cx = (rand() - 0.5) * 87,
    cz = (rand() - 0.5) * 65,
    rx = 0.4 + rand() * 1.9,
    rz = 0.3 + rand() * 1.2,
    pts = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx * (0.8 + rand() * 0.2), cz + Math.sin(a) * rz * (0.8 + rand() * 0.2)]);
  }
  groundPoly(pts, patchMat, -0.017);
}
// Lane edges, metre ticks and a marked fleet apron keep the expanded yard readable.
for (let x = -43; x <= 43; x += 2.2) {
  if (Math.abs(x) < 4) continue;
  [-1, 1].forEach(side => groundRect(0.85, 0.065, x, side * 3.95));
}
for (let z = -32; z <= 32; z += 2.2) {
  if (Math.abs(z) < 4) continue;
  [-1, 1].forEach(side => groundRect(0.065, 0.85, side * 3.95, z));
}
// The east-side apron is kept clear for the fleet and has individual full-size parking bays.
groundRect(25.5, 53, 30.5, 7.3, apronMat, -0.0155);
function parkingBay(x, z, labelText) {
  const length = 12,
    width = 9.5,
    edge = 0.12;
  groundRect(length, edge, x, z - width / 2, markMat, -0.012);
  groundRect(length, edge, x, z + width / 2, markMat, -0.012);
  groundRect(edge, width, x - length / 2, z, markMat, -0.012);
  groundRect(edge, width, x + length / 2, z, markMat, -0.012);
  groundText(labelText, x + 4.5, z + width / 2 - 0.45, 3.8, 0.27, '#e7e1c6');
}
[
  [-8, 'EX–240 BAY'],
  [4, 'PR–180 BAY'],
  [16, 'DOZER BAY'],
  [28, 'DUMPER BAY'],
].forEach(([z, labelText]) => parkingBay(28, z, labelText));
groundText('FLEET PARKING', 37, 25, 4.5, 0.34, '#e7e1c6');
[
  [-2.5, -1.8],
  [-2.5, 1.8],
  [2.5, -1.8],
  [2.5, 1.8],
].forEach(([x, z]) => {
  groundRect(0.55, 0.07, x + (x > 0 ? -0.24 : 0.24), z);
  groundRect(0.07, 0.55, x, z + (z > 0 ? -0.24 : 0.24));
});
function groundText(text, x, z, w = 3, h = 0.34, color = '#73785e', rot = 0) {
  const m = label(text, w, h, siteGround, x, -0.011, z, 0, color);
  m.rotation.set(-Math.PI / 2, 0, rot);
  return m;
}
groundText('PLANT ACCESS', 10, 2.8, 3.5, 0.34);
groundText('5 m', 5, -3.1, 0.7, 0.22);
groundText('10 m', 10, -3.1, 0.9, 0.22);
groundText('15 m', 15, -3.1, 0.9, 0.22);
groundText('SITE CENTER', -0.4, 2.8, 2.5, 0.28);
[-40, -30, -20, -10, 10, 20, 30, 40].forEach(x => {
  groundRect(0.045, 0.34, x, -3.5);
});
function obstacle(x, z, w, d, name) {
  site.obstacles.push({ x, z, hx: w / 2, hz: d / 2, name });
}
