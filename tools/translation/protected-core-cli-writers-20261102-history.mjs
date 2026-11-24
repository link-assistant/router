// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-core-cli-writers-20261102/';
const FILES=Object.freeze([{"role":"text","name":"prepare-text-core.mjs"},{"role":"sse","name":"prepare-sse-core.mjs"},{"role":"async-control","name":"prepare-async-control-core.mjs"},{"role":"owned-result","name":"prepare-owned-result-core.mjs"},{"role":"primitive-result","name":"prepare-primitive-result-core.mjs"},{"role":"primitive-option","name":"prepare-primitive-option-core.mjs"},{"role":"primitive-option-callback","name":"prepare-primitive-option-callback-core.mjs"},{"role":"owned-outcome","name":"prepare-owned-outcome-core.mjs"},{"role":"http-protocol","name":"prepare-http-protocol-core.mjs"},{"role":"http-transport","name":"prepare-http-transport-core.mjs"},{"role":"json-state","name":"prepare-json-state-core.mjs"},{"role":"json-fields","name":"prepare-json-fields-core.mjs"},{"role":"json-iteration","name":"prepare-json-iteration-core.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed core-cli-writer source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original core-cli-writer CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:guard-actual-core-cli-write-sinks-before-fresh-production',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact core-cli-writer source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole core-cli-writer inverse differs');
 return {id:'protected-core-cli-writers-20261102:'+name.role,path:'tools/translation/'+name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedCoreCliWriterSources(input,{root=ROOT}={}){
 need(Array.isArray(input)&&input.length===FILES.length,'all thirteen complete core-cli-writer inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path==='tools/translation/'+name.name&&row.source===pair.before,'complete original core-cli-writer source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-core-cli-writer-source-proposal-20261102-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedCoreCliWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full core-cli-writer source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
