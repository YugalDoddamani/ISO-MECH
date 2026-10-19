/**
 * IsoMech V2 · Off-highway dumper · controls
 *
 * Tipping-body console panel and payload read-out, mobile slider, keyboard input and UI sync, and
 * recovering the last dumped load when the body is reset.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
let lastDumperDumped = false,
  lastDumperDeposit = null;
function resetDumperBody() {
  // Material is conserved: the body keeps what it carries and recovers the last released load.
  let payload = dumper.state.payloadVolume;
  if (lastDumperDeposit && soilSimulation)
    payload += soilSimulation.withdraw(
      lastDumperDeposit.x,
      lastDumperDeposit.z,
      Math.min(lastDumperDeposit.volume, Math.max(0, dumper.capacity - payload)),
      3.2
    );
  dumper.reset();
  dumper.state.payloadVolume = payload;
  dumper.update(0);
  lastDumperDeposit = null;
  lastDumperDumped = false;
  soilSurfaceDirty = true;
  updateSoilSurface();
}
const dumperPanel = document.createElement('section');
dumperPanel.id = 'dumperPanel';
dumperPanel.setAttribute('aria-label', 'Dump truck body controls');
dumperPanel.innerHTML =
  '<p class="dumper-scale">OFF-HIGHWAY DUMPER · REPRESENTATIVE MODEL<br>6 wheels · powered tipping body · loose aggregate load</p>';
const dumperTip = document.createElement('label');
dumperTip.className = 'dumper-control';
dumperTip.innerHTML =
  '<span>Body tip angle <output id="dumper-value-tip"></output></span><input id="dumper-tip" type="range" min="0" max="52" step=".5" aria-label="Dump body tip angle">';
dumperTip.querySelector('input').oninput = e => {
  dumper.set('tip', +e.target.value);
  dumper.update(0);
  syncDumperUI();
};
dumperPanel.appendChild(dumperTip);
// Live payload: the EX-240 fills the body pass by pass; tipping releases it onto the ground.
const dumperLoad = document.createElement('div');
dumperLoad.className = 'dumper-load';
dumperLoad.innerHTML =
  '<span>Payload <output id="dumperPayload">0.82 / 3.28 m³</output></span><i><b id="dumperPayloadBar"></b></i><small>Park beside the EX–240 and open its bucket over the body to load.</small>';
dumperPanel.appendChild(dumperLoad);
const dumpToggle = document.createElement('button');
dumpToggle.id = 'dumpToggle';
dumpToggle.className = 'reset';
dumpToggle.textContent = '↑ TIP / LOWER BODY';
dumpToggle.onclick = () => {
  dumper.set('tip', dumper.state.tip > 8 ? 0 : dumper.limits.tip[1]);
  dumper.update(0);
  syncDumperUI();
};
dumperPanel.appendChild(dumpToggle);
dozerPanel.after(dumperPanel);
const dumperMobile = document.createElement('label');
dumperMobile.className = 'dumper-mobile-control';
dumperMobile.innerHTML =
  'DUMP BODY <output id="dumper-mobile-value"></output><input id="dumper-mobile-tip" type="range" min="0" max="52" step=".5" aria-label="Mobile dump body tip angle">';
dumperMobile.querySelector('input').oninput = e => {
  dumper.set('tip', +e.target.value);
  dumper.update(0);
  syncDumperUI();
};
pad.querySelector('.mobile-sliders').appendChild(dumperMobile);
function stepDumperInput(dt) {
  const precision = keysHeld.has('KeyZ') ? 0.25 : 1,
    direction = (keysHeld.has('KeyE') ? 1 : 0) - (keysHeld.has('KeyQ') ? 1 : 0);
  if (direction) dumper.set('tip', dumper.state.tip + direction * dumper.speeds.tip * dt * precision);
  if (joystick.y) dumper.set('tip', dumper.state.tip - joystick.y * dumper.speeds.tip * dt);
}
function syncDumperUI() {
  if (exploreMode || workMode.active || activeVehicle !== 'dumper') return;
  const value = dumper.state.tip.toFixed(1) + '°';
  $('#dumper-value-tip').textContent = value;
  $('#dumper-tip').value = dumper.state.tip;
  $('#dumper-mobile-tip').value = dumper.state.tip;
  $('#dumper-mobile-value').textContent = value;
  dumpToggle.textContent = dumper.state.tip > 8 ? '↓ LOWER BODY' : '↑ TIP BODY';
  $('#consoleTitle').textContent = driveConsole ? 'Move the dumper.' : 'Tip the load.';
  $('#consoleIntro').textContent = driveConsole
    ? '↑ / ↓ travel · J / L steer · Space brake'
    : 'Q / E raise or lower the dump body · tip to unload the aggregate.';
  const payload = dumper.state.payloadVolume;
  $('#dumperPayload').textContent = payload.toFixed(2) + ' / ' + dumper.capacity.toFixed(2) + ' m³';
  $('#dumperPayloadBar').style.width = Math.min(100, (payload / dumper.capacity) * 100).toFixed(1) + '%';
  $('#modeStatus').textContent = dumper.state.dumped
    ? 'LOAD RELEASED · BODY READY'
    : payload > 1e-6
      ? 'DUMPER / LOAD READY'
      : 'BODY EMPTY · LOAD WITH THE EX–240';
}
