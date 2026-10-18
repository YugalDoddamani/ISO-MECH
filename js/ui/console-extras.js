/**
 * IsoMech V2 · Console extras
 *
 * Reset Yard button and the assembly system search field.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const resetYardButton = document.createElement('button');
resetYardButton.className = 'reset';
resetYardButton.id = 'resetYard';
resetYardButton.textContent = '↺ RESET YARD PROPS & SOIL';
resetYardButton.onclick = () => {
  resetYard();
  notify('Yard restored');
};
$('#feel').parentElement.before(resetYardButton);
const search = document.createElement('input');
search.type = 'search';
search.placeholder = 'Find a machine system…';
search.setAttribute('aria-label', 'Search assembly systems');
search.oninput = () => {
  $$('#systemList .system-row').forEach(
    row => (row.hidden = !row.textContent.toLowerCase().includes(search.value.toLowerCase()))
  );
};
$('#systemList').before(search);
