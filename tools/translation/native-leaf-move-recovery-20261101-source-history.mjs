// Complete original planner/installer -> authored recovery source histories.
// UNRUN provenance DATA, not generator freshness or a semantic receipt issuer.
import {knownProtectedNativeWriterSuccessor} from './protected-native-writers-20261102-history.mjs';
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function captureDurableNativeLeafMoveSourceHistory({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);let result,primary,failed=false;try{
  const files=[];for(const [originalName,afterName]of [['native-module-move-20261101.mjs','native-leaf-move-recovery-20261101-proof.mjs'],['native-module-move-20261101-install.mjs','native-leaf-move-recovery-20261101.mjs'],['private-cargo-toml.mjs','native-leaf-move-recovery-20261101-cargo.mjs']]){
   const snapshot='tools/translation/source-profiles/native-leaf-move-recovery-20261101/originals/'+originalName+'.txt',originalPath='tools/translation/'+originalName,path='tools/translation/'+afterName,before=captured.capture(snapshot).source,original=captured.capture(originalPath).source,after=captured.capture(path).source;const originalSuccessor=before!==null&&before!==original?knownProtectedNativeWriterSuccessor({root,path:originalPath,before}):null;need(before!==null&&(before===original||originalSuccessor&&originalSuccessor.currentAfter===original)&&after!==null,'complete unchanged original or exact reviewed native writer successor and authored durable adaptation required');
   const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'whole original CST source inverse differs');const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-private-planner-and-guards',edits:[{span:[0,before.length],expected:before,replacement:before}]}],repositoryRules:[{id:'router:record-complete-authored-durable-recovery-adaptation',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete authored adaptation source differs');const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'complete original source restoration differs');files.push({snapshot,originalPath,path,before,originalCurrent:original,originalSuccessor,after,inverse:before,history,trace:run.trace});
  }
  result={schema:'router-durable-leaf-source-history-20261101-v1',files,freshnessQualified:false,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,receivingExecuted:false};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}try{captured.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
