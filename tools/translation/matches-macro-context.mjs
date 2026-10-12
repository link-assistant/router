// Per-call proof from genuine original module views. No caller-closed flags or
// external namespace tables are accepted as authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {metadataDigest,ownData} from './extensions/source-links.mjs';
import {captureOriginalMacroModules,originalMacroModules} from './original-macro-module-context.mjs';
import {captureSourceModuleViews,originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {externalModuleBindings} from './registered-bindings.mjs';
import {COPY_NAMESPACE_BINDINGS} from './copy-trait-owners.mjs';
import {STANDARD_NAMESPACE_BINDINGS} from './namespace-standard.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from './derive-footprints.mjs';
import {createToolAttributeContext} from './tool-attributes.mjs';
import {HOST_CONTRACTS,hostData} from './extensions/host-contracts.mjs';
import {EFFECT_CONTRACTS} from './extensions/effects-contracts.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {loadStandardMatchesSourceProfile,isStandardMatchesSourceProfile} from './matches-source-profile.mjs';
import {freezeMacroTree,originalMacroInvocation} from './macro-token-trees.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {itemConfiguration,compilationProfile as normalizeProfile} from './cfg-profile.mjs';
const contexts=new WeakMap(),parsers=new WeakMap(),calls=new WeakMap(),hash=text=>createHash('sha256').update(text).digest('hex');
let standardProfile=null;
const mapEntries=Map.prototype.entries;
function nativeEntries(map){if(!map||types.isProxy(map)||Object.getPrototypeOf(map)!==Map.prototype||Reflect.ownKeys(map).length)throw new TypeError('Matches namespace resolution requires original native binding maps');return [...mapEntries.call(map)];}
function namespaceDigest(parser){const aliases=ownData(parser,'sourceNamespaceAliases');if(types.isProxy(aliases))throw new TypeError('Matches namespace evidence is a proxy');return metadataDigest(['type','value','macro'].map(namespace=>[namespace,nativeEntries(ownData(aliases,namespace)).map(([path,map])=>[path,nativeEntries(map)])]));}
export function originalMatchesNamespaceBindings(){const profile=standardProfile??=loadStandardMatchesSourceProfile();return ['std','core'].map(root=>Object.freeze({name:profile.name,namespace:'macro',macroKind:'bang',target:[root,profile.name],kind:'macro',originalNamespaceDigest:profile.digest}));}
const collectTypes=(items,path=[],result=[])=>{for(const item of items){if(item.k==='module')collectTypes(item.items,[...path,item.name],result);else if(item.k==='data')result.push([...path,item.name]);}return result;};
function standardExternal(profile) {
  const types=collectTypes(hostData());
  return externalModuleBindings({data:hostData(),contracts:[...HOST_CONTRACTS,...EFFECT_CONTRACTS],extraBindings:[...types.map(target=>({name:target.at(-1),namespace:'type',target,kind:['Option','Result','Value','Category','VarError','IntErrorKind'].includes(target.at(-1))?'enum':'struct'})),
    ...['Some','None','Ok','Err'].flatMap(name=>['type','value'].map(namespace=>({name,namespace,target:name==='Some'||name==='None'?['std','option','Option',name]:['std','result','Result',name],kind:'constructor'}))),
    ...COPY_NAMESPACE_BINDINGS,...STANDARD_NAMESPACE_BINDINGS,
    {name:'FromStr',namespace:'type',target:['std','str','FromStr'],kind:'trait'},
    ...originalMatchesNamespaceBindings(),{name:'json',namespace:'macro',macroKind:'bang',target:['serde_json','json'],kind:'macro'},
  ]});
}
export function createMatchesMacroContext({modules,compilationProfile=null,deriveDependencies=null}={}) {
  const profile=standardProfile??=loadStandardMatchesSourceProfile(),snapshot=captureOriginalMacroModules({modules,compilationProfile}),original=originalMacroModules(snapshot),external=standardExternal(profile);
  const deriveContext=deriveDependencies?createDeriveFootprintContext({modules:original.modules,dependencies:deriveDependencies,externalModules:external,compilationProfile:original.compilationProfile}):null;
  const resolvedExternal=deriveContext?deriveFootprintExternalModules(deriveContext):external;
  const toolContext=createToolAttributeContext({modules:original.modules,externalModules:resolvedExternal,deriveContext,compilationProfile:original.compilationProfile});
  const evidence=freezeMacroTree(resolveModuleBindings({modules:original.modules,externalModules:resolvedExternal,deriveContext,toolContext,compilationProfile:original.compilationProfile}));
  const certificate=freezeMacroTree({schema:'original-standard-matches-call-context-v1',profileDigest:profile.digest,compilationProfile:original.compilationProfile,originalModules:original.modules.map(module=>({file:module.file,path:module.path,sha256:hash(module.source),sourceViewDigest:module.sourceView.digest,configurationCondition:module.configurationCondition??module.sourceView.configurationCondition})),namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  contexts.set(certificate,{...original,profile,evidence});return certificate;
}
export const isMatchesMacroContext=value=>!!value&&contexts.has(value);
export function standaloneMatchesMacroContext(source,{file='src/module.rs',compilationProfile=null}={}) {
  const captured=captureSourceModuleViews({source,sourcePath:file,compilationProfile});
  return createMatchesMacroContext({modules:captured.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView,compilationProfile,configurationCondition:sourceView.configurationCondition})),compilationProfile});
}
export function configureMatchesMacroParser(parser,context,{file,modulePath=[],offset=0,allowEmptyMainCarrier=false}={}) {
  const facts=contexts.get(context),captured=capturedRustTokenSource(parser.cursor.tokens);
  if(!facts||!captured||!Number.isSafeInteger(offset)||offset<0)throw new TypeError('Matches parser requires private original context and tokenizer source');
  const module=facts.modules.find(module=>module.file===file&&JSON.stringify(module.path)===JSON.stringify(modulePath));
  if(!module)throw new TypeError('Matches parser module is outside its original context');
  let source=captured.source;
  if(allowEmptyMainCarrier&&source.endsWith('\nfn main() {}\n'))source=source.slice(0,-'\nfn main() {}\n'.length);
  if(module.source.slice(offset,offset+source.length)!==source||offset<module.sourceView.bodySpan.start||offset+source.length>module.sourceView.bodySpan.end)throw new TypeError('Matches parser source slice differs from its original module view');
  if(JSON.stringify(normalizeProfile(parser.compilationProfile??null))!==JSON.stringify(facts.compilationProfile))throw new TypeError('Matches parser compilation profile differs from its source context');
  const scope=facts.evidence.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module));
  configureParserSourceScope(parser,scope,facts.evidence.scopes,module.path);parser.modulePath=[...module.path];
  // The legacy use parser may update its working alias table. The genuine
  // namespace maps consumed by source resolution stay separate and sealed.
  parser.aliases=new Map(nativeEntries(parser.sourceNamespaceAliases.type).map(([path,map])=>[path,new Map(nativeEntries(map))]));
  parsers.set(parser,{context,facts,module,offset,sourceLength:source.length,captured,tokens:parser.cursor.tokens,namespaceDigest:namespaceDigest(parser)});return parser;
}
export function matchesParserFacts(parser) {
  const facts=parsers.get(parser);
  if(!facts||parser.cursor.tokens!==facts.tokens||capturedRustTokenSource(facts.tokens)!==facts.captured||JSON.stringify(normalizeProfile(parser.compilationProfile??null))!==JSON.stringify(facts.facts.compilationProfile)||JSON.stringify(parser.modulePath??[])!==JSON.stringify(facts.module.path)||namespaceDigest(parser)!==facts.namespaceDigest)throw new TypeError('Matches parser lost its original private source association');
  return facts;
}
function resolvedMacroPath(state,segments) {
  const scopes=state.facts.evidence.scopes,scope=scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(state.module)),consumer=state.module.path;
  const visible=binding=>!binding?.visibility||binding.visibility.kind==='public'||binding.visibility.path.every((part,index)=>consumer[index]===part);
  if(segments.length===1){const binding=scope.bindings.find(binding=>binding.namespace==='macro'&&binding.name===segments[0]);if(!binding)return {path:segments[0]===state.facts.profile.name?['std',state.facts.profile.name]:[...segments],binding:null};return binding.status==='resolved'&&visible(binding)?{path:binding.target,binding}:{path:null,binding};}
  const first=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===segments[0]);
  let path=first?.status==='resolved'&&visible(first)?[...first.target,...segments.slice(1)]:first?null:[...segments];
  if(!path)return {path:null,binding:first};
  if(path[0]==='self')path=['crate',...consumer,...path.slice(1)];
  if(path[0]==='super'){const parent=[...consumer];let index=0;while(path[index]==='super'){if(!parent.length)return {path:null,binding:first};parent.pop();index++;}path=['crate',...parent,...path.slice(index)];}
  if(path[0]==='crate') {
    const owner=scopes.find(scope=>JSON.stringify(scope.path)===JSON.stringify(path.slice(1,-1))),leaf=owner?.bindings.find(binding=>binding.namespace==='macro'&&binding.name===path.at(-1));
    if(!leaf||leaf.status!=='resolved'||!visible(leaf))return {path:null,binding:leaf??first};
    path=leaf.target;return {path,binding:leaf};
  }
  return {path,binding:first};
}
export function sourceMatchesCandidate(parser,segments) {
  const state=parsers.get(parser);if(!state)return segments.at(-1)==='matches';
  const resolved=resolvedMacroPath(state,segments).path;
  return segments.at(-1)===state.facts.profile.name||resolved&&['std','core'].some(root=>resolved.join('::')===root+'::'+state.facts.profile.name);
}
export function originalMatchesImport(parser,segments) {
  const state=parsers.get(parser);if(!state||segments.length<2)return false;
  const resolved=resolvedMacroPath(state,segments).path;
  return !!resolved&&['std','core'].some(root=>resolved.join('::')===root+'::'+state.facts.profile.name);
}
export function proveOriginalMatchesCall(parser,{segments,start,end}={}) {
  const state=matchesParserFacts(parser),{facts,module}=state;
  if(!Array.isArray(segments)||!segments.length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>state.sourceLength)throw new TypeError('Matches call escapes its original source slice');
  const source=state.captured.source.slice(start,end),invocation=originalMacroInvocation(source);
  if(JSON.stringify(invocation.path)!==JSON.stringify(segments)||!state.tokens.some(token=>token.start===start&&['identifier','macro'].includes(token.kind))||!state.tokens.some(token=>token.end===end&&[')',']','}'].includes(token.value)))throw new TypeError('Matches proof differs from actual original invocation tokens/path');
  const enclosing=originalSourceModuleItems(module).filter(item=>item.start<=start+state.offset&&item.end>=end+state.offset);
  for(const item of enclosing){const local=macroProvenance(module.source.slice(item.start,item.end));if(local.unresolvedImportScope||local.shadowedNames.includes(segments[0])||local.importedNames.includes(segments[0]))throw new TypeError('Matches local macro/import scope requires actual lexical expansion resolution');}
  const scope=facts.evidence.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module)),ancestors=facts.evidence.scopes.filter(parent=>parent.path.every((part,index)=>module.path[index]===part));
  if(!scope||ancestors.some(parent=>parent.configurationCondition!=='active'||parent.unresolvedBangMacroScope!==false||parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))throw new TypeError('Matches owner requires active original type/bang/attribute scopes');
  for(const parent of ancestors)for(const item of originalSourceModuleItems(facts.modules.find(entry=>moduleScopeKey(entry)===moduleScopeKey(parent))))if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'&&itemConfiguration(item.tokens,facts.compilationProfile).attributes.some(attribute=>['no_core','no_std','no_implicit_prelude'].includes(attribute.name)))throw new TypeError('Matches owner requires its proved original standard prelude/profile');
  const {path:resolved,binding}=resolvedMacroPath(state,segments);
  if(!resolved||!['std::'+facts.profile.name,'core::'+facts.profile.name].includes(resolved.join('::')))throw new TypeError('Matches call is not its original standard macro owner');
  if(segments.length===1&&ancestors.some(parent=>parent!==scope&&parent.bindings.some(binding=>binding.namespace==='macro'&&binding.name===segments[0]&&binding.target?.join('::')!==resolved.join('::'))))throw new TypeError('Matches call has an original ancestor textual macro shadow');
  if(segments.length>1&&!binding&&ancestors.some(parent=>parent.bindings.some(binding=>binding.namespace==='type'&&binding.name===segments[0]&&binding.target?.join('::')!==segments[0])))throw new TypeError('Matches qualified root is shadowed in original source');
  const proof=freezeMacroTree({schema:'original-standard-matches-call-v1',file:module.file,modulePath:module.path,sourceViewDigest:module.sourceView.digest,sourceScopeSha256:hash(JSON.stringify(scope)),compilationProfile:facts.compilationProfile,originalSpan:{start:start+state.offset,end:end+state.offset},sourceSha256:hash(module.source),originalInvocation:source,originalInvocationSha256:hash(source),written:segments,resolved,profileDigest:facts.profile.digest,macroOwnerResolved:true,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,constEligible:false});
  calls.set(proof,{state,start,end});return proof;
}
export function originalMatchesCallFacts(proof){const facts=calls.get(proof);if(!facts)throw new TypeError('Unsealed original matches call');return facts;}

export function configureMatchesParserFromSourceScope(parser,sourceScope) {
  const context=sourceScope?.matchesMacroContext;if(!isMatchesMacroContext(context))throw new TypeError('Source-scope matches context is absent or not genuine');
  const facts=contexts.get(context),module=facts.modules.find(module=>module.file===sourceScope.source&&JSON.stringify(module.path)===JSON.stringify(sourceScope.module));
  if(!module||module.sourceView!==sourceScope.sourceView||JSON.stringify(normalizeProfile(sourceScope.compilationProfile))!==JSON.stringify(facts.compilationProfile)||sourceScope.configurationCondition!==(module.configurationCondition??module.sourceView.configurationCondition))throw new TypeError('Source-scope matches context differs from its original view/profile/condition');
  const captured=capturedRustTokenSource(parser.cursor.tokens),suffix='\nfn main() {}\n';
  if(!captured)throw new TypeError('Matches source scope has no original tokenizer');
  const text=captured.source.endsWith(suffix)?captured.source.slice(0,-suffix.length):captured.source;
  const items=originalSourceModuleItems(module).filter(item=>module.source.slice(item.start,item.end)===text);
  if(items.length!==1)throw new TypeError('Matches source scope has no unique exact original declaration slice');
  return configureMatchesMacroParser(parser,context,{file:module.file,modulePath:module.path,offset:items[0].start,allowEmptyMainCarrier:true});
}
