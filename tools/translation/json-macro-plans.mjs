// An explicit draft planning frontier, not an admission hook or trait waiver.
import {isJsonMacroSourceProof} from './json-macro-sources.mjs';
import {isOriginalJsonMacroSyntax,jsonMacroSyntaxSource} from './json-macro-syntax.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const plans=new WeakSet();
function scalarCandidate(type) {
  if(!type||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.rustReference)return null;
  if(type.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.patternOwnershipRefusal)return 'borrowed-str';
  if(type.kind==='bool'&&type.rustSourceType===true&&!type.patternOwnershipRefusal)return 'bool';
  if(type.kind==='fixed'&&type.bits===64&&type.rustSourceType===true&&!type.patternOwnershipRefusal&&(type.rustPrimitiveName==='i64'&&type.signed===true||type.rustPrimitiveName==='u64'&&type.signed===false))return type.rustPrimitiveName;
  return null;
}
export function planJsonMacroCandidate({syntax,dependencies,checkedExpressions=[]}={}) {
  if(!isOriginalJsonMacroSyntax(syntax)||!isJsonMacroSourceProof(dependencies))throw new TypeError('JSON macro candidate requires original private syntax and byte-pinned dependency inputs');
  if(!Array.isArray(checkedExpressions)||checkedExpressions.length!==syntax.leaves.length)throw new TypeError('JSON macro interpolation has no exact checked-expression list');
  const values=syntax.leaves.map((leaf,index)=>{
    const checked=checkedExpressions[index],kind=scalarCandidate(checked?.type);
    // A name/literal is a useful first pure frontier. Calls, custom Serialize,
    // floats and nonlocal ? need their actual checker/effect certificates.
    if(!kind||!['var','lit'].includes(checked?.k)||leaf.requiresQuestionMarkFlow)throw new TypeError('JSON macro interpolation requires separately checked scalar Serialize, effect and nonlocal-flow obligations');
    return {index,kind,source:leaf.source,span:leaf.span,checked,serialization:'serde_core::Serialize for '+(kind==='borrowed-str'?'str and shared references':kind)};
  });
  const plan=freezeMacroTree({kind:'json-macro-candidate-plan',source:jsonMacroSyntaxSource(syntax),originalPath:syntax.path,syntax,values,dependencyDigest:dependencies.digest,evaluationOrder:values.map(value=>value.index),constEligible:false,loweringEligible:false,callOwnerResolved:false,unifiedFeatureClosureVerified:false,namespaceAuthority:false,expansionAuthority:false,runtimeParity:false,generatedTraitBehavior:false,outstanding:dependencies.outstandingOwnerObligations});
  plans.add(plan);return plan;
}
export function isJsonMacroCandidatePlan(value){return !!value&&plans.has(value);}
