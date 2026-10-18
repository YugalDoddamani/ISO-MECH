/**
 * IsoMech V2 · Construction site · bore marks
 *
 * Shallow bore marks left by the PR–180 auger (up to eight are kept).
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const boreholeDiskGeo = new THREE.CircleGeometry(0.4, 28);
boreholeDiskGeo.rotateX(-Math.PI / 2);
const boreholeRimGeo = new THREE.TorusGeometry(0.43, 0.055, 7, 28),
  boreholeMat = mat('#36362d', 0.08, 0.98),
  boreholeRimMat = mat('#806e4a', 0.02, 0.98);
function createBorehole(x, z) {
  if (boreholes.length >= 8) {
    const old = boreholes.shift();
    yardRoot.remove(old.root);
  }
  const root = group('Shallow drilled borehole', yardRoot, x, -0.004, z),
    disk = mesh(boreholeDiskGeo, boreholeMat, root, 0, 0, 0),
    rim = mesh(boreholeRimGeo, boreholeRimMat, root, 0, 0.008, 0);
  rim.rotation.x = Math.PI / 2;
  const hole = { root, disk, rim, x, z, depth: 0 };
  boreholes.push(hole);
  return hole;
}
