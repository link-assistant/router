// Per-invocation source bindings and standard literal-key conversion evidence.
// Caller-supplied 'closed scope' flags are never consumed as proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolveModuleBindings} from './module-bindings.mjs';
import {externalModuleBindings} from './registered-bindings.mjs';
import {COPY_NAMESPACE_BINDINGS} from './copy-trait-owners.mjs';
import {STANDARD_NAMESPACE_BINDINGS} from './namespace-standard.mjs';
import {JSON_DATA,JSON_CONTRACTS} from './extensions/json-contracts.mjs';
import {sourceItems} from './rust-structure.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from './json-macro-features.mjs';
import {parseJsonMacroSyntax} from './json-macro-syntax.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),root=new URL('./source-profiles/json-macro/standard/',import.meta.url);
const profileBytes=readFileSync(new URL('manifest.json',root));
if(hash(profileBytes)!=='4d71ed0cce3a2bbf144dd314362d0b474fa0eb26329231e1be1b369f5c388db6')throw new TypeError('JSON standard conversion source profile changed');
const standardProfile=freezeMacroTree(JSON.parse(profileBytes));
const contexts=new WeakMap(),parsers=new WeakMap(),calls=new WeakMap();
function standardSources() {
  return standardProfile.sources.map(pin=>{
    const archive=readFileSync(new URL(pin.path,root));if(hash(archive)!==pin.archiveSha256)throw new TypeError('JSON standard source archive changed');
    const raw=gunzipSync(archive,{maxOutputLength:150000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)throw new TypeError('JSON standard conversion source changed');
    return {...pin,source:raw.toString('utf8')};
  });
}
export function createJsonMacroContext({modules,dependencies,compilationProfile=null}={}) {
  if(!isJsonMacroSourceProof(dependencies)||!Array.isArray(modules)||!modules.length||modules.length>512)throw new TypeError('JSON macros require actual modules and sealed locked dependencies');
  if(compilationProfile?.values?.feature?.length)throw new TypeError('JSON Cargo feature proof has no command-line feature override profile');
  if(compilationProfile?.flags?.no_global_oom_handling===true)throw new TypeError('JSON String construction has no no-global-OOM allocator profile');
  const featureProof=proveJsonMacroFeatures(dependencies);if(!isJsonMacroFeatureProof(featureProof))throw new TypeError('JSON feature proof is not sealed');
  const original=freezeMacroTree(modules.map(module=>{if(typeof module.source!=='string'||typeof module.file!=='string'||!Array.isArray(module.path))throw new TypeError('JSON macro source module is incomplete');return {file:module.file,path:[...module.path],source:module.source};}));
  if(new Set(original.map(module=>module.path.join('.'))).size!==original.length)throw new TypeError('JSON macro module identities are ambiguous');
  const external=externalModuleBindings({data:JSON_DATA,contracts:JSON_CONTRACTS,extraBindings:[...COPY_NAMESPACE_BINDINGS,...STANDARD_NAMESPACE_BINDINGS,
    ...['Value','Number','Error'].map(name=>({namespace:'type',name,kind:name==='Value'?'enum':'struct',target:['serde_json',name]})),
    {name:'json',namespace:'macro',macroKind:'bang',kind:'macro',target:['serde_json','json']},
    ...['Into','From'].map(name=>({name,namespace:'type',kind:'trait',target:['std','convert',name]})),
  ]});
  const evidence=freezeMacroTree(resolveModuleBindings({modules:original,externalModules:external,compilationProfile})),sources=standardSources();
  const certificate=freezeMacroTree({schema:'checked-json-macro-source-context-v1',dependencyDigest:dependencies.digest,features:featureProof,originalModules:original.map(module=>({file:module.file,path:module.path,sha256:hash(module.source)})),standardSources:sources.map(({source,...pin})=>pin),sourceInputsVerified:true,namespaceAuthority:false,runtimeParity:false,generatedTraitBehavior:false});
  contexts.set(certificate,{modules:original,dependencies,evidence,sources});return certificate;
}
export const isJsonMacroContext=value=>!!value&&contexts.has(value);
export function configureJsonMacroParser(parser,context,{file,modulePath=[],offset=0,source=null}={}) {
  const facts=contexts.get(context),module=facts?.modules.find(module=>module.file===file&&module.path.join('.')===modulePath.join('.'));
  const captured=capturedRustTokenSource(parser.cursor.tokens);
  if(!module||!Number.isSafeInteger(offset)||offset<0||!captured||source!==null&&source!==captured.source||module.source.slice(offset,offset+captured.source.length)!==captured.source)throw new TypeError('JSON macro parser must retain exact original module bytes/tokens');
  parsers.set(parser,{context,facts,module,offset,source:captured.source});return parser;
}
export function jsonMacroParserOriginal(parser){const value=parsers.get(parser);return value?Object.freeze({source:value.source,offset:value.offset,file:value.module.file,modulePath:value.module.path,context:value.context}):null;}
export function originalJsonMacroCandidate(parser,segments) {
  const value=parsers.get(parser);if(!value)return segments.at(-1)==='json';
  const scope=value.facts.evidence.scopes.find(scope=>scope.file===value.module.file&&scope.path.join('.')===value.module.path.join('.'));
  return segments.at(-1)==='json'||segments.length===1&&scope?.bindings.some(binding=>binding.namespace==='macro'&&binding.name===segments[0]&&binding.target?.join('::')==='serde_json::json');
}
function proveOwner(snapshot,segments,span) {
  const {facts,module}=snapshot,scopes=facts.evidence.scopes,scope=scopes.find(scope=>scope.file===module.file&&scope.path.join('.')===module.path.join('.'));
  if(!scope)throw new TypeError('JSON macro lacks exact source namespace scope');
  const ancestors=scopes.filter(parent=>parent.path.every((name,index)=>module.path[index]===name));
  if(ancestors.some(parent=>parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))throw new TypeError('JSON generated key/serializer owners remain unknown in actual type/attribute scopes');
  if(ancestors.some(parent=>parent.unresolvedBangMacroScope!==false))throw new TypeError('JSON macro requires resolved original bang bindings in this module and its textual ancestors');
  for(const ancestor of ancestors)for(const item of sourceItems(facts.modules.find(entry=>entry.file===ancestor.file&&entry.path.join('.')===ancestor.path.join('.')).source)) {
    if(item.tokens.some(token=>token.text==='no_implicit_prelude'||token.text==='no_std'||token.text==='no_global_oom_handling'))throw new TypeError('JSON literal-key conversion requires actual ordinary std/alloc prelude');
  }
  for(const ancestor of ancestors)if(ancestor.bindings.some(binding=>binding.namespace==='type'&&(['std','core','alloc','serde_json'].includes(binding.name)&&binding.target?.join('::')!==binding.name||binding.kind==='trait'&&!['std::convert::Into','std::convert::From'].includes(binding.target?.join('::')))))throw new TypeError('JSON generated Into/Serialize candidates have a custom or unresolved source trait/root owner');
  const first=segments[0],namespace=segments.length===1?'macro':'type',binding=scope.bindings.find(binding=>binding.namespace===namespace&&binding.name===first);
  if(segments.length===1&&ancestors.some(parent=>parent!==scope&&parent.bindings.some(binding=>binding.namespace==='macro'&&binding.name===first&&binding.target?.join('::')!=='serde_json::json')))throw new TypeError('JSON macro is shadowed by an actual ancestor textual macro');
  let resolved=binding?.status==='resolved'&&binding.target?[...binding.target,...segments.slice(1)]:[...segments];
  if(binding&&binding.status!=='resolved'||resolved.join('::')!=='serde_json::json'||!binding&&segments.length===1)throw new TypeError('JSON macro path is not the actual locked serde_json::json owner');
  if(!binding&&ancestors.some(ancestor=>ancestor.bindings.some(entry=>entry.namespace==='type'&&entry.name==='serde_json')))throw new TypeError('JSON external crate root is shadowed');
  return {path:segments,resolved,binding:binding??null,sourceScopeSha256:hash(JSON.stringify(scope)),originalSpan:span,standardKeyConversion:{profile:standardProfile.schema,sourceInputsVerified:true,trait:['std','convert','Into'],from:['alloc','string','String','From<&str>'],callerTypeScopeClosed:true},serializerSources:['serde_json/src/macros.rs','serde_json/src/value/ser.rs','serde_json/src/number.rs','serde_core/src/ser/impls.rs'].map(path=>{const slash=path.indexOf('/'),source=jsonMacroOriginalSource(facts.dependencies,path.slice(0,slash),path.slice(slash+1));return {path,sha256:source.sha256};})};
}
export function sealJsonMacroCall(parser,{segments,start,end,syntax}={}) {
  const snapshot=parsers.get(parser);if(!snapshot)throw new TypeError('JSON macro lowering has no sealed original dependency/module context');
  const original=snapshot.source.slice(start,end),expected=parseJsonMacroSyntax(original);
  if(!syntax||syntax.source!==expected.source)throw new TypeError('JSON macro syntax differs from original invocation');
  const span={start:start+snapshot.offset,end:end+snapshot.offset},owner=proveOwner(snapshot,segments,span);
  const proof=freezeMacroTree({schema:'checked-original-json-macro-call-v1',...owner,originalSource:original,originalSha256:hash(original),file:snapshot.module.file,modulePath:snapshot.module.path,dependencyDigest:snapshot.context.dependencyDigest,featureProfile:snapshot.context.features,macroOwnerResolved:true,sourceInputsVerified:true,namespaceAuthority:false,runtimeParity:false,generatedTraitBehavior:false});calls.set(proof,{snapshot,syntax});return proof;
}
export function assertJsonMacroCall(proof) {if(!calls.has(proof))throw new TypeError('JSON macro call proof is unsealed or copied');return proof;}
