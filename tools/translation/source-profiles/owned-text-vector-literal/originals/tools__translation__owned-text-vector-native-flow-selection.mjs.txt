// Source-bound family selection only; the original/copy complete flow checker
// retains its actual caller/type/ownership obligations and refuses unsupported IR.
import {validateOwnedJsonFlow as originalFlow} from './owned-json-flow.mjs';
import {validateOwnedTextVectorFlow} from './owned-text-vector-native-flow.mjs';
import {ownedTextVectorOperationShape} from './owned-text-vector-call-shape.mjs';
import {ownedTextVectorHelperCallCandidate} from './owned-text-vector-native-call-candidate.mjs';
export function validateOwnedJsonFlow(checker,entry,options){
 let cells=100000;const seen=new WeakSet();
 function selected(node,depth=0){
  if(!node||typeof node!=='object'||seen.has(node))return false;if(--cells<0||depth>160)throw new TypeError('Owned text vector flow family census bound');seen.add(node);
  if(node.k==='routerHostCall'&&ownedTextVectorOperationShape(node.id)&&options.genuine(node,entry))return true;
  if(ownedTextVectorHelperCallCandidate(node))return true;
  for(const [name,value]of Object.entries(node))if(!['type','span','compatibilityCore','sourceFunctionItem','pinnedStandardBodyProof','sourceFrameProof','originalCallbackProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(name))for(const child of Array.isArray(value)?value:[value])if(selected(child,depth+1))return true;return false;
 }
 return selected(entry.body)?validateOwnedTextVectorFlow(checker,entry,options):originalFlow(checker,entry,options);
}
