// The earthworks model is deterministic and conservative: digging, dumping, drilling, withdrawing and
// relaxing move material around without creating or destroying volume.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.window = globalThis.window || {};
require(path.join(__dirname, '../../js/environment/soil-simulation.js'));
const { createSoilSimulation } = globalThis.window;

const make = () =>
  createSoilSimulation({
    cellSize: 0.5,
    columns: 41,
    rows: 41,
    originX: -10,
    originZ: -10,
    payloadCapacity: 0.82,
    piles: [{ x: 0, z: 0, radius: 4, height: 1.6 }],
  });
const close = (a, b, label) => assert(Math.abs(a - b) < 1e-9, `${label}: ${a} vs ${b}`);

test('piles create terrain volume and heights can be sampled', () => {
  const soil = make();
  assert(soil.totalTerrainVolume() > 10);
  assert(soil.heightAt(0, 0) > 1.4);
  assert.equal(soil.heightAt(9, 9), 0);
  assert.equal(soil.bucketPayload, 0);
});

test('scooping and dumping conserve volume', () => {
  const soil = make();
  const total = soil.totalConservedVolume();
  const removed = soil.scoopSweep({ x: -2, y: 0.4, z: 0 }, { x: 2, y: 0.4, z: 0 });
  assert(removed > 0 && removed <= 0.82 + 1e-12, `removed ${removed}`);
  close(soil.bucketPayload, removed, 'payload');
  close(soil.totalConservedVolume(), total, 'after scoop');
  const placed = soil.dumpBucket(6, 6);
  close(placed, removed, 'placed');
  assert.equal(soil.bucketPayload, 0);
  close(soil.totalConservedVolume(), total, 'after dump');
});

test('drilling moves spoil beside the bore and withdraw removes exactly what is asked', () => {
  const soil = make();
  const total = soil.totalTerrainVolume();
  const removed = soil.drillBore(6, -6, 1.2);
  assert(removed > 0);
  assert(soil.heightAt(6, -6) < 0, 'the bore is below grade');
  close(soil.totalTerrainVolume(), total, 'after drilling');
  const taken = soil.withdraw(0, 0, 1);
  close(taken, 1, 'withdrawn');
  close(soil.totalTerrainVolume(), total - 1, 'after withdraw');
});

test('relaxation is conservative and the model resets', () => {
  const soil = make();
  soil.deposit(5, 5, 3, 0.6);
  const total = soil.totalTerrainVolume();
  for (let i = 0; i < 120; i++) soil.relax(1 / 60, 2);
  close(soil.totalTerrainVolume(), total, 'after relaxing');
  soil.reset();
  close(soil.totalTerrainVolume(), make().totalTerrainVolume(), 'after reset');
});

test('layers get harder with depth', () => {
  const soil = make();
  const names = [0.1, 1, 2, 3].map(depth => soil.layerAtDepth(depth).name);
  assert.deepEqual(names, ['topsoil', 'compacted fill', 'dense clay', 'weathered gravel']);
});
