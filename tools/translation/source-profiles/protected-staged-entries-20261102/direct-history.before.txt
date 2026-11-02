// Exact named source chronology DATA. No native, source or mutation permission.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DIRECT_POLICY_SOURCE_PINS} from './protected-preparer-writers-20261102-direct-pins.mjs';
import {knownProtectedSourceErrorSuccessor} from './protected-source-errors-20261102-successor.mjs';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-preparer-writers-20261102/direct-policy/';
const hash=value=>createHash('sha256').update(value).digest('hex');
function pair(capture,pin){const before=capture.capture(BASE+pin.role+'.before.txt').source,after=capture.capture(BASE+pin.role+'.after.txt').source;need(before!==null&&after!==null&&hash(before)===pin.beforeSha256&&hash(after)===pin.afterSha256,'complete exact direct-policy source images required');return {before,after};}
function equation(path,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'whole direct-policy predecessor CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-current-native-source-and-scope-program',edits:[]}],repositoryRules:[{id:'router:add-only-exact-operational-path-and-direct-alias-veto',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'whole exact direct-policy source substitution differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'complete direct-policy source inverse differs');
 return {id:'protected-preparer-direct-policy-20261102:'+path,path,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false};
}
export function proposeProtectedPreparerDirectPolicyCopies(input,{root=ROOT}={}){
 need(Array.isArray(input)&&input.length===DIRECT_POLICY_SOURCE_PINS.length,'all complete direct-policy predecessor modules required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const rows=DIRECT_POLICY_SOURCE_PINS.map((pin,index)=>{const source=input[index],images=pair(capture,pin);need(source&&source.path===pin.path&&source.source===images.before,'complete exact direct-policy original path/source required');return equation(pin.path,images.before,images.after);});result={schema:'protected-preparer-direct-policy-source-proposal-20261102-v1',rows,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedPreparerDirectPolicySuccessor({root=ROOT,path,before}={}){
 const pin=DIRECT_POLICY_SOURCE_PINS.find(row=>row.path===path);if(!pin)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const images=pair(capture,pin),current=capture.capture(path).source;need(current===images.after,'actual exact direct-policy source successor differs');
  if(before===images.before){result=equation(path,images.before,images.after);}else if(pin.role==='unit'&&before===capture.capture('tools/translation/source-profiles/protected-source-errors-20261102/unit-before.mjs.txt').source){result=knownProtectedSourceErrorSuccessor({root,path,before});need(result&&result.currentAfter===current,'complete earlier safe-error/direct-policy chronology differs');}else result=null;
  if(result)boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
