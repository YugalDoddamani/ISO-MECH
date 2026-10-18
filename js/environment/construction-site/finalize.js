/**
 * IsoMech V2 · Construction site · finalise
 *
 * Bakes static props by material, registers static obstacles with the physics world and adds the
 * shadow-catcher ground plane. Runs after every static prop has been created.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Bake static opaque props by material. This keeps the larger environment inexpensive to render.
function bakeSite(root) {
  root.updateMatrixWorld(true);
  const batches = new Map(),
    remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.transparent) return;
    const key = o.material.uuid + ':' + o.castShadow + ':' + o.receiveShadow;
    if (!batches.has(key))
      batches.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, parts: [] });
    let geo = o.geometry.clone();
    if (geo.index) geo = geo.toNonIndexed();
    geo.applyMatrix4(o.matrixWorld);
    batches.get(key).parts.push(geo);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const batch of batches.values()) {
    const geo = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      if (!batch.parts.every(g => g.attributes[name])) continue;
      let length = batch.parts.reduce((n, g) => n + g.attributes[name].array.length, 0),
        array = new Float32Array(length),
        offset = 0;
      for (const g of batch.parts) {
        array.set(g.attributes[name].array, offset);
        offset += g.attributes[name].array.length;
      }
      geo.setAttribute(name, new THREE.BufferAttribute(array, batch.parts[0].attributes[name].itemSize));
    }
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, batch.material);
    m.castShadow = batch.cast;
    m.receiveShadow = batch.receive;
    root.add(m);
    for (const g of batch.parts) g.dispose();
  }
}
bakeSite(siteProps);
for (const obstacle of site.obstacles) yardPhysics.addStaticObstacle(obstacle);
const ground = mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ opacity: 0.22 }),
  scene,
  0,
  -0.008,
  0
);
ground.rotation.x = -Math.PI / 2;
ground.castShadow = false;
ground.receiveShadow = true;
scene.add(sun.target);
sun.shadow.camera.far = 100;
