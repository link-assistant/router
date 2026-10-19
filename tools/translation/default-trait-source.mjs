// Original Default trait identity and source member admission. This leaf
// imports no parser/checker and grants no body execution on its own.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {deriveFootprintSourceContext} from './derive-footprints.mjs';
import {builtinDefaultDependencyProof,BUILTIN_DEFAULT_SOURCE_PROFILE} from './derive-builtin-default.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from './builtin-derive-ast-meta.mjs';
import {resolveDerivedSourceBindings} from './derived-source-bindings.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {proveBuiltinScalarSourceOutput} from './builtin-scalar-ast-route.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
import {originalCorePreludeRootSource} from './extensions/core-prelude-source.mjs';
import {COPY_TRAIT_OWNER_PROFILE} from './copy-trait-owners.mjs';
import {MODULE_PATH_PROFILE} from './module-paths.mjs';
import {originalTopLevelMacroInvocations} from './macro-token-trees.mjs';
const contexts=new WeakMap(),methods=new WeakMap(),standards=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original Default source: '+message);};
function originalStandardDefault(dependencies){
  if(standards.has(dependencies))return standards.get(dependencies);
  const dependency=builtinDefaultDependencyProof(dependencies),profile=builtinDeriveAstSourceProfile(dependencies);
  const pin=BUILTIN_DEFAULT_SOURCE_PROFILE.sources.find(row=>row.url.endsWith('/library/core/src/default.rs'));
  if(!pin)fail('complete core Default source absent');
  const source=gunzipSync(readFileSync(new URL('./source-profiles/derive/'+pin.archive,import.meta.url))).toString('utf8');
  if(hash(source)!==pin.sha256)fail('original Default source changed');
  const traits=sourceItems(source).filter(item=>item.term==='trait'&&item.name==='Default');
  if(traits.length!==1)fail('standard trait declaration is ambiguous');
  const trait=traits[0],tokens=trait.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='trait'),syntax=tokens.slice(at).map(token=>token.text).join(' ');
  // Select the complete actual signature, rather than infer it from its name.
  const open=tokens.findIndex((token,index)=>index>at&&token.text==='{'),members=sourceItems(source.slice(tokens[open].end,tokens.at(-1).start)).filter(item=>!item.comment);
  if(tokens.slice(at,open).map(token=>token.text).join(' ')!=='trait Default : Sized'||members.length!==1||members[0].name!=='default'||members[0].term!=='fn')fail('trait signature differs');
  const mt=members[0].tokens.filter(token=>token.type!=='comment'),fn=mt.findIndex(token=>token.text==='fn');
  if(mt.slice(fn).map(token=>token.text).join(' ')!=='fn default ( ) -> Self ;')fail('original static default signature differs');
  const routes=[];
  for(const [path,needle]of [['library/std/src/lib.rs','pub use core::default;'],['library/core/src/prelude/v1.rs','pub use crate::default::Default;']]){
    const input=builtinAstOriginal(profile,path),found=sourceItems(input.source).filter(item=>item.term==='use'&&input.source.slice(item.start,item.end).includes(needle));
    if(found.length!==1)fail('original standard reexport is absent or ambiguous: '+path);
    routes.push({source:path,sha256:input.sha256,span:{start:found[0].start,end:found[0].end},original:input.source.slice(found[0].start,found[0].end)});
  }
  const prelude=builtinAstOriginal(profile,'library/std/src/prelude/v1.rs');
  const exports=sourceItems(prelude.source).filter(item=>item.term==='use'&&item.tokens.some(token=>token.text==='Default')&&item.tokens.some(token=>token.text==='core'));
  if(exports.length!==1)fail('standard prelude Default reexport differs');
  routes.push({source:prelude.path,sha256:prelude.sha256,span:{start:exports[0].start,end:exports[0].end},original:prelude.source.slice(exports[0].start,exports[0].end)});
  const core=originalCorePreludeRootSource(),defaultModule=sourceItems(core.source).filter(item=>item.term==='mod'&&item.name==='default'&&item.tokens.some(token=>token.text==='pub'));
  if(defaultModule.length!==1)fail('original public core Default module differs');
  routes.push({source:core.path,sha256:core.sha256,span:{start:defaultModule[0].start,end:defaultModule[0].end},original:core.source.slice(defaultModule[0].start,defaultModule[0].end)});
  const markerPin=COPY_TRAIT_OWNER_PROFILE.sources.find(row=>row.url.endsWith('/core/src/marker.rs')),packed=readFileSync(new URL('./source-profiles/copy-standard/'+markerPin.archive,import.meta.url)),marker=gunzipSync(packed).toString('utf8');
  if(hash(packed)!==markerPin.archiveSha256||hash(marker)!==markerPin.sha256)fail('original Sized trait source differs');
  const sized=sourceItems(marker).filter(item=>item.term==='trait'&&item.name==='Sized');
  if(sized.length!==1)fail('original Sized supertrait declaration is ambiguous');
  const corePrelude=builtinAstOriginal(profile,'library/core/src/prelude/v1.rs'),sizedUse=sourceItems(corePrelude.source).filter(item=>item.term==='use'&&item.tokens.some(token=>token.text==='Sized')&&item.tokens.some(token=>token.text==='marker'));
  if(sizedUse.length!==1)fail('original implicit Sized supertrait owner differs');
  routes.push({source:'library/core/src/marker.rs',sha256:markerPin.sha256,span:{start:sized[0].start,end:sized[0].end},original:marker.slice(sized[0].start,sized[0].end),meaning:'original Sized lang-item bound; primitive field layouts still check independently'}, {source:corePrelude.path,sha256:corePrelude.sha256,span:{start:sizedUse[0].start,end:sizedUse[0].end},original:corePrelude.source.slice(sizedUse[0].start,sizedUse[0].end)});
  const descriptors=['core','std'].map(root=>({name:'Default',namespace:'type',kind:'trait',target:[root,'default','Default'],source:'original-core-default-trait',originalSourceSha256:pin.sha256}));
  const symbolPin=MODULE_PATH_PROFILE.identifierSource,symbolPacked=readFileSync(new URL('./source-profiles/module-paths/'+symbolPin.file,import.meta.url)),symbols=gunzipSync(symbolPacked).toString('utf8');
  if(hash(symbolPacked)!==symbolPin.compressedSha256||Buffer.byteLength(symbols)!==symbolPin.bytes||hash(symbols)!==symbolPin.sha256)fail('original keyword data source differs');
  const symbolCalls=originalTopLevelMacroInvocations(symbols).filter(call=>same(call.path,['symbols']));
  if(symbolCalls.length!==1)fail('original symbol data invocation is ambiguous');
  const symbolTrees=symbolCalls[0].trees,keywordAt=symbolTrees.findIndex(node=>node.text==='Keywords'),keywords=symbolTrees[keywordAt+1];
  if(keywordAt<0||keywords?.delimiter!=='{')fail('original keyword data group differs');
  const keywordSymbols={};
  for(const name of ['Default','DollarCrate']){
    const indices=keywords.children.flatMap((node,index)=>node.text===name?[index]:[]);
    if(indices.length!==1)fail('original keyword data slot is absent or ambiguous');
    const index=indices[0],colon=keywords.children[index+1],literal=keywords.children[index+2];
    if(colon?.text!==':'||literal?.type!=='string'||!/^"[^"\\]*"$/.test(literal.text))fail('original keyword requires its closed literal data slot');
    keywordSymbols[name]={source:'compiler/rustc_span/src/symbol.rs',sourceSha256:symbolPin.sha256,span:{start:keywords.children[index].span.start,end:literal.span.end},original:keywords.children.slice(index,index+3),value:JSON.parse(literal.text),namespaceAuthority:false,wholeSymbolGeneratorExecuted:false};
  }
  const result=Object.freeze({dependency,profile,pin,source,trait,syntax,routes:freeze(routes),descriptors:freeze(descriptors),keywordSymbols:freeze(keywordSymbols)});standards.set(dependencies,result);return result;
}
export function createDefaultSourceContext(deriveContext){
  const original=deriveFootprintSourceContext(deriveContext),{dependency,profile,pin,source,trait,syntax,routes,descriptors,keywordSymbols}=originalStandardDefault(original.dependencies);
  const external=registeredStandardHostBindings(descriptors);for(const [key,table]of original.externalModules)if(!external.has(key))external.set(key,table);
  const binding=resolveDerivedSourceBindings({modules:original.modules,externalModules:external,deriveContext,compilationProfile:original.compilationProfile});
  const evidence={schema:'original-default-source-context-v1',dependencyDigest:dependency.digest,trait:{source:'library/core/src/default.rs',sha256:pin.sha256,span:{start:trait.start,end:trait.end},signature:syntax,original:source.slice(trait.start,trait.end)},routes,keywordSymbols,sources:original.modules.map(module=>({file:module.file,path:module.path,sha256:hash(module.source)})),namespaceAuthority:false,generatedImplBehavior:false};
  const context=freeze({...evidence,digest:hash(JSON.stringify(evidence))});contexts.set(context,Object.freeze({...original,deriveContext,binding:freeze(binding),profile}));return context;
}
export function defaultSourceContextFacts(context){const state=contexts.get(context);if(!state)fail('context is copied or unsealed');return state;}
export function assertDefaultCaller(context,module){
  const state=defaultSourceContextFacts(context),original=state.modules.find(candidate=>moduleScopeKey(candidate)===moduleScopeKey(module));
  if(!original||original.source!==module.source||original.sourceView!==module.sourceView)fail('original module/view differs');
  const ancestors=state.binding.scopes.filter(scope=>scope.path.every((part,index)=>module.path[index]===part));
  if(!ancestors.some(scope=>moduleScopeKey(scope)===moduleScopeKey(module))||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope||scope.unresolvedAttributeMacroScope))fail('original ancestor type/attribute scope remains unresolved');
  for(const scope of ancestors){
    if(scope.bindings.some(binding=>macroBindingAffects(binding,'attribute')&&['Default','derive','doc','inline','automatically_derived'].includes(binding.name)&&binding.standardDerive!==true))fail('original generated/builtin attribute owner is shadowed');
    for(const binding of scope.bindings.filter(binding=>binding.namespace==='type'&&['Default','std','core'].includes(binding.name))){
      const expected=binding.name==='Default'?[binding.target?.[0],'default','Default']:[binding.name];
      if(binding.status!=='resolved'||!same(binding.target,expected)||binding.name==='Default'&&!['std','core'].includes(binding.target?.[0]))fail('standard trait or root is shadowed');
    }
    const owner=state.modules.find(candidate=>moduleScopeKey(candidate)===moduleScopeKey(scope));
    for(const item of originalSourceModuleItems(owner))if(item.tokens[1]?.text==='!'&&item.tokens.some(token=>['no_core','no_std','no_implicit_prelude'].includes(token.text)))fail('original implicit standard prelude is disabled');
  }
  return {state,original,ancestors};
}
export function proveDefaultOriginalMember(context,{method,original,typePath}){
  const module=defaultSourceContextFacts(context).modules.find(module=>module.file===original.sourcePath&&same(module.path,original.modulePath));
  assertDefaultCaller(context,module);
  if(original.source!==module.source||original.sourceView!==module.sourceView||method.sourcePath!==module.file||!same(method.modulePath,module.path))fail('member source association changed');
  if(method.name!=='default'||method.receiver!==null||method.async||method.const||!same(method.typePath,[typePath.at(-1)])||typePath[0]!=='crate'||!same(typePath.slice(1,-1),module.path))fail('static nongeneric local Default member required');
  const trait=method.traitPath;
  if(!same(trait,['Default'])&&!same(trait,['core','default','Default'])&&!same(trait,['std','default','Default']))fail('selected implementation is not original standard Default');
  const impl=originalSourceModuleItems(module).find(item=>item.term==='impl'&&item.start===original.implementationSpan.start&&item.end===original.implementationSpan.end);
  if(!impl||itemConfiguration(impl.tokens,module.compilationProfile).status!=='active')fail('implementation condition is unresolved');
  const head=impl.tokens.filter(token=>token.type!=='comment'),start=head.findIndex(token=>token.text==='impl'),open=head.findIndex((token,index)=>index>start&&token.text==='{');
  if(head.slice(start+1,open).map(token=>token.text).join(' ')!==[...trait.flatMap((part,index)=>index?['::',part]:[part]),'for',method.typePath[0]].join(' '))fail('impl header/generics differ');
  const end=impl.tokens.at(-1),body=sourceItems(module.source.slice(head[open].end,end.start)).filter(item=>!item.comment);
  if(body.length!==1||body[0].term!=='fn'||body[0].name!=='default')fail('associated item set is not the complete selected trait');
  const sig=method.signatureTokens.map(token=>token.text).join(' ');
  if(sig!=='fn default ( ) -> Self')fail('exact default signature differs');
  if(method.attributes.some(attribute=>!['doc','inline','allow','warn','deny','forbid'].includes(attribute.name))||head.slice(0,start).some(token=>['unsafe','cfg','cfg_attr'].includes(token.text))||method.tokens.slice(0,method.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'))fail('member/implementation attribute or modifier effect is unproved');
  if(method.diagnostics.some(row=>row.message!=='trait implementation requires declared trait and dispatch checking'))fail('independent method obligation remains');
  const target=originalSourceModuleItems(module).filter(item=>item.term==='struct'&&item.name===typePath.at(-1));
  if(target.length!==1)fail('original local record target is absent or ambiguous');
  const targetItem=target[0];
  // Shared macro-free primitive field parser, without claiming that the
  // compiler's Default generator was invoked for a manual implementation.
  proveBuiltinScalarSourceOutput({dependencies:defaultSourceContextFacts(context).dependencies,source:module.source,span:{start:targetItem.start,end:targetItem.end},owner:'Default'});
  let derives=[];try{derives=inspectDeriveInput(targetItem,module.compilationProfile).derives;}catch(error){if(!/Missing original derive invocation/.test(error.message))throw error;}
  if(derives.some(row=>same(row.path,['Default'])))fail('manual and derived Default overlap');
  const duplicates=originalSourceModuleItems(module).filter(item=>item.term==='impl'&&item.tokens.filter(token=>token.type!=='comment').map(token=>token.text).join(' ').includes('for '+typePath.at(-1)+' {')&&item.tokens.some(token=>token.text==='Default'));
  if(duplicates.length!==1)fail('original Default implementation set is ambiguous');
  const evidence={schema:'original-default-method-admission-v1',contextDigest:context.digest,source:module.file,sourceSha256:hash(module.source),span:method.span,typePath,trait:['core','default','Default'],signature:sig,bodySha256:hash(module.source.slice(method.bodySpan.start,method.bodySpan.end)),bodyExecutionChecked:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});methods.set(proof,{context,method,original});return proof;
}
export function assertDefaultOriginalMember(proof,method,original){const state=methods.get(proof);if(!state||state.method!==method||state.original!==original)fail('member proof is copied or rebound');return proof;}
