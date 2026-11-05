import {knownProtectedSourceDiagnosticSuccessor} from './protected-source-diagnostics-20261103-history.mjs';
import {knownReadonlySourceUnitStreamSuccessor} from './ordered-text-map-callers-20261102-source-storage-reconcile-stream-current.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-native-stream-fds-20261103/';
const FILES=Object.freeze([{"role":"alias-observer","name":"tools/translation/protected-preparer-writers-20261102-alias.mjs"},{"role":"unit","name":"tools/translation/unit-runtime-materialization.mjs"},{"role":"sync-adapter","name":"tools/translation/protected-native-writers-20261102.mjs"},{"role":"async-adapter","name":"tools/translation/protected-reviewed-adoption-20261102.mjs"},{"role":"general-history","name":"tools/translation/protected-general-async-lease-20261103-history.mjs"},{"role":"external-history","name":"tools/translation/protected-external-mutations-20261102-history.mjs"},{"role":"contained-history","name":"tools/translation/protected-contained-direct-20261102-history.mjs"},{"role":"source-error-case","name":"tools/translation/test/protected-source-errors-20261102.test.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed native-stream-fd source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original native-stream-fd CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:protect-exact-recursive-cli-source-writer-entrypoints',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact native-stream-fd source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole native-stream-fd inverse differs');
 return {id:'protected-native-stream-fds-20261103:'+name.role,path:name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedNativeStreamFdSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all eight complete native-stream-fd inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path===name.name&&row.source===pair.before,'complete original native-stream-fd source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-native-stream-fd-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedNativeStreamFdSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path===name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source,later=current===pair.after?null:knownReadonlySourceUnitStreamSuccessor({root,path,before:pair.after})??knownProtectedSourceDiagnosticSuccessor({root,path,before:pair.after});need(current===pair.after||later&&later.currentAfter===current,'actual full native-stream/composed-unit source successor differs');result=before===pair.before?{...equation(name,pair.before,pair.after),current,currentAfter:current,laterHistories:later?[later]:[]}:before===pair.after?later:null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
