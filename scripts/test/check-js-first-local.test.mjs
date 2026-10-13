import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fingerprint, verifyStamp, stages } from '../check-js-first-local.mjs';
test('local reverse stage discovers a new failing test under both engines before freshness', { timeout: 30_000 }, () => {
  const commands = stages.find(([id]) => id === 'reverse-translation')[1];
  assert.deepEqual(commands, [
    'node --test --test-concurrency=2 tools/translation/js-to-rust/test/*.test.mjs',
    'bun test tools/translation/js-to-rust/test/*.test.mjs',
    'node scripts/regenerate-js-first.mjs --check',
  ]);
  assert.equal(stages.length, 7);
  assert.ok(stages.find(([id]) => id === 'typescript')[1].includes('node --test tools/translation/js-to-rust/test/native-typescript.test.mjs'));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router-reverse-discovery-'));
  const testDirectory = path.join(directory, 'tools/translation/js-to-rust/test');
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  try {
    fs.mkdirSync(testDirectory, { recursive: true });
    fs.writeFileSync(path.join(testDirectory, 'existing.test.mjs'), "import test from 'node:test'; test('existing translator', () => {});\n");
    for (const command of commands.slice(0, 2)) {
      const result = spawnSync(command, { cwd: directory, env: environment, shell: true, encoding: 'utf8', timeout: 10_000 });
      assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
    }
    fs.writeFileSync(path.join(testDirectory, 'future.test.mjs'), "import test from 'node:test'; test('new translator regression', () => { throw new Error('future test was discovered'); });\n");
    for (const command of commands.slice(0, 2)) {
      const result = spawnSync(command, { cwd: directory, env: environment, shell: true, encoding: 'utf8', timeout: 10_000 });
      assert.ok(!result.error, result.error?.message);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /future test was discovered/);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('green stamps require strict parity, every stage and unchanged tracked/untracked source', () => {
  const previous = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router-gate-stamp-'));
  try {
    process.chdir(directory);
    execFileSync('git', ['init', '-q']);
    execFileSync('git', ['config', 'user.name', 'Gate Test']);
    execFileSync('git', ['config', 'user.email', 'gate@example.invalid']);
    fs.writeFileSync('source.js', 'export const value = 1;\n');
    execFileSync('git', ['add', 'source.js']);
    execFileSync('git', ['commit', '-qm', 'fixture']);
    const stampPath = path.join(directory, 'stamp.json');
    const identity = fingerprint(stampPath);
    const valid = { version: 1, ...identity, checkedAt: new Date().toISOString(), stages: stages.map(([id]) => id), strictParity: true };
    const stamp = (overrides = {}) => fs.writeFileSync(stampPath, JSON.stringify({ ...valid, ...overrides }));
    stamp(); assert.deepEqual(verifyStamp(stampPath), identity);
    stamp({ strictParity: false }); assert.throws(() => verifyStamp(stampPath), /full strict checks/);
    stamp({ stages: ['lint', 'node-tests'] }); assert.throws(() => verifyStamp(stampPath), /full strict checks/);
    stamp({ headSha: 'a'.repeat(40) }); assert.throws(() => verifyStamp(stampPath), /different commit/);
    stamp(); fs.writeFileSync('source.js', 'export const value = 2;\n'); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.writeFileSync('source.js', 'export const value = 1;\n'); assert.deepEqual(verifyStamp(stampPath), identity);
    fs.chmodSync('source.js', 0o755); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.chmodSync('source.js', 0o644); assert.deepEqual(verifyStamp(stampPath), identity);
    fs.writeFileSync('new.js', '// new source'); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.unlinkSync('new.js'); fs.unlinkSync('source.js'); assert.throws(() => verifyStamp(stampPath), /different commit/);
  } finally { process.chdir(previous); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('large tracked path inventories remain fingerprinted beyond the default subprocess buffer', () => {
  const previous = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router-gate-large-tree-'));
  try {
    process.chdir(directory);
    execFileSync('git', ['init', '-q']);
    execFileSync('git', ['config', 'user.name', 'Gate Test']);
    execFileSync('git', ['config', 'user.email', 'gate@example.invalid']);
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { input: '', encoding: 'utf8' }).trim();
    const records = Array.from({ length: 7000 }, (_, index) => `100644 ${blob}\t${String(index).padStart(5, '0')}-${'x'.repeat(160)}.js\n`).join('');
    // Index-only entries exercise real Git output without 7,000 disk files.
    execFileSync('git', ['update-index', '--index-info'], { input: records });
    execFileSync('git', ['commit', '-qm', 'large inventory fixture']);
    const listing = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 2 * 1024 * 1024 });
    assert.ok(listing.length > 1024 * 1024);
    const stampPath = path.join(directory, 'stamp.json');
    const identity = fingerprint(stampPath);
    fs.writeFileSync(stampPath, JSON.stringify({ version: 1, ...identity, checkedAt: new Date().toISOString(), stages: stages.map(([id]) => id), strictParity: true }));
    assert.deepEqual(verifyStamp(stampPath), identity);
    fs.writeFileSync('00000-' + 'x'.repeat(160) + '.js', 'changed content');
    assert.throws(() => verifyStamp(stampPath), /different commit/);
  } finally { process.chdir(previous); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('the full translation stage runs every fixture with bounded test-file concurrency',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'router-gate-concurrency-'));
  try {
    const files=Array.from({length:4},(_,index)=>path.join(directory,`${index}.test.mjs`)),trace=path.join(directory,'trace.jsonl');
    for(const file of files)fs.writeFileSync(file,`import test from 'node:test'; import {appendFileSync} from 'node:fs'; test('bounded worker',async()=>{const record=event=>appendFileSync(${JSON.stringify(trace)},JSON.stringify({event,pid:process.pid})+${JSON.stringify(String.fromCharCode(10))});record('start');await new Promise(resolve=>setTimeout(resolve,100));record('end');});`);
    const command=stages.find(([name])=>name==='translation')[1][0].split(' ');
    assert.equal(command.shift(),'node');assert.equal(command.pop(),'tools/translation/serialization-schema/*.test.mjs');assert.equal(command.pop(),'tools/translation/test/*.test.mjs');
    const environment={...process.env};delete environment.NODE_TEST_CONTEXT;
    execFileSync('node',[...command,...files],{encoding:'utf8',timeout:10000,env:environment});
    const active=new Set();let started=0,peak=0;
    for(const {event,pid} of fs.readFileSync(trace,'utf8').trim().split('\n').map(line=>JSON.parse(line))) {
      if(event==='start'){active.add(pid);started++;peak=Math.max(peak,active.size);}else{assert.ok(active.delete(pid));}
    }
    assert.equal(started,4);assert.equal(active.size,0);assert.ok(peak<=2);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
