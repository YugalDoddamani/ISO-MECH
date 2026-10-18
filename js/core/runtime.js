/**
 * IsoMech V2 · Runtime
 *
 * DOM helpers ($, $$), the start-up guard, the WebGL renderer, the scene and small math helpers.
 * This is the first application module; every later module relies on the names declared here.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const stage = document.getElementById('stage'),
  $ = s => document.querySelector(s),
  $$ = s => Array.from(document.querySelectorAll(s));
// Start-up guard. Libraries load from a CDN: if one is missing, or WebGL is unavailable, show the
// reason on the loading screen and stop. Later modules depend on this one, so once start-up has
// halted their follow-on errors are suppressed and only the root cause is logged.
function haltStartup(message, reason) {
  $('#loading').textContent = message;
  console.error('IsoMech start-up halted: ' + reason);
  window.addEventListener('error', event => event.preventDefault());
  throw new Error(reason);
}
if (!window.THREE) haltStartup('The 3D engine could not start.', 'three.js (window.THREE) did not load');
if (!window.CANNON)
  haltStartup('The physics engine could not start.', 'cannon-es (window.CANNON) did not load');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  haltStartup(
    'WebGL is unavailable. Try a browser with hardware acceleration.',
    'WebGL renderer could not be created: ' + e.message
  );
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0xe9e9e3, 0);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(),
  rad = d => (d * Math.PI) / 180,
  deg = r => (r * 180) / Math.PI,
  clamp = THREE.MathUtils.clamp;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function approach(value, target, rate, dt) {
  return value + clamp(target - value, -rate * dt, rate * dt);
}
