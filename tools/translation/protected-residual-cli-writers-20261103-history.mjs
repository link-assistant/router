import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-residual-cli-writers-20261103/';
const FILES=Object.freeze([{"role":"batched-proof-byte-source-candidate","name":"tools/translation/prepare-batched-proof-byte-source-candidate.mjs"},{"role":"core-ascii-assets","name":"tools/translation/prepare-core-ascii-assets.mjs"},{"role":"core-ascii-base-assets","name":"tools/translation/prepare-core-ascii-base-assets.mjs"},{"role":"core-ascii-reverse-sources","name":"tools/translation/prepare-core-ascii-reverse-sources.mjs"},{"role":"core-ascii-sources","name":"tools/translation/prepare-core-ascii-sources.mjs"},{"role":"core-matches-sources","name":"tools/translation/prepare-core-matches-sources.mjs"},{"role":"core-sequence-stream-sources","name":"tools/translation/prepare-core-sequence-stream-sources.mjs"},{"role":"current-receiving-source-history","name":"tools/translation/prepare-current-receiving-source-history.mjs"},{"role":"executable-checked-source","name":"tools/translation/prepare-executable-checked-source.mjs"},{"role":"facade-ast-receiving-history","name":"tools/translation/prepare-facade-ast-receiving-history.mjs"},{"role":"whole-owner-proof-byte-candidate","name":"tools/translation/prepare-whole-owner-proof-byte-candidate.mjs"},{"role":"whole-owner-proof-byte-original-trial","name":"tools/translation/prepare-whole-owner-proof-byte-original-trial.mjs"},{"role":"whole-owner-original-trial","name":"tools/translation/prepare-whole-owner-original-trial.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed residual-cli-writer source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original residual-cli-writer CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:compose-exact-private-current-cli-and-history-successors',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact residual-cli-writer source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole residual-cli-writer inverse differs');
 return {id:'protected-residual-cli-writers-20261103:'+name.role,path:name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedResidualCliWriterSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all thirteen complete residual-cli-writer inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path===name.name&&row.source===pair.before,'complete original residual-cli-writer source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-residual-cli-writer-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedResidualCliWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path===name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full residual-cli-writer source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
