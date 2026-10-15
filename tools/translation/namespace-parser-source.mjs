// Pinned original parser/expander/resolver facts. These recipes select no
// caller macro and execute no generated implementation or namespace mutation.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalConditionalAncestorSourcePlan,requireOriginalConditionalAncestorSourcePlan} from './derive-ancestor-attribute-scope.mjs';
const plans=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original namespace parser source: '+message);};
const pins=[
 {path:'compiler/rustc_parse/src/parser/stmt.rs',archive:'namespace-parser/rust-1.89-parser-stmt.rs.gz',bytes:46706,sha256:'debbbbf0071b26bcde707bff1c6fe4e26fd0ba910a6d8b046655d2be7b949300',archiveBytes:10568,archiveSha256:'a2a0220f0206bcc52484a1b32b17a9730260fde8f5fb81e774ad236f41956308'},
 {path:'compiler/rustc_parse/src/parser/item.rs',archive:'builtin-derive-bang/rust-1.89-compiler_rustc_parse_src_parser_item.rs.gz',bytes:138843,sha256:'072e9ef9c2554296643fdb16102462b5d15b8255e39142a9d697e03d6a9240c2',archiveBytes:29991,archiveSha256:'7a825544f645089aa9c3f872e89f40fced2e8c32bb1429b24b8fd046bf6ad659'},
 {path:'compiler/rustc_expand/src/expand.rs',archive:'clap-concat/rust-1.89-expand.rs.gz',bytes:98757,sha256:'ed92b686ced1b4be922f1c3cf57d94093554735830d1270284666711b159ff15',archiveBytes:18987,archiveSha256:'2bde712ee5fc3cb9a4fe9c753074769845a4772398108f3282f8409bc0dc75a5'},
 {path:'compiler/rustc_resolve/src/build_reduced_graph.rs',archive:'derive-ancestor-scope/rust-build-reduced-graph.rs.gz',bytes:65553,sha256:'dca3a2782dc08787fb88cf3a131165b95b02eba5153dcfecc47ad1bf87e03f6c',archiveBytes:14211,archiveSha256:'d88a7702b589027bed50c5d5126be80b2d0410c0210a54f7272c2597a038e2e1'},
 {path:'compiler/rustc_resolve/src/macros.rs',archive:'tool-attributes/rust-resolve-macros-1.89.0.rs.gz',bytes:49779,sha256:'301b413a2fe0c2aaee658165993272a9fa39f4aca6cc22b0ca38d08ef80b405e',archiveBytes:12478,archiveSha256:'f8b07424cafe525fb9ab14238a7c71c2cde9b2d3b52ab6dffb1b1b0224a5a697'},
];
const words=text=>rustTokens(text).filter(token=>token.type!=='comment').map(token=>token.text).join(' ');
function originalFunction(origin,name,selector=null,rootsBySource=new Map()){
 let roots=rootsBySource.get(origin);if(!roots){roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64});rootsBySource.set(origin,roots);}const hits=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){
  if(nodes[at].text==='fn'&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&!(nodes[end].kind==='group'&&nodes[end].delimiter==='{')&&nodes[end].text!==';')end++;
   if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end},source=origin.source.slice(span.start,span.end);if(selector===null||source.includes(selector))hits.push({source:origin.path,sourceSha256:origin.sha256,name,span,original:source,syntax:nodes.slice(at,end+1)});}
  }
  if(nodes[at].kind==='group')visit(nodes[at].children);
 }}visit(roots);if(hits.length!==1)fail('complete callback absent or ambiguous: '+name);return hits[0];
}
function recipe(callback,original,role){const all=words(callback.original),selected=words(original),at=all.indexOf(selected);if(at<0||all.indexOf(selected,at+1)>=0)fail('actual original route differs: '+role);return {callback,original,role};}
export function originalNamespaceParserSourcePlan(){
 const sources=pins.map(pin=>{const packed=readFileSync(new URL('./source-profiles/'+pin.archive,import.meta.url));if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete original archive changed');const raw=gunzipSync(packed,{maxOutputLength:256000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete original source changed');return freeze({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});});
 const [statement,parser,expand,resolver,macros]=sources,rootsBySource=new Map();
 const select=(origin,name,selector=null)=>originalFunction(origin,name,selector,rootsBySource);
 const functions={statement:select(statement,'parse_stmt_mac'),complete:select(expand,'parse_ast_fragment','let mut parser = self.cx.new_parser_from_tts(toks)'),body:select(parser,'parse_fn_body'),parse:select(expand,'parse_ast_fragment','this: &mut Parser'),collect:select(expand,'collect_bang'),blockNeeds:select(resolver,'block_needs_anonymous_module'),block:select(resolver,'visit_block'),define:select(resolver,'define_macro'),stub:select(resolver,'proc_macro_stub'),subnamespace:select(macros,'sub_namespace_match'),compile:select(macros,'compile_macro')};
 const recipes=[
  recipe(functions.statement,'Delimiter::Brace => MacStmtStyle::Braces,','actual original statement macro delimiter classification'),
  recipe(functions.statement,'let kind = if (style == MacStmtStyle::Braces && !matches!(self.token.kind, token::Dot | token::Question)) || matches!(self.token.kind, token::Semi | token::Eof | token::CloseInvisible(InvisibleOrigin::MetaVar(MetaVarKind::Stmt))) { StmtKind::MacCall(P(MacCallStmt { mac, style, attrs, tokens: None })) }','exact Stmts classification; CloseBrace with parens is an expression tail'),
  recipe(functions.complete,'ensure_complete_parse(&parser, path, kind.name(), span);','complete expansion fragment parse before its AST is returned'),
  recipe(functions.body,'self.parse_block_common(self.token.span, BlockCheckMode::Default, None).map(|(attrs, body)| (attrs, Some(body)))?','original function body is one Block'),
  recipe(functions.body,'attrs.extend(inner_attrs);','only original parsed body inner attributes join function attributes'),
  recipe(functions.parse,'AstFragmentKind::Expr => AstFragment::Expr(this.parse_expr()?),','expression-position result remains an expression AST'),
  recipe(functions.parse,'AstFragmentKind::Ty => AstFragment::Ty(this.parse_ty()?),','type-position result remains a type AST'),
  recipe(functions.collect,'self.collect(kind, InvocationKind::Bang { mac, span })','actual original call plus delegated fragment kind'),
  recipe(functions.blockNeeds,'matches!(statement.kind, StmtKind::Item(_) | StmtKind::MacCall(_))','original item and statement-macro bodies require anonymous block module'),
  recipe(functions.block,'let orig_current_module = self.parent_scope.module; let orig_current_macro_rules_scope = self.parent_scope.macro_rules; self.build_reduced_graph_for_block(block); visit::walk_block(self, block); self.parent_scope.module = orig_current_module; self.parent_scope.macro_rules = orig_current_macro_rules_scope;','block-local module/import/textual scopes restore after full walk'),
  recipe(functions.define,'self.r.define(self.r.graph_root, ident, MacroNS, import_binding);','macro_rules macro_export retains global macro binding'),
  recipe(functions.define,'self.r.define(module, ident, MacroNS, (res, vis, span, expansion));','ordinary and procedural stub definitions stay in their actual current module'),
  recipe(functions.stub,'return Some((MacroKind::Attr, fn_ident, item.span));','procedural attribute stub is retained even before later compilation rejection'),
  recipe(functions.compile,'if let Some(builtin_name) = ext.builtin_name { if let Some(builtin_ext_kind) = self.builtin_macros.get(&builtin_name) { ext.kind = builtin_ext_kind.clone(); rule_spans = Vec::new(); }','original builtin replacement branch remains pending without genuine output ownership'),
  recipe(functions.subnamespace,'MacroKind::Bang => SubNS::Bang, MacroKind::Attr | MacroKind::Derive => SubNS::AttrLike,','actual assigned macro kind selects its namespace; unknown generated kinds stay unresolved'),
 ];
 const enclosing=requireOriginalConditionalAncestorSourcePlan(originalConditionalAncestorSourcePlan());
 const value=freeze({schema:'original-namespace-parser-dimension-source-v1',sources,functions,recipes,enclosing,wholeCompilerExecuted:false,callerOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false});plans.add(value);return value;
}
export function requireOriginalNamespaceParserSourcePlan(plan){if(!plans.has(plan))fail('copied or foreign source plan');return plan;}
