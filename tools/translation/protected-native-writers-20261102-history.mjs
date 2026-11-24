// Complete frozen source successors only. No writer/compiler permission issuer.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/protected-native-writers-20261102/';
const FILES=Object.freeze(['native-module-move-20261101-install.mjs','native-leaf-move-recovery-20261101.mjs',
 'native-leaf-move-recovery-20261101-io.mjs','native-leaf-move-recovery-20261101-source-history.mjs']);
export function knownProtectedNativeWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name);if(!name)return null;
 const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const original=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source,current=capture.capture(path).source;
  need(original!==null&&after!==null&&current===after,'complete frozen protected native writer successor differs');
  if(before!==original)result=null;else{
   const concrete=transportConcreteSyntaxSource(original,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===original,'complete original native writer CST differs');
   const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-native-writer-and-private-producer',edits:[]}],repositoryRules:[{id:'router:apply-exact-operational-source-ownership-veto',edits:[{span:[0,original.length],expected:original,replacement:after}]}]});
   need(run.value.source===after,'complete protected native writer substitution differs');
   const history=transportConcreteSourceEquations([{before:original,after,language:'JavaScript'}])[0];
   need(history.inverse===original&&transportConcreteSyntaxMeta(history.beforeMeta).source===original&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'complete native writer before/after/inverse differs');
   const stages=transportConcreteSourceEquations([{before:original,after:original,language:'JavaScript'},{before:original,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
   result={id:'protected-native-writers-20261102:'+name,path,before:original,language:original,after,current,currentAfter:current,inverse:original,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
   boundedReconcileWireBytes(result);
  }
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function captureProtectedNativeWriterSourceHistories({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const files=FILES.map(name=>{const before=capture.capture(BASE+name+'.before.txt').source;need(before!==null,'complete original native writer snapshot missing');return knownProtectedNativeWriterSuccessor({root,path:'tools/translation/'+name,before});});
  need(files.every(Boolean),'all fixed native writer successors required');result={schema:'protected-native-writers-complete-source-history-20261102-v1',files,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
