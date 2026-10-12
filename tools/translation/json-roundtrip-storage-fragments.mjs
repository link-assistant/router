// Original Bigint storage procedures, still a mathematical source projection.
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,bindArithmeticRecordSource,projectArithmeticSource} from './arithmetic-source-fragments.mjs';
import {compileArithmeticSourceData} from './arithmetic-source-data.mjs';
import {compileArithmeticRecordSource} from './arithmetic-record-source.mjs';
import {jsonRoundtripCandidateProfile} from './json-roundtrip-capabilities.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const states=new WeakMap(),paths=['impl::Default::Bigint::default','impl::Math::Bigint::data','impl::Math::Bigint::data_mut'];
export function compilePinnedJsonStorageFragments(dependencies){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Storage fragments need private pinned dependencies');const cargoSourceContext=jsonRoundtripCandidateProfile({dependencies}),original=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/bignum.rs'),math=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/math.rs'),modulePath=['lexical','bignum'];
  const sourceProgram=compileArithmeticSourceFragments(original.source,paths),recordSource=compileArithmeticRecordSource(original.source,modulePath),program=bindArithmeticRecordSource(bindArithmeticSourceData(sourceProgram,modulePath,[compileArithmeticSourceData(original.source,modulePath),compileArithmeticSourceData(math.source,['lexical','math'])]),[recordSource]);
  const candidate=freezeMacroTree({schema:'original-json-storage-source-ir-candidate-v1',sources:[original,math].map(({path,sha256})=>({path,sha256})),cargoSourceContext,sourceProgram,recordSource,program,projectionOnly:true,sourceOwnerVerified:false,sourceBehaviorFidelityVerified:false,borrowContractVerified:false,copyContractVerified:false,allocatorContractVerified:false,applicationEffectCompleteness:false,parseAdmission:false,namespaceAuthority:false,runtimeParity:false,remainingObligations:['Class/derive/type/trait/default owners and actual Vec/AsRef/Copy contracts remain unresolved','Original nonempty Vec::with_capacity(20) allocation failure/abort/Drop stays unsupported','Whole Math default forwarding and original reader path require later generic source integration']});states.set(candidate,program);return candidate;
}
export const isPinnedJsonStorageFragments=value=>!!value&&states.has(value);
export function projectPinnedJsonStorageFragment(candidate,path,args,limbBits=32){const program=states.get(candidate);if(!program||!paths.includes(path))throw new TypeError('Unsealed original storage source candidate');return projectArithmeticSource(program,path,args,{limbBits});}
