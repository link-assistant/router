import {bindOriginalSerdeCopyTraitOwner,originalSerdeCopyTraitOwner} from './serde-copy-trait-owners.mjs';
// Namespace facts and Copy relevance; this implements no formatting behavior.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {externalModuleBindings} from './registered-bindings.mjs';
import {implementationTargetPath} from './project-nominal.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const owners=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const COPY_TRAIT_OWNER_PROFILE=freeze({version:1,rust:'1.89.0',trait:['std','fmt','Display'],sources:[
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/marker.rs',sha256:'db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809',lines:[458],archive:'rust-marker-1.89.0.rs.gz',bytes:53066,archiveSha256:'6ae1b7b6a432b0ef19a5502cacd88181261f32fda6fed1a9db9c197fbfc5d821'},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/fmt/mod.rs',sha256:'3991bf79cfb4a9ba2e5915472063d7e195cd4242ae0eb8d6bad6ebb55349beb4',lines:[1003,1028],archive:'rust-fmt-1.89.0.rs.gz',bytes:101081,archiveSha256:'b78d4f20a84422d7cc7f47d88d5e4ce8183d42c880a0e0479216cb37243ba417'},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/path.rs',sha256:'769b2c885351f827f07b1755fd51cc9cc2aead4d800c0e76d3e2103d38abf5a5',lines:[1177],archive:'rust-path-1.89.0.rs.gz',bytes:123534,archiveSha256:'45e817d3cd28e7183ff7d6b56a8c17abc6ad3c1875728be7d5a1729a5b33b4ea'},
]});
// Verify the portable source inputs before granting even namespace facts.
for(const entry of COPY_TRAIT_OWNER_PROFILE.sources) {
  const archive=readFileSync(new URL('./source-profiles/copy-standard/'+entry.archive,import.meta.url));
  if(hash(archive)!==entry.archiveSha256)throw new TypeError('Copy trait source archive checksum mismatch');
  const contents=gunzipSync(archive,{maxOutputLength:200000});
  if(contents.length!==entry.bytes||hash(contents)!==entry.sha256)throw new TypeError('Copy trait owner source checksum mismatch');
}
// Incomplete namespace tables never grant layouts, constructors, globs or calls.
export const COPY_NAMESPACE_BINDINGS=freeze([
  {name:'Display',namespace:'type',target:['std','fmt','Display'],kind:'trait',source:'rust-1.89-copy-trait-owner'},
  {name:'PathBuf',namespace:'type',target:['std','path','PathBuf'],kind:'struct',source:'rust-1.89-opaque-path-type'},
]);
const fingerprint=implementation=>hash(JSON.stringify({trait:implementation.traitPath,type:implementation.typePath,generics:implementation.genericParameters,source:implementation.sourcePath,module:implementation.modulePath,span:implementation.span,header:implementation.headerSpan,attributes:implementation.attributes,diagnostics:implementation.diagnostics,resolvedType:implementation.resolvedType,resolvedNominalTarget:implementation.resolvedNominalTarget}));
export function bindNonCopyTraitOwner(implementation,module,scopes,dependencies) {
  bindOriginalSerdeCopyTraitOwner(implementation,module,scopes,dependencies);
  if(!implementation||!module||!(scopes instanceof Map)||!Array.isArray(implementation.traitPath)||implementation.sourcePath!==module.file||JSON.stringify(implementation.modulePath)!==JSON.stringify(module.path)||implementation.genericParameters?.length)return implementation;
  const originalTarget=implementationTargetPath(implementation,module);
  if(!originalTarget||JSON.stringify(originalTarget)!==JSON.stringify(implementation.typePath))return implementation;
  const ancestors=[...scopes.values()].filter(scope=>scope.path.every((part,index)=>module.path[index]===part));
  if(!ancestors.some(scope=>scope.file===module.file)||ancestors.some(scope=>scope.unresolvedTypeScope!==false||scope.configurationCondition!=='active'))return implementation;
  // Bare std can resolve to a source module. Accept only the extern owner.
  if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&binding.name==='std'&&(binding.status!=='resolved'||binding.kind!=='mod'||JSON.stringify(binding.target)!=='["std"]'))))return implementation;
  const scope=ancestors.find(scope=>scope.file===module.file&&JSON.stringify(scope.path)===JSON.stringify(module.path));
  if(!scope)return implementation;
  let actualTrait=[...implementation.traitPath],importEvidence=null;
  if(JSON.stringify(actualTrait)!==JSON.stringify(COPY_TRAIT_OWNER_PROFILE.trait)){
    const root=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===actualTrait[0]);
    if(root?.status!=='resolved'||!['mod','trait'].includes(root.kind)||!['named-import'].includes(root.via)||!Array.isArray(root.target))return implementation;
    // Re-resolve the exact original use against the pinned partial standard
    // descriptors. Public supplied bindings cannot invent a standard alias.
    const original=resolveModuleBindings({modules:[module],externalModules:externalModuleBindings({extraBindings:COPY_NAMESPACE_BINDINGS}),compilationProfile:module.compilationProfile??null});
    const source=original.scopes.find(candidate=>candidate.file===module.file&&JSON.stringify(candidate.path)===JSON.stringify(module.path)),binding=source?.bindings.find(binding=>binding.namespace==='type'&&binding.name===actualTrait[0]);
    if(binding?.status!=='resolved'||binding.kind!==root.kind||binding.via!=='named-import'||JSON.stringify(binding.target)!==JSON.stringify(root.target)||JSON.stringify(binding.span)!==JSON.stringify(root.span))return implementation;
    actualTrait=[...binding.target,...actualTrait.slice(1)];
    if(JSON.stringify(actualTrait)!==JSON.stringify(COPY_TRAIT_OWNER_PROFILE.trait))return implementation;
    importEvidence=freeze({name:binding.name,target:[...binding.target],source:module.file,span:{...binding.span},sourceSha256:hash(module.source.slice(binding.span.start,binding.span.end))});
  }
  const original=originalSourceModuleItems(module).find(item=>item.term==='impl'&&item.start===implementation.span.start&&item.end===implementation.span.end);
  if(!original)return implementation;
  const tokens=original.tokens.filter(token=>token.type!=='comment'&&token.end<=implementation.headerSpan.end).map(token=>token.text);
  const begin=tokens.indexOf('impl'),end=tokens.indexOf('for',begin+1);
  if(begin<0||end<0||tokens.slice(begin+1,end).join('')!==implementation.traitPath.join('::'))return implementation;
  const evidence=freeze({profile:COPY_TRAIT_OWNER_PROFILE,sourceInputsVerified:true,trait:[...actualTrait],writtenTrait:[...implementation.traitPath],importEvidence,source:module.file,sourceSha256:hash(module.source),headerSha256:hash(module.source.slice(implementation.headerSpan.start,implementation.headerSpan.end)),headerSpan:{...implementation.headerSpan},scopeFiles:ancestors.map(scope=>scope.file)});
  owners.set(implementation,{fingerprint:fingerprint(implementation),evidence});return implementation;
}
export function nonCopyTraitOwner(implementation) {
  const proof=owners.get(implementation);
  return proof&&proof.fingerprint===fingerprint(implementation)?proof.evidence:originalSerdeCopyTraitOwner(implementation);
}
