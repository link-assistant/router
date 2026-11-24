import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {requireOriginalCloneEmission} from '../extensions/clone-source-body.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock');
const dependencies=loadDeriveDependencyProof({manifest,lock});
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
function retain(name,value){const directory=process.env.ROUTER_CLONE_UNIT_EVIDENCE_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value,null,2)+'\n'));}}
for(const variants of ['One','Off,On','One,Two,Three,Four'])test('original unit enum Clone executes '+variants+' in JS and strict TS',async()=>{
  const source='#[derive(Clone,Copy,serde::Serialize)]pub enum Mode{'+variants+'}pub fn duplicate(value:&Mode)->Mode{value.clone()}',result=compile(source);retain('checked-units-'+variants.split(',').length,{source,...result});
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedMethods.length,0);assert.equal(result.meta.checkedGeneratedMethods.length,1);assert.equal(result.meta.checkedGeneratedMethods[0].originalDeclarationTerm,'enum');assert.equal(result.checkedGeneratedMethodDeclarations[0].originalDeclarationTerm,'enum');
  const proof=result.meta.checkedGeneratedMethods[0].cloneSourceProof;assert.equal(proof.selectedBranch,'has_derive_copy=true');assert.equal(proof.unitVariants.length,variants.split(',').length);assert.equal(proof.checkedBody,false);const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),checked=[...program.declarations.values()].find(value=>value.body?.k==='routerCheckedCloneBody');assert.equal(checked.body.cloneSourceProof.checkedBody,true);
  await verifyTypedTargets(result,api=>{for(const name of variants.split(',')){const input=Object.freeze({$:name});assert.deepEqual(api.duplicate(input),input);}assert.throws(()=>api.duplicate({$:variants.split(',')[0]}),/frozen|immutable/i);assert.throws(()=>api.duplicate(Object.freeze({$:'Other'})),TypeError);},{childTimeoutMs:30000});
});
test('unit enum checked Clone computation and mirrored ownership edits cannot issue emission',()=>{
  const result=compile('#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off,On}pub fn duplicate(value:&Mode)->Mode{value.clone()}'),program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const entry=[...program.declarations.values()].find(value=>value.body?.k==='routerCheckedCloneBody');assert.ok(entry);assert.strictEqual(requireOriginalCloneEmission(entry.body),entry.body.body);
  for(const mutate of [node=>node.cloneSourceProof.unitVariants[0].name='Other',node=>node.body.type.name='Other',node=>node.body.name='forged',node=>node.constEligible=true,node=>node.cloneSourceProof.unitSource.selectedBranch.output.items[0].name='other']){const node=structuredClone(entry.body);mutate(node);assert.throws(()=>requireOriginalCloneEmission(node),/forged|changed/);}
});
test('complete unchanged model source checks its own generated unit Clone method',{timeout:60000},()=>{
  const source=read('src/model_contract.rs'),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock});
  const result=translateProject({entry:'src/model_contract.rs',paths:['src/model_contract.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});
  retain('complete-original-model-checked-unit-clone',{source,...result});
  assert.equal(result.meta.executable.length,2);assert.equal(result.meta.checkedMethods.length,5);
  assert.ok(result.meta.checkedGeneratedMethods.some(value=>value.name==='ModelSelectorKind.clone'&&value.generator==='core::clone::Clone'));
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),methods=[...program.declarations.values()].filter(value=>value.body?.k==='routerCheckedCloneBody');
  assert.ok(methods.some(value=>value.body.cloneSourceProof.unitVariants?.length===4));
  assert.equal(result.meta.refused.filter(value=>value.term==='generated-method'&&value.name.endsWith('.clone')).length,5);
});
test('unit Clone executes32 variants and preserves original AST128 and syntax129 budget refusals',{timeout:60000},async()=>{
  const names=Array.from({length:32},(_,index)=>'Variant'+index),prefix='#[derive(Clone,Copy,serde::Serialize)]pub enum Mode{';
  const source=prefix+names.join(',')+'}pub fn duplicate(value:&Mode)->Mode{value.clone()}',result=compile(source);
  retain('original-unit-positive-32',{source,...result});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of names)assert.deepEqual(api.duplicate(Object.freeze({$:name})),{$:name});},{childTimeoutMs:30000});
  for(const count of [128,129]){const rejectedSource=prefix+Array.from({length:count},(_,index)=>'Variant'+index).join(',')+'}',rejected=compile(rejectedSource);retain('original-unit-budget-'+count,{source:rejectedSource,...rejected});assert.equal((rejected.meta.checkedGeneratedMethods??[]).some(value=>value.generator==='core::clone::Clone'),false);assert.ok(rejected.meta.refused.some(value=>count===128?/positive AST validation budget/.test(value.message):/source syntax budget/.test(value.message)));}
});
test('unit enum Clone retains missing Copy Drop payload explicit impl and const trait call refusals',()=>{
  for(const source of ['#[derive(Clone,serde::Serialize)]enum Mode{Off,On}','#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off(u8),On}','#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off,On}impl Drop for Mode{fn drop(&mut self){}}','#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off,On}impl Mode{fn clone(&self)->Self{Self::Off}}','#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off,On}const BAD:Mode=Mode::Off.clone();']){
    const result=compile(source);retain('negative-'+Buffer.from(source).toString('hex').slice(-40),{source,...result});assert.ok(result.meta.refused.length,source);if(!source.includes('const BAD'))assert.equal((result.meta.checkedGeneratedMethods??[]).some(value=>value.generator==='core::clone::Clone'),false,source);
  }
});
