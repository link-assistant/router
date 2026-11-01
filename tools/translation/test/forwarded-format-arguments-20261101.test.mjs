// Independent actual private custody/source cases. Entire file UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {originalMacroInvocation} from '../macro-token-trees.mjs';
import {createForwardedFormatArgumentsEngine} from '../forwarded-format-arguments-20261101-engine.mjs';
import {createAttributedLocalDeclarativeMacroEngine} from '../attributed-local-declarative-macro-engine.mjs';
import {captureForwardedFormatArgumentsCustody,withForwardedFormatArgumentsCustody,forwardedFormatArgumentsCustodyFacts} from '../forwarded-format-arguments-20261101.mjs';
import {captureScopedOutputBindingProductionOwners} from '../scoped-output-binding-20261101-production-sources.mjs';
import {prepareForwardedFormatArgumentsSources} from '../forwarded-format-arguments-20261101-prepare.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const limits={timeout:60000};
const definition='macro_rules! send {()=>{sink!("\\n")}; ($($arg:tt)*)=>{sink!("{}\\n",inner!($($arg)*))}}';
function setup(call='send!("東京")',declaration=definition){
 const source='pub fn caller(){'+call+';}',files={'src/caller.rs':source,'src/output.rs':declaration},start=source.indexOf(call),parser=new HostRustParser(tokenizeRust(source));
 return {files,parser,options:{callerPath:'src/caller.rs',definitionPath:'src/output.rs',definitionName:'send',macroSpan:{start,end:start+call.length},parser,readSource:path=>files[path]}};
}
function engineSetup(declaration='macro_rules! send {($x:tt)=>{sink!($x)}}',call='send!("hello")'){
 const engine=createForwardedFormatArgumentsEngine(),input=originalMacroInvocation(call).trees,definition=engine.compileDeclarativeMacro(declaration,{name:'send',owner:['crate']}),proof=engine.expandDeclarativeMacro(definition,input),occurrence=engine.declarativeNestedMacroInvocations(proof)[0];return {engine,input,proof,occurrence};
}
test('zero-argument and literal-only actual raw source keep declaration and caller intervals distinct',limits,()=>{
 const empty=setup('send!()'),zero=captureForwardedFormatArgumentsCustody(empty.options).value;assert.equal(zero.leafCustody.kind,'definition-only');assert.equal(zero.originalLiteral,null);assert.ok(zero.leafCustody.rows.every(row=>row.origin==='original-definition-token'));
 const row=setup(),result=captureForwardedFormatArgumentsCustody(row.options).value;assert.equal(result.leafCustody.kind,'literal-only');assert.equal(result.originalLiteral.ast.value,'東京');assert.equal(row.files['src/caller.rs'].slice(result.originalLiteral.span.start,result.originalLiteral.span.end),'"東京"');assert.equal(result.leafCustody.rows.filter(row=>row.origin==='original-caller-literal').length,1);assert.ok(result.leafCustody.rows.some(row=>row.origin==='original-definition-token'&&row.text==='inner'));
 for(const key of ['macroOwnerResolved','definitionSiteBindingsResolved','mixedSiteHygieneResolved','builtinFormatArgsOwnerResolved','evaluationOrderVerified','argumentsConstructed','borrowLifetimeVerified','transportAdmitted','originalSourceEquivalenceQualified'])assert.equal(result[key],false,key);
 for(const [at,equation]of result.sourceEquations.entries())assert.equal(equation.inverse,Object.values(row.files)[at]);assert.equal(row.parser.cursor.index,0);
});
test('opaque or expired requests never preserve private source custody',limits,()=>{
 const row=setup();let saved,engineRequest;
 assert.throws(()=>withForwardedFormatArgumentsCustody(row.options,token=>{saved=token;assert.throws(()=>forwardedFormatArgumentsCustodyFacts(structuredClone(token)),/foreign/u);}),/invalidated/u);
 assert.throws(()=>forwardedFormatArgumentsCustodyFacts(saved),/expired/u);
 const input=engineSetup();input.engine.withDeclarativeForwardedLiteralCustody(input.proof,input.input,input.occurrence,token=>{engineRequest=token;assert.equal(input.engine.declarativeForwardedLiteralCustodyFacts(token).callerLiteralCount,1);});assert.throws(()=>input.engine.declarativeForwardedLiteralCustodyFacts(engineRequest),/Expired/u);
});
test('legacy factory and renderer retain every existing authority/refusal boundary',limits,()=>{
 const legacy=createAttributedLocalDeclarativeMacroEngine();assert.equal(Object.hasOwn(legacy,'withDeclarativeForwardedLiteralCustody'),false);const row=engineSetup();assert.throws(()=>row.engine.renderLocalDeclarativeExpansion(row.proof,()=>null),/nested macro/u);
});
test('copied foreign same-spelling inputs/proofs and nested occurrences retain genuine engine refusal',limits,()=>{
 const row=engineSetup(),other=engineSetup(),legacy=createAttributedLocalDeclarativeMacroEngine(),input=originalMacroInvocation('send!("hello")').trees,definition=legacy.compileDeclarativeMacro('macro_rules! send {($x:tt)=>{sink!($x)}}',{name:'send',owner:['crate']}),proof=legacy.expandDeclarativeMacro(definition,input),nested=legacy.declarativeNestedMacroInvocations(proof)[0];
 for(const [candidate,raw,occurrence]of [[structuredClone(row.proof),row.input,row.occurrence],[row.proof,other.input,row.occurrence],[row.proof,row.input,other.occurrence],[proof,input,nested]])assert.throws(()=>row.engine.withDeclarativeForwardedLiteralCustody(candidate,raw,occurrence,()=>0));
});
test('duplicate omitted reordered noncontiguous mixed and opaque captures keep their refusals',limits,()=>{
 for(const [declaration,call]of [
  ['macro_rules! send {($x:tt)=>{sink!($x,$x)}}','send!("a")'],
  ['macro_rules! send {($x:tt)=>{sink!("other")}}','send!("a")'],
  ['macro_rules! send {($a:tt,$b:tt)=>{sink!($b,$a)}}','send!("a","b")'],
  ['macro_rules! send {($a:tt,$b:tt)=>{sink!($a,"mixed",$b)}}','send!("a","b")'],
  ['macro_rules! send {($x:tt)=>{sink!($x + "mixed")}}','send!("a")'],
  ['macro_rules! send {($x:expr)=>{sink!($x)}}','send!("a")'],
 ]){const row=engineSetup(declaration,call);assert.throws(()=>row.engine.withDeclarativeForwardedLiteralCustody(row.proof,row.input,row.occurrence,()=>0));}
});
test('actual original parser/source identities and invocation membership cannot be invented',limits,()=>{
 const row=setup(),other=setup('send!("other")');assert.throws(()=>captureForwardedFormatArgumentsCustody({...row.options,parser:other.parser}),/complete parser|exact original/u);
 assert.throws(()=>captureForwardedFormatArgumentsCustody({...row.options,macroSpan:{start:0,end:row.files['src/caller.rs'].length}}));
 let reads=0;const getter=setup();Object.defineProperty(getter.parser,'cursor',{get(){reads++;return row.parser.cursor;}});assert.throws(()=>captureForwardedFormatArgumentsCustody(getter.options),/accessors/u);assert.equal(reads,0);
 row.parser.expr=()=>({k:'lit',value:'invented'});assert.throws(()=>captureForwardedFormatArgumentsCustody(row.options),/identity|callbacks/u);
 const captured=setup('send!("{hidden}")');assert.throws(()=>captureForwardedFormatArgumentsCustody(captured.options),/captures/u);
 const qualified=setup('other::send!("value")');assert.throws(()=>captureForwardedFormatArgumentsCustody(qualified.options),/qualified/u);
});
test('caught source mutation/restoration still poisons enclosing original source operation',limits,()=>{
 const row=setup(),original=row.files['src/caller.rs'];assert.throws(()=>withSourceFailureOperation(()=>{try{withForwardedFormatArgumentsCustody(row.options,token=>{row.files['src/caller.rs']=original+' ';try{forwardedFormatArgumentsCustodyFacts(token);}catch{}row.files['src/caller.rs']=original;return 0;});}catch{}return 0;}),/invalidated/u);
});
test('ordinary callback errors remain exact while async callbacks are rejected before invocation',limits,()=>{
 const row=setup(),primary={primary:true};assert.throws(()=>withForwardedFormatArgumentsCustody(row.options,()=>{throw primary;}),error=>error===primary);let calls=0;assert.throws(()=>withForwardedFormatArgumentsCustody(row.options,async()=>{calls++;}),/synchronously/u);assert.equal(calls,0);
});
test('complete actual output definition and auth_remote caller retain custody without builtin or transport permission',limits,()=>{
 const production=captureScopedOutputBindingProductionOwners().value,caller=production.rows.find(row=>row.logicalPath==='src/auth_remote.rs').before,declaration=production.rows.find(row=>row.logicalPath==='src/operation_output.rs').before,call='println!("Paste authorization code:")',start=caller.indexOf(call);assert.ok(start>=0);
 const parser=new HostRustParser(tokenizeRust(caller)),files={'src/auth_remote.rs':caller,'src/operation_output.rs':declaration};const result=captureForwardedFormatArgumentsCustody({callerPath:'src/auth_remote.rs',definitionPath:'src/operation_output.rs',definitionName:'println',macroSpan:{start,end:start+call.length},parser,readSource:path=>files[path]}).value;
 assert.equal(result.originalFunction.source,caller);assert.equal(result.originalLiteral.ast.value,'Paste authorization code:');assert.ok(result.leafCustody.rows.some(row=>row.text==='format_args'&&row.origin==='original-definition-token'));assert.equal(result.builtinFormatArgsOwnerResolved,false);assert.equal(result.transportAdmitted,false);
});
test('complete original/current engine source equations retain ordered phases and full source inverse',limits,()=>{
 const plan=prepareForwardedFormatArgumentsSources();assert.equal(plan.files.length,1);const row=plan.files[0];assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(plan.semanticAuthority,false);
});
