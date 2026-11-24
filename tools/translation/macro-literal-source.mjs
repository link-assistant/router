// Opt-in literal syntax only. Private expansion issuers, not this bounded
// recognizer, associate an accepted interval with a genuine macro occurrence.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const sourceInitial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const parsePin=sourceInitial?Object.getOwnPropertyDescriptor(JSON,'parse'):null;
const initial=!!(sourceInitial&&parsePin&&Object.hasOwn(parsePin,'value')&&typeof parsePin.value==='function'&&!types.isProxy(parsePin.value)&&originalCapturedFunctionSource(parsePin.value)==='function parse() { [native code] }');
const issued=initial?new WeakMap():null;
const fail=message=>throwOriginalCapturedTypeError('Original macro literal: '+message);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');const actual=Object.getOwnPropertyDescriptor(JSON,'parse');if(!actual||!Object.hasOwn(actual,'value')||actual.value!==parsePin.value||actual.enumerable!==parsePin.enumerable||actual.writable!==parsePin.writable||actual.configurable!==parsePin.configurable)fail('original source operations changed');}
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
const inputs=[
 {manifest:'./source-profiles/declarative/manifest.json',manifestSha256:'f3192260b3efe0ed8cdd1c9318d1b61918029f48ff87867fd6561d27fed6645f',field:'standard',path:'compiler/rustc_parse/src/parser/nonterminal.rs'},
 {manifest:'./source-profiles/format-constructors/manifest.json',manifestSha256:'c499a8b3871286c18ec6ce5db7d49895ff00df2fce462baeb97f865391c849f0',field:'sources',path:'compiler/rustc_parse/src/parser/expr.rs'},
 {manifest:'./source-profiles/clap-concat/manifest.json',manifestSha256:'a4964c33a27f51b6dc54713d44838b0d1b5d987251f485500e8a36424fd131e5',field:'sources',path:'compiler/rustc_ast/src/token.rs'},
];
function wellFormed(source){for(let at=0;at<source.length;at++){const first=source.charCodeAt(at);if(first>=0xd800&&first<=0xdbff){const next=source.charCodeAt(++at);if(!(next>=0xdc00&&next<=0xdfff))return false;}else if(first>=0xdc00&&first<=0xdfff)return false;}return true;}
function originals(){
 guard();const result=[];
 for(const input of inputs){
  const url=new URL(input.manifest,import.meta.url),bytes=readFileSync(url);guard();if(hash(bytes)!==input.manifestSha256)fail('complete source inventory changed');
  const text=bytes.toString('utf8');guard();if(typeof text!=='string'||text.length>256000||!wellFormed(text))fail('decoded manifest requires bounded well-formed primitive text');if(hash(text)!==input.manifestSha256)fail('decoded manifest text differs from original bytes');guard();const manifest=JSON.parse(text);guard();
  const rows=manifest[input.field].filter(row=>(row.path??row.sourcePath)===input.path);if(rows.length!==1)fail('complete parser source missing');const pin=rows[0],packed=readFileSync(new URL(pin.archive,url));guard();if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete parser archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:256000});guard();if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete parser source changed');const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);guard();if(typeof source!=='string'||source.length>256000||!wellFormed(source))fail('decoded source requires bounded well-formed primitive text');if(hash(source)!==pin.sha256)fail('decoded source text differs from original bytes');result.push({...pin,path:input.path,manifest:input.manifest,manifestSha256:input.manifestSha256,source});
 }
 guard();return result;
}
function member(origin,name){
 const trees=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000});guard();const found=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){if(nodes[at].text==='fn'&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;if(nodes[end]?.delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end};found.push({path:origin.path,sourceSha256:origin.sha256,name,span,source:origin.source.slice(span.start,span.end),trees:nodes.slice(at,end+1)});}}if(nodes[at].kind==='group')visit(nodes[at].children);}}visit(trees);if(found.length!==1)fail('actual parser member absent or ambiguous: '+name);return found[0];
}
function includes(recipe,...parts){for(const part of parts)if(!recipe.source.includes(part))fail('actual parser branch changed');return recipe;}
export function originalMacroLiteralGrammar(){
 const sources=originals(),nonterminal=sources[0],expr=sources[1],recipes=[
  includes(member(sources[2],'can_begin_literal_maybe_minus'),'Literal(..) | Minus => true','name.is_bool_lit()','MetaVarKind::Literal => true'),member(sources[2],'uninterpolate'),
  includes(member(nonterminal,'nonterminal_may_begin_with'),'NonterminalKind::Literal => token.can_begin_literal_maybe_minus()'),
  includes(member(nonterminal,'parse_nonterminal'),'NonterminalKind::Literal =>','self.collect_tokens_no_attrs(|this| this.parse_literal_maybe_minus())?'),
  includes(member(expr,'parse_literal_maybe_minus'),'self.eat_metavar_seq(MetaVarKind::Literal','let minus_present = self.eat(exp!(Minus))','let (token_lit, span) = self.parse_token_lit()?','ExprKind::Lit(token_lit)','self.mk_unary(UnOp::Neg, expr)'),
  member(expr,'parse_token_lit'),member(expr,'eat_token_lit'),member(expr,'mk_expr_with_attrs'),
 ];
 guard();const value=freezeMacroTree({schema:'original-bounded-literal-grammar-v1',sources,recipes,
  supported:['ordinary cooked strings with basic escapes and ASCII hex escapes','raw r strings with at most sixteen hashes','one non-surrogate UTF-16 scalar char with basic escapes','decimal integer tokens with known primitive suffix','true/false','one preceding minus token'],
  refused:['unsupported numeric bases/floats/suffixes','byte/C strings and byte chars','unicode or continuation escapes','unpaired UTF-16 surrogate input','arbitrary opaque expr as literal','attributes and unsupported literal recovery'],
  parserTypeCheckingProved:false,callerMacroOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false});issued.set(value,true);return value;
}
export function requireOriginalMacroLiteralGrammar(grammar){guard();if(issued.get(grammar)!==true)fail('copied or foreign grammar');const sources=originals();if(sources.length!==grammar.sources.length)fail('source count changed');for(let at=0;at<sources.length;at++)if(sources[at].source!==grammar.sources[at].source||sources[at].sha256!==grammar.sources[at].sha256)fail('complete source changed');return grammar;}
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))fail('own non-proxy syntax required');const descriptor=Object.getOwnPropertyDescriptor(object,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('syntax accessor');return descriptor.value;}
function treeAt(trees,index){const descriptor=Object.getOwnPropertyDescriptor(trees,''+index);if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('dense own literal input required');return descriptor.value;}
function token(tree){if(own(tree,'kind')!=='token')return null;const text=own(tree,'text'),type=own(tree,'type');if(typeof text!=='string'||typeof type!=='string')fail('original scalar token required');return {text,type};}
function cooked(text,quote){
 if(text[0]!==quote||text.at(-1)!==quote||text.length<2)return false;
 const body=text.slice(1,-1);let count=0;
 for(let at=0;at<body.length;at++){const character=body[at];if(character===quote||/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(character))fail('unsupported literal character');if(character==='\\'){const next=body[++at];if(next===undefined)fail('incomplete literal escape');if(next==='x'){if(!/^[0-7][0-9a-fA-F]$/u.test(body.slice(at+1,at+3)))fail('unsupported hex literal escape');at+=2;}else if(!['\\','"',"'",'n','r','t','0'].includes(next))fail('unsupported literal escape');}count++;}
 if(quote==="'"&&count!==1)fail('one complete character literal required');return true;
}
function literal(token_){
 const {text,type}=token_;if(/[\ud800-\udfff]/u.test(text))fail('unsupported literal scalar');
 if(text==='true'||text==='false')return 'bool';
 if(type==='number'){if(!/^[0-9][0-9_]*(?:(?:u|i)(?:8|16|32|64|128|size))?$/u.test(text))fail('unsupported numeric literal syntax');return 'integer';}
 if(type==='string'){
  if(cooked(text,'"'))return 'string';if(cooked(text,"'"))return 'char';
  const raw=/^r(#{0,16})"([\s\S]*)"\1$/u.exec(text);if(raw){if(/[\r\ud800-\udfff]/u.test(raw[2]))fail('unsupported raw literal character');return 'raw-string';}
  fail('unsupported string/character literal syntax');
 }
 // A lexer char token is a lifetime rather than a closed char literal.
 if(type==='char')return null;
 if(/^(?:b|c|br|cr)$/u.test(text))return 'possible-prefixed-literal';return null;
}
export function originalMacroLiteralEnd(grammar,trees,start,depth=0){
 requireOriginalMacroLiteralGrammar(grammar);if(typeof depth!=='number'||depth%1!==0||depth<0||depth>32)fail('literal forwarding depth bound');if(!Array.isArray(trees)||types.isProxy(trees)||(typeof start!=='number'||start%1!==0)||start<0||start>trees.length||trees.length>32000)fail('bounded original literal interval required');if(Object.getPrototypeOf(trees)!==Array.prototype||Reflect.ownKeys(trees).length!==trees.length+1)fail('ordinary dense original interval required');for(let index=0;index<trees.length;index++)treeAt(trees,index);if(start===trees.length)return null;
 let at=start,tree=treeAt(trees,at),first=token(tree),negative=false;
 if(own(tree,'kind')==='fragment'){const fragment=own(tree,'fragment');if(fragment==='literal')return {end:at+1,opaque:true,trees:[tree]};if(['ident','lifetime','tt'].includes(fragment)){const forwarded=own(tree,'trees');if(!Array.isArray(forwarded)||types.isProxy(forwarded)||forwarded.length!==1)fail('unsupported transparent literal forwarding');const parsed=originalMacroLiteralEnd(grammar,forwarded,0,depth+1);return parsed?.end===1?{end:at+1,transparent:true,trees:[tree],forwarded:parsed}:null;}fail('unsupported opaque fragment as literal');}
 if(['+','++','--'].includes(first?.text))fail('unsupported compound or plus literal syntax');
 if(first?.text==='-'){negative=true;at++;if(at===trees.length)fail('minus requires a complete literal');tree=treeAt(trees,at);first=token(tree);if(!first)fail('minus requires a direct literal');}
 if(!first)return null;const kind=literal(first);
 if(kind==='possible-prefixed-literal'){if(at+1<trees.length){const next=token(treeAt(trees,at+1));if(next?.type==='string'&&own(own(tree,'span'),'end')===own(own(treeAt(trees,at+1),'span'),'start'))fail('unsupported prefixed literal syntax');}if(negative)fail('minus requires a literal');return null;}
 if(kind===null&&first.type==='char'&&(first.text==="'"||first.text.endsWith("'")||at+1<trees.length&&token(treeAt(trees,at+1))?.text==="'"&&own(own(tree,'span'),'end')===own(own(treeAt(trees,at+1),'span'),'start')))fail('unsupported character literal syntax');
 if(kind===null){if(negative)fail('minus requires a literal');return null;}
 if(at+1<trees.length){const nextTree=treeAt(trees,at+1),next=token(nextTree);if(next&&own(own(tree,'span'),'end')===own(own(nextTree,'span'),'start')&&(['ident','number','string'].includes(next.type)||next.text==='.'))fail('unsupported adjacent literal suffix or token boundary');}
 const selected=trees.slice(start,at+1),begin=own(selected[0],'span'),end=own(tree,'span');return {end:at+1,kind,negative,trees:selected,span:{start:own(begin,'start'),end:own(end,'end')},grammarSource:grammar.sources.map(source=>({path:source.path,sha256:source.sha256})),inputOccurrencePrivatelyAssociated:false};
}
