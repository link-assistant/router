import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {captureSyncInputs,syncRouter} from '../sync-router.mjs';
import {parseMeta} from '../../tools/translation/js-to-rust/translator.mjs';
import {evaluate} from '../../tools/translation/js-to-rust/interpreter.mjs';
import {compileNativeTypeScript} from '../../tools/translation/js-to-rust/native-typescript.mjs';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(repository,'packages/javascript/package.json'));
const compilerPath=require.resolve('typescript/package.json');
const dependencies=path.dirname(path.dirname(compilerPath));
const source='/** @param {number} x @returns {number} */ export function adjust(x) { return x + 1; }\n';
function put(root,name,value){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);}
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'router-sync-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  put(root,'packages/javascript/package.json',JSON.stringify({name:'sync-fixture',version:'1.0.0',type:'module'}));
  put(root,'packages/javascript/portable/policy.mjs',source);
  put(root,'packages/javascript/native/core.mjs','export function observed() { return 5; }\n');
  put(root,'packages/javascript/index.js','export const fixture = true;\n');
  put(root,'packages/javascript/testing.js','export const testing = true;\n');
  put(root,'packages/javascript/catalog.json','{"operations":[]}\n');
  put(root,'parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'adjust-seven',function:'adjust',args:[7],expected:8}]}));
  put(root,'parity/fixtures/js-first/unsupported.json','[]\n');
  put(root,'src/original.rs','pub fn original() -> bool { true }\n');
  put(root,'src/generated_js_first/manual.rs','pub fn handwritten() -> bool { true }\n');
  fs.symlinkSync(dependencies,path.join(root,'packages/javascript/node_modules'),'dir');
  execFileSync('git',['init','-q'],{cwd:root});put(root,'.git/info/exclude','node_modules/\n');
  execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['-c','user.name=Sync Fixture','-c','user.email=fixture@example.invalid','commit','-qm','original inputs'],{cwd:root});
  return root;
}
function run(root,name,check=false,extra={}){return syncRouter({root,direction:'javascript-to-rust',check,outputDirectory:path.join(root,name),...extra});}

test('actual JavaScript edits synchronize reparsed meta, Rust and executable strict TypeScript without changing original Rust', {timeout:60_000}, async t=>{
  const root=fixture(t),original=fs.readFileSync(path.join(root,'src/original.rs'));
  const first=run(root,'first');assert.equal(first.exitCode,0,JSON.stringify(first));assert.ok(first.records.every(row=>row.status==='passed'));
  const oldRust=fs.readFileSync(path.join(root,'src/generated_js_first/policy.rs'),'utf8');
  const oldMeta=fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/policy.lino'),'utf8');
  assert.equal(evaluate(parseMeta(oldMeta),'adjust',[7]),8);
  assert.equal(compileNativeTypeScript(root,{sourceRoot:root}).compiler,'5.9.3');
  const fresh=run(root,'fresh',true);assert.equal(fresh.exitCode,0);assert.equal(fresh.artifactsCurrent,true);
  put(root,'packages/javascript/portable/policy.mjs',source.replace('x + 1','x - 1'));
  put(root,'packages/javascript/native/core.mjs','export function observed() { return 9; }\n');
  put(root,'parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'adjust-seven',function:'adjust',args:[7],expected:6}]}));
  const changed=run(root,'changed');assert.equal(changed.exitCode,0,JSON.stringify(changed));
  const newRust=fs.readFileSync(path.join(root,'src/generated_js_first/policy.rs'),'utf8');
  const newMeta=fs.readFileSync(path.join(root,'tools/translation/js-to-rust/generated/policy.lino'),'utf8');
  assert.notEqual(newRust,oldRust);assert.notEqual(newMeta,oldMeta);assert.equal(evaluate(parseMeta(newMeta),'adjust',[7]),6);
  assert.deepEqual(fs.readFileSync(path.join(root,'src/original.rs')),original);
  assert.ok(captureSyncInputs(root).files.some(row=>row.path==='src/generated_js_first/manual.rs'));
  for(const name of ['packages/javascript/index.js','packages/javascript/testing.js'])assert.ok(captureSyncInputs(root).files.some(row=>row.path===name));
  assert.equal(fs.readFileSync(path.join(root,'src/generated_js_first/manual.rs'),'utf8'),'pub fn handwritten() -> bool { true }\n');
  const ts=require('typescript');const target=fs.readFileSync(path.join(root,'packages/typescript/native/core.ts'),'utf8');
  const erased=ts.transpileModule(target,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const observed=await import('data:text/javascript;base64,'+Buffer.from(erased).toString('base64'));assert.equal(observed.observed(),9);
  assert.equal(changed.originalInputsUnchanged,true);assert.equal(changed.wholeSourceSynchronization,false);assert.equal(changed.rustExecuted,false);
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
 for(const name of ['packages/javascript/native/core.mjs','packages/javascript/index.js','packages/javascript/testing.js','packages/javascript/schemas/new.json']){
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
  const target=path.join(root,'packages/javascript/native/core.mjs');fs.unlinkSync(target);fs.symlinkSync(path.join(root,'packages/javascript/portable/policy.mjs'),target);
  assert.throws(()=>captureSyncInputs(root),/Linked original/);
});

test('the command requires an explicit mode and existing complete receipts cannot be overwritten',t=>{
  const root=fixture(t),script=path.join(repository,'scripts/sync-router.mjs');
  const result=spawnSync(process.execPath,[script,'--root',root],{encoding:'utf8',timeout:10_000});assert.equal(result.status,1);assert.match(result.stderr,/explicit --check or --write/);
  const output=path.join(root,'preserved');fs.mkdirSync(output);put(root,'preserved/receipt.json','original receipt\n');
  assert.throws(()=>run(root,'preserved'),/already exists/);assert.equal(fs.readFileSync(path.join(output,'receipt.json'),'utf8'),'original receipt\n');
});
