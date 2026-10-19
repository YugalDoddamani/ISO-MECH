/**
 * IsoMech V2 · Vehicle switching
 *
 * switchVehicle() parks the outgoing machine on its carrier, restores the incoming machine and updates
 * every vehicle-specific label; updateModeButton() keeps the switch button in step.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
function updateModeButton() {
  const current = exploreMode ? 'explore' : activeVehicle;
  if (exploreMode) {
    const label = vehicleFleet[lastVehicle].label;
    vehicleButton.textContent = '↩ RETURN TO ' + label.toUpperCase();
    vehicleButton.setAttribute('aria-label', 'Return to ' + label.toLowerCase());
    return;
  }
  let next = modeOrder[(modeOrder.indexOf(current) + 1) % modeOrder.length];
  if (skipExploreOnNextCycle && next === 'explore')
    next = vehicleOrder[(vehicleOrder.indexOf(current) + 1) % vehicleOrder.length];
  const labels = {
    drill: 'PILE DRILL',
    excavator: 'EXCAVATOR',
    dozer: 'CRAWLER DOZER',
    dumper: 'DUMPER',
    explore: 'FREE EXPLORE',
  };
  vehicleButton.textContent = '⇄ SWITCH TO ' + labels[next];
  vehicleButton.setAttribute('aria-label', 'Switch to ' + labels[next].toLowerCase());
}
function switchVehicle(vehicle, silent = false, leavingWorkMode = false) {
  if (workMode.active && !leavingWorkMode) {
    notify('Stop work mode to take a machine');
    return false;
  }
  if (vehicle === 'explore') return setExploreMode(true, silent);
  if (!vehicleOrder.includes(vehicle) || assembly.mode) {
    if (assembly.mode) notify('Reassemble before switching vehicles');
    return false;
  }
  const incoming = vehicleFleet[vehicle],
    previousVehicle = activeVehicle,
    exploringOnFoot = exploreMode,
    // Free explore and work mode both leave every machine on its carrier.
    wasExploring = exploreMode || workMode.active;
  if (vehicle !== previousVehicle || wasExploring) {
    const parked = vehiclePose(vehicle),
      collision = siteCollision(parked.x, parked.z, parked.heading, vehicle);
    if (collision) {
      notify(incoming.label + ' cannot be restored · ' + collision);
      return false;
    }
  }
  clearKeyboard();
  joyEnd();
  stopHold();
  releaseDrive();
  drive.left = drive.right = 0;
  drive.braking = false;
  drive.steering = 0;
  dumper.update(0, 0, 0, 0);
  manual();
  if (vehicle !== previousVehicle || wasExploring) {
    if (!wasExploring) {
      const outgoing = vehicleFleet[previousVehicle];
      outgoing.position.copy(driveRoot.position);
      outgoing.heading = drive.heading;
      outgoing.distance = drive.distance;
      outgoing.carrier.position.copy(outgoing.position);
      outgoing.carrier.rotation.set(0, outgoing.heading, 0);
      if (previousVehicle === 'excavator') {
        rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
        machine.rotation.set(0, 0, 0);
        machine.position.set(0, 0, 0);
      }
      if (previousVehicle === 'drill') {
        pileRig.state.spinning = false;
        pileRig.state.rpm = 0;
      }
      driveRoot.remove(outgoing.model);
      outgoing.model.position.set(0, 0, 0);
      outgoing.model.rotation.set(0, 0, 0);
      outgoing.model.scale.set(1, 1, 1);
      outgoing.carrier.add(outgoing.model);
    }
    incoming.position.set(incoming.carrier.position.x, 0, incoming.carrier.position.z);
    incoming.heading = incoming.carrier.rotation.y;
    incoming.carrier.remove(incoming.model);
    incoming.model.position.set(0, 0, 0);
    incoming.model.rotation.set(0, 0, 0);
    incoming.model.scale.set(1, 1, 1);
    driveRoot.add(incoming.model);
    activeVehicle = vehicle;
    lastVehicle = vehicle;
    exploreMode = false;
    workMode.active = false;
    document.body.classList.remove('explore-mode', 'work-mode');
    driveRoot.position.copy(incoming.position);
    drive.heading = incoming.heading;
    drive.distance = incoming.distance;
    driveRoot.rotation.set(0, drive.heading, 0);
    rock.pitch = rock.pitchV = rock.roll = rock.rollV = 0;
    if (vehicle === 'excavator') {
      machine.rotation.set(0, 0, 0);
      machine.position.set(0, 0, 0);
      apply();
      updateHydraulics(true);
    } else if (vehicle === 'dozer') dozer.update(0);
    else if (vehicle === 'dumper') dumper.update(0);
    else pileRig.update(0, 0, 0);
    resetTrailCursors();
  }
  skipExploreOnNextCycle = exploringOnFoot;
  pileRig.state.spinning = false;
  pileRig.state.rpm = 0;
  document.body.classList.toggle('drill-mode', vehicle === 'drill');
  document.body.classList.toggle('dozer-mode', vehicle === 'dozer');
  document.body.classList.toggle('dumper-mode', vehicle === 'dumper');
  $('#assemblyTab').disabled = vehicle !== 'excavator';
  $('#demo').disabled = vehicle !== 'excavator';
  $('#armTab').textContent =
    vehicle === 'drill'
      ? '01 / DRILL'
      : vehicle === 'dozer'
        ? '01 / BLADE'
        : vehicle === 'dumper'
          ? '01 / DUMP BODY'
          : '01 / ARM';
  $('#reset').textContent =
    vehicle === 'dozer'
      ? '↺ RESET BLADE'
      : vehicle === 'drill'
        ? '↺ RESET PILE RIG'
        : vehicle === 'dumper'
          ? '↺ RESET DUMP BODY'
          : '↺ RESET MACHINE POSE';
  const heading =
    vehicle === 'drill'
      ? { eyebrow: 'ROTARY PILING RIG', title: 'PR–180', sub: '18.5 m leader. Built to go deep.' }
      : vehicle === 'dozer'
        ? { eyebrow: 'CRAWLER DOZER', title: 'DOZER', sub: 'Low gear. Big push.' }
        : vehicle === 'dumper'
          ? { eyebrow: 'OFF-HIGHWAY DUMPER', title: 'DUMPER', sub: 'Carry the load. Tip it clear.' }
          : { eyebrow: 'CRAWLER EXCAVATOR', title: 'EX–240', sub: 'Precision in every movement.' };
  $('.heading .eyebrow').textContent = heading.eyebrow;
  $('.heading h1').textContent = heading.title;
  $('.heading p').textContent = heading.sub;
  $('#coachmark').textContent =
    vehicle === 'drill'
      ? 'Q / E mast · W / S feed · A / D Kelly. Drag any slider to position.'
      : vehicle === 'dozer'
        ? 'Q / E blade lift · A / D angle. Use the travel controls to push.'
        : vehicle === 'dumper'
          ? 'Q / E raise or lower the dump body · tip to unload.'
          : 'Q / E boom · W / S stick · A / D bucket. Drag any slider to position.';
  const joystickControl = pad.querySelector('.joystick');
  joystickControl.querySelector('span').textContent =
    vehicle === 'drill'
      ? 'MAST / SLEW'
      : vehicle === 'dozer'
        ? 'BLADE / ANGLE'
        : vehicle === 'dumper'
          ? 'DUMP BODY'
          : 'BOOM / SLEW';
  joystickControl.setAttribute(
    'aria-label',
    vehicle === 'drill'
      ? 'Drag to rake the mast and slew the piling rig'
      : vehicle === 'dozer'
        ? 'Drag to lift and angle the dozer blade'
        : vehicle === 'dumper'
          ? 'Drag vertically to raise or lower the dump body'
          : 'Drag to slew and raise or lower the excavator boom'
  );
  $('.stage-hint').innerHTML = '<span>↔ DRAG TO ORBIT</span><span>⊕ SCROLL TO ZOOM</span>';
  $('.compass-note').innerHTML = 'CAMERA FOLLOW · ACTIVE<br>HYDRAULICS + TRACK DRIVE';
  setConsole(false);
  followMachine(1, true);
  updateFrustum();
  if (site.overview) {
    currentView = null;
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  } else view('iso', true);
  syncRigUI();
  syncDozerUI();
  syncDumperUI();
  updateModeButton();
  updateSiteUI();
  lastDumperDumped = dumper.state.dumped;
  if (!silent) notify(vehicleFleet[vehicle].label + ' · position and travel restored');
  return true;
}
