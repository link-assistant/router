// Private source/feature candidate, deliberately separate from the CURRENT
// parser admission guard. Authored math/runtime checks have not yet executed.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from './json-macro-features.mjs';
import {jsonMacroProfileMatches} from './json-macro-profile-layout.mjs';
const root=new URL('./source-profiles/json-roundtrip/',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='987bee1ca3b251e46619321a5ef28b057db8a996174cdbe7fb7d1e65d388c9d7')throw new TypeError('JSON roundtrip source candidate changed');
const profile=freezeMacroTree(JSON.parse(bytes)),candidates=new WeakSet();
export function jsonRoundtripCandidateProfile({dependencies,compilationProfile=null}={}) {
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('JSON roundtrip needs sealed exact Cargo/source dependencies');
  if(!jsonMacroProfileMatches(dependencies,profile.jsonMacroSourceProfileSha256)||!dependencies.packages.some(entry=>entry.name==='serde_json'&&entry.version===profile.version&&entry.archiveSha256===profile.lockedArchiveSha256))throw new TypeError('JSON roundtrip needs its exact original source profile and locked archive identity');
  if(compilationProfile?.values?.feature?.length)throw new TypeError('JSON roundtrip has no command-line Cargo feature override proof');
  if(compilationProfile?.values?.fast_arithmetic?.length)throw new TypeError('JSON roundtrip has no externally injected fast_arithmetic cfg proof');
  const features=proveJsonMacroFeatures(dependencies);
  if(!isJsonMacroFeatureProof(features)||!features.features.includes('float_roundtrip'))throw new TypeError('JSON roundtrip needs actual locked float_roundtrip activation');
  const sources=profile.sources.map(pin=>{const original=jsonMacroOriginalSource(dependencies,'serde_json',pin.path);if(original.bytes!==pin.bytes||original.sha256!==pin.sha256)throw new TypeError('JSON roundtrip original lexical source changed');return pin;});
  const candidate=freezeMacroTree({schema:profile.schema,dependencyDigest:dependencies.digest,sourceProfileSha256:hash(bytes),originalArchiveSha256:profile.lockedArchiveSha256,features,sources,domain:profile.domain,
    implementationCandidate:true,parseAdmission:false,algorithmEquivalenceVerified:false,sourceBehaviorFidelityVerified:false,namespaceAuthority:false,expansionAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,rustExecution:false,
    remainingSemanticObligations:profile.remainingSemanticObligations,defaultNumericAdapterChanged:false,actualParserGuardChanged:false});
  candidates.add(candidate);return candidate;
}
export const isJsonRoundtripCandidateProfile=value=>!!value&&candidates.has(value);
