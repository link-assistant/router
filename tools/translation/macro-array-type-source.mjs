// Original array/slice type syntax, never a const evaluator or layout proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
const root=new URL('./source-profiles/macro-array-types/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',root)),hash=value=>createHash('sha256').update(value).digest('hex');
if(hash(profileBytes)!=='a1616065f1bd63ca03a93a36c44964d66bcb51df4fb82f1c8634aaa23924c7f3')throw new TypeError('Original macro array type source profile changed');
const profile=JSON.parse(profileBytes),issued=new WeakSet();let cached;
const syntax=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join(' ');
export function originalMacroArrayTypeInput(path,packed){
 const pins=profile.sources.filter(row=>row.path===path);if(pins.length!==1||!Buffer.isBuffer(packed))throw new TypeError('Original array type requires one full retained source archive');const pin=pins[0];
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)throw new TypeError('Original array type archive changed');const raw=gunzipSync(packed,{maxOutputLength:300000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)throw new TypeError('Original array type source changed');
 return freezeMacroTree({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),namespaceAuthority:false,layoutAuthority:false,runtimeAuthority:false});
}
export function originalMacroArrayTypeRules(){
 if(cached)return cached;const sources=new Map(profile.sources.map(pin=>{const url=new URL(pin.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))throw new TypeError('Original array type archive escapes profile');return [pin.path,originalMacroArrayTypeInput(pin.path,readFileSync(url))];})),roots=new Map(),recipes=[];
 function recipe(path,name,kind='fn'){
  const source=sources.get(path);if(!source)throw new TypeError('Original array type member missing');if(!roots.has(path))roots.set(path,originalMacroTrees(source.source,{maxBytes:256000,maxTokens:32000}));const found=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){if(nodes[at].text===kind&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;if(nodes[end]?.delimiter==='{')found.push(nodes.slice(at,end+1));}if(nodes[at].kind==='group')visit(nodes[at].children);}}visit(roots.get(path));if(found.length!==1)throw new TypeError('Original array type recipe absent or ambiguous: '+name);
  const nodes=found[0],span={start:nodes[0].span.start,end:nodes.at(-1).span.end},text=source.source.slice(span.start,span.end);recipes.push({sourcePath:path,sourceSha256:source.sha256,name,kind,span,original:text,sha256:hash(text),syntax:nodes});return text;
 }
 const ty='compiler/rustc_parse/src/parser/ty.rs',expr='compiler/rustc_parse/src/parser/expr.rs';
 function contains(source,...fragments){const actual=syntax(source);for(const fragment of fragments)if(!actual.includes(syntax(fragment)))throw new TypeError('Original array type branch changed');}
 contains(recipe(ty,'parse_ty_common'),'else if self.eat(exp!(OpenBracket)) { self.parse_array_or_slice_ty()? }');
 contains(recipe(ty,'parse_array_or_slice_ty'),'let elt_ty = match self.parse_ty()','Err(err) => return Err(err)','let ty = if self.eat(exp!(Semi))','let mut length = self.parse_expr_anon_const()?','self.expect(exp!(CloseBracket))','TyKind::Array(elt_ty, length)','TyKind::Slice(elt_ty)','Ok(ty)');
 contains(recipe(expr,'parse_expr_anon_const'),'self.parse_expr().map(|value| AnonConst { id: DUMMY_NODE_ID, value })');
 contains(recipe(expr,'parse_expr'),'self.parse_expr_res(Restrictions::empty(), attrs).map(|res| res.0)');
 contains(recipe(expr,'parse_expr_lit'),'Some((token_lit, _))','ExprKind::Lit(token_lit)');
 contains(recipe(expr,'parse_opt_token_lit'),'self.eat_token_lit().map(|token_lit| (token_lit, span))');
 contains(recipe(expr,'eat_token_lit'),'token::Literal(token_lit) => { self.bump(); Some(token_lit) }');
 recipe('compiler/rustc_ast/src/ast.rs','AnonConst','struct');recipe('compiler/rustc_ast/src/ast.rs','TyKind','enum');
 const evidence={schema:profile.schema,rustVersion:profile.rustVersion,sourceProfileSha256:hash(profileBytes),sources:profile.sources,recipes,positiveGrammar:{element:'existing bounded type grammar, including recursively checked arrays/slices',slice:'[T]',array:'[T; unsuffixed decimal integer token]',lengthLiteral:'one original token,1..20ASCII digits; no evaluation',excluded:['unknown const path','block/macro/call/arithmetic length','negative or suffixed/float/base-prefixed integer','owned type layout','const evaluation','parser recovery']},fullParserExecuted:false,layoutAuthority:false,constEvaluationAuthority:false,namespaceAuthority:false,runtimeAuthority:false};cached=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});issued.add(cached);return cached;
}
export function assertOriginalMacroArrayTypeRules(value){if(!issued.has(value))throw new TypeError('Array type syntax requires genuine original source rules');return value;}
export function originalMacroArrayLiteralLength(rules,node){
 assertOriginalMacroArrayTypeRules(rules);if(!node||typeof node!=='object')return false;const data=name=>{const descriptor=Object.getOwnPropertyDescriptor(node,name);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;};
 return data('kind')==='token'&&data('type')==='number'&&typeof data('text')==='string'&&/^(?:0|[1-9][0-9]{0,19})$/u.test(data('text'));
}
