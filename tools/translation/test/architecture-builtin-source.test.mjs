// Independent source-domain regression SOURCE; all cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {createOriginalCommonBuiltinCallerAttributeScope,createOriginalArchitectureBuiltinCallerAttributeScope,withOriginalArchitectureBuiltinCallerSources} from '../registered-builtin-caller-attribute-source.mjs';
import {translateArchitectureMetadataTrackedLocalDeclarativeProject} from '../architecture-metadata-tracked-local-declarative-project.mjs';
import {prepareArchitectureBuiltinSources} from '../prepare-architecture-builtin-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
function input(source){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:PRODUCTION_PROFILE},item=originalSourceModuleItems(module).find(row=>!row.comment&&['struct','enum','union'].includes(row.term)),attribute=itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes.find(row=>row.name==='repr');return {module,item,attribute};}
const at=(scope,row)=>scope.at(row.module,row.item,row.attribute);
function legacyRejectsSimd(){const scope=createOriginalCommonBuiltinCallerAttributeScope();try{assert.equal(at(scope,input('#[repr(simd)]struct Vector([i32;4]);')),null);}finally{scope.finish();}}
test('the new explicit scope recognizes simd alone on structs without feature or layout authority',limits,()=>{
 legacyRejectsSimd();const scope=createOriginalArchitectureBuiltinCallerAttributeScope();try{for(const source of ['#[repr(simd)]struct Vector([i32;4]);','#[repr(simd,)]struct Vector([i32;4]);','#[repr(C)]struct Ordinary{value:u64}']){const row=at(scope,input(source));assert.ok(row,source);assert.equal(row.nativeLayoutQualified,false);assert.equal(row.compilerFeatureQualified,false);assert.equal(row.requiresSimdFeature,source.includes('simd'));assert.equal(row.namespaceAuthority,false);assert.equal(row.runtimeAuthority,false);}}finally{const result=scope.finish();assert.equal(result.selected.length,3);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeAuthority,false);}legacyRejectsSimd();
});
test('qualified names unknown grammar mixed representations and non-struct simd stay refused',limits,()=>{
 const scope=createOriginalArchitectureBuiltinCallerAttributeScope();try{for(const source of ['#[repr(simd,C)]struct V([i32;4]);','#[repr(simd,align(16))]struct V([i32;4]);','#[repr(simd)]union V{value:u64}','#[repr(simd)]enum V{One}','#[repr(simd(4))]struct V([i32;4]);','#[repr(concat!("simd"))]struct V([i32;4]);','#[other::repr(simd)]struct V([i32;4]);'])assert.equal(at(scope,input(source)),null,source);}finally{scope.finish();}
});
test('the explicit operation selects fresh architecture scopes and restores the legacy domain after every exit',limits,()=>{
 withOriginalArchitectureBuiltinCallerSources(()=>{const scope=createOriginalCommonBuiltinCallerAttributeScope();try{assert.ok(at(scope,input('#[repr(simd)]struct V([i32;4]);')));}finally{scope.finish();}});legacyRejectsSimd();
 const error=new Error('source operation');assert.throws(()=>withOriginalArchitectureBuiltinCallerSources(()=>{throw error;}),value=>value===error);legacyRejectsSimd();assert.throws(()=>withOriginalArchitectureBuiltinCallerSources(async()=>1),/synchronous/u);legacyRejectsSimd();
 let touched=false;assert.throws(()=>withOriginalArchitectureBuiltinCallerSources(()=>Object.defineProperty({},'then',{get(){touched=true;throw Error('getter');}})),/thenable\/accessor/u);assert.equal(touched,false);legacyRejectsSimd();
});
test('the complete copied project keeps legal builtin metadata and independent JavaScript strict-TypeScript behavior',limits,async()=>{
 const source='#[repr(C)]struct Record{value:u64}\n#[inline]pub fn selected(value:bool)->bool{value}',result=translateArchitectureMetadataTrackedLocalDeclarativeProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(row=>row.name==='selected'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.selected(false),false);assert.equal(api.selected(true),true);},{childTimeoutMs:20000});assert.equal(result.meta.runtimeParity,false);legacyRejectsSimd();
});
test('all four complete source equations retain original implementations native spans and both ordered sequences',limits,()=>{
 const plan=prepareArchitectureBuiltinSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
