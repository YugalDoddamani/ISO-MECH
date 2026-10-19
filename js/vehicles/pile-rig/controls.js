/**
 * IsoMech V2 · PR–180 pile rig · controls
 *
 * Pile-rig console panel, mobile sliders and auger button, help text, keyboard input and UI sync.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const rigPanel = document.createElement('section');
rigPanel.id = 'rigPanel';
rigPanel.setAttribute('aria-label', 'Pile drill controls');
rigPanel.innerHTML =
  '<p class="rig-scale">PR–180 / REPRESENTATIVE FULL-SIZE RIG<br>6.0 m crawler · 4.2 m wide · 18.5 m high</p>';
const rigLabels = {
  tilt: 'Mast rake',
  head: 'Rotary head feed',
  extension: 'Kelly extension',
  slew: 'Body slew',
};
const rigUnits = { tilt: '°', head: ' m', extension: ' m', slew: '°' };
for (const key of Object.keys(rigLabels)) {
  const label = document.createElement('label');
  label.className = 'rig-control';
  label.innerHTML = `<span>${rigLabels[key]}<output id="rig-value-${key}"></output></span><input id="rig-${key}" type="range" min="${pileRig.limits[key][0]}" max="${pileRig.limits[key][1]}" step="${key === 'head' || key === 'extension' ? 0.01 : 0.1}" aria-label="${rigLabels[key]}">`;
  label.querySelector('input').oninput = e => pileRig.set(key, +e.target.value);
  rigPanel.appendChild(label);
}
const spinButton = document.createElement('button');
spinButton.id = 'rigSpin';
spinButton.className = 'reset';
spinButton.textContent = '▶ ROTATE AUGER';
spinButton.setAttribute('aria-pressed', 'false');
spinButton.onclick = () => {
  pileRig.state.spinning = !pileRig.state.spinning;
  syncRigUI();
};
rigPanel.appendChild(spinButton);
const rpm = document.createElement('p');
rpm.id = 'rigRPM';
rpm.className = 'rig-scale';
rigPanel.appendChild(rpm);
$('#joints').after(rigPanel);
for (const key of ['head', 'extension']) {
  const label = document.createElement('label');
  label.className = 'rig-mobile-control';
  label.innerHTML = `${rigLabels[key].toUpperCase()} <output id="rig-mobile-value-${key}"></output><input id="rig-mobile-${key}" type="range" min="${pileRig.limits[key][0]}" max="${pileRig.limits[key][1]}" step=".01" aria-label="Mobile ${rigLabels[key]}">`;
  label.querySelector('input').oninput = e => pileRig.set(key, +e.target.value);
  pad.querySelector('.mobile-sliders').appendChild(label);
}
const mobileSpin = document.createElement('button');
mobileSpin.id = 'mobileRigSpin';
mobileSpin.textContent = '⟳ AUGER';
mobileSpin.setAttribute('aria-pressed', 'false');
mobileSpin.onclick = () => spinButton.click();
pad.appendChild(mobileSpin);
const rigHelp = document.createElement('p');
rigHelp.id = 'rigHelp';
rigHelp.textContent =
  'Pile drill: Q / E rake the mast; W / S lower / raise the rotary head; A / D retract / extend Kelly; ← / → slew. ↑ / ↓ travel; J / L steer; B holds brake; Space toggles brake; Z gives precision. Use ROTATE AUGER to turn the tool at up to 18 rpm. Drill through layered topsoil, fill, clay and gravel; torque resistance or mast lean beyond 4.5° stalls the auger. The 3 m bore readout and spoil heap update as material is cut. Assembly inspection is excavator-only; this remains an illustrative geotechnical model.';
$('#helpbox').appendChild(rigHelp);
function stepRigInput(dt) {
  const precision = keysHeld.has('KeyZ') ? 0.25 : 1;
  for (const [neg, pos, key] of [
    ['KeyQ', 'KeyE', 'tilt'],
    ['KeyW', 'KeyS', 'head'],
    ['KeyA', 'KeyD', 'extension'],
    ['ArrowLeft', 'ArrowRight', 'slew'],
  ]) {
    const dir = (keysHeld.has(pos) ? 1 : 0) - (keysHeld.has(neg) ? 1 : 0);
    if (dir) pileRig.set(key, pileRig.state[key] + dir * pileRig.speeds[key] * dt * precision);
  }
  if (joystick.x) pileRig.set('slew', pileRig.state.slew + joystick.x * pileRig.speeds.slew * dt);
  if (joystick.y) pileRig.set('tilt', pileRig.state.tilt - joystick.y * pileRig.speeds.tilt * dt);
}
function syncRigUI() {
  if (exploreMode || workMode.active || activeVehicle !== 'drill') return;
  for (const key of Object.keys(rigLabels)) {
    const val = pileRig.state[key],
      digits = key === 'head' || key === 'extension' ? 2 : 1;
    $('#rig-value-' + key).textContent = val.toFixed(digits) + rigUnits[key];
    $('#rig-' + key).value = val;
    const mobile = $('#rig-mobile-' + key);
    if (mobile) {
      mobile.value = val;
      $('#rig-mobile-value-' + key).textContent = val.toFixed(2) + ' m';
    }
  }
  spinButton.setAttribute('aria-pressed', pileRig.state.spinning);
  spinButton.textContent = pileRig.state.spinning ? '■ STOP AUGER' : '▶ ROTATE AUGER';
  mobileSpin.setAttribute('aria-pressed', pileRig.state.spinning);
  const bore = activeBorehole || boreholes[boreholes.length - 1],
    drillStatus = pileRig.state.stalled ? 'STALL · ' : '';
  $('#rigRPM').textContent =
    drillStatus +
    pileRig.state.rpm.toFixed(1) +
    ' RPM · ' +
    (bore?.layer || pileRig.state.resistance.toFixed(1) + '× SOIL') +
    ' · BORE ' +
    (bore?.depth || 0).toFixed(2) +
    ' m';
  $('#modeStatus').textContent = pileRig.state.stalled
    ? 'AUGER STALLED · CHECK VERTICALITY / RESISTANCE'
    : pileRig.state.spinning
      ? 'AUGER ROTATING'
      : 'ROTARY RIG READY';
  $('#consoleTitle').textContent = driveConsole ? 'Move the carrier.' : 'Build from the ground.';
  $('#consoleIntro').textContent = driveConsole
    ? '↑ / ↓ travel · J / L steer · Space brake'
    : 'Rotary piling rig · metre-scale controls · live mast and tool articulation.';
}
