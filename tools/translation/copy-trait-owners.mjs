// Namespace facts and Copy relevance; this implements no formatting behavior.
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const owners=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const COPY_TRAIT_OWNER_PROFILE=freeze({version:1,rust:'1.89.0',trait:['std','fmt','Display'],sources:[
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/marker.rs',sha256:'db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809',lines:[458]},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/fmt/mod.rs',sha256:'3991bf79cfb4a9ba2e5915472063d7e195cd4242ae0eb8d6bad6ebb55349beb4',lines:[1003,1028]},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/path.rs',sha256:'769b2c885351f827f07b1755fd51cc9cc2aead4d800c0e76d3e2103d38abf5a5',lines:[1177]},
]});
// Incomplete namespace tables never grant layouts, constructors, globs or calls.
export const COPY_NAMESPACE_BINDINGS=freeze([
  {name:'Display',namespace:'type',target:['std','fmt','Display'],kind:'trait',source:'rust-1.89-copy-trait-owner'},
  {name:'PathBuf',namespace:'type',target:['std','path','PathBuf'],kind:'struct',source:'rust-1.89-opaque-path-type'},
]);
const fingerprint=implementation=>hash(JSON.stringify({trait:implementation.traitPath,type:implementation.typePath,generics:implementation.genericParameters,source:implementation.sourcePath,module:implementation.modulePath,span:implementation.span,header:implementation.headerSpan,attributes:implementation.attributes,diagnostics:implementation.diagnostics,resolvedType:implementation.resolvedType,resolvedNominalTarget:implementation.resolvedNominalTarget}));
export function bindNonCopyTraitOwner(implementation,module,scopes) {
  if(!implementation||!module||!(scopes instanceof Map)||JSON.stringify(implementation.traitPath)!==JSON.stringify(COPY_TRAIT_OWNER_PROFILE.trait)||implementation.sourcePath!==module.file||implementation.genericParameters?.length)return implementation;
  const ancestors=[...scopes.values()].filter(scope=>scope.path.every((part,index)=>module.path[index]===part));
  if(!ancestors.some(scope=>scope.file===module.file)||ancestors.some(scope=>scope.unresolvedTypeScope!==false||scope.configurationCondition!=='active'))return implementation;
  // Bare std can resolve to a source module. Accept only the extern owner.
  if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&binding.name==='std'&&(binding.status!=='resolved'||binding.kind!=='mod'||JSON.stringify(binding.target)!=='["std"]'))))return implementation;
  const original=sourceItems(module.source).find(item=>item.term==='impl'&&item.start===implementation.span.start&&item.end===implementation.span.end);
  if(!original)return implementation;
  const tokens=original.tokens.filter(token=>token.type!=='comment'&&token.end<=implementation.headerSpan.end).map(token=>token.text);
  const begin=tokens.indexOf('impl'),end=tokens.indexOf('for',begin+1);
  if(begin<0||end<0||tokens.slice(begin+1,end).join('')!=='std::fmt::Display')return implementation;
  const evidence=freeze({profile:COPY_TRAIT_OWNER_PROFILE,trait:[...implementation.traitPath],source:module.file,sourceSha256:hash(module.source),headerSha256:hash(module.source.slice(implementation.headerSpan.start,implementation.headerSpan.end)),headerSpan:{...implementation.headerSpan},scopeFiles:ancestors.map(scope=>scope.file)});
  owners.set(implementation,{fingerprint:fingerprint(implementation),evidence});return implementation;
}
export function nonCopyTraitOwner(implementation) {
  const proof=owners.get(implementation);
  return proof&&proof.fingerprint===fingerprint(implementation)?proof.evidence:null;
}
