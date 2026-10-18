/**
 * IsoMech V2 · Lighting
 *
 * Hemisphere sky light, the shadow-casting sun and a cool fill light.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
scene.add(new THREE.HemisphereLight(0xfff7df, 0x909a8c, 0.65));
const sun = new THREE.DirectionalLight(0xfff4db, 1.35);
sun.position.set(-3, 11, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10, near: 0.5, far: 35 });
sun.shadow.normalBias = 0.025;
sun.shadow.bias = -0.00015;
sun.shadow.radius = 4;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xd3dff0, 0.55);
fill.position.set(8, 5, -8);
scene.add(fill);
