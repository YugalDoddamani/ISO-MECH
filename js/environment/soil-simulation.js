/* Deterministic, conservative cell-based earthworks model. Distances are metres and
 * material volumes are cubic metres; the renderer samples this heightfield directly.
 */
window.createSoilSimulation = function createSoilSimulation(options = {}) {
  const cellSize = Number.isFinite(options.cellSize) && options.cellSize > 0 ? options.cellSize : .5;
  const columns = Math.max(3, Math.floor(options.columns || 97));
  const rows = Math.max(3, Math.floor(options.rows || 105));
  const originX = Number.isFinite(options.originX) ? options.originX : -4;
  const originZ = Number.isFinite(options.originZ) ? options.originZ : -20;
  const cellArea = cellSize * cellSize;
  const reposeAngle = (Number.isFinite(options.reposeAngleDegrees) ? options.reposeAngleDegrees : 33) * Math.PI / 180;
  const reposeSlope = Math.tan(reposeAngle), reposeRate = options.reposeRate || .8;
  const heights = new Float64Array(columns * rows);
  const softness = new Float32Array(columns * rows);
  softness.fill(.22);
  const initialPiles = options.piles || [];
  let bucketPayload = 0;
  const payloadCapacity = options.payloadCapacity || .82;
  const maxHeight = options.maxHeight || 8;

  const inside = (col, row) => col >= 0 && row >= 0 && col < columns && row < rows;
  const indexOf = (col, row) => row * columns + col;
  function cellCenter(col, row) { return { x: originX + col * cellSize, z: originZ + row * cellSize }; }
  function locate(x, z) { return { col: Math.round((x - originX) / cellSize), row: Math.round((z - originZ) / cellSize) }; }
  function addPile({ x, z, radius, height, softness: soft = .82 }) {
    const minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
    const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
      if (d >= radius) continue;
      const i = indexOf(col, row), h = height * (1 - d / radius);
      heights[i] = Math.min(maxHeight, heights[i] + h);
      softness[i] = Math.max(softness[i], soft);
    }
  }
  for (const pile of initialPiles) addPile(pile);
  const initialHeights = heights.slice(), initialSoftness = softness.slice();

  function cellValue(array, x, z, fallback = 0) {
    const gx = (x - originX) / cellSize, gz = (z - originZ) / cellSize;
    const x0 = Math.floor(gx), z0 = Math.floor(gz), x1 = x0 + 1, z1 = z0 + 1;
    if (!inside(x0, z0) || !inside(x1, z1)) return fallback;
    const tx = gx - x0, tz = gz - z0;
    const a = array[indexOf(x0, z0)] * (1 - tx) + array[indexOf(x1, z0)] * tx;
    const b = array[indexOf(x0, z1)] * (1 - tx) + array[indexOf(x1, z1)] * tx;
    return a * (1 - tz) + b * tz;
  }
  function heightAt(x, z) { return cellValue(heights, x, z, 0); }
  function sample(x, z) {
    return { height: heightAt(x, z), softness: Math.max(0, Math.min(1, cellValue(softness, x, z, .22))) };
  }
  function totalTerrainVolume() {
    let sum = 0;
    for (let i = 0; i < heights.length; i++) sum += heights[i];
    return sum * cellArea;
  }
  function totalConservedVolume() { return totalTerrainVolume() + bucketPayload; }

  // A circular cutter follows the actual bucket lip between fixed simulation steps.
  // Every touched cell is visited once per sweep, avoiding repeated-material overcount.
  function scoopSweep(from, to, options = {}) {
    const radius = Math.max(.05, options.radius || .72);
    const capacity = options.capacity || payloadCapacity;
    const room = Math.max(0, capacity - bucketPayload);
    if (room <= 1e-10) return 0;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const horizontal = Math.hypot(dx, dz);
    const samples = Math.max(1, Math.ceil(horizontal / (cellSize * .35)));
    const touched = new Map();
    for (let n = 0; n <= samples; n++) {
      const t = n / samples, x = from.x + dx * t, y = from.y + dy * t, z = from.z + dz * t;
      const minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
      const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
      const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
      const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
      for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
        const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
        if (d >= radius) continue;
        const weight = (1 - (d / radius) ** 2) ** 2, i = indexOf(col, row), existing = touched.get(i);
        if (!existing || y < existing.y) touched.set(i, { y, weight: Math.max(weight, existing?.weight || 0) });
      }
    }
    let requested = 0;
    for (const [i, contact] of touched) {
      const cutHeight = Math.max(0, contact.y);
      requested += Math.max(0, heights[i] - cutHeight) * contact.weight * cellArea;
    }
    let remaining = Math.min(room, requested), removed = 0;
    if (remaining <= 1e-10) return 0;
    for (const [i, contact] of touched) {
      if (remaining <= 1e-10) break;
      const cutHeight = Math.max(0, contact.y), available = Math.max(0, heights[i] - cutHeight) * contact.weight * cellArea;
      const amount = Math.min(available, remaining);
      if (amount <= 0) continue;
      heights[i] -= amount / cellArea;
      softness[i] = Math.min(1, softness[i] + .08);
      remaining -= amount; removed += amount;
    }
    bucketPayload += removed;
    return removed;
  }

  // Deposit exact volume over a radial footprint and relax the surface afterward.
  function deposit(x, z, volume, radius = 1.25) {
    let remaining = Math.max(0, Number(volume) || 0);
    if (remaining <= 1e-12) return 0;
    const minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
    const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
    const cells = []; let weightSum = 0;
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
      if (d > radius) continue;
      const weight = Math.max(.015, (1 - d / radius) ** 2), i = indexOf(col, row);
      cells.push([i, weight]); weightSum += weight;
    }
    if (!cells.length) {
      const nearest = locate(x, z), col = Math.max(0, Math.min(columns - 1, nearest.col)), row = Math.max(0, Math.min(rows - 1, nearest.row));
      const i = indexOf(col, row); heights[i] += remaining / cellArea; softness[i] = Math.max(softness[i], .86);
      return remaining;
    }
    for (let n = 0; n < cells.length; n++) {
      const [i, weight] = cells[n], amount = n === cells.length - 1 ? remaining : Math.min(remaining, volume * weight / weightSum);
      heights[i] += amount / cellArea;
      softness[i] = Math.max(softness[i], .84);
      remaining -= amount;
    }
    const placed = volume - remaining;
    if (placed > 0) relax(1 / 60, 2);
    return placed;
  }
  function dumpBucket(x, z, radius = 1.35) {
    const amount = bucketPayload;
    if (amount <= 0) return 0;
    const placed = deposit(x, z, amount, radius);
    bucketPayload = Math.max(0, bucketPayload - placed);
    return placed;
  }
  function withdraw(x, z, volume, radius = 2.5) {
    let remaining = Math.max(0, Number(volume) || 0), removed = 0;
    const minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
    const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
    const cells = [];
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
      if (d <= radius) cells.push({ i: indexOf(col, row), d, h: heights[indexOf(col, row)] });
    }
    cells.sort((a, b) => a.d - b.d || b.h - a.h);
    for (const cell of cells) {
      if (remaining <= 1e-10) break;
      const available = Math.max(0, heights[cell.i]) * cellArea, amount = Math.min(available, remaining);
      heights[cell.i] -= amount / cellArea; remaining -= amount; removed += amount;
    }
    return removed;
  }
  function drillBore(x, z, depth, radius = .42, spoilX = x + 1.1, spoilZ = z) {
    const target = -Math.max(0, depth), minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
    const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
    let removed = 0;
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
      if (d >= radius) continue;
      const weight = (1 - (d / radius) ** 2) ** 2, i = indexOf(col, row);
      const next = Math.min(heights[i], target), amount = (heights[i] - next) * cellArea * weight;
      heights[i] -= amount / cellArea;
      removed += amount;
      softness[i] = Math.min(1, softness[i] + .04);
    }
    if (removed > 0) deposit(spoilX, spoilZ, removed, .72 + Math.min(1, depth) * .28);
    return removed;
  }

  // A conservative four-neighbour flow pass. Excess slope is moved downhill,
  // never deleted; the two passes are stable at the app's 1/60 s time step.
  function relax(dt = 1 / 60, passes = 1) {
    const maxTransfer = reposeRate * Math.max(0, dt);
    if (maxTransfer <= 0) return 0;
    let moved = 0;
    for (let pass = 0; pass < passes; pass++) {
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const i = indexOf(col, row), neighbors = [];
        if (col + 1 < columns) neighbors.push(i + 1);
        if (row + 1 < rows) neighbors.push(i + columns);
        for (const j of neighbors) {
          const delta = heights[i] - heights[j], excess = Math.abs(delta) - reposeSlope * cellSize;
          if (excess <= 1e-9) continue;
          const high = delta > 0 ? i : j, low = delta > 0 ? j : i;
          const amount = Math.min(heights[high] * cellArea, Math.min(maxTransfer, excess * .45) * cellArea);
          if (amount <= 0) continue;
          heights[high] -= amount / cellArea;
          heights[low] += amount / cellArea;
          softness[high] = Math.max(softness[high], .58);
          softness[low] = Math.max(softness[low], .58);
          moved += amount;
        }
      }
    }
    return moved;
  }
  function compact(x, z, radius = .8, amount = .12) {
    const minCol = Math.max(0, Math.floor((x - radius - originX) / cellSize));
    const maxCol = Math.min(columns - 1, Math.ceil((x + radius - originX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - originZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.ceil((z + radius - originZ) / cellSize));
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const point = cellCenter(col, row), d = Math.hypot(point.x - x, point.z - z);
      if (d < radius) {
        const i = indexOf(col, row), falloff = 1 - d / radius;
        softness[i] = Math.max(.05, softness[i] - Math.max(0, amount) * falloff);
      }
    }
  }
  function layerAtDepth(depth) {
    const d = Math.max(0, depth);
    if (d < .55) return { name: 'topsoil', resistance: 1.0 };
    if (d < 1.35) return { name: 'compacted fill', resistance: 2.15 };
    if (d < 2.25) return { name: 'dense clay', resistance: 3.6 };
    return { name: 'weathered gravel', resistance: 5.4 };
  }
  function reset() {
    heights.set(initialHeights); softness.set(initialSoftness); bucketPayload = 0;
  }

  return {
    columns, rows, originX, originZ, cellSize, cellArea, heights, softness,
    heightAt, sample, totalTerrainVolume, totalConservedVolume, scoopSweep, deposit, dumpBucket, withdraw,
    drillBore, relax, compact, layerAtDepth, reset,
    get bucketPayload() { return bucketPayload; }, get payloadCapacity() { return payloadCapacity; },
  };
};
