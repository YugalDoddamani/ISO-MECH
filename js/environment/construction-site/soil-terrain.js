/**
 * IsoMech V2 · Construction site · deformable soil
 *
 * Creates the soil simulation (window.createSoilSimulation) and the vertex-coloured terrain mesh that
 * samples its heightfield (tinted by height, placed fill, cuts and loose soil), plus the excavator
 * bucket payload visual.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
soilSimulation = window.createSoilSimulation({
  cellSize: 0.5,
  columns: 97,
  rows: 105,
  originX: -4,
  originZ: -20,
  payloadCapacity: 0.82,
  piles: [
    { x: 11.5, z: -9.2, radius: 3.15, height: 1.65, softness: 0.86 },
    { x: 15.9, z: 9.9, radius: 2.6, height: 1.45, softness: 0.82 },
    { x: 11.5, z: 11.6, radius: 1.9, height: 0.9, softness: 0.78 },
  ],
});
const soilRegions = [
  { x: 11.5, z: -9.2, r: 4.2 },
  { x: 15.9, z: 9.9, r: 3.5 },
  { x: 11.5, z: 11.6, r: 2.8 },
  { x: 28, z: 4, r: 5.3 },
  { x: 34, z: -8, r: 8.5 },
  { x: 23.6, z: 28, r: 4.5 },
  // Fill pad at the end of the haul lane, where the dumper tips and the dozer spreads in work mode.
  { x: 35.5, z: -15.4, r: 5.2 },
];
const soilVertexCount = soilSimulation.columns * soilSimulation.rows,
  soilPositions = new Float32Array(soilVertexCount * 3),
  soilColors = new Float32Array(soilVertexCount * 3),
  soilIndices = [];
const soilBaseColor = new THREE.Color('#aa9a70').convertSRGBToLinear(),
  soilTopColor = new THREE.Color('#b8a878').convertSRGBToLinear(),
  soilFillColor = new THREE.Color('#8b7850').convertSRGBToLinear(),
  soilCutColor = new THREE.Color('#9b8256').convertSRGBToLinear(),
  soilFreshColor = new THREE.Color('#87754e').convertSRGBToLinear(),
  soilShade = new THREE.Color(),
  soilInitialHeights = soilSimulation.heights.slice(),
  soilInitialSoftness = soilSimulation.softness.slice();
/**
 * Soil colour for heightfield cell i. Heaps shade lighter towards their crest. Earthworks read from
 * above like a gentle cut-and-fill map: placed fill (dumped, pushed or spread, still visible once the
 * tracks have compacted it) is a darker brown, dug faces a warmer brown, and loose, just-moved soil a
 * little darker again. Untouched ground keeps its original colour.
 */
function soilColor(i) {
  const height = soilSimulation.heights[i],
    start = soilInitialHeights[i],
    shade = clamp(Math.max(0, height) / 1.8, 0, 1),
    fill = clamp((height - start) / 0.15, 0, 1),
    cut = clamp((start - Math.max(0, height)) / 0.35, 0, 1),
    loose = clamp((soilSimulation.softness[i] - soilInitialSoftness[i]) / 0.45, 0, 1);
  return soilShade
    .copy(soilBaseColor)
    .lerp(soilTopColor, shade * (1 - fill * 0.5))
    .lerp(soilCutColor, cut * 0.45)
    .lerp(soilFillColor, fill * 0.58)
    .lerp(soilFreshColor, loose * 0.3);
}
for (let row = 0; row < soilSimulation.rows; row++)
  for (let col = 0; col < soilSimulation.columns; col++) {
    const i = row * soilSimulation.columns + col,
      x = soilSimulation.originX + col * soilSimulation.cellSize,
      z = soilSimulation.originZ + row * soilSimulation.cellSize;
    soilPositions[i * 3] = x;
    soilPositions[i * 3 + 1] = 0.004 + Math.max(0, soilSimulation.heights[i]);
    soilPositions[i * 3 + 2] = z;
    const color = soilColor(i);
    soilColors[i * 3] = color.r;
    soilColors[i * 3 + 1] = color.g;
    soilColors[i * 3 + 2] = color.b;
  }
for (let row = 0; row < soilSimulation.rows - 1; row++)
  for (let col = 0; col < soilSimulation.columns - 1; col++) {
    const x = soilSimulation.originX + (col + 0.5) * soilSimulation.cellSize,
      z = soilSimulation.originZ + (row + 0.5) * soilSimulation.cellSize;
    if (!soilRegions.some(region => Math.hypot(x - region.x, z - region.z) <= region.r)) continue;
    const a = row * soilSimulation.columns + col,
      b = a + 1,
      c = a + soilSimulation.columns,
      d = c + 1;
    soilIndices.push(a, c, b, b, c, d);
  }
const soilGeometry = new THREE.BufferGeometry();
soilGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(soilPositions, 3).setUsage(THREE.DynamicDrawUsage)
);
soilGeometry.setAttribute('color', new THREE.BufferAttribute(soilColors, 3));
soilGeometry.setIndex(soilIndices);
soilGeometry.computeVertexNormals();
soilSurfaceMesh = new THREE.Mesh(
  soilGeometry,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, side: THREE.DoubleSide })
);
soilSurfaceMesh.name = 'Dynamic soil heightfield';
soilSurfaceMesh.castShadow = true;
soilSurfaceMesh.receiveShadow = true;
yardRoot.add(soilSurfaceMesh);
for (const oldHeap of yardHeaps) oldHeap.visible = false;
function updateSoilSurface() {
  if (!soilSurfaceDirty || !soilSurfaceMesh) return;
  const position = soilSurfaceMesh.geometry.attributes.position,
    color = soilSurfaceMesh.geometry.attributes.color;
  for (let i = 0; i < soilVertexCount; i++) {
    const height = soilSimulation.heights[i];
    position.setY(i, 0.004 + Math.max(0, height));
    const shade = soilColor(i);
    color.setXYZ(i, shade.r, shade.g, shade.b);
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  soilSurfaceMesh.geometry.computeVertexNormals();
  soilSurfaceMesh.geometry.computeBoundingSphere();
  soilSurfaceDirty = false;
}
function updateBucketPayloadVisual() {
  if (!bucketPayloadVisual || !soilSimulation) return;
  const fraction = clamp(soilSimulation.bucketPayload / soilSimulation.payloadCapacity, 0, 1);
  bucketPayloadVisual.visible = fraction > 0.01;
  bucketPayloadVisual.scale.set(0.24 + 0.16 * fraction, 0.08 + 0.13 * fraction, 0.29 + 0.17 * fraction);
}
updateSoilSurface();
updateBucketPayloadVisual();
