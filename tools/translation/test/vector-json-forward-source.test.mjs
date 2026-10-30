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


test('actual canonical Json vector construction moves each source input once and preserves tagged JSON in strict targets',async()=>{
 const source='pub fn moved(value:'+T+')->Vec<'+T+'>{'+C+'vec![value]}pub fn blanks()->Vec<'+T+'>{'+C+'vec!['+T+'::Null,'+T+'::Null]}pub fn literals()->Vec<'+T+'>{'+C+'vec!['+J+'({"a":1}),'+J+'([true])]}pub fn conditional(flag:bool,left:'+T+',right:'+T+')->Vec<'+T+'>{if flag{'+C+'vec![left,right]}else{'+C+'vec![]}}',result=project(files(source));functions(result,['moved','blanks','literals','conditional']);await targets(result,api=>{assert.deepEqual(api.moved(canonical({key:'Ω😀'})).map(native),[{key:'Ω😀'}]);assert.deepEqual(api.blanks().map(native),[null,null]);assert.deepEqual(api.literals().map(native),[{a:1},[true]]);assert.deepEqual(api.conditional(true,canonical(1),canonical(2)).map(native),[1,2]);assert.deepEqual(api.conditional(false,canonical(1),canonical(2)),[]);});
});
test('canonical copy operations compose with actual vector transfer without consuming their shared input',async()=>{
 const source='pub fn copied(value:'+T+')->Vec<'+T+'>{let first='+C+'json_copy(&value);'+C+'vec![first,value]}',result=project(files(source));functions(result,['copied']);await targets(result,api=>assert.deepEqual(api.copied(canonical({key:[true]})).map(native),[{key:[true]},{key:[true]}]));
});
test('duplicate moves post-vector reuse shared-to-owned coercion and non-Copy repetition are refused',()=>{
 for(const source of ['pub fn bad(value:'+T+')->Vec<'+T+'>{'+C+'vec![value,value]}','pub fn bad(value:'+T+')->'+T+'{let held:Vec<'+T+'>='+C+'vec![value];value}','pub fn bad(value:&'+T+')->Vec<'+T+'>{'+C+'vec![value]}','pub fn bad(value:'+T+')->Vec<'+T+'>{'+C+'vec![value;2]}']){const result=project(files(source));assert.equal(has(result,'bad'),false,source);}
});
test('a same-spelled nominal JSON type cannot acquire the registered canonical layout',()=>{
 const source='pub enum Json {Null}pub fn bad()->Vec<Json>{'+C+'vec![Json::Null]}',result=project(files(source));assert.equal(has(result,'bad'),false);assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('four complete Json vector source equations retain ordered phases current originals and complete inverses',()=>{const plan=prepareVectorJsonForwardSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
