/**
 * IsoMech V2 · EX–240 excavator · assembly parts
 *
 * The 13 numbered systems of the exploded view and the extra parts that move with them.
 *
 * Classic script that shares the application scope with the other modules (see index.html for the
 * load order). Names declared at the top level here are visible to every module loaded after it.
 */
'use strict';
// Move parts by machine-space vectors even when their local joint frames rotate.
const explodedParts = [],
  explodedExtra = [];
function explodedPart(id, name, description, obj, offset, anchor, side = 0) {
  const item = {
    id,
    name,
    description,
    obj,
    home: obj.position.clone(),
    offset: new THREE.Vector3(...offset),
    anchor: new THREE.Vector3(...anchor),
    side,
  };
  obj.userData.systemId = id;
  explodedParts.push(item);
  return item;
}
explodedPart(
  '01',
  'Cab & interior',
  'Operator cab, protective frame, glazing, roof and suspended seat with dual joysticks.',
  cab,
  [-0.35, 1.35, 2.0],
  [0.1, 1.5, 0.1],
  -1
);
explodedPart(
  '02',
  'Body & counterweight',
  'Rear housing and counterweight. Opening the body exposes the conceptual power unit.',
  housing,
  [-2.15, 1.05, -0.45],
  [-1.3, 1, 0],
  -1
);
explodedPart(
  '03',
  'Engine & pumps',
  'Illustrative engine block, cooling fan and tandem hydraulic pumps. Not model-specific CAD.',
  engineCore,
  [-0.2, 1.0, -1.25],
  [0, 0.45, 0],
  -1
);
explodedPart(
  '04',
  'Reservoir & valves',
  'Hydraulic reservoir and control-valve bank distribute oil to the working circuits.',
  valveSystem,
  [0.25, 0.7, -1.7],
  [0.25, 0.3, 0],
  1
);
explodedPart(
  '05',
  'Main boom',
  'Primary lifting member. The pivot, paired lift rams and hydraulic routing separate for inspection.',
  boom,
  [1.1, 0.45, -0.1],
  [1.8, 1.25, 0],
  1
);
explodedPart(
  '06',
  'Stick / dipper',
  'Outer arm extends the reach. Its local pivot remains visible as the joint separates.',
  stick,
  [1.2, -0.2, 0],
  [1.25, 0, 0],
  1
);
explodedPart(
  '07',
  'Bucket & linkage',
  'Scoop, teeth and curl linkage, detached from the stick-end pin.',
  bucket,
  [0.85, -0.35, 0],
  [0.1, -0.45, 0],
  1
);
explodedPart(
  '08',
  'Hydraulic rams',
  'Boom, stick and bucket cylinders retain their assembled lengths while displayed separately.',
  hydraulics,
  [0.4, 0.8, -2.5],
  [2.5, 2.0, -0.1],
  1
);
explodedPart(
  '09',
  'Slewing bearing',
  'The bearing between the crawler chassis and the rotating upper body.',
  slewGroup,
  [0, 0.75, 0],
  [0, 1.2, 0],
  -1
);
explodedPart(
  '10',
  'Left crawler',
  'Track shoes, idler, drive sprocket and rollers. The complete crawler moves outboard.',
  trackSystems[0].shoes.parent,
  [-0.45, 0, -1.65],
  [0, 0.65, 0],
  -1
);
explodedPart(
  '11',
  'Right crawler',
  'The opposite crawler. Signed travel distance still drives both belts after reassembly.',
  trackSystems[1].shoes.parent,
  [0.25, 0, 1.65],
  [0, 0.65, 0],
  1
);
explodedPart(
  '12',
  'Main chassis',
  'Cross-frame carrying the two track units and the upper-body bearing.',
  under,
  [0, 0, 0],
  [0, 0.77, 0],
  -1
);
explodedPart(
  '13',
  'Electrical harness',
  'Conceptual wiring loom, connectors and control board. Shown above the power systems.',
  wireHarness,
  [0.15, 2.75, -1.55],
  [0.1, 0.05, 0],
  -1
);
function extraPart(obj, offset, world = true) {
  explodedExtra.push({ obj, home: obj.position.clone(), offset: new THREE.Vector3(...offset), world });
}
extraPart(upper, [0, 1.55, 0]);
extraPart(engineDeck, [0.6, 0.65, -2.05]);
extraPart(cabRoof, [0, 0.8, 0], false);
extraPart(glassNear, [0, 0.15, 0.75], false);
extraPart(glassFar, [0, 0.15, -0.75], false);
extraPart(frontGlass, [0.65, 0.1, 0], false);
extraPart(cabInterior, [0.2, 0.4, 0.75], false);
[engineCore, valveSystem, wireHarness, cabInterior, cabFrame].forEach(o => (o.visible = false));
