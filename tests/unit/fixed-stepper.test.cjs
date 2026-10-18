// The fixed-step accumulator runs in Node as well as the browser: load the factory into a fake window.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.window = globalThis.window || {};
require(path.join(__dirname, '../../js/physics/fixed-stepper.js'));
const { createFixedStepper } = globalThis.window;

test('steps at a fixed rate and carries the remainder', () => {
  const steps = [];
  const stepper = createFixedStepper({ hz: 60, step: (dt, index) => steps.push([dt, index]) });
  const first = stepper.update(0.04); // 2.4 steps: two run now, 0.4 of a step is carried over
  assert.equal(first.steps, 2);
  assert.deepEqual(
    steps.map(([, index]) => index),
    [0, 1]
  );
  assert(steps.every(([dt]) => dt === 1 / 60));
  assert(Math.abs(first.alpha - 0.4) < 1e-9, `alpha ${first.alpha}`);
  const second = stepper.update(0.01); // 0.4 + 0.6 = one more whole step
  assert.equal(second.steps, 1);
  assert.equal(stepper.stepCount, 3);
  assert(second.alpha < 1e-6, `alpha ${second.alpha}`);
});

test('clamps long frames and records dropped time', () => {
  let count = 0;
  const stepper = createFixedStepper({
    hz: 60,
    maxFrameTime: 0.12,
    maxStepsPerFrame: 8,
    step: () => count++,
  });
  const result = stepper.update(2);
  assert(result.steps <= 8);
  assert.equal(count, result.steps);
  assert(stepper.droppedTime >= 2 - 0.12 - 1e-9, `dropped ${stepper.droppedTime}`);
});

test('advance() runs an exact number of steps and reset() clears the counters', () => {
  let count = 0;
  const stepper = createFixedStepper({ step: () => count++ });
  assert.equal(stepper.advance(10), 10);
  assert.equal(count, 10);
  stepper.reset();
  assert.equal(stepper.stepCount, 0);
  assert.equal(stepper.accumulator, 0);
  assert.equal(stepper.droppedTime, 0);
});

test('identical frame sequences produce identical step counts', () => {
  const frames = [0.016, 0.017, 0.033, 0.002, 0.25, 0.016, 0.001, 0.05];
  const run = () => {
    const stepper = createFixedStepper({ hz: 60 });
    return frames.map(frame => stepper.update(frame).stepCount);
  };
  assert.deepEqual(run(), run());
});
