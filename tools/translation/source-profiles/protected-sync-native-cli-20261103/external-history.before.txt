// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-external-mutations-20261102/';
const FILES=Object.freeze([{"role":"unit","name":"unit-runtime-materialization.mjs"},{"role":"alias","name":"protected-preparer-writers-20261102-alias.mjs"},{"role":"contained-history","name":"protected-contained-direct-20261102-history.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed external-mutation source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original external-mutation CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-private-policy-ordinary-api-and-metadata-bounds',edits:[]}],repositoryRules:[{id:'router:observe-actual-native-external-entries-and-live-file-descriptors',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact external-mutation source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole external-mutation inverse differs');
 return {id:'protected-external-mutations-20261102:'+name.role,path:'tools/translation/'+name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedExternalMutationSources(input,{root=ROOT}={}){
 need(Array.isArray(input)&&input.length===FILES.length,'all three complete external-mutation inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path==='tools/translation/'+name.name&&row.source===pair.before,'complete original external-mutation source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-external-mutation-source-proposal-20261102-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedExternalMutationSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path==='tools/translation/'+name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full external-mutation source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
