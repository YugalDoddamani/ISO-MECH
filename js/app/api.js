/**
 * IsoMech V2 · Public API
 *
 * window.excavator: the automation and testing interface. Assigned last, after the first frame,
 * so that its presence means the application has fully started.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
window.excavator = {
  get activeVehicle() {
    return exploreMode ? 'explore' : activeVehicle;
  },
  get exploreMode() {
    return exploreMode;
  },
  switchVehicle,
  setExploreMode,
  pileRig,
  dozer,
  dumper,
  explorer,
  THREE,
  scene,
  machine,
  camera,
  controls: orbit,
  groups: { under, upper, boom, stick, bucket, driveRoot },
  get angles() {
    return { ...angles };
  },
  stepFixed: advanceFixedSteps,
  get fixedStepCount() {
    return fixedStepper.stepCount;
  },
  setDriveInput(name, down = true) {
    if (!['forward', 'reverse', 'left', 'right', 'brake'].includes(name)) return false;
    if (down) drivePointers.add(name);
    else drivePointers.delete(name);
    return true;
  },
  setPose(p) {
    if (assembly.mode || exploreMode || activeVehicle !== 'excavator') return false;
    manual();
    const next = { ...angles };
    for (const k in config) if (k in p) next[k] = clamp(p[k], config[k].min, config[k].max);
    const ok = safePose(next);
    freezeHydraulics();
    sync();
    return ok;
  },
  poseValid,
  reset,
  view,
  renderer,
  hydraulics: hyd,
  hydraulicsPump,
  drive,
  terrainResponse,
  trackSystems,
  hydraulicState,
  returnToStart,
  releaseDrive,
  get dynamics() {
    return dynamicsEnabled;
  },
  site,
  fleet: { root: fleet, vehicles: vehicleFleet },
  yard: {
    bodies: yardBodies,
    heaps: yardHeaps,
    boreholes,
    soil: soilSimulation,
    physics: yardPhysics,
    surface: soilSurfaceMesh,
    reset: resetYard,
    step: stepYard,
    stepDrilling,
    particles: soilParticles,
    materialVolume() {
      return soilSimulation.totalTerrainVolume() + soilSimulation.bucketPayload + dumper.state.payloadVolume;
    },
  },
  effects: { dust: dustPool.particles, smoke: smokePool.particles },
  setSiteOverview,
  clearGroundTracks,
  siteCollision,
  trailMesh,
  assembly,
  explodedParts,
  inspectAssembly,
  setExplosion,
  exitAssembly: requestAssemblyExit,
  selectSystem,
};
