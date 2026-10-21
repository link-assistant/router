// Complete pinned source program for the *separate* ordinary include Bang ABI.
// It does not extend the AttrLike provider or authenticate a caller namespace.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText,freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-macros.mjs';
import {stablePublicReexportCandidates} from './namespace-census.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalNamespaceTraversalIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged,originalPrivateParserIngressUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const ROOT=new URL('./',import.meta.url),MANIFEST=new URL('./source-profiles/literal-include-type/manifest.json',ROOT);
const PROFILE_SHA='78ae478f690f967ab483b4584467d87a754fa4c2f357cf1bdd7552090bcf1b1a';
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;},programs=new WeakMap();
const fail=message=>{throw new TypeError('Original include source program: '+message);};
function guard(){if(!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalPrivateParserIngressUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('native source traversal changed');}
function one(rows,label){if(rows.length!==1)fail('one complete original '+label+' required');return rows[0];}
function functionOf(origin,name){
 const found=[];function scan(nodes){for(let at=0;at<nodes.length;at++){
  if(nodes[at].text==='fn'&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;if(nodes[end]?.delimiter==='{')found.push({path:origin.path,sourceSha256:origin.sha256,name,span:{start:nodes[at].span.start,end:nodes[end].span.end},original:origin.source.slice(nodes[at].span.start,nodes[end].span.end),syntax:nodes.slice(at,end+1)});}
  if(nodes[at].kind==='group')scan(nodes[at].children);
 }}scan(originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));return one(found,name);
}
function includeDeclaration(origin){
 const found=[];function scan(source,offset){for(const item of sourceItems(source)){
  if(item.name==='include'&&item.tokens.some(token=>token.text==='macro_rules!'))found.push({path:origin.path,sourceSha256:origin.sha256,span:{start:offset+item.start,end:offset+item.end},original:origin.source.slice(offset+item.start,offset+item.end)});
  if(item.term==='mod'){const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);if(open&&close?.text==='}')scan(source.slice(open.end,close.start),offset+open.end);}
 }}scan(origin.source,0);const declaration=one(found,'core include declaration'),trees=originalMacroTrees(declaration.original),at=trees.findIndex(node=>node.text==='macro_rules');
 if(at<0||trees[at+1]?.text!=='!'||trees[at+2]?.text!=='include'||trees[at+3]?.delimiter!=='{'||at+4!==trees.length)fail('actual full core include grammar differs');
 const attributes=trees.slice(0,at).filter(node=>node.delimiter==='[');if(!attributes.some(node=>node.children.length===1&&node.children[0].text==='rustc_builtin_macro')||!attributes.some(node=>node.children.length===1&&node.children[0].text==='macro_export'))fail('original builtin/export markers absent');return declaration;
}
export function loadOriginalLiteralIncludeSourceProgram(){
 guard();const profileBytes=readFileSync(MANIFEST),profileText=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(profileBytes);if(hash(profileText)!==PROFILE_SHA)fail('complete manifest differs');const profile=JSON.parse(profileText),raw=[];
 for(const pin of profile.licenses){const bytes=readFileSync(new URL(pin.path,ROOT));if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)fail('complete original license differs');raw.push({url:new URL(pin.path,ROOT),bytes});}
 const sources=profile.sources.map(pin=>{const url=new URL(pin.archive,ROOT),packed=readFileSync(url);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete archive differs: '+pin.path);const bytes=gunzipSync(packed,{maxOutputLength:256000}),source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);if(bytes.length!==pin.bytes||hash(source)!==pin.sha256)fail('complete original source differs: '+pin.path);const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('whole compiler source CST differs');raw.push({url,bytes:packed});return {...pin,source,concrete:concrete.meta};});
 const get=path=>one(sources.filter(row=>row.path===path),path),builtin=get('compiler/rustc_builtin_macros/src/lib.rs'),entry=functionOf(get('compiler/rustc_builtin_macros/src/source_util.rs'),'expand_include'),items=functionOf(get('compiler/rustc_builtin_macros/src/source_util.rs'),'make_items'),expression=functionOf(get('compiler/rustc_builtin_macros/src/source_util.rs'),'make_expr'),resolvePath=functionOf(get('compiler/rustc_expand/src/base.rs'),'resolve_path'),singleString=functionOf(get('compiler/rustc_builtin_macros/src/util.rs'),'get_single_str_from_tts'),spannedString=functionOf(get('compiler/rustc_builtin_macros/src/util.rs'),'get_single_str_spanned_from_tts'),register=functionOf(builtin,'register_builtin_macros');
 const registerBody=register.syntax.at(-1),registerSource=builtin.source.slice(registerBody.span.start+1,registerBody.span.end-1),definition=compileDeclarativeMacro(registerSource,{name:'register_bang',owner:['rustc_builtin_macros']}),calls=originalTopLevelMacroInvocations(registerSource).filter(call=>call.path.join('::')==='register_bang');
 // The full function is retained. The callback slot is selected from actual
 // original TT, never inferred from the public spelling alone.
 const registration=one(calls,'register_bang invocation'),slots=[],completeEntries=[];for(let at=0;at<registration.trees.length;){const name=registration.trees[at++];if(name.type!=='ident'||registration.trees[at++]?.text!==':')fail('whole registration slot differs');const callback=[];while(at<registration.trees.length&&registration.trees[at].text!==',')callback.push(registration.trees[at++]);if(registration.trees[at++]?.text!==',')fail('whole registration terminator differs');const entry={name:name.text,callback};completeEntries.push(entry);if(name.text==='include')slots.push(entry);}
 const slot=one(slots,'include registration');if(slot.callback.map(node=>node.text).join(' ')!=='source_util :: expand_include')fail('actual include callback differs');
 const expansion=expandDeclarativeMacro(definition,registration.trees),emitted=expansion.trees.flatMap((tree,index)=>tree.text==='register'&&expansion.trees[index+1]?.delimiter==='('? [expansion.trees[index+1]]:[]),expected='(sym :: include , SyntaxExtensionKind :: LegacyBang (Arc :: new (source_util :: expand_include as MacroExpanderFn)))';if(expansion.trees.length!==completeEntries.length*3||emitted.length!==completeEntries.length||emitted.filter(tree=>originalMacroTreeText(tree)===expected).length!==1)fail('complete original LegacyBang registry expansion differs');
 const declaration=includeDeclaration(get('library/core/src/macros/mod.rs')),std=one(stablePublicReexportCandidates(get('library/std/src/lib.rs').source).filter(row=>row.name==='include'&&row.path.join('::')==='core::include'),'std to core reexport');
 const result=freezeMacroTree({schema:profile.schema,profileSha256:PROFILE_SHA,rustVersion:profile.rustVersion,sources,licenses:profile.licenses,declaration,stdReexport:std,registration:{completeFunction:register,definition,invocation:registration,completeEntries,expansion,slot},callbacks:{entry,items,expression,resolvePath,singleString,spannedString},sourceLibraryABI:'pinned ordinary core/std include Bang source contract',itemInputIsCompleteFile:true,itemOutputIsOriginalParserItems:true,nativeSysrootConformance:false,actualInvocationObserved:false,callerOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false});
 for(const row of raw)if(!readFileSync(row.url).equals(row.bytes))fail('complete source changed at EOF');if(!readFileSync(MANIFEST).equals(profileBytes))fail('manifest changed at EOF');guard();programs.set(result,{profileBytes,raw});return result;
}
export function requireOriginalLiteralIncludeSourceProgram(program){guard();const state=programs.get(program);if(!state)fail('copied or foreign source program');for(const row of state.raw)if(!readFileSync(row.url).equals(row.bytes))fail('original source changed');if(!readFileSync(MANIFEST).equals(state.profileBytes))fail('manifest changed');const fresh=loadOriginalLiteralIncludeSourceProgram();if(fresh.profileSha256!==program.profileSha256)fail('source program changed');return program;}
