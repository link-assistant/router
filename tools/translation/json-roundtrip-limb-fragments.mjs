// Original source-selected projections, not production parser admission.
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {compileArithmeticSourceFragments,projectArithmeticSource} from './arithmetic-source-fragments.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const candidates=new WeakMap(),paths=['scalar::mul','scalar::imul','small::imul','u64_to_hi64_1','u64_to_hi64_2'];
export function compilePinnedJsonLimbFragments(dependencies){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Limb fragments need private original dependencies');
  const math=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/math.rs'),num=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/num.rs'),build=jsonMacroOriginalSource(dependencies,'serde_json','build.rs');
  const program=compileArithmeticSourceFragments(math.source,paths);
  const candidate=freezeMacroTree({schema:'original-json-limb-source-fragment-candidate-v1',sources:[math,num,build].map(({path,sha256})=>({path,sha256})),program,
    wordInterpretations:[{Limb:32,Wide:64},{Limb:64,Wide:128}],projectionOnly:true,
    remainingObligations:['as_limb/as_wide actual Integer/AsCast/AsPrimitive macro expansion and owner closure','original debug_assert macro owner/overflow configuration','whole hi64 trait/slice forwarding','bounded scalar/uneven grade-school power dispatch','ordinary allocation/abort/drop'],
    sourceOwnerVerified:false,sourceLoopFidelityVerified:false,hi64StickyEquivalenceVerified:false,boundedDispatchVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  candidates.set(candidate,program);return candidate;
}
export const isPinnedJsonLimbFragments=value=>!!value&&candidates.has(value);
export function projectPinnedJsonLimbFragment(candidate,path,args,limbBits){const program=candidates.get(candidate);if(!program||!paths.includes(path))throw new TypeError('Unsealed original limb fragment candidate');return projectArithmeticSource(program,path,args,{limbBits});}
