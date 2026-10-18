/**
 * IsoMech V2 · EX–240 excavator · internals
 *
 * Illustrative engine and pumps, reservoir and valves, electrical harness, the open cab frame and seat,
 * and the separable roof and glazing used by the exploded assembly view.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// System-level internals are illustrative, newly modeled for inspection mode.
const engineCore = group('Engine and pumps', upper, -1.22, 0.54, -0.06);
outlined(box(1.02, 0.53, 0.76, M.steel, engineCore, 0, 0.23, 0));
box(0.96, 0.12, 0.63, M.dark, engineCore, 0, 0.57, 0);
for (let i = 0; i < 6; i++) {
  const x = -0.42 + i * 0.17;
  box(0.025, 0.48, 0.8, M.dark, engineCore, x, 0.25, 0);
  box(0.1, 0.09, 0.55, M.steel, engineCore, x, 0.68, 0);
  cylinder(0.065, 0.12, M.chrome, engineCore, x, 0.73, 0.17, 'y', 10);
}
box(0.85, 0.16, 0.7, M.black, engineCore, 0, -0.07, 0);
cylinder(0.3, 0.12, M.dark, engineCore, 0.59, 0.24, 0, 'x', 24);
cylinder(0.22, 0.14, M.steel, engineCore, 0.66, 0.24, 0, 'x', 20);
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  const blade = box(
    0.04,
    0.19,
    0.065,
    M.black,
    engineCore,
    0.75,
    0.24 + Math.cos(a) * 0.13,
    Math.sin(a) * 0.13
  );
  blade.rotation.x = -a;
}
[-0.22, 0.22].forEach(z => {
  cylinder(0.14, 0.36, M.dark, engineCore, -0.65, 0.22, z, 'x', 16);
  cylinder(0.12, 0.09, M.steel, engineCore, -0.86, 0.22, z, 'x', 16);
  cylinder(0.04, 0.14, M.chrome, engineCore, -0.7, 0.42, z, 'y', 10);
});
tube(
  [
    [-0.4, 0.66, -0.25],
    [-0.55, 0.8, -0.25],
    [-0.7, 0.72, -0.2],
    [-0.7, 0.3, -0.22],
  ],
  0.035,
  engineCore
);
const valveSystem = group('Reservoir and control valves', upper, 0.33, 0.48, -0.66);
outlined(box(0.67, 0.68, 0.58, M.steel, valveSystem, -0.14, 0.27, 0));
cylinder(0.09, 0.08, M.dark, valveSystem, -0.2, 0.65, 0, 'y', 12);
box(0.045, 0.31, 0.016, M.glass, valveSystem, -0.18, 0.3, 0.301);
box(0.68, 0.13, 0.43, M.dark, valveSystem, 0.43, 0.02, 0.06);
for (let i = 0; i < 4; i++) {
  const x = 0.19 + i * 0.16;
  box(0.12, 0.28, 0.28, M.steel, valveSystem, x, 0.2, 0.07);
  cylinder(0.045, 0.17, M.dark, valveSystem, x, 0.4, 0.07, 'y', 10);
  cylinder(0.028, 0.12, M.red, valveSystem, x, 0.18, 0.29, 'z', 10);
  tube(
    [
      [x, 0.39, 0.07],
      [x, 0.57, 0.13],
      [x - 0.1, 0.59, -0.26],
      [-0.13, 0.5, -0.3],
    ],
    0.017,
    valveSystem
  );
}
const wireHarness = group('Electrical harness', upper, -0.4, 1.02, -0.1);
tube(
  [
    [-0.85, 0, -0.35],
    [-0.3, 0.03, -0.3],
    [0.2, 0, 0],
    [0.8, 0.04, 0.37],
  ],
  0.027,
  wireHarness
);
[
  [-0.7, -0.3],
  [-0.2, -0.3],
  [0.15, 0],
  [0.5, 0.2],
].forEach((p, i) => {
  const sign = i % 2 ? 1 : -1;
  tube(
    [
      [p[0], 0, p[1]],
      [p[0] + 0.1, 0.08, p[1] + sign * 0.25],
      [p[0] - 0.04, 0.1, p[1] + sign * 0.6],
    ],
    0.019,
    wireHarness
  );
  box(0.1, 0.1, 0.14, M.dark, wireHarness, p[0] - 0.04, 0.1, p[1] + sign * 0.6);
  box(0.06, 0.06, 0.05, M.ivory, wireHarness, p[0] - 0.04, 0.1, p[1] + sign * 0.69);
});
box(0.4, 0.035, 0.3, mat('#4a7356', 0.8, 0), wireHarness, 0.88, 0.02, 0.4);
for (let i = 0; i < 5; i++) box(0.045, 0.025, 0.11, M.black, wireHarness, 0.75 + i * 0.06, 0.05, 0.4);
// Open cab frame and a real seat replace the opaque shell as the cabin opens.
const cabFrame = group('Cab structural frame', cab),
  cabInterior = group('Seat and operator controls', cab, 0, 0, 0);
box(1.4, 0.09, 0.94, M.dark, cabFrame, 0.05, 0.13, 0);
[-0.52, 0.52].forEach(z => {
  rod(new THREE.Vector3(-0.65, 0.2, z), new THREE.Vector3(-0.6, 2.02, z), 0.045, M.dark, cabFrame);
  rod(new THREE.Vector3(0.91, 0.3, z), new THREE.Vector3(0.64, 2.0, z), 0.045, M.dark, cabFrame);
  rod(new THREE.Vector3(-0.6, 2.02, z), new THREE.Vector3(0.64, 2.0, z), 0.045, M.dark, cabFrame);
  rod(new THREE.Vector3(-0.1, 0.5, z), new THREE.Vector3(-0.1, 1.98, z), 0.027, M.dark, cabFrame);
});
box(0.44, 0.23, 0.48, M.dark, cabInterior, -0.23, 0.43, 0);
outlined(box(0.57, 0.15, 0.59, M.seat, cabInterior, -0.19, 0.64, 0));
const backrest = box(0.13, 0.63, 0.56, M.seat, cabInterior, -0.47, 0.99, 0);
backrest.rotation.z = 0.13;
box(0.15, 0.22, 0.37, M.seat, cabInterior, -0.51, 1.38, 0);
[-0.35, 0.35].forEach(z => {
  box(0.43, 0.09, 0.12, M.dark, cabInterior, -0.1, 0.83, z);
  cylinder(0.025, 0.18, M.steel, cabInterior, 0.06, 0.96, z, 'y', 8);
  const grip = box(0.07, 0.12, 0.07, M.black, cabInterior, 0.06, 1.08, z);
  grip.rotation.z = -0.2;
  box(0.17, 0.04, 0.12, M.steel, cabInterior, 0.42, 0.26, z * 0.6);
});
box(0.18, 0.36, 0.63, M.dark, cabInterior, 0.64, 0.5, 0);
const cabScreen = box(0.025, 0.17, 0.21, M.glass, cabInterior, 0.54, 0.72, -0.18);
cabScreen.rotation.z = -0.25;
// Existing glass and roof parts are separated, not duplicated floating panels.
const cabRoof = group('Roof panel', cab),
  glassNear = group('Near glazing', cab),
  glassFar = group('Far glazing', cab),
  frontGlass = group('Windscreen', cab);
for (const o of [...cab.children]) {
  if (
    o === cabRoof ||
    o === glassNear ||
    o === glassFar ||
    o === frontGlass ||
    o === cabFrame ||
    o === cabInterior ||
    o === cabShell
  )
    continue;
  if (o.position.y > 2.05) cabRoof.attach(o);
  else if (o === wind || o === wiper) frontGlass.attach(o);
  else if (
    (o.material === M.glass || o.material === reflection) &&
    Math.abs(o.position.z) > 0.57 &&
    o.position.y === 0
  )
    (o.position.z > 0 ? glassNear : glassFar).attach(o);
}
cabShell.material = cabShell.material.clone();
const cabOpaqueMaterial = cabShell.material;
