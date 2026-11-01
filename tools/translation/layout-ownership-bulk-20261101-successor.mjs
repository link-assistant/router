// One reviewed chronological source equation, never a semantic admission lane.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/unit-runtime-materialization.mjs',PROFILE='tools/translation/source-profiles/layout-ownership-bulk-20261101/';
export function knownLayoutOwnershipSourceSuccessor({root=ROOT,path,before}={}){
 if(path!==PATH)return null;const captured=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const original=captured.capture(PROFILE+'originals/unit-runtime-materialization.mjs.txt').source,authored=captured.capture(PROFILE+'authored/unit-runtime-materialization.mjs.txt').source,current=captured.capture(PATH).source;need(original!==null&&authored!==null&&current===authored,'complete fixed reviewed installer successor bytes required');if(before===original){
  const concrete=transportConcreteSyntaxSource(original,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===original,'complete original installer CST inverse differs');const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-private-source-issuers',edits:[]}],repositoryRules:[{id:'router:reviewed-exact-output-quarantine-transaction',edits:[{span:[0,original.length],expected:original,replacement:authored}]}]});need(run.value.source===current,'fixed installer source equation differs');const stages=transportConcreteSourceEquations([{before:original,after:original,language:'JavaScript'},{before:original,after:current,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(stages[0].inverse===original&&stages[1].inverse===original,'complete installer predecessor inverse differs');result={id:'router-layout-ownership-known-unit-installer-successor-20261101',path:PATH,before:original,language:original,after:current,current,currentAfter:current,inverse:original,stages,trace:run.trace,sourceAuthority:false,semanticAuthority:false};boundedReconcileWireBytes(result);}else result=null;
 }catch(error){failed=true;primary=error;}try{captured.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
