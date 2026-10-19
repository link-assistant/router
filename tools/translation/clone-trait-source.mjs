// Original standard Clone identity and compiler symbol slots. No checker or
// emitter dependency belongs here; generated body execution is a later join.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {deriveFootprintSourceContext} from './derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from './builtin-derive-ast-meta.mjs';
import {originalPrimitiveCloneExpansion} from './extensions/primitive-clone-source.mjs';
import {resolveDerivedSourceBindings,resolveDerivedEnclosingSourceBindings} from './derived-source-bindings.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {moduleScopeKey,originalSourceModuleItems} from './source-module-views.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
import {MODULE_PATH_PROFILE} from './module-paths.mjs';
import {COPY_TRAIT_OWNER_PROFILE} from './copy-trait-owners.mjs';
import {originalCorePreludeRootSource} from './extensions/core-prelude-source.mjs';
import {createDefaultSourceContext,createDefaultEnclosingSourceContext,defaultSourceContextFacts} from './default-trait-source.mjs';
const root=new URL('./source-profiles/source-clone/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root)),manifest=JSON.parse(manifestBytes);
const hash=value=>createHash('sha256').update(value).digest('hex'),contexts=new WeakMap(),standards=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),significant=tokens=>tokens.filter(token=>token.type!=='comment'),words=tokens=>significant(tokens).map(token=>token.text),syntax=source=>words(rustTokens(source)).join(' ');
const fail=message=>{throw new TypeError('Original Clone source: '+message);};
function addedSource(path,pins){const rows=manifest.sources.filter(row=>row.path===path);if(rows.length!==1||Object.entries(pins).some(([key,value])=>rows[0][key]!==value))fail('added source pins differ: '+path);const pin=rows[0],packed=readFileSync(new URL(pin.archive,root)),raw=gunzipSync(packed,{maxOutputLength:64000});if(hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('added original source bytes differ: '+path);return {path,sha256:pin.sha256,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)};}
function oneItem(origin,term,name){const rows=sourceItems(origin.source).filter(item=>item.term===term&&item.name===name);if(rows.length!==1)fail('source item is absent or ambiguous: '+origin.path+'::'+name);return rows[0];}
function body(origin,item){const t=significant(item.tokens),open=t.findIndex(token=>token.text==='{');if(open<0||t.at(-1).text!=='}')fail('original item body differs');return {tokens:t,open,source:origin.source.slice(t[open].end,t.at(-1).start),offset:t[open].end};}
const sourceRef=(origin,item,meaning)=>({source:origin.path,sourceSha256:origin.sha256,span:{start:item.start,end:item.end},original:origin.source.slice(item.start,item.end),...(meaning?{meaning}:{})});
function reexport(origin,needle){const rows=sourceItems(origin.source).filter(item=>item.term==='use'&&syntax(origin.source.slice(item.start,item.end)).endsWith(syntax(needle)));if(rows.length!==1)fail('original standard reexport differs: '+needle);return sourceRef(origin,rows[0]);}
function selectedSymbols(){
  const generator=addedSource('compiler/rustc_macros/src/symbols.rs',{bytes:10125,sha256:'cf66817df78fb44e38f3aa456835fae0e317a82b43819ae70d35fb3dc0136cef',archiveBytes:3150,archiveSha256:'d6c227023bb135b7f12eb7ec0a2ac7e821999cb67b81b8ed5b53d4d7434a506e'});
  const impls=sourceItems(generator.source).filter(item=>item.term==='impl'&&words(item.tokens).slice(0,4).join(' ')==='impl Parse for Symbol');if(impls.length!==1)fail('original Symbol parser owner differs');
  const parseBody=body(generator,impls[0]),members=sourceItems(parseBody.source).filter(item=>!item.comment);if(members.length!==1||members[0].name!=='parse')fail('original Symbol parser member differs');
  const parseSource=parseBody.source.slice(members[0].start,members[0].end);
  if(syntax(parseSource)!==syntax(`fn parse(input: ParseStream<'_>) -> Result<Self> {let name=input.parse()?;let colon_token:Option<Token![:]> = input.parse()?;let value=if colon_token.is_some(){input.parse()?}else{Value::SameAsName};Ok(Symbol{name,value})}`))fail('original absent-colon symbol parser route differs');
  const generate=oneItem(generator,'fn','symbols_with_errors'),original=generator.source.slice(generate.start,generate.end),t=significant(generate.tokens),texts=words(t);
  const expected=words(rustTokens(`for symbol in input.symbols.iter(){let name=&symbol.name;`));
  const hits=texts.flatMap((word,index)=>expected.every((value,offset)=>texts[index+offset]===value)?[index]:[]);if(hits.length!==1)fail('original symbol iteration/name binding differs');
  let depth=0,end=hits[0];const opening=hits[0]+expected.indexOf('{');for(end=opening;end<t.length;end++){if(t[end].text==='{')depth++;else if(t[end].text==='}'&&!--depth)break;}
  const loop=generator.source.slice(t[hits[0]].start,t[end].end),normalized=syntax(loop);
  for(const recipe of ['Value::SameAsName => name.to_string(),','let idx=entries.insert(symbol.name.span(),&value,&mut errors);','prefill_stream.extend(quote!{#value,});','symbols_stream.extend(quote!{pub const #name:Symbol=Symbol::new(#idx);});'])if(!normalized.includes(syntax(recipe)))fail('original symbol value/quote binding differs');
  // These are data slots, not execution of allocation/interner/formatting or
  // arbitrary Symbol expressions. Only a plain ASCII no-colon name is joined.
  const pin=MODULE_PATH_PROFILE.identifierSource,packed=readFileSync(new URL('./source-profiles/module-paths/'+pin.file,import.meta.url)),raw=gunzipSync(packed,{maxOutputLength:128000});if(hash(packed)!==pin.compressedSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('original symbol data bytes differ');
  const source=raw.toString('utf8'),calls=originalTopLevelMacroInvocations(source).filter(call=>same(call.path,['symbols']));if(calls.length!==1)fail('original symbol data invocation differs');
  const roots=calls[0].trees,at=roots.findIndex(node=>node.text==='Symbols'),symbols=roots[at+1];if(symbols?.delimiter!=='{')fail('original symbol data group differs');
  const slots={};for(const name of ['Clone','clone','AssertParamIsClone']){const indices=symbols.children.flatMap((node,index)=>node.text===name?[index]:[]);if(indices.length!==1)fail('original symbol data slot is absent or ambiguous');const index=indices[0],node=symbols.children[index];if(node.kind!=='token'||node.type!=='ident'||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.text)||symbols.children[index+1]?.text!==','||index&&symbols.children[index-1]?.text!==',')fail('selected symbol needs its plain original SameAsName slot');slots[name]={source:'compiler/rustc_span/src/symbol.rs',sourceSha256:pin.sha256,span:node.span,original:node,value:node.text,route:'original absent-colon Value::SameAsName; plain ASCII source identifier',parserSource:sourceRef(generator,impls[0]),generatorSource:{...sourceRef(generator,generate),selectedLoop:loop},wholeSymbolGeneratorExecuted:false};}
  return {slots,generator:{path:generator.path,sha256:generator.sha256},uncompiled:['String/Env/Unsupported Symbol expressions','interner index allocation and error streams','non-ASCII/raw identifier formatting']};
}
function standardClone(dependencies,defaultContext){
  if(standards.has(dependencies))return standards.get(dependencies);
  const profile=builtinDeriveAstSourceProfile(dependencies),expansion=originalPrimitiveCloneExpansion(),origin={path:expansion.source.path,sha256:expansion.source.sha256,source:expansion.source.original},trait=oneItem(origin,'trait','Clone'),tb=body(origin,trait),start=tb.tokens.findIndex(token=>token.text==='trait');
  if(words(tb.tokens.slice(start,tb.open)).join(' ')!=='trait Clone : Sized')fail('original standard trait signature differs');
  const members=sourceItems(tb.source).filter(item=>!item.comment),clones=members.filter(item=>item.term==='fn'&&item.name==='clone');if(members.length!==2||clones.length!==1||!members.some(item=>item.name==='clone_from'))fail('complete original Clone associated-item set differs');
  const mt=significant(clones[0].tokens),fn=mt.findIndex(token=>token.text==='fn');if(words(mt.slice(fn)).join(' ')!=='fn clone ( & self ) -> Self ;')fail('original shared clone signature differs');
  const assertion=oneItem(origin,'struct','AssertParamIsClone'),ab=body(origin,assertion),sa=ab.tokens.findIndex(token=>token.text==='struct');if(words(ab.tokens.slice(sa,ab.open)).join(' ')!=='struct AssertParamIsClone < T : Clone + PointeeSized >')fail('original type-only Clone assertion bound differs');
  const coreRoot=originalCorePreludeRootSource(),core={path:coreRoot.path,sha256:coreRoot.sha256,source:coreRoot.source},publicClone=oneItem(core,'mod','clone');if(!words(publicClone.tokens).includes('pub'))fail('original public core Clone module differs');
  const std=builtinAstOriginal(profile,'library/std/src/lib.rs'),corePrelude=builtinAstOriginal(profile,'library/core/src/prelude/v1.rs'),stdPrelude=builtinAstOriginal(profile,'library/std/src/prelude/v1.rs');
  const routes=[sourceRef(core,publicClone),reexport(std,'pub use core::clone;'),reexport(corePrelude,'pub use crate::clone::Clone;')];
  const uses=sourceItems(stdPrelude.source).filter(item=>item.term==='use'&&item.tokens.some(token=>token.text==='Clone')&&item.tokens.some(token=>token.text==='core'));if(uses.length!==1)fail('original standard Clone prelude route differs');routes.push(sourceRef(stdPrelude,uses[0]));
  const markerPin=COPY_TRAIT_OWNER_PROFILE.sources.find(row=>row.url.endsWith('/core/src/marker.rs')),markerPacked=readFileSync(new URL('./source-profiles/copy-standard/'+markerPin.archive,import.meta.url)),markerRaw=gunzipSync(markerPacked,{maxOutputLength:64000});if(hash(markerPacked)!==markerPin.archiveSha256||markerRaw.length!==markerPin.bytes||hash(markerRaw)!==markerPin.sha256)fail('original marker source differs');
  const marker={path:'library/core/src/marker.rs',sha256:markerPin.sha256,source:markerRaw.toString('utf8')};for(const name of ['Sized','PointeeSized'])routes.push(sourceRef(marker,oneItem(marker,'trait',name),'original primitive-layout bound, no trait body grant'));
  const registration=builtinAstOriginal(profile,'compiler/rustc_builtin_macros/src/lib.rs'),symbols=selectedSymbols(),builtins={},register=oneItem(registration,'fn','register_builtin_macros'),rb=body(registration,register);
  const definition=compileDeclarativeMacro(rb.source,{name:'register_derive',owner:['rustc_builtin_macros']}),calls=originalTopLevelMacroInvocations(rb.source).filter(call=>same(call.path,['register_derive']));if(calls.length!==1)fail('complete original derive registration invocation differs');
  const registrationExpansion=expandDeclarativeMacro(definition,calls[0].trees),deriving=builtinAstOriginal(profile,'compiler/rustc_builtin_macros/src/deriving/mod.rs');
  if(!syntax(registration.source).includes(syntax('use crate::deriving::*;'))||!syntax(rb.source).includes(syntax('let mut register=|name,kind|resolver.register_builtin_macro(name,kind);')))fail('original registration callback/import binding differs');
  for(const [name,owner,target]of [['Clone',origin,'clone'],['Copy',marker,'bounds']]){
    const macro=oneItem(owner,'macro',name),mw=words(macro.tokens),at=mw.indexOf('pub');if(!same(mw.slice(at),['pub','macro',name,'(','$item',':','item',')','{','}'])||!mw.includes('rustc_builtin_macro'))fail('original core builtin derive declaration differs');
    const needle=words(rustTokens(name+': '+target+'::expand_deriving_'+name.toLowerCase()+',')),input=calls[0].trees;
    const indices=input.flatMap((tree,index)=>needle.every((value,offset)=>input[index+offset]?.text===value)?[index]:[]);if(indices.length!==1)fail('original compiler builtin registration differs');
    const module=oneItem(deriving,'mod',target);if(!words(module.tokens).includes('pub'))fail('original deriving callback module route differs');
    const emitted=registrationExpansion.trees,expected='(sym :: '+name+' , SyntaxExtensionKind :: LegacyDerive (Arc :: new (BuiltinDerive ('+target+' :: expand_deriving_'+name.toLowerCase()+'))))',found=emitted.some((tree,index)=>tree.text==='register'&&emitted[index+1]?.delimiter==='('&&originalMacroTreeText(emitted[index+1])===expected);if(!found)fail('original selected registration transcription differs');
    builtins[name]={declaration:sourceRef(owner,macro),registration:{source:registration.path,sourceSha256:registration.sha256,definition,invocation:calls[0],expansion:registrationExpansion,originalBinding:input.slice(indices[0],indices[0]+needle.length),deriveModule:sourceRef(deriving,module),registerSource:sourceRef(registration,register)},prelude:'original core/std common Clone/Copy reexports'};
  }
  if(symbols.slots.Clone.value!==trait.name||symbols.slots.clone.value!==clones[0].name||symbols.slots.AssertParamIsClone.value!==assertion.name)fail('actual compiler symbols do not join original trait/assertion names');
  const result=freeze({profile,trait:sourceRef(origin,trait),method:{source:origin.path,sourceSha256:origin.sha256,span:{start:tb.offset+clones[0].start,end:tb.offset+clones[0].end},original:tb.source.slice(clones[0].start,clones[0].end),signature:'fn clone ( & self ) -> Self ;'},assertion:sourceRef(origin,assertion),routes,builtins,symbols,defaultIdentity:defaultContext.trait,namespaceAuthority:false,wholeTraitTranslated:false});standards.set(dependencies,result);return result;
}
export function createCloneSourceContext(deriveContext){
  return createCloneContext(deriveContext,createDefaultSourceContext,resolveDerivedSourceBindings);
}
export function createCloneEnclosingSourceContext(deriveContext,{defaultContext,deriveBangContext}={}){
  if(defaultContext!==undefined&&defaultSourceContextFacts(defaultContext).deriveContext!==deriveContext)fail('Default context belongs to a different original derive invocation');
  const createDefault=defaultContext===undefined?value=>createDefaultEnclosingSourceContext(value,{deriveBangContext}):()=>defaultContext;
  return createCloneContext(deriveContext,createDefault,input=>resolveDerivedEnclosingSourceBindings({...input,deriveBangContext}));
}
function createCloneContext(deriveContext,createDefault,resolveBindings){
  const original=deriveFootprintSourceContext(deriveContext),defaultContext=createDefault(deriveContext),standard=standardClone(original.dependencies,defaultContext);
  const descriptors=['std','core'].flatMap(root=>[{name:'Clone',namespace:'type',kind:'trait',target:[root,'clone','Clone'],source:'original-core-clone-trait',originalSourceSha256:standard.trait.sourceSha256},{name:'Default',namespace:'type',kind:'trait',target:[root,'default','Default'],source:'original-core-default-trait',originalSourceSha256:defaultContext.trait.sha256}]);
  const external=registeredStandardHostBindings(descriptors);for(const [key,table]of original.externalModules)if(!external.has(key))external.set(key,table);
  const binding=resolveBindings({modules:original.modules,externalModules:external,deriveContext,compilationProfile:original.compilationProfile}),evidence={schema:'original-clone-source-context-v1',dependenciesDigest:original.dependencies.digest,profileSha256:hash(manifestBytes),standard,sources:original.modules.map(module=>({source:module.file,module:module.path,sha256:hash(module.source)})),namespaceAuthority:false,generatedImplBehavior:false};
  const context=freeze({...evidence,digest:hash(JSON.stringify(evidence))});contexts.set(context,{...original,deriveContext,defaultContext,binding:freeze(binding),standard});return context;
}
export function cloneSourceContextFacts(context){const state=contexts.get(context);if(!state)fail('context is copied or unsealed');return state;}
export function assertCloneCaller(context,module){
  const state=cloneSourceContextFacts(context),original=state.modules.find(candidate=>moduleScopeKey(candidate)===moduleScopeKey(module));if(!original||original.source!==module.source||original.sourceView!==module.sourceView)fail('original module or view differs');
  const ancestors=state.binding.scopes.filter(scope=>scope.path.every((part,index)=>module.path[index]===part));if(!ancestors.some(scope=>moduleScopeKey(scope)===moduleScopeKey(module))||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope||scope.unresolvedAttributeMacroScope))fail('original ancestor type/attribute scope is unresolved');
  for(const scope of ancestors){
    if(scope.bindings.some(binding=>macroBindingAffects(binding,'attribute')&&['Clone','Copy','derive','doc','inline','automatically_derived'].includes(binding.name)&&binding.standardDerive!==true))fail('original builtin derive/generated attribute owner is shadowed');
    for(const binding of scope.bindings.filter(binding=>binding.namespace==='type'&&['Clone','core','std'].includes(binding.name))){const expected=binding.name==='Clone'?[binding.target?.[0],'clone','Clone']:[binding.name];if(binding.status!=='resolved'||!same(binding.target,expected)||binding.name==='Clone'&&!['std','core'].includes(binding.target?.[0]))fail('standard Clone trait or root is shadowed');}
    const owner=state.modules.find(candidate=>moduleScopeKey(candidate)===moduleScopeKey(scope));for(const item of originalSourceModuleItems(owner))if(item.tokens[1]?.text==='!'&&item.tokens.some(token=>['no_core','no_std','no_implicit_prelude'].includes(token.text)))fail('implicit standard prelude is disabled');
  }
  return {state,original,ancestors};
}
