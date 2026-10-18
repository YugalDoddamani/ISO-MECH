// System-level internals are illustrative, newly modeled for inspection mode.
const engineCore=group('Engine and pumps',upper,-1.22,.54,-.06);
outlined(box(1.02,.53,.76,M.steel,engineCore,0,.23,0));box(.96,.12,.63,M.dark,engineCore,0,.57,0);
for(let i=0;i<6;i++){const x=-.42+i*.17;box(.025,.48,.8,M.dark,engineCore,x,.25,0);box(.10,.09,.55,M.steel,engineCore,x,.68,0);cylinder(.065,.12,M.chrome,engineCore,x,.73,.17,'y',10);}
box(.85,.16,.7,M.black,engineCore,0,-.07,0);cylinder(.30,.12,M.dark,engineCore,.59,.24,0,'x',24);cylinder(.22,.14,M.steel,engineCore,.66,.24,0,'x',20);
for(let i=0;i<8;i++){const a=i*Math.PI/4;const blade=box(.04,.19,.065,M.black,engineCore,.75,.24+Math.cos(a)*.13,Math.sin(a)*.13);blade.rotation.x=-a;}
[-.22,.22].forEach(z=>{cylinder(.14,.36,M.dark,engineCore,-.65,.22,z,'x',16);cylinder(.12,.09,M.steel,engineCore,-.86,.22,z,'x',16);cylinder(.04,.14,M.chrome,engineCore,-.7,.42,z,'y',10);});
tube([[-.4,.66,-.25],[-.55,.8,-.25],[-.7,.72,-.2],[-.7,.3,-.22]],.035,engineCore);
const valveSystem=group('Reservoir and control valves',upper,.33,.48,-.66);
outlined(box(.67,.68,.58,M.steel,valveSystem,-.14,.27,0));cylinder(.09,.08,M.dark,valveSystem,-.2,.65,0,'y',12);box(.045,.31,.016,M.glass,valveSystem,-.18,.3,.301);
box(.68,.13,.43,M.dark,valveSystem,.43,.02,.06);for(let i=0;i<4;i++){const x=.19+i*.16;box(.12,.28,.28,M.steel,valveSystem,x,.2,.07);cylinder(.045,.17,M.dark,valveSystem,x,.4,.07,'y',10);cylinder(.028,.12,M.red,valveSystem,x,.18,.29,'z',10);tube([[x,.39,.07],[x,.57,.13],[x-.1,.59,-.26],[-.13,.5,-.3]],.017,valveSystem);}
const wireHarness=group('Electrical harness',upper,-.4,1.02,-.1);
tube([[-.85,0,-.35],[-.3,.03,-.3],[.2,0,0],[.8,.04,.37]],.027,wireHarness);
[[-.7,-.3],[-.2,-.3],[.15,0],[.5,.2]].forEach((p,i)=>{const sign=i%2?1:-1;tube([[p[0],0,p[1]],[p[0]+.1,.08,p[1]+sign*.25],[p[0]-.04,.1,p[1]+sign*.6]],.019,wireHarness);box(.10,.10,.14,M.dark,wireHarness,p[0]-.04,.1,p[1]+sign*.6);box(.06,.06,.05,M.ivory,wireHarness,p[0]-.04,.1,p[1]+sign*.69);});
box(.4,.035,.3,mat('#4a7356',.8,0),wireHarness,.88,.02,.4);for(let i=0;i<5;i++)box(.045,.025,.11,M.black,wireHarness,.75+i*.06,.05,.4);
// Open cab frame and a real seat replace the opaque shell as the cabin opens.
const cabFrame=group('Cab structural frame',cab),cabInterior=group('Seat and operator controls',cab,0,0,0);
box(1.4,.09,.94,M.dark,cabFrame,.05,.13,0);
[-.52,.52].forEach(z=>{rod(new THREE.Vector3(-.65,.2,z),new THREE.Vector3(-.6,2.02,z),.045,M.dark,cabFrame);rod(new THREE.Vector3(.91,.3,z),new THREE.Vector3(.64,2.0,z),.045,M.dark,cabFrame);rod(new THREE.Vector3(-.6,2.02,z),new THREE.Vector3(.64,2.0,z),.045,M.dark,cabFrame);rod(new THREE.Vector3(-.1,.5,z),new THREE.Vector3(-.1,1.98,z),.027,M.dark,cabFrame);});
box(.44,.23,.48,M.dark,cabInterior,-.23,.43,0);outlined(box(.57,.15,.59,M.seat,cabInterior,-.19,.64,0));const backrest=box(.13,.63,.56,M.seat,cabInterior,-.47,.99,0);backrest.rotation.z=.13;box(.15,.22,.37,M.seat,cabInterior,-.51,1.38,0);
[-.35,.35].forEach(z=>{box(.43,.09,.12,M.dark,cabInterior,-.1,.83,z);cylinder(.025,.18,M.steel,cabInterior,.06,.96,z,'y',8);const grip=box(.07,.12,.07,M.black,cabInterior,.06,1.08,z);grip.rotation.z=-.2;box(.17,.04,.12,M.steel,cabInterior,.42,.26,z*.6);});
box(.18,.36,.63,M.dark,cabInterior,.64,.5,0);const screen=box(.025,.17,.21,M.glass,cabInterior,.54,.72,-.18);screen.rotation.z=-.25;
// Existing glass and roof parts are separated, not duplicated floating panels.
const cabRoof=group('Roof panel',cab),glassNear=group('Near glazing',cab),glassFar=group('Far glazing',cab),frontGlass=group('Windscreen',cab);
for(const o of [...cab.children]){if(o===cabRoof||o===glassNear||o===glassFar||o===frontGlass||o===cabFrame||o===cabInterior||o===cabShell)continue;if(o.position.y>2.05)cabRoof.attach(o);else if(o===wind||o===wiper)frontGlass.attach(o);else if((o.material===M.glass||o.material===reflection)&&Math.abs(o.position.z)>.57&&o.position.y===0)(o.position.z>0?glassNear:glassFar).attach(o);}
cabShell.material=cabShell.material.clone();const cabOpaqueMaterial=cabShell.material;
// Move parts by machine-space vectors even when their local joint frames rotate.
const explodedParts=[],explodedExtra=[];
function explodedPart(id,name,description,obj,offset,anchor,side=0){const item={id,name,description,obj,home:obj.position.clone(),offset:new THREE.Vector3(...offset),anchor:new THREE.Vector3(...anchor),side};obj.userData.systemId=id;explodedParts.push(item);return item;}
explodedPart('01','Cab & interior','Operator cab, protective frame, glazing, roof and suspended seat with dual joysticks.',cab,[-.35,1.35,2.0],[.1,1.5,.1],-1);
explodedPart('02','Body & counterweight','Rear housing and counterweight. Opening the body exposes the conceptual power unit.',housing,[-2.15,1.05,-.45],[-1.3,1,0],-1);
explodedPart('03','Engine & pumps','Illustrative engine block, cooling fan and tandem hydraulic pumps. Not model-specific CAD.',engineCore,[-.2,1.0,-1.25],[0,.45,0],-1);
explodedPart('04','Reservoir & valves','Hydraulic reservoir and control-valve bank distribute oil to the working circuits.',valveSystem,[.25,.7,-1.7],[.25,.3,0],1);
explodedPart('05','Main boom','Primary lifting member. The pivot, paired lift rams and hydraulic routing separate for inspection.',boom,[1.1,.45,-.1],[1.8,1.25,0],1);
explodedPart('06','Stick / dipper','Outer arm extends the reach. Its local pivot remains visible as the joint separates.',stick,[1.2,-.2,0],[1.25,0,0],1);
explodedPart('07','Bucket & linkage','Scoop, teeth and curl linkage, detached from the stick-end pin.',bucket,[.85,-.35,0],[.1,-.45,0],1);
explodedPart('08','Hydraulic rams','Boom, stick and bucket cylinders retain their assembled lengths while displayed separately.',hydraulics,[.4,.8,-2.5],[2.5,2.0,-.1],1);
explodedPart('09','Slewing bearing','The bearing between the crawler chassis and the rotating upper body.',slewGroup,[0,.75,0],[0,1.2,0],-1);
explodedPart('10','Left crawler','Track shoes, idler, drive sprocket and rollers. The complete crawler moves outboard.',trackSystems[0].shoes.parent,[-.45,0,-1.65],[0,.65,0],-1);
explodedPart('11','Right crawler','The opposite crawler. Signed travel distance still drives both belts after reassembly.',trackSystems[1].shoes.parent,[.25,0,1.65],[0,.65,0],1);
explodedPart('12','Main chassis','Cross-frame carrying the two track units and the upper-body bearing.',under,[0,0,0],[0,.77,0],-1);
explodedPart('13','Electrical harness','Conceptual wiring loom, connectors and control board. Shown above the power systems.',wireHarness,[.15,2.75,-1.55],[.1,.05,0],-1);
function extraPart(obj,offset,world=true){explodedExtra.push({obj,home:obj.position.clone(),offset:new THREE.Vector3(...offset),world});}
extraPart(upper,[0,1.55,0]);extraPart(engineDeck,[.6,.65,-2.05]);extraPart(cabRoof,[0,.8,0],false);extraPart(glassNear,[0,.15,.75],false);extraPart(glassFar,[0,.15,-.75],false);extraPart(frontGlass,[.65,.1,0],false);extraPart(cabInterior,[.2,.4,.75],false);
[engineCore,valveSystem,wireHarness,cabInterior,cabFrame].forEach(o=>o.visible=false);
