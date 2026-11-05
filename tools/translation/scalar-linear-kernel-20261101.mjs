// Complete additive specialization lane. All actual original admission stays in
// the unchanged owned source/meta compiler; this lane admits no new native ABI.
import {types} from 'node:util';
import * as outcome from './js-to-rust/owned-outcome.mjs';
import * as cancellation from './js-to-rust/owned-cancellation.mjs';
import {ownedPlainData,requireOwnedCoreSourceCurrent as outcomeCurrent} from './js-to-rust/owned-outcome-source.mjs';
import {requireOwnedCoreSourceCurrent as cancellationCurrent} from './js-to-rust/owned-cancellation-source.mjs';
import {proposeScalarChainBulk} from './scalar-chain-bulk-20261101.mjs';
import {selectScalarLinearFunctions} from './scalar-linear-kernel-20261101-plan.mjs';
import {emitScalarLinearFunctions,evaluateScalarLinearFunction} from './scalar-linear-kernel-20261101-execution.mjs';
import {withScalarLinearOriginalAssets} from './scalar-linear-kernel-20261101-assets.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Scalar linear checked specialization: '+message);};
const families={outcome:{api:outcome,current:outcomeCurrent},cancellation:{api:cancellation,current:cancellationCurrent}};
function dense(input,bound){
 if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('ordinary dense runtime argument sequence required');
 const size=Object.getOwnPropertyDescriptor(input,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0||size.value>bound||Reflect.ownKeys(input).length!==size.value+1)fail('complete runtime argument sequence bound');
 const result=[];for(let index=0;index<size.value;index++){const field=Object.getOwnPropertyDescriptor(input,String(index));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('runtime argument accessor or gap');result.push(field.value);}return result;
}
function withFrame(data,options,consume){
 const original=ownedPlainData(data),request=ownedPlainData(options);if(!Object.hasOwn(families,request.family))fail('actual finite original family required');const selected=families[request.family];
 return withScalarLinearOriginalAssets(assets=>{
  const contexts=[];let base,modules,programs,current;
  const close=()=>{let first,failed=false;for(const context of contexts)try{selected.current(context);}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
  return withCompleteSourceClosingFence(()=>{
   const run=createRulePipeline([
    {phase:'language',rules:[
     {id:'scalar-linear:run-original-complete-chain-and-both-direction-source-admission',apply:()=>{
      base=proposeScalarChainBulk(original,request);const edits=new Map(base.modules.map(row=>[row.sourcePath,row.after]));current={...original,files:original.files.map(row=>edits.has(row.path)?{...row,source:edits.get(row.path)}:row)};
      const context=selected.api.createOwnedOutcomeContext(current);contexts.push(context);programs=[];
      modules=base.modules.map(row=>{
       const typed=/\.(?:mts|ts)$/u.test(row.sourcePath),checked=selected.api[typed?'translateOwnedOutcomeTypeScript':'translateOwnedOutcomeJavaScript'](row.after,{context,sourcePath:row.sourcePath});
       // Reparse complete semantic meta and reissue ORIGINAL private facts.
       // Written TS uses its genuine derived pair context retained in that meta.
       if(!sameRustSourceSyntax(checked.rust,row.checked.canonicalRust))fail('fresh complete canonical native body differs');
       const program=selected.api.readOwnedOutcomeMeta(checked.meta),functions=selectScalarLinearFunctions(program);programs.push(program);
       return {row,checked,functions};
      });return modules;
     }},
     {id:'scalar-linear:emit-only-whole-qualified-stage-specializations-with-full-CST-inverses',apply:rows=>rows.map(({row,checked,functions})=>{
      const artifacts=row.checked.artifacts.map(artifact=>{
       if(artifact.language==='Rust')return artifact;
       const typed=artifact.language==='TypeScript',source=emitScalarLinearFunctions(functions,{path:artifact.path,runtimeRoot:typed?original.declarationRoot:original.runtimeRoot,typed}),concrete=transportConcreteSyntaxSource(source,{language:artifact.language});
       if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete specialized target CST inverse differs');
       return {...artifact,source,concreteSyntax:concrete.meta,inverse:source};
      });
      const histories=transportConcreteSourceEquations(artifacts.filter(artifact=>artifact.language!=='Rust').map(artifact=>({before:row.checked.artifacts.find(before=>before.path===artifact.path).source,after:artifact.source,language:artifact.language})));
      if(histories.some((history,index)=>history.inverse!==row.checked.artifacts.filter(artifact=>artifact.language!=='Rust')[index].source))fail('complete unspecialized target inverse differs');
      return {...row.checked,sourcePath:row.sourcePath,artifacts,histories,functions,originalProgram:checked.program,originalMeta:checked.meta,canonicalRust:checked.rust,canonicalJavaScript:artifacts.find(artifact=>artifact.language==='JavaScript').source,typescript:artifacts.find(artifact=>artifact.language==='TypeScript').source,targetSpecialization:true,sourceAuthority:false,semanticAuthority:false};
     })},
    ]},
    {phase:'repository',rules:[{id:'router:package-complete-checked-runtime-type-mirrors-meta-and-source-history',apply:rows=>{
     const files=[],seen=new Set();for(const root of new Set([original.runtimeRoot,original.declarationRoot]))for(const source of assets.sources){const path=root+'/'+source.path;if(!seen.has(path)){seen.add(path);const prior=original.files.find(row=>row.path===path);if(prior&&prior.source!==source.source)fail('authored receiving helper conflict');files.push({path,source:source.source,language:source.language,origin:source.origin,concreteSyntax:source.concreteSyntax,inverse:source.inverse,history:source.history});}}
     const metadata={schema:'scalar-linear-original-source-meta-v1',family:request.family,modules:rows.map(row=>({sourcePath:row.sourcePath,originalMeta:row.originalMeta,functions:row.functions}))};accountPrimitiveVectorIteratorBulkData(metadata);
     const semanticMeta=JSON.stringify(metadata);if(Buffer.byteLength(semanticMeta)>16777216||JSON.stringify(JSON.parse(semanticMeta))!==semanticMeta)fail('complete specialized meta serialization/reparse bound');
     const receivingData={...original,files:original.files.filter(row=>!seen.has(row.path)).concat(files.map(({path,source})=>({path,source})))};
     return {schema:'scalar-linear-whole-stage-source-proposal-v1',family:request.family,base,modules:rows,receivingData,runtimeFiles:files,semanticMeta,sourceInstalled:false,nativeInstalled:false,newNativeAbi:false,wholeFunctionsSpecialized:rows.reduce((count,row)=>count+row.functions.length,0),originalArrayMethodOwnerQualified:false,originalInputContractEquivalent:false,originalBodyEquivalenceQualified:false,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
    }}]},
   ]).run(null);
   const result={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(result);
   return consume({result,programs,verify:()=>{close();assets.verify();}});
  },[close,assets.verify,()=>{contexts.length=0;}]);
 });
}
export function proposeScalarLinearKernel(data,options){return withFrame(data,options,frame=>frame.result);}
export function readScalarLinearKernelMeta(data,options,meta){
 if(typeof meta!=='string'||Buffer.byteLength(meta)>16777216)fail('bounded complete specialized semantic meta required');
 return withFrame(data,options,frame=>{if(meta!==frame.result.semanticMeta)fail('complete fresh original source/meta specialization differs');return {programs:frame.programs,meta:JSON.parse(meta),sourceAuthority:false,semanticAuthority:false};});
}
export function translateScalarLinearKernelProjection(data,options,source,configuration={}){
 const request=ownedPlainData(configuration);if(Object.keys(request).length!==2||!Object.hasOwn(request,'sourcePath')||!Object.hasOwn(request,'language'))fail('exact own target projection configuration required');const {sourcePath,language}=request;
 if(typeof source!=='string'||Buffer.byteLength(source)>2097152||!['JavaScript','TypeScript'].includes(language))fail('complete bounded target source and language required');
 return withFrame(data,options,frame=>{
  const modules=frame.result.modules.filter(row=>row.artifacts.some(artifact=>artifact.path===sourcePath&&artifact.language===language));if(modules.length!==1)fail('one actual specialized target path required');
  const row=modules[0],artifact=row.artifacts.find(artifact=>artifact.path===sourcePath&&artifact.language===language);if(artifact.source!==source)fail('edited specialized target requires the original application edit path');
  return {rust:row.canonicalRust,originalProgram:row.originalProgram,originalMeta:row.originalMeta,source,inverse:row.histories.find(history=>history.after===source)?.inverse,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
 });
}
function evaluate(frame,name,args){
 const parameters=dense(args,1);if(parameters.length!==1||typeof name!=='string'||name.length>128)fail('one actual scalar slice argument required');
 const functions=frame.result.modules.flatMap(row=>row.functions).filter(row=>row.name===name||row.javascript===name);if(functions.length!==1)fail('one original whole qualified function required');
 frame.verify();return withCompleteSourceClosingFence(()=>evaluateScalarLinearFunction(functions[0],parameters),[frame.verify]);
}
export function evaluateScalarLinearKernel(data,options,name,args){return withFrame(data,options,frame=>evaluate(frame,name,args));}
export function evaluateScalarLinearKernelBatch(data,options,calls){return withFrame(data,options,frame=>dense(calls,4096).map(call=>{const pair=dense(call,2);if(pair.length!==2)fail('complete runtime batch call pair required');return evaluate(frame,pair[0],pair[1]);}));}
