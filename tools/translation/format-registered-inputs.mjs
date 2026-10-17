// Original export/registration source binding only. Compiler AST construction,
// caller namespace, trait execution and effects require independent proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalMacroTrees,originalMacroInvocation,originalTopLevelMacroInvocations,originalMacroTreeText,freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeNestedMacroInvocations,declarativeNestedMacroInput} from './declarative-token-macros.mjs';
import {isPinnedFormatSourceStages,formatSourceStageInput} from './format-source-profiles.mjs';
import {formattingSourceMacros} from './format-source-meta.mjs';
import {compileFormatCallbackDataflow,compileFormatCallbackForwarder} from './format-builtin-dataflow.mjs';
const directory=new URL('./source-profiles/format-registered-inputs/',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('manifest.json',directory));
if(hash(bytes)!=='cc2f4ee852e71362bdecd71cfcf56e4a0e89507c5877ddee8eed9a39acd1489a')throw new TypeError('Original formatting registered source profile changed');
const profile=JSON.parse(bytes),states=new WeakMap(),owners=new WeakMap(),wrappers=new WeakMap(),cache=new WeakMap();
const limits={callerMacroOwnerResolved:false,callbackModuleOwnerResolved:false,sourceNamespaceClosureVerified:false,compilerAstClosureVerified:false,sourceSemanticClosureVerified:false,noDropAuthority:false,copyAuthority:false,constAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false};
const fail=message=>{throw new TypeError('Original formatting registration: '+message);};
const word=node=>node?.kind==='token'?node.text:null,words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text),syntax=source=>words(rustTokens(source)).join(' '),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function issue(value,map,state){const encoded=JSON.stringify(value),result=freezeMacroTree({...JSON.parse(encoded),metaSha256:hash(encoded)});map.set(result,state);return result;}
// Public byte candidates do not carry the private joined source identity.
export function formatRegisteredOriginalInput(path,packed){
  const rows=profile.sources.filter(row=>row.path===path);if(rows.length!==1||!Buffer.isBuffer(packed))fail('one retained full archive is required');const pin=rows[0];
  if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('full archive changed: '+path);
  const raw=gunzipSync(packed,{maxOutputLength:200000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('full original bytes changed: '+path);
  return freezeMacroTree({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),...limits});
}
function supplementalSources(){
  if(profile.rust!=='1.89.0'||profile.namespaceAuthority!==false||profile.runtimeAuthority!==false)fail('source profile boundary changed');
  return new Map(profile.sources.map(pin=>{const url=new URL(pin.archive,directory);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('archive escapes retained sources');return [pin.path,formatRegisteredOriginalInput(pin.path,readFileSync(url))];}));
}
function originalReference(origin,item,offset=0){const span={start:offset+item.start,end:offset+item.end};return {sourcePath:origin.path,sourceSha256:origin.sha256,span,original:origin.source.slice(span.start,span.end),sha256:hash(origin.source.slice(span.start,span.end))};}
function one(origin,term,name){const rows=sourceItems(origin.source).filter(item=>item.term===term&&item.name===name);if(rows.length!==1)fail('source item absent or ambiguous: '+name);return rows[0];}
function body(origin,item,offset=0){const tokens=item.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='{');if(at<0||tokens.at(-1).text!=='}')fail('source body absent');return {path:origin.path,sha256:origin.sha256,source:origin.source,fragment:origin.source.slice(offset+tokens[at].end,offset+tokens.at(-1).start),offset:offset+tokens[at].end};}
function itemHeader(item){const tokens=item.tokens.filter(token=>token.type!=='comment');let at=0;const attributes=[];while(tokens[at]?.text==='#'){const start=at++;if(tokens[at++]?.text!=='[')fail('unsupported inner/source attribute');let depth=1;for(;at<tokens.length&&depth;at++){if(tokens[at].text==='[')depth++;if(tokens[at].text===']')depth--;}if(depth)fail('unterminated source attribute');const row=tokens.slice(start,at);if(['cfg','cfg_attr'].includes(row[2]?.text))fail('selected source route has unresolved configuration');attributes.push(row);}return {tokens:tokens.slice(at),attributes};}
// Exact grouped use leaves, including aliases. Globs/unsupported syntax remain
// unresolved rather than becoming an invented source namespace inventory.
function useLeaves(item){const {tokens}=itemHeader(item);let at=0;if(tokens[at]?.text==='pub')at++;if(tokens[at++]?.text!=='use')fail('selected use is not a public/simple declaration');const result=[];let cells=0;
  const take=text=>tokens[at]?.text===text?(at++,true):false;
  const tree=(prefix,depth=0)=>{if(depth>32||++cells>256)fail('use tree budget');if(take('{')){if(take('}'))fail('empty use group');while(true){tree(prefix,depth+1);if(take('}'))break;if(!take(','))fail('use separator');if(take('}'))break;}return;}const token=tokens[at++];if(token?.type!=='ident'||!/^\p{ID_Start}[\p{ID_Continue}_]*$/u.test(token.text))fail('unresolved use segment');const path=[...prefix,token.text];if(take('::'))return tree(path,depth+1);let alias=null;if(take('as')){alias=tokens[at++]?.text;if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(alias??''))fail('use alias');}result.push({path,name:alias??token.text,alias});};
  tree([]);if(!take(';')||at!==tokens.length)fail('unconsumed use syntax');return result;
}
function uses(origin,fragment=origin.source,offset=0){return sourceItems(fragment).filter(item=>item.term==='use').flatMap(item=>{let leaves;try{leaves=useLeaves(item);}catch{return [];}return leaves.map(leaf=>({...leaf,declaration:originalReference(origin,item,offset)}));});}
function useRoute(origin,target,fragment=origin.source,offset=0){const rows=uses(origin,fragment,offset).filter(row=>!row.alias&&same(row.path,target));if(rows.length!==1)fail('source use route absent or ambiguous: '+target.join('::'));return rows[0];}
function moduleRoute(origin,name,{macroUse=false,publicModule=false}={}){const item=one(origin,'mod',name),header=itemHeader(item),written=words(header.tokens),expected=['mod',name,';'];if(!(same(written,expected)&&!publicModule||same(written,['pub',...expected]))||macroUse&&!header.attributes.some(tokens=>same(words(tokens),['#','[','macro_use',']'])))fail('actual source module route differs: '+name);return originalReference(origin,item);}
function symbolSources(sources,names){
  const generator=sources.get('compiler/rustc_macros/src/symbols.rs'),data=sources.get('compiler/rustc_span/src/symbol.rs');
  const impls=sourceItems(generator.source).filter(item=>item.term==='impl'&&words(item.tokens).slice(0,4).join(' ')==='impl Parse for Symbol');if(impls.length!==1)fail('original Symbol parser owner absent');const frame=body(generator,impls[0]),parse=sourceItems(frame.fragment).filter(item=>item.term==='fn'&&item.name==='parse');if(parse.length!==1||syntax(frame.fragment.slice(parse[0].start,parse[0].end))!==syntax("fn parse(input: ParseStream<'_>) -> Result<Self> {let name=input.parse()?;let colon_token:Option<Token![:]> = input.parse()?;let value=if colon_token.is_some(){input.parse()?}else{Value::SameAsName};Ok(Symbol{name,value})}"))fail('original symbol SameAsName parser differs');
  const generate=one(generator,'fn','symbols_with_errors'),text=syntax(generator.source.slice(generate.start,generate.end));for(const required of ['for symbol in input.symbols.iter(){let name=&symbol.name;','Value::SameAsName => name.to_string(),','let idx=entries.insert(symbol.name.span(),&value,&mut errors);','symbols_stream.extend(quote!{pub const #name:Symbol=Symbol::new(#idx);});'])if(!text.includes(syntax(required)))fail('original symbol quote generator differs');
  const calls=originalTopLevelMacroInvocations(data.source).filter(call=>same(call.path,['symbols']));if(calls.length!==1)fail('complete original symbols invocation absent');const at=calls[0].trees.findIndex(tree=>tree.text==='Symbols'),group=calls[0].trees[at+1];if(group?.delimiter!=='{')fail('original symbol source data group absent');
  const slots=names.map(name=>{const indices=group.children.flatMap((tree,index)=>tree.text===name&&(!index||group.children[index-1]?.text===',')&&[',',':'].includes(group.children[index+1]?.text)?[index]:[]);if(indices.length!==1)fail('registered symbol source slot absent or ambiguous: '+name);const index=indices[0],node=group.children[index];if(node.type!=='ident'||group.children[index+1]?.text!==','||index&&group.children[index-1]?.text!==',')fail('registered symbol requires SameAsName source initializer');return {name,value:name,sourcePath:data.path,sourceSha256:data.sha256,originalSlot:node};});
  return {slots,parser:originalReference(generator,impls[0]),generator:originalReference(generator,generate),dataSha256:data.sha256,internerExecuted:false};
}
function registry(proof,sources){
  const pin=formatSourceStageInput(proof,'compiler/rustc_builtin_macros/src/lib.rs'),origin={path:pin.sourcePath,sha256:pin.sourceSha256,source:pin.source},fn=one(origin,'fn','register_builtin_macros'),frame=body(origin,fn);
  if(syntax(origin.source.slice(fn.start,frame.offset-1))!==syntax('pub fn register_builtin_macros(resolver:&mut dyn ResolverExpand)')||!syntax(frame.fragment).includes(syntax('let mut register=|name,kind|resolver.register_builtin_macro(name,kind);')))fail('actual resolver input/registration binding differs');
  const imports=[['std','sync','Arc'],['rustc_expand','base','MacroExpanderFn'],['rustc_expand','base','ResolverExpand'],['rustc_expand','base','SyntaxExtensionKind'],['rustc_span','sym']].map(path=>useRoute(origin,path));
  const definition=compileDeclarativeMacro(frame.fragment,{name:'register_bang',owner:['rustc_builtin_macros']}),calls=originalTopLevelMacroInvocations(frame.fragment).filter(call=>same(call.path,['register_bang']));if(calls.length!==1)fail('complete original bang registration invocation absent');
  const invocation=calls[0],expansion=expandDeclarativeMacro(definition,invocation.trees),entries=[];
  for(let at=0;at<invocation.trees.length;){const begin=at,name=invocation.trees[at++];if(name?.type!=='ident'||invocation.trees[at++]?.text!==':')fail('registration literal slot differs');const nodes=[];while(at<invocation.trees.length&&invocation.trees[at].text!==',')nodes.push(invocation.trees[at++]);if(invocation.trees[at++]?.text!==','||nodes.length!==3||nodes[0].type!=='ident'||nodes[1].text!=='::'||nodes[2].type!=='ident'||entries.some(row=>row.name===name.text))fail('registration callback path differs');
    const path=[nodes[0].text,nodes[2].text],module=moduleRoute(origin,path[0]),expected='(sym :: '+name.text+' , SyntaxExtensionKind :: LegacyBang (Arc :: new ('+nodes.map(node=>node.text).join(' ')+' as MacroExpanderFn)))',hits=expansion.trees.flatMap((tree,index)=>tree.text==='register'&&expansion.trees[index+1]?.delimiter==='('?[expansion.trees[index+1]]:[]).filter(tree=>originalMacroTreeText(tree)===expected);if(hits.length!==1)fail('full original registration transcription differs: '+name.text);
    entries.push({name:name.text,callbackPath:path,moduleDeclaration:module,originalBinding:invocation.trees.slice(begin,at),emittedRegistration:hits[0]});
  }
  if(!entries.length||expansion.trees.length!==entries.length*3)fail('registration output has unmatched statements');
  return {source:originalReference(origin,fn),bodyOffset:frame.offset,imports,definition,invocation,expansion,entries,symbols:symbolSources(sources,entries.map(row=>row.name)),registrationExpansionVerified:true,resolverExecuted:false,callbackTraitExecutionVerified:false};
}
function namespaceObligations(origin){return {sourcePath:origin.path,sourceSha256:origin.sha256,topLevelBangCandidates:originalTopLevelMacroInvocations(origin.source),sourceNamespaceClosureVerified:false};}
function declarations(proof,path){const pin=formatSourceStageInput(proof,path),origin={path,sha256:pin.sourceSha256,source:pin.source};return formattingSourceMacros(proof,path).map(row=>({...row,declaration:{sourcePath:path,sourceSha256:origin.sha256,span:row.span,original:origin.source.slice(row.span.start,row.span.end),sha256:row.sha256}}));}
export function loadFormatRegisteredInputs(proof){
  if(!isPinnedFormatSourceStages(proof))fail('private original format input proof required');if(cache.has(proof))return cache.get(proof);
  // Recheck every existing stage path, including required peer registration.
  for(const row of proof.availableInputs)formatSourceStageInput(proof,row.sourcePath);
  const sources=supplementalSources(),standard=sources.get('library/std/src/lib.rs'),alloc=sources.get('library/alloc/src/lib.rs'),core=sources.get('library/core/src/lib.rs'),registration=registry(proof,sources);
  const aliases=sourceItems(standard.source).filter(item=>{let header;try{header=itemHeader(item);}catch{return false;}return same(words(header.tokens),['extern','crate','alloc','as','alloc_crate',';'])&&header.attributes.some(row=>same(words(row),['#','[','macro_use',']']));});if(aliases.length!==1)fail('actual std alloc macro import differs');const alias=aliases[0];
  const allocMacroModule=moduleRoute(alloc,'macros',{macroUse:true}),coreMacroModule=moduleRoute(core,'macros',{macroUse:true});
  const exportItem=one(alloc,'mod','__export'),exportBody=body(alloc,exportItem);if(!same(words(itemHeader(exportItem).tokens).slice(0,3),['pub','mod','__export']))fail('actual alloc helper module is not public');
  const builtinDeclarations=declarations(proof,'library/core/src/macros/mod.rs').filter(row=>row.builtin&&row.attributes.some(attr=>word(attr.children[0])==='macro_export'));
  const directDeclarations=declarations(proof,'library/alloc/src/macros.rs').filter(row=>!row.builtin&&row.module.length===0&&row.attributes.some(attr=>word(attr.children[0])==='macro_export'));
  const standardUses=uses(standard),helperUses=uses(alloc,exportBody.fragment,exportBody.offset),routes=[];
  for(const row of builtinDeclarations){const matches=registration.entries.filter(entry=>entry.name===row.name);if(matches.length!==1)continue;const stdExports=standardUses.filter(leaf=>same(leaf.path,['core',row.name])&&!leaf.alias),allocExports=helperUses.filter(leaf=>same(leaf.path,['core',row.name])&&!leaf.alias);if(stdExports.length>1||allocExports.length>1)fail('ambiguous actual builtin export route');routes.push({name:row.name,target:['core',row.name],declaration:row,registration:matches[0],symbol:registration.symbols.slots.find(slot=>slot.name===row.name),coreMacroModule,stdExports,allocHelperExports:allocExports});}
  const wrappers=[];for(const row of directDeclarations){const exports=standardUses.filter(leaf=>same(leaf.path,['alloc_crate',row.name])&&!leaf.alias);if(exports.length>1)fail('ambiguous actual wrapper export route');if(exports.length===1)wrappers.push({name:row.name,target:['alloc',row.name],declaration:row,allocMacroModule,stdAllocImport:originalReference(standard,alias),stdExport:exports[0]});}
  const result=issue({schema:'original-format-registered-inputs-v1',formatProfileSha256:proof.profileSha256,joinedProfileSha256:hash(bytes),sources:profile.sources,namespaceObligations:[standard,alloc,core,{path:registration.source.sourcePath,sha256:registration.source.sourceSha256,source:formatSourceStageInput(proof,registration.source.sourcePath).source}].map(namespaceObligations),registration,routes,wrappers,sourceExportsVerified:true,sourceRegistrationExpansionVerified:true,...limits},states,{proof,sources,registration,routes,wrappers});cache.set(proof,result);return result;
}
export const isFormatRegisteredInputs=value=>!!value&&states.has(value);
export function formatRegisteredSourceOwner(inputs,proof,name){
  const state=states.get(inputs);if(!state||state.proof!==proof)fail('copied or foreign joined original inputs');if(typeof name!=='string')fail('source builtin name must be a string');const rows=state.routes.filter(row=>row.name===name);if(rows.length!==1)fail('builtin declaration/registration route absent or ambiguous');const row=rows[0],path=inputs.registration.source.sourcePath.replace(/lib\.rs$/u,row.registration.callbackPath[0]+'.rs'),pin=formatSourceStageInput(proof,path);
  const callback=compileFormatCallbackDataflow(proof,path,row.registration.callbackPath[1]),forwarder=compileFormatCallbackForwarder(callback);if(forwarder.callPath.length!==1)fail('callback tail callee requires additional source module binding');const target=compileFormatCallbackDataflow(proof,path,forwarder.callPath[0]);
  const result=issue({schema:'original-registered-format-source-owner-v1',name,sourceBinding:row,callbackSource:{sourcePath:path,sourceSha256:pin.sourceSha256},callback,forwarder,target,callbackModuleSourceBindingVerified:true,registeredSymbolSourceValueVerified:true,...limits},owners,{inputs,proof,row,callback,forwarder,target});return result;
}
export const isFormatRegisteredSourceOwner=value=>!!value&&owners.has(value);

export function expandRegisteredFormatWrapper(inputs,proof,name,source){
  const state=states.get(inputs);if(!state||state.proof!==proof)fail('copied or foreign joined original inputs');if(typeof name!=='string'||typeof source!=='string')fail('original wrapper syntax required');const rows=state.wrappers.filter(row=>row.name===name);if(rows.length!==1)fail('wrapper declaration/export absent or ambiguous');const row=rows[0],pin=formatSourceStageInput(proof,row.declaration.declaration.sourcePath),invocation=originalMacroInvocation(source);if(invocation.path.at(-1)!==name)fail('written wrapper syntax differs');
  const definition=compileDeclarativeMacro(pin.source,{name,owner:row.target.slice(0,-1)}),expansion=expandDeclarativeMacro(definition,invocation.trees),calls=declarativeNestedMacroInvocations(expansion),nested=[];
  for(const call of calls){const routes=state.routes.filter(route=>route.allocHelperExports.length===1&&same(call.writtenPath,['alloc','__export',route.name]));if(routes.length!==1){nested.push({call,sourceBindingVerified:false,diagnostic:'Nested macro source export/registration remains unresolved'});continue;}const route=routes[0],owner=formatRegisteredSourceOwner(inputs,proof,route.name),forwardedInput=declarativeNestedMacroInput(expansion,call);nested.push({call,forwardedInput,owner,sourceBindingVerified:true,compilerAstClosureVerified:false});}
  return issue({schema:'original-registered-format-wrapper-stage-v1',originalSource:source,originalSourceSha256:hash(source),wrapper:row,definition,invocation,expansion,nested,ordinaryCalleeExecutionVerified:false,nestedCompilerExecuted:false,...limits},wrappers,{inputs,proof,expansion,nested});
}
export const isRegisteredFormatWrapperStage=value=>!!value&&wrappers.has(value);

export function formatRegisteredInputSource(inputs,proof,path){const state=states.get(inputs);if(!state||state.proof!==proof)fail('copied or foreign joined original inputs');if(typeof path!=='string')fail('original source path required');const source=state.sources.get(path);if(source)return source;return formatSourceStageInput(proof,path);}

// Public serialized metadata deliberately loses engine identities. Only this
// exact private joined stage can hand its genuine expansion to the next stage.
export function registeredFormatWrapperOriginalExpansion(stage,inputs,proof){const state=wrappers.get(stage);if(!state||state.inputs!==inputs||state.proof!==proof)fail('copied or foreign original wrapper stage');return freezeMacroTree({expansion:state.expansion,nested:state.nested});}
