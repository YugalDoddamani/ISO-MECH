/**
 * IsoMech V2 · Site audio
 *
 * Procedural Web Audio, with no sound files. Every machine has a diesel voice whose revs and load follow
 * what it is doing (hydraulic demand, travel, auger torque, blade load), plus hydraulic whine, track
 * clatter or tyre rumble and the reversing alarm. One-shot cues from the simulation (digging, pouring
 * into the dump body, tipping, auger stalls, props being hit) come through cueSound() in core/state.js.
 * Sources are panned and attenuated relative to the camera. Browsers only allow audio after a user
 * gesture, so sound starts on the first click or key press; the speaker button or M mutes it, and the
 * choice is remembered.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const SOUND_STORAGE_KEY = 'isomech-sound';
const ENGINE_SPECS = {
  excavator: { idle: 820, max: 1950, cutoff: 430, rumble: 125, tracked: true, level: 0.24 },
  drill: { idle: 760, max: 1800, cutoff: 390, rumble: 115, tracked: true, level: 0.24 },
  dozer: { idle: 660, max: 1750, cutoff: 340, rumble: 100, tracked: true, level: 0.27 },
  dumper: { idle: 720, max: 2050, cutoff: 370, rumble: 110, tracked: false, level: 0.25 },
};
const siteAudio = {
  enabled: true,
  supported: !!(window.AudioContext || window.webkitAudioContext),
  ctx: null,
  master: null,
  bus: null,
  voices: {},
  buffers: {},
  lastCue: {},
  previous: {},
  suspendTimer: null,
};
try {
  siteAudio.enabled = localStorage.getItem(SOUND_STORAGE_KEY) !== '0';
} catch (_) {}
const audioPoint = new THREE.Vector3();

// ------------------------------------------------------------------ graph
function noiseBuffer(ctx, brown) {
  const length = ctx.sampleRate * 2,
    buffer = ctx.createBuffer(1, length, ctx.sampleRate),
    data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else data[i] = white;
  }
  return buffer;
}
function loopNoise(kind) {
  const source = siteAudio.ctx.createBufferSource();
  source.buffer = siteAudio.buffers[kind];
  source.loop = true;
  source.start(0, Math.random() * 1.9);
  return source;
}
function makeFilter(type, frequency, q = 0.7) {
  const filter = siteAudio.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  return filter;
}
function makeGain(value = 0) {
  const gain = siteAudio.ctx.createGain();
  gain.gain.value = value;
  return gain;
}
function makeOscillator(type, frequency) {
  const osc = siteAudio.ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.start();
  return osc;
}
/** A machine's voice: diesel tone and combustion rumble, pump whine, running gear and reversing alarm. */
function makeVoice(id) {
  const ctx = siteAudio.ctx,
    spec = ENGINE_SPECS[id],
    out = makeGain(0),
    pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) out.connect(pan).connect(siteAudio.bus);
  else out.connect(siteAudio.bus);
  const engine = makeGain(0),
    tone = makeFilter('lowpass', spec.cutoff, 0.9);
  tone.connect(engine).connect(out);
  const saw = makeOscillator('sawtooth', 40),
    sub = makeOscillator('square', 20);
  saw.connect(makeGain(0.3)).connect(tone);
  sub.connect(makeGain(0.16)).connect(tone);
  // Combustion rumble: brown noise pulsed at the firing frequency.
  const rumble = makeGain(0.55),
    firing = makeOscillator('sine', 40),
    depth = makeGain(0.5);
  firing.connect(depth).connect(rumble.gain);
  loopNoise('brown')
    .connect(makeFilter('bandpass', spec.rumble, 0.8))
    .connect(rumble)
    .connect(tone);
  const whine = makeOscillator('triangle', 300),
    whineGain = makeGain(0);
  whine
    .connect(makeFilter('bandpass', 420, 1.2))
    .connect(whineGain)
    .connect(out);
  const running = makeGain(0);
  running.connect(out);
  let clatterRate = null;
  if (spec.tracked) {
    // Track links: band-passed noise gated by a pulse train at the link rate.
    const gate = makeGain(0),
      rate = makeOscillator('sawtooth', 3),
      shaper = ctx.createWaveShaper(),
      curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = x > 0.55 ? ((x - 0.55) / 0.45) ** 2 : 0;
    }
    shaper.curve = curve;
    rate.connect(shaper).connect(gate.gain);
    loopNoise('white')
      .connect(makeFilter('bandpass', 1650, 2.4))
      .connect(gate)
      .connect(running);
    clatterRate = rate;
  } else
    loopNoise('brown')
      .connect(makeFilter('lowpass', 280, 0.6))
      .connect(running);
  const beep = makeOscillator('square', 1180),
    beepGain = makeGain(0);
  beep
    .connect(makeFilter('lowpass', 2600, 0.5))
    .connect(beepGain)
    .connect(out);
  return {
    id,
    spec,
    out,
    pan,
    engine,
    tone,
    saw,
    sub,
    firing,
    whine,
    whineGain,
    running,
    clatterRate,
    beepGain,
    rpm: 0,
  };
}
function buildAudioGraph() {
  const Context = window.AudioContext || window.webkitAudioContext,
    ctx = new Context();
  siteAudio.ctx = ctx;
  siteAudio.buffers.white = noiseBuffer(ctx, false);
  siteAudio.buffers.brown = noiseBuffer(ctx, true);
  siteAudio.master = makeGain(0);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -16;
  limiter.knee.value = 12;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.01;
  limiter.release.value = 0.25;
  siteAudio.bus = makeGain(1);
  siteAudio.bus.connect(limiter).connect(siteAudio.master).connect(ctx.destination);
  // A quiet wind bed keeps the yard from sounding dead between machines.
  const wind = makeGain(0.022),
    gust = makeOscillator('sine', 0.07),
    gustDepth = makeGain(0.012);
  gust.connect(gustDepth).connect(wind.gain);
  loopNoise('brown')
    .connect(makeFilter('lowpass', 330, 0.5))
    .connect(wind)
    .connect(siteAudio.bus);
  for (const id of Object.keys(ENGINE_SPECS)) siteAudio.voices[id] = makeVoice(id);
}
/** Creates (once) and resumes the audio context; must run inside a user gesture. */
function startSiteAudio() {
  if (!siteAudio.supported || !siteAudio.enabled) return;
  try {
    if (!siteAudio.ctx) buildAudioGraph();
    clearTimeout(siteAudio.suspendTimer);
    if (siteAudio.ctx.state !== 'running') siteAudio.ctx.resume().catch(() => {});
    siteAudio.master.gain.setTargetAtTime(0.85, siteAudio.ctx.currentTime, 0.25);
  } catch (error) {
    siteAudio.supported = false;
    console.warn('Site audio unavailable:', error);
    updateSoundButton();
  }
}
function setSoundEnabled(on) {
  siteAudio.enabled = !!on;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, siteAudio.enabled ? '1' : '0');
  } catch (_) {}
  if (siteAudio.enabled) startSiteAudio();
  else if (siteAudio.ctx) {
    siteAudio.master.gain.setTargetAtTime(0, siteAudio.ctx.currentTime, 0.06);
    clearTimeout(siteAudio.suspendTimer);
    siteAudio.suspendTimer = setTimeout(() => {
      if (!siteAudio.enabled) siteAudio.ctx.suspend().catch(() => {});
    }, 400);
  }
  updateSoundButton();
  return siteAudio.enabled;
}
function toggleSound() {
  const on = setSoundEnabled(!siteAudio.enabled);
  notify(on ? 'Sound on · M mutes' : 'Sound muted · M turns it back on');
}
for (const type of ['pointerdown', 'keydown', 'touchstart'])
  window.addEventListener(type, () => startSiteAudio(), { capture: true, passive: true });
document.addEventListener('visibilitychange', () => {
  if (!siteAudio.ctx) return;
  if (document.hidden) siteAudio.ctx.suspend().catch(() => {});
  else if (siteAudio.enabled) siteAudio.ctx.resume().catch(() => {});
});

// ------------------------------------------------------------------ what each machine is doing
function machineActivity(id) {
  const previous = (siteAudio.previous[id] = siteAudio.previous[id] || {}),
    activity = { on: false, throttle: 0, hydraulic: 0, travel: 0, reversing: false };
  let tool = 0;
  if (id === 'drill')
    tool =
      pileRig.state.head + pileRig.state.extension + pileRig.state.tilt * 0.05 + pileRig.state.slew * 0.02;
  else if (id === 'dozer') tool = dozer.state.lift + dozer.state.angle * 0.02;
  else if (id === 'dumper') tool = dumper.state.tip * 0.02;
  const toolMotion = previous.tool === undefined ? 0 : Math.min(1, Math.abs(tool - previous.tool) * 40);
  previous.tool = tool;
  if (workMode.active && workMode.crew) {
    const agent = workMode.crew[id];
    activity.on = true;
    activity.travel = Math.abs(agent.speed) + Math.abs(agent.turn) * CREW_TRACK_HALF[id];
    activity.reversing = agent.speed < -0.05;
    activity.throttle = clamp(agent.load, 0.08, 1);
  } else if (!exploreMode && !assembly.mode && id === activeVehicle) {
    activity.on = true;
    activity.travel =
      (Math.abs(drive.left) + Math.abs(drive.right)) / 2 + Math.abs(drive.left - drive.right) / 2;
    activity.reversing = (drive.left + drive.right) / 2 < -0.05;
  } else return activity;
  if (id === 'excavator') activity.hydraulic = clamp(hydraulicsPump.utilization, 0, 1);
  else if (id === 'drill')
    activity.hydraulic = Math.max(
      toolMotion,
      pileRig.state.spinning ? 0.35 + 0.65 * clamp(pileRig.state.torque / pileRig.state.maxTorque, 0, 1) : 0
    );
  else if (id === 'dozer') activity.hydraulic = Math.max(toolMotion, clamp(dozerPushRate * 30, 0, 1));
  else activity.hydraulic = toolMotion;
  if (!workMode.active)
    activity.throttle = clamp(0.1 + activity.travel * 0.6 + activity.hydraulic * 0.75, 0, 1);
  return activity;
}
/** Gain and stereo position for a world point, relative to what the camera is looking at. */
function audioPlacement(x, z) {
  const reference = Math.max(7, baseHalf * 0.75),
    nearness = clamp(9 / baseHalf, 0.25, 1),
    distance = Math.hypot(x - target.x, z - target.z),
    projected = audioPoint.set(x, 1, z).project(camera);
  return {
    gain: nearness / (1 + (distance / reference) ** 2),
    pan: clamp(projected.x * 0.75, -0.8, 0.8),
  };
}

// ------------------------------------------------------------------ one-shot cues
function playBurst({
  kind = 'white',
  filter = 'bandpass',
  frequency = 800,
  q = 1,
  attack = 0.005,
  decay = 0.3,
  level = 0.2,
  pan = 0,
}) {
  const ctx = siteAudio.ctx,
    now = ctx.currentTime,
    source = ctx.createBufferSource(),
    gain = makeGain(0),
    panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  source.buffer = siteAudio.buffers[kind];
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  let chain = source.connect(makeFilter(filter, frequency, q)).connect(gain);
  if (panner) {
    panner.pan.value = pan;
    chain = chain.connect(panner);
  }
  chain.connect(siteAudio.bus);
  source.start(now, Math.random() * Math.max(0, 1.9 - attack - decay));
  source.stop(now + attack + decay + 0.05);
}
function playTone({ wave = 'sine', frequency = 200, to = frequency, decay = 0.3, level = 0.2, pan = 0 }) {
  const ctx = siteAudio.ctx,
    now = ctx.currentTime,
    osc = ctx.createOscillator(),
    gain = makeGain(0),
    panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + decay);
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  let chain = osc.connect(gain);
  if (panner) {
    panner.pan.value = pan;
    chain = chain.connect(panner);
  }
  chain.connect(siteAudio.bus);
  osc.start(now);
  osc.stop(now + decay + 0.05);
}
const CUE_GAP = {
  scoop: 0.16,
  load: 0.5,
  pour: 0.4,
  tip: 1,
  stall: 0.6,
  'impact-cone': 0.08,
  'impact-barrel': 0.1,
  'impact-pipe': 0.1,
};
function playCue(cue) {
  const now = siteAudio.ctx.currentTime;
  if (now - (siteAudio.lastCue[cue.type] || -10) < (CUE_GAP[cue.type] || 0.1)) return;
  const place = audioPlacement(cue.x, cue.z),
    level = place.gain * clamp(cue.level, 0.2, 1.5),
    pan = place.pan;
  if (level < 0.015) return;
  siteAudio.lastCue[cue.type] = now;
  switch (cue.type) {
    case 'scoop':
      playBurst({ kind: 'white', frequency: 900, q: 0.9, decay: 0.22, level: 0.16 * level, pan });
      break;
    case 'load':
      // Rock and soil landing in a steel body: low thump, rattle and a ring of the body plates.
      playTone({ frequency: 70, to: 42, decay: 0.35, level: 0.32 * level, pan });
      playBurst({ kind: 'brown', filter: 'lowpass', frequency: 650, decay: 0.95, level: 0.5 * level, pan });
      playBurst({ kind: 'white', frequency: 1450, q: 7, decay: 0.45, level: 0.08 * level, pan });
      break;
    case 'pour':
      playBurst({ kind: 'brown', filter: 'lowpass', frequency: 700, decay: 0.75, level: 0.4 * level, pan });
      break;
    case 'tip':
      playBurst({
        kind: 'brown',
        filter: 'lowpass',
        frequency: 420,
        attack: 0.15,
        decay: 1.9,
        level: 0.6 * level,
        pan,
      });
      playBurst({ kind: 'white', frequency: 2200, q: 3, attack: 0.1, decay: 1.2, level: 0.05 * level, pan });
      break;
    case 'stall':
      playTone({ frequency: 90, to: 50, decay: 0.2, level: 0.3 * level, pan });
      playBurst({ kind: 'white', frequency: 600, q: 2, decay: 0.12, level: 0.12 * level, pan });
      break;
    case 'impact-cone':
      playBurst({ kind: 'white', frequency: 1200, q: 2, decay: 0.07, level: 0.18 * level, pan });
      playTone({ frequency: 420, to: 300, decay: 0.07, level: 0.08 * level, pan });
      break;
    case 'impact-barrel':
      playTone({ frequency: 185, to: 170, decay: 0.7, level: 0.16 * level, pan });
      playTone({ frequency: 472, to: 460, decay: 0.45, level: 0.07 * level, pan });
      playBurst({ kind: 'white', frequency: 900, q: 1.5, decay: 0.05, level: 0.1 * level, pan });
      break;
    case 'impact-pipe':
      playTone({ wave: 'triangle', frequency: 820, to: 800, decay: 0.6, level: 0.08 * level, pan });
      playBurst({ kind: 'white', frequency: 2400, q: 9, decay: 0.5, level: 0.07 * level, pan });
      break;
  }
}

// ------------------------------------------------------------------ per frame
function updateSiteAudio(dt) {
  const ctx = siteAudio.ctx,
    live = ctx && siteAudio.enabled && ctx.state === 'running';
  if (!live) {
    soundEvents.length = 0;
    return;
  }
  const now = ctx.currentTime;
  for (const [id, voice] of Object.entries(siteAudio.voices)) {
    const spec = voice.spec,
      activity = machineActivity(id),
      wanted = activity.on ? spec.idle + (spec.max - spec.idle) * activity.throttle : 0;
    voice.rpm += (wanted - voice.rpm) * (1 - Math.exp(-dt * (wanted > voice.rpm ? 2.4 : 1.4)));
    if (voice.rpm < 1 && !activity.on) {
      voice.out.gain.setTargetAtTime(0, now, 0.1);
      continue;
    }
    // Four-stroke six-cylinder: three firings per revolution.
    const firing = Math.max(6, voice.rpm / 20),
      pose = vehiclePose(id),
      place = audioPlacement(pose.x, pose.z),
      running = clamp(voice.rpm / spec.idle, 0, 1);
    voice.saw.frequency.setTargetAtTime(firing, now, 0.05);
    voice.sub.frequency.setTargetAtTime(firing / 2, now, 0.05);
    voice.firing.frequency.setTargetAtTime(firing, now, 0.05);
    voice.tone.frequency.setTargetAtTime(spec.cutoff * (0.7 + activity.throttle * 1.7), now, 0.08);
    voice.engine.gain.setTargetAtTime(spec.level * (0.55 + 0.45 * activity.throttle) * running, now, 0.08);
    voice.whine.frequency.setTargetAtTime(230 + firing * 3 + activity.hydraulic * 110, now, 0.06);
    voice.whineGain.gain.setTargetAtTime(0.045 * activity.hydraulic * running, now, 0.05);
    if (voice.clatterRate)
      voice.clatterRate.frequency.setTargetAtTime(Math.max(0.5, activity.travel / 0.19), now, 0.05);
    voice.running.gain.setTargetAtTime(
      Math.min(1, activity.travel / 0.8) * (spec.tracked ? 0.2 : 0.35),
      now,
      0.06
    );
    const beeping = activity.reversing && now % 1 < 0.5;
    voice.beepGain.gain.setTargetAtTime(beeping ? 0.05 : 0, now, 0.004);
    voice.out.gain.setTargetAtTime(place.gain, now, 0.06);
    if (voice.pan) voice.pan.pan.setTargetAtTime(place.pan, now, 0.06);
  }
  for (const cue of soundEvents.splice(0)) playCue(cue);
}

// ------------------------------------------------------------------ interface
const soundButton = document.createElement('button');
soundButton.id = 'soundToggle';
soundButton.type = 'button';
soundButton.innerHTML =
  '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M2 5.5h3.5L10 2v12L5.5 10.5H2z"/><path class="sound-waves" d="M13 5.2a3.5 3.5 0 0 1 0 5.6M15.4 3a6.6 6.6 0 0 1 0 10"/><path class="sound-off" d="M13 5.5l5 5M18 5.5l-5 5"/></svg><span></span>';
soundButton.onclick = toggleSound;
const mastheadTools = document.createElement('div'),
  edition = $('.masthead .edition');
mastheadTools.className = 'masthead-tools';
edition.before(mastheadTools);
mastheadTools.append(edition, soundButton);
function updateSoundButton() {
  const on = siteAudio.enabled && siteAudio.supported;
  soundButton.setAttribute('aria-pressed', on);
  soundButton.disabled = !siteAudio.supported;
  soundButton.querySelector('span').textContent = !siteAudio.supported ? 'NO AUDIO' : on ? 'SOUND' : 'MUTED';
  soundButton.setAttribute(
    'aria-label',
    !siteAudio.supported
      ? 'Sound is not available in this browser'
      : on
        ? 'Mute site sound (M)'
        : 'Turn site sound on (M)'
  );
}
updateSoundButton();
