/**
 * IsoMech V2 · Crawler dozer · controls
 *
 * Blade console panel, mobile sliders, keyboard input and UI sync.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const dozerPanel = document.createElement('section');
dozerPanel.id = 'dozerPanel';
dozerPanel.setAttribute('aria-label', 'Bulldozer blade controls');
dozerPanel.innerHTML =
  '<p class="dozer-scale">CRAWLER DOZER · REPRESENTATIVE MODEL<br>5.6 m curved blade · twin-track drive</p>';
const dozerLabels = { lift: 'Blade lift', angle: 'Blade angle' },
  dozerUnits = { lift: ' m', angle: '°' };
for (const key of Object.keys(dozerLabels)) {
  const label = document.createElement('label');
  label.className = 'dozer-control';
  label.innerHTML = `<span>${dozerLabels[key]}<output id="dozer-value-${key}"></output></span><input id="dozer-${key}" type="range" min="${dozer.limits[key][0]}" max="${dozer.limits[key][1]}" step="${key === 'lift' ? '.01' : '.1'}" aria-label="${dozerLabels[key]}">`;
  label.querySelector('input').oninput = e => {
    dozer.set(key, +e.target.value);
    dozer.update(0);
    syncDozerUI();
  };
  dozerPanel.appendChild(label);
}
const bladeReset = document.createElement('button');
bladeReset.id = 'bladeReset';
bladeReset.className = 'reset';
bladeReset.textContent = '↺ NEUTRAL BLADE';
bladeReset.onclick = () => {
  dozer.set('lift', 0);
  dozer.set('angle', 0);
  dozer.update(0);
  syncDozerUI();
};
dozerPanel.appendChild(bladeReset);
$('#rigPanel').after(dozerPanel);
for (const key of Object.keys(dozerLabels)) {
  const label = document.createElement('label');
  label.className = 'dozer-mobile-control';
  label.innerHTML = `${dozerLabels[key].toUpperCase()} <output id="dozer-mobile-value-${key}"></output><input id="dozer-mobile-${key}" type="range" min="${dozer.limits[key][0]}" max="${dozer.limits[key][1]}" step="${key === 'lift' ? '.01' : '.1'}" aria-label="Mobile ${dozerLabels[key]}">`;
  label.querySelector('input').oninput = e => {
    dozer.set(key, +e.target.value);
    dozer.update(0);
    syncDozerUI();
  };
  pad.querySelector('.mobile-sliders').appendChild(label);
}
function stepDozerInput(dt) {
  const precision = keysHeld.has('KeyZ') ? 0.25 : 1;
  for (const [negative, positive, key] of [
    ['KeyQ', 'KeyE', 'lift'],
    ['KeyA', 'KeyD', 'angle'],
  ]) {
    const direction = (keysHeld.has(positive) ? 1 : 0) - (keysHeld.has(negative) ? 1 : 0);
    if (direction) dozer.set(key, dozer.state[key] + direction * dozer.speeds[key] * dt * precision);
  }
  if (joystick.x) dozer.set('angle', dozer.state.angle + joystick.x * dozer.speeds.angle * dt);
  if (joystick.y) dozer.set('lift', dozer.state.lift - joystick.y * dozer.speeds.lift * dt);
}
function syncDozerUI() {
  if (exploreMode || activeVehicle !== 'dozer') return;
  for (const key of Object.keys(dozerLabels)) {
    const value = dozer.state[key],
      formatted = value.toFixed(key === 'lift' ? 2 : 1) + dozerUnits[key];
    $('#dozer-value-' + key).textContent = formatted;
    $('#dozer-' + key).value = value;
    const mobile = $('#dozer-mobile-' + key);
    if (mobile) {
      mobile.value = value;
      $('#dozer-mobile-value-' + key).textContent = formatted;
    }
  }
  $('#consoleTitle').textContent = driveConsole ? 'Move the dozer.' : 'Work the blade.';
  $('#consoleIntro').textContent = driveConsole
    ? '↑ / ↓ travel · J / L steer · Space brake'
    : 'Q / E lift · A / D angle · lower the blade to push.';
  $('#modeStatus').textContent = 'DOZER / BLADE READY';
}
