/**
 * IsoMech V2 · Work mode
 *
 * An autonomous site demonstration. The EX–240 digs the earth stockpile and loads the dumper pass by
 * pass, the dumper reverses down the haul lane and tips on the fill pad, the dozer spreads each load,
 * and the PR–180 bores a staggered pile grid beside its bay. Every machine runs a small job (a
 * generator stepped by the fixed 60 Hz simulation) on the shared soil model, so material volume is
 * conserved and a run repeats exactly. The haul lane and fill pad are shared by the dumper and the
 * dozer through one reservation; every move is also checked against the site's footprint collision.
 * When the reachable stockpile is used up the shift ends, the yard is restocked and a new shift starts.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const WORK_DT = 1 / 60;
// Stations and routes in world metres. Footprints at these poses never overlap each other, the site
// obstacles or the fence; see docs/operator-ui.md for the plan.
const WORK_SITE = {
  excavator: { x: 16.62, z: -11, heading: Math.PI },
  dumperLoad: { x: 15.79, z: -15.6, heading: Math.PI },
  dumperTipX: 31.65,
  dozerWait: { x: 39.2, z: -8.2, heading: 0 },
  dozerNorthZ: -21.2,
  dozerPushX: 36,
  dozerPushEndZ: -8.2,
  drill: {
    z: 4,
    heading: 0,
    stops: [
      [28, 26, 24],
      [27, 25, 23],
    ],
    slews: [-16, 16],
  },
};
const CREW_ORDER = ['excavator', 'drill', 'dozer', 'dumper'];
// Follow-camera angles per machine (degrees): high enough to look over the PR–180 mast.
const CREW_VIEWS = {
  excavator: { theta: 75, phi: 38 },
  dumper: { theta: 110, phi: 38 },
  dozer: { theta: 100, phi: 40 },
  drill: { theta: 48, phi: 50 },
};
const CREW_TRACK_HALF = { excavator: 1.13, drill: 1.6, dozer: 1.58, dumper: 1.58 };
const workTip = new THREE.Vector3(),
  workPoint = new THREE.Vector3();
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

// ------------------------------------------------------------------ EX–240 arm kinematics
// The arm is a planar chain in the upper body: boom pivot (0.9, 0.62), stick pivot 3.55 × 0.9 along
// the boom, bucket pivot 2.6 along the stick, teeth at (-0.8, -0.65) in the bucket frame, 1.34 m above
// the machine base and 0.19 m to the side of the slew axis (see js/vehicles/excavator/arm.js).
const ARM_L1 = Math.hypot(3.55, 0.9),
  ARM_A1 = Math.atan2(0.9, 3.55),
  ARM_L2 = 2.6,
  ARM_UPPER_Y = 1.34,
  ARM_SIDE = -0.19;
/** Boom and stick angles (degrees) that put the bucket pivot at reach r and height y (machine space). */
function armPivotIK(r, y) {
  const dx = r - 0.9,
    dy = y - ARM_UPPER_Y - 0.62,
    d = clamp(Math.hypot(dx, dy), Math.abs(ARM_L1 - ARM_L2) + 1e-3, ARM_L1 + ARM_L2 - 1e-3),
    gamma = Math.acos(clamp((ARM_L1 * ARM_L1 + ARM_L2 * ARM_L2 - d * d) / (2 * ARM_L1 * ARM_L2), -1, 1)),
    beta = Math.acos(clamp((ARM_L1 * ARM_L1 + d * d - ARM_L2 * ARM_L2) / (2 * ARM_L1 * d), -1, 1)),
    boomAngle = deg(Math.atan2(dy, dx) + beta - ARM_A1),
    stickAngle = deg(ARM_A1 - (Math.PI - gamma));
  return {
    boom: clamp(boomAngle, config.boom.min, config.boom.max),
    stick: clamp(stickAngle, config.stick.min, config.stick.max),
  };
}
/** Joint angles that put the bucket teeth at reach r, height y with absolute bucket attitude psi (°). */
function armTipIK(r, y, psi) {
  const p = rad(psi),
    pivot = armPivotIK(
      r - (-0.8 * Math.cos(p) + 0.65 * Math.sin(p)),
      y - (-0.8 * Math.sin(p) - 0.65 * Math.cos(p))
    );
  return { ...pivot, bucket: clamp(psi - pivot.boom - pivot.stick, config.bucket.min, config.bucket.max) };
}
/** Reach and height (machine space) of a point given in the bucket frame, for a pose. */
function armPoint(pose, bx, by) {
  const b = rad(pose.boom),
    s = rad(pose.stick),
    k = b + s + rad(pose.bucket);
  return [
    0.9 +
      3.55 * Math.cos(b) -
      0.9 * Math.sin(b) +
      2.6 * Math.cos(b + s) +
      bx * Math.cos(k) -
      by * Math.sin(k),
    ARM_UPPER_Y +
      0.62 +
      3.55 * Math.sin(b) +
      0.9 * Math.cos(b) +
      2.6 * Math.sin(b + s) +
      bx * Math.sin(k) +
      by * Math.cos(k),
  ];
}
/** Lowest point of the bucket (the ground guard's check points) above the machine base. */
function armLowestPoint(pose) {
  return Math.min(...checkPoints.map(p => armPoint(pose, p[0], p[1])[1]), armPoint(pose, -0.8, -0.65)[1]);
}
/** Slew angle (°) and reach that aim the arm plane at a machine-space point (x, z). */
function armAim(x, z) {
  const reach = Math.sqrt(Math.max(0.01, x * x + z * z - ARM_SIDE * ARM_SIDE));
  return { slew: deg(Math.atan2(-z, x) - Math.atan2(-ARM_SIDE, reach)), reach };
}
/** World point in the excavator's machine space (x forward, z across), ignoring terrain tilt. */
function excavatorLocal(agent, wx, wz) {
  const dx = wx - agent.x,
    dz = wz - agent.z,
    c = Math.cos(agent.heading),
    s = Math.sin(agent.heading);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
/** World (x, z) of a point on the arm plane at a slew and reach. */
function armWorld(agent, slew, reach) {
  const sr = rad(slew),
    x = reach * Math.cos(sr) + ARM_SIDE * Math.sin(sr),
    z = -reach * Math.sin(sr) + ARM_SIDE * Math.cos(sr),
    c = Math.cos(agent.heading),
    s = Math.sin(agent.heading);
  return { x: agent.x + x * c + z * s, z: agent.z - x * s + z * c };
}

// ------------------------------------------------------------------ crew set-up
function makeAgent(id, station) {
  return {
    id,
    x: station.x,
    z: station.z,
    heading: station.heading,
    speed: 0,
    turn: 0,
    moved: false,
    blockedFor: 0,
    left: 0,
    right: 0,
    status: 'Getting ready',
    load: 0,
    reversing: false,
    pushing: false,
    pose: { height: 0, pitch: 0, roll: 0, softness: 0.2 },
    clock: { smoke: rand() * 0.34, dust: rand() * 0.14 },
    job: null,
  };
}
function createCrew() {
  const crew = {
    excavator: makeAgent('excavator', WORK_SITE.excavator),
    drill: makeAgent('drill', { x: 28, z: WORK_SITE.drill.z, heading: WORK_SITE.drill.heading }),
    dozer: makeAgent('dozer', WORK_SITE.dozerWait),
    dumper: makeAgent('dumper', WORK_SITE.dumperLoad),
    lane: null,
    heapsPending: 0,
    moving: new Set(CREW_ORDER),
    restockIn: 0,
  };
  // Keep the rig where it is if it is already on its row beside the bay.
  const rig = vehicleFleet.drill.carrier.position;
  if (
    Math.abs(rig.z - WORK_SITE.drill.z) < 0.05 &&
    rig.x >= 22.9 &&
    rig.x <= 28.1 &&
    Math.abs(wrapAngle(vehicleFleet.drill.carrier.rotation.y)) < 0.01
  )
    crew.drill.x = rig.x;
  for (const id of CREW_ORDER) {
    const agent = crew[id],
      model = id === 'excavator' ? machine : vehicleFleet[id].model;
    model.position.set(0, 0, 0);
    placeAgent(agent);
  }
  return crew;
}
function startJobs(crew) {
  crew.excavator.job = excavatorJob(crew.excavator, crew);
  crew.dumper.job = dumperJob(crew.dumper, crew);
  crew.dozer.job = dozerJob(crew.dozer, crew);
  if (!crew.drill.job) crew.drill.job = drillJob(crew.drill);
  crew.excavator.finished = false;
  crew.heapsPending = 0;
  crew.lane = null;
}
function acquireLane(crew, id) {
  if (crew.lane && crew.lane !== id) return false;
  crew.lane = id;
  return true;
}
function releaseLane(crew, id) {
  if (crew.lane === id) crew.lane = null;
}

// ------------------------------------------------------------------ motion
/** Writes an agent's pose to its carrier, following the terrain like an operated machine. */
function placeAgent(agent) {
  const record = vehicleFleet[agent.id],
    pose = terrainPoseAt(agent.id, agent.x, agent.z, agent.heading, agent.pose),
    model = agent.id === 'excavator' ? machine : record.model;
  record.carrier.position.set(agent.x, pose.height, agent.z);
  record.carrier.rotation.set(0, agent.heading, 0);
  record.position.set(agent.x, pose.height, agent.z);
  record.heading = agent.heading;
  model.rotation.set(pose.roll, 0, pose.pitch);
  record.carrier.updateMatrixWorld(true);
}
/** Applies the speed and turn rate a job set this step, unless the move would collide. */
function integrateAgent(agent) {
  if (!agent.moved) agent.speed = agent.turn = 0;
  agent.moved = false;
  let { speed, turn } = agent;
  if (speed || turn) {
    const heading = agent.heading + turn * WORK_DT,
      x = agent.x + Math.cos(heading) * speed * WORK_DT,
      z = agent.z - Math.sin(heading) * speed * WORK_DT,
      blocked = siteCollision(x, z, heading, agent.id);
    if (blocked) {
      agent.blockedFor += WORK_DT;
      agent.blockedBy = blocked;
      speed = turn = agent.speed = agent.turn = 0;
    } else {
      agent.blockedFor = 0;
      vehicleFleet[agent.id].distance += Math.hypot(x - agent.x, z - agent.z);
      agent.x = x;
      agent.z = z;
      agent.heading = heading;
    }
  }
  const half = CREW_TRACK_HALF[agent.id];
  agent.left = speed - turn * half;
  agent.right = speed + turn * half;
  placeAgent(agent);
  if (agent.id === 'excavator') {
    for (const t of trackSystems) {
      const trackSpeed = t.side === -1 ? agent.left : agent.right;
      if (Math.abs(trackSpeed) > 1e-5) {
        t.distance += trackSpeed * WORK_DT;
        t.phase = t.distance / total;
        t.dirty = true;
      }
    }
  } else if (agent.id === 'dozer') dozer.update(WORK_DT, agent.left, agent.right);
  else if (agent.id === 'drill') pileRig.update(WORK_DT, agent.left, agent.right);
  else dumper.update(WORK_DT, speed, speed, 0);
  if (Math.abs(speed) > 0.03 || Math.abs(turn) > 0.02)
    compactUnder(agent.id, agent.x, agent.z, agent.heading);
}
/** Drive straight along the heading by a signed distance (positive is forward). */
function* driveAlong(agent, distance, maxSpeed, accel = 0.6) {
  const startX = agent.x,
    startZ = agent.z,
    dirX = Math.cos(agent.heading),
    dirZ = -Math.sin(agent.heading);
  agent.reversing = distance < 0;
  for (;;) {
    const travelled = (agent.x - startX) * dirX + (agent.z - startZ) * dirZ,
      remaining = distance - travelled;
    if (Math.abs(remaining) < 0.004) break;
    const brake = Math.sqrt(2 * accel * Math.abs(remaining)),
      desired = Math.sign(remaining) * Math.min(maxSpeed, brake),
      next = approach(agent.speed, desired, accel, WORK_DT);
    agent.speed = Math.abs(next * WORK_DT) > Math.abs(remaining) ? remaining / WORK_DT : next;
    agent.turn = 0;
    agent.moved = true;
    agent.load = 0.35 + 0.5 * Math.min(1, Math.abs(agent.speed) / Math.max(0.1, maxSpeed));
    yield;
  }
  agent.speed = 0;
  agent.reversing = false;
}
/** Pivot a tracked machine in place to an absolute heading by the shortest turn. */
function* pivotTo(agent, heading, maxRate = 0.5, accel = 0.9) {
  for (;;) {
    const remaining = wrapAngle(heading - agent.heading);
    if (Math.abs(remaining) < 0.002) break;
    const desired = Math.sign(remaining) * Math.min(maxRate, Math.sqrt(2 * accel * Math.abs(remaining))),
      next = approach(agent.turn, desired, accel, WORK_DT);
    agent.turn = Math.abs(next * WORK_DT) > Math.abs(remaining) ? remaining / WORK_DT : next;
    agent.speed = 0;
    agent.moved = true;
    agent.load = 0.6;
    yield;
  }
  agent.turn = 0;
  agent.heading = wrapAngle(heading);
}
function* waitSeconds(agent, seconds, load = 0.05) {
  for (let t = 0; t < seconds; t += WORK_DT) {
    agent.load = load;
    yield;
  }
}

// ------------------------------------------------------------------ EX–240: dig and load
/**
 * Joint targets each step until the arm settles (or a timeout); the hydraulics do the moving. Like an
 * operator feathering the levers, each cylinder target stays a few degrees ahead of the joint, which
 * keeps the actuator model on the right side of its linkage geometry for large moves.
 */
function* armTo(agent, pose, { tolerance = 1.6, timeout = 7 } = {}) {
  const goal = {};
  for (const key of ['boom', 'stick', 'bucket', 'slew'])
    if (Number.isFinite(pose[key]))
      goal[key] = key === 'slew' ? pose.slew : clamp(pose[key], config[key].min, config[key].max);
  for (let t = 0; t < timeout; t += WORK_DT) {
    for (const key in goal)
      hydraulicState[key].target =
        key === 'slew' ? goal.slew : angles[key] + clamp(goal[key] - angles[key], -9, 9);
    if (Object.keys(goal).every(key => Math.abs(angles[key] - goal[key]) < tolerance)) return true;
    agent.load = 0.25 + 0.75 * clamp(hydraulicsPump.utilization, 0, 1);
    yield;
  }
  return false;
}
/** Carry pose: bucket curled with its pivot high enough to clear the dumper cab and body. */
function carryPose(slew) {
  return { ...armPivotIK(4.1, 5.3), bucket: config.bucket.min, slew };
}
/** Surface heights along the arm plane at a slew, for reaches 3.4–6.0 m. */
function digProfile(agent, slew) {
  const profile = [];
  for (let r = 3.4; r <= 6.01; r += 0.2) {
    const p = armWorld(agent, slew, r);
    profile.push({ r, h: soilSimulation.heightAt(p.x, p.z) - agent.pose.height });
  }
  return profile;
}
/** Picks the slew with the most material within reach, or null when the reachable pile is used up. */
function chooseDigSpot(agent) {
  const centre = excavatorLocal(agent, 11.5, -9.2),
    aim = armAim(centre.x, centre.z).slew;
  let best = null;
  // A fan of dig lines across the stockpile face, from one side of the pile to the other.
  for (const offset of [-24, -16, -8, 0, 8, 16, 24]) {
    const slew = aim + offset,
      profile = digProfile(agent, slew),
      // Only soil above the lowest useful cut counts (the teeth stay ~0.36 m up to clear the guard).
      material = profile.reduce((sum, p) => sum + Math.max(0, p.h - 0.42), 0) * 0.2,
      score = material * (agent.dry?.[offset] ? 0.25 : 1) * (0.9 + rand() * 0.2);
    if (material > 0.08 && (!best || score > best.score)) best = { slew, offset, profile, score };
  }
  return best;
}
/** Approach, penetrate, drag towards the machine, curl and lift: a list of arm poses. */
function digSequence(spot) {
  const profile = spot.profile,
    rich = profile.filter(p => p.h > 0.45),
    far = rich.length ? Math.min(5.9, rich[rich.length - 1].r) : 5.4,
    near = Math.max(3.6, Math.min(far - 1.2, rich.length ? rich[0].r : 3.8)),
    heightAt = r => {
      let h = 0;
      for (const p of profile) if (Math.abs(p.r - r) < 0.11) h = p.h;
      return h;
    },
    poses = [],
    tip = (r, y, psi) => {
      let pose = armTipIK(r, y, psi);
      for (let lift = 0; armLowestPoint(pose) < 0.14 && lift < 2; lift += 0.1)
        pose = armTipIK(r, y + lift, psi);
      return { ...pose, slew: spot.slew };
    };
  poses.push(tip(far + 0.15, heightAt(far) + 0.9, 85));
  poses.push(tip(far, Math.max(0.36, heightAt(far) - 0.45), 75));
  for (let i = 1; i <= 3; i++) {
    const r = far + ((near - far) * i) / 3;
    poses.push(tip(r, Math.max(0.36, heightAt(r) - 0.4), 75 - i * 18));
  }
  const curl = tip(near, Math.max(0.6, heightAt(near) + 0.05), 0);
  poses.push({ ...curl, bucket: config.bucket.min });
  poses.push(carryPose(spot.slew));
  return poses;
}
/** Where to hold the bucket over the dumper body: slew and pose with the pivot above the body centre. */
function bodyTarget(agent) {
  dumper.bed.updateWorldMatrix(true, false);
  dumper.bed.localToWorld(workPoint.set(2.55, dumper.body.floorY, 0));
  const local = excavatorLocal(agent, workPoint.x, workPoint.z),
    aim = armAim(local.x, local.z),
    rim = workPoint.y - dumper.body.floorY + dumper.body.rimY - agent.pose.height;
  return {
    slew: aim.slew,
    pose: { ...armPivotIK(aim.reach, rim + 1.35), bucket: config.bucket.min, slew: aim.slew },
  };
}
/** Swing over the waiting dumper, pour the bucket into its body and curl back. Returns the slew used. */
function* loadDumper(agent, crew) {
  while (!(crew.dumper.loading && dumper.capacity - dumper.state.payloadVolume > 0.04)) {
    agent.status = 'Bucket full · waiting for the dumper';
    agent.load = 0.12;
    yield;
  }
  const pass = Math.min(4, Math.round(dumper.state.payloadVolume / soilSimulation.payloadCapacity) + 1);
  agent.status = `Loading the dumper · pass ${pass} of 4`;
  const body = bodyTarget(agent);
  yield* armTo(agent, carryPose(body.slew));
  yield* armTo(agent, body.pose, { tolerance: 2 });
  // A full bucket opens at about 30°/s; the load pours out once it passes 128°.
  yield* armTo(agent, { ...body.pose, bucket: 140 }, { tolerance: 4, timeout: 6.5 });
  yield* waitSeconds(agent, 0.45, 0.3);
  workMode.stats.passes++;
  yield* armTo(agent, { ...body.pose, bucket: config.bucket.min }, { tolerance: 4, timeout: 3 });
  return body.slew;
}
function* excavatorJob(agent, crew) {
  agent.dry = {};
  agent.poorPasses = 0;
  let slew = angles.slew;
  agent.status = 'Raising the boom';
  yield* armTo(agent, carryPose(slew), { timeout: 5 });
  for (;;) {
    const spot = agent.poorPasses < 4 ? chooseDigSpot(agent) : null;
    if (!spot) {
      // The reachable part of the stockpile is used up: pour what is left, then rest.
      while (soilSimulation.bucketPayload > 0.02) slew = yield* loadDumper(agent, crew);
      agent.status = 'Reachable stockpile cleared';
      yield* armTo(agent, carryPose(slew), { timeout: 4 });
      agent.finished = true;
      for (;;) {
        agent.load = 0.05;
        yield;
      }
    }
    agent.status = 'Digging the earth stockpile';
    yield* armTo(agent, carryPose(spot.slew));
    const before = soilSimulation.bucketPayload;
    for (const pose of digSequence(spot)) yield* armTo(agent, pose, { tolerance: 2, timeout: 4 });
    slew = spot.slew;
    const caught = soilSimulation.bucketPayload - before;
    for (const key in agent.dry) agent.dry[key] = Math.max(0, agent.dry[key] - 1);
    if (caught < 0.12) agent.dry[spot.offset] = 3;
    agent.poorPasses = caught < 0.12 ? agent.poorPasses + 1 : 0;
    // Top up a part-filled bucket before swinging, unless the pile has little left.
    if (soilSimulation.bucketPayload < 0.45 && agent.poorPasses < 4) continue;
    if (soilSimulation.bucketPayload > 0.02) slew = yield* loadDumper(agent, crew);
  }
}

// ------------------------------------------------------------------ dumper: haul and tip
function* bodyTo(agent, tip) {
  while (Math.abs(dumper.state.tip - tip) > 0.05) {
    dumper.set('tip', approach(dumper.state.tip, tip, dumper.speeds.tip, WORK_DT));
    agent.load = 0.55;
    yield;
  }
}
function* dumperJob(agent, crew) {
  const load = WORK_SITE.dumperLoad;
  for (;;) {
    agent.status = 'Lowering the body';
    yield* bodyTo(agent, 0);
    agent.loading = true;
    for (;;) {
      const payload = dumper.state.payloadVolume;
      if (payload >= dumper.capacity - 0.05) break;
      if (crew.excavator.finished && payload > 0.3) break;
      agent.status = payload > 1e-6 ? 'Under the excavator · loading' : 'Waiting under the excavator';
      agent.load = 0.08;
      yield;
    }
    agent.loading = false;
    while (!acquireLane(crew, 'dumper')) {
      agent.status = 'Loaded · waiting for the dozer to clear the pad';
      agent.load = 0.1;
      yield;
    }
    agent.status = 'Reversing to the fill pad';
    yield* driveAlong(agent, -(WORK_SITE.dumperTipX - agent.x), 1.6, 0.7);
    agent.status = 'Tipping the load';
    const carried = dumper.state.payloadVolume;
    while (!dumper.state.dumped && dumper.state.payloadVolume > 1e-6) {
      dumper.set('tip', approach(dumper.state.tip, dumper.limits.tip[1], dumper.speeds.tip, WORK_DT));
      agent.load = 0.7;
      yield;
    }
    yield* waitSeconds(agent, 1.2, 0.3);
    workMode.stats.loads++;
    workMode.stats.moved += carried - dumper.state.payloadVolume;
    crew.heapsPending++;
    agent.status = 'Lowering the body';
    yield* bodyTo(agent, 0);
    agent.status = 'Returning to the excavator';
    yield* driveAlong(agent, agent.x - load.x, 2.2, 0.7);
    releaseLane(crew, 'dumper');
  }
}

// ------------------------------------------------------------------ dozer: spread and trim
/** Grade control: hold the blade's cutting edge at a world height while driving. */
function holdBladeAt(level) {
  dozer.blade.updateWorldMatrix(true, false);
  const edge = dozer.blade.localToWorld(workPoint.set(0.31, -0.02, 0)).y,
    wanted = clamp(level - (edge - dozer.state.lift), dozer.limits.lift[0], dozer.limits.lift[1]);
  dozer.set('lift', approach(dozer.state.lift, wanted, dozer.speeds.lift, WORK_DT));
}
function* bladeTo(agent, lift) {
  while (Math.abs(dozer.state.lift - lift) > 0.01) {
    dozer.set('lift', approach(dozer.state.lift, lift, dozer.speeds.lift, WORK_DT));
    agent.load = 0.3;
    yield;
  }
}
/** Drive forward with the blade at a grade, pushing soil. */
function* pushTo(agent, distance, level, speed) {
  agent.pushing = true;
  const drive = driveAlong(agent, distance, speed, 0.5);
  for (let step = drive.next(); !step.done; step = drive.next()) {
    holdBladeAt(level);
    agent.load = 0.55 + Math.min(0.45, dozerPushRate * 25);
    yield;
  }
  agent.pushing = false;
}
function* dozerJob(agent, crew) {
  const wait = WORK_SITE.dozerWait,
    north = WORK_SITE.dozerNorthZ,
    laneX = WORK_SITE.dozerPushX,
    endZ = WORK_SITE.dozerPushEndZ;
  for (;;) {
    agent.status = 'Waiting for a load to spread';
    while (!(crew.heapsPending > 0 && acquireLane(crew, 'dozer'))) {
      agent.load = 0.05;
      yield;
    }
    agent.status = 'Moving behind the new load';
    yield* bladeTo(agent, 0.5);
    yield* pivotTo(agent, Math.PI / 2, 0.65);
    yield* driveAlong(agent, agent.z - north, 1.45);
    yield* pivotTo(agent, Math.PI, 0.65);
    yield* driveAlong(agent, agent.x - laneX, 1.2);
    yield* pivotTo(agent, -Math.PI / 2, 0.65);
    const level = Math.min(0.6, 0.12 * Math.floor(workMode.stats.spread / 3));
    agent.status = 'Spreading the load';
    yield* pushTo(agent, endZ - agent.z, level + 0.3, 0.9);
    yield* bladeTo(agent, 0.5);
    agent.status = 'Backing up for a trim pass';
    yield* driveAlong(agent, -(agent.z - north), 1.6);
    agent.status = 'Trimming the fill pad';
    yield* pushTo(agent, endZ - agent.z, level + 0.12, 0.9);
    yield* bladeTo(agent, 0.5);
    agent.status = 'Clearing the haul lane';
    yield* pivotTo(agent, 0, 0.65);
    yield* driveAlong(agent, wait.x - agent.x, 1.2);
    crew.heapsPending = Math.max(0, crew.heapsPending - 1);
    workMode.stats.spread++;
    releaseLane(crew, 'dozer');
  }
}

// ------------------------------------------------------------------ PR–180: bore a pile grid
/** Move the rig's mast tools towards targets at their own speeds, until they arrive or `until()` holds. */
function* rigTool(agent, goal, until = null, timeout = 8) {
  for (let t = 0; t < timeout; t += WORK_DT) {
    if (until && until()) return;
    let done = true;
    for (const key in goal) {
      pileRig.set(key, approach(pileRig.state[key], goal[key], pileRig.speeds[key], WORK_DT));
      if (Math.abs(pileRig.state[key] - goal[key]) > 0.01) done = false;
    }
    pileRig.state.spinning = false;
    agent.load = 0.3;
    if (done) return;
    yield;
  }
}
function* boreHole(agent) {
  let stalledFor = 0;
  for (let t = 0; t < 30; t += WORK_DT) {
    pileRig.state.spinning = true;
    pileRig.set('head', approach(pileRig.state.head, 3.4, pileRig.speeds.head, WORK_DT));
    pileRig.set('extension', approach(pileRig.state.extension, 1.6, pileRig.speeds.extension, WORK_DT));
    const hole = advanceDrilling(WORK_DT, false);
    agent.load = 0.45 + 0.55 * clamp(pileRig.state.torque / pileRig.state.maxTorque, 0, 1);
    if (hole) {
      agent.status = `Boring · ${hole.layer} · ${hole.depth.toFixed(1)} m`;
      stalledFor = hole.stalled ? stalledFor + WORK_DT : 0;
      if (hole.depth >= 2.15 || stalledFor > 1.2) break;
    } else agent.status = 'Spinning up the auger';
    yield;
  }
  pileRig.state.spinning = false;
}
function* drillJob(agent) {
  const plan = WORK_SITE.drill;
  for (let round = 0; ; round++) {
    for (const stop of plan.stops[round % plan.stops.length]) {
      agent.status = 'Raising the auger';
      yield* rigTool(agent, { head: 6.2, extension: 0.1 });
      agent.status = 'Moving to the next pile position';
      yield* driveAlong(agent, stop - agent.x, 0.55, 0.4);
      for (const slew of plan.slews) {
        agent.status = 'Slewing over the pile mark';
        yield* rigTool(agent, { slew });
        agent.status = 'Lowering the auger';
        // The auger stops at the ground (the rig model keeps it above grade until it spins).
        yield* rigTool(agent, { head: 4.3, extension: 0.8 }, () => pileRig.tipWorld().y < 0.4);
        yield* boreHole(agent);
        agent.status = 'Extracting the auger';
        yield* rigTool(agent, { head: 6.2, extension: 0.1 });
        workMode.stats.piles++;
      }
    }
  }
}

// ------------------------------------------------------------------ simulation step
function stepWorkMode(dt) {
  const crew = workMode.crew;
  if (!crew) return;
  workMode.elapsed += dt;
  const excavatorAgent = crew.excavator;
  excavatorAgent.job.next();
  integrateAgent(excavatorAgent);
  stepHydraulics(dt);
  excavatorCarrier.updateMatrixWorld(true);
  stepBucketSoil(bucketTip(workTip));
  for (const id of ['drill', 'dozer', 'dumper']) {
    const agent = crew[id];
    agent.job.next();
    integrateAgent(agent);
    if (id === 'dozer') {
      dozerPushRate = 0;
      if (agent.pushing && agent.speed > 0.02) pushWithBlade();
    }
    if (id === 'dumper') {
      if (dumper.state.dumped && !agent.wasDumped)
        releaseDumperLoad(
          agent.x + Math.cos(agent.heading) * -4.35,
          agent.z - Math.sin(agent.heading) * -4.35
        );
      agent.wasDumped = dumper.state.dumped;
    }
  }
  yardPhysics.syncFleet(vehicleFleet, null, null, 0, dt, crew.moving);
  stepYardProps(dt);
  if (soilSimulation.relax(dt, 1) > 1e-10) soilSurfaceDirty = true;
  for (const id of CREW_ORDER) {
    const agent = crew[id];
    agent.clock.smoke -= dt;
    agent.clock.dust -= dt;
    emitMachineEffects(
      id,
      agent.x,
      agent.z,
      agent.heading,
      Math.abs(agent.speed) + Math.abs(agent.turn) * 2,
      agent.clock
    );
  }
  // Shift end: the reachable stockpile is moved and spread; restock the yard and go again.
  const idle =
    crew.excavator.finished &&
    crew.dumper.loading &&
    dumper.state.payloadVolume <= 0.3 &&
    crew.heapsPending === 0 &&
    crew.lane === null;
  if (idle) {
    crew.restockIn += dt;
    if (crew.restockIn > 4) restockShift();
  } else crew.restockIn = 0;
}
function restockShift() {
  const crew = workMode.crew;
  resetYard();
  crew.dumper.wasDumped = dumper.state.dumped;
  workMode.shift++;
  crew.restockIn = 0;
  startJobs(crew);
  notify(`Shift ${workMode.shift} · stockpile restocked, the crew starts again`);
}

// ------------------------------------------------------------------ entering and leaving
function setWorkMode(on, silent = false) {
  on = !!on;
  if (on === workMode.active) return true;
  if (!on) return stopWorkMode(silent);
  if (assembly.mode) {
    notify('Reassemble before starting work mode');
    return false;
  }
  if (exploreMode && !setExploreMode(false, true)) return false;
  parkActiveVehicle();
  workMode.returnTo = activeVehicle;
  workMode.active = true;
  mode = 'manual';
  resetTween = null;
  demoStart = null;
  freezeHydraulics();
  document.body.classList.add('work-mode');
  document.body.classList.remove('drill-mode', 'dozer-mode', 'dumper-mode');
  workMode.shift = 1;
  workMode.elapsed = 0;
  workMode.stats = { passes: 0, loads: 0, moved: 0, spread: 0, piles: 0 };
  const crew = createCrew();
  workMode.crew = crew;
  crew.dumper.wasDumped = dumper.state.dumped;
  startJobs(crew);
  setConsole(false);
  if (!site.overview) setSiteOverview(true);
  $('.heading .eyebrow').textContent = 'AUTONOMOUS SITE DEMO';
  $('.heading h1').textContent = 'WORK MODE';
  $('.heading p').textContent = 'Every machine on the job.';
  $('#consoleTitle').textContent = 'The site is working.';
  $('#consoleIntro').textContent =
    'Each machine runs its own job on one shared soil model. Pick a machine to follow it, or watch the whole yard.';
  $('.stage-hint').innerHTML = '<span>↔ DRAG TO ORBIT</span><span>ESC STOPS WORK MODE</span>';
  $('.compass-note').innerHTML = 'WORK MODE · AUTONOMOUS CREW<br>DIG · LOAD · HAUL · SPREAD · BORE';
  updateWorkButton();
  updateWorkUI();
  updateSiteUI();
  if (!silent) notify('Work mode · the whole crew is on the job');
  return true;
}
/** Leaves every machine safe where it stands and hands control back to the operator. */
function stopWorkMode(silent = false) {
  dumper.set('tip', 0);
  dumper.update(0, 0, 0, 0);
  pileRig.state.spinning = false;
  pileRig.state.rpm = 0;
  pileRig.set('head', 4.8);
  pileRig.set('extension', 0.6);
  pileRig.update(0);
  freezeHydraulics();
  for (const id of CREW_ORDER) {
    const record = vehicleFleet[id];
    (id === 'excavator' ? machine : record.model).rotation.set(0, 0, 0);
  }
  const preferred = workMode.returnTo || lastVehicle,
    order = [preferred, ...vehicleOrder.filter(v => v !== preferred)];
  let restored = null;
  for (const vehicle of order)
    if (switchVehicle(vehicle, true, true)) {
      restored = vehicle;
      break;
    }
  if (!restored) {
    notify('Work mode cannot stop here · a machine is blocked');
    return false;
  }
  workMode.crew = null;
  updateWorkButton();
  if (!silent) notify('Work mode stopped · ' + vehicleFleet[restored].label + ' ready');
  return true;
}

// ------------------------------------------------------------------ interface
const workButton = document.createElement('button');
workButton.id = 'workModeToggle';
workButton.type = 'button';
workButton.onclick = () => setWorkMode(!workMode.active);
const modeButtons = document.createElement('div');
modeButtons.id = 'modeButtons';
document.body.appendChild(modeButtons);
modeButtons.append(vehicleButton, workButton);
function updateWorkButton() {
  workButton.textContent = workMode.active ? '■ STOP WORK MODE' : '▶ WORK MODE';
  workButton.setAttribute('aria-pressed', workMode.active);
  workButton.setAttribute(
    'aria-label',
    workMode.active
      ? 'Stop work mode and take back a machine'
      : 'Start work mode: every machine works on its own'
  );
}
updateWorkButton();
const CREW_LABELS = {
  excavator: ['EX–240', 'Digs and loads', '#748c73'],
  dumper: ['DUMPER', 'Hauls and tips', '#d18d3b'],
  dozer: ['DOZER', 'Spreads the fill', '#a48142'],
  drill: ['PR–180', 'Bores the pile grid', '#6d8ea7'],
};
const crewRows = id =>
  `<button type="button" class="work-machine" data-follow="${id}" aria-pressed="false" style="--machine:${CREW_LABELS[id][2]}"><i></i><span><b>${CREW_LABELS[id][0]}</b><em data-status="${id}">${CREW_LABELS[id][1]}</em></span><small>FOLLOW</small></button>`;
const workPanel = document.createElement('section');
workPanel.id = 'workPanel';
workPanel.setAttribute('aria-label', 'Work mode crew');
workPanel.innerHTML = `<div class="work-summary"><div><label>SHIFT</label><strong data-work="shift">1</strong></div><div><label>TIME</label><strong data-work="clock">00:00</strong></div><div><label>LOADS</label><strong data-work="loads">0</strong></div><div><label>MOVED</label><strong data-work="moved">0.0</strong><small> m³</small></div><div><label>PILES</label><strong data-work="piles">0</strong></div></div><div class="work-crew" role="group" aria-label="Follow a machine">${['excavator', 'dumper', 'dozer', 'drill'].map(crewRows).join('')}</div><button type="button" class="work-overview" data-work-overview aria-pressed="true">↗ WHOLE SITE</button><p class="work-note">The EX–240 loads the dumper from the earth stockpile, the dumper tips on the fill pad, the dozer spreads each load and the PR–180 bores piles beside its bay. Material volume is conserved throughout.</p><button type="button" class="reset" data-work-stop>■ &nbsp; STOP WORK MODE</button>`;
$('#assemblyPanel').after(workPanel);
// Phones: the same crew list replaces the gamepad controls while the crew works.
const workPad = document.createElement('div');
workPad.id = 'workPad';
workPad.innerHTML = `<div class="work-crew" role="group" aria-label="Follow a machine">${['excavator', 'dumper', 'dozer', 'drill'].map(crewRows).join('')}</div><div class="work-pad-actions"><button type="button" class="work-overview" data-work-overview aria-pressed="true">↗ SITE</button><button type="button" data-work-stop>■ STOP</button></div>`;
pad.insertBefore(workPad, pad.querySelector('#moreControls'));
for (const root of [workPanel, workPad])
  root.addEventListener('click', e => {
    const follow = e.target.closest('[data-follow]');
    if (follow) followCrewMachine(follow.dataset.follow);
    else if (e.target.closest('[data-work-overview]')) setSiteOverview(!site.overview);
    else if (e.target.closest('[data-work-stop]')) setWorkMode(false);
  });
/** Point the follow camera at one crew machine, easing to that machine's viewing angle. */
function followCrewMachine(id) {
  if (!workMode.active || !CREW_VIEWS[id]) return;
  workMode.follow = id;
  if (site.overview) setSiteOverview(false, false);
  const preset = CREW_VIEWS[id],
    start = deg(orbit.getAzimuthalAngle());
  viewTween = {
    start: performance.now(),
    duration: reduced ? 0 : 900,
    theta: start,
    diff: ((preset.theta - start + 540) % 360) - 180,
    phi: deg(orbit.getPolarAngle()),
    endPhi: preset.phi,
    zoom: camera.zoom,
    zoomEnd: 1,
  };
  currentView = null;
  auto = false;
  orbit.autoRotate = false;
  $('#orbit').setAttribute('aria-pressed', 'false');
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  updateWorkUI();
  updateSiteUI();
}
function updateWorkUI() {
  const crew = workMode.crew,
    stats = workMode.stats;
  if (!workMode.active || !crew || !stats) return;
  const minutes = Math.floor(workMode.elapsed / 60),
    seconds = Math.floor(workMode.elapsed % 60),
    values = {
      shift: String(workMode.shift),
      clock: String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'),
      loads: String(stats.loads),
      moved: stats.moved.toFixed(1),
      piles: String(stats.piles),
    };
  for (const [key, value] of Object.entries(values)) {
    const el = workPanel.querySelector(`[data-work="${key}"]`);
    if (el.textContent !== value) el.textContent = value;
  }
  for (const el of document.querySelectorAll('[data-status]')) {
    const text = crew[el.dataset.status].status;
    if (el.textContent !== text) el.textContent = text;
  }
  for (const el of document.querySelectorAll('[data-follow]'))
    el.setAttribute('aria-pressed', !site.overview && el.dataset.follow === workMode.follow);
  for (const el of document.querySelectorAll('[data-work-overview]'))
    el.setAttribute('aria-pressed', site.overview);
  $('#modeStatus').textContent = 'WORK MODE / SHIFT ' + workMode.shift;
}
