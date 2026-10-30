// Complete paired receiving-source proposals. The exact original source is
// rechecked before and after canonical emission; saved metadata is never input.
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate} from './owned-vector-candidate.mjs';
import {ownedPlainData,ownedSourcePath,requireOwnedCoreSourceCurrent} from './owned-vector-candidate-source.mjs';
import {prepareOwnedVectorModulePair} from './owned-vector-module-pair.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned vector module reinput: '+message);};
export function proposeOwnedVectorModuleReinput(data,options){
 const original=ownedPlainData(data),input=ownedPlainData(options),authority=Object.hasOwn(input,'javascript')?'javascript':'typescript',keys=['sourcePath','typescriptPath',authority];if(Object.keys(input).length!==keys.length||keys.some(key=>!Object.hasOwn(input,key)))fail('explicit complete receiving paths and one authoritative JS or TS module required');
 const {sourcePath,typescriptPath}=input,requested=input[authority];ownedSourcePath(sourcePath);ownedSourcePath(typescriptPath);if(!sourcePath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(typescriptPath)||typeof requested!=='string'||Buffer.byteLength(requested)>8388608)fail('bounded actual paired module source required');
 const before=new Map(original.files.map(row=>[row.path,row.source]));if(!before.has(sourcePath)||!before.has(typescriptPath))fail('complete original paired files required');
 const start=createOwnedVectorCandidateContext(original);requireOwnedCoreSourceCurrent(start);
 const replace=pair=>({...original,files:original.files.map(row=>row.path===sourcePath?{...row,source:pair.javascript.source}:row.path===typescriptPath?{...row,source:pair.typescript.source}:row)});
 let firstContext,finalContext,first,final,pair,primaryFailed=false;
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'owned-vector:actual-native-type-erasure-and-complete-original-source-check',apply:()=>{pair=authority==='javascript'?prepareOwnedVectorJavaScriptPair(sourcePath,requested,typescriptPath,before.get(typescriptPath)):prepareOwnedVectorModulePair(sourcePath,typescriptPath,requested);firstContext=createOwnedVectorCandidateContext(replace(pair));first=translateOwnedVectorCandidate(pair.javascript.source,{context:firstContext,sourcePath,typescriptOutputPath:typescriptPath});return first;}},
    {id:'owned-vector:reconstruct-and-recheck-canonical-generated-source-pair',apply:value=>{pair=prepareOwnedVectorModulePair(sourcePath,typescriptPath,value.typescript);finalContext=createOwnedVectorCandidateContext(replace(pair));final=translateOwnedVectorCandidate(pair.javascript.source,{context:finalContext,sourcePath,typescriptOutputPath:typescriptPath});if(final.rust!==value.rust||final.typescript!==value.typescript)fail('fresh original-source canonical emission does not reach an exact fixed point');return final;}},
   ]},
   {phase:'repository',rules:[{id:'router:retain-complete-paired-source-inverses-and-uninstalled-native-candidate',apply:value=>{
    const edits=[{path:sourcePath,before:before.get(sourcePath),after:pair.javascript.source},{path:typescriptPath,before:before.get(typescriptPath),after:pair.typescript.source}],histories=transportConcreteSourceEquations(edits.map(row=>({before:row.before,after:row.after,language:row.path===sourcePath?'JavaScript':'TypeScript'})));
    return {schema:'router-owned-vector-module-reinput-v1',files:edits.map((row,index)=>({...row,inverse:row.before,history:histories[index]})),sourceInputs:original.files,requestedSource:{language:authority==='javascript'?'JavaScript':'TypeScript',source:requested},program:value.program,meta:value.meta,rustCandidate:value.rust,javascript:pair.javascript.source,typescript:pair.typescript.source,nativeInstalled:false,nativeFreshnessQualified:false,productionSelected:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   }}]},
  ]).run(null);
  return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  // Recheck every retained actual source context on both success and failure.
  // Preserve the primary thrown value even if a closing fence also fails.
  let fenceFailed=false,fenceError;for(const context of [start,firstContext,finalContext])if(context)try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!fenceFailed){fenceFailed=true;fenceError=error;}}
  first=null;final=null;pair=null;before.clear();if(!primaryFailed&&fenceFailed)throw fenceError;
 }
}

import {prepareOwnedVectorJavaScriptPair} from './owned-vector-javascript-pair.mjs';
