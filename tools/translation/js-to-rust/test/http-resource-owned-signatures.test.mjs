// Independent owned signature regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {projectHttpResourceUnitJavaScript} from '../../http-resource-unit-signatures.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOwnedSignatureSources} from '../../prepare-http-resource-owned-signature-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_core_json_copy as copy,router_core_json_with_field as withField} from './runtime/json-update-runtime.mjs';
import {router_state_json_values_copy as copyValues,router_state_json_from_values as fromValues} from './runtime/json-state-runtime.mjs';
import {router_text_repeat as repeat,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_carrier_json_some as some,router_carrier_json_option_to_result as optionToResult} from './runtime/owned-outcome-runtime.mjs';
import {router_async_receive as receive,router_cancel_new as newToken} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`export function updated(input:ReturnType<typeof copy>):ReturnType<typeof copy>{return withField(input,'new',nil());}
export function ownedText(input:ReturnType<typeof repeat>):string{return input;}
export function assembled(values:ReturnType<typeof copyValues>):ReturnType<typeof copy>{return fromValues(values);}
export function converted(input:ReturnType<typeof some>):ReturnType<typeof optionToResult>{return optionToResult(input,'missing');}
export function settled(input:Awaited<ReturnType<typeof receive>>):Awaited<ReturnType<typeof receive>>{return input;}
export function descend(input:ReturnType<typeof copy>,again:boolean):ReturnType<typeof copy>{if(again){return descend(input,false);}else{return input;}}
`;
function input(value,sourcePath='caller.mts',extra=[]){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value},...extra])};}
test('original operation queries preserve owned String JSON lists Results Options and recursive moves',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);assert.match(result.rust,/ownedText\(input: String\) -> String/u);assert.match(result.rust,/assembled\(values: ::std::vec::Vec<crate::translation_core::Json>\)/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const original=object([['old',text('é😀')]]),expected=object([['new',nil()],['old',text('é😀')]]),values=Object.freeze([nil(),text('é😀')]),missing=Object.freeze({$:'None'}),present=Object.freeze({$:'Some',field0:original}),settled=Object.freeze({$:'Ok',field0:Object.freeze({$:'Some',field0:'é😀'})});await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.updated(original),expected);assert.equal(api.ownedText('é😀'),'é😀');assert.deepEqual(api.assembled(values),array(values));assert.deepEqual(api.converted(missing),{$:'Err',field0:'missing'});assert.deepEqual(api.converted(present),{$:'Ok',field0:original});assert.deepEqual(api.settled(settled),settled);assert.deepEqual(api.descend(original,true),original);assert.deepEqual(api.descend(original,false),original);});
});
test('paired original owned annotations propose corresponding JS domains before fresh whole-body checking',limits,()=>{
 const bare=imports+'export function updated(input){return withField(input,\'new\',nil());}\n',typed=imports+'export function updated(input:ReturnType<typeof copy>){return withField(input,\'new\',nil());}\n',options=input(bare,'caller.mjs',[{path:'caller.mts',source:typed}]),unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},proposal=projectHttpResourceUnitJavaScript(bare,{unit,current:{JavaScript:bare,TypeScript:typed},options});assert.equal(proposal.history.equation.inverse,bare);const updated={...options,files:options.files.map(row=>row.path==='caller.mjs'?{path:row.path,source:proposal.source}:row)},result=translateHttpResourceCallerJavaScript(proposal.source,updated);assert.equal(JSON.parse(result.meta).functions[0].parameters[0].type,'json');
});
test('written cold future returns retain the actual deferred receive domain and polling boundary',limits,async()=>{
 const value=imports+'export function polled(receiver:Parameters<typeof receive>[0],token:Parameters<typeof receive>[1]):ReturnType<typeof receive>{return defer(async()=>{return await receive(receiver,token);});}\n',result=translateHttpResourceCallerTypeScript(value,input(value)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));await verifyHttpResourceTargets(result,async(api,{control})=>{const channel=control.router_async_channel(1n);assert.equal(channel.$,'Ok');const [sender,receiver]=channel.field0,token=control.router_cancel_new();try{const pending=api.polled(receiver,token);assert.deepEqual(await control.router_async_send(sender,'é😀',token),{$:'Ok',field0:null});assert.deepEqual(await pending,{$:'Ok',field0:{$:'Some',field0:'é😀'}});}finally{control.router_async_dispose(receiver);}});
 for(const annotation of ['Awaited<ReturnType<typeof receive>>','ReturnType<typeof copy>']){const bad=value.replace(':ReturnType<typeof receive>{',':'+annotation+'{');assert.throws(()=>translateHttpResourceCallerTypeScript(bad,input(bad)),annotation);}
});
test('complete native owned and recursive signatures reproduce all original Rust tokens',limits,()=>{
 for(const native of [
  'pub fn owned_text(input: String) -> String { input }\n',
  'pub fn assembled(values: ::std::vec::Vec<crate::translation_core::Json>) -> crate::translation_core::Json { crate::translation_state_core::json_from_values(values) }\n',
  'pub fn descend(input: crate::translation_core::Json, again: bool) -> crate::translation_core::Json { if again { descend(input, false) } else { input } }\n',
  'pub fn settled(input: Result<Option<String>, crate::translation_async_control_core::ControlError>) -> Result<Option<String>, crate::translation_async_control_core::ControlError> { input }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('query syntax cannot supply borrowed ownership resource disposal numeric guards or erased futures',limits,()=>{
 for(const body of [
  'export function bad(input:Parameters<typeof copy>[0]){return withField(input,\'new\',nil());}',
  'export function bad(input:ReturnType<typeof copy>){const first=withField(input,\'new\',nil());return withField(input,\'again\',nil());}',
  'export function bad(input:ReturnType<typeof receive>){return input;}',
  'export function bad(input:Awaited<ReturnType<typeof copy>>){return input;}',
  'export function bad(input:ReturnType<typeof length>){return input;}',
  'export function bad(input:ReturnType<typeof newToken>){return input;}',
  'export function bad(input:ReturnType<typeof copy>){return input;} export function Awaited(){return null;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='updated').parameters[0].type='json-ref';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('full original caller annotation native and paired-source substitutions retain both inverse sequences',limits,()=>{
 const plan=prepareHttpResourceOwnedSignatureSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
