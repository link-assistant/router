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
import {actualNativeJsonVectorTree,requestedNativeJsonVectorTree} from './owned-vector-native-json-control.mjs';
import {proposeOwnedNativeBulkDiscovery} from './owned-native-bulk-discovery.mjs';
const fail=message=>{throw new TypeError('Native bulk composition: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=source=>createHash('sha256').update(source).digest('hex');
/** Recompute discovery and every complete source join; no proposal parameter. */
export function proposeOwnedNativeBulkSynchronization(data,options={}){
 const original=ownedPlainData(data),settings=ownedPlainData(options),start=createOwnedCoreSourceContext(original),files=new Map(original.files.map(row=>[row.path,row.source])),after=new Map(files),contexts=[],edits=new Map(),generated=new Map();
 let discovered,beforeProject,afterProject,primaryFailed=false;
 const compile=sources=>{const dependency={manifest:sources.get('Cargo.toml'),lock:sources.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...sources.keys()].filter(path=>path.endsWith('.rs')).sort(),readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependency.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(dependency).proof,deriveDependencies:deriveDependencyProfile(dependency).proof});};
 function substitute(source,rows){
  const ordered=[...rows].sort((a,b)=>a.span[0]-b.span[0]);for(let index=0;index<ordered.length;index++){const row=ordered[index];if(!row.span.every(Number.isSafeInteger)||row.span[0]<0||row.span[1]<=row.span[0]||row.span[1]>source.length||source.slice(...row.span)!==row.expected||index&&ordered[index-1].span[1]>row.span[0])fail('distinct complete original function substitutions required');}
  let result=source;for(const row of ordered.reverse())result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);if(Buffer.byteLength(result)>8388608)fail('complete composed native file byte bound');return result;
 }
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'native-bulk:rediscover-current-source-and-rejoin-each-complete-function-equation',apply:()=>{
     discovered=proposeOwnedNativeBulkDiscovery(original,settings);beforeProject=compile(files);
     if(!same(discovered.forwardCensus,ownedVectorOriginalProjectCensus(beforeProject)))fail('fresh discovery and original native census differ');
     const selected=new Set();
     for(const module of discovered.modules){
      for(const output of module.outputs){if(files.has(output.path)||generated.has(output.path)||output.before!==null||output.inverse!==null)fail('distinct absent receiving source targets required');generated.set(output.path,output);after.set(output.path,output.after);}
      for(const binding of module.bindings){const key=JSON.stringify([binding.rustPath,binding.rustName]);if(selected.has(key))fail('native source functions cannot have overlapping module owners');selected.add(key);}
      for(const native of module.nativeProposal){
       if(files.get(native.path)!==native.before)fail('complete current native proposal baseline differs');
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
    {id:'native-bulk:freshly-check-composed-project-and-every-receiving-body',apply:()=>{
     afterProject=compile(after);if(!same(ownedVectorOriginalProjectCensus(beforeProject),ownedVectorOriginalProjectCensus(afterProject)))fail('composed complete executable/refusal/method census changed');
     const bindings=[...original.vectorBindings,...discovered.modules.flatMap(row=>row.bindings)],input={...original,vectorBindings:bindings,files:[...after].map(([path,source])=>({path,source}))},context=createOwnedVectorCandidateContext(input);contexts.push(context);
     for(const module of discovered.modules){
      const javascript=module.outputs.find(row=>row.path.endsWith('.mjs')),typescript=module.outputs.find(row=>row.path.endsWith('.mts'));if(!javascript||!typescript)fail('complete paired module outputs required');
      const result=translateOwnedVectorCandidate(javascript.after,{context,sourcePath:javascript.path,typescriptOutputPath:typescript.path});if(result.typescript!==typescript.after||result.program.length!==module.bindings.length)fail('composed receiving module does not reproduce its full canonical output');
      for(const item of result.program){const native=item.vectorOrigin.original,carriers=afterProject.executableDeclarations.filter(row=>row.source===native.path&&row.qualifiedName===native.qualifiedName);if(carriers.length!==1)fail('composed native selected function is absent or ambiguous');const carrier=carriers[0],actual=carrier.checkedSource();if(actual.sourceSha256!==hash(after.get(native.path))||!same(actualNativeJsonVectorTree(actual.declaration,item,carrier.lower()),requestedNativeJsonVectorTree(item)))fail('composed native whole body differs from its fresh receiving source');}
     }
     return afterProject;
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-one-composed-native-edit-per-file-and-absent-js-ts-targets',apply:()=>{
    const nativeEdits=[...edits].map(([path,rows])=>{const before=files.get(path),next=after.get(path),history=transportConcreteSourceEquations([{before,after:next,language:'Rust'}])[0];return {path,before,after:next,inverse:before,functions:rows.map(row=>({name:row.name,span:row.span})),history};}).filter(row=>row.before!==row.after);
    const retainedSourceBytes=original.files.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)+nativeEdits.reduce((sum,row)=>sum+Buffer.byteLength(row.before)+Buffer.byteLength(row.after),0)+[...generated.values()].reduce((sum,row)=>sum+Buffer.byteLength(row.after),0);if(retainedSourceBytes>33554432)fail('complete composed source proposal byte bound');
    return {schema:'router-owned-native-bulk-sync-v1',sourceInputs:original.files,nativeEdits,outputs:[...generated.values()],modules:discovered.modules.map(({id,rustSource,module,bindings})=>({id,rustSource,module,bindings})),refusals:discovered.refusals,forwardCensus:ownedVectorOriginalProjectCensus(afterProject),retainedSourceBytes,selectedNativeSourceRechecked:true,composedNativeSourceRechecked:true,sourceAuthority:false,semanticAuthority:false,productionSelected:false,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   }}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,fenceError;for(const context of [start,...contexts])try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed){failed=true;fenceError=error;}}
  files.clear();after.clear();edits.clear();generated.clear();contexts.length=0;discovered=null;beforeProject=null;afterProject=null;if(!primaryFailed&&failed)throw fenceError;
 }
}
