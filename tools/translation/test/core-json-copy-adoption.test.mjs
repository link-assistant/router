import testCase from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeCoreJsonIndicesCorpus} from '../migrate-core-json-indices.mjs';
import {proposeCoreJsonCopiesCorpus} from '../migrate-core-json-copies.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {proposeCoreAdoptionSequence,CORE_ADOPTION_PACKET_LIMITS as L} from '../propose-core-adoption-corpus.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {qualifiedCoreCallSyntax} from './qualified-core-call-syntax.mjs';
const C='crate::translation_core::',T=C+'Json',J=C+'json!',hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:fs.readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:fs.readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')},jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
const files=source=>({'src/lib.rs':(source.startsWith('\uFEFF')?'\uFEFFpub mod translation_core;\n'+source.slice(1):'pub mod translation_core;\n'+source),'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE});
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_JSON_COPY_ADOPTION_VECTOR_DIR){fs.mkdirSync(process.env.ROUTER_JSON_COPY_ADOPTION_VECTOR_DIR,{recursive:true});fs.writeFileSync(join(process.env.ROUTER_JSON_COPY_ADOPTION_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let old=0,current=0,source=row.after.source;
 for(const part of row.mapping){assert.equal(part.before[0],old);assert.equal(part.after[0],current);if(part.kind==='unchanged')assert.equal(row.before.source.slice(...part.before),row.after.source.slice(...part.after));else{assert.equal(row.before.source.slice(...part.before),part.expected);assert.equal(row.after.source.slice(...part.after),part.replacement);}old=part.before[1];current=part.after[1];}
 assert.equal(old,row.before.source.length);assert.equal(current,row.after.source.length);for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);
}
function propose(input,extra={}){const value=proposeCoreJsonCopiesCorpus({files:input,compilationProfile:PRODUCTION_PROFILE,dependencyInputs,...extra});for(const row of value.proposals)inverse(row);return retain('complete-proposal',{input,value}).value;}
const count=result=>result.proposals.reduce((sum,row)=>sum+row.selections.length,0);
const project=input=>retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencyInputs.manifest,jsonMacroDependencies,deriveDependencies}));
const yes=(result,names)=>{for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));};
const json=value=>{const result=serde_json_from_str(JSON.stringify(value));assert.equal(result.$,'Ok');return result.field0;};
const native=value=>{const result=serde_json_to_string(value);assert.equal(result.$,'Ok');return JSON.parse(result.field0);};
async function targets(result,verify){const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-wire-targets',{wire,javascript:result.javascript,typescript:result.typescript});await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}
const body='pub fn copied(value:&'+T+')->'+T+'{value.clone()}';

test('shared canonical clone adopts to one owned copy with independent JS and strict TS behavior',async()=>{
 const input=files(body),before=project(input),proposal=propose(input);assert.equal(count(proposal),1);assert.equal(proposal.schema,'router-owned-json-copy-corpus-v1');assert.equal(proposal.executableAdmission,false);const selected=proposal.proposals[0].selections[0];assert.equal(selected.oldTraitDispatchProved,false);assert.deepEqual(selected.evaluationOrder,['receiver-once']);assert.equal(proposal.after['src/lib.rs'],'pub mod translation_core;\npub fn copied(value:&'+T+')->'+T+'{'+C+'json_copy(value)}');retain('complete-before-admissions',before);const result=project(proposal.after);yes(result,['copied']);
 await targets(result,api=>{for(const value of [null,false,0,'猫😀',[],[true,{v:'Ω'}],JSON.parse('{"v":{"array":[false,null]},"__proto__":"safe"}')]){const original=json(value),snapshot=structuredClone(original),copy=api.copied(original);assert.deepEqual(native(copy),value);assert.deepEqual(original,snapshot);if(original.$!=='Null')assert.notStrictEqual(copy,original);}});
});
test('Some if-let true branches and let-else aliases preserve absent paths and readonly reader origins',async()=>{
 const source='pub fn choose(value:&'+T+')->'+T+'{if let Some(found)=value.get("v"){found.clone()}else{'+J+'(null)}}pub fn alias(value:&'+T+')->'+T+'{let Some(found)=value.get("v")else{return '+J+'(false);};let alias=found;alias.clone()}',proposal=propose(files(source));assert.equal(count(proposal),2);assert.ok(proposal.proposals[0].selections[0].candidateRole.evidence.some(row=>row.kind==='Some-if-let-true-branch'));const result=project(proposal.after);yes(result,['choose','alias']);
 await targets(result,api=>{for(const value of [{v:{deep:['猫😀']}},{v:null},{},null]){const original=json(value),snapshot=structuredClone(original);assert.deepEqual(native(api.choose(original)),value&&typeof value==='object'&&Object.hasOwn(value,'v')?value.v:null);assert.deepEqual(native(api.alias(original)),value&&typeof value==='object'&&Object.hasOwn(value,'v')?value.v:false);assert.deepEqual(original,snapshot);}});
});
test('Cargo-bound renamed Value Map and block-error reader aliases retain complete declaration evidence',()=>{
 const source='use serde_json::{Value as V,Map as M};pub fn copied(value:&V)->'+T+'{value.clone()}pub fn map_child(map:&M<String,V>)->'+T+'{let Some(child)=map.get("x")else{return '+J+'(null);};child.clone()}pub fn error(value:&V)->'+C+'Outcome<'+T+',String>{let child=value.get("v").ok_or_else(||{('+C+'format!("{}","missing"))})?;Ok(child.clone())}',proposal=propose(files(source));assert.equal(count(proposal),3);assert.ok(proposal.proposals[0].selections[0].imports.some(row=>row.role?.role.dependency?.package==='serde_json'));
 for(const dependencies of [undefined,{...dependencyInputs,lock:dependencyInputs.lock+'\n# changed'}]){const untouched=propose(files(source),{dependencyInputs:dependencies});assert.equal(count(untouched),0);assert.deepEqual(untouched.after,untouched.before);}
 const nested=files('mod nested{pub(super) fn copied(value:&'+T+')->'+T+'{value.clone()}}');assert.equal(count(propose(nested)),1);
});
test('unknown Clone dispatch and owned mutable deep Map text or escaped conditional binders stay original',()=>{
 for(const source of [
  'pub fn no(value:'+T+')->'+T+'{value.clone()}',
  'pub fn no(value:&mut '+T+')->'+T+'{value.clone()}',
  'pub fn no(value:&&'+T+')->'+T+'{value.clone()}',
  'pub fn no(value:&'+C+'Str)->String{value.clone()}',
  'use serde_json::{Value,Map};pub fn no(value:&Map<String,Value>)->'+T+'{value.clone()}',
  'trait CloneCompetition{}'+body,
  'use external::Clone;'+body,
  'use external::*;'+body,
  '#[unknown_producer]pub struct Marker{}'+body,
  'pub fn no(value:&'+T+')->'+T+'{let value=unknown();value.clone()}',
  'pub fn no(value:&'+T+')->'+T+'{let mut value=value;value.clone()}',
  'pub fn no(value:&'+T+')->'+T+'{if let Some(value)=unknown(){value.clone()}else{'+J+'(null)}}',
  'pub fn no(value:&'+T+')->'+T+'{if let Some(found)=value.get("v"){}found.clone()}',
  'pub fn no(value:&'+T+')->'+T+'{if let Some(found)=value.get("v"){'+J+'(null)}else{found.clone()}}',
  'pub fn no(value:&'+T+')->'+T+'{unknown(||value.clone())}',
  'pub fn no(value:&'+T+')->'+T+'{unknown!(value.clone())}',
  'pub fn no(value:&'+T+')->'+T+'{value /*selector comment*/ .clone()}',
  'pub fn no(value:&'+T+')->'+T+'{value.clone(unknown())}',
  'pub fn no(value:&'+T+')->'+T+'{value.get("v").clone()}',
 ]){const proposal=propose(files(source));assert.equal(count(proposal),0,source);assert.deepEqual(proposal.after,proposal.before,source);}
 // Reusing an outer name is allowed only on the actual outer else/continuation.
 const scoped=propose(files('pub fn scoped(value:&'+T+')->'+T+'{if let Some(value)=unknown(){value.clone()}else{value.clone()}}'));assert.equal(count(scoped),1);assert.ok(scoped.after['src/lib.rs'].includes('{value.clone()}else{'+C+'json_copy(value)}'));
});
test('own-data options Cargo and full sources reject zero-call hooks and final native-hash mutations',()=>{
 let calls=0;for(const make of [()=>Object.defineProperty({files:files(body)},'entry',{get(){calls++;return 'src/lib.rs';}}),()=>({files:new Proxy({}, {ownKeys(){calls++;return [];}})}),()=>({files:files(body),dependencyInputs:Object.defineProperty({lock:dependencyInputs.lock},'manifest',{get(){calls++;return dependencyInputs.manifest;}})})])assert.throws(()=>proposeCoreJsonCopiesCorpus(make()),/own data|own-data|source map|files/);assert.equal(calls,0);
 const input=files(body),before=input['src/lib.rs'],update=Hash.prototype.update;let changed=false;try{Hash.prototype.update=function(value,...args){if(!changed&&value===before){changed=true;input['src/lib.rs']=before+'\n';}return Reflect.apply(update,this,[value,...args]);};assert.throws(()=>proposeCoreJsonCopiesCorpus({files:input,dependencyInputs}),/files changed/);}finally{Hash.prototype.update=update;input['src/lib.rs']=before;}assert.equal(changed,true);
 const dependencies={...dependencyInputs};changed=false;try{Hash.prototype.update=function(value,...args){if(!changed&&value===before){changed=true;dependencies.lock+='\n';}return Reflect.apply(update,this,[value,...args]);};assert.throws(()=>proposeCoreJsonCopiesCorpus({files:input,dependencyInputs:dependencies}),/dependency inputs changed/);}finally{Hash.prototype.update=update;}assert.equal(changed,true);
 assert.throws(()=>proposeCoreJsonCopiesCorpus({files:input,mode:'owned'}),/fields differ/);
 const counterfeit=files(body);counterfeit['src/translation_core/primitives.rs']+='\n';assert.throws(()=>propose(counterfeit),/complete current owned/);assert.equal(count(propose(input)),1);
});
test('index mode keeps old conservative binder scope while copies retain UTF16 sources and actual branch identity',()=>{
 const source='\uFEFF// Ω😀\r\npub fn copied(value:&'+T+')->'+T+'{if let Some(child)=value.get(r#"猫😀"#){'+J+'({"v":child.clone(),"index":child["v"]})}else{'+J+'(null)}}\r\n',input=files(source),indices=proposeCoreJsonIndicesCorpus({files:input,dependencyInputs}),copies=propose(input);assert.equal(count(indices),0);assert.deepEqual(indices.before,indices.after);assert.equal(indices.schema,'router-owned-json-index-corpus-v1');assert.equal(count(copies),1);const row=copies.proposals[0];assert.ok(row.after.source.includes('child["v"]'));assert.ok(row.after.source.endsWith('\r\n'));assert.ok(row.after.source.includes(rText()));inverse(row);assert.deepEqual(row.trace.map(value=>value.phase),['language','repository']);
 const macro=propose(files('pub fn macro_copy(value:&'+T+')->'+T+'{'+J+'({"value":value.clone()})}'));assert.equal(count(macro),1);assert.ok(macro.after['src/lib.rs'].includes(J+'({"value":'+C+'json_copy(value)})'));
 function rText(){return 'r#"猫😀"#';}
});
test('complete current structured and tool parents retain all three fresh proposal stages and independent outcomes',()=>{
 for(const path of ['src/structured_output.rs','src/openai_tools.rs']){const source=fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),input={...files('mod actual;'),'src/actual.rs':source},before=project(input),indices=proposeCoreJsonIndicesCorpus({files:input,dependencyInputs}),copies=propose(indices.after),updates=proposeCoreJsonUpdateCorpus({files:copies.after,dependencyInputs}),after=project(updates.after);retain('complete-current-stages',{path,source,sha256:hash(source),before,indices,copies,updates,after});for(const stage of [indices,copies,updates])for(const row of stage.proposals)inverse(row);assert.deepEqual(copies.before,indices.after);assert.deepEqual(updates.before,copies.after);const selected=copies.proposals.flatMap(row=>row.selections);assert.equal(selected.length,0);assert.deepEqual(copies.before,copies.after);assert.equal(copies.before['src/actual.rs'],source);assert.equal(copies.after['src/actual.rs'],source);const census=qualifiedCoreCallSyntax(source,['json_copy']);retain('complete-current-qualified-copy-syntax-census',{path,census});if(path.includes('structured'))assert.deepEqual(census.calls.map(row=>[row.owner.name,row.operation,row.argumentTokens.map(token=>[token.type,token.text])]),[['chat_to_responses_format','json_copy',[['ident','strict']]],['responses_to_chat_format','json_copy',[['ident','strict']]]]);}
});
function receiving(source){const parent=fs.mkdtempSync(join(tmpdir(),'router-json-copy-proposal-')),root=join(parent,'input');fs.mkdirSync(root);const input=Object.fromEntries(Object.entries(files(source)).sort(([a],[b])=>a<b?-1:a>b?1:0));for(const [path,text]of Object.entries(input)){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),text);}for(const [path,text]of [['Cargo.toml',dependencyInputs.manifest],['Cargo.lock',dependencyInputs.lock]])fs.writeFileSync(join(root,path),text);return {root,parent,input,output:join(parent,'proposal'),close(){fs.rmSync(parent,{recursive:true,force:true});}};}
function readPackets(output){const index=JSON.parse(fs.readFileSync(join(output,'index.json'),'utf8')),get=row=>JSON.parse(fs.readFileSync(join(output,row.path),'utf8'));for(const row of index.packets){const raw=fs.readFileSync(join(output,row.path));assert.equal(hash(raw),row.sha256);assert.equal(raw.length,row.bytes);assert.ok(row.bytes<=L.packetBytes);}assert.deepEqual(index.limits,L);assert.equal(index.packetBytes,index.packets.reduce((sum,row)=>sum+row.bytes,0));const assemble=(row,replacements)=>{const meta=get(row);return Object.fromEntries(meta.keys.map(key=>[key,Object.hasOwn(replacements,key)?replacements[key]:meta.values[key]]));};const stage=index.stages[0],p=stage.packets,g=p.moduleGraph,proposal=assemble(p.metadata,{before:Object.fromEntries(p.before.map(row=>{const value=get(row);return [value.path,value.source];})),after:Object.fromEntries(p.after.map(row=>{const value=get(row);return [value.path,value.source];})),inputs:p.inputs.map(get),proposals:p.proposals.map(get),moduleGraph:assemble(g.metadata,{modules:g.modules.map(get),edges:get(g.edges),diagnostics:get(g.diagnostics),concreteSyntaxMeta:g.concreteSyntaxMeta.map(get)})});return {index,proposal};}
test('standalone same-engine CLI retains every API field packet source identity inverse and Cargo checkpoint',async()=>{
 const f=receiving(body),script=fileURLToPath(new URL('../propose-core-adoption-corpus.mjs',import.meta.url));try{const child=spawnSync(process.execPath,[script,'--root',f.root,'--output',f.output,'--sequence','json-copies'],{encoding:'utf8',timeout:20_000,maxBuffer:1024*1024});retain('complete-cold-CLI',{status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message}});assert.equal(child.status,0);assert.equal(child.signal,null);assert.equal(JSON.parse(child.stdout).sequence,'json-copies');const actual=readPackets(f.output),direct=propose(f.input);retain('complete-published-sequence',{actual,direct});assert.equal(JSON.stringify(actual.proposal),JSON.stringify(direct));assert.equal(actual.index.stages.length,1);assert.deepEqual(actual.index.stages[0].trace.map(row=>row.phase),['language','repository']);assert.equal(actual.index.stages[0].summary.selections,1);assert.equal(actual.index.semanticAdmission,false);for(const [path,source]of Object.entries(f.input))assert.equal(fs.readFileSync(join(f.root,path),'utf8'),source);for(const row of direct.proposals)inverse(row);
 const update=Hash.prototype.update,output=join(f.parent,'changed-Cargo');let changed=false;try{Hash.prototype.update=function(value,...args){if(!changed&&fs.existsSync(join(output,'json-copies/metadata.json'))){changed=true;fs.appendFileSync(join(f.root,'Cargo.lock'),'\n');}return Reflect.apply(update,this,[value,...args]);};await assert.rejects(proposeCoreAdoptionSequence({root:f.root,output},'json-copies'),/Cargo input changed/);}finally{Hash.prototype.update=update;fs.writeFileSync(join(f.root,'Cargo.lock'),dependencyInputs.lock);}assert.equal(changed,true);assert.equal(fs.existsSync(join(output,'index.json')),false);retain('complete-failed-publication',JSON.parse(fs.readFileSync(join(output,'failure.json'),'utf8')));assert.equal((await proposeCoreAdoptionSequence({root:f.root,output:join(f.parent,'restored')},'json-copies')).complete,true);
 }finally{f.close();}
});
