// Independent actual bounded JSON caller registration source. ALL UNRUN.
// Independent canonical owned Json vector source. ALL UNRUN.
import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {proposeCoreJsonCorpus} from '../migrate-core-json.mjs';
import {proposeCoreAlgebraicCorpus} from '../migrate-core-algebraic.mjs';
import {proposeCorePrimitivesCorpus} from '../migrate-core-primitives.mjs';
import {prepareCoreJsonUpdateSourceData} from '../prepare-core-json-update-sources.mjs';
import {prepareCoreBase64SourceData} from '../prepare-core-base64-sources.mjs';
import {router_core_json_copy as copy,router_core_json_with_field as update} from '../json-update-runtime.mjs';
import {checkRouterCoreJsonUpdate} from '../router-core-json-updates.mjs';
import {json_macro_array,json_macro_bool,json_macro_null} from '../json-macro-runtime.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',M=C+'Maybe',J=C+'json!',hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(repositorySourceURL("Cargo.lock",new URL('../../../',import.meta.url)),'utf8')},dependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_JSON_UPDATE_VECTOR_DIR){mkdirSync(process.env.ROUTER_JSON_UPDATE_VECTOR_DIR,{recursive:true});writeFileSync(join(process.env.ROUTER_JSON_UPDATE_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
import {ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {prepareVectorJsonForwardSources} from '../prepare-vector-json-forward-sources.mjs';
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,...extra});
const project=input=>retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:dependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const canonical=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const native=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
function functions(result,names){for(const name of names)assert.equal(has(result,name),true,JSON.stringify(result.meta.refused));}
async function targets(result,verify){const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-checked-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('strict-target-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}}
function inverse(row){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);}
function proposal(input){const value=retain('complete-adoption',proposeCoreJsonUpdateCorpus({files:input,dependencyInputs,compilationProfile:PRODUCTION_PROFILE}));for(const row of value.proposals)inverse(row);return value;}


import {BOUNDED_JSON_CORE_SOURCE,BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';
import {BOUNDED_JSON_CORE_CONTRACTS} from '../bounded-json-core-call-source.mjs';
import {prepareBoundedJsonCallSources} from '../prepare-bounded-json-call-sources.mjs';
const B='crate::translation_json_core::';
function bounded(source,extra={}){return files('pub mod translation_json_core;\n'+source,{'src/translation_json_core.rs':BOUNDED_JSON_CORE_SOURCE,...extra});}
test('actual bounded shared validation copy and update callers translate as complete functions in both targets',async()=>{
 const source='pub fn validate(value:&'+T+'){'+B+'json_validate(value)}pub fn copied(value:&'+T+')->'+T+'{'+B+'json_checked_copy(value)}pub fn updated(base:&'+T+',value:&'+T+')->'+T+'{'+B+'json_checked_with_field(base,"Ω",value)}',result=project(bounded(source));functions(result,['validate','copied','updated']);await targets(result,api=>{const base=canonical({old:null}),value=canonical(['😀']);assert.equal(api.validate(base),undefined);const copied=api.copied(base);assert.deepEqual(copied,base);assert.notEqual(copied,base);assert.deepEqual(native(api.updated(base,value)),{old:null,'Ω':['😀']});assert.deepEqual(native(base),{old:null});});
});
test('actual bounded calls produce owned JSON vector values without moving shared inputs',async()=>{
 const source='pub fn values(value:&'+T+')->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(value),'+B+'json_checked_copy(value)]}',result=project(bounded(source));functions(result,['values']);await targets(result,api=>{const value=canonical({items:['Ω😀']}),values=api.values(value);assert.deepEqual(values,[value,value]);assert.notEqual(values[0],value);assert.notEqual(values[0].field0,values[1].field0);});
});
test('bounded runtime imports retain complete node depth and combined output limits',async()=>{
 const source='pub fn copied(value:&'+T+')->'+T+'{'+B+'json_checked_copy(value)}pub fn updated(base:&'+T+',value:&'+T+')->'+T+'{'+B+'json_checked_with_field(base,"right",value)}',result=project(bounded(source));functions(result,['copied','updated']);await targets(result,api=>{const blank=canonical(null),oversized={$:'Array',field0:Array.from({length:4096},()=>blank)};assert.throws(()=>api.copied(oversized));let deep=blank;for(let at=0;at<33;at++)deep={$:'Array',field0:[deep]};assert.throws(()=>api.copied(deep));const array=canonical(Array.from({length:2047},()=>null)),base=canonical({left:Array.from({length:2047},()=>null)});assert.throws(()=>api.updated(base,array));});
});
test('missing changed nominal mutable extra-reference and missing actual dependency contexts stay refused',async()=>{
 const source='pub fn pending(value:&'+T+')->'+T+'{'+B+'json_checked_copy(value)}';assert.equal(has(project(bounded(source,{'src/translation_json_core.rs':BOUNDED_JSON_CORE_SOURCE+'\n// changed complete library'})),'pending'),false);
 for(const body of ['pub struct Fake;pub fn pending(value:&Fake)->Fake{'+B+'json_checked_copy(value)}','pub fn pending(value:&mut '+T+')->'+T+'{'+B+'json_checked_copy(value)}','pub fn pending(value:&'+T+')->'+T+'{'+B+'json_checked_copy(&value)}','pub fn pending(value:'+T+')->'+T+'{'+B+'json_checked_copy(value)}'])assert.equal(has(project(bounded(body)),'pending'),false,body);
 const input=bounded(source),withoutDependencies=translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE});assert.equal(has(withoutDependencies,'pending'),false);
});
test('public contract data cannot replace actual namespace source or mutate the fixed operand domains',async()=>{
 assert.equal(BOUNDED_JSON_CORE_CONTRACTS.length,3);for(const row of BOUNDED_JSON_CORE_CONTRACTS){assert.equal(row.requiresRefinement,'genuine-router-owned-json-update');assert.ok(Object.isFrozen(row));assert.ok(Object.isFrozen(row.params));assert.ok(Object.isFrozen(row.rustPath));}assert.throws(()=>BOUNDED_JSON_CORE_CONTRACTS[0].params.pop());const source='mod translation_json_core {pub fn json_checked_copy(value:bool)->bool{value}}pub fn pending(value:bool)->bool{'+B+'json_checked_copy(value)}';assert.equal(has(project(files(source)),'pending'),false);assert.equal(hash(BOUNDED_JSON_CORE_SOURCE),BOUNDED_JSON_CORE_SHA256);
});
test('four complete bounded JSON registration equations retain original source CST inverses and two phase names',async()=>{const plan=prepareBoundedJsonCallSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
