import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {deriveStoredProjectReviewSource} from '../../../scripts/prepare-stored-project-review.mjs';
import {reviewGeneratedMethods,reviewStoredProjectGeneratedMethods} from '../../../scripts/review-translation-draft.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('rust/Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const source='pub fn first(value:Option<i64>)->Option<i64>{value}\n#[derive(Default,Clone,Copy)]pub enum Choice{Before,#[default]Selected}\n#[derive(Default)]pub struct Payload{pub text:String,pub maybe:Option<i64>}\npub fn make_choice()->Choice{Choice::default()}\npub fn make_payload()->Payload{Payload::default()}';
let serial=0;
function retain(label,value){const directory=process.env.ROUTER_STORED_REVIEW_VECTORS;if(!directory)return;mkdirSync(directory,{recursive:true});const raw=Buffer.from(JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:String(item)}:item)+'\n'),target=join(directory,String(++serial).padStart(3,'0')+'-'+label+'.json.gz');writeFileSync(target,gzipSync(raw),{flag:'wx'});assert.ok(gunzipSync(readFileSync(target)).equals(raw));}
function fixture(){
 const dependencies=loadDeriveDependencyProof({manifest,lock}),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock});
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});
 const meta=JSON.parse(JSON.stringify(result.meta)),row={entry:'src/lib.rs',checkedGeneratedMethods:meta.checkedGeneratedMethods.length},options={readSource:()=>source,dependencies,jsonMacroDependencies,cargoManifest:manifest};
 retain('complete-original-fixture',{source,manifest,lock,meta,row,javascript:result.javascript,typescript:result.typescript});
 return {result,meta,row,options};
}

test('actual whole stored reviewer is freshly derived through ordered source rules and complete CST inverses',()=>{
 const actual=readFileSync(new URL('scripts/review-translation-draft.mjs',root),'utf8'),proposal=deriveStoredProjectReviewSource(actual);
 retain('complete-source-copy-and-inverses',proposal);
 assert.equal(proposal.currentSource,actual);assert.equal(proposal.text,actual);assert.equal(proposal.fullOriginalAPIsUnchanged,true);assert.equal(proposal.acrossInvocationCaches,false);
 assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,proposal.source);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,actual);assert.equal(proposal.inverse,proposal.source);
 for(const copy of Object.values(proposal.copies)){assert.deepEqual([...new Set(copy.trace.map(row=>row.phase))],['language','repository']);assert.equal(transportConcreteSyntaxMeta(copy.beforeMeta).source,copy.source);assert.equal(transportConcreteSyntaxMeta(copy.afterMeta).source,copy.text);assert.equal(copy.inverse,copy.source);}
 assert.deepEqual([...new Set(proposal.trace.map(row=>row.phase))],['language','repository']);
});

test('stored mixed unit Default container Default and Clone review preserves every independent original record and strict target',{timeout:60000},async()=>{
 const f=fixture(),before=JSON.stringify(f.meta),old=reviewGeneratedMethods(f.meta,f.row,f.options),current=reviewStoredProjectGeneratedMethods(f.meta,f.row,f.options);retain('complete-original-and-stored-review-records',{old,current});
 assert.deepEqual(current,old);assert.deepEqual(current.map(row=>row.name).sort(),['Choice.clone','Choice.default','Payload.default']);assert.equal(JSON.stringify(f.meta),before);
 assert.ok(current.every(row=>row.runtimeParity===false&&row.semanticAuthority===false));
 await verifyTypedTargets(f.result,api=>{assert.deepEqual(api.make_choice(),{$:'Selected'});const first=api.make_payload(),second=api.make_payload();assert.deepEqual(first,{$:'Payload',text:'',maybe:{$:'None'}});assert.deepEqual(second,first);assert.notStrictEqual(first,second);assert.ok(Object.isFrozen(first));},{childTimeoutMs:20000});
});

test('stored review rejoins complete source and actual sealed dependency inputs on every new invocation',{timeout:60000},()=>{
 const f=fixture(),original=reviewStoredProjectGeneratedMethods(f.meta,f.row,f.options);
 assert.throws(()=>reviewStoredProjectGeneratedMethods(f.meta,f.row,{...f.options,readSource:()=>source+' '}),/hash|source/);
 assert.throws(()=>reviewStoredProjectGeneratedMethods(f.meta,f.row,{...f.options,dependencies:structuredClone(f.options.dependencies)}),/private|copied|unsealed|Unsealed|original|dependencies/);
 assert.throws(()=>reviewStoredProjectGeneratedMethods(f.meta,{...f.row,checkedGeneratedMethods:f.row.checkedGeneratedMethods+1},f.options),/count/);
 assert.deepEqual(reviewStoredProjectGeneratedMethods(f.meta,f.row,f.options),original);
});

test('stored mixed reviewers retain all count source authority and mirrored semantic refusal controls',{timeout:60000},()=>{
 const f=fixture();
 for(const mode of ['source','authority','duplicate','checked-target-body','proof']){
  const meta=structuredClone(f.meta);
  if(mode==='source')meta.sources[0].sha256='0'.repeat(64);
  if(mode==='authority')meta.checkedGeneratedMethods[0].semanticAuthority=true;
  if(mode==='duplicate')meta.checkedGeneratedMethods.push(structuredClone(meta.checkedGeneratedMethods[0]));
  if(mode==='checked-target-body')for(const program of [meta.checkedSemanticProgram,meta.targetSemanticProgram]){const declaration=program.program.declarations.$map.find(([,entry])=>entry.impl?.defaultSourceProof?.schema==='original-generated-container-default-ir-v1');assert.ok(declaration);declaration[1].body={k:'unit',type:{kind:'unit'}};}
  if(mode==='proof'){
   const original=meta.checkedGeneratedMethods.find(row=>row.name==='Payload.default');assert.ok(original);original.defaultSourceProof.contextDigest='0'.repeat(64);
   for(const program of [meta.checkedSemanticProgram,meta.targetSemanticProgram]){const declaration=program.program.declarations.$map.find(([,entry])=>entry.impl?.defaultSourceProof?.schema==='original-generated-container-default-ir-v1');assert.ok(declaration);declaration[1].impl.defaultSourceProof.contextDigest='0'.repeat(64);}
  }
  retain('complete-negative-'+mode,{source,manifest,lock,meta,row:f.row});assert.throws(()=>reviewStoredProjectGeneratedMethods(meta,f.row,f.options),undefined,mode);
 }
 assert.deepEqual(reviewStoredProjectGeneratedMethods(f.meta,f.row,f.options),reviewGeneratedMethods(f.meta,f.row,f.options));
});
