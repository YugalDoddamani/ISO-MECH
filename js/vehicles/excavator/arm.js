/**
 * IsoMech V2 · EX–240 excavator · arm
 *
 * Boom, stick and bucket (with the soil payload visual), hydraulic rams, bucket linkage and hoses.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
let bucketPayloadVisual = null;
// Arm profiles are modeled in their local joint frames.
const boom = group('Boom pivot', upper, 0.9, 0.62, -0.19);
const boomShape = new THREE.Shape();
boomShape.moveTo(-0.21, -0.12);
boomShape.quadraticCurveTo(-0.35, 0.21, -0.12, 0.4);
boomShape.lineTo(0.78, 1.2);
boomShape.quadraticCurveTo(1.1, 1.52, 1.52, 1.5);
boomShape.lineTo(3.52, 1.12);
boomShape.quadraticCurveTo(3.8, 1.05, 3.74, 0.81);
boomShape.lineTo(3.43, 0.65);
boomShape.lineTo(1.46, 1.05);
boomShape.quadraticCurveTo(1.2, 1.06, 1.02, 0.86);
boomShape.lineTo(0.21, -0.13);
boomShape.closePath();
outlined(extrude(boomShape, 0.46, M.yellow, boom, 0, 0, 0, 0.04));
[-1, 1].forEach(s => {
  cylinder(0.22, 0.055, M.edge, boom, 0, 0, s * 0.265);
  cylinder(0.13, 0.08, M.steel, boom, 0, 0, s * 0.287);
  cylinder(0.065, 0.1, M.dark, boom, 0, 0, s * 0.305);
  cylinder(0.14, 0.05, M.edge, boom, 3.55, 0.9, s * 0.26);
  cylinder(0.085, 0.08, M.steel, boom, 3.55, 0.9, s * 0.285);
  label('IsoMech', 1.14, 0.19, boom, 2.2, 1.07, s * 0.272, s < 0 ? Math.PI : 0, '#655323');
});
const stick = group('Stick pivot', boom, 3.55, 0.9, 0);
const stickShape = shape([
  [-0.26, 0.2],
  [0.12, 0.31],
  [0.6, 0.24],
  [2.48, 0.14],
  [2.7, 0.02],
  [2.67, -0.16],
  [2.42, -0.23],
  [0.54, -0.2],
  [-0.28, -0.14],
]);
outlined(extrude(stickShape, 0.35, M.yellow, stick, 0, 0, 0, 0.035));
[-1, 1].forEach(s => {
  cylinder(0.16, 0.05, M.edge, stick, 0, 0, s * 0.215);
  cylinder(0.085, 0.08, M.steel, stick, 0, 0, s * 0.24);
  box(1.12, 0.018, 0.018, M.edge, stick, 1.56, 0.06, s * 0.208);
  cylinder(0.14, 0.06, M.edge, stick, 2.6, 0, s * 0.215);
  cylinder(0.07, 0.09, M.steel, stick, 2.6, 0, s * 0.245);
});
const bucket = group('Bucket pivot', stick, 2.6, 0, 0);
const bucketShape = new THREE.Shape();
bucketShape.moveTo(-0.22, 0.09);
bucketShape.lineTo(0.22, 0.12);
bucketShape.quadraticCurveTo(0.66, -0.02, 0.71, -0.45);
bucketShape.quadraticCurveTo(0.64, -0.83, 0.18, -0.89);
bucketShape.lineTo(-0.66, -0.78);
bucketShape.lineTo(-0.76, -0.65);
bucketShape.quadraticCurveTo(-0.14, -0.56, -0.22, 0.09);
[-1, 1].forEach(s => {
  outlined(extrude(bucketShape, 0.065, M.steel, bucket, 0, 0, s * 0.55, 0.015), 0x3b463d, 0.65);
  extrude(
    shape([
      [-0.19, 0.09],
      [0.14, 0.12],
      [0.3, -0.24],
      [0.04, -0.35],
      [-0.19, -0.2],
    ]),
    0.11,
    M.dark,
    bucket,
    0,
    0,
    s * 0.24,
    0.015
  );
  cylinder(0.1, 0.08, M.chrome, bucket, 0, 0, s * 0.325);
});
// Curved bucket back and floor form a hollow scoop, open at its cutting edge.
const shellPts = [
  [0.05, 0.07],
  [0.3, 0.04],
  [0.53, -0.11],
  [0.65, -0.37],
  [0.61, -0.58],
  [0.44, -0.75],
  [0.15, -0.82],
  [-0.28, -0.79],
  [-0.69, -0.69],
];
for (let i = 0; i < shellPts.length - 1; i++) {
  const a = new THREE.Vector2(...shellPts[i]),
    b = new THREE.Vector2(...shellPts[i + 1]),
    mid = a.clone().add(b).multiplyScalar(0.5);
  const plate = box(a.distanceTo(b) + 0.015, 0.055, 1.04, M.steel, bucket, mid.x, mid.y, 0);
  plate.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
}
box(0.16, 0.1, 1.14, M.dark, bucket, -0.69, -0.72, 0);
for (let i = 0; i < 5; i++) {
  outlined(
    extrude(
      shape([
        [-0.63, -0.63],
        [-0.75, -0.77],
        [-1.02, -0.72],
        [-0.89, -0.61],
      ]),
      0.135,
      M.steel,
      bucket,
      0,
      0,
      -0.44 + i * 0.22,
      0.008
    ),
    0x3b463d,
    0.4
  );
}
[-0.35, 0, 0.35].forEach(z => {
  const strip = box(0.1, 0.07, 0.055, M.dark, bucket, 0.48, -0.7, z);
  strip.rotation.z = 0.7;
});
bucketPayloadVisual = mesh(new THREE.SphereGeometry(1, 14, 9), mat('#8f7b55', 0.98, 0), bucket, 0, -0.54, 0);
bucketPayloadVisual.name = 'Live bucket payload';
bucketPayloadVisual.scale.set(0.29, 0.12, 0.42);
bucketPayloadVisual.visible = false;
// Hydraulic cylinders use world-space anchor positions, transformed to their shared parent.
const hydraulics = group('Hydraulics', upper);
const hyd = [];
function actuator(name, joint, pa, a, pb, b, r = 0.062) {
  const g = group(name, hydraulics),
    barrel = cylinder(r, 1, M.dark, g, 0, 0, 0, 'y', 16),
    sleeve = cylinder(r * 1.12, 0.09, M.yellow, g, 0, 0, 0, 'y', 16),
    piston = cylinder(r * 0.51, 1, M.chrome, g, 0, 0, 0, 'y', 12);
  const pinA = cylinder(r * 1.35, 0.15, M.steel, hydraulics),
    pinB = cylinder(r * 1.2, 0.13, M.steel, hydraulics);
  hyd.push({
    joint,
    radius: r,
    g,
    barrel,
    sleeve,
    piston,
    pinA,
    pinB,
    pa,
    a: new THREE.Vector3(...a),
    pb,
    b: new THREE.Vector3(...b),
    A: new THREE.Vector3(),
    B: new THREE.Vector3(),
    length: 0,
  });
}
[-0.31, 0.31].forEach(z =>
  actuator('Boom lift ram', 'boom', upper, [0.18, 0.44, -0.19 + z], boom, [1.3, 1.04, z], 0.085)
);
actuator('Stick reach ram', 'stick', boom, [1.22, 1.56, 0], stick, [0.45, 0.29, 0], 0.072);
actuator('Bucket curl ram', 'bucket', stick, [0.53, 0.28, 0], bucket, [0.04, 0.31, 0], 0.058);
// Bucket linkage gives the curl cylinder a visible bellcrank connection.
const link = group('Bucket linkage', bucket);
[-1, 1].forEach(s => {
  rod(new THREE.Vector3(0, 0, s * 0.19), new THREE.Vector3(0.04, 0.31, s * 0.19), 0.055, M.yellow, link);
  cylinder(0.065, 0.08, M.steel, link, 0.04, 0.31, s * 0.21);
});
// Fixed hoses along the boom and stick, with short flex loops at joints.
function tube(points, r, parent, material = M.black) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, 32, r, 6, false), material, parent);
}
[-0.14, 0.14].forEach(z => {
  tube(
    [
      [0.03, 0.26, z],
      [0.49, 0.9, z],
      [1.12, 1.61, z],
      [2.2, 1.39, z],
      [3.35, 1.17, z],
    ],
    0.021,
    boom
  );
  tube(
    [
      [0.12, 0.36, z],
      [0.44, 0.4, z],
      [1.3, 0.32, z],
      [2.2, 0.25, z],
    ],
    0.018,
    stick
  );
});
