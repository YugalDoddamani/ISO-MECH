/**
 * IsoMech V2 · Main loop
 *
 * Initial pose, the deterministic 60 Hz fixed-step simulation, the render loop and start-up
 * (selects the PR–180 and renders the first frame).
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
for (const key in config) {
  angles[key] = config[key].home;
  hydraulicState[key].target = angles[key];
  hydraulicState[key].velocity = 0;
}
machine.position.set(0, 0, 0);
machine.rotation.set(0, 0, 0);
excavatorCarrier.updateMatrixWorld(true);
machine.updateMatrixWorld(true);
apply();
updateHydraulics(true);
sync();
let firstPaint = true;
const clock = new THREE.Clock();
let uiTime = 0;
function simulateFixedStep(dt) {
  simulationStepSerial++;
  if (assembly.mode) {
    stepEffects(dt);
    return;
  }
  if (exploreMode) {
    updateExplorer(dt);
    stepEffects(dt);
    return;
  }
  stepKeyboard(dt);
  const holdMillis = held ? (simulationStepSerial - held.startStep) * (1000 / 60) : 0;
  if (held && holdMillis > 180)
    move(held.key, held.dir * config[held.key].speed * dt * clamp((holdMillis - 180) / 220, 0, 1));
  if (activeVehicle === 'excavator' && !resetTween) stepHydraulics(dt);
  stepDrive(dt);
  if (activeVehicle === 'drill') pileRig.update(dt, drive.left, drive.right);
  else if (activeVehicle === 'dozer') dozer.update(dt, drive.left, drive.right);
  else if (activeVehicle === 'dumper') dumper.update(dt, drive.left, drive.right, drive.steering);
  stepYard(dt);
  if (activeVehicle === 'drill') stepDrilling(dt);
  stepEffects(dt);
}
const fixedStepper = window.createFixedStepper({
  hz: 60,
  maxFrameTime: 0.12,
  maxStepsPerFrame: 8,
  step: simulateFixedStep,
});
function finishFixedStepBatch() {
  if (activeVehicle === 'excavator') {
    updateTrackMeshes();
    apply();
    updateHydraulics();
  }
}
function advanceFixedSteps(count) {
  fixedStepper.advance(count);
  finishFixedStepBatch();
  return fixedStepper.stepCount;
}
function frame() {
  if (!stage.isConnected) {
    renderer.dispose();
    return;
  }
  requestAnimationFrame(frame);
  const rawElapsed = clock.getDelta(),
    elapsed = Math.min(rawElapsed, 0.12),
    now = performance.now();
  if (!assembly.mode && !exploreMode) {
    if (resetTween) {
      const t = clamp((now - resetTween.start) / (reduced ? 1 : 1000), 0, 1),
        home = {};
      for (const k in config) home[k] = config[k].home;
      safePose(interpolate(resetTween.from, home, ease(t)));
      freezeHydraulics();
      if (t === 1) {
        angles = home;
        apply();
        resetTween = null;
        sync();
      }
    }
    if (mode === 'demo') {
      demoT = (now - demoClock) / 1000;
      let desired;
      if (demoT < 2) desired = interpolate(demoStart, demoPoses[0], ease(demoT / 2));
      else {
        const phase = (demoT - 2) % ((demoPoses.length - 1) * 2.5),
          i = Math.floor(phase / 2.5),
          u = ease(phase / 2.5 - i);
        desired = interpolate(demoPoses[i], demoPoses[i + 1], u);
      }
      for (const k in config) hydraulicState[k].target = desired[k];
    }
  }
  fixedStepper.update(rawElapsed);
  if (activeVehicle === 'excavator' && !assembly.mode) finishFixedStepBatch();
  if (assembly.mode) stepAssembly(now);
  updateSiteFrame(elapsed);
  if (!exploreMode) followMachine(elapsed);
  if (viewTween) {
    const t = viewTween.duration ? clamp((now - viewTween.start) / viewTween.duration, 0, 1) : 1,
      u = ease(t);
    place(viewTween.theta + viewTween.diff * u, viewTween.phi + (viewTween.endPhi - viewTween.phi) * u);
    camera.zoom = viewTween.zoom + ((viewTween.zoomEnd ?? 1) - viewTween.zoom) * u;
    camera.updateProjectionMatrix();
    if (t === 1) viewTween = null;
  }
  orbit.update();
  uiTime += elapsed;
  if (uiTime > 0.075) {
    uiTime = 0;
    sync();
    syncRigUI();
    syncDozerUI();
    syncDumperUI();
    updateSiteUI();
    const bearing = Math.round((((90 - deg(orbit.getAzimuthalAngle())) % 360) + 360) % 360) % 360;
    $('#bearing').innerHTML = String(bearing).padStart(3, '0') + '<small>°</small>';
    $('#elevation').innerHTML = Math.round(90 - deg(orbit.getPolarAngle())) + '<small>°</small>';
  }
  updateAssemblyLabels();
  renderer.render(scene, camera);
  if (firstPaint) {
    firstPaint = false;
    setTimeout(() => $('#loading')?.remove(), 550);
  }
}
switchVehicle('drill', true);
frame();
