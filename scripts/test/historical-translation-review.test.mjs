import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createHistoricalTranslationReview} from '../historical-translation-review.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,''),baseline='9a31cbbd6885b80bc2ea589999f1731554d783a5';
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(args,input)=>execFileSync('git',args,{cwd:root,input,maxBuffer:256*1024*1024,timeout:30000});
const inventory=JSON.parse(git(['show',baseline+':parity/rust-source-inventory.json']));
const sourceNames=[...inventory.sources.map(row=>row.source),'Cargo.toml','Cargo.lock'];
const frames=git(['cat-file','--batch'],sourceNames.map(name=>baseline+':'+name+'\n').join(''));let at=0;
const sources=new Map(sourceNames.map(name=>{const end=frames.indexOf(10,at),size=Number(frames.subarray(at,end).toString().split(' ')[2]),bytes=frames.subarray(end+1,end+1+size);at=end+2+size;return [name,bytes];}));
const metaBytes=git(['show',baseline+':'+inventory.projects[0].targets.meta]);
const vectors={schema:'historical-translation-review-tests-v1',baseline,baselineMeta:{path:inventory.projects[0].targets.meta,bytes:metaBytes.length,sha256:hash(metaBytes),gitBlob:git(['rev-parse',baseline+':'+inventory.projects[0].targets.meta]).toString().trim()},host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,positive:[],negative:[]};
const save=()=>{if(process.env.ROUTER_HISTORICAL_VECTORS)fs.writeFileSync(process.env.ROUTER_HISTORICAL_VECTORS,JSON.stringify(vectors,null,2)+'\n');};
const create=(readSource=name=>sources.get(name))=>createHistoricalTranslationReview({root,baselineSha:baseline,readSource});
const copy=value=>JSON.parse(JSON.stringify(value));
function refusal(label,fn){let message;assert.throws(fn,error=>{message=error.message;return /Historical translation review/u.test(error.message);});vectors.negative.push({label,message});save();}

test('actual complete historical 720-source graph independently revalidates all three original Default rows',{timeout:180000},()=>{
 const replay=create();try{
  const rows=replay.reviewProject(metaBytes,inventory.projects[0]);assert.equal(rows.length,3);assert.deepEqual(rows.map(row=>row.name),['accounts.limits.LimitCounts.default','token_reservation.RequestBudget.default','upstream_guard.NetworkPolicy.default']);
  for(const row of rows){assert.equal(row.generator,'core::default::Default');assert.equal(row.originalDeclarationTerm,'struct');assert.equal(row.receiver,null);assert.equal(row.runtimeParity,false);assert.equal(row.semanticAuthority,false);assert.match(row.checkedBodySha256,/^[a-f0-9]{64}$/u);assert.equal(row.defaultSourceProof.checkedBody,false);}
  const main=inventory.projects[1];assert.deepEqual(replay.reviewProject(git(['show',baseline+':'+main.targets.meta]),main),[]);
  const provenance=replay.provenance();assert.equal(provenance.implementationInputs.length,721);assert.equal(provenance.originalInputs.length,806);assert.equal(provenance.outputs.length,2653);assert.equal(provenance.projects.reduce((n,p)=>n+p.reviewedGeneratedMethods,0),3);assert.equal(provenance.rustExecuted,false);assert.equal(provenance.semanticAuthority,false);assert.equal(provenance.runtimeParity,false);
  assert.ok(provenance.materializedBytes<16*1024*1024);for(const project of provenance.projects){assert.equal(project.virtualModules.length,3);assert.equal(project.exitCode,0);assert.match(project.node,/^v20\./u);for(const module of project.virtualModules)assert.equal(module.parent,'tools/translation/extensions/core.mjs');}
  const dir=provenance.materializationRoot;replay.close();assert.equal(fs.existsSync(dir),false);refusal('closed-provider',()=>replay.reviewProject(metaBytes,inventory.projects[0]));vectors.positive.push({rows,provenance});save();
 }finally{replay.close();}
});

test('changed counts, source spans, profile, mirrored bodies and proofs cannot alter the immutable baseline',{timeout:180000},()=>{
 const replay=create();try{
  for(const [label,change]of [['count',row=>row.checkedGeneratedMethods++],['profile',row=>row.compilationProfile='foreign'],['copied-inherited-row',row=>Object.setPrototypeOf(row,inventory.projects[0])]]){const row=copy(inventory.projects[0]);change(row);refusal(label,()=>replay.reviewProject(metaBytes,row));}
  let traps=0;const getter=copy(inventory.projects[0]);Object.defineProperty(getter,'entry',{get(){traps++;return 'src/lib.rs';}});refusal('row-getter',()=>replay.reviewProject(metaBytes,getter));refusal('row-proxy',()=>replay.reviewProject(metaBytes,new Proxy(inventory.projects[0],{get(){traps++;}})));assert.equal(traps,0);
  for(const [label,needle,replacement]of [['proof-digest','"originalCompilerPlanDigest":"','"originalCompilerPlanDigest":"f'],['checked-body','"bodySource":"{0}"','"bodySource":"{1}"'],['authority','"runtimeParity":false','"runtimeParity":true'],['original-source','"sourceSha256":"','"sourceSha256":"f'],['count-metadata','"checkedGeneratedMethods":','"forgedGeneratedMethods":']]){
    const text=metaBytes.toString();assert.ok(text.includes(needle),label);const offset=text.indexOf(needle),changed=Buffer.from(text.slice(0,offset)+replacement+text.slice(offset+needle.length));refusal(label,()=>replay.reviewProject(changed,inventory.projects[0]));vectors.negative.push({label,base:vectors.baselineMeta,byteReplacement:{offset,removeBytes:Buffer.byteLength(needle),replacement},bytes:changed.length,sha256:hash(changed)});save();
  }
  const changed=copy(inventory.projects[0]);changed.checkedGeneratedMethods=99;const mirror=Buffer.from(metaBytes.toString().replace('"checkedGeneratedMethods":','"forgedGeneratedMethods":'));refusal('mirrored-count-and-metadata',()=>replay.reviewProject(mirror,changed));
 }finally{replay.close();}
});

test('the actual private loader refuses caller and nested virtual modules and altered file graphs',{timeout:180000},async()=>{
 const replay=create();try{
  const provenance=replay.provenance(),dir=provenance.materializationRoot,loader=await import(pathToFileURL(path.join(dir,'historical-loader.mjs')).href),url='data:text/javascript;base64,'+Buffer.from('export const forged=true;').toString('base64');let calls=0;
  for(const parentURL of [pathToFileURL(path.join(dir,'historical-runner.mjs')).href,pathToFileURL(path.join(dir,'scripts/review-translation-draft.mjs')).href,url])await assert.rejects(loader.resolve(url,{parentURL},async()=>{calls++;return {url};}),/foreign or nested/);
  assert.equal(calls,0);vectors.negative.push({label:'caller-nested-virtual-import',urlSha256:hash(url),calls});save();
  const file=path.join(dir,'tools/translation/derive-dependencies.mjs');fs.chmodSync(file,0o600);fs.appendFileSync(file,'\n// changed\n');refusal('changed-private-module',()=>replay.reviewProject(metaBytes,inventory.projects[0]));
 }finally{replay.close();}
 const extra=create();try{fs.writeFileSync(path.join(extra.provenance().materializationRoot,'foreign.mjs'),'export const forged=true;');refusal('extra-private-module',()=>extra.reviewProject(metaBytes,inventory.projects[0]));}finally{extra.close();}
 const missing=create();try{fs.unlinkSync(path.join(missing.provenance().materializationRoot,'tools/translation/derive-dependencies.mjs'));assert.throws(()=>missing.reviewProject(metaBytes,inventory.projects[0]));vectors.negative.push({label:'missing-private-module'});save();}finally{missing.close();}
 const second=create();try{const dir=second.provenance().materializationRoot,file=path.join(dir,'tools/translation/source-profiles/derive/manifest.json');fs.unlinkSync(file);fs.symlinkSync(path.join(root,'Cargo.toml'),file);refusal('linked-private-profile',()=>second.reviewProject(metaBytes,inventory.projects[0]));}finally{second.close();}
});

test('changed actual original sources, Cargo, foreign roots and unknown compiler versions fail without historical authority',{timeout:180000},()=>{
 let modified=false;const changing=create(name=>modified&&name==='src/accounts_limits.rs'?Buffer.concat([sources.get(name),Buffer.from('changed')]):sources.get(name));try{modified=true;refusal('original-source-mutates-after-prepare',()=>changing.reviewProject(metaBytes,inventory.projects[0]));}finally{changing.close();}
 for(const changed of ['src/accounts_limits.rs','Cargo.toml'])refusal('changed-'+changed,()=>create(name=>name===changed?Buffer.concat([sources.get(name),Buffer.from('\n// changed')]):sources.get(name)));
 refusal('escaping-inventory',()=>createHistoricalTranslationReview({root,baselineSha:baseline,inventoryPath:'../parity/rust-source-inventory.json',readSource:name=>sources.get(name)}));
 refusal('mutable-baseline',()=>createHistoricalTranslationReview({root,baselineSha:'HEAD',readSource:name=>sources.get(name)}));
 refusal('foreign-nested-root',()=>createHistoricalTranslationReview({root:path.join(root,'scripts'),baselineSha:baseline,readSource:name=>sources.get(name)}));
 const foreign=createHistoricalTranslationReview({root,baselineSha:'04318e0285fc10b81d847ccfeb814b6b1c2960a4',readSource:name=>sources.get(name)});assert.equal(foreign,null);
});

test('current generated-method body and compiler-plan validation remains strict and receives no historical exemption',{timeout:120000},async()=>{
 const [{reviewGeneratedMethods},{translateProject},{loadDeriveDependencyProof},{PRODUCTION_PROFILE}]=await Promise.all([import('../review-translation-draft.mjs'),import('../../tools/translation/project.mjs'),import('../../tools/translation/derive-dependencies.mjs'),import('../../tools/translation/cfg-profile.mjs')]);
 const source='#[derive(Default)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default()}',manifest=sources.get('Cargo.toml').toString(),lock=sources.get('Cargo.lock').toString(),dependencies=loadDeriveDependencyProof({manifest,lock});
 const compiled=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}),original=copy(compiled.meta),row={entry:'src/lib.rs',checkedGeneratedMethods:1},review=meta=>reviewGeneratedMethods(meta,row,{readSource:()=>source,dependencies});
 assert.equal(review(original).length,1);assert.equal(original.executable.length,1);assert.equal(original.checkedMethods.length,0);
 for(const [label,mutate]of [['current-plan',meta=>{for(const entry of [meta.checkedGeneratedMethods[0],...meta.checkedSemanticProgram.program.declarations.$map.map(([,value])=>value),...meta.targetSemanticProgram.program.declarations.$map.map(([,value])=>value)]){const proof=entry.defaultSourceProof??entry.impl?.defaultSourceProof;if(proof)proof.originalCompilerPlanDigest='f'.repeat(64);}}],['current-mirrored-body',meta=>{for(const program of [meta.checkedSemanticProgram,meta.targetSemanticProgram]){const entry=program.program.declarations.$map.find(([,value])=>value.impl?.defaultSourceProof)[1];entry.body.value.value=true;}}]]){
  const changed=copy(original);mutate(changed);assert.throws(()=>review(changed));vectors.negative.push({label,source,changed});save();
 }
 vectors.positive.push({label:'current-validation-unchanged',source,original,rows:review(original)});save();
});
