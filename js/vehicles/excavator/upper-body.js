/**
 * IsoMech V2 · EX–240 excavator · upper body
 *
 * Slewing upper structure, body housing and counterweight, service deck, operator cab and walkway.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Independent slewing body.
const upper = group('Upper body swivel', machine, 0, 1.34, 0);
outlined(
  extrude(
    shape([
      [-2, -0.01],
      [-2.13, 0.22],
      [-1.95, 0.42],
      [1.3, 0.42],
      [1.45, 0.27],
      [1.42, 0],
    ]),
    2.38,
    M.dark,
    upper
  )
);
const housing = group('Body housing and counterweight', upper);
const shell = extrude(
  shape([
    [-2.05, 0.32],
    [-2.12, 1.1],
    [-1.95, 1.34],
    [-0.55, 1.34],
    [-0.28, 1.13],
    [-0.24, 0.32],
  ]),
  2.3,
  M.yellow,
  housing,
  0,
  0,
  0,
  0.1
);
outlined(shell);
box(1.4, 0.1, 1.8, M.dark, housing, -1.24, 1.44, -0.05);
box(0.93, 0.08, 1.08, M.steel, housing, -1.29, 1.5, -0.12);
// Rounded rear counterweight seams and vents.
[-1, 1].forEach(s => {
  box(1.5, 0.025, 0.02, M.edge, housing, -1.15, 0.55, s * 1.225);
  box(0.025, 0.65, 0.024, M.edge, housing, -0.6, 0.91, s * 1.21);
  outlined(box(0.72, 0.52, 0.028, M.dark, housing, -1.52, 0.98, s * 1.23));
  for (let i = 0; i < 7; i++) box(0.63, 0.022, 0.035, M.steel, housing, -1.52, 0.78 + i * 0.06, s * 1.25);
  box(0.23, 0.025, 0.035, M.black, housing, -0.78, 1.1, s * 1.23);
  label('EX–240', 0.53, 0.14, housing, -0.85, 0.74, s * 1.247, s < 0 ? Math.PI : 0, '#413e2a');
  const accent = shape([
    [-1.9, 0.39],
    [-0.32, 0.39],
    [-0.7, 0.49],
    [-1.7, 0.49],
  ]);
  extrude(accent, 0.015, M.red, housing, 0, 0, s * 1.235, 0);
});
outlined(box(0.035, 0.49, 1.46, M.dark, housing, -2.225, 0.94, 0));
for (let i = 0; i < 9; i++) box(0.045, 0.026, 1.32, M.steel, housing, -2.25, 0.75 + i * 0.046, 0);
label('IsoMech', 1.05, 0.16, housing, -2.26, 0.48, 0, -Math.PI / 2, '#d8bc69');
cylinder(0.065, 0.66, M.dark, housing, -1.2, 1.82, -0.66, 'y', 12);
const exhaust = cylinder(0.066, 0.19, M.dark, housing, -1.15, 2.12, -0.66, 'y', 12);
exhaust.rotation.z = -0.55;
cylinder(0.095, 0.08, M.black, housing, -1.2, 1.54, -0.66, 'y', 12);
const engineDeck = group('Service deck cover', upper);
// Far side engine deck.
outlined(
  extrude(
    shape([
      [-0.35, 0.35],
      [1.22, 0.35],
      [1.12, 0.96],
      [0.82, 1.17],
      [-0.35, 1.17],
    ]),
    0.76,
    M.yellow,
    engineDeck,
    0,
    0,
    -0.72,
    0.06
  )
);
for (let i = 0; i < 7; i++) box(0.43, 0.026, 0.025, M.dark, engineDeck, 0.51, 0.67 + i * 0.06, -1.135);
// Cab, mounted on the near side, with a shaped frame and inset glazing.
const cab = group('Operator cab', upper, 0.2, 0.34, 0.67);
const cabProfile = shape([
  [-0.69, 0],
  [0.94, 0],
  [1.02, 0.5],
  [0.8, 1.92],
  [0.55, 2.08],
  [-0.6, 2.08],
  [-0.76, 1.82],
]);
const cabShell = outlined(extrude(cabProfile, 1.05, M.dark, cab, 0, 0, 0, 0.055), 0x17211d, 0.55);
const lowerProfile = shape([
  [-0.66, 0.08],
  [0.86, 0.08],
  [0.92, 0.42],
  [0.71, 0.69],
  [-0.65, 0.35],
]);
extrude(lowerProfile, 1.2, M.yellow, cab, 0, 0, 0, 0.018);
const windowRear = shape([
  [-0.57, 0.65],
  [-0.15, 0.75],
  [-0.15, 1.92],
  [-0.51, 1.92],
  [-0.59, 1.74],
]);
const windowFront = shape([
  [-0.04, 0.77],
  [0.78, 0.57],
  [0.6, 1.88],
  [-0.04, 1.92],
]);
[-1, 1].forEach(s => {
  extrude(windowRear, 0.018, M.glass, cab, 0, 0, s * 0.593, 0);
  extrude(windowFront, 0.018, M.glass, cab, 0, 0, s * 0.594, 0);
  box(0.025, 1.73, 0.02, M.black, cab, -0.1, 1.05, s * 0.607);
  box(0.17, 0.035, 0.04, M.steel, cab, -0.25, 0.6, s * 0.61);
  extrude(
    shape([
      [-0.48, 0.19],
      [0.65, 0.19],
      [0.33, 0.3],
      [-0.25, 0.28],
    ]),
    0.018,
    M.red,
    cab,
    0,
    0,
    s * 0.628,
    0
  );
});
const reflection = new THREE.MeshBasicMaterial({
  color: 0xb9d5cf,
  transparent: true,
  opacity: 0.13,
  depthWrite: false,
});
[-1, 1].forEach(s => {
  extrude(
    shape([
      [-0.025, 1.88],
      [0.57, 1.85],
      [0.15, 1.12],
      [-0.025, 1.17],
    ]),
    0.003,
    reflection,
    cab,
    0,
    0,
    s * 0.607,
    0
  );
});
const wind = box(0.024, 1.18, 0.89, M.glass, cab, 0.967, 1.21, 0);
wind.rotation.z = 0.155;
const wiper = box(0.025, 0.75, 0.018, M.black, cab, 0.999, 1.12, 0.08);
wiper.rotation.z = 0.14;
box(0.96, 0.026, 0.91, M.glass, cab, -0.03, 2.13, 0);
box(0.075, 0.05, 1.05, M.dark, cab, 0.09, 2.16, 0);
box(0.96, 0.07, 0.09, M.dark, cab, -0.03, 2.15, 0);
box(0.5, 0.06, 0.16, M.dark, cab, 0.54, 2.17, 0);
[-0.15, 0, 0.15].forEach(z => box(0.12, 0.08, 0.12, M.ivory, cab, 0.62, 2.18, z));
rod(new THREE.Vector3(0.58, 1.5, 0.57), new THREE.Vector3(0.7, 1.5, 0.85), 0.018, M.dark, cab);
box(0.07, 0.27, 0.15, M.dark, cab, 0.7, 1.49, 0.86);
box(0.075, 0.21, 0.11, M.glass, cab, 0.742, 1.49, 0.86);
box(0.9, 0.09, 0.27, M.dark, upper, 0.25, 0.12, 1.3);
box(0.8, 0.05, 0.3, M.steel, upper, 0.25, 0.18, 1.32);
for (let i = 0; i < 8; i++) box(0.025, 0.013, 0.28, M.black, upper, -0.07 + i * 0.09, 0.213, 1.32);
rod(new THREE.Vector3(0.94, 0.28, 1.18), new THREE.Vector3(0.85, 1.28, 1.18), 0.025, M.steel, upper);
