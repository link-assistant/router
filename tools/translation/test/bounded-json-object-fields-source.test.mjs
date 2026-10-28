// Bulk native JSON object constructor independent source cases. ALL UNRUN.
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
import {prepareBoundedJsonObjectFieldsSources} from '../prepare-bounded-json-object-fields-sources.mjs';
import {prepareNativeSourceHistory} from '../native-source-history.mjs';
import {router_vector_json_build_fields} from '../json-update-runtime.mjs';
import {json_macro_array as arrayValue,json_macro_string as textValue,json_macro_null as nullValue} from '../json-macro-runtime.mjs';
const fields=(names,values)=>router_vector_json_build_fields(arrayValue(names.map(textValue)),values);
test('actual complete bulk object caller consumes its owned values and keeps shared keys unchanged in both targets',async()=>{
 const source='pub fn fields(keys:&'+T+',values:Vec<'+T+'>)->'+T+'{'+B+'json_build_fields(keys,values)}',result=project(bounded(source));functions(result,['fields']);await targets(result,api=>{const keys=arrayValue([textValue('z'),textValue('Ω😀'),textValue('a')]),values=[canonical(null),canonical(['text']),canonical(true)],before=structuredClone(keys),out=api.fields(keys,values);assert.deepEqual(native(out),{a:true,z:null,'Ω😀':['text']});assert.deepEqual(keys,before);assert.notEqual(out.field0.entries.find(row=>row.key==='Ω😀').value,values[1]);assert.notEqual(out.field0.entries.find(row=>row.key==='Ω😀').value.field0,values[1].field0);});
});
test('the maximum bounded object uses 4095 fields without repeated whole-object updates',async()=>{
 const names=Array.from({length:4095},(_,index)=>'key'+String(index).padStart(4,'0')),values=names.map(()=>nullValue()),out=fields(names,values);assert.equal(out.field0.entries.length,4095);assert.equal(out.field0.entries[4094].key,'key4094');assert.throws(()=>fields([...names,'extra'],[...values,nullValue()]));
});
test('duplicate non-string wrong-kind and wrong-arity keys refuse without changing values',async()=>{
 const values=[canonical({held:['Ω']})],before=structuredClone(values);for(const [keys,input]of [[canonical(null),values],[arrayValue([nullValue()]),values],[arrayValue([]),values],[arrayValue([textValue('same'),textValue('same')]),[nullValue(),nullValue()]]])assert.throws(()=>router_vector_json_build_fields(keys,input));assert.deepEqual(values,before);let deep=nullValue();for(let index=0;index<33;index++)deep={$:'Array',field0:[deep]};assert.throws(()=>fields(['deep'],[deep]));
});
test('values cannot be moved twice and keys cannot be passed as an unborrowed owned value',async()=>{
 for(const source of ['pub fn pending(keys:&'+T+',values:Vec<'+T+'>)->'+T+'{let first='+B+'json_build_fields(keys,values);'+B+'json_build_fields(keys,values)}','pub fn pending(keys:'+T+',values:Vec<'+T+'>)->'+T+'{'+B+'json_build_fields(keys,values)}'])assert.equal(has(project(bounded(source)),'pending'),false,source);
});
test('eight full compiler equations and the second JSON helper successor retain complete native history',async()=>{
 const plan=prepareBoundedJsonObjectFieldsSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const native=prepareNativeSourceHistory(),helper=native.files.find(row=>row.path==='rust/src/translation_json_core.rs');assert.equal(native.files.length,17);assert.equal(native.files.reduce((sum,row)=>sum+row.historyChain.length,0),20);assert.equal(helper.historyChain.length,2);assert.equal(helper.current,BOUNDED_JSON_CORE_SOURCE);assert.equal(native.rustExecuted,false);assert.equal(native.receivingExecuted,false);
});
