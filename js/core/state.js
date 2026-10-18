/**
 * IsoMech V2 · Shared application state
 *
 * Active vehicle and free-explore flags, the site/overview state (including the 90 × 68 m yard bounds),
 * the exploded-assembly state, and the free-explore camera state.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
let activeVehicle = 'drill',
  exploreMode = false,
  lastVehicle = 'drill',
  skipExploreOnNextCycle = false;
const site = {
  overview: true,
  viewBlend: 1,
  savedCamera: null,
  obstacles: [],
  lastCollision: -10000,
  bounds: { width: 90, depth: 68, halfWidth: 45, halfDepth: 34 },
};
const assembly = {
  mode: false,
  value: 0,
  target: 0,
  tween: null,
  pendingExit: null,
  savedAngles: null,
  savedCamera: null,
  selected: null,
  labels: true,
  guides: true,
};
const explorer = { position: new THREE.Vector3(28, 2, 4), speed: 5, keys: new Set() };
const exploreForward = new THREE.Vector3(),
  exploreRight = new THREE.Vector3(),
  exploreDelta = new THREE.Vector3();
