from pathlib import Path
p=Path('/home/user');s=(p/'excavator-app.js').read_text()
s=s.replace("const assembly={mode:false", "const site={overview:false,viewBlend:0,savedCamera:null,obstacles:[],lastCollision:-10000};\nconst assembly={mode:false")
a=s.index('// Stage: a matte plinth');b=s.index('// Joint state and UI.',a);s=s[:a]+(p/'site-geometry.js').read_text()+'\n'+s[b:]
s=s.replace("function view(name,instant=false){const v=", "function view(name,instant=false){if(site.overview)setSiteOverview(false,false);const v=")
s=s.replace("Hold to travel. Release to slow down. The camera follows your machine.", "Drive the access lanes. Use the site plan to explore the construction yard.")
s=s.replace("for(const t of trackSystems){t.phase=t.distance=0;t.dirty=true;}", "for(const t of trackSystems){t.phase=t.distance=0;t.dirty=true;}resetTrailCursors();")
s=s.replace("const velocity=(drive.left+drive.right)/2,angular=(drive.right-drive.left)/2.26;drive.heading+=angular*dt;", "let velocity=(drive.left+drive.right)/2;const angular=(drive.right-drive.left)/2.26,prevHeading=drive.heading;drive.heading+=angular*dt;")
old="if(Math.abs(driveRoot.position.x)>70||Math.abs(driveRoot.position.z)>70){driveRoot.position.x=clamp(driveRoot.position.x,-70,70);driveRoot.position.z=clamp(driveRoot.position.z,-70,70);drive.left=drive.right=0;releaseDrive();notify('Yard boundary · reverse to return');}"
new="const collision=siteCollision(driveRoot.position.x,driveRoot.position.z,drive.heading);if(collision){driveRoot.position.x=prevX;driveRoot.position.z=prevZ;drive.heading=prevHeading;driveRoot.rotation.y=prevHeading;drive.left=drive.right=velocity=0;releaseDrive();if(performance.now()-site.lastCollision>1600){notify(collision+' · reverse or steer away');site.lastCollision=performance.now();}}"
assert old in s;s=s.replace(old,new)
s=s.replace("followDelta.copy(desiredTarget).sub(target)", "desiredTarget.lerp(new THREE.Vector3(0,.8,0),site.viewBlend);followDelta.copy(desiredTarget).sub(target)")
old="sun.position.set(driveRoot.position.x-3,11,driveRoot.position.z+7);sun.target.position.copy(driveRoot.position);sun.target.updateMatrixWorld();fill.position.set(driveRoot.position.x+8,5,driveRoot.position.z-8);fill.target.position.copy(driveRoot.position);fill.target.updateMatrixWorld();"
new="const lightX=driveRoot.position.x*(1-site.viewBlend),lightZ=driveRoot.position.z*(1-site.viewBlend),lightScale=1+site.viewBlend*2;sun.position.set(lightX-3*lightScale,11*lightScale,lightZ+7*lightScale);sun.target.position.set(lightX,0,lightZ);sun.target.updateMatrixWorld();const shadowExtent=14+site.viewBlend*20;Object.assign(sun.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent});sun.shadow.camera.updateProjectionMatrix();fill.position.set(lightX+8,5,lightZ-8);fill.target.position.set(lightX,0,lightZ);fill.target.updateMatrixWorld();"
assert old in s;s=s.replace(old,new)
s=s.replace("function inspectAssembly(){if(assembly.mode)return;", "function inspectAssembly(){if(assembly.mode)return;const savedSiteCamera=site.overview?site.savedCamera:null;if(site.overview)setSiteOverview(false,false);site.viewBlend=0;updateFrustum();")
s=s.replace("assembly.savedCamera={theta:deg(orbit.getAzimuthalAngle()),phi:deg(orbit.getPolarAngle()),zoom:camera.zoom};", "assembly.savedCamera=savedSiteCamera||{theta:deg(orbit.getAzimuthalAngle()),phi:deg(orbit.getPolarAngle()),zoom:camera.zoom};")
s=s.replace("baseHalf=normal+(expanded-normal)*assembly.value;", "const close=normal+(expanded-normal)*assembly.value,siteHalf=Math.max(22.5,30/aspect);baseHalf=close+(siteHalf-close)*site.viewBlend;")
s=s.replace("apply();updateHydraulics();sync();$('#loading').remove();", (p/'site-system.js').read_text()+"\napply();updateHydraulics();sync();$('#loading').remove();")
s=s.replace(" followMachine(elapsed);", " updateSiteFrame(elapsed);followMachine(elapsed);")
s=s.replace("uiTime=0;sync();const bearing", "uiTime=0;sync();updateSiteUI();const bearing")
s=s.replace("assembly,explodedParts,inspectAssembly", "site,setSiteOverview,clearGroundTracks,siteCollision,trailMesh,assembly,explodedParts,inspectAssembly")
(p/'excavator-app.js').write_text(s)
