import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadPinnedFormatSourceStages} from '../format-source-profiles.mjs';
import {compileFormatCallbackDataflow} from '../format-builtin-dataflow.mjs';
import {compileSymbolicControlSyntax,compileBuiltinSourceControl,isBuiltinSourceControl,builtinSourceControlFacts} from '../builtin-source-control.mjs';
const path='compiler/rustc_builtin_macros/src/format.rs';
const find=(root,kind)=>{const found=[];function visit(node){if(!node||typeof node!=='object')return;if(node.kind===kind)found.push(node);for(const [key,value]of Object.entries(node))if(!['tokens','bodyTree','signatureTokens','sourceLiteral'].includes(key))if(Array.isArray(value))value.forEach(visit);else visit(value);}visit(root);return found;};
test('complete pinned callback control is lifted from original Rust assignment matches and let-else',()=>{
  const proof=loadPinnedFormatSourceStages(),dataflow=compileFormatCallbackDataflow(proof,path,'expand_format_args_impl'),candidate=compileBuiltinSourceControl(dataflow);
  assert.equal(candidate.controlSyntaxProjected,true);assert.equal(candidate.function.sha256,dataflow.function.sha256);assert.equal(candidate.function.bodySha256,dataflow.function.bodySha256);
  assert.ok(find(candidate.ir,'assign').length>=1);assert.ok(find(candidate.ir,'match').length>=2);assert.ok(find(candidate.ir,'let').some(node=>node.otherwise));assert.ok(find(candidate.ir,'return').length>=1);
  assert.deepEqual(candidate.bodyTree,dataflow.bodyTree);assert.equal(candidate.ir.sourceSpan.start,dataflow.function.bodySpan.start);assert.equal(candidate.ir.sourceSpan.end,dataflow.function.bodySpan.end);
  assert.equal(candidate.sourceSha256,'c996ad70339e2915897ddd4e3aed4ed11f6e168e9e7d5562fc7139c45dc6a4ea');assert.equal(candidate.privateMetaRoundtrip,true);assert.equal(isBuiltinSourceControl(candidate),true);
  for(const flag of ['compilerHandlerOwnerResolved','sourceSemanticClosureVerified','typedCompilerIRChecked','rustGrammarValidated','executable','traitSelectionVerified','allocatorEffectsVerified','ioEffectsVerified','namespaceAuthority','runtimeParity'])assert.equal(candidate[flag],false,flag);
});
test('original argument parser retains source loops let-chains named branches and opaque helper macros',()=>{
  const proof=loadPinnedFormatSourceStages(),dataflow=compileFormatCallbackDataflow(proof,path,'parse_args'),candidate=compileBuiltinSourceControl(dataflow);
  assert.equal(candidate.controlSyntaxProjected,true);assert.ok(find(candidate.ir,'while').length>=1);assert.ok(find(candidate.ir,'condition-let').length>=2);assert.ok(find(candidate.ir,'match').length>=2);assert.ok(find(candidate.ir,'opaque-macro').length>=1);
  for(const node of find(candidate.ir,'let')){assert.equal(node.initializerBeforeBinding,true);assert.equal(node.bindingSemanticsVerified,false);}
  assert.equal(candidate.ir.lexicalScopeVerified,false);for(const node of find(candidate.ir,'match'))assert.equal(node.armBindingVerified,false);
  assert.deepEqual(candidate.bodyTree,dataflow.bodyTree);assert.equal(candidate.function.bodySha256,dataflow.function.bodySha256);
  assert.equal(candidate.pinnedCompilerFunctionVerified,true);assert.equal(candidate.sourceSemanticClosureVerified,false);assert.equal(candidate.function.span.start,2808);
});
test('source-defined records closures tuples and try remain structured with their owner obligations open',()=>{
  const candidate=compileSymbolicControlSyntax('{let x=Input{kind:Kind::Normal,value};let y=items.map(|(arg,n)| (arg,n));let z=(x,);consume(z)?;}');
  assert.equal(candidate.controlSyntaxProjected,true);assert.equal(find(candidate.ir,'record').length,1);assert.equal(find(candidate.ir,'closure').length,1);assert.ok(find(candidate.ir,'tuple').some(node=>node.items.length===1&&node.trailingComma));assert.equal(find(candidate.ir,'try').length,1);
  assert.equal(candidate.pinnedCompilerFunctionVerified,false);assert.equal(isBuiltinSourceControl(candidate),false);assert.throws(()=>compileBuiltinSourceControl(candidate),/private pinned/);
  assert.equal(find(candidate.ir,'record')[0].layoutOwnerResolved,false);assert.equal(find(candidate.ir,'closure')[0].captureSemanticsVerified,false);
  const control='{let x=(first());let y=second();x && third()? || fourth();return y;}';
  const ordered=compileSymbolicControlSyntax(control);assert.equal(ordered.controlSyntaxProjected,true);
  assert.deepEqual(ordered.ir.statements.map(node=>node.kind),['let','let','expression-statement','expression-statement']);
  const grouped=find(ordered.ir,'parenthesized')[0];assert.equal(control.slice(grouped.sourceSpan.start,grouped.sourceSpan.end),'(first())');
  assert.equal(find(ordered.ir,'binary').find(node=>node.operation==='&&').rightEvaluation,'conditional-on-left-true');
  assert.equal(find(ordered.ir,'binary').find(node=>node.operation==='||').rightEvaluation,'conditional-on-left-false');
  for(const node of find(ordered.ir,'binary')){assert.equal(node.shortCircuitSemanticsVerified,false);assert.equal(node.evaluationOrderVerified,false);}
  assert.equal(find(ordered.ir,'try')[0].exitScopeVerified,false);assert.equal(find(ordered.ir,'return')[0].exitScopeVerified,false);
  const operators=compileSymbolicControlSyntax('{a | b ^ c & d}');assert.equal(operators.controlSyntaxProjected,true);
  assert.equal(operators.ir.tail.operation,'|');assert.equal(operators.ir.tail.right.operation,'^');assert.equal(operators.ir.tail.right.right.operation,'&');
  const shift=compileSymbolicControlSyntax('{a >> b}');assert.equal(shift.controlSyntaxProjected,true);assert.equal(shift.ir.tail.operation,'>>');assert.deepEqual(shift.ir.tail.operatorToken.originalPunctuation.map(token=>token.text),['>','>']);
  assert.equal(shift.source.slice(shift.ir.tail.operatorToken.span.start,shift.ir.tail.operatorToken.span.end),'>>');
  assert.equal(compileSymbolicControlSyntax('{a > > b}').controlSyntaxProjected,false);
  assert.equal(compileSymbolicControlSyntax('{a >/*gap*/> b}').controlSyntaxProjected,false);
  const scoped=compileSymbolicControlSyntax('{let x=first();{let x=second();consume(x);}consume(x);if ready {let y=third();}else{let y=fourth();}}');
  assert.equal(scoped.controlSyntaxProjected,true);assert.equal(find(scoped.ir,'let').length,4);
  for(const node of find(scoped.ir,'control-block'))assert.equal(node.lexicalScopeVerified,false);
  for(const node of find(scoped.ir,'let'))assert.equal(node.pattern.bindingSemanticsVerified,false);
  assert.equal(find(scoped.ir,'if')[0].branchBindingVerified,false);
  const assign=compileSymbolicControlSyntax('{place() += value();}');assert.equal(assign.controlSyntaxProjected,true);
  assert.equal(find(assign.ir,'assign')[0].evaluationOrderVerified,false);
});
test('unsupported source grammar preserves the complete original body and explicit diagnostics',()=>{
  // Preserve the former generic-call refusal as a syntax-only positive.
  // Its type arguments, callee effects and execution remain unproved.
  const generic=compileSymbolicControlSyntax('{let x=callee::<T>();}');assert.equal(generic.controlSyntaxProjected,true);assert.equal(generic.ir.statements[0].initializer.callee.kind,'generic-application');assert.equal(generic.ir.statements[0].initializer.callee.typeArgumentsChecked,false);assert.equal(generic.namespaceAuthority,false);assert.equal(generic.executable,false);
  for(const source of ['{unsafe {read()}}','{async {}}','{let x=0;use external::*;x}','{let = value;}','{continue value;}','{a < b == c}','{a == b < c}','{a < b < c}']){
    const candidate=compileSymbolicControlSyntax(source);assert.equal(candidate.controlSyntaxProjected,false,source);assert.equal(candidate.ir,null);assert.equal(candidate.source,source);assert.equal(candidate.diagnostics[0].code,'ERR_BUILTIN_SOURCE_CONTROL_UNSUPPORTED');assert.equal(candidate.executable,false);
  }
  const deep=compileSymbolicControlSyntax('{'+ '!'.repeat(200)+'true}');assert.equal(deep.controlSyntaxProjected,false);assert.match(deep.diagnostics[0].reason,/depth.*finite bound/);
});
test('copied or getter-bearing public data cannot replace a private pinned function or control record',()=>{
  const proof=loadPinnedFormatSourceStages(),dataflow=compileFormatCallbackDataflow(proof,path,'expand_format_args'),candidate=compileBuiltinSourceControl(dataflow);
  assert.equal(candidate.controlSyntaxProjected,true);assert.deepEqual(candidate.bodyTree,dataflow.bodyTree);assert.equal(candidate.function.bodySha256,dataflow.function.bodySha256);assert.equal(candidate.namespaceAuthority,false);assert.equal(candidate.executable,false);assert.throws(()=>compileBuiltinSourceControl(structuredClone(dataflow)),/private pinned/);assert.equal(isBuiltinSourceControl(structuredClone(candidate)),false);assert.throws(()=>builtinSourceControlFacts(structuredClone(candidate)),/unsealed/);
  let reads=0;const fake={};Object.defineProperty(fake,'bodyTree',{get(){reads++;return dataflow.bodyTree;}});assert.throws(()=>compileBuiltinSourceControl(fake),/private pinned/);assert.equal(reads,0);assert.throws(()=>compileBuiltinSourceControl(new Proxy(dataflow,{get(){reads++;return null;}})),/private pinned/);assert.equal(reads,0);
  assert.ok(Object.isFrozen(builtinSourceControlFacts(candidate)));
  const {privateMetaRoundtrip,checkedMetaSha256,...publicPayload}=structuredClone(candidate);
  const resealed={...publicPayload,privateMetaRoundtrip,checkedMetaSha256:createHash('sha256').update(JSON.stringify(publicPayload)).digest('hex')};
  assert.equal(resealed.checkedMetaSha256,checkedMetaSha256);assert.equal(isBuiltinSourceControl(resealed),false);assert.throws(()=>builtinSourceControlFacts(resealed),/unsealed/);
  const syntax=compileSymbolicControlSyntax('{true}');assert.equal(isBuiltinSourceControl(syntax),false);assert.equal(builtinSourceControlFacts(syntax).inputKind,'caller-source-syntax');
});
test('pinned complex generator bodies are retained even when some syntax or owners remain unsupported',()=>{
  const proof=loadPinnedFormatSourceStages(),dataflow=compileFormatCallbackDataflow(proof,path,'make_format_args'),candidate=compileBuiltinSourceControl(dataflow);
  assert.equal(candidate.function.bodySha256,dataflow.function.bodySha256);assert.deepEqual(candidate.bodyTree,dataflow.bodyTree);assert.equal(candidate.function.signatureTokens[0].text,'fn');
  if(!candidate.controlSyntaxProjected){assert.equal(candidate.ir,null);assert.equal(candidate.diagnostics[0].code,'ERR_BUILTIN_SOURCE_CONTROL_UNSUPPORTED');}
  assert.equal(candidate.sourceSemanticClosureVerified,false);assert.equal(candidate.compilerHandlerOwnerResolved,false);assert.equal(candidate.executable,false);
});
