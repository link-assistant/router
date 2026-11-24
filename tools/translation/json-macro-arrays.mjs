// Only the zero-allocation empty-array branch is an available source contract.
// Nonempty boxed-array templates are evidence, not allocator/runtime authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {freezeMacroTree,originalMacroTrees} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-macros.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
const root=new URL('./source-profiles/json-macro/arrays/',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('manifest.json',root));
const EXPECTED_PROFILE='4bbbdd50499736dceb86cce1491dfb11f85e04083367103fb4f4c59f4b74d604';
if(hash(bytes)!==EXPECTED_PROFILE)throw new TypeError('JSON array source profile changed');
const profile=freezeMacroTree(JSON.parse(bytes)),proofs=new WeakSet(),cache=new WeakMap();
function originalSources() {
  for(const pin of profile.licenses){const source=readFileSync(new URL(pin.path,root));if(source.length!==pin.bytes||hash(source)!==pin.sha256)throw new TypeError('JSON array original license changed');}
  return profile.sources.map(pin=>{const archive=readFileSync(new URL(pin.path,root));if(hash(archive)!==pin.archiveSha256)throw new TypeError('JSON array source archive changed');const original=gunzipSync(archive,{maxOutputLength:512000});if(original.length!==pin.bytes||hash(original)!==pin.sha256)throw new TypeError('JSON array original standard source changed');return {...pin,source:original.toString('utf8')};});
}
export function jsonEmptyArraySources(dependencies) {
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('JSON array contract needs sealed original dependencies');
  if(cache.has(dependencies))return cache.get(dependencies);
  const sources=originalSources(),allocMacros=sources.find(pin=>pin.sourcePath==='library/alloc/src/macros.rs');
  const definition=compileDeclarativeMacro(allocMacros.source,{name:'vec',owner:['alloc']}),empty=expandDeclarativeMacro(definition,originalMacroTrees(''));
  if(empty.rule!==0)throw new TypeError('Empty std vec branch is not the original first matching rule');
  const sourceMembers=['src/lib.rs','src/macros.rs','src/value/mod.rs'].map(path=>{const source=jsonMacroOriginalSource(dependencies,'serde_json',path);return {path,sha256:source.sha256};});
  const proof=freezeMacroTree({schema:profile.schema,dependencyDigest:dependencies.digest,sourceProfileSha256:hash(bytes),sources:sources.map(({source,...pin})=>pin),serdeJsonSources:sourceMembers,emptyVecExpansion:empty,
    emptyArrayContractAvailable:true,operation:'serde_json::Value::Array(alloc::vec::Vec::new())',allocation:'none in original Rust Vec/RawVec empty constructor or zero-capacity drop',elementDrop:'none: zero elements',constEligible:false,
    nonemptyArrayContractAvailable:false,nonemptyObligation:profile.nonemptyFrontier,projectionSemanticsOnly:true,applicationEffectCompleteness:false,remainingEffectObligations:['empty Rust Vec construction has no heap allocation or element drop; surrounding String/key/Value serialization, linked allocation/OOM and application drop behavior remain separate obligations'],namespaceAuthority:false,expansionAuthority:false,runtimeParity:false,generatedTraitBehavior:false});proofs.add(proof);cache.set(dependencies,proof);return proof;
}
export function isJsonEmptyArraySources(proof){return !!proof&&proofs.has(proof);}
