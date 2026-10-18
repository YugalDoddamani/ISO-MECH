/**
 * IsoMech V2 · Materials
 *
 * mat() material factory and the shared machine palette M.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const mat = (color, roughness = 0.7, metalness = 0.1) =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(),
    roughness,
    metalness,
  });
const M = {
  yellow: mat('#e8a92c', 0.44, 0.22),
  light: mat('#f4bf48', 0.5, 0.16),
  edge: mat('#bd811d', 0.64, 0.2),
  dark: mat('#303b36', 0.76, 0.25),
  rubber: mat('#29312c', 0.95, 0),
  track: mat('#434940', 0.82, 0.35),
  tread: mat('#50564a', 0.85, 0.3),
  steel: mat('#7f8a7c', 0.55, 0.55),
  chrome: mat('#c6d1cc', 0.2, 0.85),
  black: mat('#1d2824', 0.7, 0.2),
  glass: mat('#526863', 0.23, 0.45),
  red: mat('#9c4b35', 0.6, 0.3),
  seat: mat('#3b443b', 0.95, 0),
  ivory: mat('#eeead1', 0.6, 0.05),
};
