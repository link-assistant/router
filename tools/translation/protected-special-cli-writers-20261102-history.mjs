// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-special-cli-writers-20261102/';
const FILES=Object.freeze([{"role":"prepare-owned-runtime-import-edges","name":"prepare-owned-runtime-import-edges.mjs"},{"role":"prepare-owned-core-private-analysis-retention","name":"prepare-owned-core-private-analysis-retention.mjs"},{"role":"prepare-negative-budget-proof-json","name":"prepare-negative-budget-proof-json.mjs"},{"role":"prepare-primitive-metadata-copy","name":"prepare-primitive-metadata-copy.mjs"},{"role":"prepare-source-proof-preservation","name":"prepare-source-proof-preservation.mjs"},{"role":"prepare-source-lifetime-refusal-batches","name":"prepare-source-lifetime-refusal-batches.mjs"},{"role":"prepare-consumed-project-meta-storage","name":"prepare-consumed-project-meta-storage.mjs"},{"role":"prepare-source-backed-unit-matches","name":"prepare-source-backed-unit-matches.mjs"},{"role":"prepare-source-backed-vectors","name":"prepare-source-backed-vectors.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed special-cli-writer source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original special-cli-writer CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:guard-actual-core-cli-write-sinks-before-fresh-production',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact special-cli-writer source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole special-cli-writer inverse differs');
 return {id:'protected-special-cli-writers-20261102:'+name.role,path:'tools/translation/'+name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedSpecialCliWriterSources(input,{root=ROOT}={}){
 need(Array.isArray(input)&&input.length===FILES.length,'all nine complete special-cli-writer inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path==='tools/translation/'+name.name&&row.source===pair.before,'complete original special-cli-writer source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-special-cli-writer-source-proposal-20261102-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedSpecialCliWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full special-cli-writer source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
