import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {deriveSourceProfileLayoutImplementation} from '../prepare-derive-profile-layout.mjs';
import {deriveSourceProfileMatches} from '../derive-profile-layout.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadAsyncTraitSourceInputs,originalAsyncTraitInputEvidence,requireAsyncTraitSourceInputs,createAsyncTraitSourceInputs} from '../async-trait-source-inputs.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../literal-substitution-rule.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const history=JSON.parse(gunzipSync(readFileSync(new URL('source-profiles/cargo-layout-before/inputs.json.gz',base))));
const originalProfile=Buffer.from(history.profiles['tools/translation/source-profiles/derive/manifest.json'],'base64'),oldDigest=hash(originalProfile);
const oldManifest=Buffer.from(history.manifest,'base64').toString('utf8'),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const paths=['tools/translation/json-macro-profile-layout.mjs','tools/translation/async-trait-source-inputs.mjs'];
function proposal(){return deriveSourceProfileLayoutImplementation({sources:new Map(paths.map(path=>[path,readFileSync(repositorySourceURL(path,root),'utf8')]))});}

test('actual complete profile implementation and consumer reproduce through both ordered CST rule sequences',()=>{
 const plan=proposal();assert.equal(plan.files.length,2);assert.equal(plan.sourceAndOwnerVerdictsCached,false);assert.equal(plan.qualified,false);
 for(const row of plan.files){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);assert.deepEqual([...new Set(row.trace.map(stage=>stage.phase))],['language','repository']);
  const make=rules=>rules.map(([id,before,after])=>exactLiteralSubstitutionRule(id,before,after,'Whole original changed'));
  assert.equal(createRulePipeline([{phase:'language',rules:make(row.language)},{phase:'repository',rules:make(row.repository)}]).run(row.source).value,row.text);
  assert.equal(readFileSync(repositorySourceURL(row.path,root),'utf8'),row.text);
 }
 const source=readFileSync(repositorySourceURL(paths[0],root),'utf8');assert.equal(plan.files[0].source,source);assert.equal(plan.files[0].copiedFrom.sha256,hash(source));
 assert.equal(oldDigest,'7cac220e8a2de28a4255366f46fd37071c2a7c3ecea3affed0cc364dd619dd1f');
});

test('both complete Cargo layouts retain genuine private dependency and async-trait source checks',{timeout:60000},()=>{
 let first;
 for(const cargo of [oldManifest,manifest]){
  const dependencies=loadDeriveDependencyProof({manifest:cargo,lock});assert.equal(dependencies.manifestSha256,hash(cargo));
  assert.equal(deriveSourceProfileMatches(dependencies,oldDigest),true);assert.equal(deriveSourceProfileMatches(dependencies,dependencies.sourceProfileSha256),true);
  assert.throws(()=>deriveSourceProfileMatches(dependencies,'0'.repeat(64)),/complete original profile differs/u);
  const proof=loadAsyncTraitSourceInputs(dependencies),evidence=originalAsyncTraitInputEvidence(proof);requireAsyncTraitSourceInputs(proof);
  assert.equal(evidence.profile.dependencySourceProfileSha256,oldDigest);assert.equal(evidence.originalCargoInputs.manifest,cargo);assert.equal(evidence.originalCargoInputs.lock,lock);
  assert.equal(proof.namespaceAuthority,false);assert.equal(proof.wholeExpansionCompiled,false);assert.equal(proof.runtimeParity,false);
  for(const row of evidence.sources)assert.equal(hash(row.source),row.sha256);assert.equal(evidence.sources.length,proof.sourceMembers.length);
  if(first)assert.deepEqual(proof.sourceMembers,first);else first=proof.sourceMembers;
  for(const copied of [null,{},structuredClone(dependencies),Object.freeze({...dependencies})]){assert.equal(deriveSourceProfileMatches(copied,oldDigest),false);assert.throws(()=>createAsyncTraitSourceInputs({deriveDependencies:copied,archive:Buffer.alloc(1)}),/genuine original dependency inputs/u);}
  assert.throws(()=>requireAsyncTraitSourceInputs(structuredClone(proof)),/copied or foreign/u);
 }
 let traps=0;const hostile=new Proxy({},{get(){traps++;throw Error('hostile');},ownKeys(){traps++;throw Error('hostile');}});assert.equal(deriveSourceProfileMatches(hostile,oldDigest),false);assert.equal(traps,0);
});

test('fresh complete profile and archive bytes refuse mutation in an independent receiving fixture',{timeout:60000},async()=>{
 const directory=mkdtempSync(join(tmpdir(),'router-derive-profile-layout-'));
 try{
  const row=proposal().files[0],files=['source-profiles/cargo-layout-before/inputs.json.gz','source-profiles/derive/manifest.json','source-profiles/json-macro/features/link-assistant-router-1.24.1-Cargo.toml.gz'];
  for(const path of files){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),readFileSync(new URL(path,base)),{flag:'wx'});}
  let source=row.text;for(const path of ['./cargo-layout-input-compatibility.mjs','./derive-dependencies.mjs','./rule-pipeline.mjs']){const before="from '"+path+"'",after='from '+JSON.stringify(new URL(path,base).href);assert.equal(source.split(before).length,2);source=source.replace(before,()=>after);}
  const target=join(directory,'derive-profile-layout.mjs');writeFileSync(target,source,{flag:'wx'});const receiving=await import(pathToFileURL(target).href),dependencies=loadDeriveDependencyProof({manifest,lock});assert.equal(receiving.deriveSourceProfileMatches(dependencies,oldDigest),true);
  for(const [path,pattern]of [['source-profiles/derive/manifest.json',/complete current source profile differs/u],['source-profiles/cargo-layout-before/inputs.json.gz',/historical container changed/u]]){
   const file=join(directory,path),before=readFileSync(file);writeFileSync(file,Buffer.concat([before,Buffer.from('\n')]));assert.throws(()=>receiving.deriveSourceProfileMatches(dependencies,oldDigest),pattern);writeFileSync(file,before);assert.equal(receiving.deriveSourceProfileMatches(dependencies,oldDigest),true);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('complete source proposals reject altered grammar, duplicate anchors and missing actual consumers',()=>{
 const sources=new Map(paths.map(path=>[path,readFileSync(repositorySourceURL(path,root),'utf8')]));
 assert.throws(()=>deriveSourceProfileLayoutImplementation({sources:new Map()}));
 for(const text of [sources.get(paths[0])+'\nconst broken = ;',sources.get(paths[0]).replace('export function jsonMacroProfileMatches','export function changed'),sources.get(paths[0])+"\n// export function jsonMacroProfileMatches(dependencies,expected){\n"]){const changed=new Map(sources);changed.set(paths[0],text);assert.throws(()=>deriveSourceProfileLayoutImplementation({sources:changed}));}
});
