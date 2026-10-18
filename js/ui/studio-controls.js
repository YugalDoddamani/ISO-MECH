/**
 * IsoMech V2 · Studio controls
 *
 * Vehicle / free-explore switch button, console hide and show, overview close button, speed HUD and
 * the compact camera-view selector.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const vehicleButton = document.createElement('button');
vehicleButton.id = 'vehicleSwitch';
vehicleButton.type = 'button';
vehicleButton.onclick = () => {
  if (exploreMode) {
    switchVehicle(lastVehicle);
    return;
  }
  let next = modeOrder[(modeOrder.indexOf(activeVehicle) + 1) % modeOrder.length];
  if (skipExploreOnNextCycle && next === 'explore')
    next = vehicleOrder[(vehicleOrder.indexOf(activeVehicle) + 1) % vehicleOrder.length];
  skipExploreOnNextCycle = false;
  if (next === 'explore') setExploreMode(true);
  else switchVehicle(next);
};
document.body.appendChild(vehicleButton);
const closePanel = document.createElement('button');
closePanel.id = 'closePanel';
closePanel.textContent = '×';
closePanel.setAttribute('aria-label', 'Close controls menu');
$('#panel .panel-top').appendChild(closePanel);
function closeControls() {
  if ($('#panel').classList.contains('open')) $('#mobileToggle').click();
  document.body.classList.add('console-hidden');
  $('#openControls').hidden = false;
  resize();
}
closePanel.onclick = closeControls;
const openPanel = document.createElement('button');
openPanel.id = 'openControls';
openPanel.textContent = 'CONTROLS';
openPanel.hidden = true;
openPanel.onclick = () => {
  document.body.classList.remove('console-hidden');
  openPanel.hidden = true;
  if (matchMedia('(max-width:760px)').matches && !$('#panel').classList.contains('open'))
    $('#mobileToggle').click();
  resize();
};
document.body.appendChild(openPanel);
const originalMore = $('#moreControls').onclick;
$('#moreControls').onclick = () => {
  document.body.classList.remove('console-hidden');
  openPanel.hidden = true;
  originalMore();
};
const mapClose = document.createElement('button');
mapClose.id = 'closeMap';
mapClose.textContent = '×';
mapClose.setAttribute('aria-label', 'Close site overview');
mapClose.onclick = () => setSiteOverview(false);
document.body.appendChild(mapClose);
const speedHUD = document.createElement('div');
speedHUD.id = 'speedHUD';
speedHUD.innerHTML = '<span>SPEED</span><strong id="hudSpeed">0.0</strong><small>km/h</small>';
document.body.appendChild(speedHUD);
const mobileViews = document.createElement('div');
mobileViews.id = 'quickViews';
mobileViews.innerHTML =
  '<label for="quickViewSelect">VIEW</label><select id="quickViewSelect" aria-label="Camera view"><option value="iso">ISO</option><option value="front">FRONT</option><option value="left">LEFT</option><option value="right">RIGHT</option><option value="rear">REAR</option><option value="top">TOP</option></select>';
mobileViews.querySelector('select').onchange = e => view(e.target.value);
document.body.appendChild(mobileViews);
