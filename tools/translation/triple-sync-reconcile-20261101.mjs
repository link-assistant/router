// Complete additive native-plus-target reconciliation copy, source-only UNRUN.
// Genuine original inverse issuers check committed native source; no overrides.
import {resolve} from 'node:path';
import {captureSourceUnitGitBaseline,resolveSourceUnitGitBaseline} from './source-unit-git-baseline.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {translateProject} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {loadJsonMacroSourceProof} from './json-macro-sources.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {createForwardProjectRuntimeMapping} from './forward-project-runtime-mapping.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {installFreshAsyncSourceProposal} from './unit-runtime-materialization.mjs';
import {proposeForwardLiteralSynchronization} from './forward-literal-synchronization.mjs';
import {proposeForwardReturnExpressionSynchronization} from './forward-return-expression-synchronization.mjs';
import {proposeForwardScalarBodySynchronization} from './forward-scalar-body-synchronization.mjs';
import {proposeForwardControlBodySynchronization} from './forward-control-body-synchronization.mjs';
import {proposeForwardImperativeBodySynchronization} from './forward-imperative-body-synchronization.mjs';
import {proposeForwardRangeBodySynchronization} from './forward-range-body-synchronization.mjs';
import {proposeForwardFloatingBodySynchronization} from './forward-floating-body-synchronization.mjs';
import {proposeForwardStandardFloatingBodySynchronization} from './forward-standard-floating-body-synchronization.mjs';
import {proposeForwardStandardNumericBodySynchronization} from './forward-standard-numeric-body-synchronization.mjs';
import {proposeForwardTextPredicateSynchronization} from './forward-text-predicate-synchronization.mjs';
import {proposeForwardCompositeSynchronization} from './forward-composite-synchronization.mjs';
import {proposeForwardOwnedFormatBodySynchronization} from './forward-owned-format-body-synchronization.mjs';
import {proposeForwardOwnedCompositeSynchronization} from './forward-owned-composite-synchronization.mjs';
import {createReconcileSourceCapture,relativeReconcilePath as path,requireReconcile as need,reconcileHead,ordinal,boundedReconcileWireBytes,RECONCILE_LIMITS} from './paired-sync-reconcile-20261101-support.mjs';

const SCHEMA='router-triple-sync-reconcile-20261101-v1';
const inverses=Object.freeze({
 literals:proposeForwardLiteralSynchronization,'return-expressions':proposeForwardReturnExpressionSynchronization,
 'scalar-bodies':proposeForwardScalarBodySynchronization,'control-bodies':proposeForwardControlBodySynchronization,
 'imperative-bodies':proposeForwardImperativeBodySynchronization,'range-bodies':proposeForwardRangeBodySynchronization,
 'floating-bodies':proposeForwardFloatingBodySynchronization,'standard-floating-bodies':proposeForwardStandardFloatingBodySynchronization,
 'standard-numeric-bodies':proposeForwardStandardNumericBodySynchronization,'text-predicates':proposeForwardTextPredicateSynchronization,
 'composite-bodies':proposeForwardCompositeSynchronization,'owned-format-bodies':proposeForwardOwnedFormatBodySynchronization,
 'owned-composite-bodies':proposeForwardOwnedCompositeSynchronization,
});
function manifest(text,manifestPath){
 const unit=JSON.parse(text),required=['schema','id','entry','authority','javascript','typescript','meta','inverse'];
 need(unit&&typeof unit==='object'&&!Array.isArray(unit)&&required.every(key=>Object.hasOwn(unit,key))&&Object.keys(unit).every(key=>required.includes(key)||key==='baselineRevision'),'closed original forward manifest required');
 need(unit.schema==='router-forward-project-unit-v1'&&typeof unit.id==='string'&&unit.id.length>0&&unit.id.length<=256,'actual existing project unit required');
 need(unit.authority==='auto','native-plus-target reconciliation requires auto authority');
 need(Object.hasOwn(inverses,unit.inverse),'existing complete inverse family required');
 for(const key of ['entry','javascript','typescript','meta'])path(unit[key]);
 need(unit.entry.endsWith('.rs')&&unit.javascript.startsWith('js/src/')&&/\.m?js$/u.test(unit.javascript)&&unit.typescript.startsWith('ts/src/')&&/\.(?:mts|ts)$/u.test(unit.typescript)&&unit.meta.endsWith('.json'),'original physical Rust/JS/TS paths required');
 need(new Set([manifestPath,unit.entry,unit.javascript,unit.typescript,unit.meta]).size===5,'source, target, manifest and metadata paths must be distinct');return unit;
}
function census(compiled){
 const key=row=>JSON.stringify([row.source,row.name,row.term??'fn']);
 return {executable:compiled.meta.executable.map(key).sort(ordinal),refused:compiled.meta.refused.map(key).sort(ordinal),methods:(compiled.meta.checkedMethods??[]).map(key).sort(ordinal),generatedMethods:(compiled.meta.checkedGeneratedMethods??[]).map(key).sort(ordinal)};
}
function completeCandidate(proposal,original,language,requested){
 // This function receives only the direct result of an original inverse call
 // made below, never caller-supplied metadata or a saved serialized proposal.
 need(proposal.requestedSource?.language===language&&proposal.requestedSource.source===requested,'fresh original candidate target join differs');
 need(Array.isArray(proposal.sourceInputs)&&proposal.sourceInputs.length===original.size&&new Set(proposal.sourceInputs.map(row=>row.path)).size===original.size&&proposal.sourceInputs.every(row=>original.has(row.path)&&original.get(row.path)===row.source),'fresh candidate complete original source join differs');
 need(Array.isArray(proposal.rustEdits)&&proposal.rustEdits.length>0&&new Set(proposal.rustEdits.map(row=>row.path)).size===proposal.rustEdits.length,'complete unique candidate native edits required');
 const next=new Map(original);
 for(const edit of proposal.rustEdits){need(next.has(edit.path)&&next.get(edit.path)===edit.before&&typeof edit.after==='string'&&edit.history?.inverse===edit.before,'fresh candidate complete native inverse differs');next.set(edit.path,edit.after);}
 need(typeof proposal.javascript==='string'&&typeof proposal.typescript==='string','complete fresh paired projection required');return next;
}
function exactMaps(left,right){return left.size===right.size&&[...left].every(([name,source])=>right.has(name)&&right.get(name)===source);}

/** Reconcile authored current Rust plus changed targets with exact source agreement. */
export function planTripleSyncReconciliation({root,manifestPath}={}){
 path(manifestPath);const captured=createReconcileSourceCapture(resolve(root));root=captured.root;
 let revision,tree,runtime,primary,failed=false,result;const closers=[];
 try{
  revision=reconcileHead(root);const manifestSource=captured.capture(manifestPath).source;need(manifestSource!==null,'actual project manifest is missing');const unit=manifest(manifestSource,manifestPath);
  const layout=repositoryRustLayout(root),prefix=layout.productionPrefix.replace(/\/$/u,'');tree=captured.census(prefix);
  const currentNative=new Map(tree.names.map(name=>[name,captured.capture(name).source]));need(currentNative.has(unit.entry),'actual complete native entry required');
  const cargoRows=layout.cargoInputs.map(name=>captured.capture(name));need(cargoRows.every(row=>row.source!==null),'complete actual Cargo/workspace inputs required');
  const cargo={manifest:captured.capture(layout.manifest).source,lock:captured.capture(layout.lock).source};
  const currentJavaScript=captured.capture(unit.javascript),currentTypeScript=captured.capture(unit.typescript),beforeMeta=captured.capture(unit.meta);
  need(currentJavaScript.source!==null&&currentTypeScript.source!==null,'both actual edited peers must exist');
  const baselineRevision=resolveSourceUnitGitBaseline(root,revision,unit.baselineRevision);
  const baseline=captureSourceUnitGitBaseline(root,baselineRevision,{prefix,paths:[...currentNative.keys(),...layout.cargoInputs,unit.javascript,unit.typescript]});
  for(const row of baseline.values())captured.charge(row.source);
  const nativeNames=[...baseline.keys()].filter(name=>name.startsWith(prefix+'/')&&name.endsWith('.rs')).sort(ordinal);
  need(JSON.stringify(nativeNames)===JSON.stringify(tree.names),'native addition/deletion/rename requires separate topology reconciliation');
  for(const name of layout.cargoInputs){
   const actual=captured.capture(name),previous=baseline.get(name);need(previous&&previous.source===actual.source&&previous.mode===actual.mode,'concurrent native/Cargo edit or missing baseline: '+name);
  }
  const original=new Map(nativeNames.map(name=>[name,baseline.get(name).source]));
  for(const name of nativeNames)need(baseline.get(name).mode===captured.capture(name).mode,'native source mode edit requires explicit reconciliation: '+name);
  need(!exactMaps(original,currentNative),'native-plus-target reconciliation requires an actual native source edit');
  const previousJavaScript=baseline.get(unit.javascript),previousTypeScript=baseline.get(unit.typescript);
  need(previousJavaScript&&previousTypeScript,'both exact committed paired baselines required');
  need(previousJavaScript.mode===currentJavaScript.mode&&previousTypeScript.mode===currentTypeScript.mode,'paired source mode changes require explicit reconciliation');
  const changedJavaScript=currentJavaScript.source!==previousJavaScript.source,changedTypeScript=currentTypeScript.source!==previousTypeScript.source;
  need(changedJavaScript||changedTypeScript,'native-only edits must use the original forward planner');
  runtime=createForwardProjectRuntimeMapping();closers.push(()=>runtime.verify());
  const nativeOptions={entry:unit.entry,paths:[...original.keys()],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest};
  const optionsFor=values=>({...nativeOptions,readSource:name=>{need(values.has(name),'compiler requested an uncaptured native source');return values.get(name);},jsonMacroDependencies:loadJsonMacroSourceProof(cargo),deriveDependencies:loadDeriveDependencyProof(cargo)});
  const retainCandidate=proposal=>{
   boundedReconcileWireBytes(proposal);captured.charge(proposal.javascript);captured.charge(proposal.typescript);
   for(const row of proposal.rustEdits??[])captured.charge(row.after);
  };
  // Reissue original audited dependency sources on every closing path too.
  closers.push(()=>{loadJsonMacroSourceProof(cargo);});closers.push(()=>{loadDeriveDependencyProof(cargo);});
  const toPhysical=(source,language)=>runtime.rewrite({source,language,sourcePath:unit.entry.replace(/\.rs$/u,language==='JavaScript'?'.mjs':'.mts'),targetPath:language==='JavaScript'?unit.javascript:unit.typescript,fromRoot:'runtime',toRoot:language==='JavaScript'?'js/runtime':'ts/runtime'});
  const toCanonical=(source,language)=>runtime.rewrite({source,language,sourcePath:language==='JavaScript'?unit.javascript:unit.typescript,targetPath:unit.entry.replace(/\.rs$/u,language==='JavaScript'?'.mjs':'.mts'),fromRoot:language==='JavaScript'?'js/runtime':'ts/runtime',toRoot:'runtime'});
  let originalCensus,canonicalJavaScript,canonicalTypeScript,independent;
  const candidates=[],outputs=[],equations=[],normalizations=[];
  const output=(name,before,after,kind)=>{
   const actual=captured.capture(name);need(actual.source===before,'complete output original differs');captured.charge(after);
   outputs.push({path:name,before,after,inverse:before,mode:actual.mode??0o644,kind});
  };
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'triple-reconcile:compile-complete-committed-native-baseline-and-reproduce-committed-peers',apply:()=>{
     const originalResult=translateProject(optionsFor(original));originalCensus=census(originalResult);
     captured.charge(originalResult.javascript);captured.charge(originalResult.typescript);
     const js=toPhysical(originalResult.javascript,'JavaScript'),ts=toPhysical(originalResult.typescript,'TypeScript');
     captured.charge(js.source);captured.charge(ts.source);
     need(js.source===previousJavaScript.source&&ts.source===previousTypeScript.source,'committed paired baseline differs from complete fresh native projection');
     for(const row of [js,ts])if(row.history)normalizations.push(row.history);
     canonicalJavaScript=toCanonical(currentJavaScript.source,'JavaScript');canonicalTypeScript=toCanonical(currentTypeScript.source,'TypeScript');
     captured.charge(canonicalJavaScript.source);captured.charge(canonicalTypeScript.source);
     for(const row of [canonicalJavaScript,canonicalTypeScript])if(row.history)normalizations.push(row.history);
     return {baselineReproduced:true};
    }},
    {id:'triple-reconcile:check-each-changed-peer-against-original-native-and-exact-authored-current-Rust',apply:()=>{
     const propose=inverses[unit.inverse];
     for(const [language,changed,canonical]of [['JavaScript',changedJavaScript,canonicalJavaScript],['TypeScript',changedTypeScript,canonicalTypeScript]]){
      if(!changed)continue;
      const proposal=propose({...optionsFor(original),[language==='JavaScript'?'javascript':'typescript']:canonical.source});retainCandidate(proposal);
      const sources=completeCandidate(proposal,original,language,canonical.source);
      need(exactMaps(sources,currentNative),'conflicting complete canonical Rust reproduction and authored current Rust: '+language);
      if(candidates.length)need(proposal.javascript===candidates[0].proposal.javascript&&proposal.typescript===candidates[0].proposal.typescript,'conflicting complete canonical paired target projections');
      candidates.push({language,proposal});
     }
     return {authoredNativeAgreement:true,changedPeerCount:candidates.length};
    }},
    {id:'triple-reconcile:independently-compile-authored-current-native-and-reproduce-changed-physical-targets',apply:()=>{
     independent=translateProject(optionsFor(currentNative));need(JSON.stringify(census(independent))===JSON.stringify(originalCensus),'complete executable/refusal/method census changed');
     captured.charge(independent.javascript);captured.charge(independent.typescript);
     for(const row of candidates)need(independent.javascript===row.proposal.javascript&&independent.typescript===row.proposal.typescript,'independent current native emission differs from original checked inverse: '+row.language);
     const js=toPhysical(independent.javascript,'JavaScript'),ts=toPhysical(independent.typescript,'TypeScript');
     captured.charge(js.source);captured.charge(ts.source);
     if(changedJavaScript)need(js.source===currentJavaScript.source,'authored JavaScript is not the exact agreed canonical physical projection; originals retained');
     if(changedTypeScript)need(ts.source===currentTypeScript.source,'authored TypeScript is not the exact agreed canonical physical projection; originals retained');
     for(const row of [js,ts])if(row.history)normalizations.push(row.history);
     return {authoredSourcesRetained:true};
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-authored-native-and-changed-peers-install-only-unchanged-projections',apply:()=>{
    const physicalJavaScript=toPhysical(independent.javascript,'JavaScript'),physicalTypeScript=toPhysical(independent.typescript,'TypeScript');
    captured.charge(physicalJavaScript.source);captured.charge(physicalTypeScript.source);
    const seedsJavaScript=physicalJavaScript.keys,seedsTypeScript=physicalTypeScript.keys;
    for(const row of runtime.sources('js/runtime',seedsJavaScript).concat(runtime.sources('ts/runtime',seedsTypeScript))){
     const actual=captured.capture(row.path);need(actual.source===row.source,'complete current registered runtime differs or is missing: '+row.path);
    }
    // Preserve complete baseline-to-authored Rust history without any native
    // output row: the user's exact current source is already the agreed result.
    for(const [name,after]of currentNative){const before=original.get(name);if(before!==after)equations.push({path:name,authored:true,history:transportConcreteSourceEquations([{before,after,language:'Rust'}])[0]});}
    for(const [name,current,previous,generated,changed,language]of [[unit.javascript,currentJavaScript.source,previousJavaScript.source,physicalJavaScript.source,changedJavaScript,'JavaScript'],[unit.typescript,currentTypeScript.source,previousTypeScript.source,physicalTypeScript.source,changedTypeScript,'TypeScript']]){
     equations.push({path:name,authored:changed,baselineHistory:transportConcreteSourceEquations([{before:previous,after:changed?current:generated,language}])[0],history:transportConcreteSourceEquations([{before:current,after:changed?current:generated,language}])[0]});
     if(!changed)output(name,current,generated,'checked-unchanged-peer-projection');
    }
    return {disposition:'reconciled'};
   }}]},
  ]).run(null);
  const disposition=run.value.disposition;
  if(disposition==='reconciled'){
   const review={schema:SCHEMA,id:unit.id,baseRevision:revision,sourceBaselineRevision:baselineRevision,inverse:unit.inverse,authority:'independent-native-target-agreement',sourceManifest:manifestSource,
    originalCensus,authoredLanguages:['Rust',...(changedJavaScript?['JavaScript']:[]),...(changedTypeScript?['TypeScript']:[])],normalizations,equations,trace:run.trace,
    sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   need(boundedReconcileWireBytes(review)+1<=RECONCILE_LIMITS.file,'complete metadata source file bound');const meta=JSON.stringify(review)+'\n';output(unit.meta,beforeMeta.source,meta,'complete-triple-reconciliation-review');
  }
  result={schema:SCHEMA,root,manifestPath,manifestSource,baseRevision:revision,sourceBaselineRevision:baselineRevision,units:[{id:unit.id,entry:unit.entry,inverse:unit.inverse,disposition}],
   inputs:captured.inputs(),outputs:outputs.sort((a,b)=>ordinal(a.path,b.path)),equations,trace:run.trace,retainedSourceBytes:captured.retained,
   sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
  boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 const closing=[];
 for(const close of closers)try{close();}catch(error){closing.push(error);}
 try{captured.close(tree);}catch(error){closing.push(error);}
 if(revision)try{need(reconcileHead(root)===revision,'current Git revision changed during reconciliation');}catch(error){closing.push(error);}
 if(failed)throw primary;
 if(closing.length)throw new AggregateError(closing,'Paired reconciliation closing source failures');
 return result;
}

/** Exact complete reissue followed by existing guarded per-file transaction. */
export async function applyTripleSyncReconciliation(serialized,options){
 return installFreshAsyncSourceProposal(serialized,()=>planTripleSyncReconciliation(options));
}
