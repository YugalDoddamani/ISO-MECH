// Static checks for the classic-script architecture. Run with `npm run check`.
//
//  1. index.html references only existing files, every js/ and css/ file is referenced, and every
//     application script is deferred (so it runs in document order with the cannon-es module).
//  2. Load order: while a module loads it may only use top-level names declared by itself (in
//     order) or by modules above it, including names reached through functions it calls at load time.
//  3. No top-level name is declared twice, and application modules are strict-mode scripts.
//  4. CDN integrity hashes match the pinned copies installed in node_modules (when present).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let acorn, eslintScope;
try {
  acorn = await import('acorn');
  eslintScope = await import('eslint-scope');
} catch {
  console.error('Missing dev dependencies. Run `npm install` first.');
  process.exit(2);
}

const problems = [];
const notes = [];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const attrs = tag =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].slice(1).map(m => [m[1], m[2] ?? true]));

// ---------------------------------------------------------------- 1. manifest
const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(m => attrs(m[0]))
  .filter(a => a.rel === 'stylesheet');
const scriptTags = [...html.matchAll(/<script\b[^>]*>/g)].map(m => attrs(m[0]));
const vendor = scriptTags.filter(a => a.src && /^https?:/.test(a.src));
const modules = scriptTags.filter(a => a.src && !/^https?:/.test(a.src));
const preloads = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(m => attrs(m[0]))
  .filter(a => a.rel === 'modulepreload');

for (const s of stylesheets)
  if (!fs.existsSync(path.join(root, s.href))) problems.push(`index.html: missing stylesheet ${s.href}`);
for (const s of modules) {
  if (!fs.existsSync(path.join(root, s.src))) problems.push(`index.html: missing script ${s.src}`);
  if (!s.defer)
    problems.push(`index.html: ${s.src} must be deferred to keep document order with the module script`);
}
for (const v of vendor) {
  if (!v.integrity) problems.push(`index.html: CDN script without integrity: ${v.src}`);
  if (!v.defer) problems.push(`index.html: CDN script must be deferred: ${v.src}`);
}
const walk = dir =>
  fs
    .readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap(e =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name).split(path.sep).join('/')]
    );
const referenced = new Set([...stylesheets.map(s => s.href), ...modules.map(s => s.src)]);
for (const file of [...walk('js'), ...walk('css')])
  if (!referenced.has(file)) problems.push(`orphan file not loaded by index.html: ${file}`);

// ---------------------------------------------------------------- 2/3. load order
const IMMEDIATE = new Set([
  'forEach',
  'map',
  'filter',
  'some',
  'every',
  'find',
  'findIndex',
  'findLast',
  'reduce',
  'reduceRight',
  'flatMap',
  'sort',
  'traverse',
  'traverseVisible',
  'traverseAncestors',
  'replace',
  'replaceAll',
  'from',
]);

const files = modules.map((m, index) => {
  const code = fs.readFileSync(path.join(root, m.src), 'utf8');
  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    locations: true,
    ranges: true,
  });
  const scopeManager = eslintScope.analyze(ast, {
    ecmaVersion: 2022,
    sourceType: 'script',
    fallback: 'iteration',
  });
  (function link(node, parent) {
    if (!node || typeof node.type !== 'string') return;
    node.parent = parent;
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(child => link(child, node));
      else if (value && typeof value.type === 'string') link(value, node);
    }
  })(ast, null);
  const factory = ast.body.every(
    s => s.type === 'ExpressionStatement' && /^window\.create/.test(code.slice(s.range[0], s.range[1]))
  );
  const strict = ast.body[0]?.directive === 'use strict';
  if (!factory && !strict) problems.push(`${m.src}: application modules must start with 'use strict'`);
  return { path: m.src, index, code, ast, scopeManager, factory };
});

const decls = new Map();
for (const f of files) {
  f.ast.body.forEach((stmt, stmtIndex) => {
    const add = (name, kind) => {
      if (decls.has(name))
        problems.push(`duplicate top-level "${name}" in ${decls.get(name).file.path} and ${f.path}`);
      decls.set(name, { file: f, kind, stmt: stmtIndex, node: stmt });
    };
    if (stmt.type === 'FunctionDeclaration') add(stmt.id.name, 'function');
    else if (stmt.type === 'ClassDeclaration') add(stmt.id.name, 'class');
    else if (stmt.type === 'VariableDeclaration')
      for (const d of stmt.declarations)
        for (const v of f.scopeManager.getDeclaredVariables(d)) add(v.name, stmt.kind);
  });
}

// Named top-level functions: declarations and `const name = () => …` initialisers.
const topFunctions = new Map();
for (const [name, d] of decls) {
  if (d.kind === 'function') topFunctions.set(name, d.node);
  else if (d.node.type === 'VariableDeclaration')
    for (const decl of d.node.declarations)
      if (
        decl.id.type === 'Identifier' &&
        decl.id.name === name &&
        /^(Arrow)?Function/.test(decl.init?.type || '')
      )
        topFunctions.set(name, decl.init);
}
const topFunctionNodes = new Set(topFunctions.values());

const isImmediate = fn => {
  const p = fn.parent;
  if ((p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.callee === fn) return true;
  return (
    p?.type === 'CallExpression' &&
    p.arguments.includes(fn) &&
    p.callee.type === 'MemberExpression' &&
    !p.callee.computed &&
    IMMEDIATE.has(p.callee.property.name)
  );
};
const isCall = id => {
  const p = id.parent;
  if ((p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.callee === id) return true;
  return (
    p?.type === 'CallExpression' &&
    p.arguments.includes(id) &&
    p.callee.type === 'MemberExpression' &&
    !p.callee.computed &&
    IMMEDIATE.has(p.callee.property.name)
  );
};

const functionRefs = new Map();
const loadTime = [];
const externals = new Set();
for (const f of files) {
  for (const scope of f.scopeManager.scopes) {
    for (const ref of scope.references) {
      if (ref.resolved && ref.resolved.scope.type !== 'global') continue;
      const name = ref.identifier.name;
      if (!decls.has(name)) {
        externals.add(name);
        continue;
      }
      let immediate = true,
        owner = null;
      for (let s = scope; s && s.type !== 'global'; s = s.upper) {
        if (s.type !== 'function') continue;
        if (topFunctionNodes.has(s.block)) {
          owner = s.block;
          break;
        }
        if (!isImmediate(s.block)) immediate = false;
      }
      if (!immediate) continue; // deferred: event handlers, timers, callbacks run after start-up
      const entry = { name, call: isCall(ref.identifier), file: f };
      if (owner) {
        if (!functionRefs.has(owner)) functionRefs.set(owner, []);
        functionRefs.get(owner).push(entry);
      } else {
        const stmt = f.ast.body.findIndex(
          s => s.range[0] <= ref.identifier.range[0] && ref.identifier.range[1] <= s.range[1]
        );
        loadTime.push({ ...entry, stmt });
      }
    }
  }
}

function checkRef(ref, file, stmt, chain, seen) {
  const d = decls.get(ref.name);
  const where = `${file.path} (statement ${stmt + 1}${chain.length ? `, via ${chain.join(' → ')}` : ''})`;
  if (d.file.index > file.index)
    problems.push(`"${ref.name}" from ${d.file.path} is used while loading ${where}; load it earlier`);
  else if (
    d.file.index === file.index &&
    d.kind !== 'function' &&
    (d.stmt > stmt || (d.stmt === stmt && chain.length))
  )
    problems.push(`"${ref.name}" is used before its ${d.kind} declaration while loading ${where}`);
  if (!ref.call || !topFunctions.has(ref.name)) return;
  const fn = topFunctions.get(ref.name);
  if (seen.has(fn)) return;
  seen.add(fn);
  for (const inner of functionRefs.get(fn) || [])
    checkRef(inner, file, stmt, [...chain, `${ref.name}()`], seen);
}
for (const ref of loadTime) checkRef(ref, ref.file, ref.stmt, [], new Set());

for (const f of files) {
  for (const m of f.code.matchAll(/window\.(create[A-Za-z]+)\(/g)) {
    const provider = files.find(p => p.factory && p.code.includes(`window.${m[1]} = function`));
    if (!provider) problems.push(`${f.path}: window.${m[1]} is not defined by any factory script`);
    else if (provider.index > f.index)
      problems.push(`${f.path}: window.${m[1]} is defined later, in ${provider.path}`);
  }
}
const BROWSER_GLOBALS = new Set([
  'Array',
  'Error',
  'Float32Array',
  'Float64Array',
  'Infinity',
  'Map',
  'Math',
  'Number',
  'Object',
  'ResizeObserver',
  'Set',
  'String',
  'THREE',
  'clearTimeout',
  'console',
  'devicePixelRatio',
  'document',
  'localStorage',
  'matchMedia',
  'navigator',
  'performance',
  'requestAnimationFrame',
  'screen',
  'setTimeout',
  'undefined',
  'window',
  'JSON',
  'Date',
  'Promise',
  'Symbol',
  'isFinite',
  'parseFloat',
  'parseInt',
  'NaN',
  'Boolean',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
  'Int32Array',
  'cancelAnimationFrame',
  'setInterval',
  'clearInterval',
  'location',
  'getComputedStyle',
  'innerWidth',
  'innerHeight',
  'CANNON',
  'HTMLElement',
  'Event',
  'CustomEvent',
  'URL',
  'Blob',
]);
const unknown = [...externals].filter(name => !BROWSER_GLOBALS.has(name)).sort();
if (unknown.length) notes.push(`globals not declared by any module (check for typos): ${unknown.join(', ')}`);

// ---------------------------------------------------------------- 4. SRI against node_modules
const cdnPattern = /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.+)$/;
for (const item of [
  ...vendor.map(v => ({ url: v.src, integrity: v.integrity })),
  ...preloads.map(p => ({ url: p.href, integrity: p.integrity })),
]) {
  const match = item.url.match(cdnPattern);
  if (!match) {
    notes.push(`not a jsDelivr npm URL, integrity not verified: ${item.url}`);
    continue;
  }
  const [, pkg, version, file] = match;
  const dir = path.join(root, 'node_modules', pkg);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    notes.push(`node_modules/${pkg} not installed; skipped integrity check`);
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  if (installed !== version) {
    problems.push(`index.html pins ${pkg}@${version} but package.json/node_modules has ${installed}`);
    continue;
  }
  const digest =
    'sha384-' +
    crypto
      .createHash('sha384')
      .update(fs.readFileSync(path.join(dir, file)))
      .digest('base64');
  if (digest !== item.integrity) problems.push(`integrity mismatch for ${item.url}: expected ${digest}`);
}
const moduleImports = [...html.matchAll(/import\s+\*\s+as\s+\w+\s+from\s+'([^']+)'/g)].map(m => m[1]);
for (const url of moduleImports)
  if (!preloads.some(p => p.href === url))
    problems.push(`module import without an integrity-carrying modulepreload: ${url}`);

console.log(
  `index.html: ${stylesheets.length} stylesheets, ${vendor.length} CDN scripts + ${moduleImports.length} CDN module, ${modules.length} application scripts`
);
console.log(`load order: ${decls.size} top-level names, ${loadTime.length} load-time references checked`);
for (const n of notes) console.log(`note: ${n}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('OK');
