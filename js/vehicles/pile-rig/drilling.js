/**
 * IsoMech V2 · PR–180 pile rig · drilling
 *
 * Auger penetration into the layered soil model, stalling, spoil and bore-mark growth.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
function stepDrilling(dt) {
  if (exploreMode || activeVehicle !== 'drill') {
    activeBorehole = null;
    return;
  }
  advanceDrilling(dt, Math.abs(drive.left) + Math.abs(drive.right) > 0.08);
}
/** One drilling step for the PR-180 wherever it stands (operator or work mode). Returns the active hole. */
function advanceDrilling(dt, moving = false) {
  const verticality = Math.abs(pileRig.state.tilt);
  if (!pileRig.state.spinning || moving) {
    pileRig.setDrillLoad(1, verticality);
    activeBorehole = null;
    return null;
  }
  if (verticality > pileRig.state.verticalTolerance) {
    pileRig.setDrillLoad(1, verticality);
    activeBorehole = null;
    return null;
  }
  const tip = pileRig.tipWorld();
  if (tip.y > 0.42) {
    pileRig.setDrillLoad(1, verticality);
    activeBorehole = null;
    return null;
  }
  let hole = boreholes.find(item => Math.hypot(item.x - tip.x, item.z - tip.z) < 0.62);
  if (!hole) hole = createBorehole(tip.x, tip.z);
  activeBorehole = hole;
  const layer = soilSimulation.layerAtDepth(hole.depth),
    load = pileRig.setDrillLoad(layer.resistance, verticality);
  if (load.stalled && !hole.stalled) cueSound('stall', tip.x, 0.4, tip.z, 1);
  hole.layer = layer.name;
  hole.resistance = layer.resistance;
  hole.torque = load.torque;
  hole.stalled = load.stalled;
  if (load.stalled || pileRig.state.rpm < 0.25) return hole;
  const previousDepth = hole.depth,
    penetration = (dt * Math.min(1, pileRig.state.rpm / 18) * 0.38) / Math.max(1, layer.resistance / 1.45);
  hole.depth = Math.min(3, hole.depth + penetration);
  if (hole.depth > previousDepth) {
    const removed = soilSimulation.drillBore(tip.x, tip.z, hole.depth, 0.42, tip.x + 0.9, tip.z + 0.25);
    hole.spoilVolume = (hole.spoilVolume || 0) + removed;
    soilSurfaceDirty = soilSurfaceDirty || removed > 0;
  }
  const swell = 1 + hole.depth * 0.035;
  hole.root.scale.set(swell, 1, swell);
  effectClock.drill -= dt;
  if (effectClock.drill <= 0) {
    spawnEffect(dustPool, tip.x, 0.08, tip.z, 5, 'dust');
    scatterSoil(tip.x, 0.08, tip.z);
    effectClock.drill = 0.18;
  }
  return hole;
}
