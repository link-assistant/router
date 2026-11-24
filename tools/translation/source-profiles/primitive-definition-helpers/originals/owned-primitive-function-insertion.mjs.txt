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

// New function insertion starts from a fresh receiving issuer, never a native
// placeholder/signature flag. Every complete emitted body is independently
// rechecked in the actual complete proposed native source before returning DATA.
export function proposeOwnedPrimitiveFunctionInsertion(data,options){
 return withOwnedNativeProjectOperation(()=>{
  const original=ownedPlainData(data),request=ownedPlainData(options),authority=Object.hasOwn(request,'javascript')?'javascript':'typescript',keys=['sourcePath','typescriptPath','nativeRoute',authority],contexts=[],files=new Map(original.files.map(row=>[row.path,row.source]));let failed=false,baseline,first,refreshed;
  const stop=message=>{throw new TypeError('Primitive function insertion: '+message);};
  if(Object.keys(request).length!==keys.length||keys.some(key=>!Object.hasOwn(request,key))||original.primitiveOperators===true)stop('exact ordinary source-unit insertion request required');
  const route=nativeEmptyModuleRoute(request.nativeRoute),{sourcePath,typescriptPath}=request;ownedSourcePath(sourcePath);ownedSourcePath(typescriptPath);if(!sourcePath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(typescriptPath)||!files.has(sourcePath)||!files.has(typescriptPath)||typeof request[authority]!=='string'||Buffer.byteLength(request[authority])>8388608)stop('complete bounded existing receiving pair and one source authority required');
  if(original.vectorBindings.some(row=>row.javascriptPath===sourcePath))stop('insertion currently requires an empty recorded receiving unit');
  const start=createOwnedVectorCandidateContext(original);contexts.push(start);
  const compile=sources=>{const inputs={manifest:sources.get('Cargo.toml'),lock:sources.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...sources.keys()].filter(path=>path.endsWith('.rs')).sort(),readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:inputs.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(inputs).proof,deriveDependencies:deriveDependencyProfile(inputs).proof});};
  const role=type=>type==='bool'||type==='usize'||!!primitiveBitwiseType(type),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);let work=0;
  function expression(value,depth){
   if(++work>100000||depth>160||!value||!role(value.type)||value.root!==null)stop('bounded plain primitive insertion expression required');
   if(value.kind==='bool'||value.kind==='integer'||value.kind==='variable')return;
   if(value.kind==='not'){expression(value.value,depth+1);return;}
   if(value.kind==='binary'&&['&&','||','===','!==','<','<=','>','>='].includes(value.op)){expression(value.left,depth+1);expression(value.right,depth+1);return;}
   if(value.kind==='choose'){expression(value.cond,depth+1);expression(value.then,depth+1);expression(value.else,depth+1);return;}
   if(['primitive-bitwise-call','primitive-not-call','primitive-cast-call','primitive-method-call'].includes(value.kind)){requireOwnedNativeTotalCall(value);for(const argument of value.args)expression(argument,depth+1);return;}
   stop('new function needs its next explicit insertion operation/effect rule');
  }
  function body(rows,depth=0){if(++work>100000||depth>160||!Array.isArray(rows)||!rows.length)stop('complete bounded primitive insertion body required');for(let index=0;index<rows.length;index++){const row=rows[index];if(row.kind==='let'){expression(row.value,depth+1);continue;}if(index!==rows.length-1)stop('new primitive function terminator must close its original body');if(row.kind==='return'){expression(row.value,depth+1);return;}if(row.kind==='if'){expression(row.cond,depth+1);body(row.then,depth+1);body(row.else,depth+1);return;}stop('new statement requires its separate insertion rule');}stop('complete primitive insertion return required');}
  function census(project,bindings){const actual=ownedVectorOriginalProjectCensus(project),before=ownedVectorOriginalProjectCensus(baseline),added=new Set(bindings.map(row=>JSON.stringify([row.rustPath,row.rustName,'fn'])));if(added.size!==bindings.length||[...added].some(key=>before.executable.includes(key)||actual.executable.filter(row=>row===key).length!==1)||!same(actual.executable.filter(row=>!added.has(row)),before.executable)||!same(actual.refused,before.refused)||!same(actual.methods,before.methods)||!same(actual.generatedMethods,before.generatedMethods))stop('complete native census must change only by the exact new complete functions');return actual;}
  try{
   const run=createRulePipeline([
    {phase:'language',rules:[
     {id:'receiving:check-complete-primitive-source-without-native-placeholders',apply:()=>{
      baseline=compile(files);requireCurrentEmptyNativeModule(baseline,files,route);const scopes=baseline.sourceScopes.filter(row=>row.source===route.rustPath&&same(row.module,route.module));if(scopes.length!==1||!files.has(route.rustPath))stop('new receiving functions require one current existing empty native module');
      let pair,seedFiles=new Map(files);if(authority==='typescript'){pair=prepareOwnedVectorModulePair(sourcePath,typescriptPath,request.typescript);seedFiles.set(sourcePath,pair.javascript.source);seedFiles.set(typescriptPath,pair.typescript.source);}else{seedFiles.set(sourcePath,request.javascript);seedFiles.delete(typescriptPath);}
      // A missing companion during JS bootstrap cannot supply copied headers.
      // JSDoc and imports are checked directly by the original receiving issuer.
      const context=createOwnedVectorCandidateContext({...original,primitiveOperators:true,primitiveDefinitions:true,files:[...seedFiles].map(([path,source])=>({path,source}))});contexts.push(context);first=translateOwnedVectorCandidate(seedFiles.get(sourcePath),{context,sourcePath,typescriptOutputPath:typescriptPath});seedFiles.clear();
      if(!first.program.length||first.program.length>4096)stop('bounded nonempty complete new function set required');for(const item of checkOwnedCoreProgram(first.program)){if(item.vectorOrigin||!item.exported||!role(item.returns)||item.resultRoot!==null||item.params.some(row=>!role(row.type))||item.sourceCalls?.length||!nativeProjectionIdentifier(item.name))stop('only exported closed primitive functions enter this insertion family');body(item.body);}
      pair=prepareOwnedVectorModulePair(sourcePath,typescriptPath,first.typescript);return {pair,scope:scopes[0]};
     }},
     {id:'rust:insert-complete-emitted-source-and-independently-recheck-new-native-functions',apply:({pair,scope})=>{
      const originalSource=files.get(route.rustPath),emitted=first.rust,capture=captureSourceModuleViews({source:emitted,sourcePath:route.rustPath,compilationProfile:PRODUCTION_PROFILE}),root=capture.views.filter(row=>row.modulePath.length===0);if(root.length!==1)stop('one actual emitted root source view required');const items=originalModuleViewItems(root[0],emitted),functions=[];
      for(const item of first.program){const rows=items.filter(row=>row.term==='fn'&&row.name===item.name);if(rows.length!==1)stop('one complete emitted function required');const row=rows[0],source=emitted.slice(row.start,row.end),tokens=rustTokens(source).filter(token=>token.type!=='comment'),index=tokens.findIndex(token=>token.text==='fn');if(index<1||tokens[index-1].text!=='pub'||tokens[index+1]?.text!==item.name)stop('actual public emitted function header required');functions.push(source.slice(tokens[index-1].start));}
      const at=scope.sourceView.bodySpan.end;if(!Number.isSafeInteger(at)||at<0||at>originalSource.length)stop('actual original module insertion boundary required');const text='\n'+functions.join('\n\n')+'\n',inserted=originalSource.slice(0,at)+text+originalSource.slice(at);if(Buffer.byteLength(inserted)>8388608)stop('complete inserted native source byte bound');
      const bindings=first.program.map(item=>({javascriptPath:sourcePath,javascriptName:item.javascript,rustPath:route.rustPath,rustName:[...route.module,item.name].join('.')})),proposed=new Map(files);proposed.set(route.rustPath,inserted);proposed.set(sourcePath,pair.javascript.source);proposed.set(typescriptPath,pair.typescript.source);const initial=compile(proposed);census(initial,bindings);for(const item of first.program){const name=[...route.module,item.name].join('.'),entries=initial.executableDeclarations.filter(row=>row.source===route.rustPath&&row.qualifiedName===name);if(entries.length!==1)stop('one actual newly emitted primitive ABI required');const own=entries[0].checkedSource().declaration,domain=originalPrimitiveScalarDomain(own,entries[0].lower()),expected=type=>type==='usize'?'u64':type;if(!domain||domain.type!==expected(item.returns)||domain.parameters.length!==item.params.length||domain.parameters.some((row,index)=>row.name!==expected(item.params[index].type))||own.params.some((row,index)=>row.name!==item.params[index].rust))stop('actual emitted native primitive ABI differs from its genuine receiving source');}
      const input={...original,vectorBindings:[...original.vectorBindings,...bindings],files:[...proposed].map(([path,source])=>({path,source}))};refreshed=proposeOwnedNativeBulkModuleRefresh(input,[{sourcePath,typescriptPath,nativeRoute:route}]);if(refreshed.modules.length!==1||!same(refreshed.modules[0].bindings.map(row=>[row.rustPath,row.rustName]).sort(),bindings.map(row=>[row.rustPath,row.rustName]).sort()))stop('fresh receiving/native insertion function set differs');
      for(const row of [...refreshed.nativeEdits,...refreshed.outputs])proposed.set(row.path,row.after);const finalSource=proposed.get(route.rustPath),prefix=originalSource.slice(0,at),suffix=originalSource.slice(at);if(!finalSource.startsWith(prefix)||!finalSource.endsWith(suffix))stop('native insertion changed original source outside its empty module boundary');const final=compile(proposed),forwardCensus=census(final,bindings);return {bindings,proposed,forwardCensus,insertion:{at,expected:'',replacement:finalSource.slice(prefix.length,finalSource.length-suffix.length)},module:route.module};
     }},
    ]},
    {phase:'repository',rules:[{id:'router:retain-native-insertion-and-paired-source-equations-without-installation',apply:value=>{
     const paths=[route.rustPath,sourcePath,typescriptPath],outputs=paths.map(path=>({path,before:files.get(path),after:value.proposed.get(path),inverse:files.get(path)})),histories=transportConcreteSourceEquations(outputs.map(row=>({before:row.before,after:row.after,language:row.path===route.rustPath?'Rust':row.path===sourcePath?'JavaScript':'TypeScript'})));let retained=original.files.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)+Buffer.byteLength(request[authority])+Buffer.byteLength(first.meta);for(let index=0;index<outputs.length;index++){outputs[index].history=histories[index];retained+=Buffer.byteLength(outputs[index].after);}if(retained>33554432)stop('complete insertion source proposal byte budget');
     return {schema:'router-owned-primitive-function-insertion-v1',sourceInputs:original.files,requestedSource:{language:authority==='javascript'?'JavaScript':'TypeScript',source:request[authority]},receivingSourceMeta:first.meta,nativeRoute:route,bindings:value.bindings,outputs,nativeInsertion:value.insertion,forwardCensus:value.forwardCensus,retainedSourceBytes:retained,selectedNativeSourceRechecked:true,sourceAuthority:false,semanticAuthority:false,productionSelected:false,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
    }}]},
   ]).run(null);return {...run.value,trace:run.trace};
  }catch(error){failed=true;throw error;}finally{let fenceError,fenceFailed=false;for(const context of contexts)try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!fenceFailed){fenceFailed=true;fenceError=error;}}files.clear();contexts.length=0;baseline=null;first=null;refreshed=null;if(!failed&&fenceFailed)throw fenceError;}
 });
}
import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';
import {nativeEmptyModuleRoute,requireCurrentEmptyNativeModule} from './owned-native-empty-modules.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {checkOwnedCoreProgram} from './owned-vector-candidate-operations.mjs';
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {requireOwnedNativeTotalCall} from './owned-native-total-operators.mjs';
import {nativeProjectionIdentifier} from './owned-native-tree-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {ownedVectorOriginalProjectCensus} from './owned-vector-candidate-support.mjs';
import {proposeOwnedNativeBulkModuleRefresh} from './owned-native-bulk-module-refresh.mjs';

import {originalPrimitiveScalarDomain} from './owned-vector-json-native.mjs';
