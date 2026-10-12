// Original source-selected projections, not production parser admission.
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {compileArithmeticSourceFragments,projectArithmeticSource,bindArithmeticSourceData,bindArithmeticAssociatedSource} from './arithmetic-source-fragments.mjs';
import {compileArithmeticAssociatedSource} from './arithmetic-associated-source.mjs';
import {compilePinnedJsonNumericExpansions,pinnedJsonNumericExpansionProofs} from './json-roundtrip-num-expansions.mjs';
import {compileArithmeticSourceData} from './arithmetic-source-data.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const candidates=new WeakMap(),paths=['scalar::add','scalar::iadd','scalar::mul','scalar::imul','small::iadd_impl','small::iadd','small::mul','small::imul','small::normalize','small::imul_pow5','large::iadd_impl','large::long_mul','large::karatsuba_split','large::karatsuba_mul','large::karatsuba_uneven_mul','large::karatsuba_mul_fwd','large::imul','u64_to_hi64_1','u64_to_hi64_2','nonzero','trait::Hi64::hi64',...[32,64].flatMap(bits=>['hi64_1','hi64_2','hi64_3'].map(name=>'impl::Hi64::u'+bits+'::'+name))];
export function compilePinnedJsonLimbFragments(dependencies){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Limb fragments need private original dependencies');
  const math=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/math.rs'),num=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/num.rs'),build=jsonMacroOriginalSource(dependencies,'serde_json','build.rs');
  const program=compileArithmeticSourceFragments(math.source,paths),small=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/small_powers.rs'),largeSources=[32,64].map(bits=>jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/large_powers'+bits+'.rs'));
  const mathData=compileArithmeticSourceData(math.source,['lexical','math']),smallData=compileArithmeticSourceData(small.source,['lexical','small_powers']),numData=compileArithmeticSourceData(num.source,['lexical','num']);
  const numericExpansions=compilePinnedJsonNumericExpansions(dependencies),associated=compileArithmeticAssociatedSource(pinnedJsonNumericExpansionProofs(numericExpansions));
  const variants=new Map([32,64].map((bits,index)=>[bits,bindArithmeticAssociatedSource(bindArithmeticSourceData(program,['lexical','math'],[mathData,smallData,numData,compileArithmeticSourceData(largeSources[index].source,['lexical','large_powers'])]),associated)]));
  const candidate=freezeMacroTree({schema:'original-json-limb-source-fragment-candidate-v1',sources:[math,num,build,small,...largeSources].map(({path,sha256})=>({path,sha256})),program,numericExpansions,associatedSource:associated,sourceDataPrograms:[...variants].map(([bits,program])=>({bits,program})),
    wordInterpretations:[{Limb:32,Wide:64},{Limb:64,Wide:128}],projectionOnly:true,
    remainingObligations:['as_limb/as_wide actual Integer/AsCast/AsPrimitive macro expansion and owner closure','original debug_assert macro owner/overflow configuration','Hi64/AsRef trait owner and primitive Copy/iterator receiver resolution beyond mathematical projection','bounded scalar/uneven grade-school power dispatch','actual Vec/slice/iterator/Option/usize ownership, pointer architecture and trait implementation closure','ordinary allocation/abort/drop'],
    sourceOwnerVerified:false,sourceLoopFidelityVerified:false,hi64StickyEquivalenceVerified:false,boundedDispatchVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  candidates.set(candidate,variants);return candidate;
}
export const isPinnedJsonLimbFragments=value=>!!value&&candidates.has(value);
export function projectPinnedJsonLimbFragment(candidate,path,args,limbBits=32){const variants=candidates.get(candidate),program=variants?.get(limbBits);if(!program||!paths.includes(path))throw new TypeError('Unsealed original limb fragment candidate');if(path==='small::imul_pow5'&&(!Array.isArray(args)||typeof args[1]!=='bigint'||args[1]<0n||args[1]>1099n)){const error=new RangeError('Original power loop exceeds the bounded1099 exponent projection');error.code='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND';throw error;}return projectArithmeticSource(program,path,args,{limbBits});}
