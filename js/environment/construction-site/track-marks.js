/**
 * IsoMech V2 · Construction site · track marks
 *
 * Ring buffer of instanced tread and tyre impressions left in world space.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// A bounded ring buffer of shallow tread marks is left in world space as the crawler passes.
const trailMaterial = painted('#71775d', 0.25),
  trailMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.004, 0.57), trailMaterial, 4096);
trailMesh.count = 0;
trailMesh.frustumCulled = false;
trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
trailMesh.renderOrder = 2;
scene.add(trailMesh);
let trailCursor = 0,
  trailTotal = 0;
