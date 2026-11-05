// Full source-copy history DATA, source-only UNRUN. This records the authored
// additive implementation; it is not a generator-freshness or semantic permit.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function captureTripleSyncReconciliationSourceHistory({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const originalPath='tools/translation/paired-sync-reconcile-20261101.mjs',path='tools/translation/triple-sync-reconcile-20261101.mjs',snapshot='tools/translation/source-profiles/triple-sync-reconcile-20261101/originals/paired-sync-reconcile-20261101.mjs.txt';
  const before=captured.capture(snapshot).source,original=captured.capture(originalPath).source,after=captured.capture(path).source;
  need(before!==null&&before===original&&after!==null,'complete unchanged original and complete authored adaptation required');
  const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original CST inverse differs');
  const operation=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-private-checker-planner-copy',edits:[{span:[0,before.length],expected:before,replacement:before}]}],repositoryRules:[{id:'router:record-complete-authored-native-plus-target-adaptation',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});
  need(operation.value.source===after,'complete authored copy source differs');const equation=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(equation.inverse===before,'complete original source restoration differs');
  result={schema:'router-triple-sync-reconcile-source-history-20261101-v1',path,originalPath,snapshot,before,after,inverse:before,equation,trace:operation.trace,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,freshnessQualified:false,receivingExecuted:false};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 try{captured.close();}catch(error){if(!failed)throw error;}
 if(failed)throw primary;return result;
}
