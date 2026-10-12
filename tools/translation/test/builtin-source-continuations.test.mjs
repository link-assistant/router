import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from '../format-source-profiles.mjs';
import {compileFormatCallbackDataflow} from '../format-builtin-dataflow.mjs';
import {compileBuiltinSourceControl,compileSymbolicControlSyntax} from '../builtin-source-control.mjs';
import {compileBuiltinControlContinuations,builtinControlContinuationFacts,projectBuiltinControlContinuations} from '../builtin-source-continuations.mjs';
const path='compiler/rustc_builtin_macros/src/format.rs';
const syntax=source=>compileBuiltinControlContinuations(compileSymbolicControlSyntax(source));
const pinned=(proof,name)=>compileBuiltinControlContinuations(compileBuiltinSourceControl(compileFormatCallbackDataflow(proof,path,name)));
const flags=['compilerHandlerOwnerResolved','sourceSemanticClosureVerified','typedCompilerIRChecked','rustGrammarValidated','executable','traitSelectionVerified','allocatorEffectsVerified','ioEffectsVerified','namespaceAuthority','runtimeParity'];
test('both original format callbacks reach their actual source tail call and literal newline operand',()=>{
  const proof=loadPinnedFormatSourceStages(),input=formatSourceStageInput(proof,path),operands=[{kind:'opaque-ExtCtxt'},{kind:'opaque-Span'},{kind:'opaque-TokenStream'}];
  assert.equal(input.sourceSha256,'c996ad70339e2915897ddd4e3aed4ed11f6e168e9e7d5562fc7139c45dc6a4ea');
  for(const [name,newline]of [['expand_format_args',false],['expand_format_args_nl',true]]){
    const program=pinned(proof,name),projection=projectBuiltinControlContinuations(program,operands),fn=program.function;
    assert.equal(program.pinnedCompilerFunctionVerified,true);assert.deepEqual(program.parameters.map(param=>param.name),['ecx','sp','tts']);
    assert.equal(createHash('sha256').update(input.source.slice(fn.bodySpan.start,fn.bodySpan.end)).digest('hex'),fn.bodySha256);
    assert.equal(projection.result.status,'frontier');assert.equal(projection.result.obligation,'original-callee-owner-and-effects');
    assert.deepEqual(projection.result.callee,{kind:'written-source-callee',path:['expand_format_args_impl']});assert.deepEqual(projection.result.arguments,[...operands,newline]);
    assert.equal(projection.callbackInvocations,0);assert.equal(projection.originalFunctionBodyRetained,true);assert.equal(projection.projectionOnly,true);
    for(const flag of flags){assert.equal(program[flag],false,flag);assert.equal(projection[flag],false,flag);}
  }
});
test('original compiler parse body stops at its first constructor before the later parser method',()=>{
  const proof=loadPinnedFormatSourceStages(),program=pinned(proof,'parse_args'),operands=program.parameters.map(param=>({kind:'opaque-'+param.name})),projection=projectBuiltinControlContinuations(program,operands);
  assert.equal(program.function.span.start,2808);assert.equal(projection.result.status,'frontier');assert.equal(projection.result.obligation,'original-callee-owner-and-effects');
  assert.deepEqual(projection.result.callee,{kind:'written-source-callee',path:['FormatArguments','new']});assert.deepEqual(projection.result.arguments,[]);assert.equal(projection.callbackInvocations,0);
  assert.ok(program.nodes.some(node=>node.kind==='field'&&node.name==='new_parser_from_tts'));
  assert.ok(projection.result.sourceSpan.start>=program.function.bodySpan.start);assert.ok(projection.result.sourceSpan.end<=program.function.bodySpan.end);
  assert.ok(program.nodes.some(node=>node.kind==='match'));assert.ok(program.nodes.some(node=>node.kind==='while'));
});
test('generic boolean short circuit and return omit unreachable source callbacks',()=>{
  for(const [source,expected]of [['{true || external()} ',true],['{false && external()} ',false],['{return true;external();}',true],['{let value=true;if value {true}else{external()}}',true]]){
    const projection=projectBuiltinControlContinuations(syntax(source));assert.deepEqual(projection.result,{status:'value',value:expected},source);
    assert.equal(projection.trace.some(node=>node.kind==='call'),false,source);assert.equal(projection.callbackInvocations,0);assert.equal(projection.runtimeParity,false);
  }
  const taken=projectBuiltinControlContinuations(syntax('{true && external()}'));assert.equal(taken.result.status,'frontier');assert.deepEqual(taken.result.callee.path,['external']);
  const invalid=projectBuiltinControlContinuations(syntax('{() && true}'));assert.equal(invalid.result.obligation,'actual-boolean-domain');
});
test('lexical slots preserve initializer-before-shadowing nested scope and actual local callee precedence',()=>{
  const projection=projectBuiltinControlContinuations(syntax('{let value=true;let value=value;{let value=false;}value}'));
  assert.deepEqual(projection.result,{status:'value',value:true});
  const unresolved=projectBuiltinControlContinuations(syntax('{let value=absent;value}'));assert.equal(unresolved.result.obligation,'original-source-name-owner');assert.deepEqual(unresolved.result.path,['absent']);
  const shadow=projectBuiltinControlContinuations(syntax('{let outside=false;outside()}'));
  assert.deepEqual(shadow.result.callee,{kind:'source-local-callee',name:'outside',value:false});assert.equal(shadow.callbackInvocations,0);
  const qualified=projectBuiltinControlContinuations(syntax('{let outside=false;module::outside()}'));
  assert.deepEqual(qualified.result.callee,{kind:'written-source-callee',path:['module','outside']});
});
test('source argument evaluation and unresolved operators stop before later effects',()=>{
  const first=projectBuiltinControlContinuations(syntax('{target(first(),second())}'));
  assert.equal(first.result.obligation,'original-callee-owner-and-effects');assert.deepEqual(first.result.callee.path,['first']);
  assert.equal(first.trace.filter(node=>node.kind==='call').length,2);
  const booleanArgs=projectBuiltinControlContinuations(syntax('{let value=true;target(value,!value)}'));
  assert.deepEqual(booleanArgs.result.arguments,[true,false]);
  const comparison=projectBuiltinControlContinuations(syntax('{true == second()}'));
  assert.equal(comparison.result.obligation,'original-callee-owner-and-effects');assert.deepEqual(comparison.result.callee.path,['second']);
  const trait=projectBuiltinControlContinuations(syntax('{true == false}'));assert.equal(trait.result.obligation,'original-binary-owner');assert.equal(trait.traitSelectionVerified,false);
  const residual=projectBuiltinControlContinuations(syntax('{true?;external()}'));assert.equal(residual.result.obligation,'original-try-residual-owner');assert.equal(residual.trace.some(node=>node.kind==='call'),false);
});
test('finite local boolean loops retain mutable slots and refuse invalid exit or compound-owner rules',()=>{
  assert.deepEqual(projectBuiltinControlContinuations(syntax('{let mut again=true;while again {again=false;}again}')).result,{status:'value',value:false});
  assert.deepEqual(projectBuiltinControlContinuations(syntax('{loop {break true;}}')).result,{status:'value',value:true});
  assert.equal(projectBuiltinControlContinuations(syntax('{while true {break false;}}')).result.obligation,'original-while-valued-break-rule');
  assert.equal(projectBuiltinControlContinuations(syntax('{break;}')).result.obligation,'original-loop-exit-scope');
  assert.equal(projectBuiltinControlContinuations(syntax('{let value=false;value=true;}')).result.obligation,'original-place-or-compound-owner');
  assert.equal(projectBuiltinControlContinuations(syntax('{let mut value=false;value+=true;}')).result.obligation,'original-place-or-compound-owner');
  assert.throws(()=>projectBuiltinControlContinuations(syntax('{loop {continue;}}')),/finite step budget/);
});
test('private reconstructed source graph cannot be minted by a public digest or getter callback',()=>{
  const program=syntax('{true}'),copy=structuredClone(program),{metaSha256,privateMetaRoundtrip,...payload}=copy;
  copy.metaSha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');assert.equal(typeof metaSha256,'string');assert.equal(privateMetaRoundtrip,true);
  assert.throws(()=>builtinControlContinuationFacts(copy),/unissued|fabricated/);assert.throws(()=>projectBuiltinControlContinuations(copy),/unissued|fabricated/);
  let calls=0;const fake={};Object.defineProperty(fake,'ir',{get(){calls++;return {};}});assert.throws(()=>compileBuiltinControlContinuations(fake),/unsealed|fabricated/);
  const proxy=new Proxy(program,{get(){calls++;return true;}});assert.throws(()=>projectBuiltinControlContinuations(proxy),/unissued|fabricated/);
  const proof=loadPinnedFormatSourceStages(),actual=pinned(proof,'expand_format_args'),inputs=[];Object.defineProperty(inputs,'0',{enumerable:true,get(){calls++;return {};}});inputs.length=3;
  assert.throws(()=>projectBuiltinControlContinuations(actual,inputs),/accessor|sparse/);assert.equal(calls,0);
  assert.ok(Object.isFrozen(builtinControlContinuationFacts(program)));assert.ok(Object.isFrozen(program.nodes));assert.ok(program.nodes.every(Object.isFrozen));
});
