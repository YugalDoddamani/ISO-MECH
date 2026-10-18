/**
 * IsoMech V2 · Fleet
 *
 * The active-vehicle drive root, parked carriers, the four machines (EX–240 excavator, PR–180 pile rig,
 * crawler dozer, off-highway dumper), their parking-bay records, the physics world with machine
 * envelopes, and the PR–180 deck branding.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
const driveRoot = new THREE.Group();
driveRoot.name = 'Active vehicle travel and heading';
driveRoot.position.set(28, 0, 4);
scene.add(driveRoot);
const fleet = new THREE.Group();
fleet.name = 'Inactive fleet carriers';
scene.add(fleet);
const excavatorCarrier = new THREE.Group();
excavatorCarrier.name = 'EX-240 parked carrier';
fleet.add(excavatorCarrier);
const drillCarrier = new THREE.Group();
drillCarrier.name = 'PR-180 parked carrier';
fleet.add(drillCarrier);
const dozerCarrier = new THREE.Group();
dozerCarrier.name = 'Crawler dozer parked carrier';
fleet.add(dozerCarrier);
const dumperCarrier = new THREE.Group();
dumperCarrier.name = 'Off-highway dumper parked carrier';
fleet.add(dumperCarrier);
const machine = new THREE.Group();
machine.name = 'EX240';
const pileRig = window.createPileRig(THREE),
  dozer = window.createBulldozer(THREE),
  dumper = window.createDumper(THREE);
const vehicleFleet = {
  excavator: {
    label: 'EX–240',
    model: machine,
    carrier: excavatorCarrier,
    home: { position: new THREE.Vector3(28, 0, -8), heading: 0 },
    position: new THREE.Vector3(28, 0, -8),
    heading: 0,
    distance: 0,
    footprint: { hx: 2.08, hz: 1.5 },
  },
  drill: {
    label: 'PR–180',
    model: pileRig.root,
    carrier: drillCarrier,
    home: { position: new THREE.Vector3(28, 0, 4), heading: 0 },
    position: new THREE.Vector3(28, 0, 4),
    heading: 0,
    distance: 0,
    footprint: { hx: 3, hz: 2.1 },
  },
  dozer: {
    label: 'Crawler dozer',
    model: dozer.root,
    carrier: dozerCarrier,
    home: { position: new THREE.Vector3(28, 0, 16), heading: 0 },
    position: new THREE.Vector3(28, 0, 16),
    heading: 0,
    distance: 0,
    footprint: dozer.dimensions.footprint,
    exhaust: { x: 0.14, y: 3.1, z: -0.82 },
  },
  dumper: {
    label: 'Off-highway dumper',
    model: dumper.root,
    carrier: dumperCarrier,
    home: { position: new THREE.Vector3(28, 0, 28), heading: 0 },
    position: new THREE.Vector3(28, 0, 28),
    heading: 0,
    distance: 0,
    footprint: dumper.dimensions.footprint,
    exhaust: { x: 1.55, y: 3.25, z: -0.85 },
  },
};
const vehicleOrder = ['drill', 'excavator', 'dozer', 'dumper'];
const modeOrder = [...vehicleOrder, 'explore'];
const yardPhysics = window.createYardPhysics(window.CANNON);
for (const [id, record] of Object.entries(vehicleFleet))
  yardPhysics.addMachine(id, record.footprint, id === 'dumper' ? 3.8 : id === 'drill' ? 2.6 : 2.9);
excavatorCarrier.position.copy(vehicleFleet.excavator.position);
drillCarrier.position.copy(vehicleFleet.drill.position);
dozerCarrier.position.copy(vehicleFleet.dozer.position);
dumperCarrier.position.copy(vehicleFleet.dumper.position);
excavatorCarrier.add(machine);
dozerCarrier.add(dozer.root);
dumperCarrier.add(dumper.root);
driveRoot.add(pileRig.root);
[-1, 1].forEach(side =>
  label('IsoMech', 1.2, 0.19, pileRig.deck, -1.25, 0.53, side * 1.61, side < 0 ? Math.PI : 0, '#2a3028')
);
