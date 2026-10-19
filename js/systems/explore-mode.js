/**
 * IsoMech V2 · Free explore
 *
 * Free-explore mode: parks the selected machine and flies the camera with W/A/S/D, Q/E and Shift.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
function setExploreMode(on, silent = false) {
  on = !!on;
  if (assembly.mode) {
    notify('Reassemble before leaving the machine');
    return false;
  }
  if (on === exploreMode) return true;
  if (!on) return switchVehicle(lastVehicle, silent);
  if (workMode.active) {
    notify('Stop work mode before exploring on foot');
    return false;
  }
  parkActiveVehicle();
  exploreMode = true;
  explorer.keys.clear();
  if (site.overview) setSiteOverview(false, false);
  site.viewBlend = 0;
  target.set(driveRoot.position.x, 1.65, driveRoot.position.z);
  explorer.position.copy(target);
  viewTween = null;
  currentView = null;
  place(48, 66);
  camera.zoom = 1.05;
  camera.updateProjectionMatrix();
  orbit.target.copy(target);
  orbit.update();
  document.body.classList.add('explore-mode');
  document.body.classList.remove('drill-mode', 'dozer-mode', 'dumper-mode');
  $('#assemblyTab').disabled = true;
  $('#demo').disabled = true;
  $('#armTab').textContent = 'SITE EXPLORE';
  $('#reset').textContent = '↺ RETURN TO MACHINE';
  $('.heading .eyebrow').textContent = 'FREE SITE EXPLORER';
  $('.heading h1').textContent = 'EXPLORE';
  $('.heading p').textContent = 'Wander the yard. Look around without a machine.';
  $('#coachmark').textContent =
    'W / A / S / D move · Q / E rise / descend · Shift moves faster · drag to look.';
  const joyControl = pad.querySelector('.joystick');
  joyControl.querySelector('span').textContent = 'WALK / STRAFE';
  joyControl.setAttribute('aria-label', 'Move around the construction site');
  $('.stage-hint').innerHTML =
    '<span>WASD / JOYSTICK TO MOVE</span><span>DRAG TO LOOK · SCROLL TO ZOOM</span>';
  $('.compass-note').innerHTML = 'FREE EXPLORE · NO MACHINE<br>WASD / Q E · DRAG TO LOOK';
  setConsole(false);
  updateModeButton();
  updateSiteUI();
  sync();
  $('#modeStatus').textContent = 'FREE EXPLORE / READY';
  if (!silent) notify('Free explore · all machines parked');
  return true;
}
/** Moves the operated machine from the drive root onto its parked carrier, keeping its pose. */
function parkActiveVehicle() {
  clearKeyboard();
  joyEnd();
  stopHold();
  releaseDrive();
  drive.left = drive.right = 0;
  drive.braking = false;
  drive.steering = 0;
  if (activeVehicle === 'dumper') dumper.update(0, 0, 0, 0);
  mode = 'manual';
  resetTween = null;
  const record = vehicleFleet[activeVehicle];
  record.position.copy(driveRoot.position);
  record.heading = drive.heading;
  record.distance = drive.distance;
  record.carrier.position.copy(record.position);
  record.carrier.rotation.set(0, record.heading, 0);
  if (activeVehicle === 'excavator') {
    rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
    machine.rotation.set(0, 0, 0);
    machine.position.set(0, 0, 0);
  }
  if (activeVehicle === 'drill') {
    pileRig.state.spinning = false;
    pileRig.state.rpm = 0;
  }
  driveRoot.remove(record.model);
  record.model.position.set(0, 0, 0);
  record.model.rotation.set(0, 0, 0);
  record.model.scale.set(1, 1, 1);
  record.carrier.add(record.model);
  lastVehicle = activeVehicle;
}
function updateExplorer(dt) {
  if (!exploreMode) return;
  const keys = explorer.keys,
    forward = exploreForward,
    right = exploreRight;
  forward.set(target.x - camera.position.x, 0, target.z - camera.position.z).normalize();
  right.set(-forward.z, 0, forward.x);
  const dx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + joystick.x,
    forwardAmount = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) - joystick.y,
    vertical = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  exploreDelta.set(0, 0, 0).addScaledVector(right, dx).addScaledVector(forward, forwardAmount);
  if (exploreDelta.lengthSq() > 1) exploreDelta.normalize();
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 12 : explorer.speed) * dt;
  exploreDelta.multiplyScalar(speed);
  exploreDelta.y = vertical * speed * 0.8;
  const nextX = clamp(
      explorer.position.x + exploreDelta.x,
      -site.bounds.halfWidth + 2,
      site.bounds.halfWidth - 2
    ),
    nextY = clamp(explorer.position.y + exploreDelta.y, 1.15, 26),
    nextZ = clamp(
      explorer.position.z + exploreDelta.z,
      -site.bounds.halfDepth + 2,
      site.bounds.halfDepth - 2
    );
  exploreDelta.set(nextX - explorer.position.x, nextY - explorer.position.y, nextZ - explorer.position.z);
  target.add(exploreDelta);
  camera.position.add(exploreDelta);
  explorer.position.copy(target);
  orbit.target.copy(target);
}
