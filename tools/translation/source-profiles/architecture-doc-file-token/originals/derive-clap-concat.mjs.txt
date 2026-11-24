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
  const evidence={schema:'original-concat-literal-expansion-v1',dependenciesDigest:dependencies.digest,inputSourceSha256:hash(source),input:{source,path:input.path,literals},plan,meta:{kind:'Expr',attrs:[],tokens:null,expression:{kind:'Lit',token:{kind:'Str',symbol:value,suffix:null}}},value,outputToken:JSON.stringify(value),selectedSuccessOutputComplete:true,errorBranchComplete:false,callerMacroOwnerResolved:false,namespaceAuthority:false,generatedImplBehavior:false,obligations:['actual original concat caller and ancestor macro binding must independently resolve','other literal kinds, eager macros and compiler error streams remain independent','generated Args runtime traits and whole-library parity remain unproved']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{dependencies,source});return proof;
}
export const isConcatLiteralSourceExpansion=value=>!!value&&proofs.has(value);
export function assertConcatLiteralSourceExpansion(proof,{dependencies,source}={}) {const state=proofs.get(proof);if(!state||state.dependencies!==dependencies||state.source!==source)throw new TypeError('Unsealed or mismatched concat literal expansion');return proof;}

// Explicit fresh source-only successor. Existing sealed/default APIs stay intact.
const CURRENT_CONCAT_PROFILE_SHA256='a4964c33a27f51b6dc54713d44838b0d1b5d987251f485500e8a36424fd131e5';
function currentConcatLiteralNativeSources(dependencies) {
  originalNamespaceAttributeExpressionSourceGuard();const bytes=readFileSync(new URL('manifest.json',root));if(hash(bytes)!==CURRENT_CONCAT_PROFILE_SHA256)throw new TypeError('Complete current concat native manifest differs');const manifest=freeze(JSON.parse(bytes));let retainedSourceBytes=bytes.length;
  if(!isDeriveDependencyProof(dependencies)||dependencies.rustVersion!==manifest.rustVersion)throw new TypeError('Concat requires the sealed pinned compiler dependency profile');
  const sources=new Map(),tokens=new Map();
  for(const entry of manifest.sources) {
    const archive=readFileSync(new URL(entry.archive,root));if(archive.length!==entry.archiveBytes||hash(archive)!==entry.archiveSha256)throw new TypeError('Concat original source archive changed: '+entry.path);
    const original=gunzipSync(archive,{maxOutputLength:300000});if(original.length!==entry.bytes||hash(original)!==entry.sha256)throw new TypeError('Concat original source member changed: '+entry.path);
    retainedSourceBytes+=archive.length+original.length;if(retainedSourceBytes>8388608)throw new TypeError('Complete current concat native source bound');const source=original.toString('utf8');let concreteSyntax=null;if(entry.path.endsWith('.rs')){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete current concat native CST inverse differs');concreteSyntax=concrete.meta;}sources.set(entry.path,{...entry,source,concreteSyntax,inverse:source});tokens.set(entry.path,rustTokens(source).filter(token=>token.type!=='comment'));
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
  const plan=freeze({schema:'current-original-concat-literal-native-source-v1',dependenciesDigest:dependencies.digest,sourceProfileSha256:hash(bytes),sources:[...sources.values()],sourceInputs:manifest.sources,retainedSourceBytes,rules,definitions:definitions.map(row=>({...row,original:sources.get(row.source).source.slice(row.span.start,row.span.end)})),outputKind:'ExprKind::Lit(token::Str)',inputEagerExpansion:'empty attrs and literal leaf yield no collected or placeholder invocations',namespaceAuthority:false,generatedImplBehavior:false});rejoinCurrentConcatLiteralNativeSources(plan);return plan;
}

function evaluateCurrentConcatLiteralSource({dependencies,source}={}) {
  const input=originalMacroInvocation(source);if(input.path.join('::')!=='concat')throw new TypeError('Concat expansion requires its exact unqualified original call; caller binding remains independent');
  const literals=[];let at=0;
  while(at<input.trees.length) {
    const token=input.trees[at++];if(token.kind!=='token'||token.type!=='string'||!/^"[\x20-\x21\x23-\x5b\x5d-\x7e]*"$/u.test(token.text))throw new TypeError('Concat selected input requires unescaped unsuffixed ASCII string literals; other expressions and literal kinds remain unproved');
    literals.push({value:token.text.slice(1,-1),text:token.text,span:token.span});if(literals.length>128)throw new TypeError('Concat literal sequence exceeds its input budget');
    if(at<input.trees.length&&input.trees[at++]?.text!==',')throw new TypeError('Concat original parser requires comma or EOF after each literal');
  }
  const value=literals.map(literal=>literal.value).join('');if(Buffer.byteLength(value)>4096)throw new TypeError('Concat accumulated original literal exceeds its output budget');
  const plan=currentConcatLiteralNativeSources(dependencies);
  const evidence={schema:'current-original-concat-literal-source-expansion-v1',dependenciesDigest:dependencies.digest,inputSourceSha256:hash(source),input:{source,path:input.path,literals},plan,meta:{kind:'Expr',attrs:[],tokens:null,expression:{kind:'Lit',token:{kind:'Str',symbol:value,suffix:null}}},value,outputToken:JSON.stringify(value),selectedSuccessOutputComplete:true,errorBranchComplete:false,callerMacroOwnerResolved:false,namespaceAuthority:false,generatedImplBehavior:false,obligations:['actual original concat caller and ancestor macro binding must independently resolve','other literal kinds, eager macros and compiler error streams remain independent','generated Args runtime traits and whole-library parity remain unproved']};
  return freeze({...evidence,currentSourceInputsChecked:true,crossInvocationCache:false});
}

// Fresh source rejoin only, never a caller owner or expansion authority issuer.
function rejoinCurrentConcatLiteralNativeSources(plan){
 originalNamespaceAttributeExpressionSourceGuard();const current=readFileSync(new URL('manifest.json',root));if(hash(current)!==CURRENT_CONCAT_PROFILE_SHA256||plan.sourceProfileSha256!==CURRENT_CONCAT_PROFILE_SHA256)throw new TypeError('Current concat native manifest changed');const profile=JSON.parse(current);if(profile.sources.length!==plan.sources.length)throw new TypeError('Current concat native input census changed');
 for(const pin of profile.sources){const archive=readFileSync(new URL(pin.archive,root));if(archive.length!==pin.archiveBytes||hash(archive)!==pin.archiveSha256)throw new TypeError('Current concat native archive changed');const raw=gunzipSync(archive,{maxOutputLength:300000}),row=plan.sources.find(row=>row.path===pin.path);if(!row||raw.length!==pin.bytes||hash(raw)!==pin.sha256||raw.toString('utf8')!==row.source)throw new TypeError('Current whole concat native source changed');}originalNamespaceAttributeExpressionSourceGuard();
}

/** Conditional literal output proposal over an actual original attribute call. */
export function proposeOriginalAttributeConcatLiteralSource(request){
 if(!request||typeof request!=='object'||types.isProxy(request)||Object.getPrototypeOf(request)!==Object.prototype)throw new TypeError('Original attribute concat requires ordinary request data');const names=['dependencies','input','position','token','options'],fields=Object.getOwnPropertyDescriptors(request);if(Reflect.ownKeys(fields).length!==names.length||names.some(name=>!fields[name]||!Object.hasOwn(fields[name],'value')))throw new TypeError('Original attribute concat requires complete own source inputs');const {dependencies,input,position,token,options}=Object.fromEntries(names.map(name=>[name,fields[name].value]));
 const attribute=originalNamespaceAttributeExpressionFacts(token,options),invocation=originalNamespaceAttributeInvocationInputFacts(input,position,token,options);if(attribute.source.attributeName!=='doc')throw new TypeError('Actual original documentation argument required');const before=transportConcreteSyntaxMeta(attribute.concreteSyntax).source,start=invocation.invocationSpan.start,end=invocation.invocationSpan.end;if(before.slice(start,end)!==invocation.original)throw new TypeError('Complete original concat invocation differs');let expansion,after,history,substitution,outputConcrete;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:derive-exact-original-attribute-concat-literal-output-and-CST-substitution',apply:()=>{
   expansion=evaluateCurrentConcatLiteralSource({dependencies,source:invocation.original});outputConcrete=transportConcreteSyntaxSource(expansion.outputToken,{language:'Rust'});if(transportConcreteSyntaxMeta(outputConcrete.meta).source!==expansion.outputToken)throw new TypeError('Complete concat output literal CST differs');const original=transportConcreteSyntaxSource(before,{language:'Rust'}),changed=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'rust:replace-only-complete-original-attribute-value-invocation',edits:[{span:[start,end],expected:invocation.original,replacement:expansion.outputToken}]}],repositoryRules:[]});substitution=changed.trace;after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)).source;return after;
  }}]},
  {phase:'repository',rules:[{id:'router:retain-whole-physical-inverse-and-unresolved-doc-macro-owner',apply:()=>{
   history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before)throw new TypeError('Complete original concat physical inverse differs');return {schema:'original-attribute-concat-literal-source-proposal-v1',sourcePath:attribute.source.file,sourceDomain:'original-attribute-expression',attributeSource:attribute.source,position,input,token,originalInvocation:invocation.original,invocationSpan:{start,end},expansion,outputConcreteSyntax:outputConcrete.meta,before,after,history,substitution,callerOwnerResolved:false,attributeOwnerResolved:false,argumentMacroOwnerResolved:false,nativeVisitorConfinementQualified:false,globalExportsClosed:false,originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,sourceAuthority:false,semanticAuthority:false,typeAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,crossInvocationCache:false,receivingExecuted:false};
  }}]},
 ]).run(null);rejoinCurrentConcatLiteralNativeSources(expansion.plan);originalNamespaceAttributeInvocationInputFacts(input,position,token,options);originalNamespaceAttributeExpressionFacts(token,options);return {...run.value,ruleTrace:run.trace};
}

import {types} from 'node:util';
import {originalNamespaceAttributeExpressionFacts,originalNamespaceAttributeExpressionSourceGuard,originalNamespaceAttributeInvocationInputFacts} from './original-namespace-parser.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';

// Exact original architecture document source domain; default APIs stay intact.

function originalArchitectureDocumentRawLiteral(value){
 if(typeof value!=='string'||Buffer.byteLength(value)>32768||/[\r\u0000]|\p{Surrogate}/u.test(value))throw new TypeError('Bounded LF scalar architecture document required');for(let size=0;size<=16;size++){const delimiter='#'.repeat(size);if(!value.includes('"'+delimiter))return 'r'+delimiter+'"'+value+'"'+delimiter;}throw new TypeError('Original architecture document raw literal delimiter bound');
}
function deriveOriginalArchitectureDocumentInclude({attribute,invocation}){
 if(attribute.source.file!=='crates/core_arch/src/mod.rs')throw new TypeError('Exact original architecture source file required');const selected=originalMacroInvocation(invocation.original);if(selected.path.length!==1||selected.path[0]!=='include_str'||selected.trees.length!==1||selected.trees[0].kind!=='token'||selected.trees[0].type!=='string'||selected.trees[0].text!=='"core_arch_docs.md"')throw new TypeError('Exact original architecture include-str argument required');
 const originals=originalFreshPrimitiveNamespaceSourcesWithDocumentation(),module=originals.get(attribute.source.file),document=originals.get('crates/core_arch/src/core_arch_docs.md'),source=transportConcreteSyntaxMeta(attribute.concreteSyntax).source;if(!module||!document||module.source!==source||module.sha256!==attribute.source.sourceSha256||document.assetRole!=='documentation-source')throw new TypeError('Whole original architecture source/document archive join differs');const outputToken=originalArchitectureDocumentRawLiteral(document.source),nativeFrame=captureOriginalIncludeStrNativeFrame();return {schema:'original-architecture-document-include-source-candidate-v1',input:{source:invocation.original,path:selected.path,documentPath:document.path},value:document.source,outputToken,nativeFrame,sourceInputs:[module,document],wholeOriginalPhysicalSourceJoined:true,wholeOriginalDocumentJoined:true,callerMacroOwnerResolved:false,sourceFileContextQualified:false,nativeFileLoaderQualified:false,nativePathQualified:false,nativeVisitorConfinementQualified:false,globalExportsClosed:false,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};
}
function rejoinOriginalArchitectureDocumentInclude(expansion){
 const current=originalFreshPrimitiveNamespaceSourcesWithDocumentation();for(const input of expansion.sourceInputs){const source=current.get(input.path);if(!source||source.source!==input.source||source.sha256!==input.sha256||source.gitBlobSha!==input.gitBlobSha)throw new TypeError('Complete original architecture source/document changed');}const native=originalIncludeStrNativeSourceFacts(expansion.nativeFrame.token),before=expansion.nativeFrame.facts;if(native.profileSha256!==before.profileSha256||native.sources.length!==before.sources.length||native.sources.some(row=>!before.sources.some(prior=>prior.path===row.path&&prior.source===row.source&&prior.sourceSha256===row.sourceSha256)))throw new TypeError('Complete current include-str native inputs changed');
}

export function proposeOriginalArchitectureDocIncludeSource(request){
 if(!request||typeof request!=='object'||types.isProxy(request)||Object.getPrototypeOf(request)!==Object.prototype)throw new TypeError('Original architecture include-str requires ordinary request data');const names=['input','position','token','options'],fields=Object.getOwnPropertyDescriptors(request);if(Reflect.ownKeys(fields).length!==names.length||names.some(name=>!fields[name]||!Object.hasOwn(fields[name],'value')))throw new TypeError('Original architecture include-str requires complete own source inputs');const {input,position,token,options}=Object.fromEntries(names.map(name=>[name,fields[name].value]));
 const attribute=originalNamespaceAttributeExpressionFacts(token,options),invocation=originalNamespaceAttributeInvocationInputFacts(input,position,token,options);if(attribute.source.attributeName!=='doc')throw new TypeError('Actual original documentation argument required');const before=transportConcreteSyntaxMeta(attribute.concreteSyntax).source,start=invocation.invocationSpan.start,end=invocation.invocationSpan.end;if(before.slice(start,end)!==invocation.original)throw new TypeError('Complete original architecture include invocation differs');let expansion,after,history,substitution,outputConcrete;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:derive-exact-original-architecture-document-literal-and-CST-substitution',apply:()=>{
   expansion=deriveOriginalArchitectureDocumentInclude({attribute,invocation});outputConcrete=transportConcreteSyntaxSource(expansion.outputToken,{language:'Rust'});if(transportConcreteSyntaxMeta(outputConcrete.meta).source!==expansion.outputToken)throw new TypeError('Complete architecture document literal CST differs');const original=transportConcreteSyntaxSource(before,{language:'Rust'}),changed=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'rust:replace-only-complete-original-attribute-value-invocation',edits:[{span:[start,end],expected:invocation.original,replacement:expansion.outputToken}]}],repositoryRules:[]});substitution=changed.trace;after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)).source;return after;
  }}]},
  {phase:'repository',rules:[{id:'router:retain-whole-architecture-document-inverse-and-unresolved-macro-owner',apply:()=>{
   history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before)throw new TypeError('Complete original architecture document physical inverse differs');return {schema:'original-architecture-document-include-source-proposal-v1',sourcePath:attribute.source.file,sourceDomain:'original-pinned-architecture-doc-expression',attributeSource:attribute.source,position,input,token,originalInvocation:invocation.original,invocationSpan:{start,end},expansion,outputConcreteSyntax:outputConcrete.meta,before,after,history,substitution,callerOwnerResolved:false,actualRustNamespacePath:null,configurationSelected:false,sourceFileContextQualified:false,nativeFileLoaderQualified:false,nativePathQualified:false,attributeOwnerResolved:false,argumentMacroOwnerResolved:false,nativeVisitorConfinementQualified:false,globalExportsClosed:false,originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,sourceAuthority:false,semanticAuthority:false,typeAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,crossInvocationCache:false,receivingExecuted:false};
  }}]},
 ]).run(null);rejoinOriginalArchitectureDocumentInclude(expansion);originalNamespaceAttributeInvocationInputFacts(input,position,token,options);originalNamespaceAttributeExpressionFacts(token,options);return {...run.value,ruleTrace:run.trace};
}
import {originalFreshPrimitiveNamespaceSourcesWithDocumentation} from './extensions/primitive-namespace-sources.mjs';
import {captureOriginalIncludeStrNativeFrame,originalIncludeStrNativeSourceFacts} from './include-str-native-source.mjs';
