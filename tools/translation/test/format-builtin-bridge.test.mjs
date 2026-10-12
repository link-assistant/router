import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from '../format-source-profiles.mjs';
import {compileFormatCallbackDataflow,compileFormatCallbackForwarder,applyFormatCallbackForwarder,isFormatCallbackDataflow,compileBuiltinRegistrationDataflow,selectBuiltinRegistrationDataflow} from '../format-builtin-dataflow.mjs';
import {compileRegisteredFormatCallbackStage,translateCheckedPrimitiveFormatSource,isCheckedPrimitiveFormatSourceBridge} from '../format-checked-source-bridge.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const compiler='compiler/rustc_builtin_macros/src/format.rs',registry='compiler/rustc_builtin_macros/src/lib.rs',hash=text=>createHash('sha256').update(text).digest('hex');

test('actual builtin callbacks automatically become checked symbolic tail forwarding while full originals survive',()=>{
  const proof=loadPinnedFormatSourceStages(),source=formatSourceStageInput(proof,compiler).source;
  for(const [name,newline] of [['expand_format_args',false],['expand_format_args_nl',true]]) {
    const flow=compileFormatCallbackDataflow(proof,compiler,name),fn=flow.function,forwarder=compileFormatCallbackForwarder(flow);
    assert.equal(hash(source.slice(fn.span.start,fn.span.end)),fn.sha256);assert.equal(hash(source.slice(flow.enclosingOriginalItem.span.start,flow.enclosingOriginalItem.span.end)),flow.enclosingOriginalItem.sha256);assert.equal(hash(source.slice(fn.bodySpan.start,fn.bodySpan.end)),fn.bodySha256);
    assert.deepEqual(forwarder.parameters,['ecx','sp','tts']);assert.deepEqual(forwarder.callPath,['expand_format_args_impl']);
    const call=applyFormatCallbackForwarder(forwarder,[{source:'context'},{source:'span'},{source:'original tokens'}]);
    assert.deepEqual(call.arguments.map(arg=>arg.kind),['opaque-input','opaque-input','opaque-input','boolean']);assert.equal(call.arguments[3].value,newline);assert.equal(call.arguments[2].value.source,'original tokens');assert.equal(call.executable,false);assert.equal(flow.semanticIRChecked,false);
  }
});

test('non-forwarding compiler branches retain def-site context, retry/error paths and original operand syntax',()=>{
  const proof=loadPinnedFormatSourceStages(),flow=compileFormatCallbackDataflow(proof,compiler,'expand_format_args_impl');
  assert.ok(flow.function.controlTokens.some(token=>token.text==='return'));assert.ok(flow.function.calls.some(call=>call.writtenPath.includes('with_def_site_ctxt')));assert.ok(flow.bodyTree.children.length);
  assert.throws(()=>compileFormatCallbackForwarder(flow),{name:'TypeError',message:'Callback binder is outside the simple source forwarding grammar'});assert.equal(flow.sourceSemanticClosureVerified,false);
  const roundtrip=JSON.parse(JSON.stringify(flow));assert.equal(isFormatCallbackDataflow(roundtrip),false);assert.throws(()=>compileFormatCallbackForwarder(roundtrip),/private original/);
  const forwarded=compileFormatCallbackForwarder(compileFormatCallbackDataflow(proof,compiler,'expand_format_args'));assert.throws(()=>applyFormatCallbackForwarder(structuredClone(forwarded),[]),/Unsealed/);assert.throws(()=>applyFormatCallbackForwarder(forwarded,[{}]),/arity\/domain/);
  let reads=0;const hostile={get source(){reads++;return 'fake';}};assert.throws(()=>applyFormatCallbackForwarder(forwarded,[hostile,{},{}]),/accessors/);assert.equal(reads,0);assert.throws(()=>applyFormatCallbackForwarder(forwarded,[{toJSON(){throw new Error('must not execute');}},{},{}]),/serialization callbacks/);
});

test('actual registration source is required; missing peer input retains a source-bearing diagnostic instead of guessed callbacks',()=>{
  const proof=loadPinnedFormatSourceStages(),unavailable=proof.diagnostics.find(row=>row.sourcePath===registry);
  if(unavailable) {
    assert.equal(unavailable.code,'ERR_FORMAT_SOURCE_INPUT_UNAVAILABLE');assert.equal(unavailable.requiredFor,'builtin-registration-owner-proof');assert.equal(proof.allSourceInputsVerified,false);
    assert.throws(()=>compileBuiltinRegistrationDataflow(proof,registry),error=>error.code==='ERR_FORMAT_SOURCE_INPUT_UNAVAILABLE');
  } else {
    const registration=compileBuiltinRegistrationDataflow(proof,registry),row=selectBuiltinRegistrationDataflow(registration,'format_args'),stage=compileRegisteredFormatCallbackStage(proof,{registrationPath:registry,callbackSourcePath:compiler,registeredName:'format_args'});
    assert.deepEqual(row.callbackPath,['format','::','expand_format_args']);const context=registration.functions[row.enclosingFunctionIndex];assert.ok(context.definitions[row.definitionIndex].matcher.children.length);assert.ok(context.function.bodyTokens.length);assert.equal(registration.registrationExpansionVerified,false);assert.equal(stage.forwarded.arguments[3].value,false);assert.equal(stage.callbackModuleOwnerResolved,false);
    assert.throws(()=>selectBuiltinRegistrationDataflow(structuredClone(registration),'format_args'),/Unsealed/);
  }
});

test('bridge uses the unchanged checked primitive formatter for original owned String results in both targets',async()=>{
  const original='pub fn render(n:u8,flag:bool,text:&str)->String{format!("{n:#04x}|{flag}|{text:🧱^4.2}")} pub fn named(n:u8)->String{format!("{label}={n}",label="Ω")}',proof=loadPinnedFormatSourceStages(),result=translateCheckedPrimitiveFormatSource(original,{proof});
  assert.equal(result.ir.items.map(item=>item.source).join(''),original);assert.equal(result.ir.counts.carried,0);assert.equal(result.formatSourceBridge.records.length,2);assert.equal(result.formatSourceBridge.additionalDeclarationsAdmitted,0);
  for(const record of result.formatSourceBridge.records){assert.equal(hash(original.slice(record.macroSpan.start,record.macroSpan.end)),record.macroSha256);assert.equal(record.checkedPrimitiveValueLowering,true);assert.equal(record.originalBuiltinExecutionVerified,false);}
  await verifyTypedTargets(result,api=>{assert.equal(api.render(5n,true,'😀Ωz'),'0x05|true|🧱😀Ω🧱');assert.equal(api.named(7n),'Ω=7');assert.throws(()=>api.render(256n,true,'x'),RangeError);});
  assert.equal(isCheckedPrimitiveFormatSourceBridge(structuredClone(result)),false);assert.throws(()=>translateCheckedPrimitiveFormatSource(original,{proof:structuredClone(proof)}),/private original/);assert.throws(()=>translateCheckedPrimitiveFormatSource(original,{proof,builtinStages:[{namespaceAuthority:true}]}),/Unsealed/);
});

test('bridge preserves explicit argument effects in written order before placeholder reuse or reordering',async()=>{
  const original='fn first()->u8{panic!("first")} fn second()->u8{panic!("second")} pub fn render()->String{format!("{1}-{0}-{0}",first(),second())}',result=translateCheckedPrimitiveFormatSource(original,{proof:loadPinnedFormatSourceStages()});
  assert.equal(result.ir.counts.carried,0);const plan=result.formatSourceBridge.records[0].plan;assert.deepEqual(plan.arguments.map(arg=>arg.source),['first()','second()']);assert.deepEqual(plan.explicitArgumentSourceOrder,[0,1]);assert.equal(plan.evaluationOrderVerified,false);
  await verifyTypedTargets(result,api=>assert.throws(()=>api.render(),{message:'first'}));
});

test('standalone Arguments, I/O, custom owners and unsupported traits cannot inherit primitive formatting admission',()=>{
  const proof=loadPinnedFormatSourceStages();
  for(const source of ['pub fn unsupported(){let args=format_args!("{}",1);}', 'pub fn unsupported(){println!("{}",1);}', 'pub fn unsupported(){eprintln!("{}",1);}', 'pub fn unsupported(n:f64)->String{format!("{n}")}', 'macro_rules! format{($($arg:tt)*)=>{"custom"}} pub fn unsupported()->String{format!("x")}']) {
    const result=translateCheckedPrimitiveFormatSource(source,{proof});assert.equal(result.formatSourceBridge.records.length,0);assert.equal(result.ir.items.find(item=>item.name==='unsupported').status,'carried');assert.equal(result.formatSourceBridge.namespaceAuthority,false);assert.equal(result.formatSourceBridge.runtimeParity,false);
  }
});

test('whole unchanged account_http remains source pinned; compiler staging does not bypass its module/effect dependencies',()=>{
  const source=readFileSync(new URL('../../../src/account_http.rs',import.meta.url),'utf8'),result=translateCheckedPrimitiveFormatSource(source,{path:'src/account_http.rs',proof:loadPinnedFormatSourceStages()});
  assert.equal(hash(source),'876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09');assert.equal(result.ir.items.map(item=>item.source).join(''),source);assert.equal(result.formatSourceBridge.additionalDeclarationsAdmitted,0);assert.equal(result.formatSourceBridge.sourceSemanticClosureVerified,false);assert.equal(result.formatSourceBridge.allocatorEffectsVerified,false);assert.equal(result.formatSourceBridge.ioEffectsVerified,false);
  assert.ok(result.ir.items.some(item=>item.status==='carried'));const actual=source.slice(7878,7909);assert.equal(actual,'format!("{what} needs a value")');
});
