/**
 * IsoMech V2 · Keyboard
 *
 * One keyboard state drives continuous motion and the passive keycap hints; also the desktop joint
 * sliders (drag, click to seek, focused arrow-key nudges).
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// One keyboard state drives both continuous motion and passive keycap hints.
const keysHeld = new Set(),
  keyBindings = {
    KeyQ: ['boom', -1],
    KeyE: ['boom', 1],
    KeyW: ['stick', -1],
    KeyS: ['stick', 1],
    KeyA: ['bucket', -1],
    KeyD: ['bucket', 1],
    ArrowLeft: ['slew', -1],
    ArrowRight: ['slew', 1],
  };
function clearKeyboard() {
  pileRig.state.spinning = false;
  keysHeld.clear();
  explorer.keys.clear();
  releaseDrive();
  stopHold();
  freezeHydraulics();
  $$('.key.is-held').forEach(k => k.classList.remove('is-held'));
}
window.addEventListener('blur', clearKeyboard);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearKeyboard();
});
try {
  $('#coachmark').hidden = localStorage.getItem('excavator-keyboard-coached') === '1';
} catch (_) {}
function paintKeys() {
  $$('.key[data-code]').forEach(k => k.classList.toggle('is-held', keysHeld.has(k.dataset.code)));
}
window.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,select,textarea,[contenteditable=true]'))
    return;
  const code = e.code;
  if (!$('#helpbox').hidden) {
    if (e.key === 'Escape' || e.key === '?') {
      e.preventDefault();
      $('#closeHelp').click();
    }
    return;
  }
  if (code === 'Tab') return;
  if (e.key === '?') {
    e.preventDefault();
    if (!e.repeat) $('#help').click();
    return;
  }
  if (code === 'Escape') {
    e.preventDefault();
    if (exploreMode) {
      setExploreMode(false);
      return;
    }
    $('#helpbox').hidden = true;
    $('#help').setAttribute('aria-expanded', 'false');
    if (assembly.mode) requestAssemblyExit(false);
    else if (site.overview) setSiteOverview(false);
    else if ($('#panel').classList.contains('open')) closeControls();
    return;
  }
  if (exploreMode) {
    const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];
    if (moveKeys.includes(code)) {
      e.preventDefault();
      explorer.keys.add(code);
      return;
    }
    if (/^F[1-5]$/.test(code)) {
      e.preventDefault();
      view(['front', 'left', 'right', 'rear', 'top'][Number(code.slice(1)) - 1]);
      return;
    }
    if (code === 'KeyO') {
      e.preventDefault();
      $('#orbit').click();
      return;
    }
    return;
  }
  const recognized =
    code in keyBindings ||
    [
      'ArrowUp',
      'ArrowDown',
      'Space',
      'KeyB',
      'KeyR',
      'KeyZ',
      'ShiftLeft',
      'ShiftRight',
      'Digit1',
      'Digit2',
      'Digit3',
      'KeyO',
      'KeyJ',
      'KeyL',
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
    ].includes(code);
  if (!recognized) return;
  e.preventDefault();
  if (assembly.mode) return;
  keysHeld.add(code);
  paintKeys();
  $('#coachmark').hidden = true;
  try {
    localStorage.setItem('excavator-keyboard-coached', '1');
  } catch (_) {}
  if (e.repeat) return;
  if (code in keyBindings || code === 'ArrowUp' || code === 'ArrowDown') manual();
  const travel = { ArrowUp: 'forward', ArrowDown: 'reverse', KeyB: 'brake', KeyJ: 'left', KeyL: 'right' };
  if (travel[code]) driveKeys.add(travel[code]);
  if (code === 'Space') brakeLatched = !brakeLatched;
  if (code === 'KeyR') {
    clearKeyboard();
    reset();
  }
  if (code.startsWith('Shift')) $('#feel').click();
  if (code === 'KeyO') $('#orbit').click();
  if (/^F[1-5]$/.test(code)) view(['front', 'left', 'right', 'rear', 'top'][Number(code.slice(1)) - 1]);
  if (/^Digit[1-3]$/.test(code)) {
    clearKeyboard();
    $('#' + ['armTab', 'travelTab', 'assemblyTab'][Number(code.slice(-1)) - 1]).click();
  }
});
window.addEventListener('keyup', e => {
  keysHeld.delete(e.code);
  explorer.keys.delete(e.code);
  const travel = { ArrowUp: 'forward', ArrowDown: 'reverse', KeyB: 'brake', KeyJ: 'left', KeyL: 'right' };
  if (travel[e.code]) driveKeys.delete(travel[e.code]);
  if (e.code in keyBindings) {
    const joint = keyBindings[e.code][0];
    hydraulicState[joint].target = angles[joint];
    hydraulicState[joint].velocity = 0;
  }
  paintKeys();
});
function stepKeyboard(dt) {
  if (exploreMode) return;
  if (activeVehicle === 'drill') {
    stepRigInput(dt);
    return;
  }
  if (activeVehicle === 'dozer') {
    stepDozerInput(dt);
    return;
  }
  if (activeVehicle === 'dumper') {
    stepDumperInput(dt);
    return;
  }
  const precision = keysHeld.has('KeyZ') ? 0.25 : 1;
  for (const [code, [joint, dir]] of Object.entries(keyBindings))
    if (keysHeld.has(code)) move(joint, dir * config[joint].speed * dt * precision);
  if (joystick.x || joystick.y) {
    move('slew', joystick.x * config.slew.speed * dt);
    move('boom', -joystick.y * config.boom.speed * dt);
  }
}
for (const [joint, pair] of Object.entries({
  boom: ['KeyQ', 'KeyE'],
  stick: ['KeyW', 'KeyS'],
  bucket: ['KeyA', 'KeyD'],
  slew: ['ArrowLeft', 'ArrowRight'],
})) {
  const row = $(`[data-joint="${joint}"]`),
    chips = document.createElement('span');
  chips.className = 'key-cluster';
  chips.innerHTML = pair
    .map(
      code =>
        `<kbd class="key" data-code="${code}">${code.replace('Key', '').replace('ArrowLeft', '←').replace('ArrowRight', '→')}</kbd>`
    )
    .join(' ');
  row.querySelector('.joint-name').prepend(chips);
  const track = row.querySelector('.joint-track');
  let dragging = false,
    startX = 0;
  track.tabIndex = 0;
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-label', config[joint].label);
  track.setAttribute('aria-valuemin', config[joint].min);
  track.setAttribute('aria-valuemax', config[joint].max);
  function drag(e) {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    manual();
    const val =
      config[joint].min +
      clamp((e.clientX - rect.left) / rect.width, 0, 1) * (config[joint].max - config[joint].min);
    hydraulicState[joint].target = val;
  }
  track.onpointerdown = e => {
    e.preventDefault();
    startX = e.clientX;
    dragging = true;
    track.focus();
    track.setPointerCapture(e.pointerId);
    drag(e);
  };
  track.onpointermove = e => {
    if (Math.abs(e.clientX - startX) > 3) drag(e);
  };
  track.onpointerup = e => {
    drag(e);
    dragging = false;
  };
  track.onpointercancel = track.onlostpointercapture = () => {
    dragging = false;
  };
  track.onkeydown = e => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      manual();
      move(joint, e.key === 'ArrowLeft' ? -4 : 4);
    }
  };
}
