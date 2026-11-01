// Whole original transaction and authored adapter source history, UNRUN.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function captureNativeLeafMoveSourceHistory({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const originalPath='tools/translation/unit-runtime-materialization.mjs',snapshot='tools/translation/source-profiles/native-module-move-20261101/originals/unit-runtime-materialization.mjs.txt',path='tools/translation/native-module-move-20261101-install.mjs',before=captured.capture(snapshot).source,original=captured.capture(originalPath).source,after=captured.capture(path).source;
  need(before!==null&&before===original&&after!==null,'complete unchanged original transaction and authored guarded adapter required');const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'whole original transaction CST inverse differs');
  const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-guarded-source-transaction',edits:[{span:[0,before.length],expected:before,replacement:before}]}],repositoryRules:[{id:'router:record-complete-authored-fixed-producer-leaf-move-adapter',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete authored move adapter source differs');const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'complete original transaction source restoration differs');
  result={schema:'router-native-leaf-move-source-history-20261101-v1',originalPath,snapshot,path,before,after,inverse:before,history,trace:run.trace,freshnessQualified:false,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,receivingExecuted:false};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 try{captured.close();}catch(error){if(!failed)throw error;}
 if(failed)throw primary;return result;
}
