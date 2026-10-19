// Reversible repository path labels around the unchanged general storage codec.
// Storage fidelity grants no source, namespace, semantic or execution authority.
import {createHash} from 'node:crypto';
import {encodeStaticSourceStorage as coreEncode,decodeStaticSourceStorage as coreDecode,decodeStaticSourceTextData as coreText} from './static-source-storage-codec.mjs';
import {relocatedRustSourcePath} from './repository-layout.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';

const CODEC='router-static-cst-repository-layout-storage-v1',MAX=256*1024*1024,MAX_EDGES=16384;
const json=JSON.stringify,hash=value=>createHash('sha256').update(value).digest('hex');
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safe=value=>Number.isSafeInteger(value)&&value>=0&&!Object.is(value,-0);
const fail=message=>{throw new TypeError('Static layout storage: '+message);};
const requireValue=(value,message)=>{if(!value)fail(message);};
const same=(left,right)=>json(left)===json(right);
function keys(value,wanted){return record(value)&&same(Object.keys(value),wanted);}
function bytes(value){return Buffer.from(json(value)+'\n');}
function originalRow(bundle,stage,row){
 const profile=Array.isArray(bundle.profiles)?bundle.profiles.find(value=>record(value)&&value.revision===stage.revision):null;
 return Array.isArray(profile?.files)?profile.files.find(value=>record(value)&&value.path===row.path):undefined;
}
function currentRow(bundle,path){return Array.isArray(bundle.current?.files)?bundle.current.files.find(value=>record(value)&&value.path===path):undefined;}
function project(bundle){
 const substitutions=[];
 const lineage=bundle.lineage.map((stage,stageIndex)=>({...stage,files:stage.files.map((row,rowIndex)=>{
  if(!record(row)||!record(row.before)||!record(row.after)||row.status!=='changed'||typeof row.path!=='string')return row;
  const physical=relocatedRustSourcePath(row.path);
  if(physical===row.path||row.before.path!==row.path||row.after.path!==physical||!same(originalRow(bundle,stage,row),row.before)||!same(currentRow(bundle,physical),row.after))return row;
  requireValue(substitutions.length<MAX_EDGES,'original lineage edge bound');
  substitutions.push([stageIndex,rowIndex,physical]);
  return {...row,after:{...row.after,path:row.path}};
 })}));
 return {bundle:{...bundle,lineage},substitutions};
}
function restore(bundle,substitutions){
 requireValue(Array.isArray(substitutions)&&substitutions.length>0&&substitutions.length<=MAX_EDGES,'bounded complete path substitutions required');
 const lineage=bundle.lineage.map(stage=>({...stage,files:[...stage.files]}));
 let previousStage=-1,previousRow=-1;
 for(const tuple of substitutions){
  requireValue(Array.isArray(tuple)&&tuple.length===3&&Object.keys(tuple).length===3,'exact path tuple required');
  const [stageIndex,rowIndex,physical]=tuple;
  requireValue(safe(stageIndex)&&safe(rowIndex)&&typeof physical==='string'&&(stageIndex>previousStage||stageIndex===previousStage&&rowIndex>previousRow),'ordered unique path tuple required');
  const stage=lineage[stageIndex],row=stage?.files?.[rowIndex];
  requireValue(record(row)&&record(row.before)&&record(row.after)&&row.status==='changed'&&row.before.path===row.path&&row.after.path===row.path,'complete normalized lineage row required');
  requireValue(physical!==row.path&&physical===relocatedRustSourcePath(row.path),'exact repository path equation required');
  const after={...row.after,path:physical};
  requireValue(same(originalRow(bundle,stage,row),row.before)&&same(currentRow(bundle,physical),after),'complete captured original/current path rows required');
  stage.files[rowIndex]={...row,after};previousStage=stageIndex;previousRow=rowIndex;
 }
 return {...bundle,lineage};
}
function unwrap(raw,index){
 requireValue(Buffer.isBuffer(raw)&&raw.length<=MAX,'bounded stored raw bytes required');
 const descriptor=index.storage;
 requireValue(keys(descriptor,['schema','codec','logicalRawBytes','logicalRawSha256'])&&descriptor.schema==='router-static-source-lifecycle-storage-v1'&&descriptor.codec===CODEC&&safe(descriptor.logicalRawBytes)&&descriptor.logicalRawBytes<=MAX&&/^[a-f0-9]{64}$/u.test(descriptor.logicalRawSha256),'complete versioned descriptor required');
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),container=JSON.parse(text);
 requireValue(keys(container,['schema','logicalRawBytes','logicalRawSha256','pathSubstitutions','innerStorage','payload'])&&container.schema===CODEC&&container.logicalRawBytes===descriptor.logicalRawBytes&&container.logicalRawSha256===descriptor.logicalRawSha256,'complete layout container join required');
 const innerRaw=bytes(container.payload);
 requireValue(innerRaw.length<=MAX,'original inner storage bound');
 return {container,descriptor,innerRaw,innerIndex:{schema:index.schema,...(container.innerStorage===null?{}:{storage:container.innerStorage})}};
}

export function encodeStaticSourceStorage(bundle,raw){
 requireValue(Buffer.isBuffer(raw)&&raw.length<=MAX,'bounded original raw bytes required');
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'storage:complete-original-logical-bytes',apply:()=>{
   // The original encoder enforces every source, row, canonical and raw-byte
   // bound before this repository layer inspects or clones the logical input.
   const baseline=coreEncode(bundle,raw);
   return {bundle,raw,baseline};
  }}]},
  {phase:'repository',rules:[{id:'router:reversible-captured-parent-path-labels',apply:input=>{
   if(!input.baseline.storage||!Array.isArray(input.bundle.lineage))return input.baseline;
   const projected=project(input.bundle);
   if(!projected.substitutions.length)return input.baseline;
   const normalizedRaw=bytes(projected.bundle),inner=coreEncode(projected.bundle,normalizedRaw);
   const descriptor={schema:'router-static-source-lifecycle-storage-v1',codec:CODEC,logicalRawBytes:raw.length,logicalRawSha256:hash(raw)};
   const container={schema:CODEC,logicalRawBytes:raw.length,logicalRawSha256:descriptor.logicalRawSha256,pathSubstitutions:projected.substitutions,innerStorage:inner.storage??null,payload:JSON.parse(inner.raw)};
   const stored=bytes(container);requireValue(stored.length<=MAX,'original complete storage bound');
   const decoded=decodeStaticSourceStorage(stored,{schema:bundle.schema,storage:descriptor});
   requireValue(bytes(decoded).equals(raw),'complete path/source/CST storage inverse differs');
   return {raw:stored,storage:descriptor};
  }}]},
 ]);
 return pipeline.run(null).value;
}
export function decodeStaticSourceStorage(raw,index){
 if(index.storage?.codec!==CODEC)return coreDecode(raw,index);
 const {container,descriptor,innerRaw,innerIndex}=unwrap(raw,index);
 const bundle=restore(coreDecode(innerRaw,innerIndex),container.pathSubstitutions),logical=bytes(bundle);
 requireValue(logical.length===descriptor.logicalRawBytes&&hash(logical)===descriptor.logicalRawSha256,'complete restored logical length/SHA differs');
 return bundle;
}
// Explicit source-text DATA projection retains the old false validation flags.
// Its caller still authenticates every supplied archive byte against current Git.
export function decodeStaticSourceTextData(raw,index){
 if(index.storage?.codec!==CODEC)return coreText(raw,index);
 const {container,innerRaw,innerIndex}=unwrap(raw,index),projection=coreText(innerRaw,innerIndex);
 return {...projection,bundle:restore(projection.bundle,container.pathSubstitutions)};
}
