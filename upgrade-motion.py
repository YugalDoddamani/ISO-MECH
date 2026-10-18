from pathlib import Path
p=Path('/home/user');s=(p/'excavator-app.js').read_text()
s=s.replace("const machine=new THREE.Group();machine.name='EX240';scene.add(machine);", "const driveRoot=new THREE.Group();driveRoot.name='Travel and heading';scene.add(driveRoot);\nconst machine=new THREE.Group();machine.name='EX240';driveRoot.add(machine);")
s=s.replace("const half=1.48", "const trackSystems=[];\nconst half=1.48")
s=s.replace("const tr=group(side===1?'Left crawler':'Right crawler',under,0,0,side*1.13);", "const tr=group(side===-1?'Left crawler':'Right crawler',under,0,0,side*1.13),wheels=[];")
a=s.index(' for(let i=0;i<6;i++){let x=-1.25')
b=s.index(' const shoes=',a)
s=s[:a]+''' for(let i=0;i<6;i++){let x=-1.25+i*.5;const w=group('Lower roller',tr,x,.52,0);wheels.push({obj:w,r:.245});cylinder(.245,.65,M.steel,w);cylinder(.16,.68,M.dark,w);cylinder(.075,.7,M.red,w);}
 [-half,half].forEach((x,index)=>{const w=group(index?'Idler':'Drive sprocket',tr,x,cy,0);wheels.push({obj:w,r:rr});cylinder(.45,.59,M.dark,w);cylinder(.35,.64,index?M.steel:M.red,w);cylinder(.24,.67,M.dark,w);cylinder(.13,.7,M.steel,w);[-1,1].forEach(f=>{for(let i=0;i<10;i++){let a=i*Math.PI/5;cylinder(.024,.025,M.chrome,w,Math.cos(a)*.27,Math.sin(a)*.27,f*.336,'z',6);}});});
 for(let i=0;i<3;i++){const w=group('Return roller',tr,-.8+i*.8,1.03,0);cylinder(.105,.64,M.steel,w);wheels.push({obj:w,r:.105});}
''' +s[b:]
s=s.replace('tr.add(shoes,ridges);',"tr.add(shoes,ridges);shoes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ridges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);trackSystems.push({side,shoes,ridges,wheels,phase:0,distance:0});")
s=s.replace("const diskShadow=mesh(new THREE.CircleGeometry(6.44,128),new THREE.ShadowMaterial({opacity:.23}),scene,.75,-.018,0);diskShadow.rotation.x=-Math.PI/2;diskShadow.receiveShadow=true;diskShadow.castShadow=false;", "const yard=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:new THREE.Color('#e9e9e3').convertSRGBToLinear(),toneMapped:false}),scene,0,-.025,0);yard.rotation.x=-Math.PI/2;yard.castShadow=false;\nconst gridPoints=[];for(let n=-80;n<=80;n+=4){gridPoints.push(n,-.019,-80,n,-.019,80,-80,-.019,n,80,-.019,n);}const grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3)),new THREE.LineBasicMaterial({color:0xaab2a0,transparent:true,opacity:.22}));scene.add(grid);")
s=s.replace("new THREE.ShadowMaterial({opacity:.16}),scene,0,-.095,0","new THREE.ShadowMaterial({opacity:.22}),scene,0,-.018,0")
s=s.replace("ground.castShadow=false;", "ground.castShadow=false;ground.receiveShadow=true;scene.add(sun.target);")
s=s.replace("let selected='boom'", "let dynamicsEnabled=!reduced;\nconst hydraulicState={};\nlet selected='boom'")
s=s.replace("angles[key]=c.home;const row", "angles[key]=c.home;hydraulicState[key]={target:c.home,velocity:0};const row")
s=s.replace("const val=angles[key];$('#angle-'", "const val=key==='slew'?((angles[key]+180)%360+360)%360-180:angles[key];$('#angle-'")
s=s.replace("$('#modeStatus').textContent=mode==='demo'?'DEMO SEQUENCE':resetTween?'RETURNING HOME':'MANUAL CONTROL';", "$('#modeStatus').textContent=driveConsole?(Math.abs(drive.left)+Math.abs(drive.right)>.02?'TRAVEL ACTIVE':'PARKED'):mode==='demo'?'DEMO SEQUENCE':resetTween?'RETURNING HOME':'HYDRAULICS READY';syncDriveUI();")
s=s.replace("machine.updateMatrixWorld(true);", "driveRoot.updateMatrixWorld(true);")
a=s.index('function manual()');b=s.index('function stopHold()',a)
s=s[:a]+'''function freezeHydraulics(){for(const k in config){hydraulicState[k].target=angles[k];hydraulicState[k].velocity=0;}}
function manual(){if(mode!=='manual'||resetTween)freezeHydraulics();mode='manual';resetTween=null;demoStart=null;sync();}
// Commands set a valve target. A damped actuator, below, moves the actual joint.
function move(key,delta){const h=hydraulicState[key],c=config[key];h.target=key==='slew'?h.target+delta:clamp(h.target+delta,c.min,c.max);return true;}
''' +s[b:]
s=s.replace("window.addEventListener('blur',stopHold);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHold();});", "window.addEventListener('blur',()=>{stopHold();releaseDrive();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopHold();releaseDrive();drive.left=drive.right=0;freezeHydraulics();}});")
s=s.replace("const k=e.key;const dirs=", "if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;const k=e.key;if(handleDriveKey(e,true))return;const dirs=")
s=s.replace("window.addEventListener('keyup',e=>{if(e.key.startsWith('Arrow'))stopHold();});", "window.addEventListener('keyup',e=>{handleDriveKey(e,false);if(e.key.startsWith('Arrow'))stopHold();});")
s=s.replace("function reset(){stopHold();mode='manual';", "function reset(){stopHold();freezeHydraulics();mode='manual';")
s=s.replace("$('#demo').onclick=()=>{stopHold();", "$('#demo').onclick=()=>{stopHold();releaseDrive();freezeHydraulics();")
# Switch from scripted demo joints to the same physical actuator targets used for manual input.
s=s.replace("function safePose(next)", "function safePose(next)")
s=s.replace("apply();updateHydraulics();sync();$('#loading').remove();", "//MOTION_SYSTEM\napply();updateHydraulics();sync();$('#loading').remove();")
a=s.index('const clock=new THREE.Clock();')
s=s[:a]+'''const clock=new THREE.Clock();let uiTime=0;
function frame(){requestAnimationFrame(frame);const elapsed=Math.min(clock.getDelta(),.12),now=performance.now();
 if(resetTween){const t=clamp((now-resetTween.start)/(reduced?1:1000),0,1),home={};for(const k in config)home[k]=config[k].home;safePose(interpolate(resetTween.from,home,ease(t)));freezeHydraulics();if(t===1){angles=home;apply();resetTween=null;sync();}}
 if(mode==='demo'){demoT=(now-demoClock)/1000;let desired;if(demoT<2)desired=interpolate(demoStart,demoPoses[0],ease(demoT/2));else{const phase=(demoT-2)%((demoPoses.length-1)*2.5),i=Math.floor(phase/2.5),u=ease(phase/2.5-i);desired=interpolate(demoPoses[i],demoPoses[i+1],u);}for(const k in config)hydraulicState[k].target=desired[k];}
 // Substeps keep damping and braking stable even when rendering is slow.
 const steps=Math.max(1,Math.ceil(elapsed/(1/120))),dt=elapsed/steps;
 for(let i=0;i<steps;i++){if(held&&now-held.start>180)move(held.key,held.dir*config[held.key].speed*dt*clamp((now-held.start-180)/220,0,1));if(!resetTween)stepHydraulics(dt);stepDrive(dt);}
 updateTrackMeshes();followMachine(elapsed);apply();updateHydraulics();
 if(viewTween){const t=viewTween.duration?clamp((now-viewTween.start)/viewTween.duration,0,1):1,u=ease(t);place(viewTween.theta+viewTween.diff*u,viewTween.phi+(viewTween.endPhi-viewTween.phi)*u);camera.zoom=viewTween.zoom+(1-viewTween.zoom)*u;camera.updateProjectionMatrix();if(t===1)viewTween=null;}
 orbit.update();uiTime+=elapsed;if(uiTime>.075){uiTime=0;sync();const bearing=Math.round(((90-deg(orbit.getAzimuthalAngle()))%360+360)%360)%360;$('#bearing').innerHTML=String(bearing).padStart(3,'0')+'<small>°</small>';$('#elevation').innerHTML=Math.round(90-deg(orbit.getPolarAngle()))+'<small>°</small>';}
 renderer.render(scene,camera);
}
frame();
window.excavator={THREE,scene,machine,camera,controls:orbit,groups:{under,upper,boom,stick,bucket,driveRoot},get angles(){return {...angles};},setPose(p){manual();const next={...angles};for(const k in config)if(k in p)next[k]=clamp(p[k],config[k].min,config[k].max);const ok=safePose(next);freezeHydraulics();sync();return ok;},poseValid,reset,view,renderer,hydraulics:hyd,drive,trackSystems,hydraulicState,returnToStart,releaseDrive,get dynamics(){return dynamicsEnabled;}};
})();
'''
(p/'excavator-app.js').write_text(s)
