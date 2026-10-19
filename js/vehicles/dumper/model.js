/* IsoMech generic off-highway dump truck, guided by the supplied multiview reference.
 * Metres; +X is forward, +Y is up. Illustrative geometry, not OEM CAD.
 */
window.createDumper = function createDumper(THREE) {
  'use strict';
  const root = new THREE.Group();
  root.name = 'IsoMech off-highway dumper';
  const mat = (color, metalness = .12, roughness = .7) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(), metalness, roughness,
  });
  const m = {
    yellow: mat('#e7ad32', .2, .55), yellowLight: mat('#f2c044', .14, .52),
    edge: mat('#a87520', .34, .65), dark: mat('#303632', .35, .72),
    rubber: mat('#202522', .02, .94), tread: mat('#343a36', .08, .93),
    steel: mat('#7c827b', .68, .5), bright: mat('#c0c6bc', .8, .32),
    glass: mat('#435858', .38, .32), glassLight: mat('#91aaa0', .2, .34), red: mat('#b94731', .12, .6),
    black: mat('#151a19', .08, .88), seat: mat('#39372f', .06, .9),
    gravel: mat('#8e8060', .02, .98),
  };
  function group(name, parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
  }
  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geometry, material); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  const box = (w, h, d, material, parent, x = 0, y = 0, z = 0) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  function cylinder(radius, length, material, parent, x = 0, y = 0, z = 0, axis = 'y', segments = 18) {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
    if (axis === 'z') geometry.rotateX(Math.PI / 2);
    if (axis === 'x') geometry.rotateZ(Math.PI / 2);
    return mesh(geometry, material, parent, x, y, z);
  }
  function outline(o, opacity = .34) {
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 36),
      new THREE.LineBasicMaterial({ color: 0x493d22, transparent: true, opacity })));
    return o;
  }
  function label(text, width, height, parent, x, y, z, rotationY = 0) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d'); context.clearRect(0, 0, 512, 128);
    context.fillStyle = '#383428'; context.font = 'bold 54px Arial';
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 67);
    const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
    const sign = mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), parent, x, y, z);
    sign.rotation.y = rotationY; sign.castShadow = false; return sign;
  }

  // Main box frame, axles, and six massive tires (one steer axle and two rear axles).
  box(8.1, .42, 2.45, m.dark, root, -.18, 1.35);
  box(5.4, .26, 2.7, m.steel, root, -.5, 1.57);
  const wheelSystems = [], tireX = [2.65, -1.85, -3.55], tireRadius = .86;
  for (const side of [-1, 1]) {
    for (let axle = 0; axle < tireX.length; axle++) {
      const x = tireX[axle], z = side * 1.58, wheel = group('Heavy tire', root, x, tireRadius, z);
      cylinder(tireRadius, .68, m.rubber, wheel, 0, 0, 0, 'z', 28);
      mesh(new THREE.TorusGeometry(.68, .18, 8, 24), m.tread, wheel, 0, 0, side * .22);
      cylinder(.52, .705, m.dark, wheel, 0, 0, side * .012, 'z', 24);
      cylinder(.4, .73, axle === 0 ? m.yellowLight : m.steel, wheel, 0, 0, side * .02, 'z', 24);
      cylinder(.15, .75, m.dark, wheel, 0, 0, side * .03, 'z', 16);
      for (let bolt = 0; bolt < 10; bolt++) {
        const a = bolt * Math.PI / 5;
        cylinder(.032, .028, m.bright, wheel, Math.cos(a) * .31, Math.sin(a) * .31,
          side * .39, 'z', 6);
      }
      wheelSystems.push({ wheel, side, axle, axleX: x, radius: tireRadius });
      // Wheel guards and small rectangular fenders.
      const fender = box(1.95, .12, .98, m.yellow, root, x, 1.75, side * 1.63);
      fender.rotation.z = axle === 0 ? .04 : -.025;
      box(.14, .18, .92, m.dark, root, x, 1.66, side * 1.63);
    }
  }
  for (const x of tireX) {
    cylinder(.19, 3.35, m.dark, root, x, .9, 0, 'z', 16);
  }
  // Front bumper, radiator/engine housing, access steps, and side tanks.
  outline(box(1.15, .78, 2.55, m.dark, root, 4.18, 1.42));
  box(.2, .82, 2.45, m.steel, root, 4.78, 1.43);
  for (let i = 0; i < 11; i++) box(.028, .58, 1.7, m.black, root, 4.895, 1.43, -.85 + i * .17);
  for (const side of [-1, 1]) {
    box(1.52, .88, .18, m.yellow, root, 1.42, 1.58, side * 1.35);
    box(.92, .42, .1, m.dark, root, 1.45, 1.55, side * 1.47);
    for (let rib = 0; rib < 5; rib++) box(.045, .3, .025, m.steel, root, 1.12 + rib * .16, 1.55, side * 1.535);
    box(.64, .22, .68, m.dark, root, 2.82, 1.22, side * 1.55);
    box(.15, .55, .12, m.yellowLight, root, 3.02, 1.53, side * 1.93);
    box(.21, .12, .19, m.dark, root, 4.56, 1.96, side * 1.31);
    box(.14, .08, .18, m.yellowLight, root, 4.61, 1.97, side * 1.41);
  }
  // Operator cab: tall wraparound glazing, protective rails, seat, and access ladder.
  const cab = group('Operator cab', root, 3.28, 1.78, 0);
  outline(box(1.8, 2.05, 1.95, m.yellow, cab, 0, 1.04));
  box(1.98, .17, 2.1, m.dark, cab, 0, 2.08);
  box(2.1, .16, 2.2, m.yellowLight, cab, 0, 2.2);
  box(.05, 1.48, 1.55, m.glass, cab, .88, 1.27);
  box(.08, 1.55, .12, m.dark, cab, .84, 1.26, -.59);
  box(.08, 1.55, .12, m.dark, cab, .84, 1.26, .59);
  box(.07, 1.51, .1, m.yellowLight, cab, .86, 1.26);
  box(.045, 1.32, 1.56, m.glass, cab, -.88, 1.27);
  for (const side of [-1, 1]) {
    box(1.25, 1.18, .05, m.glass, cab, -.06, 1.3, side * .98);
    box(.08, 1.42, .09, m.dark, cab, -.67, 1.29, side * 1.01);
    box(.08, 1.42, .09, m.dark, cab, .6, 1.29, side * 1.01);
    box(1.28, .07, .09, m.dark, cab, -.06, .71, side * 1.01);
    box(.045, 1.05, .09, m.yellowLight, cab, -.02, 1.3, side * 1.05);
    const mirror = group('Cab mirror arm', cab, .68, 1.58, side * 1.0);
    box(.12, .045, .44, m.dark, mirror, .15, 0, side * .24);
    box(.16, .25, .08, m.dark, mirror, .28, .06, side * .46);
    box(.1, .19, .025, m.glassLight, mirror, .28, .06, side * .51);
  }
  box(.64, .14, .12, m.seat, cab, -.36, .57, 0);
  box(.13, .48, .14, m.seat, cab, -.61, .82, 0);
  cylinder(.065, .4, m.dark, cab, .48, .54, .16, 'z', 10);
  // Handrails and the near-side access steps.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) box(.7, .1, .17, m.dark, root, 2.78 + i * .09, .42 + i * .23, side * 1.94);
    for (let i = 0; i < 4; i++) {
      cylinder(.025, .68, m.yellowLight, root, 2.5 + i * .42, 2.2, side * 1.82, 'y', 8);
    }
    for (let i = 0; i < 3; i++) box(.055, .55, .055, m.dark, root, 2.5 + i * .42, 2.46, side * 1.82);
  }
  // Exhaust stack and rear lights.
  const exhaust = group('Dumper exhaust stack', root, 1.55, 2.05, -.85);
  cylinder(.095, .92, m.black, exhaust, 0, .46);
  cylinder(.15, .1, m.dark, exhaust, 0, .94);
  cylinder(.11, .05, m.bright, exhaust, 0, 1.01);
  for (const side of [-1, 1]) {
    box(.32, .38, .12, m.red, root, -4.68, 1.45, side * 1.18);
    box(.18, .48, .12, m.yellowLight, root, -4.58, 1.74, side * 1.2);
  }

  // Large open-top haul body, hinged at the rear and raised by two hydraulic rams.
  const bedPivot = group('Hinged dump body', root, -3.38, 1.86, 0);
  const bed = group('Dump body tub', bedPivot);
  const bedFloor = box(5.35, .19, 3.02, m.dark, bed, 2.55, .18);
  outline(bedFloor, .23);
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-.08, .15); sideShape.lineTo(5.2, .15); sideShape.lineTo(5.3, 1.45);
  sideShape.lineTo(4.35, 2.62); sideShape.lineTo(.02, 2.46); sideShape.lineTo(-.42, 1.92); sideShape.closePath();
  function panel(side) {
    const geometry = new THREE.ExtrudeGeometry(sideShape, { depth: .13, bevelEnabled: true,
      bevelThickness: .035, bevelSize: .035, bevelSegments: 1 });
    geometry.translate(0, 0, -.065);
    const plate = mesh(geometry, m.yellow, bed, 0, 0, side * 1.48);
    outline(plate, .22);
    box(5.08, .1, .17, m.yellowLight, bed, 2.46, 2.5, side * 1.5);
    for (let i = 0; i < 8; i++) {
      const rib = box(.085, 1.28, .16, m.edge, bed, .42 + i * .59, 1.08, side * 1.56);
      rib.rotation.z = i < 2 ? -.04 : .02;
    }
    for (let i = 0; i < 7; i++) box(.035, .05, .08, m.dark, bed, .35 + i * .67, 2.35, side * 1.58);
  }
  panel(-1); panel(1);
  // Headboard and hinged tailgate close the tub while leaving its top open.
  const headboard = box(.2, 2.32, 2.94, m.yellow, bed, 5.12, 1.34);
  headboard.rotation.z = -.28;
  box(.18, 2.04, 2.95, m.yellow, bed, -.18, 1.15);
  for (let z of [-1, 1]) {
    cylinder(.16, .25, m.steel, bedPivot, -.02, .05, z * 1.58, 'z', 16);
    box(.22, .1, .22, m.dark, bed, .3, .2, z * 1.61);
  }
  // A bounded faceted payload visibly slides out as the body tips. A mound under the surface stones
  // grows with the carried volume, so loading by the excavator shows up pass by pass.
  const cargo = group('Loose aggregate payload', bed, 0, .42, 0);
  const mound = mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.gravel, cargo, 2.45, -.15, 0);
  mound.name = 'Payload mound';
  const stones = [];
  for (let i = 0; i < 24; i++) {
    const x = 1.0 + (i % 6) * .57, z = -1.05 + Math.floor(i / 6) * .68, lift = (i % 3) * .06;
    const stone = mesh(new THREE.IcosahedronGeometry(.22 + (i % 4) * .035, 0), m.gravel, cargo, x, .18 + lift, z);
    stone.scale.set(1.25, .75 + (i % 3) * .15, 1.05);
    stones.push({ stone, x, z, lift });
  }

  const up = new THREE.Vector3(0, 1, 0);
  function makeBar(radius, material) {
    const bar = cylinder(radius, 1, material, root, 0, 0, 0, 'y', 12);
    return (a, b) => {
      const delta = new THREE.Vector3().subVectors(b, a), length = delta.length();
      bar.position.copy(a).add(b).multiplyScalar(.5);
      bar.quaternion.setFromUnitVectors(up, delta.normalize());
      bar.scale.set(1, length, 1);
    };
  }
  const rams = [-1, 1].map(side => ({
    side, cylinder: makeBar(.16, m.black), rod: makeBar(.085, m.bright),
  }));
  const wheelbase = tireX[0] - (tireX[1] + tireX[2]) * .5, trackWidth = 3.16;
  const steering = { angle: 0, maxAngle: THREE.MathUtils.degToRad(32), wheelbase, trackWidth };
  // Volumes are m³ in the soil model. The body holds four EX-240 bucket passes and starts part-loaded.
  const initialPayloadVolume = .82, capacity = 3.28;
  const state = { tip: 0, dumped: false, dumpTimer: 0, payloadVolume: initialPayloadVolume };
  const limits = { tip: [0, 52] };
  const speeds = { tip: 24 };
  function set(key, value) {
    if (key in limits) state[key] = THREE.MathUtils.clamp(value, ...limits[key]);
  }
  let shownPayload = -1;
  function updateCargo() {
    if (state.payloadVolume === shownPayload) return;
    shownPayload = state.payloadVolume;
    const fill = THREE.MathUtils.clamp(state.payloadVolume / capacity, 0, 1), height = .1 + fill;
    mound.scale.set(2.3, height, 1.3);
    for (const s of stones) {
      const u = (s.x - 2.45) / 2.3, v = s.z / 1.3;
      s.stone.position.y = -.07 + height * Math.sqrt(Math.max(0, 1 - u * u - v * v)) + s.lift;
    }
  }
  function update(dt = 0, leftSpeed = 0, rightSpeed = 0, steerAngle = steering.angle) {
    steering.angle = THREE.MathUtils.clamp(steerAngle, -steering.maxAngle, steering.maxAngle);
    bedPivot.rotation.z = THREE.MathUtils.degToRad(state.tip);
    const slide = THREE.MathUtils.clamp(state.tip / 52, 0, 1);
    cargo.position.x = -slide * 1.7;
    const loaded = state.payloadVolume > 1e-6;
    // A lowered body that has been loaded again is ready for the next tip.
    if (state.dumped && loaded && state.tip < 1) state.dumped = false;
    if (!state.dumped && loaded && state.tip > 34) state.dumpTimer += dt;
    else if (state.tip <= 34) state.dumpTimer = 0;
    if (!state.dumped && state.dumpTimer > 1.1) state.dumped = true;
    cargo.visible = loaded && !state.dumped;
    updateCargo();
    root.updateMatrixWorld(true);
    for (const ram of rams) {
      const sign = ram.side;
      const base = new THREE.Vector3(-1.55, 1.34, sign * .94);
      const end = root.worldToLocal(bedPivot.localToWorld(new THREE.Vector3(2.3, .26, sign * .92)));
      const joint = base.clone().lerp(end, .58);
      ram.cylinder(base, joint); ram.rod(joint, end);
    }
    const tangent = Math.tan(steering.angle), turnRadius = Math.abs(tangent) > 1e-5 ? wheelbase / Math.abs(tangent) : Infinity;
    for (const wheel of wheelSystems) {
      const speed = wheel.side < 0 ? leftSpeed : rightSpeed;
      if (wheel.axle === 0 && Number.isFinite(turnRadius)) {
        const inside = steering.angle * -wheel.side > 0;
        const radius = Math.max(.25, turnRadius + (inside ? -trackWidth * .5 : trackWidth * .5));
        wheel.wheel.rotation.y = Math.sign(steering.angle) * Math.atan(wheelbase / radius);
      } else wheel.wheel.rotation.y = 0;
      wheel.wheel.rotation.z -= speed * dt / wheel.radius;
    }
    for (const track of tracks) track.distance += (track.side < 0 ? leftSpeed : rightSpeed) * dt;
  }
  const tracks = wheelSystems.map(wheel => ({ side: wheel.side, axle: wheel.axle, axleX: wheel.axleX, distance: 0, printDistance: 0, printSign: 0, lastPrint: null }));
  function reset() {
    Object.assign(state, { tip: 0, dumped: false, dumpTimer: 0, payloadVolume: initialPayloadVolume });
    steering.angle = 0;
    cargo.visible = true; cargo.position.set(0, .42, 0); bedPivot.rotation.z = 0;
    for (const track of tracks) { track.distance = 0; track.printDistance = 0; track.printSign = 0; track.lastPrint = null; }
    for (const wheel of wheelSystems) { wheel.wheel.rotation.y = 0; wheel.wheel.rotation.z = 0; }
    update(0);
  }
  label('DUMPER', .9, .2, root, 2.1, 1.63, 1.45);
  update(0);
  return {
    root, bed, bedPivot, cargo, state, limits, speeds, set, update, reset, tracks, wheelSystems, steering, capacity,
    // Dump body floor in bed space (x along the body, z across) and the rim height above the floor.
    body: { minX: -.125, maxX: 5.225, halfWidth: 1.5, floorY: .18, rimY: 2.5 },
    dimensions: { length: 10.3, width: 4.1, height: 4.5, wheelbase, trackWidth, footprint: { hx: 5.55, hz: 2.65 } },
  };
};
