import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Hash,createHash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareWholeOwnerDeriveCandidate} from '../prepare-whole-owner-derive-candidate.mjs';
import {createOriginalAttributeOwnerBulkOperation} from '../attribute-owner-bulk-operation.mjs';
import {withWholeOriginalAttributeOwnerOperation} from '../whole-owner-serde-bang-footprints-candidate.mjs';
import {createWholeOwnerDeriveBangContext,createDeriveBangContext,isDeriveBangContext,deriveBangModules,deriveBangOutputAt,originalAttributeOwnerBulkCryptoReady} from '../whole-owner-derive-candidate.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),json=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const source='#[derive(Clone,Debug,serde::Serialize)] pub struct Record { value:u8 }';
function setup(text=source){const modules=[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source:text}],deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});return {modules,deriveContext};}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function observeHash(run){const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];try{define(Hash.prototype,'update',{...update,value:function(...args){tape[tape.length]={operation:'update',args};return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape[tape.length]={operation:'digest',args,value};return value;}});return {result:outcome(run),tape};}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}}

test('complete actual native copies retain eight output equations source spans both CST phases license and whole inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerDeriveCandidate();assert.equal(plan.files.length,8);assert.equal(plan.originalDefaultsUnchanged,true);assert.equal(plan.originalSingleOwnerAPIsUnchanged,true);assert.equal(plan.newAcrossInvocationSourceOrOwnerCache,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);}
 for(const input of plan.inputs.filter(row=>row.source!==undefined))assert.equal(readFileSync(new URL(input.path,root),'utf8'),input.source);
 const serde=plan.files.find(row=>row.path.endsWith('whole-owner-serde-bang-footprints-candidate.mjs'));assert.equal(serde.changes.semantic[0].legacySingleOwnerUnchanged,true);assert.match(serde.changes.semantic[0].batchSource,/bindingsDigest:current\.digest/u);assert.match(serde.after,/if\(!wholeOwnerOperation\.active\(\)\)return attributeOwners\(original,certificate,names\)/u);
});

test('whole operation reissues every actual owner from one fresh binding program with identical complete output and genuine consumers',{timeout:60000},()=>{
 const input=setup(),eligible=originalAttributeOwnerBulkCryptoReady();if(!process.versions.bun&&process.versions.node==='20.19.4')assert.equal(eligible,true,'actual pinned Node ABI must select the new whole operation');
 const baseline=createDeriveBangContext(input),first=createWholeOwnerDeriveBangContext(input),second=createWholeOwnerDeriveBangContext(input);assert.deepStrictEqual(first,baseline);assert.deepStrictEqual(second,baseline);assert.equal(isDeriveBangContext(first),true);if(eligible){assert.notEqual(first,baseline);assert.notEqual(second,first);}else assert.equal(first,baseline);
 assert.equal(first.certificates.length,1);assert.equal(first.certificates[0].actualOwners.length,3);assert.equal(first.certificates[0].selectedOwners.length,3);assert.equal(first.certificates[0].dimensions.bangMacroComplete,true);
 const modules=deriveBangModules(first,{deriveContext:input.deriveContext,modules:input.modules,externalModules:deriveFootprintExternalModules(input.deriveContext),compilationProfile:PRODUCTION_PROFILE});assert.equal(modules.length,2);
 const model=modules.find(row=>row.file==='src/model.rs'),item=sourceItems(model.source).find(row=>row.term==='struct');assert.equal(deriveBangOutputAt(first,input.deriveContext,model,item),first.certificates[0]);
});

test('observed Hash wrappers retain every complete original source declaration binding and digest payload through the exact legacy creator',{timeout:60000},()=>{
 const left=setup(),right=setup(),baseline=observeHash(()=>createDeriveBangContext(left)),candidate=observeHash(()=>createWholeOwnerDeriveBangContext(right));assert.deepStrictEqual(candidate,baseline);assert.ok(baseline.tape.length>0);assert.ok(baseline.tape.some(row=>row.operation==='update'&&row.args[0]===source));
 const before=observeHash(()=>createDeriveBangContext(right)),after=observeHash(()=>createWholeOwnerDeriveBangContext(right));assert.deepStrictEqual(after,before,'fallback retains the old complete cached-context behavior too');
});

test('JSON hooks and callback-installed intrinsic changes retain complete original results and callback payloads',{timeout:60000},()=>{
 const fixture=fileURLToPath(new URL('./fixtures/whole-owner-hook-child.mjs',import.meta.url));
 for(const kind of ['json-hook','callback-installed-hook']){
  const runs=['legacy','whole'].map(mode=>spawnSync(process.execPath,[fixture,mode,kind],{encoding:'utf8',timeout:12500,maxBuffer:64*1024*1024}));for(const run of runs){assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');}
  const [baseline,candidate]=runs.map(run=>JSON.parse(run.stdout));assert.deepStrictEqual(candidate,baseline);assert.equal(baseline.schema,'complete-whole-owner-hook-wire-v1');assert.equal(baseline.engine.execPath,process.execPath);assert.equal(baseline.workloads.length,3);
  const rows=baseline.workloads;assert.ok(rows.every(row=>row.kind===kind));assert.deepStrictEqual(rows.map(row=>row.state),['first-observed-context','fresh-context-after-observed-work','same-context-after-observed-work']);assert.ok(rows[0].tape.length>0);assert.ok(rows[1].tape.length>0);assert.deepStrictEqual(rows[2].tape,[]);for(const row of rows)assert.ok(row.result.value);
  const changed=structuredClone(candidate);changed.workloads[0].tape.find(row=>typeof row.value==='string').value+=' ';assert.throws(()=>assert.deepStrictEqual(changed,baseline),assert.AssertionError,'one nested original callback result remains part of full strict comparison');
 }
});

test('unknown original owners and forged contexts retain complete residuals without partial or supplied authority',{timeout:60000},()=>{
 const input=setup('#[derive(Clone,Debug)] #[unknown] pub struct Record { value:u8 }'),baseline=createDeriveBangContext(input),actual=createWholeOwnerDeriveBangContext(input);assert.deepStrictEqual(actual,baseline);assert.ok(input.deriveContext.diagnostics.length+actual.diagnostics.length>0);assert.equal(actual.certificates[0]?.dimensions.bangMacroComplete??false,false);
 const clone=JSON.parse(json(input.deriveContext));assert.throws(()=>createWholeOwnerDeriveBangContext({deriveContext:clone}),/Unsealed|sealed|original/u);
});

test('throw reentry promise returns and later calls cannot retain an operation binding program digest or frame',{timeout:60000},()=>{
 const input=setup('#[derive(Clone)] pub struct Empty;'),operation=createOriginalAttributeOwnerBulkOperation(),eligible=originalAttributeOwnerBulkCryptoReady(),marker={failure:'original'},captured=[];
 assert.throws(()=>operation.run(input.deriveContext,()=>{captured.push(operation.current(input.deriveContext));throw marker;}),error=>error===marker);assert.equal(operation.active(),false);assert.equal(operation.current(input.deriveContext),null);
 operation.run(input.deriveContext,()=>{const outer=operation.current(input.deriveContext);operation.run(input.deriveContext,()=>{const inner=operation.current(input.deriveContext);if(eligible){assert.notEqual(inner,outer);assert.notEqual(inner.bindings,outer.bindings);}captured.push(inner);});assert.equal(operation.current(input.deriveContext),outer);captured.push(outer);});
 let thenReads=0;const returned=operation.run(input.deriveContext,()=>({get then(){thenReads++;throw marker;}}));assert.equal(thenReads,0);assert.equal(typeof get(returned,'then').get,'function');assert.equal(operation.active(),false);
 for(const frame of captured)if(eligible){assert.equal(frame.open,false);assert.equal(frame.context,null);assert.equal(frame.bindings,null);assert.equal(frame.digest,null);assert.equal(frame.original,null);}else assert.equal(frame,null);
});

test('actual private native handle hooks select legacy payloads and constructor-chain changes fail the final boundary',{timeout:60000},()=>{
 if(!originalAttributeOwnerBulkCryptoReady()){assert.equal(originalAttributeOwnerBulkCryptoReady(),false);return;}
 const probe=createHash('sha256'),handles=Reflect.ownKeys(probe).filter(key=>typeof key==='symbol').map(key=>get(probe,key)?.value).filter(value=>value&&typeof value==='object').map(value=>Object.getPrototypeOf(value)).filter(owner=>get(owner,'constructor')?.value?.name==='Hash'&&typeof get(owner,'update')?.value==='function'&&typeof get(owner,'digest')?.value==='function');assert.equal(handles.length,1);probe.digest('hex');
 const owner=handles[0],update=get(owner,'update'),left=setup(),right=setup(),rows=[];
 for(const [index,creator]of [createDeriveBangContext,createWholeOwnerDeriveBangContext].entries()){
  const tape=[];try{define(owner,'update',{...update,value:function(...args){tape[tape.length]=args;return apply(update.value,this,args);}});assert.equal(originalAttributeOwnerBulkCryptoReady(),false);rows[index]={result:outcome(()=>creator(index===0?left:right)),tape};}finally{define(owner,'update',update);}
 }assert.deepStrictEqual(rows[1],rows[0]);assert.ok(rows[0].tape.length>0);assert.equal(originalAttributeOwnerBulkCryptoReady(),true);
 const constructor=get(owner,'constructor').value,key=Symbol.hasInstance,before=get(constructor,key),inherited=Function.prototype[key],operation=createOriginalAttributeOwnerBulkOperation(),input=setup();let entered=false;
 try{assert.throws(()=>operation.run(input.deriveContext,()=>{entered=true;define(constructor,key,{configurable:true,value:function(...args){return apply(inherited,this,args);}});assert.equal(originalAttributeOwnerBulkCryptoReady(),false);return {partial:'must not escape'};}),/final original crypto\/intrinsics changed/u);assert.equal(entered,true);assert.equal(operation.active(),false);}finally{if(before)define(constructor,key,before);else delete constructor[key];}
 assert.equal(originalAttributeOwnerBulkCryptoReady(),true);
});

test('nested observed fallback suspends a different active owner frame and restores the complete outer operation',{timeout:60000},()=>{
 const outer=setup('#[derive(Clone)] pub struct Outer;'),left=setup(),right=setup(),baseline=observeHash(()=>createDeriveBangContext(left));let actual;
 const result=withWholeOriginalAttributeOwnerOperation(outer.deriveContext,()=>{actual=observeHash(()=>createWholeOwnerDeriveBangContext(right));return {complete:'outer'};});
 assert.deepStrictEqual(actual,baseline);assert.deepStrictEqual(result,{complete:'outer'});assert.equal(isDeriveBangContext(actual.result.value),true);
});
