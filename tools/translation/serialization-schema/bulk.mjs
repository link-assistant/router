import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSerializationContext, discoverSerializationCorpus, SerializationRefusal, freeze } from './extract.mjs';
import { canonicalSerializationMeta, serializeSerializationMeta, parseSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor, emitSerializationDescriptor } from './descriptor.mjs';

const checkedBulk=new WeakMap(), hash=value=>createHash('sha256').update(value).digest('hex');
const BULK_LIMITS=Object.freeze({owners:4096,metadataBytes:16*1024*1024,outputBytes:16*1024*1024});
function cycle(meta) {
  const edges=new Map(meta.types.map(type=>[type.owner,[]]));
  const add=(owner,type)=>{if(type.kind==='named')edges.get(owner).push(type.owner);if(type.type)add(owner,type.type);};
  for(const type of meta.types)for(const field of type.fields??type.variants.flatMap(variant=>variant.fields))add(type.owner,field.type);
  const active=new Set(),done=new Set();
  const visit=(owner,route)=>{if(active.has(owner))throw new SerializationRefusal('Recursive serialization graph requires a separately proven runtime/ownership contract: '+[...route,owner].join(' -> '));if(done.has(owner))return;active.add(owner);for(const target of edges.get(owner)??[])visit(target,[...route,owner]);active.delete(owner);done.add(owner);};
  for(const owner of edges.keys())visit(owner,[]);
}
function refusal(candidate,error) {
  return {owner:candidate.owner,source:candidate.source,sourceSha256:candidate.sourceSha256,itemSha256:candidate.itemSha256,span:candidate.span,attributes:candidate.attributes,configurationStatus:candidate.configurationStatus,condition:candidate.condition,serdeOwners:candidate.serdeOwners,status:'refused',diagnostic:{kind:error.diagnostic?.kind??'serialization-schema-refusal',message:error.diagnostic?.message??error.message,source:error.diagnostic?.source??candidate.source,span:error.diagnostic?.span??candidate.span},runtimeAuthority:false};
}
export function draftBulkSerialization(context) {
  const discovery=discoverSerializationCorpus(context);
  if(discovery.declarations.length>BULK_LIMITS.owners)throw new SerializationRefusal('Bulk serialization original owner inventory exceeds its bounded grammar');
  const supported=[],refused=[],excluded=[];
  for(const candidate of discovery.declarations) {
    if(candidate.status!=='actual-locked-serde-owner') {
      if(['unproved-derived-or-helper-owner','unproved-original-scope'].includes(candidate.status))refused.push(refusal(candidate,{message:candidate.diagnostic?.message??'Unproved original serde/derive namespace'}));
      else excluded.push(candidate);
      continue;
    }
    try {
      const directions=candidate.serdeOwners.map(value=>value.target.join('::'));
      const direction=directions.includes('serde::Serialize')&&directions.includes('serde::Deserialize')?'both':directions.includes('serde::Serialize')?'serialize':'deserialize';
      const meta=parseSerializationMeta(serializeSerializationMeta(context,{roots:[candidate.owner],direction}),context);
      cycle(meta);projectSerializationDescriptor(meta);
      supported.push({owner:candidate.owner,source:candidate.source,sourceSha256:candidate.sourceSha256,itemSha256:candidate.itemSha256,span:candidate.span,meta,directions:{serialize:direction!=='deserialize',deserialize:direction!=='serialize'},status:'supported-bounded-layout',runtimeAuthority:false});
    } catch(error) {refused.push(refusal(candidate,error));}
  }
  const value=freeze({schema:'original-bulk-serialization-meta-v1',sourceSetSha256:discovery.sourceSetSha256,compilationProfile:discovery.compilationProfile,dependenciesDigest:discovery.dependenciesDigest,discovery,supported,refused,excluded,scope:'Original configured module graph; outside-graph files and manual implementations are explicitly unproved',obligations:['No generated serde trait bodies are lowered','Supported layouts do not establish whole-source or runtime parity','Recursive/ownership/custom hook closures remain refused'],runtimeAuthority:false,generatedTraitBehavior:false});
  if(Buffer.byteLength(canonicalSerializationMeta(value))>BULK_LIMITS.metadataBytes)throw new SerializationRefusal('Bulk serialization metadata exceeds bounded output size');
  checkedBulk.set(value,context);return value;
}
export function serializeBulkSerialization(context) {return canonicalSerializationMeta(draftBulkSerialization(context))+'\n';}
export function parseBulkSerialization(text,context) {
  if(typeof text!=='string'||Buffer.byteLength(text)>BULK_LIMITS.metadataBytes)throw new SerializationRefusal('Bulk metadata requires bounded original text');
  const original=draftBulkSerialization(context);
  if(text!==canonicalSerializationMeta(original)+'\n')throw new SerializationRefusal('Bulk metadata differs from complete original source owner/refusal inventory');
  return original;
}
export function emitBulkSerializationRegistry(bulk,{language='javascript'}={}) {
  const context=checkedBulk.get(bulk);if(!context||!['javascript','typescript'].includes(language))throw new SerializationRefusal('Bulk emitter requires privately source-checked metadata');
  const fragments=bulk.supported.map((entry,index)=>{
    const meta=parseSerializationMeta(canonicalSerializationMeta(entry.meta)+'\n',context);
    return emitSerializationDescriptor(meta,{language,exportName:'schema_'+index});
  });
  const entries=bulk.supported.map((entry,index)=>'['+JSON.stringify(entry.owner)+']:{root:'+JSON.stringify(entry.meta.types.find(type=>type.owner===entry.owner).name)+',directions:'+JSON.stringify(entry.directions)+',schema:schema_'+index+'}');
  const text=fragments.join('\n')+'\nexport const serializationSchemas = {'+entries.join(',')+'}'+(language==='typescript'?' as const':'')+';\n';
  if(Buffer.byteLength(text)>BULK_LIMITS.outputBytes)throw new SerializationRefusal('Bulk schema registry exceeds bounded output size');return text;
}
export function buildBulkSerialization({root,paths,entry='src/lib.rs',compilationProfile}={}) {
  const context=captureSerializationContext({root,paths,entry,compilationProfile}),bulk=draftBulkSerialization(context);
  return {context,bulk,meta:canonicalSerializationMeta(bulk)+'\n',javascript:emitBulkSerializationRegistry(bulk),typescript:emitBulkSerializationRegistry(bulk,{language:'typescript'})};
}
const paths={meta:'tools/translation/serialization-schema/bulk-generated/router-serialization.meta.json',javascript:'tools/translation/serialization-schema/bulk-generated/router-serialization.mjs',typescript:'tools/translation/serialization-schema/bulk-generated/router-serialization.ts',inventory:'tools/translation/serialization-schema/bulk-generated/router-serialization-inventory.json'};
export function produceBulkSerialization({root,write=false}={}) {
  root=resolve(root);
  const sources=execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const result=buildBulkSerialization({root,paths:sources,compilationProfile:{flags:{test:false,unix:true,windows:false}}});
  const inventory={schema:'bulk-original-serialization-inventory-v1',sourceSetSha256:result.bulk.sourceSetSha256,dependenciesDigest:result.bulk.dependenciesDigest,supported:result.bulk.supported.map(({meta,...entry})=>entry),refused:result.bulk.refused,excluded:result.bulk.excluded,manualTraitImplementations:result.bulk.discovery.manualTraitImplementations,sourceCoverage:result.bulk.discovery.sourceCoverage,graphDiagnostics:result.bulk.discovery.graphDiagnostics,artifacts:{metaSha256:hash(result.meta),javascriptSha256:hash(result.javascript),typescriptSha256:hash(result.typescript)},runtimeAuthority:false,generatedTraitBehavior:false};
  const artifacts={meta:result.meta,javascript:result.javascript,typescript:result.typescript,inventory:canonicalSerializationMeta(inventory)+'\n'};
  for(const [kind,path]of Object.entries(paths)) {
    const target=join(root,path),text=artifacts[kind];
    if(!write){if(!existsSync(target)||readFileSync(target,'utf8')!==text)throw new SerializationRefusal('Bulk generated artifact is missing or has drift: '+path);}
    else {mkdirSync(dirname(target),{recursive:true});const temporary=target+'.schema-tmp-'+process.pid;writeFileSync(temporary,text,{flag:'wx'});renameSync(temporary,target);if(readFileSync(target,'utf8')!==text)throw new SerializationRefusal('Bulk artifact reopen mismatch: '+path);}
  }
  return {written:write,checked:true,supported:result.bulk.supported.length,refused:result.bulk.refused.length,excluded:result.bulk.excluded.length,outputs:paths,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);if(args.some(value=>!['--write','--check'].includes(value))||args.includes('--write')&&args.includes('--check'))throw new SerializationRefusal('Usage: bulk.mjs [--check | --write]');
  process.stdout.write(JSON.stringify(produceBulkSerialization({root:resolve(fileURLToPath(new URL('../../../',import.meta.url))),write:args.includes('--write')}))+'\n');
}
