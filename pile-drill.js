/* IsoMech representative piling rig. Metres; +X is forward, +Y is up.
 * Visual proportions derived from the supplied multiview and prototype, not certified CAD.
 * Independent of the excavator's arm hierarchy and shared materials.
 */
window.createPileRig = function createPileRig(THREE) {
  'use strict';
  const root = new THREE.Group();
  root.name = 'IsoMech PR-180 rotary piling rig';
  const material = (color, metalness = .25) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(), roughness: .64, metalness,
  });
  const m = { yellow: material('#e8ad32'), edge: material('#a97220'),
    dark: material('#29312f'), black: material('#171d1d'), steel: material('#778181', .7),
    chrome: material('#bdc8c6', .85), glass: material('#465f60', .55), ivory: material('#ead8a3') };
  function group(name, parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
  }
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  const box = (w, h, d, mat, parent, x = 0, y = 0, z = 0) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);
  function cylinder(r, length, mat, parent, x = 0, y = 0, z = 0, axis = 'y') {
    const geo = new THREE.CylinderGeometry(r, r, length, 16);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    return mesh(geo, mat, parent, x, y, z);
  }
  function bar(a, b, radius, mat, parent) {
    const v = new THREE.Vector3().subVectors(b, a), o = cylinder(radius, v.length(), mat, parent);
    o.position.copy(a).add(b).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o;
  }
  function outline(o) {
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35),
      new THREE.LineBasicMaterial({ color: 0x463c22, transparent: true, opacity: .4 })));
    return o;
  }
  const trackWheels = [], shoes = [];
  // 6.0m long crawlers, 4.2m overall operating width.
  for (const side of [-1, 1]) {
    const crawler = group(side < 0 ? 'Port crawler' : 'Starboard crawler', root, 0, 0, side * 1.6);
    box(4.85, .62, .92, m.dark, crawler, 0, .65);
    for (let i = 0; i < 7; i++) {
      const wheel = group('Crawler roller', crawler, -2.25 + i * .75, .61);
      cylinder(i === 0 || i === 6 ? .53 : .38, .98, m.black, wheel, 0, 0, 0, 'z');
      cylinder(.26, 1.015, m.steel, wheel, 0, 0, 0, 'z');
      cylinder(.10, 1.035, m.dark, wheel, 0, 0, 0, 'z');
      trackWheels.push({ wheel, side });
    }
    // Stadium-loop tread shoes are instanced: two draw calls, not 140.
    const n = 70, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(.21, .11, 1), m.dark, n);
    inst.castShadow = inst.receiveShadow = true; inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crawler.add(inst); shoes.push({ inst, side, distance: 0 });
  }
  const helper = new THREE.Object3D(), straight = 4.8, radius = .55, perimeter = 2 * straight + 2 * Math.PI * radius;
  function trackPath(distance) {
    let d = ((distance % perimeter) + perimeter) % perimeter;
    if (d < straight) return [d - 2.4, 1.16, 0];
    d -= straight;
    if (d < Math.PI * radius) { const a = Math.PI / 2 - d / radius; return [2.4 + radius * Math.cos(a), .61 + radius * Math.sin(a), a - Math.PI / 2]; }
    d -= Math.PI * radius;
    if (d < straight) return [2.4 - d, .06, -Math.PI];
    d -= straight; const a = -Math.PI / 2 - d / radius;
    return [-2.4 + radius * Math.cos(a), .61 + radius * Math.sin(a), a - Math.PI / 2];
  }
  box(4.1, .4, 2.55, m.dark, root, 0, 1.07);
  cylinder(1.23, .23, m.steel, root, 0, 1.38);
  cylinder(1.12, .13, m.black, root, 0, 1.55);
  const deck = group('Slewing machinery deck', root, 0, 1.61);
  outline(box(5.5, .33, 3.3, m.dark, deck, -.15, .12));
  outline(box(3.65, 1.65, 3.15, m.yellow, deck, -1.05, 1.03));
  outline(box(.45, 1.5, 3.28, m.yellow, deck, -3.02, .98));
  box(3.75, .12, 3.2, m.edge, deck, -1.05, .32);
  box(3.8, .12, 2.9, m.dark, deck, -1.05, 1.91);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) box(.065, .64, .035, m.dark, deck, -2.5 + i * .12, 1.06, side * 1.59);
    outline(box(1.1, .7, .04, m.edge, deck, -.3, 1.05, side * 1.60));
    box(.75, .48, .05, m.dark, deck, -.3, 1.05, side * 1.63);
    box(4.1, .08, .36, m.steel, deck, -.9, .34, side * 1.82);
    // Safety walkways and continuous guard rails.
    for (let i = 0; i < 6; i++) bar(new THREE.Vector3(-2.8 + i * .7, 1.96, side * 1.4), new THREE.Vector3(-2.8 + i * .7, 2.55, side * 1.4), .025, m.dark, deck);
    bar(new THREE.Vector3(-2.8, 2.55, side * 1.4), new THREE.Vector3(.7, 2.55, side * 1.4), .025, m.dark, deck);
  }
  cylinder(.085, .65, m.black, deck, -1.8, 2.17, -.8);
  cylinder(.15, .13, m.dark, deck, -1.8, 2.53, -.8);
  const cab = group('Operator cabin', deck, 1.1, .3, 1.0);
  outline(box(1.55, 1.95, 1.25, m.yellow, cab, 0, .98));
  box(1.34, 1.05, 1.29, m.glass, cab, .02, 1.3);
  box(.04, 1.14, 1.34, m.dark, cab, -.45, 1.3);
  box(.05, 1.14, 1.34, m.dark, cab, .68, 1.3);
  box(1.42, .06, 1.34, m.dark, cab, .06, .79);
  box(1.65, .11, 1.38, m.dark, cab, 0, 2.02);
  box(.22, .06, .06, m.chrome, cab, -.24, .68, .68);
  for (let i = 0; i < 3; i++) box(.7, .08, .3, m.steel, deck, 1.1, -.2 + i * .2, 1.8);

  // Mast starts 0.75m above ground and reaches ~18.5m at the crown.
  const mast = group('Leader mast pivot', deck, 3.45, -.86, -.35);
  for (const z of [-.39, .39]) {
    box(.46, 17.4, .19, m.dark, mast, 0, 8.7, z);
    box(.08, 16.9, .085, m.steel, mast, .29, 8.65, z);
  }
  for (let i = 0; i < 18; i++) box(.32, .12, .82, m.black, mast, -.08, .6 + i * .95);
  outline(box(.95, .28, 1.32, m.dark, mast, .07, 17.42));
  for (const z of [-.46, 0, .46]) cylinder(.23, .12, m.steel, mast, .02, 17.48, z, 'z');
  box(.62, .34, 1.08, m.black, mast, 0, .18);
  // Raking support cables and lower parallelogram links.
  for (const z of [-.55, .55]) {
    bar(new THREE.Vector3(-.25, 17.4, z), new THREE.Vector3(-.7, 1.3, z), .022, m.steel, mast);
    for (const y of [.05, .75]) bar(new THREE.Vector3(1.6, y, z), new THREE.Vector3(3.45, y - .6, z), .11, m.dark, deck);
  }
  const feed = group('Rotary head feed carriage', mast, .56, 4.8);
  outline(box(.78, 1.0, 1.25, m.dark, feed));
  cylinder(.52, .66, m.black, feed, .35, -.1);
  for (const z of [-.48, .48]) cylinder(.19, .64, m.dark, feed, .23, .65, z);
  const kelly = group('Telescoping Kelly and tool', feed, .53, -.15);
  cylinder(.18, 9.4, m.dark, kelly, 0, 4.7);
  cylinder(.23, .16, m.steel, kelly, 0, 9.42);
  cylinder(.20, 2.2, m.steel, kelly, 0, -1.1);
  const extension = group('Sliding inner Kelly section', kelly, 0, -2.1);
  cylinder(.135, 1.0, m.dark, extension, 0, -.42);
  const auger = group('Flighted auger', extension, 0, -.83);
  cylinder(.11, 1.25, m.dark, auger, 0, -.55);
  // Actual helical ribbon surfaces, rather than a wire wrapped around a cylinder.
  const verts = [], indices = [], turns = 2.7, segments = 144;
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * turns * Math.PI * 2, y = -.02 - i / segments * 1.2;
    for (const r of [.12, .43]) verts.push(Math.cos(a) * r, y, Math.sin(a) * r);
    if (i < segments) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const flightGeo = new THREE.BufferGeometry(); flightGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  flightGeo.setIndex(indices); flightGeo.computeVertexNormals();
  const flightMat = m.steel.clone(); flightMat.side = THREE.DoubleSide; mesh(flightGeo, flightMat, auger);
  const tip = mesh(new THREE.ConeGeometry(.16, .3, 12), m.dark, auger, 0, -1.32); tip.rotation.z = Math.PI;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3; box(.09, .12, .12, m.chrome, auger, Math.cos(a) * .38, -1.2, Math.sin(a) * .38);
  }
  const cableGeo = new THREE.BufferGeometry(); cableGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  const cable = new THREE.LineSegments(cableGeo, new THREE.LineBasicMaterial({ color: 0x576360 }));
  cable.frustumCulled = false; mast.add(cable);
  const tiltCylinders = [-.72, .72].map(z => ({
    base: new THREE.Vector3(1.0, .4, z), end: new THREE.Vector3(-.16, 3.4, z),
    housing: cylinder(.14, 1, m.dark, deck), rod: cylinder(.085, 1, m.chrome, deck),
  }));
  const state = { tilt: 0, head: 4.8, extension: .6, slew: 0, rpm: 0, spinning: false };
  const limits = { tilt: [-5, 10], head: [3.2, 7], extension: [0, 2.4], slew: [-180, 180] };
  const speeds = { tilt: 3, head: .65, extension: .45, slew: 12 };
  const v = new THREE.Vector3(), u = new THREE.Vector3(0, 1, 0);
  function set(key, value) { if (key in limits) state[key] = THREE.MathUtils.clamp(value, ...limits[key]); }
  function update(dt, leftSpeed = 0, rightSpeed = 0) {
    mast.rotation.z = THREE.MathUtils.degToRad(state.tilt); deck.rotation.y = THREE.MathUtils.degToRad(state.slew);
    feed.position.y = state.head; extension.position.y = -2.1 - state.extension;
    root.updateMatrixWorld(true);
    // A visual rig cannot penetrate the yard. Preserve feed position and retract Kelly if necessary.
    const bottom = auger.localToWorld(new THREE.Vector3(0, -1.47, 0));
    const rootY = root.getWorldPosition(v).y;
    if (bottom.y < rootY + .06) {
      const correction = (.06 + rootY - bottom.y) / Math.cos(mast.rotation.z);
      const retract = Math.min(state.extension, correction);
      state.extension -= retract; state.head = Math.min(limits.head[1], state.head + correction - retract);
      extension.position.y = -2.1 - state.extension; feed.position.y = state.head;
    }
    state.rpm += ((state.spinning ? 18 : 0) - state.rpm) * (1 - Math.exp(-5 * dt));
    kelly.rotation.y += state.rpm * Math.PI / 30 * dt;
    // Reuse one cable buffer. The prototype allocated/disposed geometry every frame.
    const a = cableGeo.attributes.position;
    a.setXYZ(0, .18, 17.3, -.28); a.setXYZ(1, .18, state.head + .5, -.28);
    a.setXYZ(2, .18, 17.3, .28); a.setXYZ(3, .18, state.head + .5, .28); a.needsUpdate = true;
    deck.updateWorldMatrix(true, true);
    for (const c of tiltCylinders) {
      const end = deck.worldToLocal(mast.localToWorld(c.end.clone())), delta = end.sub(c.base), length = delta.length();
      delta.normalize(); c.housing.position.copy(c.base).addScaledVector(delta, length * .25);
      c.rod.position.copy(c.base).addScaledVector(delta, length * .72);
      c.housing.quaternion.setFromUnitVectors(u, delta); c.rod.quaternion.copy(c.housing.quaternion);
      c.housing.scale.y = length * .5; c.rod.scale.y = length * .56;
    }
    for (const t of shoes) {
      t.distance += (t.side < 0 ? leftSpeed : rightSpeed) * dt;
      for (let i = 0; i < t.inst.count; i++) {
        const [x, y, angle] = trackPath(i / t.inst.count * perimeter + t.distance);
        helper.position.set(x, y, 0); helper.rotation.set(0, 0, angle); helper.updateMatrix(); t.inst.setMatrixAt(i, helper.matrix);
      }
      t.inst.instanceMatrix.needsUpdate = true;
    }
    for (const t of trackWheels) t.wheel.rotation.z -= (t.side < 0 ? leftSpeed : rightSpeed) * dt / .45;
  }
  function reset() {
    Object.assign(state, { tilt: 0, head: 4.8, extension: .6, slew: 0, rpm: 0, spinning: false });
    kelly.rotation.y = 0; for (const t of shoes) t.distance = 0;
    for (const t of trackWheels) t.wheel.rotation.z = 0; update(0);
  }
  update(0);
  return { root, deck, mast, feed, kelly, auger, state, limits, speeds, set, update, reset,
    dimensions: { crawlerLength: 6, width: 4.2, operatingHeight: 18.5, bodyLength: 5.7, augerDiameter: .86 } };
};
