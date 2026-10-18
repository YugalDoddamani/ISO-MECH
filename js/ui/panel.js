/**
 * IsoMech V2 · Console sheet and help
 *
 * Mobile console sheet toggle and the interaction guide dialog.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
$('#mobileToggle').onclick = () => {
  const open = $('#panel').classList.toggle('open');
  document.body.classList.toggle('controls-open', open);
  $('#mobileToggle').setAttribute('aria-expanded', open);
  $('#mobileToggle').textContent = open ? '× CLOSE' : 'CONTROLS';
};
$('#help').onclick = () => {
  const el = $('#helpbox');
  el.hidden = !el.hidden;
  $('#help').setAttribute('aria-expanded', !el.hidden);
  clearKeyboard();
  if (!el.hidden) $('#closeHelp').focus();
};
$('#closeHelp').onclick = () => {
  $('#helpbox').hidden = true;
  $('#help').setAttribute('aria-expanded', 'false');
  $('#help').focus();
};
