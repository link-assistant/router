import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareWholeOwnerCoreProducerCandidate} from '../prepare-whole-owner-core-producer-candidate.mjs';
import {wholeOwnerCoreProducerInputsCallbackFree} from '../whole-owner-core-producer-inputs.mjs';
import {originalAttributeOwnerBulkCryptoReady} from '../attribute-owner-bulk-crypto.mjs';
import {createWholeOwnerCoreAdoptionProducerContext,createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerClosedAttributeSpans,coreAdoptionProducerBindings,finishCoreAdoptionProducerContext,captureWholeOwnerCoreAdoptionAttributeData} from '../whole-owner-core-producer-candidate.mjs';
import {createEnclosingCoreAdoptionProducerContext as originalCreate,coreAdoptionProducerBindings as originalBindings} from '../core-adoption-producer-context.mjs';
const root=new URL('../../../',import.meta.url),dependencyInputs=Object.freeze({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),hash=value=>createHash('sha256').update(value).digest('hex');
function setup(source='#[derive(Clone,Debug,serde::Serialize)] pub struct Record { value:u8 }'){
 const sources=new Map([['src/lib.rs','mod model;'],['src/model.rs',source]]),graph=resolveModuleGraph({entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,dependencyInputs};
}
function inspect(context,modules){return JSON.stringify({schema:'whole-owner-core-attribute-inspection-data-v1',modules:modules.map(module=>({file:module.file,module:[...module.path],source:module.source,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView?.digest??null,configurationCondition:module.configurationCondition??null,attributes:coreAdoptionProducerClosedAttributeSpans(context,module)})),producerEffects:finishCoreAdoptionProducerContext(context),sourceAuthority:false,runtimeAuthority:false});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}

test('complete Core candidate source copies retain native bindings both CST phases original API bodies and whole inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerCoreProducerCandidate();assert.equal(plan.files.length,3);assert.equal(plan.productionSelected,false);assert.equal(plan.defaultChanged,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);}
 const core=plan.files.find(row=>row.path.endsWith('whole-owner-core-adoption-producer-context-candidate.mjs'));assert.equal(core.selection.originalAPIsUntouched,true);assert.equal(core.selection.noFrameAcrossYield,true);assert.equal(core.selection.newSelectedRowsRetainedAcrossCalls,false);assert.ok(core.after.includes(core.before));
 const enclosing=plan.files.find(row=>row.path.endsWith('whole-owner-enclosing-context-candidate.mjs'));for(const name of ['serde','serde-deserialize','builtin-derive','clap-args','clap-value-enum','schemars'])assert.ok(enclosing.selection.imports.some(row=>row.replacement.includes(name)));
});

test('genuine enclosing private creator resolver and complete detached inspection equal the original full source pipeline',{timeout:60000},()=>{
 const input=setup(),eligible=originalAttributeOwnerBulkCryptoReady();assert.equal(wholeOwnerCoreProducerInputsCallbackFree(input),eligible);
 const baseline=createEnclosingCoreAdoptionProducerContext(input),candidate=createWholeOwnerCoreAdoptionProducerContext(input),original=originalCreate(input);assert.ok(candidate);assert.deepStrictEqual(coreAdoptionProducerBindings(candidate),coreAdoptionProducerBindings(baseline));assert.deepStrictEqual(coreAdoptionProducerBindings(candidate),originalBindings(original));
 const expected=JSON.parse(inspect(baseline,input.modules)),first=JSON.parse(captureWholeOwnerCoreAdoptionAttributeData(candidate)),second=JSON.parse(captureWholeOwnerCoreAdoptionAttributeData(candidate));assert.deepStrictEqual(first,expected);assert.deepStrictEqual(second,expected);assert.equal(first.modules.length,input.modules.length);assert.equal(first.modules.find(row=>row.file==='src/model.rs').attributes.length,1);assert.equal(first.producerEffects.selections.length,1);assert.equal(first.sourceAuthority,false);assert.equal(first.runtimeAuthority,false);
 assert.deepStrictEqual(finishCoreAdoptionProducerContext(candidate).selections,eligible?[]:expected.producerEffects.selections,'qualified capture rows are local; fallback preserves original selected-row behavior');const changed=structuredClone(first);changed.modules[1].source+=' ';assert.throws(()=>assert.deepStrictEqual(changed,expected),assert.AssertionError);
});

test('requested genuine modules retain complete original data and close before any later operation',{timeout:60000},()=>{
 const input=setup(),candidate=createWholeOwnerCoreAdoptionProducerContext(input),model=input.modules.find(row=>row.file==='src/model.rs');
 const first=captureWholeOwnerCoreAdoptionAttributeData(candidate,[model]);assert.equal(typeof first,'string');assert.deepStrictEqual(JSON.parse(first).modules.map(row=>row.file),['src/model.rs']);if(originalAttributeOwnerBulkCryptoReady())assert.deepStrictEqual(finishCoreAdoptionProducerContext(candidate).selections,[]);
 const second=captureWholeOwnerCoreAdoptionAttributeData(candidate,input.modules);assert.equal(typeof second,'string');assert.equal(JSON.parse(second).modules.length,input.modules.length);assert.equal(JSON.parse(first).modules[0].source,model.source);
 assert.throws(()=>captureWholeOwnerCoreAdoptionAttributeData(candidate,[{...model}]),/genuine|distinct/u);assert.throws(()=>captureWholeOwnerCoreAdoptionAttributeData(candidate,[model,model]),/genuine|distinct/u);assert.throws(()=>captureWholeOwnerCoreAdoptionAttributeData(structuredClone(candidate)),/copied|foreign/u);
});

test('unknown original owners changed original source and missing Cargo retain every complete original refusal',{timeout:60000},()=>{
 const input=setup('#[derive(Clone,Debug)] #[unknown] pub struct Record { value:u8 }'),baseline=createEnclosingCoreAdoptionProducerContext(input),candidate=createWholeOwnerCoreAdoptionProducerContext(input);assert.deepStrictEqual(JSON.parse(captureWholeOwnerCoreAdoptionAttributeData(candidate)),JSON.parse(inspect(baseline,input.modules)));assert.equal(JSON.parse(captureWholeOwnerCoreAdoptionAttributeData(candidate)).modules.flatMap(row=>row.attributes).length,0);
 assert.equal(createWholeOwnerCoreAdoptionProducerContext({...input,dependencyInputs:undefined}),null);assert.deepStrictEqual(JSON.parse(captureWholeOwnerCoreAdoptionAttributeData(null)),{schema:'whole-owner-core-attribute-inspection-data-v1',modules:[],producerEffects:null,sourceAuthority:false,runtimeAuthority:false});
 for(const make of [createEnclosingCoreAdoptionProducerContext,createWholeOwnerCoreAdoptionProducerContext]){const own=setup(),context=make(own),module=own.modules.find(row=>row.file==='src/model.rs');module.source+='\n// changed original';const result=outcome(()=>captureWholeOwnerCoreAdoptionAttributeData(context));assert.ok(result.error||JSON.parse(result.value).modules.every(row=>row.attributes.length===0));}
});

test('unknown getters and proxies reject admission without an extra caller operation before exact old fallback',{timeout:60000},()=>{
 const input=setup();for(const kind of ['source-getter','module-proxy']){
  function run(creator){const tape=[],modules=input.modules.map(row=>({...row})),module=modules[1];if(kind==='source-getter'){const source=module.source;Object.defineProperty(module,'source',{enumerable:true,get(){tape.push(['source',source]);return source;}});}else modules[1]=new Proxy(module,{get(target,key,receiver){tape.push(['get',String(key)]);return Reflect.get(target,key,receiver);}});const supplied={...input,modules};assert.equal(wholeOwnerCoreProducerInputsCallbackFree(supplied),false);assert.deepStrictEqual(tape,[]);return {result:outcome(()=>{const context=creator(supplied);return {bindings:coreAdoptionProducerBindings(context),data:captureWholeOwnerCoreAdoptionAttributeData(context)};}),tape};}
  const baseline=run(createEnclosingCoreAdoptionProducerContext),candidate=run(createWholeOwnerCoreAdoptionProducerContext);assert.deepStrictEqual(candidate,baseline);assert.ok(baseline.tape.length>0);
 }
});

test('independent cold warm and same-context complete Core creation inspection retain every original JSON and Hash callback',{timeout:60000},()=>{
 const fixture=fileURLToPath(new URL('./fixtures/whole-owner-core-hook-child.mjs',import.meta.url));for(const kind of ['json-hook','hash-hook']){const runs=['legacy','whole'].map(mode=>spawnSync(process.execPath,[fixture,mode,kind],{encoding:'utf8',timeout:12500,maxBuffer:64*1024*1024}));for(const run of runs){assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');}const [baseline,candidate]=runs.map(run=>JSON.parse(run.stdout));assert.deepStrictEqual(candidate,baseline);assert.equal(baseline.workloads.length,3);assert.ok(baseline.workloads.every(row=>row.tape.length>0&&row.result.value));const changed=structuredClone(candidate);changed.workloads[0].tape.find(row=>typeof row.value==='string').value+=' ';assert.throws(()=>assert.deepStrictEqual(changed,baseline),assert.AssertionError);}
});
