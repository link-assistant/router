import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
// Complete named source equations DATA. Never native or mutation permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-ordinary-cli-writers-20261103/';
const FILES=Object.freeze([{"role":"builtin-canonical-table","name":"tools/translation/prepare-builtin-canonical-table.mjs"},{"role":"builtin-definition-positions","name":"tools/translation/prepare-builtin-definition-positions.mjs"},{"role":"default-proof-byte-adoption","name":"tools/translation/prepare-default-proof-byte-adoption.mjs"},{"role":"enclosing-core-primitives-candidate","name":"tools/translation/prepare-enclosing-core-primitives-candidate.mjs"},{"role":"generic-option-library","name":"tools/translation/prepare-generic-option-library.mjs"},{"role":"generic-text-result-library","name":"tools/translation/prepare-generic-text-result-library.mjs"},{"role":"formatting-packet-cli","name":"tools/translation/prepare-formatting-packet-cli.mjs"},{"role":"filesystem-effects","name":"tools/translation/prepare-filesystem-effects.mjs"},{"role":"whole-owner-core-corpus-candidate","name":"tools/translation/prepare-whole-owner-core-corpus-candidate.mjs"},{"role":"whole-owner-core-producer-candidate","name":"tools/translation/prepare-whole-owner-core-producer-candidate.mjs"},{"role":"whole-owner-derive-candidate","name":"tools/translation/prepare-whole-owner-derive-candidate.mjs"},{"role":"whole-owner-resolver-candidate","name":"tools/translation/prepare-whole-owner-resolver-candidate.mjs"}]);
function images(capture,name){const before=capture.capture(BASE+name.role+'.before.txt').source,after=capture.capture(BASE+name.role+'.after.txt').source;need(before!==null&&after!==null,'complete fixed ordinary-cli-writer source images required');return {before,after};}
function equation(name,before,after){
 const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original ordinary-cli-writer CST differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-original-producers-cli-arguments-stale-checks-and-byte-contract',edits:[]}],repositoryRules:[{id:'router:compose-exact-private-current-cli-and-history-successors',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});need(run.value.source===after,'complete exact ordinary-cli-writer source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(history.inverse===before,'whole ordinary-cli-writer inverse differs');
 return {id:'protected-ordinary-cli-writers-20261103:'+name.role,path:name.name,before,language:before,after,current:after,currentAfter:after,inverse:before,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function proposeProtectedOrdinaryCliWriterSources(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);
 need(Array.isArray(input)&&input.length===FILES.length,'all twelve complete ordinary-cli-writer inputs required');const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const files=FILES.map((name,index)=>{const pair=images(capture,name),row=input[index];need(row&&row.path===name.name&&row.source===pair.before,'complete original ordinary-cli-writer source/path required');return equation(name,pair.before,pair.after);});result={schema:'protected-ordinary-cli-writer-source-proposal-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
export function knownProtectedOrdinaryCliWriterSuccessor({root=ROOT,path,before}={}){
 const name=FILES.find(name=>path===name.name);if(!name)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{const pair=images(capture,name),current=capture.capture(path).source;need(current===pair.after,'actual full ordinary-cli-writer source successor differs');result=before===pair.before?equation(name,pair.before,pair.after):null;if(result)boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
