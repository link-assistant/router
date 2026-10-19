import {repositorySourceURL} from "../../tools/translation/test/fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {reviewGeneratedMethods} from '../review-translation-draft.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../../tools/translation/json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {verifyTypedTargets} from '../../tools/translation/test/typed-targets.mjs';
const root=new URL('../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs),jsonMacroDependencies=loadJsonMacroSourceProof(inputs);
const source='#[derive(Default)]pub struct Leaf{flag:bool}#[derive(Default)]pub enum Choice{A,#[default]B}#[derive(Default)]pub struct Child{leaf:Leaf,choice:Choice,values:Vec<u8>}#[derive(Default)]pub struct Payload{first:Child,second:Child}pub fn make()->Payload{Payload::default()}';
let original;
function fixture(){original??=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});return original;}
function vector(name,value){if(!process.env.ROUTER_DEPENDENT_REVIEW_VECTORS)return;mkdirSync(process.env.ROUTER_DEPENDENT_REVIEW_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_DEPENDENT_REVIEW_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
function review(meta){return reviewGeneratedMethods(meta,{entry:'src/lib.rs',checkedGeneratedMethods:meta.checkedGeneratedMethods.length},{readSource:()=>source,dependencies,jsonMacroDependencies});}
const checked=meta=>meta.checkedSemanticProgram.program.declarations.$map;
const target=meta=>meta.targetSemanticProgram.program.declarations.$map;
const parent=meta=>meta.checkedGeneratedMethods.find(row=>row.name==='Payload.default');
const semantic=meta=>checked(meta).find(([,entry])=>entry.impl?.defaultSourceProof?.itemSha256===parent(meta).defaultSourceProof.itemSha256)[1];
const flattened=meta=>target(meta).find(([,entry])=>entry.impl?.defaultSourceProof?.itemSha256===parent(meta).defaultSourceProof.itemSha256)[1];
function mirrored(meta,change){for(const proof of [parent(meta).defaultSourceProof,semantic(meta).impl.defaultSourceProof,flattened(meta).impl.defaultSourceProof])change(proof);}
test('independent reviewer rebuilds mixed primitive unit and repeated nested generated defaults',{timeout:60000},async()=>{
  const result=fixture(),meta=JSON.parse(JSON.stringify(result.meta)),rows=review(meta);assert.equal(rows.length,4);assert.equal(rows.find(row=>row.name==='Payload.default').defaultSourceProof.schema,'original-generated-dependent-default-ir-v1');assert.equal(meta.checkedMethods.length,0);assert.equal(meta.executable.filter(row=>row.term==='fn').length,1);assert.equal(rows.every(row=>row.runtimeParity===false&&row.semanticAuthority===false),true);vector('positive',{source,result,rows});
  await verifyTypedTargets(result,api=>{const first=api.make(),second=api.make(),child={$:'Child',leaf:{$:'Leaf',flag:false},choice:{$:'B'},values:[]};assert.deepEqual(first,{$:'Payload',first:child,second:child});assert.notStrictEqual(first,second);assert.notStrictEqual(first.first,first.second);assert.notStrictEqual(first.first.leaf,second.first.leaf);assert.notStrictEqual(first.first.values,first.second.values);assert.ok(Object.isFrozen(first.first.values));},{childTimeoutMs:20000});
});
for(const [name,change]of [
  ['child-source',meta=>mirrored(meta,proof=>proof.fields[0].dependency.sourceSha256='f'.repeat(64))],
  ['child-body-reference',meta=>mirrored(meta,proof=>proof.fields[0].dependency.surfaceSha256='f'.repeat(64))],
  ['child-proof-reference',meta=>mirrored(meta,proof=>proof.fields[0].dependency.proofSha256='f'.repeat(64))],
  ['child-field-origin',meta=>mirrored(meta,proof=>proof.fields[0].dependency.fieldProofDigest='f'.repeat(64))],
  ['child-target',meta=>mirrored(meta,proof=>proof.fields[0].dependency.typePath=['crate','Leaf'])],
  ['child-span',meta=>mirrored(meta,proof=>proof.fields[0].dependency.span.end++)],
  ['schema',meta=>mirrored(meta,proof=>proof.schema='original-generated-container-default-ir-v1')],
  ['body',meta=>{const walk=node=>{if(!node||typeof node!=='object')return;if(node.k==='lit'&&node.value===false)node.value=true;for(const value of Object.values(node))if(value&&typeof value==='object')walk(value);};walk(semantic(meta).body);walk(flattened(meta).body);}],
  ['layout',meta=>{for(const entries of [checked(meta),target(meta)]){const data=entries.find(([,entry])=>entry.k==='data'&&entry.ctors.some(ctor=>ctor.name==='Leaf'))[1];data.ctors[0].fields[0].name='forged';}}],
  ['signature',meta=>{semantic(meta).params.push({name:'forged',type:{kind:'bool'}});flattened(meta).params.push({name:'forged',type:{kind:'bool'}});}],
  ['original-count',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:parent(meta).span})],
])test('dependent Default review rejects complete mirrored '+name+' mutation',{timeout:60000},()=>{
  const meta=JSON.parse(JSON.stringify(fixture().meta));change(meta);let failure;try{review(meta);}catch(error){failure={name:error.name,message:error.message,stack:error.stack};}assert.ok(failure,name);vector('refused-'+name,{source,meta,failure});
});
