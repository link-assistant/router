import {knownProtectedSourceDiagnosticSuccessor} from './protected-source-diagnostics-20261103-history.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-node-stream-forwarding-20261103/';
const FILES=Object.freeze([{"role":"helper","name":"tools/translation/protected-node-evidence-writers-20261103.mjs"},{"role":"runner","name":"scripts/run-node-tests.mjs"},{"role":"prior-history","name":"tools/translation/protected-node-evidence-writers-20261103-history.mjs"},{"role":"reporter","name":"scripts/node-case-deadline-reporter.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed node-stream-forwarding source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original node-stream-forwarding CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:protect-exact-recursive-cli-source-writer-entrypoints',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact node-stream-forwarding source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole node-stream-forwarding inverse differs');
 return {id:'protected-node-stream-forwarding-20261103:'+name.role,path:name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedNodeStreamForwardingSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all four complete node-stream-forwarding inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path===name.name&&row.source===pair.before,'complete original node-stream-forwarding source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-node-stream-forwarding-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedNodeStreamForwardingSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path===name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source,later=current===pair.after?null:knownProtectedSourceDiagnosticSuccessor({root,path,before:pair.after});need(current===pair.after||later&&later.currentAfter===current,'actual full node-stream-forwarding/diagnostic source successor differs');result=before===pair.before?{...equation(name,pair.before,pair.after),current,currentAfter:current,laterHistories:later?[later]:[]}:before===pair.after?later:null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
