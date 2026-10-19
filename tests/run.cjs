// Runs the unit tests and every browser check. Starts a local server unless BASE_URL is already set.
// Usage: npm test            (all)        node tests/run.cjs smoke travel   (selected browser checks)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BROWSER_CHECKS = [
  'smoke',
  'cdn',
  'vehicles',
  'travel',
  'excavator',
  'yard',
  'work',
  'audio',
  'interface',
];

(async () => {
  const selected = process.argv.slice(2);
  const checks = selected.length ? BROWSER_CHECKS.filter(name => selected.includes(name)) : BROWSER_CHECKS;
  let server = null;
  const env = { ...process.env };
  if (!env.BASE_URL) {
    const { createServer } = await import(path.join(__dirname, '..', 'scripts', 'serve.mjs'));
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    env.BASE_URL = `http://127.0.0.1:${server.address().port}/`;
  }
  const results = [];
  // Children run asynchronously so this process can keep serving the app while they use it.
  const runStep = (name, args) =>
    new Promise(resolve => {
      const started = Date.now();
      spawn(process.execPath, args, { stdio: 'inherit', env }).on('close', status => {
        results.push({ name, ok: status === 0, seconds: ((Date.now() - started) / 1000).toFixed(1) });
        resolve();
      });
    });
  const unitTests = fs
    .readdirSync(path.join(__dirname, 'unit'))
    .filter(f => f.endsWith('.test.cjs'))
    .map(f => path.join(__dirname, 'unit', f));
  if (!selected.length) await runStep('unit', ['--test', ...unitTests]);
  for (const name of checks) await runStep(name, [path.join(__dirname, `${name}.cjs`)]);
  if (server) server.close();
  console.log('\nSummary');
  for (const r of results) console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.name.padEnd(10)} ${r.seconds}s`);
  process.exit(results.every(r => r.ok) ? 0 : 1);
})();
