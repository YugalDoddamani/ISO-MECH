/**
 * IsoMech V2 · Camera
 *
 * Orthographic camera and OrbitControls, camera presets (ISO/FRONT/LEFT/RIGHT/REAR/TOP), auto orbit,
 * resize handling and the frustum that blends between close-up, assembly and site-overview framing.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 150);
const target = new THREE.Vector3(1, 1.85, 0);
camera.position.set(12, 9, 13);
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.target.copy(target);
orbit.enablePan = false;
orbit.enableDamping = true;
orbit.dampingFactor = 0.09;
orbit.minPolarAngle = 0.001;
orbit.maxPolarAngle = Math.PI / 2 - 0.015;
orbit.minZoom = 0.65;
orbit.maxZoom = 2.8;
orbit.autoRotateSpeed = 0.85;
orbit.update();
let viewTween = null,
  currentView = 'iso',
  auto = false;
// Camera presets use a consistent machine-space frame; body slew is independent.
const VIEWS = {
  iso: { theta: 48, phi: 65 },
  front: { theta: 90, phi: 87 },
  left: { theta: 0, phi: 87 },
  right: { theta: 180, phi: 87 },
  rear: { theta: -90, phi: 87 },
  top: { theta: 90, phi: 0.1 },
};
let aspect = 1,
  baseHalf = 6,
  activeTheta = 48,
  activePhi = 65;
function place(theta, phi) {
  const th = rad(theta),
    ph = rad(phi),
    d = 28;
  camera.position.set(
    target.x + d * Math.sin(ph) * Math.sin(th),
    target.y + d * Math.cos(ph),
    target.z + d * Math.sin(ph) * Math.cos(th)
  );
  camera.lookAt(target);
}
function view(name, instant = false) {
  if (site.overview) setSiteOverview(false, false);
  const v = VIEWS[name];
  let a = deg(orbit.getAzimuthalAngle()),
    diff = ((v.theta - a + 540) % 360) - 180;
  viewTween = {
    start: performance.now(),
    duration: instant || reduced ? 0 : 850,
    theta: a,
    diff,
    phi: deg(orbit.getPolarAngle()),
    endPhi: v.phi,
    zoom: camera.zoom,
  };
  currentView = name;
  if ($('#quickViewSelect')) $('#quickViewSelect').value = name;
  auto = false;
  orbit.autoRotate = false;
  $('#orbit').setAttribute('aria-pressed', 'false');
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === name));
}
$$('[data-view]').forEach(b => (b.onclick = () => view(b.dataset.view)));
$('#orbit').onclick = () => {
  auto = !auto;
  orbit.autoRotate = auto;
  $('#orbit').setAttribute('aria-pressed', auto);
  if (auto) {
    currentView = null;
    viewTween = null;
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }
};
orbit.addEventListener('start', () => {
  viewTween = null;
  currentView = null;
  auto = false;
  orbit.autoRotate = false;
  $('#orbit').setAttribute('aria-pressed', 'false');
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
});
function resize() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  aspect = w / h;
  renderer.setSize(w, h, false);
  updateFrustum();
}
new ResizeObserver(resize).observe(stage);
resize();
place(48, site.overview ? 34 : 65);
orbit.update();
function updateFrustum() {
  const normal = Math.max(
      window.innerWidth <= 760 ? 3.9 : 5.3,
      (window.innerWidth <= 760 ? 4.9 : 6.7) / aspect
    ),
    expanded = Math.max(window.innerWidth <= 760 ? 5.5 : 6.2, 8.2 / aspect);
  // Work mode frames the followed machine together with its working area.
  const close = workMode.active
      ? Math.max(workMode.follow === 'drill' ? 11.5 : 10, 9 / aspect)
      : activeVehicle === 'drill'
        ? Math.max(10.5, 7.2 / aspect)
        : normal + (expanded - normal) * assembly.value,
    siteHalf = Math.max(58, 62 / aspect);
  baseHalf = close + (siteHalf - close) * site.viewBlend;
  camera.left = -baseHalf * aspect;
  camera.right = baseHalf * aspect;
  camera.top = baseHalf;
  camera.bottom = -baseHalf;
  camera.updateProjectionMatrix();
}
