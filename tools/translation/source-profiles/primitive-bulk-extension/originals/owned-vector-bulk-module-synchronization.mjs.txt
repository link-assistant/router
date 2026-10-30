// Fresh shared-file composition. SOURCE ONLY; ALL UNRUN.
// Serialized proposals and CST/module tables never supply semantic authority.
import {createHash} from 'node:crypto';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {ownedPlainData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-vector-candidate-source.mjs';
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate} from './owned-vector-candidate.mjs';
import {ownedVectorOriginalProjectCensus} from './owned-vector-candidate-support.mjs';
import {actualNativeProjectionTree,requestedNativeProjectionTree} from './owned-native-vector-families.mjs';
import {proposeOwnedVectorNativeSynchronization} from './owned-vector-native-synchronization.mjs';
const fail=message=>{throw new TypeError('Receiving bulk composition: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=source=>createHash('sha256').update(source).digest('hex');
/** Recompute discovery and every complete source join; no proposal parameter. */
export function proposeOwnedVectorBulkModuleSynchronization(data,requests){
 return withOwnedNativeProjectOperation(()=>{
 const original=ownedPlainData(data),settings=ownedPlainData(requests),start=createOwnedCoreSourceContext(original),files=new Map(original.files.map(row=>[row.path,row.source])),after=new Map(files),contexts=[],edits=new Map(),generated=new Map();
 let discovered,beforeProject,afterProject,primaryFailed=false;
 const compile=sources=>{const dependency={manifest:sources.get('Cargo.toml'),lock:sources.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...sources.keys()].filter(path=>path.endsWith('.rs')).sort(),readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependency.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(dependency).proof,deriveDependencies:deriveDependencyProfile(dependency).proof});};
 function substitute(source,rows){
  const ordered=[...rows].sort((a,b)=>a.span[0]-b.span[0]);for(let index=0;index<ordered.length;index++){const row=ordered[index];if(!row.span.every(Number.isSafeInteger)||row.span[0]<0||row.span[1]<row.span[0]||row.span[1]===row.span[0]&&(row.kind!=='native-function-insertion'||row.expected!==''||typeof row.replacement!=='string'||!row.replacement)||row.span[1]>source.length||source.slice(...row.span)!==row.expected||index&&(ordered[index-1].span[1]>row.span[0]||ordered[index-1].span[0]===row.span[0]&&ordered[index-1].span[1]===row.span[1]))fail('distinct complete original function substitutions required');}
  let result=source;for(const row of ordered.reverse())result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);if(Buffer.byteLength(result)>8388608)fail('complete composed native file byte bound');return result;
 }
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'receiving-bulk:recheck-each-authoritative-module-and-complete-native-function-equation',apply:()=>{
     if(!Array.isArray(settings)||!settings.length||settings.length>256)fail('bounded nonempty complete receiving module requests required');
     beforeProject=compile(files);const requestedPaths=new Set(),modules=[];
     for(const request of settings){
      const sourcePath=request.sourcePath,bindings=original.vectorBindings.filter(row=>row.javascriptPath===sourcePath);if(requestedPaths.has(sourcePath))fail('distinct actual receiving module routes required');requestedPaths.add(sourcePath);
      if(!bindings.length){
       const authority=Object.hasOwn(request,'javascript')?'javascript':'typescript';
       if(request[authority]===''&&files.get(sourcePath)===''&&files.get(request.typescriptPath)===''){
        const keys=['sourcePath','typescriptPath','nativeRoute',authority];if(Object.keys(request).length!==keys.length||keys.some(key=>!Object.hasOwn(request,key)))fail('exact canonical empty receiving request required');const route=nativeEmptyModuleRoute(request.nativeRoute);requireCurrentEmptyNativeModule(beforeProject,files,route);const pair=prepareEmptyNativeModulePair(sourcePath,request.typescriptPath),outputs=[{path:sourcePath,before:'',after:'',inverse:'',concreteSyntax:pair.javascript.concreteSyntax},{path:request.typescriptPath,before:'',after:'',inverse:'',concreteSyntax:pair.typescript.concreteSyntax}];modules.push({id:'module_'+hash(sourcePath),rustSource:route.rustPath,module:route.module,javascriptPath:sourcePath,typescriptPath:request.typescriptPath,bindings:[],outputs,nativeProposal:[],newNativeFunctions:false});continue;
       }
       const proposal=proposeOwnedPrimitiveFunctionInsertion(original,request),native=proposal.outputs.filter(row=>row.path===proposal.nativeRoute.rustPath);if(native.length!==1)fail('one complete fresh primitive native insertion required');modules.push({id:'module_'+hash(sourcePath),rustSource:proposal.nativeRoute.rustPath,module:proposal.nativeRoute.module,javascriptPath:sourcePath,typescriptPath:request.typescriptPath,bindings:proposal.bindings,outputs:proposal.outputs.filter(row=>row.path!==proposal.nativeRoute.rustPath),nativeProposal:native,newNativeFunctions:true,nativeInsertion:proposal.nativeInsertion});continue;
      }
      const proposal=proposeOwnedVectorNativeSynchronization(original,request);if(!same(proposal.selectedFunctions.map(row=>[row.path,row.name]).sort(),bindings.map(row=>[row.rustPath,row.rustName]).sort()))fail('complete requested native function selection differs');
      modules.push({id:'module_'+hash(sourcePath),rustSource:[...new Set(bindings.map(row=>row.rustPath))],module:null,javascriptPath:sourcePath,typescriptPath:request.typescriptPath,bindings,outputs:proposal.files,nativeProposal:proposal.rustEdits,newNativeFunctions:false});
     }
     requestedPaths.clear();discovered={modules,refusals:[],forwardCensus:ownedVectorOriginalProjectCensus(beforeProject)};
     const selected=new Set();
     for(const module of discovered.modules){
      for(const output of module.outputs){if(files.get(output.path)!==output.before||output.inverse!==output.before||generated.has(output.path))fail('distinct complete actual receiving source baselines required');generated.set(output.path,output);after.set(output.path,output.after);}
      for(const binding of module.bindings){const key=JSON.stringify([binding.rustPath,binding.rustName]);if(selected.has(key))fail('native source functions cannot have overlapping module owners');selected.add(key);}
      for(const native of module.nativeProposal){
       if(files.get(native.path)!==native.before)fail('complete current native proposal baseline differs');
       if(module.newNativeFunctions){
        const route={rustPath:module.rustSource,module:module.module};requireCurrentEmptyNativeModule(beforeProject,files,route);const scopes=beforeProject.sourceScopes.filter(row=>row.source===route.rustPath&&same(row.module,route.module)),insertion=module.nativeInsertion;if(scopes.length!==1||scopes[0].sourceView.bodySpan.end!==insertion.at||insertion.expected!==''||native.path!==route.rustPath)fail('actual fresh empty module insertion boundary differs');const row={kind:'native-function-insertion',span:[insertion.at,insertion.at],expected:'',replacement:insertion.replacement,names:module.bindings.map(row=>row.rustName)};if(substitute(native.before,[row])!==native.after)fail('complete native insertion changes source outside its actual empty-module boundary');if(!edits.has(native.path))edits.set(native.path,[]);edits.get(native.path).push(row);continue;
       }
       const targets=module.bindings.filter(binding=>binding.rustPath===native.path),ownEdits=[],capture=captureSourceModuleViews({source:native.after,sourcePath:native.path,compilationProfile:PRODUCTION_PROFILE});
       if(!targets.length)fail('native edit has no actual selected source function');
       for(const binding of targets){
        const carriers=beforeProject.executableDeclarations.filter(row=>row.source===binding.rustPath&&row.qualifiedName===binding.rustName);if(carriers.length!==1)fail('one actual original selected declaration required');
        const carrier=carriers[0],actual=carrier.checkedSource(),scopes=beforeProject.sourceScopes.filter(row=>row.source===binding.rustPath&&same(row.module,actual.module));
        if(carrier.sourceSha256!==hash(native.before)||actual.sourceSha256!==carrier.sourceSha256||actual.qualifiedName!==binding.rustName||!same(actual.span,carrier.span)||scopes.length!==1||!scopes[0].sourceView)fail('fresh original native carrier/module/source join differs');
        const originalItems=originalModuleViewItems(scopes[0].sourceView,native.before).filter(row=>row.term==='fn'&&row.name===carrier.name&&row.start===actual.span.start&&row.end===actual.span.end);
        const views=capture.views.filter(row=>same(row.modulePath,scopes[0].sourceView.modulePath));if(originalItems.length!==1||views.length!==1)fail('actual original and changed relative source module views differ');
        const replacements=originalModuleViewItems(views[0],native.after).filter(row=>row.term==='fn'&&row.name===carrier.name);if(replacements.length!==1)fail('one complete changed source function required');
        ownEdits.push({name:binding.rustName,span:[actual.span.start,actual.span.end],expected:native.before.slice(actual.span.start,actual.span.end),replacement:native.after.slice(replacements[0].start,replacements[0].end)});
       }
       // No sibling, import, attribute, comment outside the selected function
       // or unchecked declaration may disappear behind a per-module proposal.
       if(substitute(native.before,ownEdits)!==native.after)fail('native module proposal changes source outside its selected complete functions');
       if(!edits.has(native.path))edits.set(native.path,[]);edits.get(native.path).push(...ownEdits);
      }
     }
     for(const [path,rows]of edits)after.set(path,substitute(files.get(path),rows));return after;
    }},
    {id:'receiving-bulk:freshly-check-composed-project-and-every-receiving-body',apply:()=>{
     afterProject=compile(after);const baseline=ownedVectorOriginalProjectCensus(beforeProject),current=ownedVectorOriginalProjectCensus(afterProject),added=discovered.modules.filter(row=>row.newNativeFunctions).flatMap(row=>row.bindings.map(binding=>JSON.stringify([binding.rustPath,binding.rustName,'fn']))),insertions=new Set(added);if(insertions.size!==added.length||[...insertions].some(key=>baseline.executable.includes(key)||current.executable.filter(row=>row===key).length!==1)||!same(current.executable.filter(key=>!insertions.has(key)),baseline.executable)||!same(current.refused,baseline.refused)||!same(current.methods,baseline.methods)||!same(current.generatedMethods,baseline.generatedMethods))fail('composed native census must change only by the exact newly checked function insertions');insertions.clear();
     const bindings=[...original.vectorBindings,...discovered.modules.filter(row=>row.newNativeFunctions).flatMap(row=>row.bindings)],input={...original,vectorBindings:bindings,files:[...after].map(([path,source])=>({path,source}))},context=createOwnedVectorCandidateContext(input);contexts.push(context);
     for(const module of discovered.modules){
      const javascript=module.outputs.find(row=>row.path.endsWith('.mjs')),typescript=module.outputs.find(row=>/\.(?:mts|ts)$/u.test(row.path));if(!javascript||!typescript)fail('complete paired module outputs required');
      if(!module.bindings.length){requireCurrentEmptyNativeModule(afterProject,after,{rustPath:module.rustSource,module:module.module});const pair=prepareEmptyNativeModulePair(javascript.path,typescript.path);if(module.nativeProposal.length||javascript.after!==pair.javascript.source||typescript.after!==pair.typescript.source)fail('canonical empty receiving module must retain its complete independently checked pair');continue;}
      const result=translateOwnedVectorCandidate(javascript.after,{context,sourcePath:javascript.path,typescriptOutputPath:typescript.path});if(result.typescript!==typescript.after||result.program.length!==module.bindings.length)fail('composed receiving module does not reproduce its full canonical output');
      for(const item of result.program){const native=item.vectorOrigin.original,carriers=afterProject.executableDeclarations.filter(row=>row.source===native.path&&row.qualifiedName===native.qualifiedName);if(carriers.length!==1)fail('composed native selected function is absent or ambiguous');const carrier=carriers[0],actual=carrier.checkedSource();if(actual.sourceSha256!==hash(after.get(native.path))||!same(actualNativeProjectionTree(actual.declaration,item,carrier.lower()),requestedNativeProjectionTree(item)))fail('composed native whole body differs from its fresh receiving source');}
     }
     return afterProject;
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-one-composed-native-edit-per-file-and-complete-js-ts-inverses',apply:()=>{
    const nativeEdits=[...edits].map(([path,rows])=>{const before=files.get(path),next=after.get(path),history=transportConcreteSourceEquations([{before,after:next,language:'Rust'}])[0];return {path,before,after:next,inverse:before,functions:rows.flatMap(row=>row.kind==='native-function-insertion'?row.names.map(name=>({name,span:row.span,inserted:true})):[{name:row.name,span:row.span}]),history};}).filter(row=>row.before!==row.after);
    const retainedSourceBytes=original.files.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)+nativeEdits.reduce((sum,row)=>sum+Buffer.byteLength(row.before)+Buffer.byteLength(row.after),0)+[...generated.values()].reduce((sum,row)=>sum+Buffer.byteLength(row.after),0);if(retainedSourceBytes>33554432)fail('complete composed source proposal byte bound');
    return {schema:'router-owned-vector-bulk-module-sync-v1',sourceInputs:original.files,nativeEdits,outputs:[...generated.values()],modules:discovered.modules.map(({id,rustSource,module,javascriptPath,typescriptPath,newNativeFunctions,bindings})=>({id,rustSource,module,javascriptPath,typescriptPath,newNativeFunctions,bindings})),refusals:discovered.refusals,forwardCensus:ownedVectorOriginalProjectCensus(afterProject),retainedSourceBytes,selectedNativeSourceRechecked:true,composedNativeSourceRechecked:true,sourceAuthority:false,semanticAuthority:false,productionSelected:false,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   }}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,fenceError;for(const context of [start,...contexts])try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed){failed=true;fenceError=error;}}
  files.clear();after.clear();edits.clear();generated.clear();contexts.length=0;discovered=null;beforeProject=null;afterProject=null;if(!primaryFailed&&failed)throw fenceError;
 }

 });
}

import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';

import {proposeOwnedPrimitiveFunctionInsertion} from './owned-primitive-function-insertion.mjs';
import {nativeEmptyModuleRoute,requireCurrentEmptyNativeModule,prepareEmptyNativeModulePair} from './owned-native-empty-modules.mjs';
