/**
 * IsoMech V2 · Status toast
 *
 * notify(message) shows a short-lived status message over the stage.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
let statusTimer = null;
function notify(msg) {
  $('#status').textContent = msg;
  $('#status').classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => $('#status').classList.remove('show'), 2000);
}
