// Complete immutable original -> additive dispatcher source recipe. UNRUN.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
function once(source,before,after){const at=source.indexOf(before);need(at>=0&&source.indexOf(before,at+before.length)<0,'one exact complete original dispatch selection required');return source.slice(0,at)+after+source.slice(at+before.length);}
function derive(source){
 const edits=[
  ['// Complete additive bulk copy with explicit fresh concurrent-pair dispatch.\n// Prior bulk APIs remain unchanged. Source-only draft; no persistent cache.','// Full additive bulk copy with all seven observed Rust/JS/TS edit-set routes.\n// DATA chooses the original full checker; no permission or override is issued.'],
  ["import {planPairedSyncReconciliation} from './paired-sync-reconcile-20261101.mjs';","import {planPairedSyncReconciliation} from './paired-sync-reconcile-20261101.mjs';\nimport {planTripleSyncReconciliation} from './triple-sync-reconcile-20261101.mjs';"],
  ["const SCHEMA='router-paired-sync-dispatch-20261101-v1';","const SCHEMA='router-complete-peer-dispatch-20261101-v1';"],
  ['export function inspectPairedSyncDispatchEdits(rows){','export function inspectCompletePeerDispatchEdits(rows){'],
  ["need(['owned','forward-project','forward-project-paired'].includes(unit.planner)","need(['owned','forward-project','forward-project-paired','forward-project-complete'].includes(unit.planner)"],
  [" if(['forward-project','forward-project-paired'].includes(unit.planner)){"," if(['forward-project','forward-project-paired','forward-project-complete'].includes(unit.planner)){"],
  ['export function planPairedSyncDispatch({root,manifestPath}={}){','export function planCompletePeerDispatch({root,manifestPath}={}){'],
  ["   if(['forward-project','forward-project-paired'].includes(unit.planner))for(const name of repositoryRustLayout(root).cargoInputs)","   if(['forward-project','forward-project-paired','forward-project-complete'].includes(unit.planner))for(const name of repositoryRustLayout(root).cargoInputs)"],
  ["   const inspection=inspectPairedSyncDispatchEdits(rows),paired=unit.planner==='forward-project-paired';\n   const concurrentPair=paired&&inspection.disposition==='concurrent-reconciliation'&&inspection.changedLanguages.length===2&&inspection.changedLanguages[0]==='JavaScript'&&inspection.changedLanguages[1]==='TypeScript';", "   const inspection=inspectCompletePeerDispatchEdits(rows),paired=unit.planner==='forward-project-paired',complete=unit.planner==='forward-project-complete';\n   const concurrentPair=(paired||complete)&&inspection.disposition==='concurrent-reconciliation'&&inspection.changedLanguages.length===2&&inspection.changedLanguages[0]==='JavaScript'&&inspection.changedLanguages[1]==='TypeScript';\n   const concurrentNative=complete&&inspection.disposition==='concurrent-reconciliation'&&inspection.changedLanguages.includes('Rust')&&inspection.changedLanguages.length>=2;"],
  ["   if(review.disposition==='topology-reconciliation'||review.disposition==='concurrent-reconciliation'&&!concurrentPair){","   if(review.disposition==='topology-reconciliation'||review.disposition==='concurrent-reconciliation'&&!concurrentPair&&!concurrentNative){"],
  ["   const produce=reconcile?planPairedSyncReconciliation:unit.planner==='owned'?planUnitSynchronization:planForwardProjectUnitSynchronization;\n   review.selectedProducer=reconcile?'fresh-paired-reconciliation':unit.planner==='owned'?'original-owned':'original-forward-project';", "   const produce=concurrentNative?planTripleSyncReconciliation:reconcile?planPairedSyncReconciliation:unit.planner==='owned'?planUnitSynchronization:planForwardProjectUnitSynchronization;\n   review.selectedProducer=concurrentNative?'fresh-triple-reconciliation':reconcile?'fresh-paired-reconciliation':unit.planner==='owned'?'original-owned':'original-forward-project';"],
  ["   if(concurrentPair)need(plan.units.length===1&&plan.units[0].disposition==='reconciled','fresh paired producer did not reconcile this actual pair');", "   if(concurrentPair)need(plan.units.length===1&&plan.units[0].disposition==='reconciled','fresh paired producer did not reconcile this actual pair');\n   if(concurrentNative)need(plan.units.length===1&&plan.units[0].disposition==='reconciled','fresh triple producer did not reconcile these actual native/target edits');"],
  ["   if(concurrentPair){review.disposition='reconciled';review.authority='independent-paired-agreement';}","   if(concurrentPair){review.disposition='reconciled';review.authority='independent-paired-agreement';}\n   if(concurrentNative){review.disposition='reconciled';review.authority='independent-native-target-agreement';}"],
  ['export async function applyPairedSyncDispatch(serialized,options){\n return installFreshAsyncSourceProposal(serialized,()=>planPairedSyncDispatch(options));','export async function applyCompletePeerDispatch(serialized,options){\n return installFreshAsyncSourceProposal(serialized,()=>planCompletePeerDispatch(options));'],
 ];
 for(const [before,after]of edits)source=once(source,before,after);return source;
}
export function prepareCompletePeerDispatchSourceEquations({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const snapshot='tools/translation/source-profiles/complete-peer-dispatch-20261101/originals/paired-sync-dispatch-20261101.mjs.txt',originalPath='tools/translation/paired-sync-dispatch-20261101.mjs',path='tools/translation/complete-peer-dispatch-20261101.mjs';
  const before=captured.capture(snapshot).source,original=captured.capture(originalPath).source,current=captured.capture(path).source;need(before!==null&&before===original&&current!==null,'complete unchanged original source and actual adaptation required');const after=derive(before);need(after===current,'complete new dispatcher differs from immutable original recipe');
  const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'whole original source CST inverse differs');
  const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-bulk-private-checker-boundary',edits:[{span:[0,before.length],expected:before,replacement:before}]}],repositoryRules:[{id:'router:dispatch-all-seven-edit-sets-to-original-full-checkers',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===current,'complete CST source adaptation differs');
  const equation=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(equation.inverse===before,'complete immutable original source inverse differs');result={schema:'router-complete-peer-dispatch-source-equations-20261101-v1',path,originalPath,snapshot,before,after,inverse:before,equation,trace:run.trace,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,receivingExecuted:false};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 try{captured.close();}catch(error){if(!failed)throw error;}
 if(failed)throw primary;return result;
}
