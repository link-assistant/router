// Registered standard derive identities only. Their outputs and trait bodies
// require independent source routes; no namespace or runtime authority is issued.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from './builtin-derive-ast-meta.mjs';
import {originalUseDeclarationLeaves} from './module-bindings.mjs';
const directory=new URL('./source-profiles/builtin-derive-standard-inputs/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',directory)),profile=JSON.parse(profileBytes);
const hash=value=>createHash('sha256').update(value).digest('hex'),registries=new WeakMap(),cache=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text),syntax=source=>words(rustTokens(source)).join(' '),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original standard derive input: '+message);};
function reference(origin,item,offset=0){return {source:origin.path,sourceSha256:origin.sha256,span:{start:item.start+offset,end:item.end+offset},original:origin.source.slice(item.start+offset,item.end+offset)};}
function one(origin,term,name){const rows=sourceItems(origin.source).filter(item=>item.term===term&&item.name===name);if(rows.length!==1)fail('original item absent/ambiguous: '+name);return rows[0];}
function frame(origin,item,offset=0){const tokens=item.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='{');if(at<0||tokens.at(-1).text!=='}')fail('original body absent');return {source:origin.source.slice(offset+tokens[at].end,offset+tokens.at(-1).start),offset:offset+tokens[at].end};}
// Original byte candidates carry no registry/caller capability. This bounded
// codec is shared by the real file loader and independent byte-tamper tests.
export function builtinStandardDeriveOriginalInput(path,packed){
  const rows=profile.sources.filter(row=>row.path===path);if(rows.length!==1||!Buffer.isBuffer(packed))fail('original byte candidate requires one retained source path');const row=rows[0];
  if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('full original archive differs: '+row.path);
  const raw=gunzipSync(packed,{maxOutputLength:150000});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('full original archive differs: '+row.path);
  return freeze({...row,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),namespaceAuthority:false,runtimeAuthority:false});
}
function retainedSources(){
  if(profile.rustVersion!=='1.89'||profile.namespaceAuthority!==false||profile.runtimeAuthority!==false)fail('source profile boundary differs');
  return profile.sources.map(row=>{const url=new URL(row.archive,directory);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('source archive escapes retained profiles');return builtinStandardDeriveOriginalInput(row.path,readFileSync(url));});
}
function declarations(origin){
  const result=[],modulePath=origin.path.slice('library/core/src/'.length).replace(/(?:\/mod)?\.rs$/u,'').split('/');
  function scan(source,offset,path){for(const item of sourceItems(source)){
    if(item.term==='macro'){
      const tokens=words(item.tokens),at=tokens.indexOf('pub');
      if(!tokens.includes('rustc_builtin_macro')||!same(tokens.slice(at),['pub','macro',item.name,'(','$item',':','item',')','{','}']))continue;
      result.push({name:item.name,target:['core',...modulePath,...path,item.name],declaration:reference(origin,item,offset),helpers:tokens.includes('attributes')?tokens.slice(tokens.indexOf('attributes')+2,tokens.indexOf('attributes')+3):[]});
    }
    if(item.term==='mod'&&item.tokens.some(token=>token.text==='{')){const body=frame(origin,item,offset);scan(body.source,body.offset,[...path,item.name]);}
  }}scan(origin.source,0,[]);return result;
}
function useRoute(origin,target,requirePublic=true){
  const rows=sourceItems(origin.source).filter(item=>item.term==='use'&&(!requirePublic||words(item.tokens).includes('pub'))).flatMap(item=>originalUseDeclarationLeaves(item).filter(leaf=>!leaf.alias&&!leaf.glob&&same(leaf.segments,target)).map(leaf=>({declaration:reference(origin,item),leaf})));
  if(rows.length!==1)fail('actual prelude reexport absent/ambiguous: '+target.join('::'));return rows[0];
}
function symbolSlots(sources,names){
  const origin=sources.find(row=>row.path==='compiler/rustc_macros/src/symbols.rs'),data=sources.find(row=>row.path==='compiler/rustc_span/src/symbol.rs'),impl=sourceItems(origin.source).filter(item=>item.term==='impl'&&words(item.tokens).slice(0,4).join(' ')==='impl Parse for Symbol');if(impl.length!==1)fail('original Symbol parser owner differs');
  const body=frame(origin,impl[0]),parse=sourceItems(body.source).filter(item=>item.term==='fn'&&item.name==='parse');if(parse.length!==1||syntax(body.source.slice(parse[0].start,parse[0].end))!==syntax("fn parse(input: ParseStream<'_>) -> Result<Self> {let name=input.parse()?;let colon_token:Option<Token![:]> = input.parse()?;let value=if colon_token.is_some(){input.parse()?}else{Value::SameAsName};Ok(Symbol{name,value})}"))fail('original SameAsName parser differs');
  const generate=one(origin,'fn','symbols_with_errors'),text=syntax(origin.source.slice(generate.start,generate.end));for(const required of ['for symbol in input.symbols.iter(){let name=&symbol.name;','Value::SameAsName => name.to_string(),','let idx=entries.insert(symbol.name.span(),&value,&mut errors);','symbols_stream.extend(quote!{pub const #name:Symbol=Symbol::new(#idx);});'])if(!text.includes(syntax(required)))fail('original symbol generator name/value quote differs');
  const calls=originalTopLevelMacroInvocations(data.source).filter(call=>same(call.path,['symbols']));if(calls.length!==1)fail('whole original symbols invocation absent/ambiguous');const at=calls[0].trees.findIndex(tree=>tree.text==='Symbols'),group=calls[0].trees[at+1];if(group?.delimiter!=='{')fail('original symbol data group differs');
  const slots=names.map(name=>{const rows=group.children.flatMap((tree,index)=>tree.text===name?[index]:[]);if(rows.length!==1)fail('registered symbol absent/ambiguous');const index=rows[0],tree=group.children[index];if(tree.type!=='ident'||group.children[index+1]?.text!==','||index&&group.children[index-1]?.text!==',')fail('registered symbol is not an original SameAsName identifier');return {name,source:data.path,sourceSha256:data.sha256,originalSlot:tree,value:name};});
  return {slots,parser:reference(origin,impl[0]),generator:reference(origin,generate),dataSource:{path:data.path,sha256:data.sha256},internerExecuted:false,arbitrarySymbolExpressions:false};
}
export function builtinStandardDeriveRegistry(dependencies){
  const ast=builtinDeriveAstSourceProfile(dependencies);if(cache.has(dependencies))return cache.get(dependencies);
  const sources=retainedSources(),origin=builtinAstOriginal(ast,'compiler/rustc_builtin_macros/src/lib.rs'),register=one(origin,'fn','register_builtin_macros'),body=frame(origin,register);
  const definition=compileDeclarativeMacro(body.source,{name:'register_derive',owner:['rustc_builtin_macros']}),calls=originalTopLevelMacroInvocations(body.source).filter(call=>same(call.path,['register_derive']));if(calls.length!==1)fail('complete registration invocation absent/ambiguous');
  if(!syntax(origin.source).includes(syntax('use crate::deriving::*;'))||!syntax(body.source).includes(syntax('let mut register=|name,kind|resolver.register_builtin_macro(name,kind);')))fail('original registration import/callback binding differs');
  if(syntax(origin.source.slice(register.start,origin.source.indexOf('{',register.start)))!==syntax('pub fn register_builtin_macros(resolver:&mut dyn ResolverExpand)'))fail('actual resolver registration parameter differs');
  const registrationImports=[useRoute(origin,['std','sync','Arc'],false),useRoute(origin,['rustc_expand','base','SyntaxExtensionKind'],false),useRoute(origin,['rustc_expand','base','ResolverExpand'],false),useRoute(origin,['rustc_span','sym'],false)];
  const expansion=expandDeclarativeMacro(definition,calls[0].trees),deriving=builtinAstOriginal(ast,'compiler/rustc_builtin_macros/src/deriving/mod.rs'),entries=[];
  for(let at=0;at<calls[0].trees.length;){const start=at,name=calls[0].trees[at++];if(name.type!=='ident'||calls[0].trees[at++]?.text!==':')fail('registration name slot differs');const callback=[];while(at<calls[0].trees.length&&calls[0].trees[at].text!==',')callback.push(calls[0].trees[at++]);if(calls[0].trees[at++]?.text!==','||callback.length<3||callback.length%2!==1||callback.some((node,index)=>index%2?node.text!=='::':node.type!=='ident')||entries.some(row=>row.name===name.text))fail('registration callback path/terminator differs');
    const path=callback.filter((_,index)=>index%2===0).map(node=>node.text),module=one(deriving,'mod',path[0]);if(!words(module.tokens).includes('pub'))fail('registered callback module is not public within compiler');
    const emitted=expansion.trees.flatMap((tree,index)=>tree.text==='register'&&expansion.trees[index+1]?.delimiter==='('? [expansion.trees[index+1]]:[]);
    const expected='(sym :: '+name.text+' , SyntaxExtensionKind :: LegacyDerive (Arc :: new (BuiltinDerive ('+callback.map(node=>node.text).join(' ')+'))))',hits=emitted.filter(tree=>originalMacroTreeText(tree)===expected);if(hits.length!==1)fail('actual complete registration transcription differs: '+name.text+' '+expected);
    entries.push({name:name.text,callback:path,originalBinding:calls[0].trees.slice(start,at),deriveModule:reference(deriving,module),emittedRegistration:hits[0],callbackBodyCompiled:false});
  }
  if(expansion.trees.length!==entries.length*3||!entries.length)fail('complete registration output has unmatched statements');
  const symbols=symbolSlots(sources,entries.map(entry=>entry.name)),core=builtinAstOriginal(ast,'library/core/src/prelude/v1.rs'),std=builtinAstOriginal(ast,'library/std/src/prelude/v1.rs'),owners=[],editionPreludes=[];
  for(const library of ['core','std']){const origin=builtinAstOriginal(ast,'library/'+library+'/src/prelude/mod.rs'),module=one(origin,'mod','rust_'+dependencies.edition),body=frame(origin,module),uses=sourceItems(body.source).filter(item=>item.term==='use'&&words(item.tokens).includes('pub')).flatMap(item=>originalUseDeclarationLeaves(item).filter(leaf=>leaf.glob&&same(leaf.segments,['super','v1'])).map(leaf=>({declaration:reference(origin,item,body.offset),leaf})));if(uses.length!==1)fail('actual edition-to-v1 prelude route differs');editionPreludes.push({module:reference(origin,module),v1Route:uses[0]});}
  for(const declaration of sources.filter(row=>row.path.startsWith('library/core/')).flatMap(declarations)){
    const selected=entries.filter(entry=>entry.name===declaration.name);if(selected.length!==1)continue;
    let coreExport,stdExport;try{coreExport=useRoute(core,['crate',...declaration.target.slice(1)]);stdExport=useRoute(std,['core','prelude','v1',declaration.name]);}catch{continue;}
    if(owners.some(owner=>owner.name===declaration.name))fail('standard macro declaration is ambiguous');owners.push({...declaration,registration:selected[0],symbol:symbols.slots.find(slot=>slot.name===declaration.name),corePrelude:coreExport,stdPrelude:stdExport});
  }
  const evidence={schema:'original-builtin-standard-derive-registry-v1',dependenciesDigest:dependencies.digest,sourceProfileSha256:hash(profileBytes),sources:profile.sources,astProfileDigest:ast.digest,registration:{source:reference(origin,register),bodyOffset:body.offset,imports:registrationImports,definition,invocation:calls[0],expansion,completeEntries:entries},editionPreludes,symbols,owners,namespaceAuthority:false,runtimeAuthority:false,generatedImplBehavior:false};
  const registry=freeze({...evidence,digest:hash(JSON.stringify(evidence))});registries.set(registry,{dependencies,sources});cache.set(dependencies,registry);return registry;
}
export function builtinStandardDeriveSourceOwner(registry,dependencies,name){if(registries.get(registry)?.dependencies!==dependencies)fail('registry is copied or foreign');const rows=registry.owners.filter(owner=>owner.name===name);if(rows.length!==1)fail('source declaration/prelude/registration owner is absent: '+name);return rows[0];}
export const isBuiltinStandardDeriveRegistry=value=>!!value&&registries.has(value);
