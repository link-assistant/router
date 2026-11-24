// Independent complete native source DATA cases. All remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureOriginalAttributeExpressionConfinementSource,originalAttributeExpressionConfinementSourceFacts,captureOriginalAttributeExpressionConfinementFrame} from '../attribute-expression-confinement-source.mjs';
import {captureOriginalTextualMacroLookupSource} from '../textual-macro-lookup-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareAttributeExpressionConfinementSources} from '../prepare-attribute-expression-confinement-sources.mjs';
const limits={timeout:60000};
test('all fourteen native parser and collector callbacks retain full current inputs and two complete receiver containers',limits,()=>{
 const frame=captureOriginalAttributeExpressionConfinementFrame(),result=frame.facts;assert.equal(Object.keys(result.callbacks).length,14);assert.equal(result.sources.length,8);assert.equal(result.containers.length,2);assert.ok(result.retainedSourceBytes>0&&result.retainedSourceBytes<=8388608);assert.ok(result.nativeInventoryCells>0&&result.nativeInventoryCells<=200000);
 for(const row of result.sources.filter(row=>row.kind==='Rust'))assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);for(const row of Object.values(result.callbacks)){const source=result.sources.find(source=>source.path===row.path);assert.equal(source.source.slice(row.span.start,row.span.end),row.original);}
 for(const row of result.containers){const source=result.sources.find(source=>source.path===row.path);assert.equal(source.source.slice(...row.span),row.original);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.original);assert.equal(row.inverse,row.original);}assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
});
test('the actual equality field walker expression collector kind and complete fragment parser chain stay explicit',limits,()=>{
 const result=originalAttributeExpressionConfinementSourceFacts(captureOriginalAttributeExpressionConfinementSource()),rows=result.callbacks;
 assert.ok(rows.parseAttributeArgs.original.includes('expr: self.parse_expr_force_collect()?'));assert.ok(rows.walkAttributeArgsTemplate.original.includes('AttrArgs::Eq { eq_span, expr }'));assert.ok(rows.walkAttributeArgsTemplate.original.includes('vis.visit_expr(expr)'));assert.ok(rows.collectExpression.original.includes('self.visit_node(node)'));assert.ok(rows.collectNode.original.includes('self.collect_bang(mac, Node::KIND)'));
 assert.ok(rows.parseFragmentFunction.original.includes('AstFragmentKind::Expr => AstFragment::Expr(this.parse_expr()?)'));assert.ok(rows.parseFragmentMethod.original.includes('ensure_complete_parse'));assert.ok(rows.ensureCompleteParse.original.includes('parser.token != token::Eof'));
 const container=result.containers.find(row=>row.key==='expressionCollectorNode');assert.ok(container.original.includes('const KIND: AstFragmentKind = AstFragmentKind::Expr'));assert.ok(container.original.includes('fragment.make_expr()'));for(const key of ['originalCallerResolved','nativeVisitorDispatchQualified','attributeOwnerResolved','macroOwnerResolved','globalExportsClosed','sourceAuthority','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(result[key],false,key);
});
test('requests contain identity only and copied or other native-domain requests cannot replace current source facts',limits,()=>{
 const token=captureOriginalAttributeExpressionConfinementSource();for(const value of [{...token},structuredClone(token),captureOriginalTextualMacroLookupSource(),null])assert.throws(()=>originalAttributeExpressionConfinementSourceFacts(value),/copied or foreign/u);const first=originalAttributeExpressionConfinementSourceFacts(token),second=originalAttributeExpressionConfinementSourceFacts(token);assert.notStrictEqual(first,second);assert.notStrictEqual(first.sources,second.sources);assert.equal(first.profileSha256,second.profileSha256);
});
test('all three complete compiler equations retain original implementations native owners both phases and full inverses',limits,()=>{
 const plan=prepareAttributeExpressionConfinementSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
