// Source-owned Rust concat selected literal route. A sealed expansion is not
// caller macro resolution, generated trait execution or whole-library parity.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalMacroInvocation} from './macro-token-trees.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('./source-profiles/clap-concat/',import.meta.url),bytes=readFileSync(new URL('manifest.json',root)),manifest=freeze(JSON.parse(bytes)),plans=new WeakMap(),proofs=new WeakMap();

function sourcePlan(dependencies) {
  if(!isDeriveDependencyProof(dependencies)||dependencies.rustVersion!==manifest.rustVersion)throw new TypeError('Concat requires the sealed pinned compiler dependency profile');
  if(plans.has(dependencies))return plans.get(dependencies);
  const sources=new Map(),tokens=new Map();
  for(const entry of manifest.sources) {
    const archive=readFileSync(new URL(entry.archive,root));if(archive.length!==entry.archiveBytes||hash(archive)!==entry.archiveSha256)throw new TypeError('Concat original source archive changed: '+entry.path);
    const original=gunzipSync(archive,{maxOutputLength:300000});if(original.length!==entry.bytes||hash(original)!==entry.sha256)throw new TypeError('Concat original source member changed: '+entry.path);
    sources.set(entry.path,{...entry,source:original.toString('utf8')});tokens.set(entry.path,rustTokens(original.toString('utf8')).filter(token=>token.type!=='comment'));
  }
  function rule(path,written,role,count=1) {
    const origin=sources.get(path),actual=tokens.get(path),expected=rustTokens(written).filter(token=>token.type!=='comment'),found=[];
    for(let at=0;at<=actual.length-expected.length;at++)if(expected.every((token,index)=>token.text===actual[at+index].text&&token.type===actual[at+index].type)){const span={start:actual[at].start,end:actual[at+expected.length-1].end};found.push({role,source:path,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end))});}
    if(found.length!==count)throw new TypeError('Concat original source rule is not unique: '+role+' ('+found.length+')');return found;
  }
  function definition(path,name,contains=null) {
    const origin=sources.get(path),actual=tokens.get(path),found=[];
    for(let at=0;at<actual.length;at++)if(actual[at].text==='fn'&&actual[at+1]?.text===name){let open=at+2;while(open<actual.length&&!['{',';'].includes(actual[open].text))open++;if(actual[open]?.text!== '{')continue;let end=open+1,depth=1;while(end<actual.length&&depth){if(actual[end].text==='{')depth++;if(actual[end].text==='}')depth--;end++;}const span={start:actual[at].start,end:actual[end-1].end};if(contains===null||origin.source.slice(span.start,span.end).includes(contains))found.push({source:path,name,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end))});}
    if(found.length!==1)throw new TypeError('Concat original source definition is not unique: '+name+' ('+found.length+')');return found[0];
  }
  const builtin='compiler/rustc_builtin_macros/src/',parser='compiler/rustc_parse/src/parser/expr.rs',expand='compiler/rustc_expand/src/expand.rs',visit='compiler/rustc_ast/src/visit.rs',literal='compiler/rustc_ast/src/util/literal.rs',build='compiler/rustc_expand/src/build.rs';
  const rules=[
    ...rule(builtin+'lib.rs','concat: concat::expand_concat,','original-builtin-registration'),
    ...rule('library/core/src/macros/mod.rs','#[rustc_builtin_macro] #[rustc_diagnostic_item = "macro_concat"] #[macro_export] macro_rules! concat { ($($e:expr),* $(,)?) => {{ }}; }','original-core-builtin-owner'),
    ...rule(parser,'token::Literal(token_lit) => { self.bump(); Some(token_lit) }','selected-token-literal-parser'),
    ...rule(parser,'let expr = self.mk_expr(lo.to(self.prev_token.span), ExprKind::Lit(token_lit));','selected-expression-literal-kind'),
    ...rule(parser,'self.mk_expr_with_attrs(span, kind, AttrVec::new())','empty-input-literal-attributes'),
    ...rule(parser,'P(Expr { kind, span, attrs, id: DUMMY_NODE_ID, tokens: None })','positive-input-expression-schema'),
    ...rule(visit,'ExprKind::Lit(_token) => {}','literal-visitor-has-no-child-invocations'),
    ...rule(expand,'None if node.is_mac_call() => {','only-macro-call-collection-selector',2),
    ...rule(expand,'None => { assign_id!(self, node.node_id_mut(), || node.walk(self)) }','plain-expression-collector-walk'),
    ...rule('compiler/rustc_expand/src/placeholders.rs','ast::ExprKind::MacCall(_) => *expr = *self.remove(expr.id).make_expr(), _ => walk_expr(self, expr),','literal-placeholder-pass-through'),
    ...rule(builtin+'concat.rs','Ok(LitKind::Str(s, _) | LitKind::Float(s, _)) => { accumulator.push_str(s.as_str()); }','selected-string-accumulation'),
    ...rule(builtin+'concat.rs','MacEager::expr(cx.expr_str(sp, Symbol::intern(&accumulator)))','selected-success-expression-sink'),
    ...rule(build,'let lit = token::Lit::new(token::Str, literal::escape_string_symbol(s), None); self.expr(span, ast::ExprKind::Lit(lit))','positive-string-token-output-kind'),
    ...rule(build,'P(ast::Expr { id: ast::DUMMY_NODE_ID, kind, span, attrs: AttrVec::new(), tokens: None })','positive-output-expression-schema'),
    ...rule('compiler/rustc_expand/src/base.rs','expr: P<ast::Expr>,','actual-MacEager-expression-member'),
    ...rule('compiler/rustc_expand/src/base.rs','Box::new(MacEager { $fld: Some(v), ..Default::default() })','actual-MacEager-expression-constructor-template'),
    ...rule('compiler/rustc_expand/src/base.rs','fn make_expr(self: Box<Self>) -> Option<P<ast::Expr>> { self.expr }','actual-MacEager-expression-result'),
  ];
  const definitions=[];
  for(const [path,names]of [[builtin+'concat.rs',['expand_concat']],[builtin+'util.rs',['get_exprs_from_tts','parse_expr']],[parser,['parse_expr','parse_expr_res','parse_expr_assoc_with','parse_expr_assoc_rest_with','parse_expr_prefix','parse_expr_prefix_common','parse_expr_dot_or_call','parse_expr_dot_or_call_with','parse_expr_bottom','parse_expr_lit','parse_opt_token_lit','eat_token_lit','recover_after_dot','mk_expr','mk_expr_with_attrs']],[expand,['fully_expand_fragment','collect_invocations','take_first_attr','visit_node']],[literal,['escape_string_symbol']],[build,['expr_str','expr']]])for(const name of names)definitions.push(definition(path,name));
  definitions.push(definition(literal,'from_token_lit','LitKind::Str(symbol, ast::StrStyle::Cooked)'));
  definitions.push(definition(expand,'visit_expr','self.visit_node(node)'));definitions.push(definition('compiler/rustc_expand/src/placeholders.rs','visit_expr','self.remove(expr.id).make_expr()'));definitions.push(definition(visit,'walk_expr','ExprKind::Lit(_token)'));
  const from=sources.get(literal).source.slice(definitions.find(row=>row.source===literal&&row.name==='from_token_lit').span.start,definitions.find(row=>row.source===literal&&row.name==='from_token_lit').span.end);
  if(!from.includes("if s.contains('\\\\')")||!from.includes('LitKind::Str(symbol, ast::StrStyle::Cooked)'))throw new TypeError('Concat original unescaped string decoder branch changed');
  const plan=freeze({schema:'original-concat-literal-source-plan-v1',dependenciesDigest:dependencies.digest,sourceProfileSha256:hash(bytes),sources:manifest.sources,rules,definitions,outputKind:'ExprKind::Lit(token::Str)',inputEagerExpansion:'empty attrs and literal leaf yield no collected or placeholder invocations',namespaceAuthority:false,generatedImplBehavior:false});plans.set(dependencies,plan);return plan;
}

export function proveConcatLiteralSourceExpansion({dependencies,source}={}) {
  const plan=sourcePlan(dependencies),input=originalMacroInvocation(source);if(input.path.join('::')!=='concat')throw new TypeError('Concat expansion requires its exact unqualified original call; caller binding remains independent');
  const literals=[];let at=0;
  while(at<input.trees.length) {
    const token=input.trees[at++];if(token.kind!=='token'||token.type!=='string'||!/^"[\x20-\x21\x23-\x5b\x5d-\x7e]*"$/u.test(token.text))throw new TypeError('Concat selected input requires unescaped unsuffixed ASCII string literals; other expressions and literal kinds remain unproved');
    literals.push({value:token.text.slice(1,-1),text:token.text,span:token.span});if(literals.length>128)throw new TypeError('Concat literal sequence exceeds its input budget');
    if(at<input.trees.length&&input.trees[at++]?.text!==',')throw new TypeError('Concat original parser requires comma or EOF after each literal');
  }
  const value=literals.map(literal=>literal.value).join('');if(Buffer.byteLength(value)>4096)throw new TypeError('Concat accumulated original literal exceeds its output budget');
  const evidence={schema:'original-concat-literal-expansion-v1',dependenciesDigest:dependencies.digest,inputSourceSha256:hash(source),input:{path:input.path,literals},plan,meta:{kind:'Expr',attrs:[],tokens:null,expression:{kind:'Lit',token:{kind:'Str',symbol:value,suffix:null}}},value,outputToken:JSON.stringify(value),selectedSuccessOutputComplete:true,errorBranchComplete:false,callerMacroOwnerResolved:false,namespaceAuthority:false,generatedImplBehavior:false,obligations:['actual original concat caller and ancestor macro binding must independently resolve','other literal kinds, eager macros and compiler error streams remain independent','generated Args runtime traits and whole-library parity remain unproved']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{dependencies,source});return proof;
}
export const isConcatLiteralSourceExpansion=value=>!!value&&proofs.has(value);
export function assertConcatLiteralSourceExpansion(proof,{dependencies,source}={}) {const state=proofs.get(proof);if(!state||state.dependencies!==dependencies||state.source!==source)throw new TypeError('Unsealed or mismatched concat literal expansion');return proof;}
