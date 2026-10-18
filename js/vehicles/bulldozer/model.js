/* IsoMech representative crawler dozer, based on the supplied multiview reference.
 * Metres; +X is forward, +Y is up. Illustrative procedural geometry, not OEM CAD.
 */
window.createBulldozer = function createBulldozer(THREE) {
  'use strict';
  const root = new THREE.Group();
  root.name = 'IsoMech crawler bulldozer';
  const material = (color, metalness = .18, roughness = .68) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(), metalness, roughness,
  });
  const m = {
    yellow: material('#e7ad32', .22, .56), yellowLight: material('#f2c044', .17, .52),
    edge: material('#a87520', .38, .62), dark: material('#303632', .5, .68),
    rubber: material('#202522', .03, .94), track: material('#353b37', .28, .82),
    steel: material('#7c827b', .72, .48), bright: material('#c0c6bc', .83, .3),
    glass: material('#435858', .42, .3), glassLight: material('#91aaa0', .25, .32),
    black: material('#151a19', .1, .85), seat: material('#39372f', .08, .9),
  };
  function group(name, parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
  }
  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geometry, mat); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  const box = (w, h, d, mat, parent, x = 0, y = 0, z = 0) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);
  function cylinder(radius, length, mat, parent, x = 0, y = 0, z = 0, axis = 'y', segments = 16) {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
    if (axis === 'z') geometry.rotateX(Math.PI / 2);
    if (axis === 'x') geometry.rotateZ(Math.PI / 2);
    return mesh(geometry, mat, parent, x, y, z);
  }
  function outline(o, opacity = .32) {
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 38),
      new THREE.LineBasicMaterial({ color: 0x483b1d, transparent: true, opacity })));
    return o;
  }
  function label(text, width, height, parent, x, y, z, rotationY = 0) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d'); context.clearRect(0, 0, 512, 128);
    context.fillStyle = '#373528'; context.font = 'bold 56px Arial';
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 67);
    const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
    const sign = mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), parent, x, y, z);
    sign.rotation.y = rotationY; sign.castShadow = false; return sign;
  }

  const helper = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const trackSystems = [], trackWheels = [];
  const trackLength = 4.8, trackRadius = .54, trackCenterY = .59;
  const straight = trackLength, perimeter = 2 * straight + 2 * Math.PI * trackRadius;
  const shoeCount = 72;
  function trackPath(distance) {
    let d = ((distance % perimeter) + perimeter) % perimeter;
    if (d < straight) return [-straight / 2 + d, trackCenterY + trackRadius, 0];
    d -= straight;
    if (d < Math.PI * trackRadius) {
      const a = Math.PI / 2 - d / trackRadius;
      return [straight / 2 + trackRadius * Math.cos(a), trackCenterY + trackRadius * Math.sin(a), a - Math.PI / 2];
    }
    d -= Math.PI * trackRadius;
    if (d < straight) return [straight / 2 - d, trackCenterY - trackRadius, -Math.PI];
    d -= straight;
    const a = -Math.PI / 2 - d / trackRadius;
    return [-straight / 2 + trackRadius * Math.cos(a), trackCenterY + trackRadius * Math.sin(a), a - Math.PI / 2];
  }
  for (const side of [-1, 1]) {
    const crawler = group(side < 0 ? 'Left crawler track' : 'Right crawler track', root, 0, 0, side * 1.58);
    outline(box(5.15, .62, .88, m.rubber, crawler, 0, .59), .2);
    box(4.72, .48, .14, m.dark, crawler, 0, .65, side * .48);
    const wheelPositions = [-2.38, -1.72, -1.05, -.36, .36, 1.05, 1.72, 2.38];
    for (let i = 0; i < wheelPositions.length; i++) {
      const x = wheelPositions[i], endWheel = i === 0 || i === wheelPositions.length - 1;
      const radius = endWheel ? .49 : i === 3 || i === 4 ? .34 : .38;
      const wheel = group(endWheel ? 'Crawler end wheel' : 'Lower roller', crawler, x, .59);
      cylinder(radius, .82, m.black, wheel, 0, 0, 0, 'z', 20);
      cylinder(radius * .62, .855, i === 0 ? m.edge : m.steel, wheel, 0, 0, 0, 'z', 18);
      cylinder(radius * .24, .88, m.dark, wheel, 0, 0, 0, 'z', 12);
      if (endWheel) for (let bolt = 0; bolt < 8; bolt++) {
        const a = bolt * Math.PI / 4;
        cylinder(.035, .026, m.bright, wheel, Math.cos(a) * radius * .39,
          Math.sin(a) * radius * .39, side * .446, 'z', 6);
      }
      trackWheels.push({ wheel, side, radius });
    }
    for (let i = 0; i < 3; i++) {
      const roller = group('Upper track roller', crawler, -.9 + i * .9, 1.08);
      cylinder(.13, .68, m.steel, roller, 0, 0, 0, 'z', 12);
      trackWheels.push({ wheel: roller, side, radius: .13 });
    }
    const shoes = new THREE.InstancedMesh(new THREE.BoxGeometry(.23, .13, .82), m.track, shoeCount);
    shoes.castShadow = shoes.receiveShadow = true; crawler.add(shoes);
    const grousers = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .035, .85), m.steel, shoeCount);
    grousers.castShadow = true; crawler.add(grousers);
    for (let i = 0; i < shoeCount; i++) {
      const [x, y, angle] = trackPath(i / shoeCount * perimeter);
      helper.position.set(x, y, 0); helper.rotation.set(0, 0, angle); helper.updateMatrix(); shoes.setMatrixAt(i, helper.matrix);
      helper.position.x -= Math.sin(angle) * .08; helper.position.y += Math.cos(angle) * .08;
      helper.updateMatrix(); grousers.setMatrixAt(i, helper.matrix);
    }
    shoes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); grousers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trackSystems.push({ side, crawler, shoes, grousers, distance: 0, dirty: false, printDistance: 0, printSign: 0, lastPrint: null });
  }

  // Heavy belly pan, torsion frame and raised engine deck.
  box(5.0, .5, 2.78, m.dark, root, -.05, .9);
  box(4.1, .16, 2.88, m.steel, root, -.1, 1.18);
  outline(box(2.75, .42, 2.48, m.dark, root, -1.04, 1.28));
  const engine = group('Engine hood and radiator housing', root, .62, 1.15, 0);
  outline(box(2.35, 1.24, 2.42, m.yellow, engine, 0, .73));
  box(2.15, .18, 2.32, m.yellowLight, engine, -.03, 1.4);
  box(.13, .92, 1.45, m.black, engine, 1.19, .71);
  for (let i = 0; i < 12; i++) box(.035, .72, 1.3, m.steel, engine, 1.27, .71, -.6 + i * .11);
  for (const side of [-1, 1]) {
    const z = side * 1.23;
    box(1.28, .62, .045, m.edge, engine, -.16, .76, z);
    box(1.03, .42, .055, m.yellowLight, engine, -.16, .76, z + side * .028);
    for (let vent = 0; vent < 5; vent++) box(.065, .28, .018, m.dark, engine, -.58 + vent * .21, .76, z + side * .06);
    box(.34, .16, .07, m.dark, engine, .66, 1.15, z + side * .05);
    cylinder(.11, .055, m.bright, engine, .78, .76, z + side * .065, 'z', 12);
  }
  const exhaust = group('Exhaust stack', root, .14, 2.05, -.82);
  cylinder(.11, .98, m.black, exhaust, 0, .48);
  cylinder(.17, .11, m.dark, exhaust, 0, .98);
  cylinder(.13, .055, m.bright, exhaust, 0, 1.04);
  box(.34, .16, .12, m.dark, root, .25, 2.16, .84);

  // Glazed cab with chunky pillars, roof lip, steps and mirrors.
  const cab = group('Operator cab', root, -1.25, 1.34, 0);
  outline(box(1.72, 1.94, 1.72, m.yellow, cab, 0, .98));
  box(1.82, .16, 1.9, m.dark, cab, 0, 2.02);
  box(1.94, .16, 2.02, m.yellowLight, cab, 0, 2.13);
  // Front windscreen and rear glass, with clear structural mullions.
  box(.045, 1.34, 1.42, m.glass, cab, .84, 1.25);
  box(.075, 1.43, .09, m.dark, cab, .83, 1.24, -.52);
  box(.075, 1.43, .09, m.dark, cab, .83, 1.24, .52);
  box(.075, 1.43, .08, m.yellowLight, cab, .84, 1.24);
  box(.04, 1.16, 1.38, m.glass, cab, -.84, 1.24);
  box(.08, 1.34, .1, m.dark, cab, -.82, 1.24, -.54);
  box(.08, 1.34, .1, m.dark, cab, -.82, 1.24, .54);
  for (const side of [-1, 1]) {
    box(1.18, 1.1, .045, m.glass, cab, -.04, 1.27, side * .86);
    box(.075, 1.28, .08, m.dark, cab, -.62, 1.27, side * .88);
    box(.075, 1.28, .08, m.dark, cab, .56, 1.27, side * .88);
    box(1.22, .07, .08, m.dark, cab, -.04, .66, side * .88);
    box(.045, 1.0, .09, m.yellowLight, cab, -.04, 1.25, side * .91);
    box(.055, .22, .1, m.dark, cab, .28, .72, side * .92);
    const mirror = group('Cab mirror arm', cab, .64, 1.55, side * .86);
    box(.12, .045, .45, m.dark, mirror, .16, 0, side * .25);
    box(.17, .28, .08, m.dark, mirror, .29, .06, side * .48);
    box(.11, .21, .025, m.glassLight, mirror, .29, .06, side * .53);
  }
  box(.62, .12, .06, m.seat, cab, -.27, .52, 0);
  box(.12, .5, .12, m.seat, cab, -.52, .76, 0);
  cylinder(.065, .4, m.dark, cab, .44, .58, .18, 'z', 10);
  label('DOZER', .75, .18, engine, -.1, .37, 1.25);

  // Rear counterweight, drawbar and two-tooth ripper.
  outline(box(1.15, .86, 2.54, m.yellow, root, -2.68, 1.2));
  box(.13, .62, 2.15, m.dark, root, -3.3, 1.2);
  box(.26, .24, 1.9, m.steel, root, -3.35, .79);
  for (const z of [-.63, .63]) {
    const shank = group('Ripper shank', root, -3.48, 1.35, z);
    outline(box(.3, 1.2, .28, m.dark, shank, 0, -.34));
    box(.22, .16, .34, m.steel, shank, .05, -.89);
    const point = mesh(new THREE.ConeGeometry(.16, .42, 4), m.edge, shank, .08, -1.12);
    point.rotation.z = Math.PI;
    cylinder(.045, .06, m.bright, shank, .16, -.26, z * .08, 'z', 8);
  }

  // Curved six-way blade; the raised end cheeks and reinforced cutting edge follow the reference.
  const blade = group('Curved dozer blade', root, 3.05, .42, 0);
  const bladeState = { lift: 0, angle: 0 };
  const bladeLimits = { lift: [0, 1.25], angle: [-15, 15] };
  const bladeSpeeds = { lift: .7, angle: 12 };
  const columns = 16, rows = [0, .14, .38, .68, .9, 1], halfWidth = 2.72;
  const positions = [], indices = [];
  for (let row = 0; row < rows.length; row++) {
    const t = rows[row], y = .05 + t * 1.42;
    const bow = .12 + .42 * Math.sin(t * Math.PI * .9) + .06 * t;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns, z = (u * 2 - 1) * halfWidth;
      const sideSweep = Math.abs(u * 2 - 1) ** 3 * .18;
      positions.push(bow - sideSweep, y, z);
      if (row < rows.length - 1 && col < columns) {
        const a = row * (columns + 1) + col, b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const bladeGeometry = new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  bladeGeometry.setIndex(indices); bladeGeometry.computeVertexNormals();
  const bladeMaterial = m.yellow.clone(); bladeMaterial.side = THREE.DoubleSide;
  mesh(bladeGeometry, bladeMaterial, blade);
  box(.2, .14, 5.46, m.yellowLight, blade, .42, 1.45);
  box(.25, .2, 5.58, m.steel, blade, .3, .12);
  box(.28, .09, 5.58, m.dark, blade, .31, .025);
  for (let bolt = 0; bolt < 15; bolt++) {
    cylinder(.035, .035, m.bright, blade, .45, .13, -2.48 + bolt * .355, 'x', 8);
  }
  for (const side of [-1, 1]) {
    const cheek = group('Blade side cheek', blade, .12, .06, side * 2.55);
    const cheekShape = new THREE.Shape();
    cheekShape.moveTo(.0, .0); cheekShape.lineTo(.42, .22); cheekShape.lineTo(.3, 1.24);
    cheekShape.lineTo(-.08, 1.38); cheekShape.lineTo(-.05, .5); cheekShape.closePath();
    const cheekGeo = new THREE.ExtrudeGeometry(cheekShape, { depth: .16, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 1 });
    mesh(cheekGeo, m.yellowLight, cheek, 0, 0, side < 0 ? -.08 : 0);
    box(.12, .12, .38, m.dark, blade, .39, .18, side * 2.42);
  }

  function makeBar(radius, mat) {
    const bar = cylinder(radius, 1, mat, root, 0, 0, 0, 'y', 12);
    return (a, b) => {
      const delta = new THREE.Vector3().subVectors(b, a), length = delta.length();
      bar.position.copy(a).add(b).multiplyScalar(.5);
      bar.quaternion.setFromUnitVectors(up, delta.normalize());
      bar.scale.set(1, length, 1);
    };
  }
  const bladeArms = [-1, 1].map(side => ({
    side,
    push: makeBar(.13, m.dark),
    liftCylinder: makeBar(.14, m.black),
    liftRod: makeBar(.075, m.bright),
  }));
  function updateBladeLinkages() {
    root.updateMatrixWorld(true);
    for (const arm of bladeArms) {
      const sign = arm.side;
      const anchor = new THREE.Vector3(.42, .68, sign * 1.15);
      const bladeEnd = root.worldToLocal(blade.localToWorld(new THREE.Vector3(-.12, .46, sign * 2.18)));
      const cylBase = new THREE.Vector3(.72, .73, sign * 1.08);
      const cylEnd = root.worldToLocal(blade.localToWorld(new THREE.Vector3(-.05, .76, sign * 2.05)));
      const rodStart = cylBase.clone().lerp(cylEnd, .56);
      arm.push(anchor, bladeEnd);
      arm.liftCylinder(cylBase, cylEnd);
      arm.liftRod(rodStart, cylEnd);
    }
  }

  const state = bladeState;
  function set(key, value) {
    if (key in bladeLimits) state[key] = THREE.MathUtils.clamp(value, ...bladeLimits[key]);
  }
  function update(dt = 0, leftSpeed = 0, rightSpeed = 0) {
    blade.position.y = state.lift;
    blade.rotation.y = THREE.MathUtils.degToRad(state.angle);
    root.updateMatrixWorld(true); updateBladeLinkages();
    for (const track of trackSystems) {
      const speed = track.side < 0 ? leftSpeed : rightSpeed;
      track.distance += speed * dt;
      if (Math.abs(speed) > .00001) track.dirty = true;
      if (!track.dirty) continue;
      for (let i = 0; i < shoeCount; i++) {
        const [x, y, angle] = trackPath(i / shoeCount * perimeter + track.distance);
        helper.position.set(x, y, 0); helper.rotation.set(0, 0, angle); helper.updateMatrix();
        track.shoes.setMatrixAt(i, helper.matrix);
        helper.position.x -= Math.sin(angle) * .08; helper.position.y += Math.cos(angle) * .08;
        helper.updateMatrix(); track.grousers.setMatrixAt(i, helper.matrix);
      }
      track.shoes.instanceMatrix.needsUpdate = true; track.grousers.instanceMatrix.needsUpdate = true; track.dirty = false;
    }
    for (const track of trackWheels) {
      const speed = track.side < 0 ? leftSpeed : rightSpeed;
      track.wheel.rotation.z -= speed * dt / track.radius;
    }
  }
  function reset() {
    Object.assign(state, { lift: 0, angle: 0 });
    for (const track of trackSystems) {
      track.distance = 0; track.dirty = true; track.printDistance = 0; track.printSign = 0; track.lastPrint = null;
    }
    for (const track of trackWheels) track.wheel.rotation.z = 0;
    update(0);
  }
  update(0);
  return {
    root, blade, state, limits: bladeLimits, speeds: bladeSpeeds, set, update, reset,
    tracks: trackSystems,
    dimensions: { length: 7.3, width: 5.6, height: 3.55, bladeWidth: 5.6, footprint: { hx: 4.35, hz: 2.75 } },
  };
};
