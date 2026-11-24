// Actual pinned numeric macro expansion syntax; no trait/type owner authority.
import {compileArithmeticExpansionFragments,projectArithmeticSource} from './arithmetic-source-fragments.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {originalTopLevelMacroInvocations,freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeDefinitionHeader} from './declarative-macros.mjs';
const states=new WeakMap(),arithmeticStates=new WeakMap(),integerNames=['u32','u64','u128'],text=node=>node?.kind==='token'?node.text:null;
function transparent(nodes){return nodes.map(node=>{if(node.kind==='fragment'){if(!['ident','tt'].includes(node.fragment)||node.trees.length!==1||node.trees[0].kind!=='token')throw new TypeError('Numeric macro capture is opaque beyond one actual ident/tt');return {...node.trees[0],captureEvidence:{fragment:node.fragment,sourceSyntax:node.sourceSyntax??null}};}if(node.kind==='group')return {...node,children:transparent(node.children)};if(node.kind!=='token')throw new TypeError('Numeric macro has an unresolved hygiene node');return node;});}
function inventory(expansion){const trees=transparent(expansion.trees),items=[];for(let at=0;at<trees.length;at++){
  if(text(trees[at])!=='impl')continue;const trait=text(trees[at+1]),target=text(trees[at+3]),body=trees[at+4];if(text(trees[at+2])!=='for'||body?.delimiter!=='{'||!['AsPrimitive','AsCast','Integer'].includes(trait)||!/^(?:u32|u64|u128|usize|f32|f64)$/u.test(target??''))throw new TypeError('Numeric macro impl header outside original primitive syntax profile');
  for(let i=0;i<body.children.length;i++){
    const nodes=body.children;if(text(nodes[i])==='const'){
      let end=i;while(end<nodes.length&&text(nodes[end])!==';')end++;const tokens=nodes.slice(i,end+1);if(tokens.length!==7||text(tokens[2])!==':'||text(tokens[4])!=='='||!/^\d+$/u.test(text(tokens[5])??''))throw new TypeError('Numeric macro constant has unproved splice/behavior');items.push({kind:'constant',trait,target,name:text(tokens[1]),type:text(tokens[3]),literal:text(tokens[5]),tokens,expansionDigest:expansion.digest});i=end;
    }else if(text(nodes[i])==='fn'){
      const name=text(nodes[i+1]);let end=i+2;while(end<nodes.length&&nodes[end]?.delimiter!=='{')end++;if(end===nodes.length)throw new TypeError('Numeric macro method has no original body');items.push({kind:'method',trait,target,name,signature:nodes.slice(i,end),body:nodes[end],expansionDigest:expansion.digest});i=end;
    }
  }at+=4;
}return items;}
export function compilePinnedJsonNumericExpansions(dependencies){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Numeric expansion requires private original source dependencies');
  const original=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/num.rs'),names=['as_primitive_impl','as_cast_impl','integer_impl'],definitions=new Map(names.map(name=>[name,compileDeclarativeMacro(original.source,{name,owner:['serde_json','lexical','num']})])),invocations=originalTopLevelMacroInvocations(original.source).filter(value=>value.path.length===1&&definitions.has(value.path[0])),expansions=[],items=[];
  if(invocations.length!==8)throw new TypeError('Actual numeric invocation closure changed');
  for(const invocation of invocations){const definition=definitions.get(invocation.path[0]),expansion=expandDeclarativeMacro(definition,invocation.trees);expansions.push({name:invocation.path[0],definition:declarativeDefinitionHeader(definition),invocationSpan:invocation.sourceSpan,invocationSha256:invocation.sourceSha256,expansion});items.push(...inventory(expansion));}
  const candidate=freezeMacroTree({schema:'original-numeric-macro-expansion-syntax-only-v1',source:{path:original.path,sha256:original.sha256},expansions,items,remainingObligations:['local numeric trait supertraits and Number macro impls are not resolved','original inline/primitive/cast owners and feature/configuration remain unresolved','syntax inventories do not certify float casts, usize architecture or generated trait execution'],sourceInputsVerified:true,sourceOwnerVerified:false,traitOwnerVerified:false,primitiveTypeOwnerVerified:false,attributeOwnerVerified:false,generatedBehaviorVerified:false,namespaceAuthority:false,parseAdmission:false,applicationEffectCompleteness:false,runtimeParity:false});states.set(candidate,{items,proofs:expansions.map(row=>row.expansion)});return candidate;
}
export const isPinnedJsonNumericExpansions=value=>!!value&&states.has(value);
export function projectedPinnedIntegerZero(candidate,type){const state=states.get(candidate);if(!state)throw new TypeError('Unsealed original numeric macro candidate');const matches=state.items.filter(item=>item.kind==='constant'&&item.trait==='Integer'&&item.target===type&&item.name==='ZERO'&&item.type==='Self');if(matches.length!==1)throw new TypeError('Actual numeric Integer constant is absent or ambiguous');return BigInt(matches[0].literal);}

export function pinnedJsonNumericExpansionProofs(candidate){const state=states.get(candidate);if(!state)throw new TypeError('Unsealed original numeric macro candidate');return Object.freeze([...state.proofs]);}

// Original expansion trees feed the same serializable arithmetic parser; no
// primitive cast method body is recreated in this adapter.
export function compilePinnedJsonNumericArithmetic(dependencies){
  const syntax=compilePinnedJsonNumericExpansions(dependencies),original=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/num.rs'),paths=[...integerNames.flatMap(from=>integerNames.map(to=>'impl::AsPrimitive::'+from+'::as_'+to)),...integerNames.map(to=>'impl::AsCast::'+to+'::as_cast')],program=compileArithmeticExpansionFragments(original.source,pinnedJsonNumericExpansionProofs(syntax),paths);
  const candidate=freezeMacroTree({schema:'original-numeric-expansion-arithmetic-ir-v1',source:syntax.source,syntax,program,projectionOnly:true,sourceBehaviorFidelityVerified:false,traitOwnerVerified:false,primitiveTypeOwnerVerified:false,attributeOwnerVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,remainingObligations:['AsCast forwarding, numeric trait supertraits and call-site implementations remain unresolved','f32/f64 and pointer-sized casts remain outside this projection','original builtin cast owners/configuration and actual runtime effects are not certified']});arithmeticStates.set(candidate,program);return candidate;
}
export const isPinnedJsonNumericArithmetic=value=>!!value&&arithmeticStates.has(value);
export function projectPinnedJsonIntegerCast(candidate,from,to,value){const program=arithmeticStates.get(candidate);if(!program||!integerNames.includes(from)||!integerNames.includes(to))throw new TypeError('Integer cast projection needs a private original bounded source candidate');return projectArithmeticSource(program,'impl::AsPrimitive::'+from+'::as_'+to,[value]);}

export function pinnedJsonNumericArithmeticProgram(candidate){const program=arithmeticStates.get(candidate);if(!program)throw new TypeError('Unsealed original numeric arithmetic candidate');return program;}
