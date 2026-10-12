import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from '../format-source-profiles.mjs';
import {captureBuiltinSourceCallFrames,projectBuiltinSourceCallFrames} from '../builtin-source-call-frames.mjs';
const compiler='compiler/rustc_builtin_macros/src/format.rs',parser='compiler/rustc_parse_format/src/lib.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const flags=['compilerHandlerOwnerResolved','sourceSemanticClosureVerified','typedCompilerIRChecked','rustGrammarValidated','executable','traitSelectionVerified','allocatorEffectsVerified','ioEffectsVerified','namespaceAuthority','runtimeParity'];
const inputs=[{kind:'opaque-ExtCtxt'},{kind:'opaque-Span'},{kind:'opaque-TokenStream'}];
test('actual format callbacks transfer original arguments and stop at definition-site hygiene before parser construction',()=>{
 const proof=loadPinnedFormatSourceStages(),source=formatSourceStageInput(proof,compiler),frames=captureBuiltinSourceCallFrames(proof,compiler);
 assert.equal(source.sourceSha256,'c996ad70339e2915897ddd4e3aed4ed11f6e168e9e7d5562fc7139c45dc6a4ea');
 for(const [name,newline]of [['expand_format_args',false],['expand_format_args_nl',true]]){
  const result=projectBuiltinSourceCallFrames(frames,name,inputs);assert.deepEqual(result.frames.map(frame=>frame.function.name),[name,'expand_format_args_impl']);
  assert.deepEqual(result.frames[1].arguments,[...inputs,newline]);assert.equal(result.terminal.sourceProjection.callee.name,'with_def_site_ctxt');
  assert.equal(result.terminal.sourceProjection.callee.receiver.kind,'opaque-ExtCtxt');assert.equal(result.terminal.obligation,'original-imported-or-qualified-callee-owner');
  assert.equal(result.frames.some(frame=>frame.function.name==='parse_args'),false,'actual definition-site operation cannot be skipped');
  for(const frame of result.frames){const fn=frame.function;assert.equal(hash(source.source.slice(fn.span.start,fn.span.end)),fn.sha256);assert.equal(hash(source.source.slice(fn.bodySpan.start,fn.bodySpan.end)),fn.bodySha256);}
  assert.equal(result.callbackInvocations,0);assert.equal(result.conditionalSourceProjection,true);assert.equal(result.pendingCallerContinuations,true);
  for(const flag of flags){assert.equal(frames[flag],false,flag);assert.equal(result[flag],false,flag);}
 }
});
test('actual parser creation remains an imported receiver obligation with original argument and body evidence',()=>{
 const proof=loadPinnedFormatSourceStages(),frames=captureBuiltinSourceCallFrames(proof,compiler),row=frames.functions.find(row=>row.name==='parse_args');assert.ok(row.projectable);
 const result=projectBuiltinSourceCallFrames(frames,'parse_args',inputs);assert.equal(result.frames.length,1);assert.equal(result.terminal.sourceProjection.callee.name,'new_parser_from_tts');
 assert.equal(result.terminal.sourceProjection.callee.kind,'source-member-callee');assert.equal(result.terminal.sourceProjection.callee.receiver.kind,'opaque-ExtCtxt');assert.equal(result.terminal.obligation,'original-imported-or-qualified-callee-owner');assert.equal(result.callbackInvocations,0);
});
test('actual Parser consume member stages only the same exact original impl and stops at unproved conditional pattern grammar',()=>{
 const proof=loadPinnedFormatSourceStages(),source=formatSourceStageInput(proof,parser),frames=captureBuiltinSourceCallFrames(proof,parser),result=projectBuiltinSourceCallFrames(frames,'consume',[{kind:'opaque-Parser'}, {kind:'opaque-char'}]);
 assert.equal(source.sourceSha256,'d2f014b090b8cac635f1fe57c2ea28f0af6bfbcf35c2268a2c93939baa53c204');assert.deepEqual(result.frames.map(frame=>frame.function.name),['consume','consume_pos']);
 const [caller,target]=result.frames;assert.equal(caller.owner.term,'impl');assert.deepEqual(caller.owner.span,target.owner.span);assert.equal(caller.owner.sha256,target.owner.sha256);
 assert.equal(caller.candidateCall.scopeKind,'same-exact-original-impl-member-candidate');assert.equal(caller.candidateCall.actualRustOwnerResolved,false);assert.equal(caller.candidateCall.returnContinuationResumed,false);
 assert.equal(result.terminal.obligation,'original-control-or-callee-return-rule');assert.equal(result.terminal.sourceProjection.obligation,'original-control-or-layout-rule');assert.equal(result.callbackInvocations,0);assert.equal(result.namespaceAuthority,false);
});
test('finite frame bound retains pending calls rather than pretending a source callee has returned',()=>{
 const proof=loadPinnedFormatSourceStages(),frames=captureBuiltinSourceCallFrames(proof,compiler),one=projectBuiltinSourceCallFrames(frames,'expand_format_args',inputs,{maxFrames:1});
 assert.equal(one.frames.length,1);assert.equal(one.terminal.obligation,'original-source-candidate-frame-budget');assert.equal(one.terminal.nextSourceFunction.name,'expand_format_args_impl');assert.equal(one.frames[0].candidateCall.returnContinuationResumed,false);
 assert.throws(()=>projectBuiltinSourceCallFrames(frames,'expand_format_args',inputs,{maxFrames:33}),RangeError);assert.throws(()=>projectBuiltinSourceCallFrames(frames,'expand_format_args',inputs,{closedOwner:true}),TypeError);assert.equal(one.executable,false);
});
test('public rehashed source frames cloned proofs fake functions and getter inputs grant no source or callee authority',()=>{
 const proof=loadPinnedFormatSourceStages(),frames=captureBuiltinSourceCallFrames(proof,compiler),copy=structuredClone(frames);copy.metaSha256=hash(JSON.stringify(copy));
 assert.throws(()=>projectBuiltinSourceCallFrames(copy,'expand_format_args',inputs),/copied|fabricated/);assert.throws(()=>captureBuiltinSourceCallFrames(structuredClone(proof),compiler),/private pinned/);assert.throws(()=>projectBuiltinSourceCallFrames(frames,'not_an_original_function',inputs),/ambiguous|unsupported/);
 let calls=0;const options={};Object.defineProperty(options,'maxFrames',{enumerable:true,get(){calls++;return 16;}});assert.throws(()=>projectBuiltinSourceCallFrames(frames,'expand_format_args',inputs,options),TypeError);
 const operands=[];Object.defineProperty(operands,'0',{enumerable:true,get(){calls++;return inputs[0];}});operands.length=3;assert.throws(()=>projectBuiltinSourceCallFrames(frames,'expand_format_args',operands),TypeError);
 const proxy=new Proxy(frames,{get(){calls++;return true;}});assert.throws(()=>projectBuiltinSourceCallFrames(proxy,'expand_format_args',inputs),TypeError);assert.equal(calls,0);
 assert.ok(Object.isFrozen(frames.functions));assert.ok(frames.functions.every(Object.isFrozen));
});
test('original unsupported functions and complete source-owner headers are preserved without body replacement',()=>{
 const proof=loadPinnedFormatSourceStages(),source=formatSourceStageInput(proof,compiler),frames=captureBuiltinSourceCallFrames(proof,compiler);
 assert.equal(frames.originalWholeSourceRetained,true);assert.equal(frames.sourceSha256,hash(source.source));assert.equal(frames.sourceBytes,Buffer.byteLength(source.source));
 for(const row of frames.functions){assert.equal(hash(source.source.slice(row.span.start,row.span.end)),row.sha256);assert.equal(hash(source.source.slice(row.bodySpan.start,row.bodySpan.end)),row.bodySha256);if(row.owner)assert.equal(hash(source.source.slice(row.owner.span.start,row.owner.span.end)),row.owner.sha256);}
 for(const row of frames.functions.filter(row=>!row.projectable)){assert.ok(row.diagnostic);assert.throws(()=>projectBuiltinSourceCallFrames(frames,row.name,[]),/ambiguous|unsupported/);}
 assert.equal(frames.sourceSemanticClosureVerified,false);assert.equal(frames.allocatorEffectsVerified,false);assert.equal(frames.traitSelectionVerified,false);assert.equal(frames.namespaceAuthority,false);
});
