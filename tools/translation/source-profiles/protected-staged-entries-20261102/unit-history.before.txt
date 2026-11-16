// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-unit-variants-20261102/';
const FILES=Object.freeze(['synchronize-units.mjs','synchronize-owned-project-units.mjs','owned-project-runtime-materialization.mjs','protected-preparer-writers-20261102-history.mjs']);
function images(capture,name){const before=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source;need(before!==null&&after!==null,'complete fixed unit-variant source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original unit-variant CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-fresh-producers-source-checks-and-transaction-domain',edits:[]}],repositoryRules:[{id:'router:compose-common-operational-staged-and-rollback-veto-with-exact-source-epoch',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact unit-variant source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole unit-variant inverse differs');
 return {id:'protected-unit-variants-20261102:'+name,path:'tools/translation/'+name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedUnitVariantSources(input,{root=ROOT}={}){
 need(Array.isArray(input)&&input.length===FILES.length,'all four complete unit-variant inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path==='tools/translation/'+name&&row.source===pair.before,'complete original unit-variant source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-unit-variants-source-proposal-20261102-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedUnitVariantSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full unit-variant source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
