import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fingerprint, verifyStamp, stages } from '../check-js-first-local.mjs';
import {reviewTranslationDraft} from '../review-translation-draft.mjs';
import {createHash} from 'node:crypto';

function draftFixture() {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'router-draft-review-'));
  const original='pub fn label()->&\'static str{"Ω"}\n',sha=value=>createHash('sha256').update(value).digest('hex');
  const targets={meta:'tools/translation/meta/src/lib.meta.json',javascript:'packages/javascript/generated/rust-draft/src/lib.mjs',typescript:'packages/typescript/generated/rust-draft/src/lib.ts'};
  const compiler='tools/translation/review-fixture.mjs';
  const put=(name,value)=>{fs.mkdirSync(path.dirname(path.join(directory,name)),{recursive:true});fs.writeFileSync(path.join(directory,name),value);};
  put('src/lib.rs',original);put('Cargo.toml','[package]\nname="review_fixture"\nversion="0.1.0"\n');put(compiler,'// original compiler fixture\n');
  put(targets.javascript,'export const draftOnly=true;\n');put(targets.typescript,'export const draftOnly=true;\n');
  function write(status='executable') {
    const counts={executable:status==='executable'?1:0,executableFunctions:status==='executable'?1:0,executableConstants:0,executableTypes:0,executableConstructors:0,carried:status==='carried'?1:0,preserved:0};
    const meta={sourcePath:'src/lib.rs',sourceBytes:Buffer.byteLength(original),sourceSha256:sha(original),counts,items:[{term:'fn',name:'label',source:original,sha256:sha(original),span:{start:0,end:original.length},status,diagnostic:null}]};
    const projectTargets={meta:'tools/translation/projects/src/lib.meta.json',javascript:'packages/javascript/generated/rust-project/src/lib.mjs',typescript:'packages/typescript/generated/rust-project/src/lib.ts'};
    const entry={source:'src/lib.rs',name:'label',term:'fn',span:{start:0,end:original.length}};
    const project={sources:[{source:'src/lib.rs',sha256:sha(original),module:[]}],refused:status==='carried'?[{kind:'unsupported',message:'fixture body'}]:[],unloweredItems:[],checkedMethods:[],executable:status==='executable'?[entry]:[],moduleDiagnostics:[]};
    put(projectTargets.meta,JSON.stringify(project));put(projectTargets.javascript,'export const draftOnly=true;\n');put(projectTargets.typescript,'export const draftOnly=true;\n');
    const inventory={sources:[{source:'src/lib.rs',bytes:Buffer.byteLength(original),sha256:sha(original),...counts,targets}],projects:[{entry:'src/lib.rs',sources:1,refused:project.refused.length,unloweredItems:0,checkedMethods:0,moduleDiagnostics:0,executableFunctions:project.executable.length,executableConstants:0,targets:projectTargets}],implementationHashes:{[compiler]:sha('// original compiler fixture\n')},totals:{sources:1,...counts},functionCoverage:{runtimeParity:false}};
    put(targets.meta,JSON.stringify(meta));put('parity/rust-source-inventory.json',JSON.stringify(inventory));return {meta,inventory};
  }
  write('carried');
  const git=(...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8'}).trim();
  git('init','-q');git('config','user.name','Draft Review Test');git('config','user.email','review@example.invalid');git('add','.');git('commit','-qm','original fixture');
  const baselineSha=git('rev-parse','HEAD');write();
  return {directory,baselineSha,original,targets,compiler,put,write,review:()=>reviewTranslationDraft({root:directory,baselineSha}),dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
}

test('complete corpus review compares unchanged original items and hashes every target without granting parity',()=>{
  const fixture=draftFixture();
  try {
    const result=fixture.review();
    assert.equal(result.originalRustInputs.length,1);assert.equal(result.originalCargoInputs.length,1);assert.equal(result.outputs.length,7);
    assert.equal(result.comparison.totalChanges.executable,1);assert.equal(result.comparison.totalChanges.carried,-1);
    assert.equal(result.comparison.newlyExecutableItems[0].name,'label');assert.equal(result.comparison.newlyExecutableItems[0].previousStatus,'carried');assert.deepEqual(result.comparison.lostExecutableItems,[]);
    assert.equal(result.projects[0].comparison.countChanges.refused,-1);assert.equal(result.projects[0].comparison.newlyExecutableItems[0].name,'label');assert.deepEqual(result.projects[0].comparison.lostCheckedMethods,[]);
    for(const key of ['semanticAuthority','runtimeParity','fullGatePass','rustExecuted'])assert.equal(result[key],false,key);
    assert.deepEqual(result,fixture.review());
  } finally {fixture.dispose();}
});

test('corpus review refuses source/compiler drift and forged item/count evidence',()=>{
  const fixture=draftFixture();
  try {
    fixture.put('src/lib.rs',fixture.original+'// changed\n');assert.throws(fixture.review,/Stale original Rust/);fixture.put('src/lib.rs',fixture.original);
    fixture.put(fixture.compiler,'// changed compiler\n');assert.throws(fixture.review,/Stale compiler input/);fixture.put(fixture.compiler,'// original compiler fixture\n');
    const {meta,inventory}=fixture.write();meta.items[0].source='forged';fixture.put(fixture.targets.meta,JSON.stringify(meta));assert.throws(fixture.review,/Original item integrity/);
    fixture.write();inventory.totals.executable=2;fixture.put('parity/rust-source-inventory.json',JSON.stringify(inventory));assert.throws(fixture.review,/Invalid complete inventory total/);
    const previous=fixture.write('carried').inventory;previous.totals.carried=99;fixture.put('parity/rust-source-inventory.json',JSON.stringify(previous));
    execFileSync('git',['add','.'],{cwd:fixture.directory});execFileSync('git',['commit','-qm','forged baseline counter'],{cwd:fixture.directory});
    const baselineSha=execFileSync('git',['rev-parse','HEAD'],{cwd:fixture.directory,encoding:'utf8'}).trim();fixture.write();
    assert.throws(()=>reviewTranslationDraft({root:fixture.directory,baselineSha}),/Invalid baseline inventory total/);
  } finally {fixture.dispose();}
});

test('corpus review requires complete Rust discovery and bounded ordinary output paths',()=>{
  const fixture=draftFixture();
  try {
    fixture.put('extra.rs','fn extra(){}\n');execFileSync('git',['add','extra.rs'],{cwd:fixture.directory});assert.throws(fixture.review,/every tracked Rust source/);
    execFileSync('git',['rm','-f','extra.rs'],{cwd:fixture.directory});
    const {inventory}=fixture.write();inventory.sources[0].targets.javascript='../outside.mjs';fixture.put('parity/rust-source-inventory.json',JSON.stringify(inventory));assert.throws(fixture.review,/outside generated roots/);
    fixture.write();const alias=path.join(fixture.directory,'packages/javascript/generated/rust-draft/linked.mjs');fs.symlinkSync(path.join(fixture.directory,'src/lib.rs'),alias);assert.throws(fixture.review,/linked inputs/);fs.unlinkSync(alias);
    fs.unlinkSync(path.join(fixture.directory,fixture.targets.meta));assert.throws(fixture.review,/ENOENT/);
    assert.throws(()=>reviewTranslationDraft({root:fixture.directory,baselineSha:'main'}),/immutable full Git SHA/);
    assert.throws(()=>reviewTranslationDraft({root:fixture.directory,inventoryPath:'../inventory.json'}),/bounded relative paths/);
  } finally {fixture.dispose();}
});
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
