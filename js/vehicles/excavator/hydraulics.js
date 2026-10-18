/**
 * IsoMech V2 · EX–240 excavator · joints and hydraulics
 *
 * Joint configuration and console rows, cylinder kinematics, the pump-limited damped actuator model,
 * ground and body guards, manual/hold input, Reset Machine Pose and the arm demo.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Joint state and UI.
const config = {
  boom: {
    label: 'Main boom',
    min: -5,
    max: 68,
    home: 18,
    speed: 18,
    obj: boom,
    axis: 'z',
    captions: ['LOWER', 'RAISE'],
    arrows: ['↓', '↑'],
  },
  stick: {
    label: 'Stick / reach',
    min: -145,
    max: -35,
    home: -100,
    speed: 24,
    obj: stick,
    axis: 'z',
    captions: ['FOLD IN', 'REACH OUT'],
    arrows: ['←', '→'],
  },
  bucket: {
    label: 'Bucket curl',
    min: -15,
    max: 145,
    home: 75,
    speed: 35,
    obj: bucket,
    axis: 'z',
    captions: ['CURL IN', 'OPEN OUT'],
    arrows: ['↶', '↷'],
  },
  slew: {
    label: 'Body slew',
    min: -180,
    max: 180,
    home: 0,
    speed: 25,
    obj: upper,
    axis: 'y',
    captions: ['TURN LEFT', 'TURN RIGHT'],
    arrows: ['↶', '↷'],
  },
};
const icons = {
  boom: '<path d="M4 27h12M9 26V19L20 7L32 11M20 7v6L12 23"/><circle cx="9" cy="25" r="2"/><circle cx="31" cy="11" r="2"/>',
  stick: '<path d="M4 14L24 6L30 27M24 6l-2 5 4 17M23 28h10"/><circle cx="24" cy="8" r="2"/>',
  bucket: '<path d="M15 4v10M12 14l8-2 8 9-5 8H7L4 24l9-3zM8 29l-2 2m8-2-1 3m8-3v3"/>',
  slew: '<ellipse cx="18" cy="24" rx="14" ry="5"/><path d="M9 24v-8h18v8M9 9a13 6 0 0121 1M30 5v6h-6"/>',
};
let dynamicsEnabled = !reduced;
const hydraulicState = {};
let selected = 'boom',
  mode = 'manual',
  angles = {},
  held = null,
  simulationStepSerial = 0,
  resetTween = null,
  demoT = 0,
  demoClock = 0,
  demoStart = null;
for (const [key, c] of Object.entries(config)) {
  angles[key] = c.home;
  hydraulicState[key] = {
    target: c.home,
    velocity: 0,
    cylinderLength: 0,
    targetLength: 0,
    flow: 0,
    pressure: 0,
  };
  const row = document.createElement('div');
  row.className = 'joint' + (key === selected ? ' selected' : '');
  row.dataset.joint = key;
  row.tabIndex = 0;
  row.setAttribute('aria-label', c.label + ' controls');
  row.innerHTML = `<div class="joint-head"><div class="joint-name"><span class="joint-id">0${Object.keys(angles).length}</span>${c.label}</div><output class="angle" id="angle-${key}"></output></div><div class="joint-line"><div class="joint-icon"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${icons[key]}</svg></div><button class="arrow" data-key="${key}" data-dir="-1" aria-label="${c.captions[0].toLowerCase()} ${c.label}">${c.arrows[0]}</button><div class="joint-track"><div class="fill"></div><div class="knob"></div></div><button class="arrow" data-key="${key}" data-dir="1" aria-label="${c.captions[1].toLowerCase()} ${c.label}">${c.arrows[1]}</button></div><div class="joint-caption"><span>${c.captions[0]}</span><span>${c.captions[1]}</span></div>`;
  $('#joints').appendChild(row);
  row.addEventListener('click', () => select(key));
  row.addEventListener('focusin', () => select(key));
}
function select(key) {
  selected = key;
  $$('.joint').forEach(r => r.classList.toggle('selected', r.dataset.joint === key));
}
function sync() {
  for (const [key, c] of Object.entries(config)) {
    const val = key === 'slew' ? ((((angles[key] + 180) % 360) + 360) % 360) - 180 : angles[key];
    const track = $(`[data-joint="${key}"] .joint-track`);
    track.setAttribute('aria-valuenow', Math.round(val));
    const mobile = $('#mobile-' + key);
    if (mobile) {
      if (document.activeElement !== mobile) mobile.value = val;
      $('#mobile-' + key + '-value').textContent = Math.round(val) + '°';
    }
    $('#angle-' + key).textContent = Math.round(val) + '°';
    const row = $(`[data-joint="${key}"]`),
      p = ((val - c.min) / (c.max - c.min)) * 100;
    row.querySelector('.fill').style.width = p + '%';
    row.querySelector('.knob').style.left = p + '%';
    row.querySelector('[data-dir="-1"]').disabled = val <= c.min + 0.01 && key !== 'slew';
    row.querySelector('[data-dir="1"]').disabled = val >= c.max - 0.01 && key !== 'slew';
  }
  $('#manual').setAttribute('aria-pressed', mode === 'manual');
  $('#demo').setAttribute('aria-pressed', mode === 'demo');
  $('#demo').textContent = mode === 'demo' ? 'Ⅱ PAUSE DEMO' : '▶ ARM DEMO';
  $('#modeStatus').textContent = assembly.mode
    ? 'INSPECTION MODE'
    : driveConsole
      ? Math.abs(drive.left) + Math.abs(drive.right) > 0.02
        ? 'TRAVEL ACTIVE'
        : 'PARKED'
      : mode === 'demo'
        ? 'DEMO SEQUENCE'
        : resetTween
          ? 'RETURNING HOME'
          : 'HYDRAULICS READY';
  syncDriveUI();
}
function apply() {
  for (const [key, c] of Object.entries(config)) c.obj.rotation[c.axis] = rad(angles[key]);
  driveRoot.updateMatrixWorld(true);
}
const up = new THREE.Vector3(0, 1, 0),
  direction = new THREE.Vector3();
function cylinderLengthAt(joint, angle) {
  let total = 0,
    count = 0;
  for (const h of hyd) {
    if (h.joint !== joint) continue;
    const radians = rad(angle),
      c = Math.cos(radians),
      s = Math.sin(radians),
      child = h.pb,
      endX = child.position.x + c * h.b.x - s * h.b.y,
      endY = child.position.y + s * h.b.x + c * h.b.y,
      dx = endX - h.a.x,
      dy = endY - h.a.y,
      dz = child.position.z + h.b.z - h.a.z;
    total += Math.hypot(dx, dy, dz);
    count++;
  }
  return count ? total / count : 0;
}
const hydraulicsPump = { maxFlow: 0.0065, demand: 0, utilization: 0 };
function hydraulicLoad(joint) {
  const reach = clamp((angles.stick - config.stick.min) / (config.stick.max - config.stick.min), 0, 1),
    payload = soilSimulation ? soilSimulation.bucketPayload : 0;
  return joint === 'boom'
    ? 0.55 + reach * 0.65 + payload * 2.1
    : joint === 'stick'
      ? 0.32 + reach * 0.55 + payload
      : joint === 'bucket'
        ? 0.2 + payload * 1.8
        : 0.1;
}
function updateHydraulics(refreshReference = false) {
  machine.updateWorldMatrix(true, true);
  hydraulics.updateWorldMatrix(true, false);
  for (const h of hyd) {
    h.A.copy(h.a);
    h.pa.localToWorld(h.A);
    hydraulics.worldToLocal(h.A);
    h.B.copy(h.b);
    h.pb.localToWorld(h.B);
    hydraulics.worldToLocal(h.B);
    direction.subVectors(h.B, h.A);
    const len = direction.length();
    h.length = len;
    h.g.position.copy(h.A);
    h.g.quaternion.setFromUnitVectors(up, direction.normalize());
    if (refreshReference || h.bodyLength === undefined) h.bodyLength = len * 0.52;
    const bodyLen = Math.min(h.bodyLength, Math.max(0.02, len - 0.04));
    h.barrel.scale.y = bodyLen;
    h.barrel.position.y = bodyLen * 0.5;
    h.sleeve.position.y = bodyLen;
    h.piston.scale.y = Math.max(0.02, len - bodyLen);
    h.piston.position.y = (bodyLen + len) * 0.5;
    h.pinA.position.copy(h.A);
    h.pinB.position.copy(h.B);
  }
}
// Ground and body-envelope guards keep manual movement within a useful workspace.
const checkPoints = [
    [-1.02, -0.72, -0.5],
    [-1.02, -0.72, 0.5],
    [0.18, -0.89, -0.58],
    [0.18, -0.89, 0.58],
    [0.71, -0.45, 0],
    [0, 0, 0],
  ],
  temp = new THREE.Vector3(),
  upperPoint = new THREE.Vector3();
function poseValid() {
  if (exploreMode || activeVehicle !== 'excavator') return true;
  for (const p of checkPoints) {
    temp.set(...p);
    bucket.localToWorld(temp);
    if (temp.y < 0.07) return false;
    upperPoint.copy(temp);
    upper.worldToLocal(upperPoint);
    if (upperPoint.x < 1.35 && upperPoint.x > -2.4 && upperPoint.y < 1.6 && Math.abs(upperPoint.z) < 1.27)
      return false;
  }
  return true;
}
function freezeHydraulics() {
  for (const k in config) {
    hydraulicState[k].target = angles[k];
    hydraulicState[k].velocity = 0;
  }
}
function manual() {
  if (mode !== 'manual' || resetTween) freezeHydraulics();
  mode = 'manual';
  resetTween = null;
  demoStart = null;
  sync();
}
// Commands set a valve target. A damped actuator, below, moves the actual joint.
function move(key, delta) {
  if (assembly.mode) return false;
  const h = hydraulicState[key],
    c = config[key];
  h.target = key === 'slew' ? h.target + delta : clamp(h.target + delta, c.min, c.max);
  return true;
}
function stopHold() {
  held = null;
  $$('.arrow.held').forEach(b => b.classList.remove('held'));
}
$$('.arrow').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    manual();
    select(b.dataset.key);
    stopHold();
    b.setPointerCapture(e.pointerId);
    b.classList.add('held');
    held = { key: b.dataset.key, dir: +b.dataset.dir, startStep: simulationStepSerial };
    move(held.key, held.dir * 1.25);
    sync();
  });
  b.addEventListener('pointerup', stopHold);
  b.addEventListener('pointercancel', stopHold);
  b.addEventListener('lostpointercapture', stopHold);
  b.addEventListener('click', e => {
    if (e.detail === 0) {
      manual();
      select(b.dataset.key);
      move(b.dataset.key, +b.dataset.dir * 2);
      sync();
    }
  });
});
window.addEventListener('blur', () => {
  stopHold();
  releaseDrive();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopHold();
    releaseDrive();
    drive.left = drive.right = 0;
    freezeHydraulics();
  }
});
function reset() {
  if (assembly.mode || exploreMode) return;
  if (activeVehicle === 'drill') {
    clearKeyboard();
    joyEnd();
    pileRig.reset();
    syncRigUI();
    return;
  }
  if (activeVehicle === 'dozer') {
    clearKeyboard();
    joyEnd();
    dozer.reset();
    syncDozerUI();
    notify('Blade returned to working position');
    return;
  }
  if (activeVehicle === 'dumper') {
    clearKeyboard();
    joyEnd();
    drive.steering = 0;
    resetDumperBody();
    syncDumperUI();
    notify('Dump body lowered · load restored');
    return;
  }
  clearKeyboard();
  joyEnd();
  stopHold();
  freezeHydraulics();
  mode = 'manual';
  resetTween = { start: performance.now(), from: { ...angles } };
  sync();
}
$('#reset').onclick = reset;
$('#manual').onclick = () => {
  stopHold();
  manual();
};
$('#demo').onclick = () => {
  stopHold();
  releaseDrive();
  freezeHydraulics();
  if (mode === 'demo') {
    manual();
    return;
  }
  resetTween = null;
  mode = 'demo';
  demoT = 0;
  demoClock = performance.now();
  demoStart = { ...angles };
  sync();
};
// All demo poses go through the same ground/body guard as the manual controls.
const demoPoses = [
  { boom: 18, stick: -100, bucket: 75, slew: 0 },
  { boom: 10, stick: -69, bucket: 48, slew: 0 },
  { boom: 7, stick: -66, bucket: 47, slew: 0 },
  { boom: 13, stick: -105, bucket: 20, slew: 0 },
  { boom: 39, stick: -113, bucket: 23, slew: 0 },
  { boom: 39, stick: -105, bucket: 25, slew: -58 },
  { boom: 31, stick: -88, bucket: 112, slew: -58 },
  { boom: 39, stick: -100, bucket: 75, slew: -58 },
  { boom: 29, stick: -100, bucket: 75, slew: 0 },
  { boom: 18, stick: -100, bucket: 75, slew: 0 },
];
const ease = t => t * t * (3 - 2 * t);
function interpolate(a, b, t) {
  const next = {};
  for (const k in config) next[k] = a[k] + (b[k] - a[k]) * t;
  return next;
}
function safePose(next) {
  const prev = { ...angles };
  angles = next;
  apply();
  if (!poseValid()) {
    angles = prev;
    apply();
    return false;
  }
  return true;
}
function stepHydraulics(dt) {
  const old = { ...angles },
    requests = [];
  let changed = false,
    totalDemand = 0;
  for (const [key, c] of Object.entries(config)) {
    const h = hydraulicState[key],
      v0 = h.velocity;
    if (key === 'slew') {
      const error = h.target - angles.slew,
        inertia = 1.55,
        stiffness = dynamicsEnabled ? 20 : 34,
        damping = dynamicsEnabled ? 8.5 : 18;
      const acceleration = (stiffness * error - damping * h.velocity) / inertia;
      h.velocity = clamp(h.velocity + acceleration * dt, -c.speed * 1.25, c.speed * 1.25);
      if (Math.abs(error) < 0.001 && Math.abs(h.velocity) < 0.006) {
        angles.slew = h.target;
        h.velocity = 0;
      } else {
        angles.slew += h.velocity * dt;
        changed = true;
      }
      if (angles.slew > 180 || angles.slew < -180) {
        const offset = angles.slew > 180 ? -360 : 360;
        angles.slew += offset;
        h.target += offset;
      }
      h.pressure = Math.min(1.5, 0.25 + Math.abs(error) * 0.012);
      h.flow = 0;
      if (dynamicsEnabled) rock.rollV += (h.velocity - v0) * 0.0001;
      continue;
    }
    const load = hydraulicLoad(key),
      droop = key === 'boom' && dynamicsEnabled ? Math.min(0.65, 0.12 + load * 0.22) : 0;
    const targetAngle = clamp(h.target - droop, c.min, c.max),
      currentLength = cylinderLengthAt(key, angles[key]),
      targetLength = cylinderLengthAt(key, targetAngle);
    const epsilon = 0.05,
      jacobian =
        (cylinderLengthAt(key, angles[key] + epsilon) - cylinderLengthAt(key, angles[key] - epsilon)) /
        (2 * epsilon);
    const area = hyd
      .filter(actuatorState => actuatorState.joint === key)
      .reduce((sum, actuatorState) => sum + Math.PI * actuatorState.radius * actuatorState.radius, 0);
    const maxAngularSpeed = c.speed * (dynamicsEnabled ? 1.35 : 1.7),
      loadFactor = 1 / (1 + 0.32 * load);
    const desiredStroke =
      clamp(
        (targetLength - currentLength) * 7,
        -Math.abs(jacobian) * maxAngularSpeed,
        Math.abs(jacobian) * maxAngularSpeed
      ) * loadFactor;
    const flow = Math.abs(desiredStroke) * area;
    totalDemand += flow;
    requests.push({ key, c, h, load, currentLength, targetLength, jacobian, area, desiredStroke, flow, v0 });
  }
  const pumpScale = totalDemand > 0 ? Math.min(1, hydraulicsPump.maxFlow / totalDemand) : 1;
  hydraulicsPump.demand = totalDemand * pumpScale;
  hydraulicsPump.utilization = hydraulicsPump.maxFlow ? hydraulicsPump.demand / hydraulicsPump.maxFlow : 0;
  for (const r of requests) {
    const { key, c, h, load, currentLength, targetLength, jacobian, area, desiredStroke, v0 } = r;
    h.targetLength = targetLength;
    h.pressure = 0.25 + load * 0.45 + (Math.abs(desiredStroke) * pumpScale > 0.001 ? 0.35 : 0);
    if (Math.abs(jacobian) < 1e-5 || area === 0) {
      h.velocity = 0;
      h.flow = 0;
      continue;
    }
    const strokeDelta = desiredStroke * pumpScale * dt,
      angleDelta = strokeDelta / jacobian;
    angles[key] = clamp(angles[key] + angleDelta, c.min, c.max);
    h.velocity = (angles[key] - old[key]) / Math.max(dt, 1e-8);
    h.cylinderLength = cylinderLengthAt(key, angles[key]);
    h.flow = area * Math.abs((h.cylinderLength - currentLength) / Math.max(dt, 1e-8));
    if (Math.abs(angles[key] - old[key]) > 1e-10) changed = true;
    if (dynamicsEnabled) {
      if (key === 'boom') rock.pitchV -= (h.velocity - v0) * 0.0006;
      if (key === 'stick') rock.pitchV -= (h.velocity - v0) * 0.00025;
    }
  }
  if (changed) {
    apply();
    if (!poseValid()) {
      angles = old;
      for (const key in config) {
        hydraulicState[key].target = angles[key];
        hydraulicState[key].velocity = 0;
      }
      apply();
      if (performance.now() - lastLimitNotice > 1800) {
        notify('WORKSPACE LIMIT · hydraulic stop');
        lastLimitNotice = performance.now();
      }
    }
  }
  for (const key of ['boom', 'stick', 'bucket']) {
    const h = hydraulicState[key];
    h.cylinderLength = cylinderLengthAt(key, angles[key]);
  }
}
