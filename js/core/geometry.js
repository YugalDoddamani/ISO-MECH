/**
 * IsoMech V2 · Geometry helpers
 *
 * Small builders used by the procedural models and the yard: group, mesh, box, cylinder, shape,
 * extrude, outlined, rod and canvas-texture labels.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
function group(name, parent = machine, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
}
function cylinder(r, h, material, parent, x = 0, y = 0, z = 0, axis = 'z', segments = 20) {
  const geo = new THREE.CylinderGeometry(r, r, h, segments);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  return mesh(geo, material, parent, x, y, z);
}
function shape(points) {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) s.lineTo(...points[i]);
  s.closePath();
  return s;
}
function extrude(s, depth, material, parent, x = 0, y = 0, z = 0, bevel = 0.025) {
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  return mesh(geo, material, parent, x, y, z);
}
function outlined(m, color = 0x6b581f, opacity = 0.34) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry, 32),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  m.add(line);
  return m;
}
function rod(a, b, r, material, parent, segments = 12) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = cylinder(r, v.length(), material, parent, 0, 0, 0, 'y', segments);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
function label(text, w, h, parent, x, y, z, rotY = 0, fg = '#f1cf77', bg = null) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const cx = c.getContext('2d');
  if (bg) {
    cx.fillStyle = bg;
    cx.fillRect(0, 0, 512, 128);
  }
  cx.fillStyle = fg;
  cx.font = 'bold 66px Arial';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(c);
  texture.encoding = THREE.sRGBEncoding;
  const m = mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    parent,
    x,
    y,
    z
  );
  m.rotation.y = rotY;
  m.castShadow = false;
  return m;
}
