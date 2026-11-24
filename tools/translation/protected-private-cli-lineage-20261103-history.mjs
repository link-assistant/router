import {knownExactSourceSuccessor} from './exact-source-successors-20261103.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-private-cli-lineage-20261103/';
const FILES=Object.freeze([{"role":"cst-history","name":"protected-cst-cli-writers-20261102-history.mjs"},{"role":"adapter-producer","name":"prepare-private-parser-data-current-sources.mjs"},{"role":"current-consumer","name":"private-parser-data-current-sources.mjs"},{"role":"assignment-cli","name":"prepare-private-parser-assignment-data-candidate.mjs"},{"role":"batch-cli","name":"prepare-private-concrete-substitution-batch-candidate.mjs"},{"role":"current-case","name":"test/private-parser-data-current-sources.test.mjs"},{"role":"native-history-producer","name":"prepare-native-parsed-cst-history.mjs"},{"role":"lineage-history","name":"protected-cli-source-lineage-20261103-history.mjs"},{"role":"native-history-case","name":"test/native-parsed-cst.test.mjs"},{"role":"lineage-producer-case","name":"test/protected-cli-source-lineage-20261103-producer.test.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed private-cli-lineage source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original private-cli-lineage CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:compose-exact-private-current-cli-and-history-successors',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact private-cli-lineage source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole private-cli-lineage inverse differs');
 return {id:'protected-private-cli-lineage-20261103:'+name.role,path:'tools/translation/'+name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedPrivateCliLineageSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all ten complete private-cli-lineage inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path==='tools/translation/'+name.name&&row.source===pair.before,'complete original private-cli-lineage source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-private-cli-lineage-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedPrivateCliLineageSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source,continuation=current===pair.after?null:knownExactSourceSuccessor({path,before:pair.after},{root});if(continuation&&continuation.chain.length){const later={...equation(name,pair.after,continuation.currentAfter),sourceSuccessorChain:continuation};result=before===pair.before?{...equation(name,pair.before,pair.after),current,currentAfter:continuation.currentAfter,laterHistories:[later]}:before===pair.after?later:null;}else{need(current===pair.after,'actual full private-cli-lineage source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;}if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}

export function prepareProtectedPrivateCliLineageSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name.name);if(!name)return null;
 const capture=createReconcileSourceCapture(root);let result,failed=false,primary;
 try{const pair=images(capture,name);result=before===pair.before?{...equation(name,pair.before,pair.after),current:capture.capture(path).source}:null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;
}
