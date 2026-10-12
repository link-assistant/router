// Original source-selected projections, not production parser admission.
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {compileArithmeticSourceFragments,projectArithmeticSource,bindArithmeticSourceData,bindArithmeticAssociatedSource,bindArithmeticCalleeSource} from './arithmetic-source-fragments.mjs';
import {compileArithmeticAssociatedSource} from './arithmetic-associated-source.mjs';
import {compilePinnedJsonNumericArithmetic,pinnedJsonNumericArithmeticProgram,pinnedJsonNumericExpansionProofs} from './json-roundtrip-num-expansions.mjs';
import {compilePinnedJsonSliceReferenceFragments,pinnedJsonSliceReferencePrograms} from './json-roundtrip-reference-fragments.mjs';
import {compileArithmeticSourceData} from './arithmetic-source-data.mjs';
import {jsonRoundtripCandidateProfile} from './json-roundtrip-capabilities.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const candidates=new WeakMap(),paths=['scalar::add','scalar::iadd','scalar::mul','scalar::imul','small::iadd_impl','small::iadd','small::mul','small::imul','small::normalize','small::imul_pow5','large::iadd_impl','large::long_mul','large::karatsuba_split','large::karatsuba_mul','large::karatsuba_uneven_mul','large::karatsuba_mul_fwd','large::imul','u64_to_hi64_1','u64_to_hi64_2','as_limb','as_wide','nonzero','trait::Hi64::hi64',...[32,64].flatMap(bits=>['hi64_1','hi64_2','hi64_3'].map(name=>'impl::Hi64::u'+bits+'::'+name))];
export function compilePinnedJsonLimbFragments(dependencies,{compilationProfile=null,additionalPaths=[]}={}){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Limb fragments need private original dependencies');
  const cargoSourceContext=jsonRoundtripCandidateProfile({dependencies,compilationProfile});
  const math=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/math.rs'),num=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/num.rs'),build=jsonMacroOriginalSource(dependencies,'serde_json','build.rs');
  if(!Array.isArray(additionalPaths)||additionalPaths.length>8||additionalPaths.some(path=>typeof path!=='string'||!path.startsWith('trait::Math::')))throw new TypeError('Additional original Math selections are outside this private source family');
  const selectedPaths=[...paths,...additionalPaths],program=compileArithmeticSourceFragments(math.source,selectedPaths),small=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/small_powers.rs'),largeSources=[32,64].map(bits=>jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/large_powers'+bits+'.rs'));
  const mathData=compileArithmeticSourceData(math.source,['lexical','math']),smallData=compileArithmeticSourceData(small.source,['lexical','small_powers']),numData=compileArithmeticSourceData(num.source,['lexical','num']);
  const numericArithmetic=compilePinnedJsonNumericArithmetic(dependencies),numericExpansions=numericArithmetic.syntax,associated=compileArithmeticAssociatedSource(pinnedJsonNumericExpansionProofs(numericExpansions));
  const referenceFragments=compilePinnedJsonSliceReferenceFragments(dependencies),reference=pinnedJsonSliceReferencePrograms(referenceFragments);
  const variants=new Map([32,64].map((bits,index)=>[bits,bindArithmeticCalleeSource(bindArithmeticAssociatedSource(bindArithmeticSourceData(program,['lexical','math'],[mathData,smallData,numData,compileArithmeticSourceData(largeSources[index].source,['lexical','large_powers']),reference.data]),associated),[{modulePath:['lexical','num'],program:pinnedJsonNumericArithmeticProgram(numericArithmetic)},{modulePath:reference.modulePath,program:reference.program}])]));
  const candidate=freezeMacroTree({schema:'original-json-limb-source-fragment-candidate-v1',sources:[math,num,build,small,...largeSources].map(({path,sha256})=>({path,sha256})),program,selectedPaths,cargoSourceContext,referenceFragments,numericArithmetic,numericExpansions,associatedSource:associated,sourceDataPrograms:[...variants].map(([bits,program])=>({bits,program})),
    wordInterpretations:[{Limb:32,Wide:64},{Limb:64,Wide:128}],projectionOnly:true,
    remainingObligations:['actual Integer/Number/AsCast/AsPrimitive owner and builtin cast identities beyond connected source IR','original debug_assert macro owner/overflow configuration','Hi64/AsRef trait owner and primitive Copy/iterator receiver resolution beyond mathematical projection','bounded scalar/uneven grade-school power dispatch','actual Vec/slice/iterator/Option/usize ownership, pointer architecture and trait implementation closure','ordinary allocation/abort/drop'],
    sourceOwnerVerified:false,sourceLoopFidelityVerified:false,hi64StickyEquivalenceVerified:false,boundedDispatchVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  candidates.set(candidate,variants);return candidate;
}
export const isPinnedJsonLimbFragments=value=>!!value&&candidates.has(value);
export function projectPinnedJsonLimbFragment(candidate,path,args,limbBits=32){const variants=candidates.get(candidate),program=variants?.get(limbBits);if(!program||!paths.includes(path))throw new TypeError('Unsealed original limb fragment candidate');if(path==='small::imul_pow5'&&(!Array.isArray(args)||typeof args[1]!=='bigint'||args[1]<0n||args[1]>1099n)){const error=new RangeError('Original power loop exceeds the bounded1099 exponent projection');error.code='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND';throw error;}return projectArithmeticSource(program,path,args,{limbBits});}

export function pinnedJsonLimbSourceProgram(candidate,limbBits){const program=candidates.get(candidate)?.get(limbBits);if(!program)throw new TypeError('Unsealed original limb source program');return program;}
