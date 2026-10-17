// Original constructor/parser source plans only; no compiler callback is run.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees,originalTopLevelMacroInvocations,freezeMacroTree} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {formatRegisteredInputSource,formatRegisteredSourceOwner,registeredFormatWrapperOriginalExpansion} from './format-registered-inputs.mjs';
const directory=new URL('./source-profiles/format-constructors/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',directory)),hash=value=>createHash('sha256').update(value).digest('hex');
if(hash(profileBytes)!=='c499a8b3871286c18ec6ce5db7d49895ff00df2fce462baeb97f865391c849f0')throw new TypeError('Original format constructor profile changed');
const profile=JSON.parse(profileBytes),plans=new WeakMap(),candidates=new WeakMap(),cache=new WeakMap();
const limits={callerMacroOwnerResolved:false,callbackModuleOwnerResolved:false,compilerAstClosureVerified:false,templateParserExecuted:false,resultSlotsDefaultVerified:false,namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,runtimeAuthority:false,runtimeParity:false};
const fail=message=>{throw new TypeError('Original format constructors: '+message);};
const syntax=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join(' '),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const issue=(value,map,state)=>{const encoded=JSON.stringify(value),result=freezeMacroTree({...JSON.parse(encoded),metaSha256:hash(encoded)});map.set(result,state);return result;};
export function formatConstructorOriginalInput(path,packed){
 const rows=profile.sources.filter(row=>row.path===path);if(rows.length!==1||!Buffer.isBuffer(packed))fail('one retained full archive required');const pin=rows[0];if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('full archive changed: '+path);const raw=gunzipSync(packed,{maxOutputLength:300000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('full original bytes changed: '+path);return freezeMacroTree({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),...limits});
}
export function loadFormatConstructorInputs(inputs,proof){
 formatRegisteredInputSource(inputs,proof,'compiler/rustc_builtin_macros/src/lib.rs');if(cache.has(inputs))return cache.get(inputs);
 const sources=new Map(profile.sources.map(pin=>{const url=new URL(pin.archive,directory);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('archive escapes profile');return [pin.path,formatConstructorOriginalInput(pin.path,readFileSync(url))];})),roots=new Map(),recipes=[];
 for(const path of ['compiler/rustc_builtin_macros/src/format.rs','compiler/rustc_ast/src/format.rs']){const pin=formatRegisteredInputSource(inputs,proof,path);sources.set(path,{path,sha256:pin.sourceSha256,source:pin.source});}
 function recipe(path,kind,name,selector=null){
  const origin=sources.get(path);if(!origin)fail('original recipe source absent');if(!roots.has(path))roots.set(path,originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000}));const found=[];
  function visit(nodes,scope=[]){for(let at=0;at<nodes.length;at++){if(nodes[at].text===kind&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;if(nodes[end]?.delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end},original=origin.source.slice(span.start,span.end);if(selector===null||original.includes(selector))found.push({nodes:nodes.slice(at,end+1),span,original,scope});}}if(nodes[at].kind==='group')visit(nodes[at].children,[...scope,nodes[at].span]);}}
  visit(roots.get(path));if(found.length!==1)fail('original recipe absent or ambiguous: '+name);const row=found[0],result={sourcePath:path,sourceSha256:origin.sha256,kind,name,span:row.span,original:row.original,sha256:hash(row.original),syntax:row.nodes,lexicalScopes:row.scope};recipes.push(result);return result;
 }
 function contains(row,...parts){const actual=syntax(row.original);for(const part of parts)if(!actual.includes(syntax(part)))fail('original constructor branch differs: '+row.name);return row;}
 const build='compiler/rustc_expand/src/build.rs',base='compiler/rustc_expand/src/base.rs',expr='compiler/rustc_parse/src/parser/expr.rs',ast='compiler/rustc_ast/src/ast.rs',fmt='compiler/rustc_ast/src/format.rs',builtin='compiler/rustc_builtin_macros/src/format.rs';
 contains(recipe(build,'fn','expr'),'P(ast::Expr { id: ast::DUMMY_NODE_ID, kind, span, attrs: AttrVec::new(), tokens: None })');
 contains(recipe(build,'fn','expr_path'),'self.expr(path.span, ast::ExprKind::Path(None, path))');contains(recipe(build,'fn','expr_ident'),'self.expr_path(self.path_ident(span, id))');recipe(build,'fn','path_ident');
 contains(recipe(base,'fn','make_expr','self.expr'),'self.expr');contains(recipe(base,'fn','raw_expr'),'ast::ExprKind::Err(guar)','ast::ExprKind::Tup(ThinVec::new())','tokens: None');contains(recipe(base,'fn','any'),'Box::new(DummyResult { guar: Some(guar), span })');recipe(base,'trait','MacResult');recipe(base,'struct','DummyResult');
 contains(recipe(expr,'fn','parse_literal_maybe_minus'),'self.parse_token_lit()?','ExprKind::Lit(token_lit)');contains(recipe(expr,'fn','parse_expr_path_start'),'ExprKind::MacCall(mac)','ExprKind::Path(qself, path)');recipe(expr,'fn','parse_expr');recipe(expr,'fn','parse_expr_bottom');recipe(expr,'fn','parse_expr_lit');recipe(expr,'fn','parse_opt_token_lit');recipe(expr,'fn','eat_token_lit');contains(recipe(expr,'fn','mk_expr_with_attrs'),'P(Expr { kind, span, attrs, id: DUMMY_NODE_ID, tokens: None })');
 contains(recipe(builtin,'fn','parse_args'),'let mut args = FormatArguments::new()','p.parse_literal_maybe_minus()?','p.parse_expr()?','Ok(MacroInput { fmtstr, args, is_direct_literal })');
 contains(recipe(builtin,'fn','make_format_args'),'expr_to_spanned_string(ecx, efmt.clone(), msg)','FormatArgumentKind::Captured(ident)','ecx.expr_ident(span, ident)');
 recipe(ast,'struct','Expr');recipe(ast,'enum','ExprKind');recipe(ast,'struct','Path');recipe(ast,'struct','AnonConst');for(const name of ['FormatArgs','FormatArguments','FormatArgument'])recipe(fmt,'struct',name);recipe(fmt,'enum','FormatArgumentKind');recipe('compiler/rustc_ast/src/ptr.rs','fn','P');recipe('compiler/rustc_ast/src/visit.rs','fn','walk_expr');
 const origin=sources.get(base),calls=originalTopLevelMacroInvocations(origin.source).filter(call=>same(call.path,['make_MacEager']));if(calls.length!==1)fail('full original result constructor invocation absent');const definition=compileDeclarativeMacro(origin.source,{name:'make_MacEager',owner:['rustc_expand','base']}),expansion=expandDeclarativeMacro(definition,calls[0].trees),owner=formatRegisteredSourceOwner(inputs,proof,'format_args');
 const result=issue({schema:'original-format-constructor-inputs-v1',sourceProfileSha256:hash(profileBytes),sources:profile.sources,recipes,resultConstructor:{sourcePath:base,sourceSha256:origin.sha256,definition,invocation:calls[0],expansion},registeredCallback:owner,retainedObligations:['complete compiler module/import namespace','MacEager derived Default and every other result slot','MacResult item/stmt adapters','DummyResult all error/retry branches','full format template parser and captures','source visitor recursion into argument expressions','opaque/general expression input and effects','trait/allocator/Drop/Arguments lowering'],...limits},plans,{inputs,proof,sources,recipes,expansion});cache.set(inputs,result);return result;
}
export const isFormatConstructorInputs=value=>!!value&&plans.has(value);
export function sourceLiteralFormatConstructorCandidate(plan,inputs,proof,stage){
 const state=plans.get(plan);if(!state||state.inputs!==inputs||state.proof!==proof)fail('copied or foreign constructor plan');const original=registeredFormatWrapperOriginalExpansion(stage,inputs,proof);if(original.nested.length!==1||!original.nested[0].sourceBindingVerified||original.nested[0].owner.name!=='format_args')fail('exact original formatting wrapper/callback source chain required');const nodes=original.nested[0].forwardedInput;
 function transparent(node){let depth=0;while(node?.kind==='fragment'&&node.fragment==='tt'&&node.trees.length===1){if(++depth>64)fail('literal forwarding depth budget');node=node.trees[0];}return node;}
 const literal=transparent(nodes[0]);if(nodes.length!==1||literal?.kind!=='token'||literal.type!=='string')fail('direct literal template only; explicit/block/macro/custom arguments remain uncompiled');
 return issue({schema:'source-literal-format-constructor-candidate-v1',templateToken:literal,sourceWrapper:stage,sourcePlan:plan,explicitArgumentCount:0,implicitCaptureSourceRecipe:state.recipes.find(row=>row.name==='make_format_args'),templateValueDecoded:false,templateLexicallyVerified:false,implicitCaptureNamesResolved:false,completeArgumentAstVerified:false,...limits},candidates,{plan,inputs,proof,stage,literal});
}
export const isSourceLiteralFormatConstructorCandidate=value=>!!value&&candidates.has(value);
// Original complete source access, authenticated by the same private plan and
// registration issuer. Public recipe copies never become source capabilities.
export function formatConstructorInputSource(plan,inputs,proof,path){
 const state=plans.get(plan);if(!state||state.inputs!==inputs||state.proof!==proof)fail('copied or foreign constructor source association');
 formatRegisteredInputSource(inputs,proof,'compiler/rustc_builtin_macros/src/lib.rs');
 const source=state.sources.get(path);if(source)return freezeMacroTree({...source});
 return formatRegisteredInputSource(inputs,proof,path);
}
