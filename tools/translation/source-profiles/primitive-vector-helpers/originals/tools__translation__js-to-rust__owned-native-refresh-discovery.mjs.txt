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
import {canonicalActualNativeJsonVectorTree as actualNativeJsonVectorTree,canonicalRequestedNativeJsonVectorTree as requestedNativeJsonVectorTree} from './owned-vector-native-json-control.mjs';
import {projectNativeTreeModule,nativeProjectionIdentifier,UnsupportedNativeTreeProjection} from './owned-native-tree-source.mjs';
import {observeNativePrimitiveVectorDomain,observeNativeProjectionTree,requestedNativeProjectionTree,nativeProjectionParameters,nativeProjectionParameterProposals} from './owned-native-vector-families.mjs';
import {selectNativeProjectionClosure} from './owned-native-projection-closure.mjs';
import {originalModuleViewItems} from '../source-module-views.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Native bulk refresh discovery: '+message);};
function domain(own,lowered,extended){
 if(extended){const vector=originalPrimitiveExpressionVectorDomain(own,lowered);if(vector){checkedPrimitiveExpressionVectorTail(own);return vector;}}
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
export function proposeOwnedNativeRefreshDiscovery(data,routing,options={}){
 return withOwnedNativeProjectOperation(()=>{
 const original=ownedPlainData(data),settings=ownedPlainData(routing),configuration=ownedPlainData(options),routes=new Map(),targetPaths=new Set();
 if(Object.keys(configuration).some(key=>key!=='newModules'))fail('unknown native refresh discovery option');const newModules=configuration.newModules??null;if(newModules!==null){const keys=['javascriptRoot','typescriptRoot'];if(!newModules||typeof newModules!=='object'||Array.isArray(newModules)||Object.keys(newModules).length!==2||keys.some(key=>!Object.hasOwn(newModules,key)))fail('exact new module receiving roots required');for(const key of keys)ownedSourcePath(newModules[key]);if(newModules.javascriptRoot===newModules.typescriptRoot)fail('new receiving roots must be distinct');}
 if(!Array.isArray(settings)||!settings.length||settings.length>256)fail('bounded nonempty complete current module routes required');
 if(original.primitiveOperators===true)fail('separate primitive-operator refresh rules remain open');
 for(const route of settings){
  const keys=['rustPath','module','javascriptPath','typescriptPath'];if(!route||typeof route!=='object'||Object.keys(route).length!==keys.length||keys.some(key=>!Object.hasOwn(route,key))||!Array.isArray(route.module)||route.module.length>64||route.module.some(name=>typeof name!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)))fail('exact actual file/module and receiving paths required');
  for(const path of [route.rustPath,route.javascriptPath,route.typescriptPath])ownedSourcePath(path);if(!route.rustPath.endsWith('.rs')||!route.javascriptPath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(route.typescriptPath))fail('complete native and paired receiving paths required');
  const key=JSON.stringify([route.rustPath,route.module]);if(routes.has(key)||targetPaths.has(route.javascriptPath)||targetPaths.has(route.typescriptPath))fail('distinct actual native module and receiving ownership required');routes.set(key,route);targetPaths.add(route.javascriptPath);targetPaths.add(route.typescriptPath);
 }
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
       const actual=captured(entry),own=actual.declaration;let nativeDomain,projectedParameters,receivingName,preserveReceivingName=false;
       try{nativeDomain=domain(own,entry.lower(),hasPrimitiveExpressionVectorRuntime(files,original));if(!nativeDomain)throw new UnsupportedNativeTreeProjection('native signature needs another source family');const priorKey=JSON.stringify([entry.source,entry.qualifiedName]),prior=priorBindings.get(priorKey);if(priorBindings.has(priorKey)&&!prior)fail('ambiguous previous native source ownership');receivingName=prior?prior.javascriptName:entry.name;preserveReceivingName=!!prior;if(!nativeProjectionIdentifier(receivingName))throw new UnsupportedNativeTreeProjection('existing receiving function needs an explicit hygienic spelling');let spelling=null;if(prior&&files.has(prior.javascriptPath)){if(!spellingModules.has(prior.javascriptPath))spellingModules.set(prior.javascriptPath,nativeProjectionParameterProposals(files.get(prior.javascriptPath),prior.javascriptPath));spelling=spellingModules.get(prior.javascriptPath).get(prior.javascriptName)??null;}projectedParameters=nativeProjectionParameters(own,nativeDomain,spelling);if(!nativeProjectionIdentifier(entry.name)||projectedParameters.some(row=>!nativeProjectionIdentifier(row.name)))throw new UnsupportedNativeTreeProjection('native bindings need a hygienic spelling rule');}catch(error){if(!(error instanceof TypeError))throw error;refusal(entry,'native-signature-projection',error);continue;}
       const key=JSON.stringify([entry.source,actual.module]),existingRoute=routes.get(key);if(!existingRoute&&!newModules)continue;const id='module_'+hash(key),route=existingRoute??{javascriptPath:newModules.javascriptRoot+'/'+id+'.mjs',typescriptPath:newModules.typescriptRoot+'/'+id+'.mts'},{javascriptPath,typescriptPath}=route;
       if(!existingRoute&&!groups.has(key)){for(const path of [javascriptPath,typescriptPath]){ownedSourcePath(path);if(targetPaths.has(path)||files.has(path))fail('new receiving modules require distinct absent targets');targetPaths.add(path);}}
       if(!groups.has(key)){if(groups.size>=256)fail('bounded complete native refresh module count required');groups.set(key,{id,key,source:entry.source,module:actual.module,javascriptPath,typescriptPath,newReceivingModule:!existingRoute,units:[]});}
       if(!targetGroups.has(key))targetGroups.set(key,new Map());
       if(nativeDomain.kind==='primitive-scalar'){const descriptor={rust:entry.qualifiedName,parameters:nativeDomain.parameters.map(row=>row.name),returns:nativeDomain.type},targets=targetGroups.get(key);for(const name of [entry.qualifiedName,'rp_'+Buffer.from(entry.qualifiedName).toString('hex')]){if(targets.has(name))fail('ambiguous same-module native helper source');targets.set(name,descriptor);}}
       candidates.push({entry,actual,own,nativeDomain,key,projectedParameters,receivingName,preserveReceivingName});
      }
      for(const {entry,own,nativeDomain,key,projectedParameters,receivingName,preserveReceivingName}of candidates){
       try{
        const observation={params:own.params.map((row,index)=>({name:row.name,rust:row.name,type:nativeDomain.parameters[index].name})),returns:nativeDomain.type,vectorOrigin:{kind:nativeDomain.kind,type:nativeDomain.type,element:nativeDomain.element}},tree=observeNativeProjectionTree(own,observation,entry.lower(),targetGroups.get(key));
        groups.get(key).units.push({entry,name:receivingName,preserveReceivingName,rust:entry.qualifiedName,kind:nativeDomain.kind,parameters:projectedParameters,returns:nativeDomain.type,element:nativeDomain.element,tree});
       }catch(error){if(!(error instanceof TypeError))throw error;refusal(entry,'native-body-projection',error);}
      }
      for(const group of groups.values()){
       const parameterNames=new Set(group.units.flatMap(unit=>unit.parameters.map(row=>row.name))),occupied=new Set([...parameterNames,...group.units.map(unit=>unit.name)]),preserved=new Set();let aliasSequence=0;
       for(const unit of group.units)if(unit.preserveReceivingName){if(preserved.has(unit.name)||parameterNames.has(unit.name))fail('existing receiving export collides with current module bindings; explicit reconciliation required');preserved.add(unit.name);}
       for(const unit of group.units)if(!unit.preserveReceivingName&&(parameterNames.has(unit.name)||preserved.has(unit.name))){let alias='native_function_'+unit.name;while(occupied.has(alias))alias='native_function_'+unit.name+'_'+aliasSequence++;occupied.add(alias);unit.name=alias;}parameterNames.clear();occupied.clear();preserved.clear();
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
      if(group.newReceivingModule?files.has(group.javascriptPath)||files.has(group.typescriptPath):!files.has(group.javascriptPath)||!files.has(group.typescriptPath))fail('receiving module pair must match its existing or absent source baseline');
      let projected;try{projected=projectNativeTreeModule(group.units.map(({name,rust,kind,parameters,returns,element,tree})=>({name,rust,kind,parameters,returns,element,tree})),{javascriptPath:group.javascriptPath,typescriptPath:group.typescriptPath,runtimeRoot:original.runtimeRoot});}catch(error){if(!(error instanceof UnsupportedNativeTreeProjection))throw error;for(const unit of group.units)refusal(unit.entry,'module-source-projection',error);continue;}
      const pair=prepareOwnedVectorModulePair(group.javascriptPath,group.typescriptPath,projected.typescript),bindings=group.units.map(unit=>({javascriptPath:group.javascriptPath,javascriptName:unit.name,rustPath:unit.entry.source,rustName:unit.entry.qualifiedName}));
      const projectedFiles=new Map(original.files.map(row=>[row.path,row.source]));projectedFiles.set(group.javascriptPath,pair.javascript.source);projectedFiles.set(group.typescriptPath,pair.typescript.source);const input={...original,vectorBindings:[...original.vectorBindings.filter(row=>row.javascriptPath!==group.javascriptPath),...bindings],files:[...projectedFiles].map(([path,source])=>({path,source}))};projectedFiles.clear();
      const context=createOwnedVectorCandidateContext(input);contexts.push(context);
      // Genuine import symbols, source ABI, loans, complete CST/serialized meta
      // and all receiving function bodies are reconstructed by this checker.
      const checked=translateOwnedVectorCandidate(pair.javascript.source,{context,sourcePath:group.javascriptPath,typescriptOutputPath:group.typescriptPath});
      if(checked.program.length!==group.units.length)fail('complete selected receiving function census differs');
      for(const item of checked.program){const units=group.units.filter(unit=>unit.name===item.javascript);if(units.length!==1||!equal(requestedNativeProjectionTree(item),units[0].tree))fail('receiving source changes an original ordered body or effect');}
      const synchronized=proposeOwnedVectorNativeSynchronization(input,{sourcePath:group.javascriptPath,typescriptPath:group.typescriptPath,typescript:checked.typescript});
      if(!equal(synchronized.selectedFunctions.map(row=>[row.path,row.name]).sort(),bindings.map(row=>[row.rustPath,row.rustName]).sort()))fail('fresh native selection differs');
      const outputs=[{path:group.javascriptPath,before:files.get(group.javascriptPath)??null,after:synchronized.javascript},{path:group.typescriptPath,before:files.get(group.typescriptPath)??null,after:synchronized.typescript}];
      for(const output of outputs){const concrete=transportConcreteSyntaxSource(output.after,{language:output.path.endsWith('.mjs')?'JavaScript':'TypeScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==output.after)fail('new complete receiving CST inverse differs');output.concreteSyntax=concrete.meta;output.inverse=output.before;retainedBytes+=Buffer.byteLength(output.after);}
      const nativeEquations=transportConcreteSourceEquations(synchronized.rustEdits.map(row=>({before:row.before,after:row.after,language:'Rust'})));
      for(const row of synchronized.rustEdits)retainedBytes+=Buffer.byteLength(row.after);
      if(retainedBytes>16777216)fail('retained complete bulk source proposal byte budget');
      projections.push({id:group.id,rustSource:group.source,module:group.module,javascriptPath:group.javascriptPath,typescriptPath:group.typescriptPath,newReceivingModule:group.newReceivingModule,bindings,outputs,nativeProposal:synchronized.rustEdits.map((row,index)=>({...row,history:nativeEquations[index]})),selectedNativeSourceRechecked:true,originalOrderedBodiesReproduced:true,nativeInstalled:false,receivingExecuted:false,runtimeParity:false});
     }
     for(const route of routes.values()){
      let modules=projections.filter(row=>row.rustSource===route.rustPath&&equal(row.module,route.module));
      if(modules.length===0){
       requireCurrentEmptyNativeModule(project,files,{rustPath:route.rustPath,module:route.module});if(!files.has(route.javascriptPath)||!files.has(route.typescriptPath))fail('complete existing empty receiving pair baselines required');const pair=prepareEmptyNativeModulePair(route.javascriptPath,route.typescriptPath),outputs=[{path:route.javascriptPath,before:files.get(route.javascriptPath),after:pair.javascript.source,concreteSyntax:pair.javascript.concreteSyntax},{path:route.typescriptPath,before:files.get(route.typescriptPath),after:pair.typescript.source,concreteSyntax:pair.typescript.concreteSyntax}];
       for(const output of outputs){output.inverse=output.before;retainedBytes+=Buffer.byteLength(output.after);}if(retainedBytes>16777216)fail('retained complete empty source proposal byte budget');const empty={id:'module_'+hash(JSON.stringify([route.rustPath,route.module])),rustSource:route.rustPath,module:route.module,javascriptPath:route.javascriptPath,typescriptPath:route.typescriptPath,newReceivingModule:false,bindings:[],outputs,nativeProposal:[],emptyNativeModule:true,selectedNativeSourceRechecked:true,originalOrderedBodiesReproduced:true,nativeInstalled:false,receivingExecuted:false,runtimeParity:false};projections.push(empty);modules=[empty];
      }
      if(modules.length!==1)fail('one complete current module projection required');
      if(modules[0].bindings.length===0){requireCurrentEmptyNativeModule(project,files,{rustPath:route.rustPath,module:route.module});continue;}
      const scopes=project.sourceScopes.filter(row=>row.source===route.rustPath&&equal(row.module,route.module));if(scopes.length!==1)fail('one actual current refresh module scope required');const items=originalModuleViewItems(scopes[0].sourceView,files.get(route.rustPath));
      for(const binding of original.vectorBindings.filter(row=>row.javascriptPath===route.javascriptPath)){
       if(binding.rustPath!==route.rustPath||!equal(binding.rustName.split('.').slice(0,-1),route.module))fail('old source binding does not belong to the current route');
       const name=binding.rustName.split('.').at(-1);if(items.some(row=>row.term==='fn'&&row.name===name)&&!modules[0].bindings.some(row=>row.rustName===binding.rustName))fail('a present unsupported native function cannot silently disappear from an existing receiving module');
      }
     }
     if(projections.length>256)fail('complete refreshed and new module count exceeds original batch bound');return projections;
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-source-preserved-refusals-and-uninstalled-js-ts-native-proposals',apply:()=>({schema:'router-owned-native-bulk-refresh-discovery-v1',sourceInputs:original.files,modules:projections,refusals,forwardCensus:ownedVectorOriginalProjectCensus(project),retainedSourceBytes:retainedBytes,sourceAuthority:false,semanticAuthority:false,productionSelected:false,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false})}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let fenceError,failed=false;for(const context of [start,...contexts])try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed){failed=true;fenceError=error;}}
  files.clear();groups.clear();routes.clear();targetPaths.clear();contexts.length=0;project=null;if(!primaryFailed&&failed)throw fenceError;
 }

 });
}

import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';

import {requireCurrentEmptyNativeModule,prepareEmptyNativeModulePair} from './owned-native-empty-modules.mjs';

import {hasPrimitiveExpressionVectorRuntime,originalPrimitiveExpressionVectorDomain,checkedPrimitiveExpressionVectorTail} from './owned-primitive-expression-vectors.mjs';
