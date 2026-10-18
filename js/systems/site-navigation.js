/**
 * IsoMech V2 · Site navigation
 *
 * Oriented footprint collision between machines, the yard and obstacles; ground-track printing;
 * the bird’s-eye site overview and the live site plan.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Vehicle clearance uses oriented chassis footprints; soil piles/props remain lightweight yard interactions.
function vehiclePose(id) {
  const record = vehicleFleet[id];
  if (!record) return null;
  if (!exploreMode && id === activeVehicle)
    return { x: driveRoot.position.x, z: driveRoot.position.z, heading: drive.heading };
  return { x: record.carrier.position.x, z: record.carrier.position.z, heading: record.carrier.rotation.y };
}
function footprintsOverlap(ax, az, ah, ahx, ahz, bx, bz, bh, bhx, bhz) {
  const ca = Math.cos(ah),
    sa = Math.sin(ah),
    cb = Math.cos(bh),
    sb = Math.sin(bh),
    dx = bx - ax,
    dz = bz - az,
    axes = [
      [ca, -sa],
      [sa, ca],
      [cb, -sb],
      [sb, cb],
    ];
  const radius = (ux, uz, c, s, hx, hz) => hx * Math.abs(ux * c - uz * s) + hz * Math.abs(ux * s + uz * c);
  for (const [ux, uz] of axes) {
    if (
      Math.abs(dx * ux + dz * uz) >
      radius(ux, uz, ca, sa, ahx, ahz) + radius(ux, uz, cb, sb, bhx, bhz) + 1e-8
    )
      return false;
  }
  return true;
}
function siteCollision(x, z, heading, vehicle = activeVehicle) {
  const record = vehicleFleet[vehicle];
  if (!record) return 'Unknown vehicle';
  const { hx, hz } = record.footprint,
    c = Math.cos(heading),
    s = Math.sin(heading),
    extentX = Math.abs(c) * hx + Math.abs(s) * hz,
    extentZ = Math.abs(s) * hx + Math.abs(c) * hz,
    boundX = site.bounds.halfWidth - 0.55,
    boundZ = site.bounds.halfDepth - 0.55;
  if (x - extentX < -boundX || x + extentX > boundX || z - extentZ < -boundZ || z + extentZ > boundZ)
    return 'Site boundary';
  for (const o of site.obstacles) {
    if (footprintsOverlap(x, z, heading, hx, hz, o.x, o.z, 0, o.hx, o.hz)) return o.name;
  }
  for (const [id, other] of Object.entries(vehicleFleet)) {
    if (id === vehicle) continue;
    const parked = vehiclePose(id);
    if (
      footprintsOverlap(
        x,
        z,
        heading,
        hx,
        hz,
        parked.x,
        parked.z,
        parked.heading,
        other.footprint.hx,
        other.footprint.hz
      )
    )
      return other.label + ' parked';
  }
  return null;
}
function trackSystemsFor(vehicle = activeVehicle) {
  return vehicle === 'drill'
    ? pileRig.tracks
    : vehicle === 'dozer'
      ? dozer.tracks
      : vehicle === 'dumper'
        ? dumper.tracks
        : trackSystems;
}
function allTrackSystems() {
  return [...trackSystems, ...pileRig.tracks, ...dozer.tracks, ...dumper.tracks];
}
function resetTrailCursors() {
  for (const t of allTrackSystems()) {
    t.printDistance = t.distance;
    t.printSign = 0;
    t.lastPrint = null;
  }
}
function clearGroundTracks() {
  trailCursor = trailTotal = 0;
  trailMesh.count = 0;
  resetTrailCursors();
  notify('Track impressions cleared');
}
function updateGroundTracks() {
  if (assembly.mode || exploreMode) return;
  dummy.scale.set(activeVehicle === 'dumper' ? 4.5 : 1, 1, 1);
  const c = Math.cos(drive.heading),
    s = Math.sin(drive.heading),
    backOffset = activeVehicle === 'drill' ? 2.4 : activeVehicle === 'dozer' ? 2.85 : 1.5,
    lateralOffset =
      activeVehicle === 'drill' ? 1.6 : activeVehicle === 'dozer' || activeVehicle === 'dumper' ? 1.58 : 1.13;
  for (const t of trackSystemsFor()) {
    if (t.printDistance === undefined) t.printDistance = t.distance;
    const delta = t.distance - t.printDistance,
      sign = Math.sign(delta);
    if (Math.abs(delta) < 0.16) continue;
    const back = activeVehicle === 'dumper' ? t.axleX : -backOffset * sign,
      lateral = t.side * lateralOffset;
    const x = driveRoot.position.x + c * back + s * lateral,
      z = driveRoot.position.z - s * back + c * lateral;
    if (sign !== t.printSign) {
      t.printSign = sign;
      t.lastPrint = { x, z };
    }
    const n = Math.min(8, Math.floor(Math.abs(delta) / 0.16));
    for (let i = 1; i <= n; i++) {
      const f = i / n,
        px = t.lastPrint ? t.lastPrint.x + (x - t.lastPrint.x) * f : x,
        pz = t.lastPrint ? t.lastPrint.z + (z - t.lastPrint.z) * f : z;
      dummy.position.set(px, -0.009, pz);
      dummy.rotation.set(0, drive.heading, 0);
      dummy.updateMatrix();
      trailMesh.setMatrixAt(trailCursor, dummy.matrix);
      trailCursor = (trailCursor + 1) % 4096;
      trailTotal++;
    }
    t.lastPrint = { x, z };
    t.printDistance = t.distance;
    trailMesh.count = Math.min(trailTotal, 4096);
    trailMesh.instanceMatrix.needsUpdate = true;
  }
}
function setSiteOverview(on, restore = true) {
  if (assembly.mode && on) return;
  on = !!on;
  if (on === site.overview) return;
  if (on) {
    site.savedCamera = {
      theta: deg(orbit.getAzimuthalAngle()),
      phi: deg(orbit.getPolarAngle()),
      zoom: camera.zoom,
    };
  }
  site.overview = on;
  auto = false;
  orbit.autoRotate = false;
  $('#orbit').setAttribute('aria-pressed', 'false');
  if (on || restore) {
    const destination = on
        ? { theta: 48, phi: 34, zoom: 1 }
        : site.savedCamera || { theta: 48, phi: 65, zoom: 1 },
      start = deg(orbit.getAzimuthalAngle());
    viewTween = {
      start: performance.now(),
      duration: reduced ? 0 : 1100,
      theta: start,
      diff: ((destination.theta - start + 540) % 360) - 180,
      phi: deg(orbit.getPolarAngle()),
      endPhi: destination.phi,
      zoom: camera.zoom,
      zoomEnd: destination.zoom,
    };
  }
  currentView = null;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  document.body.classList.toggle('site-overview', on);
  updateSiteUI();
}
function updateSiteUI() {
  const x = exploreMode ? explorer.position.x : driveRoot.position.x,
    z = exploreMode ? explorer.position.z : driveRoot.position.z,
    heading = exploreMode
      ? Math.atan2(-(target.z - camera.position.z), target.x - camera.position.x)
      : drive.heading,
    activeMarker = $('#mapMachine');
  activeMarker.setAttribute(
    'transform',
    `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${-deg(heading)})`
  );
  activeMarker.querySelector('circle').setAttribute('fill', exploreMode ? '#42b9b2' : '#edbd3b');
  activeMarker.setAttribute(
    'aria-label',
    exploreMode ? 'Free explorer position' : 'Active ' + vehicleFleet[activeVehicle].label
  );
  let activeTitle = activeMarker.querySelector('title');
  if (!activeTitle) {
    activeTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    activeMarker.prepend(activeTitle);
  }
  activeTitle.textContent = exploreMode ? 'Free explorer' : 'Active ' + vehicleFleet[activeVehicle].label;
  const parked = Object.entries(vehicleFleet).filter(([id]) => exploreMode || id !== activeVehicle),
    markerColors = { excavator: '#748c73', drill: '#6d8ea7', dozer: '#a48142', dumper: '#d18d3b' },
    markerIds = ['mapInactiveMachine', 'mapInactiveMachine2', 'mapInactiveMachine3', 'mapInactiveMachine4'];
  markerIds.forEach((selector, index) => {
    const marker = $('#' + selector),
      entry = parked[index];
    if (!entry) {
      marker.style.display = 'none';
      return;
    }
    marker.style.display = '';
    const [id, record] = entry,
      pose = vehiclePose(id);
    marker.setAttribute(
      'transform',
      `translate(${pose.x.toFixed(2)} ${pose.z.toFixed(2)}) rotate(${-deg(pose.heading)})`
    );
    marker.setAttribute('aria-label', record.label + ' parked');
    marker.querySelector('circle').setAttribute('fill', markerColors[id]);
    let title = marker.querySelector('title');
    if (!title) {
      title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      marker.prepend(title);
    }
    title.textContent = record.label + ' parked';
  });
  $('#mapPosition').textContent =
    (exploreMode ? 'EXPLORER · ' : '') +
    `X ${x >= 0 ? '+' : ''}${x.toFixed(1)} / Z ${z >= 0 ? '+' : ''}${z.toFixed(1)} m`;
  $('#siteMapToggle').setAttribute('aria-pressed', site.overview);
  $('#siteMapLabel').textContent = site.overview ? '↙ FOLLOW MACHINE' : '↗ SITE OVERVIEW';
  $('#travelMapButton').textContent = site.overview ? '↙ FOLLOW MACHINE' : '↗ SITE OVERVIEW';
  $('#travelMapButton').setAttribute('aria-pressed', site.overview);
}
function updateSiteFrame(dt) {
  const goal = site.overview ? 1 : 0;
  site.viewBlend = reduced ? goal : site.viewBlend + (goal - site.viewBlend) * (1 - Math.exp(-5 * dt));
  if (Math.abs(site.viewBlend - goal) < 0.001) site.viewBlend = goal;
  updateFrustum();
  updateGroundTracks();
}
$('#siteMapToggle').onclick = () => setSiteOverview(!site.overview);
$('#travelMapButton').onclick = () => setSiteOverview(!site.overview);
$('#clearTracks').onclick = clearGroundTracks;
document.body.classList.toggle('site-overview', site.overview);
updateSiteUI();
