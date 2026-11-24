// Independent bounded JSON native-builder caller cases. ALL UNRUN.
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
import {prepareBoundedJsonBuildersSources} from '../prepare-bounded-json-builders-sources.mjs';
import {prepareNativeSourceHistory} from '../native-source-history.mjs';
const exactJson=value=>{const result=serde_json_to_string(value);assert.equal(result.$,'Ok');return result.field0;};
import {router_vector_json_build_null,router_vector_json_build_bool,router_vector_json_build_string,router_vector_json_build_u64,router_vector_json_build_i64,router_vector_json_build_array,router_vector_json_build_object} from '../json-update-runtime.mjs';
test('all seven actual bounded native constructors translate as complete canonical functions in both targets',async()=>{
 const source='pub fn blank()->'+T+'{'+B+'json_build_null()}pub fn flag(value:bool)->'+T+'{'+B+'json_build_bool(value)}pub fn text(value:&str)->'+T+'{'+B+'json_build_string(value)}pub fn unsigned(value:u64)->'+T+'{'+B+'json_build_u64(value)}pub fn signed(value:i64)->'+T+'{'+B+'json_build_i64(value)}pub fn empty_object()->'+T+'{'+B+'json_build_object()}pub fn array()->'+T+'{'+B+'json_build_array('+C+'vec!['+B+'json_build_null(),'+B+'json_build_bool(true)])}',result=project(bounded(source));functions(result,['blank','flag','text','unsigned','signed','empty_object','array']);await targets(result,api=>{assert.deepEqual(native(api.blank()),null);assert.deepEqual(native(api.flag(true)),true);assert.deepEqual(native(api.text('Ω😀')),'Ω😀');assert.equal(exactJson(api.unsigned(18446744073709551615n)),'18446744073709551615');assert.equal(exactJson(api.signed(-9223372036854775808n)),'-9223372036854775808');assert.deepEqual(native(api.empty_object()),{});assert.deepEqual(native(api.array()),[null,true]);});
});
test('an owned JSON vector parameter moves into an array once and duplicate move remains refused',async()=>{
 const source='pub fn array(value:Vec<'+T+'>)->'+T+'{'+B+'json_build_array(value)}',result=project(bounded(source));functions(result,['array']);await targets(result,api=>assert.deepEqual(native(api.array([canonical(null),canonical('Ω')])),[null,'Ω']));const bad='pub fn pending(value:Vec<'+T+'>)->'+T+'{let consumed='+B+'json_build_array(value);'+B+'json_build_array(value)}';assert.equal(has(project(bounded(bad)),'pending'),false);
});
test('canonical native builder runtime preserves exact scalar bounds and new-root array budget',async()=>{
 assert.deepEqual(native(router_vector_json_build_null()),null);assert.deepEqual(native(router_vector_json_build_bool(false)),false);assert.deepEqual(native(router_vector_json_build_string('Ω😀')),'Ω😀');assert.equal(exactJson(router_vector_json_build_u64(18446744073709551615n)),'18446744073709551615');assert.equal(exactJson(router_vector_json_build_i64(-9223372036854775808n)),'-9223372036854775808');assert.deepEqual(native(router_vector_json_build_object()),{});const blank=router_vector_json_build_null;assert.doesNotThrow(()=>router_vector_json_build_array(Array.from({length:4095},blank)));assert.throws(()=>router_vector_json_build_array(Array.from({length:4096},blank)));for(const value of [-1n,18446744073709551616n])assert.throws(()=>router_vector_json_build_u64(value));for(const value of [-9223372036854775809n,9223372036854775808n])assert.throws(()=>router_vector_json_build_i64(value));assert.throws(()=>router_vector_json_build_string('\ud800'));assert.throws(()=>router_vector_json_build_bool(1));
});
test('builders refuse borrowed vectors wrong scalar widths nominal owners and changed complete library sources',async()=>{
 for(const source of ['pub fn pending(value:u8)->'+T+'{'+B+'json_build_u64(value)}','pub fn pending(value:i64)->'+T+'{'+B+'json_build_u64(value)}','pub fn pending(value:&Vec<'+T+'>)->'+T+'{'+B+'json_build_array(value)}','pub struct Fake;pub fn pending(value:Vec<Fake>)->'+T+'{'+B+'json_build_array(value)}'])assert.equal(has(project(bounded(source)),'pending'),false,source);assert.equal(has(project(bounded('pub fn pending()->'+T+'{'+B+'json_build_null()}',{'src/translation_json_core.rs':BOUNDED_JSON_CORE_SOURCE+'\n// changed complete source'})),'pending'),false);
});
test('eight complete builder equations and appended native helper history preserve all originals and inverses',async()=>{
 const plan=prepareBoundedJsonBuildersSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const native=prepareNativeSourceHistory();assert.equal(native.files.length,17);assert.equal(native.files.reduce((count,row)=>count+row.historyChain.length,0),24);const helper=native.files.find(row=>row.path==='rust/src/translation_json_core.rs');assert.ok(helper);assert.equal(helper.current,BOUNDED_JSON_CORE_SOURCE);assert.equal(helper.inverse,helper.before);assert.equal(native.rustExecuted,false);
});
