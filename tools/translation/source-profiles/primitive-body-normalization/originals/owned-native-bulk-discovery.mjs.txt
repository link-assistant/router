// Automatic selected-module source proposals. SOURCE ONLY; ALL UNRUN.
// Each invocation starts with actual source, not a saved census or model.
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {ownedPlainData,ownedSourcePath,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-vector-candidate-source.mjs';
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate} from './owned-vector-candidate.mjs';
import {prepareOwnedVectorModulePair} from './owned-vector-module-pair.mjs';
import {proposeOwnedVectorNativeSynchronization} from './owned-vector-native-synchronization.mjs';
import {ownedVectorOriginalProjectCensus} from './owned-vector-candidate-support.mjs';
import {originalJsonVectorDomain,originalJsonOwnedValueDomain,originalJsonScalarDomain,originalPrimitiveScalarDomain} from './owned-vector-json-native.mjs';
import {actualNativeJsonVectorTree,requestedNativeJsonVectorTree} from './owned-vector-native-json-control.mjs';
import {projectNativeTreeModule,nativeProjectionIdentifier,UnsupportedNativeTreeProjection} from './owned-native-tree-source.mjs';
import {observeNativePrimitiveVectorDomain,observeNativeProjectionTree,requestedNativeProjectionTree,nativeProjectionParameters,nativeProjectionParameterProposals} from './owned-native-vector-families.mjs';
import {selectNativeProjectionClosure} from './owned-native-projection-closure.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Native bulk discovery: '+message);};
function domain(own,lowered){
 const primitive=originalPrimitiveScalarDomain(own,lowered);if(primitive)return primitive;
 if(own.ret?.kind==='unit'||own.ret?.kind==='bool'||own.ret?.kind==='fixed')return originalJsonScalarDomain(own,lowered);
 if(own.ret?.kind==='data')return originalJsonOwnedValueDomain(own,lowered);
 if(own.ret?.kind==='array')return originalJsonVectorDomain(own,lowered)??observeNativePrimitiveVectorDomain(own,lowered);
 return null;
}
/**
 * No installation or code execution. Newly generated modules remain source
 * proposals, even after independent checker/model/fixed-point comparisons.
 * Failures retain actual function identities and never become coverage counts.
 */
export function proposeOwnedNativeBulkDiscovery(data,options={}){
 return withOwnedNativeProjectOperation(()=>{
 const original=ownedPlainData(data),settings=ownedPlainData(options),allowed=['javascriptRoot','typescriptRoot'];
 if(Object.keys(settings).some(key=>!allowed.includes(key)))fail('unknown discovery option');
 if(original.primitiveOperators===true)fail('separate primitive-operator discovery rules remain open');
 const javascriptRoot=settings.javascriptRoot??posix.dirname(original.runtimeRoot)+'/src/translated',typescriptRoot=settings.typescriptRoot??posix.dirname(original.declarationRoot)+'/src/translated';
 ownedSourcePath(javascriptRoot);ownedSourcePath(typescriptRoot);
 const start=createOwnedCoreSourceContext(original),files=new Map(original.files.map(row=>[row.path,row.source])),groups=new Map(),contexts=[],projections=[],refusals=[];
 let project,primaryFailed=false,retainedBytes=original.files.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0);
 const refusal=(entry,stage,error)=>{if(refusals.length>=4096)fail('bounded complete refusal list required');refusals.push({path:entry.source,name:entry.qualifiedName,stage,reason:String(error?.message??error).slice(0,4096),sourcePreserved:true,executableAdmission:false});};
 function captured(entry){
  const source=files.get(entry.source);if(typeof source!=='string'||entry.sourceSha256!==hash(source)||typeof entry.checkedSource!=='function'||typeof entry.lower!=='function')fail('actual native source/carrier differs');
  const value=entry.checkedSource();if(value.schema!=='original-checked-executable-source-v1'||value.source!==entry.source||value.sourceSha256!==hash(source)||value.qualifiedName!==entry.qualifiedName||!equal(value.span,entry.span)||value.declaration?.fullName!==entry.qualifiedName||!equal(value.declaration.span,value.checkedSpan)||!equal(value.module,entry.qualifiedName.split('.').slice(0,-1)))fail('complete actual original declaration join differs');
  if(!Number.isSafeInteger(value.span?.start)||!Number.isSafeInteger(value.span?.end)||value.span.start<0||value.span.end<=value.span.start||value.span.end>source.length)fail('actual complete source span required');
  return value;
 }
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'native-bulk:fresh-complete-source-project-and-declaration-discovery',apply:()=>{
     const inputs={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};
     project=translateProject({entry:'src/lib.rs',paths:[...files.keys()].filter(path=>path.endsWith('.rs')).sort(),readSource:path=>files.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:inputs.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(inputs).proof,deriveDependencies:deriveDependencyProfile(inputs).proof});
     if(project.executableDeclarations.length>4096)fail('bounded actual declaration census required');
     const candidates=[],targetGroups=new Map(),spellingModules=new Map(),priorBindings=new Map();for(const row of original.vectorBindings){const key=JSON.stringify([row.rustPath,row.rustName]);if(priorBindings.has(key))priorBindings.set(key,null);else priorBindings.set(key,row);}
     try{
      for(const entry of project.executableDeclarations){
       const actual=captured(entry),own=actual.declaration;let nativeDomain,projectedParameters;
       try{nativeDomain=domain(own,entry.lower());if(!nativeDomain)throw new UnsupportedNativeTreeProjection('native signature needs another source family');const prior=priorBindings.get(JSON.stringify([entry.source,entry.qualifiedName]));let spelling=null;if(prior&&files.has(prior.javascriptPath)){if(!spellingModules.has(prior.javascriptPath))spellingModules.set(prior.javascriptPath,nativeProjectionParameterProposals(files.get(prior.javascriptPath),prior.javascriptPath));spelling=spellingModules.get(prior.javascriptPath).get(prior.javascriptName)??null;}projectedParameters=nativeProjectionParameters(own,nativeDomain,spelling);if(!nativeProjectionIdentifier(entry.name)||projectedParameters.some(row=>!nativeProjectionIdentifier(row.name)))throw new UnsupportedNativeTreeProjection('native bindings need a hygienic spelling rule');}catch(error){if(!(error instanceof TypeError))throw error;refusal(entry,'native-signature-projection',error);continue;}
       const key=JSON.stringify([entry.source,actual.module]),id='module_'+hash(key),javascriptPath=javascriptRoot+'/'+id+'.mjs',typescriptPath=typescriptRoot+'/'+id+'.mts';ownedSourcePath(javascriptPath);ownedSourcePath(typescriptPath);
       if(!groups.has(key))groups.set(key,{id,key,source:entry.source,module:actual.module,javascriptPath,typescriptPath,units:[]});
       if(!targetGroups.has(key))targetGroups.set(key,new Map());
       if(nativeDomain.kind==='primitive-scalar'){const descriptor={rust:entry.qualifiedName,parameters:nativeDomain.parameters.map(row=>row.name),returns:nativeDomain.type},targets=targetGroups.get(key);for(const name of [entry.qualifiedName,'rp_'+Buffer.from(entry.qualifiedName).toString('hex')]){if(targets.has(name))fail('ambiguous same-module native helper source');targets.set(name,descriptor);}}
       candidates.push({entry,actual,own,nativeDomain,key,projectedParameters});
      }
      for(const {entry,own,nativeDomain,key,projectedParameters}of candidates){
       try{
        const observation={params:own.params.map((row,index)=>({name:row.name,rust:row.name,type:nativeDomain.parameters[index].name})),returns:nativeDomain.type,vectorOrigin:{kind:nativeDomain.kind,element:nativeDomain.element}},tree=observeNativeProjectionTree(own,observation,entry.lower(),targetGroups.get(key));
        groups.get(key).units.push({entry,name:entry.name,rust:entry.qualifiedName,kind:nativeDomain.kind,parameters:projectedParameters,returns:nativeDomain.type,element:nativeDomain.element,tree});
       }catch(error){if(!(error instanceof TypeError))throw error;refusal(entry,'native-body-projection',error);}
      }
      for(const group of groups.values()){
       const parameterNames=new Set(group.units.flatMap(unit=>unit.parameters.map(row=>row.name))),occupied=new Set([...parameterNames,...group.units.map(unit=>unit.name)]);let aliasSequence=0;
       for(const unit of group.units)if(parameterNames.has(unit.name)){let alias='native_function_'+unit.name;while(occupied.has(alias))alias='native_function_'+unit.name+'_'+aliasSequence++;occupied.add(alias);unit.name=alias;}parameterNames.clear();occupied.clear();
       const closure=selectNativeProjectionClosure(group.units.map(({name,rust,kind,parameters,returns,element,tree})=>({name,rust,kind,parameters,returns,element,tree}))),admitted=new Set(closure.admitted);
       for(const row of closure.refusals){const units=group.units.filter(unit=>unit.rust===row.rust);if(units.length!==1)fail('one complete actual refused helper source required');refusal(units[0].entry,'native-helper-closure',row.reason);}
       group.units=group.units.filter(unit=>admitted.has(unit.name));admitted.clear();
      }
     }finally{candidates.length=0;for(const targets of targetGroups.values())targets.clear();targetGroups.clear();for(const names of spellingModules.values())names.clear();spellingModules.clear();priorBindings.clear();}
     return groups;
    }},
    {id:'native-bulk:project-and-independently-recheck-whole-selected-modules',apply:()=>{
     for(const group of groups.values()){
      if(!group.units.length)continue;
      if(files.has(group.javascriptPath)||files.has(group.typescriptPath))fail('existing receiving source requires explicit synchronization, never discovery overwrite');
      let projected;try{projected=projectNativeTreeModule(group.units.map(({name,rust,kind,parameters,returns,element,tree})=>({name,rust,kind,parameters,returns,element,tree})),{javascriptPath:group.javascriptPath,typescriptPath:group.typescriptPath,runtimeRoot:original.runtimeRoot});}catch(error){if(!(error instanceof UnsupportedNativeTreeProjection))throw error;for(const unit of group.units)refusal(unit.entry,'module-source-projection',error);continue;}
      const pair=prepareOwnedVectorModulePair(group.javascriptPath,group.typescriptPath,projected.typescript),bindings=group.units.map(unit=>({javascriptPath:group.javascriptPath,javascriptName:unit.name,rustPath:unit.entry.source,rustName:unit.entry.qualifiedName}));
      const input={...original,vectorBindings:[...original.vectorBindings,...bindings],files:[...original.files,{path:group.javascriptPath,source:pair.javascript.source},{path:group.typescriptPath,source:pair.typescript.source}]};
      const context=createOwnedVectorCandidateContext(input);contexts.push(context);
      // Genuine import symbols, source ABI, loans, complete CST/serialized meta
      // and all receiving function bodies are reconstructed by this checker.
      const checked=translateOwnedVectorCandidate(pair.javascript.source,{context,sourcePath:group.javascriptPath,typescriptOutputPath:group.typescriptPath});
      if(checked.program.length!==group.units.length)fail('complete selected receiving function census differs');
      for(const item of checked.program){const units=group.units.filter(unit=>unit.name===item.javascript);if(units.length!==1||!equal(requestedNativeProjectionTree(item),units[0].tree))fail('receiving source changes an original ordered body or effect');}
      const synchronized=proposeOwnedVectorNativeSynchronization(input,{sourcePath:group.javascriptPath,typescriptPath:group.typescriptPath,typescript:checked.typescript});
      if(!equal(synchronized.selectedFunctions.map(row=>[row.path,row.name]).sort(),bindings.map(row=>[row.rustPath,row.rustName]).sort()))fail('fresh native selection differs');
      const outputs=[{path:group.javascriptPath,before:null,after:synchronized.javascript},{path:group.typescriptPath,before:null,after:synchronized.typescript}];
      for(const output of outputs){const concrete=transportConcreteSyntaxSource(output.after,{language:output.path.endsWith('.mjs')?'JavaScript':'TypeScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==output.after)fail('new complete receiving CST inverse differs');output.concreteSyntax=concrete.meta;output.inverse=null;retainedBytes+=Buffer.byteLength(output.after);}
      const nativeEquations=transportConcreteSourceEquations(synchronized.rustEdits.map(row=>({before:row.before,after:row.after,language:'Rust'})));
      for(const row of synchronized.rustEdits)retainedBytes+=Buffer.byteLength(row.after);
      if(retainedBytes>16777216)fail('retained complete bulk source proposal byte budget');
      projections.push({id:group.id,rustSource:group.source,module:group.module,bindings,outputs,nativeProposal:synchronized.rustEdits.map((row,index)=>({...row,history:nativeEquations[index]})),selectedNativeSourceRechecked:true,originalOrderedBodiesReproduced:true,nativeInstalled:false,receivingExecuted:false,runtimeParity:false});
     }
     return projections;
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-source-preserved-refusals-and-uninstalled-js-ts-native-proposals',apply:()=>({schema:'router-owned-native-bulk-discovery-v1',sourceInputs:original.files,modules:projections,refusals,forwardCensus:ownedVectorOriginalProjectCensus(project),retainedSourceBytes:retainedBytes,sourceAuthority:false,semanticAuthority:false,productionSelected:false,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false})}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let fenceError,failed=false;for(const context of [start,...contexts])try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed){failed=true;fenceError=error;}}
  files.clear();groups.clear();contexts.length=0;project=null;if(!primaryFailed&&failed)throw fenceError;
 }

 });
}

import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';
