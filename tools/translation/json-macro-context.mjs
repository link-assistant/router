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
import {originalSourceModuleItems,originalModuleViewParent,captureSourceModuleViews} from './source-module-views.mjs';
import {compilationProfile as normalizeCompilationProfile,itemConfiguration} from './cfg-profile.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from './json-macro-features.mjs';
import {parseJsonMacroSyntax,isOriginalJsonMacroSyntax} from './json-macro-syntax.mjs';
import {jsonEmptyArraySources,isJsonEmptyArraySources} from './json-macro-arrays.mjs';
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
  const profile=normalizeCompilationProfile(compilationProfile),files=new Map();
  for(const module of modules){if(typeof module?.source!=='string'||typeof module.file!=='string'||!Array.isArray(module.path))throw new TypeError('JSON macro source module is incomplete');const rows=files.get(module.file)??[];rows.push(module);files.set(module.file,rows);}
  const original=freezeMacroTree(modules.map(module=>{
    if(module.path.length>64||module.path.some(name=>typeof name!=='string'||!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(name)||name.normalize('NFC')!==name))throw new TypeError('JSON macro source module path is malformed');
    const ownProfile=Object.hasOwn(module,'compilationProfile')?normalizeCompilationProfile(module.compilationProfile):profile;
    if(JSON.stringify(ownProfile)!==JSON.stringify(profile))throw new TypeError('JSON module and context compilation profiles differ');
    if(module.configurationCondition!==undefined&&!['active','inactive','unknown'].includes(module.configurationCondition))throw new TypeError('JSON macro module configuration condition is invalid');
    if(files.get(module.file).length>1&&!Object.hasOwn(module,'sourceView'))throw new TypeError('Same-file JSON modules require genuine original source views');
    const view=Object.hasOwn(module,'sourceView')?module.sourceView:captureSourceModuleViews({source:module.source,sourcePath:module.file,compilationProfile:profile}).views[0];
    const snapshot={file:module.file,path:[...module.path],source:module.source,compilationProfile:ownProfile,sourceView:view,...(module.configurationCondition===undefined?{}:{configurationCondition:module.configurationCondition})};
    originalSourceModuleItems(snapshot); // Validate private view, full bytes, file/path suffix and profile before sealing.
    if(view.configurationCondition==='inactive'&&module.configurationCondition!==undefined&&module.configurationCondition!=='inactive'||view.configurationCondition==='unknown'&&module.configurationCondition==='active')throw new TypeError('JSON module condition contradicts its original source view');
    return snapshot;
  }));
  if(new Set(original.map(module=>JSON.stringify(module.path))).size!==original.length)throw new TypeError('JSON macro module identities are ambiguous');
  for(const module of original) {
    if(module.path.length&&!original.some(parent=>JSON.stringify(parent.path)===JSON.stringify(module.path.slice(0,-1))))throw new TypeError('JSON macro source module lacks its actual ancestor context');
    const local=module.sourceView.modulePath,prefix=module.path.slice(0,module.path.length-local.length);
    for(const sibling of original.filter(entry=>entry.file===module.file))if(sibling.source!==module.source||JSON.stringify(sibling.path.slice(0,sibling.path.length-sibling.sourceView.modulePath.length))!==JSON.stringify(prefix))throw new TypeError('Same-file JSON view origins disagree with actual module paths/source');
    const parentView=originalModuleViewParent(module.sourceView);
    if(parentView&&!original.some(parent=>parent.file===module.file&&parent.sourceView.digest===parentView.digest&&JSON.stringify(parent.path)===JSON.stringify([...prefix,...parentView.modulePath])))throw new TypeError('JSON macro inline view lacks its genuine original parent context');
  }
  const external=externalModuleBindings({data:JSON_DATA,contracts:JSON_CONTRACTS,extraBindings:[...COPY_NAMESPACE_BINDINGS,...STANDARD_NAMESPACE_BINDINGS,
    ...['Value','Number','Error'].map(name=>({namespace:'type',name,kind:name==='Value'?'enum':'struct',target:['serde_json',name]})),
    {name:'json',namespace:'macro',macroKind:'bang',kind:'macro',target:['serde_json','json']},
    ...['Into','From'].map(name=>({name,namespace:'type',kind:'trait',target:['std','convert',name]})),
  ]});
  const evidence=freezeMacroTree(resolveModuleBindings({modules:original,externalModules:external,compilationProfile})),sources=standardSources();
  const certificate=freezeMacroTree({schema:'checked-json-macro-source-context-v1',dependencyDigest:dependencies.digest,features:featureProof,originalModules:original.map(module=>({file:module.file,path:module.path,sha256:hash(module.source),sourceViewDigest:module.sourceView.digest,compilationProfile:module.compilationProfile,configurationCondition:module.configurationCondition??module.sourceView.configurationCondition})),standardSources:sources.map(({source,...pin})=>pin),sourceInputsVerified:true,namespaceAuthority:false,runtimeParity:false,generatedTraitBehavior:false});
  contexts.set(certificate,{modules:original,dependencies,evidence,sources});return certificate;
}
export const isJsonMacroContext=value=>!!value&&contexts.has(value);
export function configureJsonMacroParser(parser,context,{file,modulePath=[],offset=0,source=null}={}) {
  const facts=contexts.get(context),module=facts?.modules.find(module=>module.file===file&&module.path.join('.')===modulePath.join('.'));
  const captured=capturedRustTokenSource(parser.cursor.tokens);
  if(!module||!Number.isSafeInteger(offset)||offset<0||!captured||source!==null&&source!==captured.source||module.source.slice(offset,offset+captured.source.length)!==captured.source)throw new TypeError('JSON macro parser must retain exact original module bytes/tokens');
  originalSourceModuleItems(module);const body=module.sourceView.bodySpan;
  if(offset<body.start||offset+captured.source.length>body.end)throw new TypeError('JSON macro parser slice escapes its original module view');
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
  if(scope.configurationCondition!=='active')throw new TypeError('JSON macro source module lacks an active checked configuration condition');
  const ancestors=scopes.filter(parent=>parent.path.every((name,index)=>module.path[index]===name));
  if(ancestors.some(parent=>parent.configurationCondition!=='active'))throw new TypeError('JSON macro ancestor lacks an active checked configuration condition');
  if(ancestors.some(parent=>parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))throw new TypeError('JSON generated key/serializer owners remain unknown in actual type/attribute scopes');
  if(ancestors.some(parent=>parent.unresolvedBangMacroScope!==false))throw new TypeError('JSON macro requires resolved original bang bindings in this module and its textual ancestors');
  for(const ancestor of ancestors)for(const item of originalSourceModuleItems(facts.modules.find(entry=>entry.file===ancestor.file&&entry.path.join('.')===ancestor.path.join('.')))) {
    if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'&&itemConfiguration(item.tokens,ancestor.compilationProfile).attributes.some(attribute=>['no_implicit_prelude','no_std','no_global_oom_handling'].includes(attribute.name)))throw new TypeError('JSON literal-key conversion requires actual ordinary std/alloc prelude');
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
  if(!isOriginalJsonMacroSyntax(syntax)||syntax.source!==expected.source)throw new TypeError('JSON macro syntax differs from private original invocation evidence');
  const span={start:start+snapshot.offset,end:end+snapshot.offset},owner=proveOwner(snapshot,segments,span);
  const arrays=[];const inspect=tree=>{if(tree.kind==='array'){arrays.push({span:tree.span,empty:tree.items.length===0});tree.items.forEach(inspect);}else if(tree.kind==='object')tree.entries.forEach(entry=>inspect(entry.value));};inspect(syntax.value);
  const arraySources=arrays.length?jsonEmptyArraySources(snapshot.facts.dependencies):null;
  const proof=freezeMacroTree({schema:'checked-original-json-macro-call-v1',...owner,originalSource:original,originalSha256:hash(original),file:snapshot.module.file,modulePath:snapshot.module.path,dependencyDigest:snapshot.context.dependencyDigest,featureProfile:snapshot.context.features,macroOwnerResolved:true,sourceInputsVerified:true,...(arraySources?{arraySources,arrayObligations:arrays.map(array=>({...array,span:{start:span.start+array.span.start,end:span.start+array.span.end},runtimeAvailable:array.empty,obligation:array.empty?'source-closed empty Vec/RawVec branch':'linked-crate allocation/abort effects remain unproved'}))}:{}),namespaceAuthority:false,runtimeParity:false,generatedTraitBehavior:false});calls.set(proof,{snapshot,syntax,arraySources});return proof;
}
export function assertJsonMacroCall(proof) {if(!calls.has(proof))throw new TypeError('JSON macro call proof is unsealed or copied');return proof;}
export function assertJsonEmptyArrayCall(proof) {const facts=calls.get(proof);if(!facts||!isJsonEmptyArraySources(facts.arraySources))throw new TypeError('JSON empty array needs private original standard-source and invocation evidence');return facts.arraySources;}
