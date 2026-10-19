/* Cannon-es-backed collision adapter for mobile yard props and machine envelopes. */
window.createYardPhysics = function createYardPhysics(CANNON) {
  if (!CANNON || !CANNON.World) throw new Error('Offline Cannon-es bundle is missing');
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 10;
  world.solver.tolerance = 1e-6;
  const groundMaterial = new CANNON.Material('yard-ground');
  const propMaterial = new CANNON.Material('yard-props');
  world.defaultContactMaterial.friction = .62;
  world.defaultContactMaterial.restitution = .035;
  world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, propMaterial, {
    friction: .74, restitution: .025, contactEquationStiffness: 1e7, contactEquationRelaxation: 3,
  }));
  const ground = new CANNON.Body({ mass: 0, material: groundMaterial });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  ground.position.y = -.025;
  ground.name = 'yard-ground';
  world.addBody(ground);
  const propBodies = new Map(), machineBodies = new Map(), staticObstacleBodies = [];
  const identity = new CANNON.Quaternion();
  const pipeAxis = new CANNON.Quaternion(); pipeAxis.setFromEuler(0, 0, Math.PI / 2);

  function propShape(kind) {
    if (kind === 'pipe') {
      const shape = new CANNON.Cylinder(.25, .25, 4.8, 12);
      return { shape, offset: new CANNON.Vec3(), orientation: pipeAxis, mass: 7.5, linearDamping: .24, angularDamping: .32 };
    }
    if (kind === 'barrel') {
      return { shape: new CANNON.Cylinder(.36, .36, .84, 16), offset: new CANNON.Vec3(0, .42, 0), orientation: identity, mass: 24, linearDamping: .26, angularDamping: .42 };
    }
    return { shape: new CANNON.Cylinder(.045, .205, .56, 8), offset: new CANNON.Vec3(0, .31, 0), orientation: identity, mass: .9, linearDamping: .3, angularDamping: .55 };
  }
  function vectorFrom(value, fallback = new CANNON.Vec3()) {
    if (!value) return fallback.clone();
    return new CANNON.Vec3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
  }
  function quaternionFrom(value) {
    if (!value) return new CANNON.Quaternion();
    return new CANNON.Quaternion(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0, Number.isFinite(value.w) ? value.w : 1);
  }
  function createProp(object, kind) {
    const config = propShape(kind), body = new CANNON.Body({
      mass: config.mass, material: propMaterial, linearDamping: config.linearDamping,
      angularDamping: config.angularDamping, allowSleep: true,
    });
    body.addShape(config.shape, config.offset, config.orientation);
    body.position.copy(vectorFrom(object.position)); body.quaternion.copy(quaternionFrom(object.quaternion));
    body.name = `yard-${kind}`; body.sleepSpeedLimit = .16; body.sleepTimeLimit = .55;
    world.addBody(body); propBodies.set(object, body);
    return body;
  }
  function addStaticObstacle(obstacle) {
    const body = new CANNON.Body({ mass: 0, material: groundMaterial });
    body.addShape(new CANNON.Box(new CANNON.Vec3(obstacle.hx, .72, obstacle.hz)), new CANNON.Vec3(0, .72, 0));
    body.position.set(obstacle.x, 0, obstacle.z); body.name = `site-${obstacle.name}`;
    world.addBody(body); staticObstacleBodies.push(body); return body;
  }
  function addMachine(id, footprint, height = 2.8) {
    const body = new CANNON.Body({ mass: 0, material: groundMaterial });
    body.addShape(new CANNON.Box(new CANNON.Vec3(footprint.hx, height * .5, footprint.hz)),
      new CANNON.Vec3(0, height * .5, 0));
    body.type = CANNON.Body.STATIC;
    body.name = `machine-${id}`; body.aabbNeedsUpdate = true;
    world.addBody(body); machineBodies.set(id, { body, previous: null });
    return body;
  }
  // The active machine (pose passed in) and any ids in `moving` (pose read from their records) are
  // kinematic bodies that push props with their velocity; the rest are static.
  function syncFleet(records, activeId, activePosition, activeHeading, dt, moving = null) {
    for (const [id, record] of Object.entries(records)) {
      const entry = machineBodies.get(id); if (!entry) continue;
      const driven = id === activeId, active = driven || (moving !== null && moving.has(id)), body = entry.body;
      const x = driven ? activePosition.x : record.position.x;
      const y = driven ? activePosition.y : record.position.y;
      const z = driven ? activePosition.z : record.position.z;
      const heading = driven ? activeHeading : record.heading;
      const p = new CANNON.Vec3(x, y, z), q = new CANNON.Quaternion(); q.setFromEuler(0, heading, 0);
      if (active) {
        if (body.type !== CANNON.Body.KINEMATIC) {
          body.type = CANNON.Body.KINEMATIC; body.updateMassProperties(); entry.previous = { x, y, z, heading };
        }
        const previous = entry.previous || { x, y, z, heading };
        const invDt = 1 / Math.max(dt, 1e-6), dHeading = ((heading - previous.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        body.velocity.set((x - previous.x) * invDt, (y - previous.y) * invDt, (z - previous.z) * invDt);
        body.angularVelocity.set(0, dHeading * invDt, 0);
        entry.previous = { x, y, z, heading };
      } else {
        if (body.type !== CANNON.Body.STATIC) { body.type = CANNON.Body.STATIC; body.updateMassProperties(); }
        body.velocity.setZero(); body.angularVelocity.setZero(); entry.previous = { x, y, z, heading };
      }
      body.position.copy(p); body.quaternion.copy(q); body.aabbNeedsUpdate = true; body.wakeUp();
    }
  }
  function step(dt) { world.step(dt); }
  function syncProp(object) {
    const body = propBodies.get(object); if (!body) return null;
    if(object.position.set)object.position.set(body.position.x,body.position.y,body.position.z);else Object.assign(object.position,{x:body.position.x,y:body.position.y,z:body.position.z});
    if(object.quaternion.set)object.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);else Object.assign(object.quaternion,{x:body.quaternion.x,y:body.quaternion.y,z:body.quaternion.z,w:body.quaternion.w});
    return body;
  }
  function resetProp(object, position, quaternion) {
    const body = propBodies.get(object); if (!body) return false;
    body.position.copy(vectorFrom(position)); body.quaternion.copy(quaternionFrom(quaternion));
    body.velocity.setZero(); body.angularVelocity.setZero(); body.force.setZero(); body.torque.setZero();
    body.wakeUp(); body.aabbNeedsUpdate = true; body.updateBoundingRadius();
    return true;
  }
  function bodyFor(object) { return propBodies.get(object) || null; }
  function clearDynamicForces() { for (const body of propBodies.values()) { body.force.setZero(); body.torque.setZero(); } }

  return { world, ground, createProp, addStaticObstacle, addMachine, syncFleet, step, syncProp, resetProp,
    bodyFor, clearDynamicForces, propBodies, machineBodies, staticObstacleBodies };
};
