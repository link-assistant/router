// Pinned original parser/expander/resolver facts. These recipes select no
// caller macro and execute no generated implementation or namespace mutation.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import * as containmentNative from './original-json-intrinsics.mjs';
import {freshOriginalConditionalAncestorSourcePlan as originalConditionalAncestorSourcePlan,requireOriginalConditionalAncestorSourcePlan} from './derive-ancestor-attribute-scope.mjs';
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
export function originalNamespaceParserSourcePlan(){return originalNamespaceParserSourcePlanForOperation();}
export function requireOriginalNamespaceParserSourcePlan(plan){if(!plans.has(plan))fail('copied or foreign source plan');currentOriginalNamespaceParserSourceInputs();return plan;}

//603: a separate, lazy source-only containment lane. No old plan/cache/body changes.
let generatedContainmentPlans=null;
const generatedContainmentPins=[{"path":"compiler/rustc_expand/src/placeholders.rs","archive":"clap-concat/rust-1.89-placeholders.rs.gz","bytes":14265,"sha256":"48ce8d37362a28e6d70e60818612bd00c186311116e86fc8ebe1b6a857a02970","archiveBytes":2862,"archiveSha256":"6ec0a69046c2294d39e7faaea9ae931874b205d8ff33782cd821eac4104264a2"},{"path":"compiler/rustc_ast/src/visit.rs","archive":"clap-concat/rust-1.89-visit.rs.gz","bytes":81117,"sha256":"2cde31625ec47f907d6a314ae06e75711245ca79f8dc1f5bf5b44768c6dc87fd","archiveBytes":12455,"archiveSha256":"adad0653d6db72b3c9793d70299fca148b7a22ba8ec88cec6e0ea6a477628bee"},{"path":"compiler/rustc_ast/src/mut_visit.rs","archive":"clap-concat/rust-1.89-mut-visit.rs.gz","bytes":5820,"sha256":"09e1d678272559cf5c3844cfd8e930d1cea91bd1777cbe0a3a09cc7490549766","archiveBytes":1931,"archiveSha256":"3e22fcdaeae9221c0edaf1bd4839f7afb2ed4664f0502426a83ea57d4f1507ba"}];
const generatedContainmentCallbacks=[{"path":"compiler/rustc_expand/src/expand.rs","name":"collect","selector":null,"completeSha256":"0d7728703e847cfb49c624e8de679134d626f2e8f37d4643da2715543ff1bcdb"},{"path":"compiler/rustc_expand/src/expand.rs","name":"flat_map_node","selector":null,"completeSha256":"83f489ca5a1a7c6322c07ad461114791c7df9bba75115973895dfbc59f0a89c2"},{"path":"compiler/rustc_expand/src/expand.rs","name":"fully_expand_fragment","selector":null,"completeSha256":"fb5dd97df3b32e926be1f52c76469572f2d15d33072c85e6459df3985ee40db5"},{"path":"compiler/rustc_expand/src/expand.rs","name":"parse_ast_fragment","selector":"this: &mut Parser","completeSha256":"deddc5d6afb8351550895e47602a7a7c21062b97cf45641d86bed3cb84b9048d"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"add","selector":null,"completeSha256":"6bcf5d1182cc7efa4d1a447ff5238287c2f110f8da60989f3899431a1e2e331c"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"flat_map_assoc_item","selector":null,"completeSha256":"26ad2018037597de2e3eb187d7a2a81236de9cdfb93d17fd0f243aa7d481b707"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"flat_map_stmt","selector":null,"completeSha256":"ef3727d8e03ee1b4b8125a96c59606e27361fb399ea0665f64356dd9576ce872"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"flat_map_item","selector":null,"completeSha256":"f6634d54e959bd11347ef62070a23caadbb237e2309a441ab7075b08102f227e"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"visit_expr","selector":null,"completeSha256":"9e62c02ec25e737a83a14d012ced89fc77893060be7e6b005c894bd14079c904"},{"path":"compiler/rustc_expand/src/placeholders.rs","name":"visit_ty","selector":null,"completeSha256":"34c01aa49223a42a9badfa8a592e7c936f0c37d85f70bb97068df7eb9a33277d"},{"path":"compiler/rustc_ast/src/mut_visit.rs","name":"walk_flat_map_stmt_kind","selector":null,"completeSha256":"3a0a83bd955475ca89818537f0056253eb5c66ba64b4bd302e36b6ddf32db30b"},{"path":"compiler/rustc_ast/src/visit.rs","name":"walk","selector":"ItemKind::Impl","completeSha256":"b2361a0f28ca9d0936a1c0fac951e21aa53108e1e83a789dbbdba735ca1fac8f"},{"path":"compiler/rustc_ast/src/visit.rs","name":"walk","selector":"AssocItemKind::Fn","completeSha256":"a96d49d23055f7ba8c865f4fe19f021b2a4d4ca2cf8f0858ce5af20e641358cc"},{"path":"compiler/rustc_ast/src/visit.rs","name":"walk_fn","selector":null,"completeSha256":"a34b1df21367675a677b929cba3badada45c48c01fca23f849c520233ae15fe5"},{"path":"compiler/rustc_ast/src/visit.rs","name":"walk_block","selector":null,"completeSha256":"0bb56cb4616fa5adba20159291592941a707404c2186a6566bdfcc33faafc6b1"},{"path":"compiler/rustc_parse/src/parser/item.rs","name":"parse_impl_item","selector":null,"completeSha256":"bcf9fc4042af73041cc536df8a7a8ddc1b51fc5feeb680917ebe0bab87c44cd4"},{"path":"compiler/rustc_parse/src/parser/item.rs","name":"parse_assoc_item","selector":null,"completeSha256":"c6e3f86068101fbf97535f2ef097c3c45202bb06f8581c3f063ebdf52af6c1ba"},{"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","name":"visit_assoc_item","selector":null,"completeSha256":"7061a864dac65d8389f8dafe09e63496f51d3d417d1d08d45db7c1e02231fcf4"},{"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","name":"visit_block","selector":null,"completeSha256":"6b1be3f9c42285c2b2119065cb126fb3e0b573c618b01005e45a278395d7df87"},{"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","name":"build_reduced_graph_for_block","selector":null,"completeSha256":"02659ca749ec83e285bbc76de23c86f897d86fd1b8ce733febf656377c8cf6c9"},{"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","name":"define_macro","selector":null,"completeSha256":"67bc40d8aa68adfb49dca0ac197ad89a96918682316fd9fd75f9cae7de8df4e5"},{"path":"compiler/rustc_resolve/src/macros.rs","name":"visit_ast_fragment_with_placeholders","selector":null,"completeSha256":"0af07d50b01cc8013dac8bd320257a4887d6f8d2f1a87b81a6a3b29e8982e382"}];
function generatedContainmentData(){
 const native=containmentNative;
 const guard=()=>{if(!native.originalStaticSourceIntrinsicsUnchanged()||!native.originalDataFreezeIntrinsicsUnchanged())fail('generated containment native source operations changed');};
 guard();const original=originalNamespaceParserSourcePlan();requireOriginalNamespaceParserSourcePlan(original);guard();
 const additional=generatedContainmentPins.map(pin=>{guard();const packed=readFileSync(new URL('./source-profiles/'+pin.archive,import.meta.url));if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete containment archive changed');const raw=gunzipSync(packed,{maxOutputLength:256000});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete containment original changed');const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);guard();return freeze({...pin,source});});
 const sources=[...original.sources,...additional],rootsBySource=new Map(),callbacks=[];
 for(const pin of generatedContainmentCallbacks){const origins=sources.filter(source=>source.path===pin.path);if(origins.length!==1)fail('whole containment source absent or ambiguous');const callback=originalFunction(origins[0],pin.name,pin.selector,rootsBySource);if(hash(callback.original)!==pin.completeSha256)fail('complete containment callback changed: '+pin.name);callbacks.push(callback);guard();}
 const value=freeze({schema:'original-generated-item-containment-source-v1',original,sources,callbacks,completePinnedCallbacks:true,
  branches:{items:'actual Item placeholder remains Items',associated:'actual AssocCtxt projects only its same-kind fragment',body:'Impl→AssocFn→Block→Stmt in place',resolver:'impl names stay under impl keys; blocks restore module and macro_rules scope',macroExport:'explicit graph-root MacroNS escape remains an independent obligation'},
  generatedOwnerScopeComplete:false,rootAttributeRewriteClosed:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false});guard();return {value,guard};
}
export async function originalGeneratedItemContainmentSourcePlan(){
 const {value,guard}=await generatedContainmentData();guard();if(generatedContainmentPlans===null)generatedContainmentPlans=new WeakMap();generatedContainmentPlans.set(value,true);return value;
}
export async function requireOriginalGeneratedItemContainmentSourcePlan(value){
 const {value:current,guard}=await generatedContainmentData();guard();if(generatedContainmentPlans===null||!generatedContainmentPlans.has(value))fail('copied or foreign generated containment source plan');if(value.sources.length!==current.sources.length||value.sources.some((row,index)=>row.path!==current.sources[index].path||row.source!==current.sources[index].source))fail('current complete containment source differs');guard();return value;
}

// Separate synchronous source qualification; the original async API remains async.
export function originalGeneratedItemContainmentSourcePlanSync(){const {value,guard}=generatedContainmentData();guard();return value;}

import {types as namespaceSourceOperationTypes} from 'node:util';
import {originalAncestorAttributeSourceInputsCurrent} from './derive-ancestor-attribute-scope.mjs';

function buildFreshOriginalNamespaceParserSourcePlan(){
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

// Actual current pinned inputs and native operations are checked even for a
// previously issued source receipt. Sharing ends with this synchronous call.
function currentOriginalNamespaceParserSourceInputs(){
 const native=containmentNative;if(!native.originalStaticSourceIntrinsicsUnchanged()||!native.originalDataFreezeIntrinsicsUnchanged())fail('original namespace source operations changed');const enclosing=originalAncestorAttributeSourceInputsCurrent();let retained=enclosing.retainedSourceBytes;
 for(const pin of pins){const packed=readFileSync(new URL('./source-profiles/'+pin.archive,import.meta.url));if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete current namespace parser source archive changed');retained+=pin.archiveBytes+pin.bytes;if(retained>8388608)fail('complete namespace parser and enclosing native input bound');}if(!native.originalStaticSourceIntrinsicsUnchanged()||!native.originalDataFreezeIntrinsicsUnchanged())fail('original namespace source operations changed');return retained;
}
let namespaceParserSourceOperation=null,namespaceParserSourceOperationDepth=0;
function originalNamespaceParserSourcePlanForOperation(){
 currentOriginalNamespaceParserSourceInputs();if(namespaceParserSourceOperation?.plan)return namespaceParserSourceOperation.plan;const plan=buildFreshOriginalNamespaceParserSourcePlan();currentOriginalNamespaceParserSourceInputs();if(namespaceParserSourceOperation)namespaceParserSourceOperation.plan=plan;return plan;
}
export function withOriginalNamespaceParserSourceOperation(operation){
 const types=namespaceSourceOperationTypes;currentOriginalNamespaceParserSourceInputs();if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one ordinary synchronous namespace source operation required');if(namespaceParserSourceOperationDepth>=64)fail('namespace source-operation nesting bound');const prior=namespaceParserSourceOperation,state={plan:null};namespaceParserSourceOperation=state;namespaceParserSourceOperationDepth++;
 try{const result=operation();if(types.isPromise(result)||result!==null&&['object','function'].includes(typeof result)&&types.isProxy(result))fail('namespace source operation must finish synchronously');if(result!==null&&['object','function'].includes(typeof result)){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('namespace source operation cannot return an own thenable/accessor');}return result;}
 finally{try{if(state.plan)requireOriginalNamespaceParserSourcePlan(state.plan);else currentOriginalNamespaceParserSourceInputs();}finally{state.plan=null;namespaceParserSourceOperation=prior;namespaceParserSourceOperationDepth--;}}
}
