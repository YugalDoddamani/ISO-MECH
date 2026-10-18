/* Small deterministic fixed-step accumulator shared by the browser app and Node tests. */
window.createFixedStepper = function createFixedStepper(options = {}) {
  const hz = Number.isFinite(options.hz) && options.hz > 0 ? options.hz : 60;
  const dt = 1 / hz;
  const maxFrameTime = Number.isFinite(options.maxFrameTime) ? Math.max(dt, options.maxFrameTime) : .12;
  const maxStepsPerFrame = Number.isFinite(options.maxStepsPerFrame)
    ? Math.max(1, Math.floor(options.maxStepsPerFrame)) : Math.ceil(maxFrameTime * hz);
  const step = typeof options.step === 'function' ? options.step : () => {};
  let accumulator = 0, stepCount = 0, droppedTime = 0;
  const epsilon = dt * 1e-9;

  function advance(count) {
    const n = Math.max(0, Math.min(1000000, Math.floor(Number(count) || 0)));
    for (let i = 0; i < n; i++) {
      step(dt, stepCount);
      stepCount++;
    }
    return stepCount;
  }

  function update(elapsed) {
    const raw = Math.max(0, Number(elapsed) || 0);
    const accepted = Math.min(raw, maxFrameTime);
    droppedTime += raw - accepted;
    accumulator += accepted;
    let steps = Math.min(Math.floor((accumulator + epsilon) / dt), maxStepsPerFrame);
    if (steps) {
      advance(steps);
      accumulator = Math.max(0, accumulator - steps * dt);
    }
    if (steps === maxStepsPerFrame && accumulator + epsilon >= dt) {
      const droppedSteps = Math.floor((accumulator + epsilon) / dt);
      const drop = droppedSteps * dt;
      accumulator = Math.max(0, accumulator - drop);
      droppedTime += drop;
    }
    return { steps, alpha: accumulator / dt, stepCount, droppedTime };
  }

  function reset() { accumulator = 0; stepCount = 0; droppedTime = 0; }
  return { hz, dt, update, advance, reset, get stepCount() { return stepCount; },
    get accumulator() { return accumulator; }, get droppedTime() { return droppedTime; } };
};
