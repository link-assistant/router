import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {proposeCoreAdoptionSequence,proposeCoreAdoptionCorpus,CORE_ADOPTION_PACKET_LIMITS as L} from '../propose-core-adoption-corpus.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',J=C+'json!';
const BODY='pub fn payload(flag:bool)->'+T+'{let mut doc='+J+'({"initial":true});if flag{doc["flag"]='+J+'([false,"猫😀"]);}doc["last"]='+J+'(null);doc}\n';
const script=fileURLToPath(new URL('../propose-core-adoption-corpus.mjs',import.meta.url)),hash=value=>createHash('sha256').update(value).digest('hex');
const cargo={manifest:fs.readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:fs.readFileSync(repositorySourceURL("Cargo.lock",new URL('../../../',import.meta.url)),'utf8')};
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_CORE_JSON_UPDATE_SEQUENCE_VECTOR_DIR){fs.mkdirSync(process.env.ROUTER_CORE_JSON_UPDATE_SEQUENCE_VECTOR_DIR,{recursive:true});fs.writeFileSync(join(process.env.ROUTER_CORE_JSON_UPDATE_SEQUENCE_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
function fixture(source=BODY,{dependencies=true,extra={}}={}){
 const parent=fs.mkdtempSync(join(tmpdir(),'router-json-update-sequence-')),root=join(parent,'input');fs.mkdirSync(root);
 const inputs={'src/lib.rs':(source.startsWith('\uFEFF')?'\uFEFFpub mod translation_core;\n'+source.slice(1):'pub mod translation_core;\n'+source),'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra};
 const files=Object.fromEntries(Object.entries(inputs).sort(([a],[b])=>a<b?-1:a>b?1:0));for(const [path,text]of Object.entries(files)){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),text);}
 if(dependencies){fs.writeFileSync(join(root,'Cargo.toml'),cargo.manifest);fs.writeFileSync(join(root,'Cargo.lock'),cargo.lock);}
 return {parent,root,files,output:join(parent,'proposal'),close(){fs.rmSync(parent,{recursive:true,force:true});}};
}
function bytes(root){const rows=[];function visit(path){const full=join(root,path);if(fs.lstatSync(full).isDirectory()){for(const name of fs.readdirSync(full).sort())visit(path?path+'/'+name:name);}else rows.push({path,base64:fs.readFileSync(full).toString('base64')});}visit('');return rows;}
function read(output){
 const index=JSON.parse(fs.readFileSync(join(output,'index.json'),'utf8')),get=row=>JSON.parse(fs.readFileSync(join(output,row.path),'utf8'));
 for(const row of index.packets){const raw=fs.readFileSync(join(output,row.path));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.ok(row.bytes<=L.packetBytes);}
 assert.deepEqual(index.limits,L);assert.equal(index.packetBytes,index.packets.reduce((sum,row)=>sum+row.bytes,0));assert.ok(index.packetBytes<L.outputBytes);assert.ok(index.packets.length<=L.packets);
 const assemble=(row,replacements)=>{const meta=get(row);return Object.fromEntries(meta.keys.map(key=>[key,Object.hasOwn(replacements,key)?replacements[key]:meta.values[key]]));};
 const stages=index.stages.map(stage=>{const p=stage.packets,g=p.moduleGraph;return {name:stage.name,proposal:assemble(p.metadata,{before:Object.fromEntries(p.before.map(row=>{const value=get(row);return [value.path,value.source];})),after:Object.fromEntries(p.after.map(row=>{const value=get(row);return [value.path,value.source];})),inputs:p.inputs.map(get),proposals:p.proposals.map(get),moduleGraph:assemble(g.metadata,{modules:g.modules.map(get),edges:get(g.edges),diagnostics:get(g.diagnostics),concreteSyntaxMeta:g.concreteSyntaxMeta.map(get)})})};});
 return {index,stages,dependencyInputs:index.dependencyInputs.map(get)};
}
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let old=0,current=0,restored=row.after.source;
 for(const part of row.mapping){assert.equal(part.before[0],old);assert.equal(part.after[0],current);if(part.kind==='unchanged')assert.equal(row.before.source.slice(...part.before),row.after.source.slice(...part.after));else{assert.equal(part.kind,'substitution');assert.equal(row.before.source.slice(...part.before),part.expected);assert.equal(row.after.source.slice(...part.after),part.replacement);}old=part.before[1];current=part.after[1];}
 assert.equal(old,row.before.source.length);assert.equal(current,row.after.source.length);for(const part of [...row.mapping].reverse())if(part.kind==='substitution')restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);assert.equal(restored,row.before.source);
}
const outcome=async run=>{try{return {value:await run()};}catch(error){return {error:{name:error.name,message:error.message}};}};
const updated=(f,output=f.output)=>proposeCoreAdoptionSequence({root:f.root,output},'json-updates');

test('standalone packets retain the complete update API and preserve original defaults and quotas',async()=>{
 const f=fixture();try{const before=bytes(f.root),direct=proposeCoreJsonUpdateCorpus({files:f.files,compilationProfile:PRODUCTION_PROFILE,dependencyInputs:cargo}),receipt=await updated(f),actual=read(f.output);retain('complete-direct-and-packets',{before,direct,receipt,actual,output:bytes(f.output)});
  assert.equal(JSON.stringify(actual.stages[0].proposal),JSON.stringify(direct));assert.deepEqual(actual.stages.map(row=>row.name),['json-updates']);assert.deepEqual(actual.index.stages[0].trace.map(row=>row.phase),['language','repository']);assert.deepEqual(actual.index.stages[0].trace.map(row=>row.id),['core-adoption:complete-json-updates-corpus','core-adoption:json-updates-complete-packets']);assert.equal(actual.index.schema,'router-core-adoption-sequence-packets-v1');assert.equal(actual.index.semanticAdmission,false);assert.equal(receipt.changedFiles,1);assert.equal(receipt.stages[0].selections,2);assert.deepEqual(bytes(f.root),before);assert.equal(fs.existsSync(join(f.root,'.git')),false);for(const row of direct.proposals)inverse(row);const published=bytes(f.output);await assert.rejects(updated(f),/fresh outside output directory/u);assert.deepEqual(bytes(f.output),published);
  const old=proposeCoreAdoptionCorpus({root:f.root,output:join(f.parent,'old-default')});assert.equal(old.schema,'router-core-adoption-packets-v1');assert.equal(Object.hasOwn(old,'sequence'),false);retain('old-default-receipt',old);
 }finally{f.close();}
});
test('complete BOM Unicode CRLF RHS trivia and exact source inverses survive packet transport',async()=>{
 const source='\uFEFF// Ω😀 original\r\npub fn payload()->'+T+'{let mut doc='+J+'({});doc["猫"] = /* entire RHS */ '+J+'(["e\\u{301}",true]);doc}\r\n',f=fixture(source);try{await updated(f);const actual=read(f.output),proposal=actual.stages[0].proposal,row=proposal.proposals.find(row=>row.file==='src/lib.rs');retain('complete-CST-and-trivia',{source,actual});inverse(row);assert.equal(row.selections.length,1);assert.ok(row.after.source.includes(' =  /* entire RHS */ '));assert.ok(row.after.source.includes('// Ω😀 original\r\n'));assert.ok(row.after.source.endsWith('\r\n'));for(const change of actual.index.changes){assert.equal(fs.readFileSync(join(f.output,change.source.path),'utf8'),proposal.after[change.path]);assert.equal(change.beforeSha256,hash(f.files[change.path]));assert.equal(change.afterSha256,hash(proposal.after[change.path]));}}
 finally{f.close();}
});
test('the old three stages finish before a separate fresh update operation consumes their exact after files',async()=>{
 const source='use serde_json::{Value,json};pub fn payload()->Value{let mut doc=json!({});doc["key"]=json!(true);doc}',f=fixture(source);try{await proposeCoreAdoptionSequence({root:f.root,output:f.output},'json-algebraic-primitives');const first=read(f.output),prior=first.stages.at(-1).proposal.after;assert.deepEqual(first.stages.map(row=>row.name),['json','algebraic','primitives']);
  for(const stage of first.stages)for(const row of stage.proposal.proposals)inverse(row);for(const [path,source]of Object.entries(prior))fs.writeFileSync(join(f.root,path),source);
  const receipt=await updated(f,join(f.parent,'separate-updates')),second=read(join(f.parent,'separate-updates'));retain('complete-distinct-operation-chain',{before:f.files,first,prior,receipt,second});assert.deepEqual(second.stages[0].proposal.before,prior);assert.equal(second.stages.length,1);assert.equal(receipt.stages[0].selections,1);for(const row of second.stages[0].proposal.proposals)inverse(row);assert.equal(first.index.sequence,'json-algebraic-primitives');assert.equal(second.index.sequence,'json-updates');
 }finally{f.close();}
});
test('same engine CLI produces real checked JavaScript and independently strict compiled TypeScript',async()=>{
 const f=fixture();try{const child=spawnSync(process.execPath,[script,'--root',f.root,'--output',f.output,'--sequence','json-updates'],{encoding:'utf8',timeout:20_000,maxBuffer:1024*1024});retain('complete-cli-child',{status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message}});assert.equal(child.status,0);assert.equal(child.signal,null);assert.equal(JSON.parse(child.stdout).sequence,'json-updates');
  const actual=read(f.output),input=actual.stages[0].proposal.after,result=translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(cargo),deriveDependencies:loadDeriveDependencyProof(cargo),cargoManifest:cargo.manifest,compilationProfile:PRODUCTION_PROFILE});retain('complete-source-and-targets',{actual,result});assert.ok(result.meta.executable.some(row=>row.name==='payload'),JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
  try{await verifyTypedTargets(result,({payload})=>{const plain=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};assert.deepEqual(plain(payload(false)),{initial:true,last:null});assert.deepEqual(plain(payload(true)),{initial:true,flag:[false,'猫😀'],last:null});},{childTimeoutMs:20_000});}catch(error){retain('strict-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}
 }finally{f.close();}
});
test('unsupported assignees aliases unknown producers counterfeit cores and unsafe inputs remain refused',async()=>{
 const source='use unknown::*;pub fn blocked()->'+T+'{let mut doc='+J+'({});doc["x"]='+J+'(true);doc}';
 const f=fixture(source);try{await updated(f);const actual=read(f.output);retain('complete-unknown-scope',{source,actual});assert.equal(actual.index.changes.length,0);assert.equal(actual.stages[0].proposal.after['src/lib.rs'],f.files['src/lib.rs']);
  let callbacks=0;const accessor={output:join(f.parent,'getter')};Object.defineProperty(accessor,'root',{enumerable:true,get(){callbacks++;throw Error('getter');}});const proxy=new Proxy({root:f.root,output:join(f.parent,'proxy')},{ownKeys(){callbacks++;return [];}});for(const input of [accessor,proxy,{root:f.root,output:join(f.parent,'extra'),skip:true}])await assert.rejects(proposeCoreAdoptionSequence(input,'json-updates'));assert.equal(callbacks,0);
  fs.symlinkSync(f.root,join(f.parent,'linked'),'dir');await assert.rejects(proposeCoreAdoptionSequence({root:f.root,output:join(f.parent,'linked','new')},'json-updates'),/overlap/u);assert.equal(fs.existsSync(join(f.root,'new')),false);
  fs.writeFileSync(join(f.root,'src/large.rs'),' '.repeat(L.fileUnits+1));await assert.rejects(updated(f,join(f.parent,'large')),/text limit/u);assert.equal(fs.existsSync(join(f.parent,'large')),false);fs.unlinkSync(join(f.root,'src/large.rs'));
 }finally{f.close();}
 for(const body of ['pub fn blocked(mut doc:'+T+')->'+T+'{doc["x"]='+J+'(true);doc}','pub fn blocked()->'+T+'{let mut doc='+J+'({});let alias=&doc;doc["x"]='+J+'(true);doc}','pub fn blocked(key:&'+C+'Str)->'+T+'{let mut doc='+J+'({});doc[key]='+J+'(true);doc}']){const sample=fixture(body);try{await updated(sample);const result=read(sample.output);retain('complete-preserved-unsupported-assignee',{body,result});assert.equal(result.index.changes.length,0);}finally{sample.close();}}
 const counterfeit=fixture(BODY,{extra:{'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE+'\n// altered owned source\n'}});try{await assert.rejects(updated(counterfeit),/complete current owned facade and primitive source/u);assert.equal(fs.existsSync(counterfeit.output),false);}finally{counterfeit.close();}
});
test('physical receiving Cargo is passed to the update proof and freshly rejoined before publication',async()=>{
 const source='#[derive(serde::Serialize)]pub struct Record{value:u8}'+BODY,f=fixture(source);try{const direct=proposeCoreJsonUpdateCorpus({files:f.files,compilationProfile:PRODUCTION_PROFILE,dependencyInputs:cargo}),absent=proposeCoreJsonUpdateCorpus({files:f.files,compilationProfile:PRODUCTION_PROFILE});await updated(f);const actual=read(f.output);retain('complete-Cargo-proof',{cargo,direct,absent,actual});assert.equal(JSON.stringify(actual.stages[0].proposal),JSON.stringify(direct));assert.deepEqual(direct.producerEffects.dependencyInputs,cargo);assert.ok(direct.producerEffects.selections.length);assert.equal(absent.proposals.reduce((sum,row)=>sum+row.edits.length,0),0);assert.deepEqual(actual.dependencyInputs.map(row=>[row.path,row.source]),[['Cargo.toml',cargo.manifest],['Cargo.lock',cargo.lock]]);
  const output=join(f.parent,'changed-cargo'),native=Hash.prototype.update;let calls=0,changed=false,failed;
  try{Hash.prototype.update=function(value,...args){calls++;if(!changed&&fs.existsSync(join(output,'json-updates/metadata.json'))){changed=true;fs.appendFileSync(join(f.root,'Cargo.lock'),'\n');}return Reflect.apply(native,this,[value,...args]);};failed=await outcome(()=>updated(f,output));}finally{Hash.prototype.update=native;fs.writeFileSync(join(f.root,'Cargo.lock'),cargo.lock);}
  const failure=JSON.parse(fs.readFileSync(join(output,'failure.json'),'utf8'));retain('complete-Cargo-mutation',{calls,changed,failed,failure,partial:bytes(output)});assert.ok(calls>0);assert.equal(changed,true);assert.match(failed.error?.message??'',/Cargo input changed/u);assert.equal(failure.complete,false);assert.equal(fs.existsSync(join(output,'index.json')),false);assert.equal((await updated(f,join(f.parent,'restored-cargo'))).complete,true);
 }finally{f.close();}
});
test('real source hash observers cannot publish after changing the physical complete source census',async()=>{
 const f=fixture(),native=Hash.prototype.update;let calls=0,changed=false,failed;try{
  try{Hash.prototype.update=function(value,...args){calls++;if(!changed&&fs.existsSync(join(f.output,'json-updates/metadata.json'))){changed=true;fs.writeFileSync(join(f.root,'src/late.rs'),'pub fn late(){}');}return Reflect.apply(native,this,[value,...args]);};failed=await outcome(()=>updated(f));}finally{Hash.prototype.update=native;if(changed)fs.unlinkSync(join(f.root,'src/late.rs'));}
  const failure=JSON.parse(fs.readFileSync(join(f.output,'failure.json'),'utf8'));retain('complete-source-mutation',{calls,changed,failed,failure,partial:bytes(f.output)});assert.ok(calls>0);assert.equal(changed,true);assert.ok(failed.error);assert.equal(failure.complete,false);assert.ok(failure.packetCount>0);assert.equal(fs.existsSync(join(f.output,'index.json')),false);assert.equal((await updated(f,join(f.parent,'restored'))).complete,true);
 }finally{f.close();}
});
test('actual pending index bytes survive a paired disk failure with no completed index publication',async()=>{
 const f=fixture();try{const original=fs.readFileSync(script,'utf8'),point="writeFileSync(join(target.path,'index.pending.json'),text,{flag:'wx'});",injection=point+"throw new Error('test-only update index failure');";assert.equal(original.split(point).length,2);const injected=original.replace(point,injection),relocations=[];
  const copied=injected.replace(/((?:from\s+|import\()')(\.[^']+)(')/gu,(whole,prefix,specifier,suffix)=>{const replacement=prefix+new URL(specifier,pathToFileURL(script)).href+suffix;relocations.push({whole,replacement});return replacement;});let reversed=copied;for(const row of [...relocations].reverse()){assert.equal(reversed.split(row.replacement).length,2);reversed=reversed.replace(row.replacement,row.whole);}assert.equal(reversed,injected);assert.equal(injected.replace(injection,point),original);
  const file=join(f.parent,'paired-update-producer.mjs');fs.writeFileSync(file,copied);assert.equal(fs.readFileSync(file,'utf8'),copied);const paired=await import(pathToFileURL(file).href),failed=await outcome(()=>paired.proposeCoreAdoptionSequence({root:f.root,output:f.output},'json-updates')),pending=fs.readFileSync(join(f.output,'index.pending.json'),'utf8'),failure=JSON.parse(fs.readFileSync(join(f.output,'failure.json'),'utf8'));retain('complete-paired-publication-failure',{original,injected,copied,relocations,failed,pending,failure,output:bytes(f.output)});assert.match(failed.error?.message??'',/update index failure/u);assert.equal(JSON.parse(pending).sequence,'json-updates');assert.equal(JSON.parse(pending).complete,true);assert.equal(failure.complete,false);assert.equal(fs.existsSync(join(f.output,'index.json')),false);
 }finally{f.close();}
});
