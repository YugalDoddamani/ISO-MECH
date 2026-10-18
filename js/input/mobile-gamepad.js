/**
 * IsoMech V2 · Mobile gamepad
 *
 * Touch travel pad, boom/slew joystick, bucket/stick sliders, sheet gestures, long-press camera reset,
 * mobile camera buttons and the MORE button.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const joystick = { x: 0, y: 0 },
  pad = document.createElement('section');
pad.id = 'mobileGamepad';
pad.setAttribute('aria-label', 'Mobile operator gamepad');
pad.innerHTML = `<div class="mobile-drive drive-pad" aria-label="Travel pad"></div><div class="joystick" role="group" aria-label="Drag to slew and raise or lower boom"><span>BOOM / SLEW</span><i></i></div><div class="mobile-sliders"></div><button id="moreControls">⋯ MORE</button>`;
document.body.appendChild(pad);
for (const original of $$('#drivePanel [data-drive]')) {
  const b = original.cloneNode(true);
  pad.querySelector('.mobile-drive').appendChild(b);
  b.onpointerdown = e => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    activateDrive(b.dataset.drive);
    b.classList.add('held');
    navigator.vibrate?.(10);
  };
  const end = e => {
    drivePointers.delete(b.dataset.drive);
    b.classList.remove('held');
  };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = end;
}
const joy = pad.querySelector('.joystick');
let joyPointer = null;
function joyEnd() {
  joyPointer = null;
  joystick.x = joystick.y = 0;
  joy.querySelector('i').style.transform = 'translate(0,0)';
  freezeHydraulics();
}
joy.onpointerdown = e => {
  e.preventDefault();
  joyPointer = e.pointerId;
  joy.setPointerCapture(e.pointerId);
  manual();
  joy.onpointermove(e);
};
joy.onpointermove = e => {
  if (joyPointer !== e.pointerId) return;
  const r = joy.getBoundingClientRect(),
    x = (e.clientX - r.left - r.width / 2) / 32,
    y = (e.clientY - r.top - r.height / 2) / 32,
    len = Math.hypot(x, y);
  joystick.x = len < 0.12 ? 0 : x / Math.max(1, len);
  joystick.y = len < 0.12 ? 0 : y / Math.max(1, len);
  joy.querySelector('i').style.transform = `translate(${joystick.x * 25}px,${joystick.y * 25}px)`;
};
joy.onpointerup = joy.onpointercancel = joy.onlostpointercapture = joyEnd;
window.addEventListener('blur', joyEnd);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) joyEnd();
});
for (const joint of ['bucket', 'stick']) {
  const c = config[joint],
    label = document.createElement('label');
  label.innerHTML = `${c.label.toUpperCase()} <output id="mobile-${joint}-value"></output><input id="mobile-${joint}" aria-label="${c.label}" type="range" min="${c.min}" max="${c.max}" value="${c.home}" step="1">`;
  label.querySelector('input').oninput = e => {
    manual();
    hydraulicState[joint].target = +e.target.value;
  };
  pad.querySelector('.mobile-sliders').appendChild(label);
}
// Sheet gestures are limited to the pad/sheet header, never camera gestures.
let swipeY = null;
pad.addEventListener('pointerdown', e => {
  if (e.target === pad) swipeY = e.clientY;
});
pad.addEventListener('pointerup', e => {
  if (swipeY !== null && swipeY - e.clientY > 45 && !$('#panel').classList.contains('open'))
    $('#mobileToggle').click();
  swipeY = null;
});
let sheetY = null;
$('#panel .panel-top').addEventListener('pointerdown', e => {
  sheetY = e.clientY;
});
$('#panel .panel-top').addEventListener('pointerup', e => {
  if (sheetY !== null && e.clientY - sheetY > 45 && $('#panel').classList.contains('open'))
    $('#mobileToggle').click();
  sheetY = null;
});
let longPress = null,
  pressPoint = null;
renderer.domElement.addEventListener('pointerdown', e => {
  if (longPress) {
    clearTimeout(longPress);
    longPress = null;
    return;
  }
  pressPoint = { x: e.clientX, y: e.clientY };
  longPress = setTimeout(() => {
    view('iso');
    longPress = null;
  }, 650);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (pressPoint && Math.hypot(e.clientX - pressPoint.x, e.clientY - pressPoint.y) > 8) {
    clearTimeout(longPress);
    longPress = null;
  }
});
for (const type of ['pointerup', 'pointercancel'])
  renderer.domElement.addEventListener(type, () => {
    clearTimeout(longPress);
    longPress = null;
    pressPoint = null;
  });
const ready = document.createElement('span');
ready.className = 'mobile-ready';
ready.innerHTML = '<i></i> READY';
$('.masthead').appendChild(ready);
const mobileCameras = document.createElement('div');
mobileCameras.className = 'mobile-cameras';
mobileCameras.innerHTML =
  Object.keys(VIEWS)
    .map(name => `<button data-camera="${name}">${name.toUpperCase()}</button>`)
    .join('') +
  '<button data-camera="orbit">AUTO ORBIT</button><button data-camera="help">KEYBOARD HELP ?</button>';
mobileCameras.onclick = e => {
  const name = e.target.dataset.camera;
  if (name === 'help') $('#help').click();
  else if (name === 'orbit') $('#orbit').click();
  else if (name) view(name);
};
$('#feel').parentElement.after(mobileCameras);
for (const joint of ['bucket', 'stick']) {
  const label = $('#mobile-' + joint).parentElement;
  for (const dir of [-1, 1]) {
    const button = document.createElement('button');
    button.className = 'mobile-step';
    button.textContent = dir < 0 ? '−' : '+';
    button.setAttribute('aria-label', (dir < 0 ? 'Decrease ' : 'Increase ') + config[joint].label);
    button.onclick = () => {
      manual();
      move(joint, dir * 4);
    };
    label.appendChild(button);
  }
}
$('#moreControls').onclick = () => {
  $('#mobileToggle').click();
  if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
};
for (const joint of ['bucket', 'stick'])
  $('#mobile-' + joint).parentElement.classList.add('excavator-mobile-control');
