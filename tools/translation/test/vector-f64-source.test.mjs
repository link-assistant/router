// Independent f64 vector source. ALL UNRUN.
// Independent repetition source/behavior/refusal cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';import {verifyTypedTargets} from './typed-targets.mjs';
import {migrateCoreVectors} from '../migrate-core-vectors.mjs';
import {prepareVectorRepeatSources} from '../prepare-vector-repeat-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
const C='crate::translation_core::',limits={timeout:60000};
function files(source){return {'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':facade,'src/translation_core/primitives.rs':primitives,'src/translation_core/ranges.rs':ranges,'src/translation_core/base64.rs':base64,'src/translation_core/json_collections.rs':collections};}
function project(source,input=files(source)){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path]});}
import {prepareVectorF64Sources} from '../prepare-vector-f64-sources.mjs';
import {evaluateOwnedVectorF64,emitOwnedVectorF64} from '../js-to-rust/owned-vector-f64-literal.mjs';
test('actual checked f64 list repetition negative-zero and IEEE parameter values retain emitted JS and strict TS behavior',limits,async()=>{
 const source='pub fn values()->Vec<f64>{'+C+'vec![-0.0f64,0.5f64,1.5f64]}pub fn copies(seed:f64)->Vec<f64>{'+C+'vec![seed;3]}pub fn empty(seed:f64)->Vec<f64>{'+C+'vec![seed;0]}',result=project(source);for(const name of ['values','copies','empty'])assert.ok(result.meta.executable.some(row=>row.name===name),name);await verifyTypedTargets(result,api=>{const values=api.values();assert.ok(Object.is(values[0],-0));assert.deepEqual(values.slice(1),[0.5,1.5]);for(const seed of [-0,0,0.5,Number.MIN_VALUE,Number.MAX_VALUE,Infinity,-Infinity,NaN]){const values=api.copies(seed);assert.equal(values.length,3);for(const value of values)assert.ok(Object.is(value,seed));assert.deepEqual(api.empty(seed),[]);}},{childTimeoutMs:20000});
});
test('reverse finite binary64 literal DATA preserves signed zero canonical form and refuses noncanonical or nonfinite values',limits,()=>{
 assert.ok(Object.is(evaluateOwnedVectorF64({kind:'float',value:'-0'}),-0));assert.equal(emitOwnedVectorF64({kind:'float',value:'-0'},true),'-0.0_f64');assert.equal(evaluateOwnedVectorF64({kind:'float',value:'5e-324'}),Number.MIN_VALUE);for(const value of ['NaN','Infinity','-Infinity','01','0.0','0x10','1e309'])assert.throws(()=>evaluateOwnedVectorF64({kind:'float',value}));
});
test('new literal source conversion refuses a changed Number constructor without calling it',limits,()=>{
 const field=Object.getOwnPropertyDescriptor(globalThis,'Number');let called=0;try{Object.defineProperty(globalThis,'Number',{...field,value:()=>{called++;return 0;}});assert.throws(()=>evaluateOwnedVectorF64({kind:'float',value:'0'}),/host changed/);assert.equal(called,0);}finally{Object.defineProperty(globalThis,'Number',field);}
});
test('f32 and borrowed float storage remain outside the scalar Copy vector profile',limits,()=>{for(const source of ['pub fn bad()->Vec<f32>{'+C+'vec![1.0f32;2]}','pub fn bad(seed:&f64)->Vec<&f64>{'+C+'vec![seed;2]}'])assert.equal(project(source).meta.executable.some(row=>row.name==='bad'),false);});
test('eight complete f64 compiler equations retain both phases physical originals and complete inverse source',limits,()=>{const plan=prepareVectorF64Sources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
