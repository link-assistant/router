import {knownProtectedTrialVectorSourceBoundarySuccessor} from './protected-trial-vector-source-boundaries-20261103-history.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-trial-vector-writers-20261103/';
const FILES=Object.freeze([{"role":"recursive-observer","name":"tools/translation/protected-recursive-cli-writers-20261103.mjs"},{"role":"physical-trial","name":"tools/translation/private-parser-data-physical-trial.mjs"},{"role":"core-vector","name":"tools/translation/prepare-core-vector-sources.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed trial-vector-writer source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original trial-vector-writer CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:protect-exact-recursive-cli-source-writer-entrypoints',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact trial-vector-writer source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole trial-vector-writer inverse differs');
 return {id:'protected-trial-vector-writers-20261103:'+name.role,path:name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedTrialVectorWriterSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all three complete trial-vector-writer inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path===name.name&&row.source===pair.before,'complete original trial-vector-writer source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-trial-vector-writer-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedTrialVectorWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path===name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source,later=current===pair.after?null:knownProtectedTrialVectorSourceBoundarySuccessor({root,path,before:pair.after});need(current===pair.after||later&&later.currentAfter===current,'actual full trial-vector/source-boundary successor differs');result=before===pair.before?{...equation(name,pair.before,pair.after),current,currentAfter:current,laterHistories:later?[later]:[]}:before===pair.after?later:null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
