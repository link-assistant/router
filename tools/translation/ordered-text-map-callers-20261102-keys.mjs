// The key projection returns the existing owned Vec<String> domain. It never
// changes the map's distinct private nominal type or grants general Vec calls.
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {requireOriginalOrderedMapStandardNamespaceFact} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {SOURCE_STRING,sourceVector} from './extensions/source-contract-types.mjs';
import {actualOwnedTextVector} from './owned-text-vector-native-types.mjs';
import {withOriginalOwnedTextVectorSourceOperation,requireCurrentOwnedTextVectorOriginalOperationSource} from './current-owned-text-vector-source.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=()=>{throw TypeError('Ordered map keys require actual standard Vec/String ownership and existing owned text-vector checking');};
function owners(){for(const path of ['std::vec::Vec','std::string::String']){const rows=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>fact.target.join('::')===path);if(rows.length!==1||!isStandardNamespaceEvidence(rows[0]))fail();requireOriginalOrderedMapStandardNamespaceFact(rows[0]);}}
export function checkedOrderedTextMapKeysType(checker,node,path){return withOriginalOwnedTextVectorSourceOperation(()=>{
 const current=()=>{requireOriginalPrimitiveTryFromChecker(checker);owners();requireCurrentOwnedTextVectorOriginalOperationSource('router_vec_text_new');};
 return withCompleteSourceClosingFence(()=>{current();const type={...sourceVector({...SOURCE_STRING,rustSourceType:true}),rustSourceType:true};if(!actualOwnedTextVector(checker,type,node,path))fail();checker.expectedOwnership(type.element,SOURCE_STRING,path,node.span);return type;},[current]);
});}
export function actualOrderedTextMapKeysVector(checker,type,node,path){
 if(type?.kind!=='array')return false;requireOriginalPrimitiveTryFromChecker(checker);if(!actualOwnedTextVector(checker,type,node,path))return false;owners();return true;
}
