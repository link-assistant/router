import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,Hash} from 'node:crypto';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {proposeCoreJsonIndicesCorpus} from '../migrate-core-json-indices.mjs';
import {proposeCoreJsonCopiesCorpus} from '../migrate-core-json-copies.mjs';
import {proposeCoreJsonCollectionsCorpus} from '../migrate-core-json-collections.mjs';
import {createCoreAdoptionSelfAliasSelector} from '../core-adoption-producer-context.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {qualifiedCoreCallSyntax} from './qualified-core-call-syntax.mjs';
const C='crate::translation_core::',T=C+'Json',J=C+'json!',hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
const core={'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE};
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,...core,...extra});
const bodies=`pub fn index(value:&${T})->${T}{${J}({"v":value["v"]})}pub fn copied(value:&${T})->${T}{value.clone()}pub fn mapped(values:&[${T}])->Vec<${T}>{values.iter().map(|item|{${C}json_copy(item)}).collect()}`;
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const root=process.env.ROUTER_CORE_SELF_ALIAS_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
function inverse(row){let old=row.after.source;assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(old.slice(...part.after),part.replacement);old=old.slice(0,part.after[0])+part.expected+old.slice(part.after[1]);}assert.equal(old,row.before.source);assert.deepEqual(row.trace.map(phase=>phase.phase),['language','repository']);}
const count=value=>value.proposals.reduce((sum,row)=>sum+row.selections.length,0);
function adopt(tool,input,...supplied){const dependencies=supplied.length?supplied[0]:dependencyInputs;const value=retain('complete-adoption',tool({files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE}));for(const row of value.proposals)inverse(row);assert.equal(value.executableAdmission,false);return value;}
function chain(input){const index=adopt(proposeCoreJsonIndicesCorpus,input),copy=adopt(proposeCoreJsonCopiesCorpus,index.after),collection=adopt(proposeCoreJsonCollectionsCorpus,copy.after);return {index,copy,collection};}
const project=input=>retain('complete-checked-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const yes=(value,names)=>{for(const name of names)assert.ok(value.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(value.meta.refused));};
const json=value=>{const row=serde_json_from_str(JSON.stringify(value));assert.equal(row.$,'Ok');return row.field0;};
const native=value=>{const row=serde_json_to_string(value);assert.equal(row.$,'Ok');return JSON.parse(row.field0);};
async function targets(value,verify){const wire=JSON.stringify(value.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-targets',{wire,javascript:value.javascript,typescript:value.typescript});await verifyTypedTargets(value,verify,{childTimeoutMs:20_000});}
function selector(input){const graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],compilationProfile:PRODUCTION_PROFILE});return {graph,select:createCoreAdoptionSelfAliasSelector({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE})};}

test('exact root self alias keeps independent index copy and collection proposals executable',async()=>{
 const input=files('extern crate self as link_assistant_router;\n'+bodies),value=chain(input);assert.deepEqual([count(value.index),count(value.copy),count(value.collection)],[1,1,1]);const checked=project(value.collection.after);yes(checked,['index','copied','mapped']);
 await targets(checked,api=>{const input=json({v:{nested:['猫😀']}}),copy=api.copied(input);assert.deepEqual(native(api.index(input)),{v:{nested:['猫😀']}});assert.deepEqual(native(copy),native(input));assert.notStrictEqual(copy,input);assert.deepEqual(api.mapped(Object.freeze([input])).map(native),[native(input)]);});
});
test('inline module self aliases preserve exact lexical declarations and strict typed behavior',async()=>{
 const input=files('mod nested{extern crate self as local_router;'+bodies+'}'),value=chain(input);assert.deepEqual([count(value.index),count(value.copy),count(value.collection)],[1,1,1]);const result=project(value.collection.after);yes(result,['nested.index','nested.copied','nested.mapped']);
 await targets(result,api=>{const input=json({v:false});assert.deepEqual(native(api['nested.index'](input)),{v:false});assert.deepEqual(native(api['nested.copied'](input)),{v:false});assert.deepEqual(api['nested.mapped'](Object.freeze([input])).map(native),[{v:false}]);});
});
test('physical children inherit only the actual root self alias without requiring a derive context',async()=>{
 const input=files('extern crate self as link_assistant_router;mod child;',{'src/child.rs':bodies}),value=chain(input);assert.deepEqual([count(value.index),count(value.copy),count(value.collection)],[1,1,1]);
 // Omitting Cargo on this no-derive/canonical-type fixture uses one fresh ordinary binder.
 const noCargo=adopt(proposeCoreJsonIndicesCorpus,input,undefined);assert.equal(count(noCargo),1);const derived=adopt(proposeCoreJsonIndicesCorpus,files('extern crate self as link_assistant_router;#[derive(Clone)]struct Marker{field:bool}'+bodies));assert.equal(count(derived),1);assert.ok(derived.producerEffects);const result=project(value.collection.after);yes(result,['child.index','child.copied','child.mapped']);
 await targets(result,api=>{const input=json({v:'Ω'});assert.deepEqual(native(api['child.index'](input)),{v:'Ω'});assert.deepEqual(native(api['child.copied'](input)),{v:'Ω'});assert.deepEqual(api['child.mapped'](Object.freeze([input])).map(native),[{v:'Ω'}]);});
});
test('external malformed raw underscore and reserved aliases never discharge the refusal',()=>{
 for(const declaration of ['extern crate custom as link_assistant_router;','extern crate self;','extern crate self as _;','extern crate self as std;','extern crate self as serde_json;','extern crate self as Option;','extern crate self as translation_core;','extern crate self as r#owned;','extern crate self as owned extra;']){
  const input=files(declaration+bodies);for(const tool of [proposeCoreJsonIndicesCorpus,proposeCoreJsonCopiesCorpus,proposeCoreJsonCollectionsCorpus]){const value=adopt(tool,input);assert.equal(count(value),0,declaration);assert.deepEqual(value.after,value.before);}
 }
});
test('alias collisions imports globs cfg and declaration producers remain conservative',()=>{
 for(const source of ['extern crate self as owned;struct owned;','extern crate self as owned;extern crate self as owned;','extern crate self as owned;use crate::translation_core as owned;','extern crate self as owned;use external::*;','#[cfg(unknown_feature)]extern crate self as owned;','#[unknown_producer]extern crate self as owned;','extern crate self as owned;#[unknown_producer]struct Marker;']){
  for(const tool of [proposeCoreJsonIndicesCorpus,proposeCoreJsonCopiesCorpus,proposeCoreJsonCollectionsCorpus]){const value=adopt(tool,files(source+bodies));assert.equal(count(value),0,source);assert.deepEqual(value.after,value.before);}
 }
 const shadow=chain(files('extern crate self as owned;mod child{struct owned;'+bodies+'}'));assert.deepEqual([count(shadow.index),count(shadow.copy),count(shadow.collection)],[0,0,0]);
});
test('selector rejects copied declarations foreign contexts and source changes with no public permit',()=>{
 const input=files('extern crate self as owned;'+bodies),{graph,select}=selector(input),module=graph.modules.find(row=>!row.path.length),item=originalSourceModuleItems(module).find(row=>row.tokens.some(token=>token.text==='extern'));
 assert.equal(select(module,item),true);assert.equal(select({...module},item),false);assert.equal(select(module,{...item,start:item.start+1}),false);assert.throws(()=>createCoreAdoptionSelfAliasSelector({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,context:{schema:'private-core-adoption-producer-context-v1'}}),/foreign|copied/);
 const before=module.source;try{module.source=before+'\n// changed';assert.throws(()=>select(module,item),/graph changed/);}finally{module.source=before;}assert.equal(select(module,item),true);
});
test('own source and Cargo accessors are not invoked and final source mutation still refuses',()=>{
 let calls=0;assert.throws(()=>proposeCoreJsonIndicesCorpus({get files(){calls++;return files(bodies);}}),/own data/);assert.throws(()=>proposeCoreJsonCollectionsCorpus({files:files(bodies),dependencyInputs:{get manifest(){calls++;return dependencyInputs.manifest;},lock:dependencyInputs.lock}}),/own data/);assert.equal(calls,0);
 const input=files('extern crate self as owned;'+bodies),before=input['src/lib.rs'],update=Hash.prototype.update;let changed=false;try{Hash.prototype.update=function(value,...args){if(!changed&&value===before){changed=true;input['src/lib.rs']=before+'\n';}return Reflect.apply(update,this,[value,...args]);};assert.throws(()=>proposeCoreJsonCopiesCorpus({files:input,dependencyInputs}),/files changed/);}finally{Hash.prototype.update=update;input['src/lib.rs']=before;}assert.equal(changed,true);assert.equal(count(adopt(proposeCoreJsonCopiesCorpus,input)),1);
});
test('complete actual lib and structured parent are retained with exact projected entry and no wholecrate gain claim',()=>{
 const root=readFileSync(new URL('../../../rust/src/lib.rs',import.meta.url),'utf8'),parent=readFileSync(new URL('../../../rust/src/structured_output.rs',import.meta.url),'utf8'),items=sourceItems(root),alias=items.filter(item=>root.slice(item.start,item.end).trim()==='extern crate self as link_assistant_router;'),edges=items.filter(item=>item.term==='mod'&&['translation_core','structured_output'].includes(item.name));assert.equal(alias.length,1);assert.equal(edges.length,2);
 const selected=[...alias,...edges].sort((a,b)=>a.start-b.start),projection=selected.map(item=>root.slice(item.start,item.end)).join('\n'),input={...core,'src/lib.rs':projection,'src/structured_output.rs':parent};
 retain('complete-actual-parents-and-projection',{root,parent,rootSha256:hash(root),parentSha256:hash(parent),rootMeta:transportConcreteSyntaxSource(root,{language:'Rust'}).meta,projection,selected:selected.map(item=>({span:[item.start,item.end],source:root.slice(item.start,item.end)})),domain:'Exact original items projected for a bounded carrier; omitted original root siblings and namespace outcomes are not a wholecrate coverage claim.'});
 const value=adopt(proposeCoreJsonIndicesCorpus,input),row=value.proposals.find(row=>row.file==='src/structured_output.rs');assert.equal(row.before.source,parent);assert.equal(row.after.source,parent);assert.equal(count(value),0);assert.deepEqual(value.before,value.after);assert.deepEqual(row.selections,[]);const census=qualifiedCoreCallSyntax(parent,['json_map_index','json_index_str']);retain('complete-current-qualified-index-syntax-census',census);assert.deepEqual(census.calls.map(call=>[call.owner.name,call.operation,call.argumentTokens.map(token=>[token.type,token.text])]),[['chat_to_responses_format','json_map_index',[['punct','&'],['ident','definition'],['punct',','],['string','"name"']]],['responses_to_chat_format','json_index_str',[['punct','&'],['ident','format'],['punct',','],['string','"name"']]]]);const result=project(value.after);retain('complete-parent-after-outcomes',result);assert.ok(Array.isArray(result.meta.executable));assert.ok(Array.isArray(result.meta.refused));assert.ok(row.preserved.every(row=>!row.problems?.includes('opaque or external crate binding requires separate source scope')));
});
