// Independent cross-module original source/proof/target cases. Entirely UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {translateCrossModuleHelperBulkProject,withCrossModuleHelperBulkSourceOperation} from '../cross-module-helper-bulk-20261101.mjs';
import {checkRouterPrimitiveVectorMutableHelperLet,checkRouterPrimitiveVectorSharedHelperBorrow,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareCrossModuleHelperBulkSources} from '../cross-module-helper-bulk-20261101-prepare.mjs';
import {prepareNativeHelperSyntaxOriginSources} from '../prepare-native-helper-syntax-origin-sources.mjs';
import {prepareCrossModuleHelperBulkSourceEquation} from '../cross-module-helper-bulk-20261101-profile.mjs';
import {verifyCrossModuleHelperTargets} from './cross-module-helper-bulk-20261101-fixture.mjs';
const limits={timeout:60000},P='crate::translation_primitive_vectors_core::vec_u8_',V='::std::vec::Vec<::core::primitive::u8>',T='::core::primitive::u8';
const native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8');
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const helpers=`pub fn seed(value:${T})->${V}{${P}push(${P}new(),value)}
pub fn bounded(input:${V})->${V}{let values=${P}truncate(input,18446744073709551615_u64);values}
pub fn count(input:&${V})->::core::primitive::u64{let checked=${P}len(input);${P}len(input)}\n`;
const callers=`pub fn built(value:${T})->${V}{let mut values=helpers::seed(value);values=${P}push(values,value);values}
pub fn counted(value:${T})->::core::primitive::u64{let values=helpers::seed(value);helpers::count(&values)}
pub fn moved(value:${T})->${V}{helpers::bounded(helpers::seed(value))}\n`;
function files(body=callers,helper=helpers){return {
 'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\npub mod helpers;\n'+body,
 'src/helpers.rs':helper,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,
 'src/translation_primitive_sequences_core.rs':sequence,'src/translation_primitive_vectors_core.rs':native,
};}
function options(input){return {entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE};}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
function refused(input,name){try{return !admitted(translateCrossModuleHelperBulkProject(options(input)),name);}catch{return true;}}
test('default module refusals remain exact while actual opt-in helper graph covers mutable owned and shared callers',limits,async()=>{
 const input=files(),plain=translateProject(options(input));for(const name of ['built','counted','moved'])assert.equal(admitted(plain,name),false);
 const result=translateCrossModuleHelperBulkProject(options(input));for(const name of ['built','counted','moved'])assert.equal(admitted(result,name),true);
 const wire=JSON.stringify(result.meta.checkedSemanticProgram),reparsed=parseProgram(wire);assert.equal(serializeProgram(reparsed),wire);assert.equal(reparsed.declarations.get('helpers.seed').modulePath.join('.'),'helpers');
 const records=[];await verifyCrossModuleHelperTargets(result,api=>{for(const value of [0n,255n]){assert.deepEqual(api.built(value),[value,value]);assert.equal(api.counted(value),1n);assert.deepEqual(api.moved(value),[value]);}},{childTimeoutMs:20000,record:row=>records.push(row)});
 assert.ok(records.every(row=>row.version==='5.9.3'));
 for(const [path,source]of Object.entries(input)){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(concrete.meta).source,source,path);}
 const plainAfter=translateProject(options(input));for(const name of ['built','counted','moved'])assert.equal(admitted(plainAfter,name),false);
});
test('qualified imports and reexports still resolve the exact original caller namespace target',limits,async()=>{
 const input=files('use crate::helpers::seed as selected;\npub mod bridge{pub use crate::helpers::seed as forwarded;}\npub fn by_alias(value:'+T+')->'+V+'{selected(value)}\npub fn by_bridge(value:'+T+')->'+V+'{bridge::forwarded(value)}');
 const result=translateCrossModuleHelperBulkProject(options(input));for(const name of ['by_alias','by_bridge'])assert.equal(admitted(result,name),true);
 await verifyCrossModuleHelperTargets(result,api=>{assert.deepEqual(api.by_alias(255n),[255n]);assert.deepEqual(api.by_bridge(0n),[0n]);},{childTimeoutMs:20000});
});
test('owned entry guards source integrity moves loans cycles and ambiguous names remain mandatory',limits,()=>{
 const cases=[
  [files(callers,helpers.replace('let values='+P+'truncate(input,18446744073709551615_u64);values','input')),'moved'],
  [files('pub fn bad(value:'+T+')->'+V+'{let values=helpers::seed(value);let moved=helpers::bounded(values);'+P+'append(values,moved)}'),'bad'],
  [files('pub fn bad(value:'+T+')->'+V+'{let mut values=helpers::seed(value);values='+P+'append(values,values);values}'),'bad'],
  [files(callers,helpers.replace(P+'push('+P+'new(),value)','seed(value)')),'built'],
  [files('use crate::helpers::seed as chosen;use crate::helpers::seed as chosen;pub fn bad(value:'+T+')->'+V+'{chosen(value)}'),'bad'],
  [files('pub fn bad(value:'+T+')->'+V+'{let mut values=helpers::seed(value);let borrowed=&values;values='+P+'push(values,value);values}'),'bad'],
 ];for(const [input,name]of cases)assert.equal(refused(input,name),true);
 const stale=files();stale['src/translation_primitive_vectors_core.rs']+='\n// changed\n';assert.equal(refused(stale,'built'),true);
});
test('opt-in alone grants no checker raw app let borrow or emission authority and expires on every exit',limits,()=>{
 const fakeLet={k:'let',mutable:true,value:{k:'app',fn:{k:'name',path:['helpers','seed']},args:[]}},fakeBorrow={k:'routerTextReference'};
 withCrossModuleHelperBulkSourceOperation(()=>{assert.equal(checkRouterPrimitiveVectorMutableHelperLet({},fakeLet,new Map(),[],undefined,false),null);assert.equal(checkRouterPrimitiveVectorSharedHelperBorrow({},fakeBorrow,new Map(),[],undefined),null);assert.equal(hasOriginalRouterCoreJsonProjection({k:'routerHostCall',compatibilityCore:{sourceProjectionKey:'copied'}}),false);});
 let invoked=false;assert.throws(()=>withCrossModuleHelperBulkSourceOperation(async()=>{invoked=true;}));assert.equal(invoked,false);
 const primary=Symbol('callback');assert.throws(()=>withCrossModuleHelperBulkSourceOperation(()=>{throw primary;}),error=>error===primary);
 const later=withCrossModuleHelperBulkSourceOperation(()=>()=>translateProject(options(files())));assert.equal(admitted(later(),'built'),false);
 assert.equal(withCrossModuleHelperBulkSourceOperation(()=>19),19);
});
test('complete physical source chronology keeps both sequences full originals and exact inverse',limits,()=>{
 const plan=prepareCrossModuleHelperBulkSourceEquation();assert.equal(plan.value.equation.inverse,plan.value.before);assert.notEqual(plan.value.before,plan.value.after);assert.ok(plan.value.before.includes('!same(target.modulePath,path)'));assert.ok(plan.value.after.includes('crossModuleHelperSourceProof'));
 assert.deepEqual([...new Set(plan.trace.map(row=>row.phase))],['language','repository']);assert.equal(plan.value.receivingExecuted,false);
});

test('owned String Vec helper initializers and explicit shared arguments use the same original cross-module proofs',limits,async()=>{
 const W='::std::vec::Vec<::std::string::String>',N='crate::translation_owned_text_vectors_core::vec_text_',input=files('pub mod text_helpers;pub mod translation_owned_text_vectors_core;pub fn text_values()->'+W+'{let mut values=text_helpers::empty();values}pub fn text_count()->::core::primitive::u64{let values=text_helpers::empty();text_helpers::count(&values)}');
 input['src/translation_owned_text_vectors_core.rs']=readFileSync(new URL('../../../rust/src/translation_owned_text_vectors_core.rs',import.meta.url),'utf8');
 input['src/text_helpers.rs']='pub fn empty()->'+W+'{'+N+'new()}pub fn count(input:&'+W+')->::core::primitive::u64{let checked='+N+'len(input);'+N+'len(input)}';
 assert.equal(admitted(translateProject(options(input)),'text_values'),false);
 const result=translateCrossModuleHelperBulkProject(options(input));for(const name of ['text_values','text_count'])assert.equal(admitted(result,name),true);
 await verifyCrossModuleHelperTargets(result,api=>{assert.deepEqual(api.text_values(),[]);assert.equal(api.text_count(),0n);},{childTimeoutMs:20000});
});

test('standard source archive successor composes after native helper syntax origins without rebasing historical bytes',limits,()=>{
 const current=prepareCrossModuleHelperBulkSources();assert.equal(current.files.length,3);assert.equal(current.sourceAuthority,false);assert.equal(current.semanticAuthority,false);
 for(const row of current.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.originalPath.startsWith('tools/translation/source-profiles/cross-module-helper-bulk-20261101/originals/'));}
 const ancestor=prepareNativeHelperSyntaxOriginSources(),root=ancestor.files.find(row=>row.path==='tools/translation/router-core-json-updates.mjs');
 const successor=current.files.find(row=>row.path===root.path);assert.equal(root.currentAfter,successor.after);assert.ok(root.laterHistories.some(row=>row.id==='router:cross-module-helper-bulk-20261101-complete-source-substitutions-v1'));
});
