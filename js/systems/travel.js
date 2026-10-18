/**
 * IsoMech V2 · Travel
 *
 * Drive state, console tabs, dynamics and speed settings, hold-to-drive buttons, Return to parking bay,
 * the travel read-outs, tracked and wheeled drive integration, track belts and the follow camera.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Lightweight, presentation-oriented dynamics; not a hydraulic engineering solver.
// Distances are metres, rates m/s; track phases are derived from signed travel.
const drive = {
  left: 0,
  right: 0,
  maxSpeed: 0.85,
  heading: 0,
  distance: 0,
  braking: false,
  travelled: false,
  steering: 0,
  slope: 0,
  slip: 0,
};
const terrainResponse = { height: 0, pitch: 0, roll: 0, softness: 0.22 };
const rock = { pitch: 0, pitchV: 0, roll: 0, rollV: 0, reaction: 0 };
const driveKeys = new Set(),
  drivePointers = new Set();
let brakeLatched = false,
  driveConsole = false,
  lastLimitNotice = -10000;
const axisVector = new THREE.Vector3(),
  followDelta = new THREE.Vector3(),
  desiredTarget = new THREE.Vector3();
function driveActive(name) {
  return (name === 'brake' && brakeLatched) || driveKeys.has(name) || drivePointers.has(name);
}
function releaseDrive() {
  brakeLatched = false;
  driveKeys.clear();
  drivePointers.clear();
  $$('[data-drive]').forEach(b => b.classList.remove('held'));
}
function activateDrive(name) {
  if (assembly.mode) return;
  if (mode === 'demo') {
    manual();
    notify('Arm demo paused for travel');
  }
  drivePointers.add(name);
}
function setConsole(travel) {
  driveConsole = travel;
  document.body.classList.toggle('drive-console', travel);
  $('#armTab').setAttribute('aria-pressed', !travel);
  $('#travelTab').setAttribute('aria-pressed', travel);
  $('#drivePanel').setAttribute('aria-hidden', !travel);
  $('#consoleTitle').textContent = travel ? 'Put it in motion.' : 'Make your move.';
  $('#consoleIntro').textContent = travel
    ? 'Drive the access lanes. Use the site plan to explore the construction yard.'
    : 'Explore the mechanics. Feel the hydraulic response at every joint.';
  stopHold();
  releaseDrive();
  sync();
}
$('#armTab').onclick = () => setConsole(false);
$('#travelTab').onclick = () => setConsole(true);
$('#feel').setAttribute('aria-pressed', dynamicsEnabled);
$('#feel').onclick = () => {
  dynamicsEnabled = !dynamicsEnabled;
  $('#feel').setAttribute('aria-pressed', dynamicsEnabled);
  $('#feelLabel').textContent = dynamicsEnabled ? 'DYNAMICS ON' : 'DYNAMICS OFF';
  if (!dynamicsEnabled) {
    rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
  }
  notify(
    dynamicsEnabled ? 'Hydraulic lag · damping · load response' : 'Smooth response · secondary motion off'
  );
};
$('#feelLabel').textContent = dynamicsEnabled ? 'DYNAMICS ON' : 'DYNAMICS OFF';
$('#travelSpeed').oninput = e => {
  drive.maxSpeed = +e.target.value;
  $('#speedLimit').textContent = (drive.maxSpeed * 3.6).toFixed(1) + ' km/h';
};
$$('[data-drive]').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    activateDrive(b.dataset.drive);
    b.classList.add('held');
  });
  const release = () => {
    drivePointers.delete(b.dataset.drive);
    b.classList.remove('held');
  };
  b.addEventListener('pointerup', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('lostpointercapture', release);
  b.addEventListener('click', e => {
    if (e.detail === 0) {
      activateDrive(b.dataset.drive);
      b.classList.add('held');
      setTimeout(release, 300);
    }
  });
});

function returnToStart() {
  if (assembly.mode || exploreMode) return false;
  clearKeyboard();
  joyEnd();
  releaseDrive();
  stopHold();
  drive.left = drive.right = 0;
  drive.braking = false;
  drive.steering = 0;
  mode = 'manual';
  freezeHydraulics();
  resetTween = null;
  const record = vehicleFleet[activeVehicle],
    home = record.home;
  record.position.copy(driveRoot.position);
  record.heading = drive.heading;
  record.distance = drive.distance;
  const collision = siteCollision(home.position.x, home.position.z, home.heading, activeVehicle);
  if (collision) {
    notify(record.label + ' parking bay blocked · ' + collision);
    sync();
    return false;
  }
  drive.heading = home.heading;
  drive.distance = 0;
  driveRoot.position.copy(home.position);
  driveRoot.rotation.y = home.heading;
  record.position.copy(home.position);
  record.heading = home.heading;
  record.distance = 0;
  rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
  if (activeVehicle === 'drill') {
    pileRig.reset();
  } else if (activeVehicle === 'dozer') {
    dozer.reset();
  } else if (activeVehicle === 'dumper') {
    resetDumperBody();
  } else {
    machine.rotation.set(0, 0, 0);
    machine.position.set(0, 0, 0);
    for (const t of trackSystems) {
      t.phase = t.distance = 0;
      t.dirty = true;
    }
    for (const k in config) angles[k] = config[k].home;
    freezeHydraulics();
    apply();
    updateHydraulics();
  }
  resetTrailCursors();
  followMachine(1, true);
  updateSiteUI();
  notify('Returned ' + record.label + ' to its parking bay');
  sync();
  syncRigUI();
  syncDozerUI();
  syncDumperUI();
  return true;
}
$('#homeDrive').onclick = returnToStart;
function syncDriveUI() {
  if ($('#hudSpeed'))
    $('#hudSpeed').textContent = (Math.abs((drive.left + drive.right) / 2) * 3.6).toFixed(1);
  $$('[data-drive]').forEach(b => b.classList.toggle('held', driveActive(b.dataset.drive)));
  const speed = (drive.left + drive.right) / 2,
    turning =
      activeVehicle === 'dumper'
        ? Math.abs(drive.steering) > 0.04
        : Math.abs(drive.left - drive.right) > 0.04;
  $('#leftTrackLabel').textContent = activeVehicle === 'dumper' ? 'L WHEELS' : 'L TRACK';
  $('#rightTrackLabel').textContent = activeVehicle === 'dumper' ? 'R WHEELS' : 'R TRACK';
  $('#travelVelocity').textContent = (Math.abs(speed) * 3.6).toFixed(1);
  $('#travelGear').textContent = drive.braking
    ? 'BRAKING'
    : Math.abs(speed) > 0.02
      ? speed > 0
        ? 'FORWARD'
        : 'REVERSE'
      : turning
        ? 'TURNING'
        : 'PARKED';
  $('#travelDistance').textContent = drive.distance.toFixed(1) + ' m';
  $('#leftTrack').textContent = (drive.left * 3.6).toFixed(1);
  $('#rightTrack').textContent = (drive.right * 3.6).toFixed(1);
  $('#speedLimit').textContent = (drive.maxSpeed * 3.6).toFixed(1) + ' km/h';
}
function stepDrive(dt) {
  const throttle = (driveActive('forward') ? 1 : 0) - (driveActive('reverse') ? 1 : 0),
    steer = (driveActive('left') ? 1 : 0) - (driveActive('right') ? 1 : 0),
    braking = driveActive('brake'),
    wheeled = activeVehicle === 'dumper';
  drive.braking = braking;
  const traction = 1 - clamp(terrainResponse.softness * 0.28, 0, 0.28),
    top = drive.maxSpeed * traction,
    targetSteer = wheeled ? steer * dumper.steering.maxAngle : 0;
  drive.steering = approach(drive.steering, targetSteer, Math.abs(steer) > 0.01 ? 2.6 : 2.0, dt);
  let leftTarget = clamp(throttle * top - steer * top * 0.65, -top, top),
    rightTarget = clamp(throttle * top + steer * top * 0.65, -top, top);
  if (wheeled) leftTarget = rightTarget = throttle * top;
  if (braking) leftTarget = rightTarget = 0;
  const oldSpeed = (drive.left + drive.right) / 2;
  const update = (v, t) => {
    const stopping = braking || v * t < 0 || Math.abs(t) < Math.abs(v);
    return approach(v, t, braking ? 3.5 : stopping ? 1.3 : 0.72, dt);
  };
  drive.left = update(drive.left, leftTarget);
  drive.right = update(drive.right, rightTarget);
  if (Math.abs(drive.left) < 0.0001) drive.left = 0;
  if (Math.abs(drive.right) < 0.0001) drive.right = 0;
  drive.slope = terrainResponse.pitch;
  const gradeAcceleration = braking ? 0 : clamp(-9.81 * Math.sin(terrainResponse.pitch), -1.2, 1.2);
  drive.left = clamp(drive.left + gradeAcceleration * dt, -top, top);
  drive.right = clamp(drive.right + gradeAcceleration * dt, -top, top);
  drive.slip = clamp(
    terrainResponse.softness * Math.abs(steer) * (wheeled ? 0.15 : 0.42),
    0,
    wheeled ? 0.22 : 0.48
  );
  let velocity = (drive.left + drive.right) / 2;
  const angular =
      (wheeled
        ? (velocity * Math.tan(drive.steering)) / dumper.steering.wheelbase
        : (drive.right - drive.left) / 2.26) *
      (1 - drive.slip),
    prevHeading = drive.heading;
  drive.heading += angular * dt;
  driveRoot.rotation.y = drive.heading;
  const prevX = driveRoot.position.x,
    prevZ = driveRoot.position.z;
  driveRoot.position.x += Math.cos(drive.heading) * velocity * dt;
  driveRoot.position.z -= Math.sin(drive.heading) * velocity * dt;
  const collision = siteCollision(driveRoot.position.x, driveRoot.position.z, drive.heading);
  if (collision) {
    driveRoot.position.x = prevX;
    driveRoot.position.z = prevZ;
    drive.heading = prevHeading;
    driveRoot.rotation.y = prevHeading;
    drive.left = drive.right = velocity = 0;
    releaseDrive();
    if (performance.now() - site.lastCollision > 1600) {
      notify(collision + ' · reverse or steer away');
      site.lastCollision = performance.now();
    }
  }
  drive.distance += Math.hypot(driveRoot.position.x - prevX, driveRoot.position.z - prevZ);
  const activeState = vehicleFleet[activeVehicle];
  activeState.position.copy(driveRoot.position);
  activeState.heading = drive.heading;
  activeState.distance = drive.distance;
  if (activeVehicle === 'excavator') {
    for (const t of trackSystems) {
      const speed = t.side === -1 ? drive.left : drive.right;
      if (Math.abs(speed) > 0.00001) {
        t.distance += speed * dt;
        t.phase = t.distance / total;
        t.dirty = true;
      }
    }
    if (dynamicsEnabled) {
      const accel = (velocity - oldSpeed) / Math.max(dt, 0.001),
        pitchGoal = clamp(-accel * 0.009, -0.017, 0.017),
        rollGoal = clamp(-angular * velocity * 0.007, -0.01, 0.01);
      rock.pitchV += (65 * (pitchGoal - rock.pitch) - 10 * rock.pitchV) * dt;
      rock.rollV += (70 * (rollGoal - rock.roll) - 12 * rock.rollV) * dt;
      rock.pitch = clamp(rock.pitch + rock.pitchV * dt, -0.022, 0.022);
      rock.roll = clamp(rock.roll + rock.rollV * dt, -0.014, 0.014);
    } else {
      rock.pitch = rock.roll = rock.pitchV = rock.rollV = 0;
    }
    machine.rotation.z = rock.pitch + terrainResponse.pitch;
    machine.rotation.x = rock.roll + terrainResponse.roll;
    const treadVibration = dynamicsEnabled
      ? Math.min(Math.abs(velocity), 1) * 0.003 * (1 + Math.sin(drive.distance * 40))
      : 0;
    machine.position.y = Math.abs(rock.pitch) * 2.1 + Math.abs(rock.roll) * 1.5 + treadVibration;
    // Bucket contact is a guard, not an excavating/soil simulation. Remove cosmetic rocking if clearance is too low.
    if (Math.abs(rock.pitch) + Math.abs(rock.roll) > 0.00001) {
      apply();
      if (!poseValid()) {
        machine.rotation.z = machine.rotation.x = 0;
        machine.position.y = 0;
        rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
      }
    }
  }
}
function updateTrackMeshes() {
  dummy.scale.set(1, 1, 1);
  for (const t of trackSystems) {
    if (!t.dirty) continue;
    for (let i = 0; i < N; i++) {
      const p = path(i / N + t.phase);
      dummy.position.set(p.x, p.y, 0);
      dummy.rotation.set(0, 0, p.a);
      dummy.updateMatrix();
      t.shoes.setMatrixAt(i, dummy.matrix);
      dummy.position.x -= Math.sin(p.a) * 0.075;
      dummy.position.y += Math.cos(p.a) * 0.075;
      dummy.updateMatrix();
      t.ridges.setMatrixAt(i, dummy.matrix);
    }
    t.shoes.instanceMatrix.needsUpdate = true;
    t.ridges.instanceMatrix.needsUpdate = true;
    for (const w of t.wheels) w.obj.rotation.z = -t.distance / w.r;
    t.dirty = false;
  }
}
function followMachine(dt, instant = false) {
  desiredTarget.set(
    driveRoot.position.x +
      (activeVehicle === 'drill' ? 1.4 : 1) +
      (1.5 * Math.cos(drive.heading) - 1) * assembly.value,
    (activeVehicle === 'drill' ? 8.2 : 1.85) + 1.65 * assembly.value,
    driveRoot.position.z - 1.5 * Math.sin(drive.heading) * assembly.value
  );
  desiredTarget.lerp(new THREE.Vector3(0, 0.8, 0), site.viewBlend);
  followDelta
    .copy(desiredTarget)
    .sub(target)
    .multiplyScalar(instant ? 1 : 1 - Math.exp(-6 * dt));
  target.add(followDelta);
  camera.position.add(followDelta);
  orbit.target.copy(target);
  const lightX = driveRoot.position.x * (1 - site.viewBlend),
    lightZ = driveRoot.position.z * (1 - site.viewBlend),
    lightScale = 1 + site.viewBlend * 2;
  sun.position.set(lightX - 3 * lightScale, 11 * lightScale, lightZ + 7 * lightScale);
  sun.target.position.set(lightX, 0, lightZ);
  sun.target.updateMatrixWorld();
  const shadowExtent = 14 + site.viewBlend * 44;
  Object.assign(sun.shadow.camera, {
    left: -shadowExtent,
    right: shadowExtent,
    top: shadowExtent,
    bottom: -shadowExtent,
  });
  sun.shadow.camera.updateProjectionMatrix();
  fill.position.set(lightX + 8, 5, lightZ - 8);
  fill.target.position.set(lightX, 0, lightZ);
  fill.target.updateMatrixWorld();
}
