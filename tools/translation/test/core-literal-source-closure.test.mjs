import testCase from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {proposeCoreLiteralTextCorpus} from '../migrate-core-literal-text.mjs';
import {createCoreAdoptionProducerContext,createCoreAdoptionNonTraitImportSelector,finishCoreAdoptionProducerContext} from '../core-adoption-producer-context.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',S='&'+C+'Str',T=C+'Text';
const core={'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE};
const dependencyInputs={manifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const hash=value=>createHash('sha256').update(value).digest('hex'),read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const copied=`pub fn copied(value:${S})->${T}{value.to_owned()}`;
const files=(root,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+root,...core,...extra});
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async()=>{vectors=[];try{await run();}finally{const directory=process.env.ROUTER_LITERAL_SOURCE_CLOSURE_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,Buffer.from(name).toString('hex')+'.json.gz'),gzipSync(JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)));}}});
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);
 let restored=row.after.source;for(const part of [...row.mapping].reverse()){if(part.kind==='unchanged')assert.equal(row.before.source.slice(...part.before),row.after.source.slice(...part.after));else{assert.equal(restored.slice(...part.after),part.replacement);restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}}
 assert.equal(restored,row.before.source);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);assert.equal(row.executableAdmission,false);
}
function proposal(input,options={}){const result=retain('complete-source-proposal',proposeCoreLiteralTextCorpus({files:input,dependencyInputs,...options}));for(const row of result.proposals)inverse(row);return result;}
const conversions=result=>result.proposals.flatMap(row=>row.selections.flatMap(selection=>selection.conversions));
const sourceRoles=result=>result.proposals.flatMap(row=>row.importRoles??[]).filter(row=>row.role?.kind==='original-producer-closed-nontrait-candidate');
function project(input){return retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],cargoManifest:dependencyInputs.manifest,deriveDependencies:loadDeriveDependencyProof(dependencyInputs)}));}
async function targets(result,name,verify){
 const declaration=result.executableDeclarations.find(row=>row.name===name||row.name.endsWith('::'+name));assert.ok(declaration,JSON.stringify(result.meta.refused));
 const lowered=declaration.lower(),mapping=lowered.emitted.mappings.find(row=>row.source===declaration.name||row.source===name);assert.ok(mapping,name);
 const canonical=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(canonical)),canonical);retain('complete-checked-meta',canonical);
 const output={...result,javascript:result.javascript+`\nexport {${mapping.target} as answer};`,typescript:result.typescript+`\nexport {${mapping.target} as answer};`};
 try{await verifyTypedTargets(output,(_api,_result,module)=>verify(module.answer),{childTimeoutMs:20000});}catch(error){retain('strict-child-failure',{name,message:error.message,stdout:error.stdout?.toString('utf8')??null,stderr:error.stderr?.toString('utf8')??null});throw error;}
}
const textBehavior=answer=>{for(const value of ['','ASCII','猫😀','\0\r\n'])assert.equal(answer(value),value);let calls=0;assert.throws(()=>answer(new Proxy({},{get(){calls++;throw new Error('coercion');}})),TypeError);assert.equal(calls,0);};
function none(input){const result=proposal(input);assert.equal(conversions(result).length,0);return result;}
function context(input){const graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],compilationProfile:PRODUCTION_PROFILE}),token=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,dependencyInputs});assert.ok(token);return {graph,token,selector:createCoreAdoptionNonTraitImportSelector({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,context:token})};}

test('complete actual PTY source supplies only its original constant role to a checked shared-text body',async()=>{
 const pty=read('src/login_pty.rs'),original=read('src/login_url.rs');retain('complete-original-parents',{pty:{source:pty,sha256:hash(pty)},login:{source:original,sha256:hash(original)}});
 const input=files('mod login_pty;use crate::login_pty::PTY_COLS;'+copied,{'src/login_pty.rs':pty}),value=proposal(input);
 assert.equal(conversions(value).length,1);assert.ok(sourceRoles(value).some(row=>row.name==='PTY_COLS'&&row.role.roles.every(role=>role.kind==='const'&&role.declaration.original.includes('PTY_COLS'))));
 await targets(project(value.after),'copied',textBehavior);
 const full=proposal(files('mod login_pty;mod login_url;',{'src/login_pty.rs':pty,'src/login_url.rs':original}));assert.equal(full.before['src/login_url.rs'],original);retain('complete-original-login-outcome',project(full.after));
});

test('actual private derive output closes local nominal and value import candidates without checking their bodies',async()=>{
 const input=files('mod definitions;use crate::definitions::{Marker,WIDTH};'+copied,{'src/definitions.rs':'#[derive(Clone,Debug)]pub struct Marker{ready:bool}pub const WIDTH:u16=400;'}),value=proposal(input);
 assert.equal(conversions(value).length,1);assert.ok(sourceRoles(value).some(row=>row.name==='Marker'));assert.ok(sourceRoles(value).some(row=>row.name==='WIDTH'));assert.ok(value.producerEffects.selections.length);
 for(const row of sourceRoles(value)){assert.equal(row.executableAdmission,false);assert.equal(row.role.namespaceComplete,false);assert.equal(row.role.originalDispatchProved,false);}
 await targets(project(value.after),'copied',textBehavior);
 const absent=proposal(input,{dependencyInputs:undefined});assert.equal(conversions(absent).length,0);
});

test('named reexports aliases inline owners and separate namespaces retain exact original declaration joins',async()=>{
 const input=files('mod outer{pub mod definitions{#[derive(Clone,Debug)]pub struct Marker{ready:bool}pub const WIDTH:u16=7;}pub use self::definitions::{Marker,WIDTH};}use crate::outer::{Marker as Record,WIDTH as LIMIT};'+copied),value=proposal(input);
 assert.equal(conversions(value).length,1);const roles=sourceRoles(value);assert.ok(roles.some(row=>row.name==='Record'&&row.role.roles.every(role=>role.target.join('::')==='crate::outer::definitions::Marker')));assert.ok(roles.some(row=>row.name==='LIMIT'));
 await targets(project(value.after),'copied',textBehavior);
});

test('container helper ownership comes from the original registered derive invocation and not attribute spelling',async()=>{
 const definition='#[derive(serde::Serialize)]#[serde(rename_all="snake_case")]pub struct Marker{ready:bool}',input=files('mod definitions;use crate::definitions::Marker;'+copied,{'src/definitions.rs':definition}),value=proposal(input);
 assert.equal(conversions(value).length,1);assert.ok(sourceRoles(value).some(row=>row.name==='Marker'));assert.ok(value.producerEffects.selections.some(row=>row.file==='src/definitions.rs'));
 await targets(project(value.after),'copied',textBehavior);
 none({...input,'src/definitions.rs':definition.replace('serde(rename_all','unregistered(rename_all')});none({...input,'src/definitions.rs':definition.replace('#[derive(serde::Serialize)]','')});
});

test('unknown traits globs competing imports configurations and attribute producers remain full-source refusals',()=>{
 for(const definition of ['#[unknown]pub struct Marker;pub const WIDTH:u16=7;','#[cfg(feature="unstated")]pub struct Marker;pub const WIDTH:u16=7;','pub use missing::*;#[derive(Clone,Debug)]pub struct Marker;pub const WIDTH:u16=7;'])none(files('mod definitions;use crate::definitions::WIDTH;'+copied,{'src/definitions.rs':definition}));
 const definition='#[derive(Clone,Debug)]pub struct Marker;pub trait Alternate{fn to_owned(&self)->String;}';
 for(const imported of ['use crate::definitions::Alternate;','use crate::definitions::*;','use crate::definitions::Marker;use unknown::Marker;','use crate::definitions::Marker as ToOwned;'])none(files('mod definitions;'+imported+copied,{'src/definitions.rs':definition}));
 none(files('mod definitions;use crate::definitions::Marker;'+copied,{'src/definitions.rs':'#[derive(custom::Clone)]pub struct Marker;'}));
});

test('copied contexts wrong source spans profiles and declaration routes cannot issue migration roles',()=>{
 const input=files('mod definitions;use crate::definitions::WIDTH;'+copied,{'src/definitions.rs':'#[derive(Clone,Debug)]pub struct Marker;pub const WIDTH:u16=9;'}),{graph,token,selector}=context(input),module=graph.modules.find(row=>row.path.length===0),item=originalSourceModuleItems(module).find(row=>row.term==='use'),leaf=originalUseDeclarationLeaves(item,module.path)[0];
 assert.ok(selector.select(module,item,leaf));assert.throws(()=>createCoreAdoptionNonTraitImportSelector({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,context:{...token}}),TypeError);
 assert.equal(selector.select({...module},item,leaf),null);assert.equal(selector.select(module,{...item,start:item.start+1},leaf),null);assert.equal(selector.select(module,item,{...leaf,segments:['crate','missing','WIDTH']}),null);
 assert.throws(()=>createCoreAdoptionNonTraitImportSelector({modules:graph.modules,compilationProfile:{flags:{test:true}},context:token}),TypeError);
 const changed=graph.modules.map(row=>row===module?{...row,source:row.source+'\n// changed'}:row);assert.throws(()=>createCoreAdoptionNonTraitImportSelector({modules:changed,compilationProfile:PRODUCTION_PROFILE,context:token}),TypeError);none({...input,'src/definitions.rs':'#[unknown]pub struct Marker;pub const WIDTH:u16=9;'});selector.verify();retain('complete-private-context-output',finishCoreAdoptionProducerContext(token));
});

test('fresh tracked path plans preserve physical inline and nested original module selections',async()=>{
 for(const [root,extra,name]of [
  ['#[path="sources/relocated.rs"]mod selected;',{'src/sources/relocated.rs':copied},'copied'],
  ['mod outer{#[path="relocated.rs"]mod selected;}',{'src/outer/relocated.rs':copied},'copied'],
 ]){const value=proposal(files(root,extra));assert.equal(conversions(value).length,1);assert.ok(value.moduleGraph.edges.some(edge=>edge.pathSelection?.explicitPath==='sources/relocated.rs'||edge.pathSelection?.explicitPath==='relocated.rs'));await targets(project(value.after),name,textBehavior);}
 none(files('#[path="selected.rs"]#[unknown]mod selected;',{'src/selected.rs':copied}));none(files('#[cfg(feature="unknown")]#[path="selected.rs"]mod selected;',{'src/selected.rs':copied}));none(files('#[path="selected.rs"]#[path="other.rs"]mod selected;',{'src/selected.rs':copied,'src/other.rs':copied}));none(files('#[path=not_a_literal]mod selected;',{'src/selected.rs':copied}));
 const missing=proposal(files('#[path="missing.rs"]mod selected;'+copied));assert.equal(conversions(missing).length,0);assert.ok(missing.moduleGraph.diagnostics.length);
});

test('whole canonical and remote parents retain unresolved external traits and independent semantic outcomes',()=>{
 const paths=['src/lib.rs','src/model_catalog_sources.rs','src/model_catalog_sources_config.rs','src/model_catalog_sources_fetch.rs','src/model_catalog_sources_projection.rs','src/model_contract.rs','src/auth_remote.rs','src/managed_server.rs'];
 const originals=Object.fromEntries(paths.map(path=>[path,read(path)]));retain('complete-current-original-parents',Object.entries(originals).map(([path,source])=>({path,source,sha256:hash(source)})));
 const input=files('mod model_contract;mod model_catalog_sources;mod managed_server;mod auth_remote;',Object.fromEntries(Object.entries(originals).filter(([path])=>path!=='src/lib.rs'))),value=proposal(input);
 const canonical=value.proposals.find(row=>row.file==='src/model_catalog_sources_config.rs');assert.ok(canonical);assert.equal(canonical.before.source,originals['src/model_catalog_sources_config.rs']);assert.ok(canonical.skipped.some(row=>row.function==='canonical_provider'&&row.reason.includes('named import role is unclassified')));
 const remote=value.proposals.find(row=>row.file==='src/auth_remote.rs');assert.ok(remote);assert.equal(remote.before.source,originals['src/auth_remote.rs']);assert.ok(remote.skipped.some(row=>row.reason.includes('named import role is unclassified')));
 assert.ok(value.moduleGraph.edges.some(edge=>edge.pathSelection?.explicitPath==='model_catalog_sources_config.rs'));assert.equal(value.executableAdmission,false);
});
