import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {captureSyncInputs,syncRouter,synchronizationSteps,runSynchronizationProducer} from '../sync-router.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {parseMeta} from '../../tools/translation/js-to-rust/translator.mjs';
import {evaluate} from '../../tools/translation/js-to-rust/interpreter.mjs';
import {compileNativeTypeScript} from '../../tools/translation/js-to-rust/native-typescript.mjs';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(repository,'js/package.json'));
const compilerPath=require.resolve('typescript/package.json');
const dependencies=path.dirname(path.dirname(compilerPath));
const source='/** @param {number} x @returns {number} */ export function adjust(x) { return x + 1; }\n';
function put(root,name,value){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);}
function fixture(t,{isolated=false}={}) {
  const retained=process.env.ROUTER_SYNC_FIXTURE_DIR;
  const root=fs.mkdtempSync(path.join(isolated?fs.realpathSync(os.tmpdir()):(retained??os.tmpdir()),'router-sync-test-'));
  if(!retained)t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  else if(isolated){
    const copy=path.join(retained,path.basename(root)+'-isolated-retained');
    fs.writeFileSync(path.join(retained,path.basename(root)+'.external-fixture.json'),JSON.stringify({originalRoot:root,retainedCopy:copy,symlinks:'verbatim; dependency contents are not copied'})+'\n',{flag:'wx'});
    t.after(()=>{
      assert.equal(fs.existsSync(copy),false,'retained fixture must be fresh');
      fs.cpSync(root,copy,{recursive:true,dereference:false,verbatimSymlinks:true,errorOnExist:true,force:false});
    });
  }
  put(root,'js/package.json',JSON.stringify({name:'sync-fixture',version:'1.0.0',type:'module'}));
  put(root,'js/portable/policy.mjs',source);
  put(root,'js/src/core.mjs','export function observed() { return 5; }\n');
  put(root,'js/index.js','export const fixture = true;\n');
  put(root,'js/testing.js','export const testing = true;\n');
  put(root,'js/catalog.json','{"operations":[]}\n');
  put(root,'parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'adjust-seven',function:'adjust',args:[7],expected:8}]}));
  put(root,'parity/fixtures/js-first/unsupported.json','[]\n');
  put(root,'src/original.rs','pub fn original() -> bool { true }\n');
  put(root,'src/generated_js_first/manual.rs','pub fn handwritten() -> bool { true }\n');
  fs.symlinkSync(dependencies,path.join(root,'js/node_modules'),'dir');
  execFileSync('git',['init','-q'],{cwd:root});put(root,'.git/info/exclude','node_modules/\n');
  execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['-c','user.name=Sync Fixture','-c','user.email=fixture@example.invalid','commit','-qm','original inputs'],{cwd:root});
  return root;
}
function run(root,name,check=false,extra={}){return syncRouter({root,direction:'javascript-to-rust',check,outputDirectory:path.join(root,name),...extra});}
const originalText=name=>execFileSync('git',['show','HEAD:'+rustPackageSourcePath(repository,name)],{cwd:repository,encoding:'utf8',maxBuffer:16*1024*1024});
function affinityFixture(t) {
  const root=fixture(t),meta=JSON.parse(originalText('tools/translation/serialization-schema/generated/affinity-schema.meta.json'));
  fs.unlinkSync(path.join(root,'js/src/core.mjs'));
  const native=execFileSync('git',['ls-files','-z','--','js/src'],{cwd:repository,encoding:'utf8'}).split('\0').filter(name=>name.endsWith('.mjs'));
  for(const name of native)put(root,name,originalText(name));
  for(const name of ['Cargo.toml','Cargo.lock'])put(root,name,originalText(name));
  const declarations=new Map();
  for(const item of meta.types){if(!declarations.has(item.source))declarations.set(item.source,[]);declarations.get(item.source).push(item);}
  // Keep the seven complete original Rust declarations and their actual module
  // routes. This is a bounded receiving fixture, not the whole crate corpus.
  for(const [name,items]of declarations){const text=originalText(name);put(root,name,'use serde::{Deserialize,Serialize};\n'+items.sort((a,b)=>a.span.start-b.span.start).map(item=>text.slice(item.span.start,item.span.end)).join('\n\n')+'\n');}
  put(root,'src/lib.rs','pub mod providers;\nmod response_affinity;\npub mod subscription;\npub mod generated_js_first;\n');
  put(root,'src/subscription/mod.rs','pub mod types;\npub use types::SubscriptionProvider;\n');
  put(root,'src/generated_js_first/mod.rs','pub mod policy;\n');
  put(root,'src/generated_js_first/policy.rs','pub fn old_projection() -> bool { true }\n');
  execFileSync('git',['add','-A'],{cwd:root});
  execFileSync('git',['-c','user.name=Sync Fixture','-c','user.email=fixture@example.invalid','commit','-qm','original seven-owner receiving schema'],{cwd:root});
  return root;
}

test('actual JavaScript edits synchronize reparsed meta, Rust and executable strict TypeScript without changing original Rust', {timeout:60_000}, async t=>{
  const root=fixture(t),original=fs.readFileSync(path.join(root,'src/original.rs'));
  const first=run(root,'first');assert.equal(first.exitCode,0,JSON.stringify(first));assert.ok(first.records.every(row=>row.status==='passed'));
  const oldRust=fs.readFileSync(path.join(root,'src/generated_js_first/policy.rs'),'utf8');
  const oldMeta=fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/policy.lino'),'utf8');
  assert.equal(evaluate(parseMeta(oldMeta),'adjust',[7]),8);
  assert.equal(compileNativeTypeScript(root,{sourceRoot:root}).compiler,'5.9.3');
  const fresh=run(root,'fresh',true);assert.equal(fresh.exitCode,0);assert.equal(fresh.artifactsCurrent,true);
  put(root,'js/portable/policy.mjs',source.replace('x + 1','x - 1'));
  put(root,'js/src/core.mjs','export function observed() { return 9; }\n');
  put(root,'parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'adjust-seven',function:'adjust',args:[7],expected:6}]}));
  const changed=run(root,'changed');assert.equal(changed.exitCode,0,JSON.stringify(changed));
  const newRust=fs.readFileSync(path.join(root,'src/generated_js_first/policy.rs'),'utf8');
  const newMeta=fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/policy.lino'),'utf8');
  assert.notEqual(newRust,oldRust);assert.notEqual(newMeta,oldMeta);assert.equal(evaluate(parseMeta(newMeta),'adjust',[7]),6);
  assert.deepEqual(fs.readFileSync(path.join(root,'src/original.rs')),original);
  assert.ok(captureSyncInputs(root).files.some(row=>row.path==='src/generated_js_first/manual.rs'));
  for(const name of ['js/index.js','js/testing.js'])assert.ok(captureSyncInputs(root).files.some(row=>row.path===name));
  assert.equal(fs.readFileSync(path.join(root,'src/generated_js_first/manual.rs'),'utf8'),'pub fn handwritten() -> bool { true }\n');
  const ts=require('typescript');const target=fs.readFileSync(path.join(root,'ts/src/core.ts'),'utf8');
  const erased=ts.transpileModule(target,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const observed=await import('data:text/javascript;base64,'+Buffer.from(erased).toString('base64'));assert.equal(observed.observed(),9);
  assert.equal(changed.originalInputsUnchanged,true);assert.equal(changed.wholeSourceSynchronization,false);assert.equal(changed.rustExecuted,false);
});

test('receiving dependency resolution precedes inherited compiler roots during synchronization planning', {timeout:60_000},t=>{
  const root=fixture(t,{isolated:true}),unrelated=path.join(root,'unrelated-compiler');
  const inheritedBefore=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,overrideBefore=process.env.ROUTER_TRANSLATION_TSC;
  const driver=path.join(root,'compiler-root-controls/driver.mjs');
  const script=`import {createRequire} from 'node:module';
const root=process.argv[2],before=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,override=process.env.ROUTER_TRANSLATION_TSC;
let stage='plan';
try {
  const {synchronizationSteps}=await import(${JSON.stringify(pathToFileURL(path.join(repository,'scripts/sync-router.mjs')).href)});
  const steps=synchronizationSteps({root,direction:'javascript-to-rust'});
  stage='compiler-observation';
  const require=createRequire(root+'/js/package.json'),ts=require('typescript');
  console.log(JSON.stringify({ok:true,stage,steps:steps.map(step=>step.id),compiler:ts.version,compilerPath:require.resolve('typescript'),before,after:process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,override,overrideAfter:process.env.ROUTER_TRANSLATION_TSC}));
} catch(error) {
  console.log(JSON.stringify({ok:false,stage,error:{name:error.name,code:error.code,message:error.message,stack:error.stack},before,after:process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,override,overrideAfter:process.env.ROUTER_TRANSLATION_TSC}));
  console.error(error.stack);process.exitCode=1;
}
`;
  put(root,'compiler-root-controls/driver.mjs',script);
  const child=(label,receivingRoot=root)=>{
    const args=[driver,receivingRoot],result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:unrelated},encoding:'utf8',timeout:20_000});
    put(root,`compiler-root-controls/${label}.command.json`,JSON.stringify({command:[process.execPath,...args],source:script,receivingRoot,inheritedRoot:unrelated,typescriptOverride:overrideBefore,exitCode:result.status,signal:result.signal,error:result.error?.message})+'\n');
    put(root,`compiler-root-controls/${label}.stdout.raw.log`,result.stdout??'');
    put(root,`compiler-root-controls/${label}.stderr.raw.log`,result.stderr??'');
    assert.equal(result.error,undefined,JSON.stringify({message:result.error?.message,stdout:result.stdout,stderr:result.stderr}));
    const observation=JSON.parse(result.stdout);
    assert.equal(observation.before,unrelated);assert.equal(observation.after,unrelated);
    assert.equal(observation.override,overrideBefore);assert.equal(observation.overrideAfter,overrideBefore);
    return {result,observation};
  };
  // The explicit root succeeds even when the inherited compiler root is absent.
  const positive=child('explicit-receiving-root');
  assert.equal(positive.result.status,0,positive.result.stderr);assert.equal(positive.observation.compiler,'5.9.3');
  assert.deepEqual(positive.observation.steps,['javascript-meta-rust','javascript-meta-typescript']);
  // A valid unrelated compiler cannot substitute missing receiving dependencies.
  put(unrelated,'js/package.json','{"type":"module"}\n');
  fs.symlinkSync(dependencies,path.join(unrelated,'js/node_modules'),'dir');
  fs.unlinkSync(path.join(root,'js/node_modules'));
  // Retaining a fixture below the repository's node_modules would let ordinary
  // Node resolution find an ancestor compiler after removing the local link.
  const receivingRequire=createRequire(path.join(root,'js/package.json'));
  const candidates=receivingRequire.resolve.paths('typescript');
  assert.ok(Array.isArray(candidates));
  for(const candidate of candidates)assert.equal(fs.existsSync(path.join(candidate,'typescript')),false,'isolated receiving fixture has an ancestor compiler: '+candidate);
  put(root,'compiler-root-controls/missing-receiving-dependencies.search-paths.json',JSON.stringify({root:fs.realpathSync(root),candidates})+'\n');
  const missing=child('missing-receiving-dependencies');
  assert.equal(missing.result.status,1);assert.equal(missing.observation.stage,'plan');
  assert.match(missing.observation.error.message,/typescript/u);
  assert.ok(missing.observation.error.stack.includes(path.join(root,'js/package.json')),missing.observation.error.stack);
  assert.equal(missing.observation.error.code,'MODULE_NOT_FOUND');
  // A package entry that escapes its installed package must be refused BEFORE
  // its body can execute, including a Bun automatic-cache resolution result.
  const marker=path.join(root,'foreign-compiler-executed.txt');
  put(root,'js/node_modules/typescript/package.json','{"name":"typescript","main":"../../foreign-compiler.cjs"}\n');
  put(root,'js/foreign-compiler.cjs','require("node:fs").writeFileSync('+JSON.stringify(marker)+',"executed");module.exports={};\n');
  const escaped=child('escaped-installed-compiler-entry');
  assert.equal(escaped.result.status,1);assert.equal(escaped.observation.stage,'plan');
  assert.equal(escaped.observation.error.code,'MODULE_NOT_FOUND');assert.match(escaped.observation.error.message,/typescript/u);
  assert.equal(fs.existsSync(marker),false,'outside-package compiler must not execute');
  // Absolute directory resolution must not silently ignore a package's exports.
  put(root,'js/node_modules/typescript/package.json','{"name":"typescript","main":"index.cjs","exports":"./index.cjs"}\n');
  put(root,'js/node_modules/typescript/index.cjs','require("node:fs").writeFileSync('+JSON.stringify(marker)+',"executed");module.exports={};\n');
  const exported=child('declared-package-exports');
  assert.equal(exported.result.status,1);assert.equal(exported.observation.stage,'plan');
  assert.match(exported.observation.error.message,/receiving TypeScript package exports/u);
  assert.equal(fs.existsSync(marker),false,'unsupported package exports must not execute');
  fs.rmSync(path.join(root,'js/node_modules'),{recursive:true});
  fs.symlinkSync(dependencies,path.join(root,'js/node_modules'),'dir');
  // The normal ancestor search remains supported; only Bun's unrelated cache
  // fallback lacks an installed package in this receiving search list.
  const nested=path.join(root,'js/nested/receiving');
  put(nested,'js/package.json','{"type":"module"}\n');
  put(nested,'js/src/core.mjs','export function observed() { return 5; }\n');
  const ancestor=child('installed-ancestor-compiler',nested);
  assert.equal(ancestor.result.status,0,ancestor.result.stderr);assert.equal(ancestor.observation.compiler,'5.9.3');
  assert.equal(fs.realpathSync(ancestor.observation.compilerPath),fs.realpathSync(positive.observation.compilerPath));
  put(root,'js/src/core.mjs','export function broken() { const = ; }\n');
  const malformed=child('invalid-receiving-native-syntax');
  assert.equal(malformed.result.status,1);assert.equal(malformed.observation.stage,'plan');
  assert.equal(malformed.observation.error.message,'invalid module ownership syntax');
  assert.equal(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,inheritedBefore);
  assert.equal(process.env.ROUTER_TRANSLATION_TSC,overrideBefore);
});

test('freshness rejects an edited Rust projection and retains the complete failed child output without running dependent producers', {timeout:60_000},t=>{
  const root=fixture(t);assert.equal(run(root,'initial').exitCode,0);
  put(root,'src/generated_js_first/policy.rs','stale generated Rust\n');
  const result=run(root,'drift',true);assert.equal(result.exitCode,1);assert.equal(result.artifactsCurrent,false);
  assert.equal(result.records[0].status,'failed');assert.equal(result.records[1].status,'unrun-prerequisite-failure');
  assert.equal(result.originalInputsUnchanged,true);assert.ok(result.records[0].logs.every(row=>fs.statSync(path.join(result.directory,row.path)).size===row.bytes));
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.directory,'receipt.json'))).fullGatePass,false);
});

test('real native and public source mutations between capture and producer execution are rejected before any projection is written',t=>{
 for(const name of ['js/src/core.mjs','js/index.js','js/testing.js','js/schemas/new.json']){
  const root=fixture(t);
  const result=run(root,'mutation',false,{onProgress:record=>{if(record.state==='start')put(root,name,name.endsWith('.json')?'{}\n':'export const changed = true;\n');}});
  assert.equal(result.exitCode,1);assert.equal(result.originalInputsUnchanged,false);
  assert.equal(result.records[0].status,'failed');assert.match(result.records[0].error,/before producer/);
  assert.equal(result.records[1].status,'unrun-prerequisite-failure');assert.equal(fs.existsSync(path.join(root,'src/generated_js_first/policy.rs')),false);
 }
});

test('original sparse Git bytes remain visible and linked native source cannot substitute an outside file',t=>{
  const root=fixture(t);fs.unlinkSync(path.join(root,'src/original.rs'));
  const captured=captureSyncInputs(root),row=captured.files.find(row=>row.path==='src/original.rs');assert.ok(row.bytes>0);assert.equal(row.storage,'original-HEAD-sparse-fallback');
  const target=path.join(root,'js/src/core.mjs');fs.unlinkSync(target);fs.symlinkSync(path.join(root,'js/portable/policy.mjs'),target);
  assert.throws(()=>captureSyncInputs(root),/Linked original/);
  fs.unlinkSync(target);fs.symlinkSync(path.join(root,'absent-source.mjs'),target);
  assert.throws(()=>captureSyncInputs(root),/Linked original/);
  fs.unlinkSync(target);fs.rmSync(path.join(root,'js/src'),{recursive:true});put(root,'js/src','blocked ancestor\n');
  assert.throws(()=>captureSyncInputs(root),/ancestor must be a directory/);
});

test('the command requires an explicit mode and existing complete receipts cannot be overwritten',t=>{
  const root=fixture(t),script=path.join(repository,'scripts/sync-router.mjs');
  const result=spawnSync(process.execPath,[script,'--root',root],{encoding:'utf8',timeout:10_000});assert.equal(result.status,1);assert.match(result.stderr,/explicit --check or --write/);
  const output=path.join(root,'preserved');fs.mkdirSync(output);put(root,'preserved/receipt.json','original receipt\n');
  assert.throws(()=>run(root,'preserved'),/already exists/);assert.equal(fs.readFileSync(path.join(output,'receipt.json'),'utf8'),'original receipt\n');
});

test('the real producer runner retains complete stdout and stderr beyond the old in-memory buffer', {timeout:60_000},t=>{
  const root=fixture(t),output=path.join(root,'large-logs');fs.mkdirSync(output);
  const stdoutBytes=9*1024*1024+17,stderrBytes=9*1024*1024+31;
  const step={id:'complete-log-regression',timeoutMs:30_000,args:['--eval',`process.stdout.write('O'.repeat(${stdoutBytes}));process.stderr.write('E'.repeat(${stderrBytes}));`]};
  const record=runSynchronizationProducer({root,step,outputDirectory:output});
  assert.equal(record.status,'passed',JSON.stringify(record));assert.equal(record.exitCode,0);assert.equal(record.timeoutMs,30_000);
  assert.deepEqual(record.command,[process.execPath,...step.args]);assert.equal(record.logs.length,2);
  for(const [index,length,byte]of [[0,stdoutBytes,79],[1,stderrBytes,69]]) {
    const expected=Buffer.alloc(length,byte),actual=fs.readFileSync(path.join(output,record.logs[index].path));
    assert.deepEqual(actual,expected);assert.equal(record.logs[index].bytes,length);
    assert.equal(record.logs[index].sha256,createHash('sha256').update(expected).digest('hex'));
  }
});

test('producer failures keep both raw streams and existing logs are never replaced', {timeout:60_000},t=>{
  const root=fixture(t),output=path.join(root,'failed-logs');fs.mkdirSync(output);
  const step={id:'actual-child-failure',timeoutMs:10_000,args:['--eval','process.stdout.write("before failure\\n");process.stderr.write("complete diagnostic\\n");process.exitCode=7;']};
  const record=runSynchronizationProducer({root,step,outputDirectory:output});
  assert.equal(record.status,'failed');assert.equal(record.exitCode,7);assert.equal(record.error,null);
  assert.equal(fs.readFileSync(path.join(output,record.logs[0].path),'utf8'),'before failure\n');
  assert.equal(fs.readFileSync(path.join(output,record.logs[1].path),'utf8'),'complete diagnostic\n');
  const repeated=runSynchronizationProducer({root,step,outputDirectory:output});
  assert.equal(repeated.status,'failed');assert.match(repeated.error,/EEXIST/);assert.deepEqual(repeated.logs,[]);
  assert.equal(fs.readFileSync(path.join(output,record.logs[0].path),'utf8'),'before failure\n');
  const missing=runSynchronizationProducer({root:path.join(root,'missing-working-directory'),step,outputDirectory:output,index:1});
  assert.equal(missing.status,'failed');assert.match(missing.error,/ENOENT/);assert.deepEqual(missing.logs.map(row=>row.bytes),[0,0]);
});

test('producer dependency order preserves full reverse passes and makes affinity freshness a real prerequisite',t=>{
  const root=fixture(t),ids=options=>synchronizationSteps({root,...options}).map(step=>step.id);
  assert.deepEqual(ids({direction:'javascript-to-rust'}),['javascript-meta-rust','javascript-meta-typescript']);
  assert.deepEqual(ids({direction:'both'}),['javascript-meta-rust-preparation','original-affinity-schema','javascript-meta-rust','javascript-meta-typescript','rust-meta-javascript-typescript','rust-platform-matrix','original-serialization-registry']);
  assert.deepEqual(ids({direction:'rust-to-javascript',profiles:false}),['original-affinity-schema','rust-meta-javascript-typescript','original-serialization-registry']);
  for(const check of [false,true]){
    const selected=synchronizationSteps({root,direction:'rust-to-javascript',check}),canonical=selected.find(step=>step.id==='rust-meta-javascript-typescript'),matrix=selected.find(step=>step.id==='rust-platform-matrix');
    assert.deepEqual(canonical.args,[path.join(repository,'scripts/translate-router-flat-native-owned-field-meta.mjs'),'--retain-output-text','--root',root,'--progress',...(check?['--check']:[])]);
    assert.deepEqual(matrix.args,[...canonical.args,'--profile-matrix']);
  }
  for(const scenario of ['descriptor-only','source-only','import-only']) {
    const receiving=fixture(t);
    if(scenario==='descriptor-only')put(receiving,'js/src/affinity-schema-descriptor.mjs','export const affinitySchema = {};\n');
    if(scenario==='source-only')put(receiving,'js/src/affinity-schema.mjs','export {affinitySchema} from "./affinity-schema-descriptor.mjs";\n');
    if(scenario==='import-only')put(receiving,'js/src/core.mjs','import {affinitySchema} from "./affinity-schema-descriptor.mjs";export const observed = affinitySchema;\n');
    const steps=synchronizationSteps({root:receiving,direction:'javascript-to-rust',check:false});
    assert.deepEqual(steps.map(step=>step.id),['javascript-meta-rust-preparation','original-affinity-schema','javascript-meta-rust','javascript-meta-typescript'],scenario);
    assert.equal(steps[1].args.at(-1),'true','partial direction must check the schema, never repair it');
    const output=path.join(receiving,'missing-affinity-input');fs.mkdirSync(output);
    const result=runSynchronizationProducer({root:receiving,step:steps[1],outputDirectory:output});
    assert.equal(result.status,'failed',scenario);assert.equal(result.exitCode,1,scenario);
    const diagnostic=fs.readFileSync(path.join(output,result.logs[1].path),'utf8');
    assert.match(diagnostic,/affinity-schema(?:-descriptor)?\.mjs|Native schema interpreter differs|Native schema generated artifact/);
    assert.equal(fs.existsSync(path.join(receiving,'tools/translation/serialization-schema/generated/affinity-schema.meta.json')),false);
  }
  const checked=synchronizationSteps({root,direction:'both',check:true});
  for(const step of checked.filter(step=>['javascript-meta-rust-preparation','original-affinity-schema','javascript-meta-rust'].includes(step.id)))assert.equal(step.args.at(-1),'true');
});

test('owned descriptor links and oversized native sources refuse before producer or planner reads', {timeout:60_000},t=>{
  const root=fixture(t),descriptor=path.join(root,'js/src/affinity-schema-descriptor.mjs');
  for(const target of ['core.mjs','absent.mjs']) {
    fs.symlinkSync(path.join(root,'js/src',target),descriptor);
    assert.throws(()=>captureSyncInputs(root),/Linked original/);
    assert.throws(()=>synchronizationSteps({root,direction:'javascript-to-rust'}),/Linked original/);
    const output=path.join(root,target+'-blocked');fs.mkdirSync(output);
    const blocked=runSynchronizationProducer({root,step:{id:'must-not-execute',timeoutMs:1000,args:['--eval','throw Error("child unexpectedly executed")']},outputDirectory:output});
    assert.equal(blocked.status,'failed');assert.match(blocked.error,/Linked original/);assert.deepEqual(blocked.logs,[]);
    fs.unlinkSync(descriptor);
  }
  const oversized=path.join(root,'js/src/oversized.mjs');fs.writeFileSync(oversized,'');fs.truncateSync(oversized,32*1024*1024+1);
  assert.throws(()=>synchronizationSteps({root,direction:'javascript-to-rust'}),/bounded capture/);
  assert.throws(()=>captureSyncInputs(root),/bounded capture/);fs.unlinkSync(oversized);
  const native=path.join(root,'js/src'),original=path.join(root,'native-original');fs.renameSync(native,original);fs.symlinkSync(original,native,'dir');
  assert.throws(()=>captureSyncInputs(root),/Linked original/);
  assert.throws(()=>synchronizationSteps({root,direction:'javascript-to-rust'}),/Linked original/);
});

test('owned descriptor canonicalization after genuine Rust provenance change leaves final selected producers fresh', {timeout:60_000},async t=>{
  const root=affinityFixture(t),descriptor='js/src/affinity-schema-descriptor.mjs';
  const originalDescriptor=fs.readFileSync(path.join(root,descriptor),'utf8');
  put(root,descriptor,originalDescriptor+'\n// stale generated formatting retained as the regression input\n');
  const rustPath='src/response_affinity.rs',rustOriginal=fs.readFileSync(path.join(root,rustPath),'utf8');
  put(root,rustPath,'// A genuine supported source provenance change.\n'+rustOriginal);
  put(root,'js/portable/policy.mjs',source.replace('x + 1','x - 1'));
  put(root,'parity/fixtures/js-first/policy.json',JSON.stringify({cases:[
    {id:'adjust-seven',function:'adjust',args:[7],expected:6},
    {id:'adjust-nan',function:'adjust',args:[{$number:'NaN'}],expected:{$number:'NaN'}},
    {id:'adjust-infinity',function:'adjust',args:[{$number:'Infinity'}],expected:{$number:'Infinity'}},
    {id:'adjust-negative-zero-input',function:'adjust',args:[{$number:'-0'}],expected:-1},
  ]}));
  const output=path.join(root,'schema-synchronization');fs.mkdirSync(output);
  const before=captureSyncInputs(root),steps=synchronizationSteps({root,direction:'both'});let preparedRust;
  assert.equal(before.files.some(row=>row.path===descriptor),false);
  assert.equal(before.files.some(row=>row.path==='js/src/affinity-schema.mjs'),true);
  for(const [index,step]of steps.slice(0,4).entries()) {
    const record=runSynchronizationProducer({root,step,outputDirectory:output,index});
    assert.equal(record.status,'passed',JSON.stringify(record));assert.deepEqual(captureSyncInputs(root),before);
    const policy=fs.readFileSync(path.join(root,'src/generated_js_first/policy.rs'));
    const module=fs.readFileSync(path.join(root,'src/generated_js_first/mod.rs'));
    if(index===0)preparedRust=[policy,module];
    else {assert.deepEqual(policy,preparedRust[0]);assert.deepEqual(module,preparedRust[1]);}
  }
  assert.equal(fs.readFileSync(path.join(root,descriptor),'utf8'),originalDescriptor);
  const meta=fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/policy.lino'),'utf8');
  const program=parseMeta(meta);assert.equal(evaluate(program,'adjust',[7]),6);assert.ok(Number.isNaN(evaluate(program,'adjust',[NaN])));
  assert.equal(evaluate(program,'adjust',[Infinity]),Infinity);assert.equal(evaluate(program,'adjust',[-0]),-1);
  const projectedRust=preparedRust[0].toString();assert.match(projectedRust,/fn adjust_nan\(\)/);assert.match(projectedRust,/fn adjust_infinity\(\)/);assert.match(projectedRust,/-0\.0_f64/);
  for(const [index,step]of synchronizationSteps({root,direction:'javascript-to-rust',check:true}).entries()) {
    const record=runSynchronizationProducer({root,step,outputDirectory:output,index:index+4});assert.equal(record.status,'passed',JSON.stringify(record));
  }
  const ts=require('typescript');assert.equal(ts.version,'5.9.3');
  const typed=path.join(root,'tools/translation/serialization-schema/generated/affinity-schema-descriptor.ts');
  const compiled=spawnSync(process.execPath,[require.resolve('typescript/lib/tsc.js'),'--strict','--noEmit','--target','ES2022','--module','ESNext','--skipLibCheck',typed,path.join(root,'ts/src/js-first-policy.ts')],{cwd:root,encoding:'utf8',timeout:20_000,maxBuffer:1024*1024});
  assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
  const js=await import('data:text/javascript;base64,'+Buffer.from(originalDescriptor).toString('base64'));
  const erased=ts.transpileModule(fs.readFileSync(typed,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const emitted=await import('data:text/javascript;base64,'+Buffer.from(erased).toString('base64'));
  assert.deepEqual(emitted.affinitySchema,js.affinitySchema);
  const neighbor='js/src/affinity-schema-descriptor-neighbor.mjs';put(root,neighbor,'export const handwritten = 1;\n');
  const protectedBefore=captureSyncInputs(root);put(root,neighbor,'export const handwritten = 2;\n');assert.notDeepEqual(captureSyncInputs(root),protectedBefore);
  const policyPath=path.join(root,'src/generated_js_first/policy.rs');fs.writeFileSync(policyPath,'stale projection retained by check mode\n');
  const prepass=synchronizationSteps({root,direction:'both',check:true})[0];
  const stale=runSynchronizationProducer({root,step:prepass,outputDirectory:output,index:8});assert.equal(stale.status,'failed');
  assert.equal(fs.readFileSync(policyPath,'utf8'),'stale projection retained by check mode\n');fs.writeFileSync(policyPath,preparedRust[0]);
  put(root,rustPath,('// A genuine supported source provenance change.\n'+rustOriginal).replace('principal_id: String','principal_id: bool'));
  const refusal=runSynchronizationProducer({root,step:steps[1],outputDirectory:output,index:9});assert.equal(refusal.status,'failed');
  assert.match(fs.readFileSync(path.join(output,refusal.logs[1].path),'utf8'),/differs from the actual existing manual projection/);
  assert.equal(fs.readFileSync(path.join(root,descriptor),'utf8'),originalDescriptor,'changed layouts still refuse before replacing the baseline');
});


test('actual owned witness projections stay generated while authored Rust and neighboring files remain protected', {timeout:60_000},t=>{
  const root=fixture(t),witness='tools/translation/js-to-rust/generated/owned-core-witness.rs',oracle='tests/translation_core_reverse_owned_oracle.rs';
  const neighbor='tools/translation/js-to-rust/generated/owned-core-witness-manual.rs';
  for(const name of ['src/translation_core.rs','src/translation_core/primitives.rs','Cargo.toml','Cargo.lock',oracle])put(root,name,originalText(name));
  put(root,'src/lib.rs','pub mod translation_core;\n');put(root,neighbor,'pub fn handwritten_neighbor() -> bool { true }\n');
  const before=captureSyncInputs(root);
  for(const name of [oracle,neighbor,'src/original.rs','src/generated_js_first/manual.rs','src/translation_core.rs','src/translation_core/primitives.rs'])assert.ok(before.files.some(row=>row.path===name),name);
  const written=run(root,'owned-witness-write');assert.equal(written.exitCode,0,JSON.stringify(written));assert.equal(written.originalInputsUnchanged,true);assert.deepEqual(captureSyncInputs(root),before);
  const emitted=fs.readFileSync(path.join(root,witness),'utf8');assert.ok(emitted.startsWith('// GENERATED: actual checked reverse owned-core receiving witness.\n'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'parity/js-first-translation.json'),'utf8')),registered=manifest.outputs.find(row=>row.path===witness);
  assert.equal(registered.bytes,Buffer.byteLength(emitted));assert.equal(registered.sha256,createHash('sha256').update(emitted).digest('hex'));
  const inputs=JSON.parse(fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/owned-core-witness-inputs.json'),'utf8'));
  assert.equal(inputs.oracle.path,oracle);assert.equal(inputs.oracle.source,originalText(oracle));assert.equal(inputs.applicationItems,0);assert.equal(inputs.sourceRecipe.wholeUndo,true);
  assert.equal(before.files.some(row=>row.path===witness),false);assert.equal(captureSyncInputs(root).files.some(row=>row.path===witness),false);
  put(root,witness,emitted+'// deliberate generated-artifact drift\n');assert.deepEqual(captureSyncInputs(root),before);
  const stale=run(root,'owned-witness-drift',true);assert.equal(stale.exitCode,1);assert.equal(stale.artifactsCurrent,false);assert.equal(stale.originalInputsUnchanged,true);
  assert.equal(stale.records[0].status,'failed');assert.equal(stale.records[1].status,'unrun-prerequisite-failure');assert.ok(stale.records[0].logs.every(row=>fs.statSync(path.join(stale.directory,row.path)).size===row.bytes));
  assert.equal(fs.readFileSync(path.join(root,witness),'utf8'),emitted+'// deliberate generated-artifact drift\n');
  for(const name of [oracle,neighbor]){const original=fs.readFileSync(path.join(root,name),'utf8');put(root,name,original+'// actual authored Rust mutation\n');assert.notDeepEqual(captureSyncInputs(root),before);put(root,name,original);assert.deepEqual(captureSyncInputs(root),before);}
});

test('actual base64 witness synchronization and retirement preserve original Rust and neighbors', {timeout:60_000},t=>{
  const root=fixture(t),witness='tools/translation/js-to-rust/generated/owned-base64-witness.rs',oracle='tests/translation_core_base64_reverse_oracle.rs';
  const neighbor='tools/translation/js-to-rust/generated/owned-base64-witness-manual.rs';
  for(const name of ['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/base64.rs','Cargo.toml','Cargo.lock',oracle])put(root,name,originalText(name));
  put(root,'src/lib.rs','pub mod translation_core;\n');put(root,neighbor,'pub fn handwritten_neighbor() -> bool { true }\n');
  const before=captureSyncInputs(root);
  for(const name of [oracle,neighbor,'src/original.rs','src/generated_js_first/manual.rs','src/translation_core.rs','src/translation_core/primitives.rs'])assert.ok(before.files.some(row=>row.path===name),name);
  const written=run(root,'base64-witness-write');assert.equal(written.exitCode,0,JSON.stringify(written));assert.equal(written.originalInputsUnchanged,true);assert.deepEqual(captureSyncInputs(root),before);
  const emitted=fs.readFileSync(path.join(root,witness),'utf8');assert.ok(emitted.startsWith('// GENERATED: actual checked reverse base64 receiving witness.\n'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'parity/js-first-translation.json'),'utf8')),registered=manifest.outputs.find(row=>row.path===witness);
  assert.equal(registered.bytes,Buffer.byteLength(emitted));assert.equal(registered.sha256,createHash('sha256').update(emitted).digest('hex'));
  const inputs=JSON.parse(fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/owned-base64-witness-inputs.json'),'utf8'));
  assert.equal(inputs.oracle.path,oracle);assert.equal(inputs.oracle.source,originalText(oracle));assert.equal(inputs.applicationItems,0);assert.equal(inputs.sourceRecipe.wholeUndo,true);
  assert.equal(before.files.some(row=>row.path===witness),false);assert.equal(captureSyncInputs(root).files.some(row=>row.path===witness),false);
  put(root,witness,emitted+'// deliberate generated-artifact drift\n');assert.deepEqual(captureSyncInputs(root),before);
  const stale=run(root,'base64-witness-drift',true);assert.equal(stale.exitCode,1);assert.equal(stale.artifactsCurrent,false);assert.equal(stale.originalInputsUnchanged,true);
  assert.equal(stale.records[0].status,'failed');assert.equal(stale.records[1].status,'unrun-prerequisite-failure');assert.ok(stale.records[0].logs.every(row=>fs.statSync(path.join(stale.directory,row.path)).size===row.bytes));
  assert.equal(fs.readFileSync(path.join(root,witness),'utf8'),emitted+'// deliberate generated-artifact drift\n');
  for(const name of [oracle,neighbor]){const original=fs.readFileSync(path.join(root,name),'utf8');put(root,name,original+'// actual authored Rust mutation\n');assert.notDeepEqual(captureSyncInputs(root),before);put(root,name,original);assert.deepEqual(captureSyncInputs(root),before);}
  assert.equal(inputs.schema,'owned-base64-reverse-ci-witness-v1');
  assert.equal(inputs.witnessTypeScript.path,witness.slice(0,-3)+'/witness.mts');assert.equal(inputs.witnessTypeScript.source,fs.readFileSync(path.join(root,inputs.witnessTypeScript.path),'utf8'));
  put(root,witness,emitted);fs.unlinkSync(path.join(root,oracle));
  const afterRemoval=captureSyncInputs(root),prefix=witness.slice(0,-3);
  const obsolete=run(root,'base64-witness-obsolete-check',true);assert.equal(obsolete.exitCode,1);assert.equal(obsolete.originalInputsUnchanged,true);assert.equal(fs.readFileSync(path.join(root,witness),'utf8'),emitted);
  const typed=prefix+'/witness.mts',typedOriginal=fs.readFileSync(path.join(root,typed),'utf8');put(root,typed,typedOriginal+'// authored typed edit\n');
  const typedRefusal=run(root,'base64-witness-edited-typed-check',true);assert.equal(typedRefusal.exitCode,1);assert.equal(fs.readFileSync(path.join(root,typed),'utf8'),typedOriginal+'// authored typed edit\n');put(root,typed,typedOriginal);
  const unknown=prefix+'/manual.mjs';put(root,unknown,'export const authored = true;\n');
  const refusal=run(root,'base64-witness-unknown-check',true);assert.equal(refusal.exitCode,1);assert.equal(fs.readFileSync(path.join(root,unknown),'utf8'),'export const authored = true;\n');
  fs.unlinkSync(path.join(root,unknown));
  const removed=run(root,'base64-witness-retire-write');assert.equal(removed.exitCode,0,JSON.stringify(removed));assert.equal(removed.originalInputsUnchanged,true);assert.deepEqual(captureSyncInputs(root),afterRemoval);
  for(const name of [witness,prefix+'.lino',prefix+'-inputs.json',prefix+'/witness.mjs',prefix+'/witness.mts'])assert.equal(fs.existsSync(path.join(root,name)),false,name);
  assert.equal(fs.readFileSync(path.join(root,neighbor),'utf8'),'pub fn handwritten_neighbor() -> bool { true }\n');
});

test('actual ASCII and scalar witness synchronization preserves authored Rust and neighboring sources', {timeout:60_000},t=>{
  const root=fixture(t),witness='tools/translation/js-to-rust/generated/owned-ascii-witness.rs',oracle='tests/translation_core_ascii_reverse_oracle.rs';
  const neighbor='tools/translation/js-to-rust/generated/owned-ascii-witness-manual.rs';
  for(const name of ['src/translation_core.rs','src/translation_core/primitives.rs','Cargo.toml','Cargo.lock',oracle])put(root,name,originalText(name));
  put(root,'src/lib.rs','pub mod translation_core;\n');put(root,neighbor,'pub fn handwritten_neighbor() -> bool { true }\n');
  const before=captureSyncInputs(root);
  for(const name of [oracle,neighbor,'src/original.rs','src/generated_js_first/manual.rs','src/translation_core.rs','src/translation_core/primitives.rs'])assert.ok(before.files.some(row=>row.path===name),name);
  const written=run(root,'ascii-scalar-witness-write');assert.equal(written.exitCode,0,JSON.stringify(written));assert.equal(written.originalInputsUnchanged,true);assert.deepEqual(captureSyncInputs(root),before);
  const emitted=fs.readFileSync(path.join(root,witness),'utf8');assert.ok(emitted.startsWith('// GENERATED: actual checked reverse ASCII receiving witness.\n'));
  assert.deepEqual(sourceItems(emitted).filter(item=>item.term==='fn').map(item=>item.name),['__ro_domain','__ro_copy','__ro_with_field','accepted','hexadecimal','lazy','guard','scalar_length','scalar_limit','selected_count']);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'parity/js-first-translation.json'),'utf8')),registered=manifest.outputs.find(row=>row.path===witness);
  assert.equal(registered.bytes,Buffer.byteLength(emitted));assert.equal(registered.sha256,createHash('sha256').update(emitted).digest('hex'));
  const inputs=JSON.parse(fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/owned-ascii-witness-inputs.json'),'utf8'));
  assert.equal(inputs.schema,'owned-ascii-reverse-ci-witness-v1');assert.equal(inputs.oracle.path,oracle);assert.equal(inputs.oracle.source,originalText(oracle));assert.equal(inputs.applicationItems,0);assert.equal(inputs.sourceRecipe.wholeUndo,true);
  assert.equal(before.files.some(row=>row.path===witness),false);assert.equal(captureSyncInputs(root).files.some(row=>row.path===witness),false);
  put(root,witness,emitted+'// deliberate generated-artifact drift\n');assert.deepEqual(captureSyncInputs(root),before);
  const stale=run(root,'ascii-scalar-witness-drift',true);assert.equal(stale.exitCode,1);assert.equal(stale.artifactsCurrent,false);assert.equal(stale.originalInputsUnchanged,true);
  assert.equal(stale.records[0].status,'failed');assert.equal(stale.records[1].status,'unrun-prerequisite-failure');assert.equal(fs.readFileSync(path.join(root,witness),'utf8'),emitted+'// deliberate generated-artifact drift\n');
  for(const name of [oracle,neighbor]){const original=fs.readFileSync(path.join(root,name),'utf8');put(root,name,original+'// authored Rust mutation\n');assert.notDeepEqual(captureSyncInputs(root),before);put(root,name,original);assert.deepEqual(captureSyncInputs(root),before);}
});
