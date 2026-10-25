// Independent whole local-helper regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceLocalSources} from '../../prepare-http-resource-local-sources.mjs';
const limits={timeout:60000},imports=`import {router_text_trim as trim,router_text_repeat as repeat,router_text_strip_prefix as prefix} from './runtime/text-runtime.mjs';
import {router_http_deadline_send as send} from './runtime/http-deadline-runtime.mjs';
import {router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
`;
const body=`/** @param {string} input */ export function cleaned(input){return finish(input);}
/** @param {string} input */ export function rooted(input){return view(input);}
/** @param {string} input */ export function optional(input){return suffix(input);}
/** @param {Parameters<typeof send>[1]} client @param {Parameters<typeof send>[2]} value @param {Parameters<typeof send>[3]} token */ export function forwarded(client,value,token){return timed(client,value,token);}
/** @param {string} input */ function finish(input){return repeat(view(input),1n);}
/** @param {string} input */ function view(input){return trim(input);}
/** @param {string} input */ function suffix(input){return prefix(input,'x');}
/** @param {Parameters<typeof send>[1]} client @param {Parameters<typeof send>[2]} value @param {Parameters<typeof send>[3]} token */ function timed(client,value,token){return send(0n,client,value,token);}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('whole callee-first analysis keeps original module order and composes roots and cold futures',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.deepEqual(JSON.parse(result.meta).functions.map(row=>row.name),['cleaned','rooted','optional','forwarded','finish','view','suffix','timed']);assert.match(result.rust,/timed\(client, value, token\)\.await/u);assert.deepEqual(JSON.parse(result.meta).functions.find(row=>row.name==='rooted').flow.returnRoots,['input']);
 await verifyHttpResourceTargets(result,async(api,{transport,control})=>{assert.equal(api.cleaned(' é😀 '),'é😀');assert.equal(api.rooted(' é '),'é');assert.deepEqual(api.optional('xé'),{$:'Some',field0:'é'});const created=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(created.$,'Ok');try{assert.deepEqual(await api.forwarded(created.field0,{$:'Null'},control.router_cancel_new()),{$:'Err',field0:{$:'Timeout'}});}finally{transport.router_http_transport_client_dispose(created.field0);}});
 assert.equal(result.crossInvocationCache,false);assert.equal(result.receivingExecuted,false);assert.equal(result.rustExecuted,false);
});
test('an imported actual name cannot select a different same-spelled local helper',limits,async()=>{
 const source=imports+"/** @param {string} input */ export function chosen(input){return trim(input);}\n/** @param {string} input */ function router_text_trim(input){return repeat(input,2n);}\n",result=translateHttpResourceCallerJavaScript(source,input(source));assert.match(result.rust,/fn chosen<'a>.*translation_text_core::trim\(input\)/u);await verifyHttpResourceTargets(result,async api=>assert.equal(api.chosen(' x '),'x'));
});
test('recursive helpers unresolved callees release-state gaps and multiple-root calls retain refusals',limits,()=>{
 for(const body of [
  '/** @param {string} input */ export function recur(input){return recur(input);}',
  '/** @param {string} input */ export function first(input){return second(input);}/** @param {string} input */ function second(input){return first(input);}',
  '/** @param {string} input */ export function bad(input){return unregistered(input);}',
  '/** @param {Parameters<typeof dispose>[0]} client */ export function bad(client){return release(client);}/** @param {Parameters<typeof dispose>[0]} client */ function release(client){return dispose(client);}',
  '/** @param {string} left @param {string} right @param {boolean} choice */ export function bad(left,right,choice){return selected(left,right,choice);}/** @param {string} left @param {string} right @param {boolean} choice */ function selected(left,right,choice){if(choice){return left;}else{return right;}}',
 ]){const source=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),body);}
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),forged=JSON.parse(result.meta);forged.functions[0].flow.tail.value.local=false;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(forged),source,input(source)));
});
test('independently handwritten canonical native helpers reproduce the complete original module',limits,()=>{
 const native=`pub fn cleaned(input: &str) -> String { finish(input) }
fn finish(input: &str) -> String { crate::translation_text_core::repeat(view(input), 1_u64) }
fn view<'a>(input: &'a str) -> &'a str { crate::translation_text_core::trim(input) }
pub async fn forwarded(client: &crate::translation_http_transport_core::Client, value: &crate::translation_core::Json, token: &crate::translation_async_control_core::Cancellation) -> Result<Result<crate::translation_core::Json, String>, crate::translation_async_control_core::ControlError> { timed(client, value, token).await }
async fn timed(client: &crate::translation_http_transport_core::Client, value: &crate::translation_core::Json, token: &crate::translation_async_control_core::Cancellation) -> Result<Result<crate::translation_core::Json, String>, crate::translation_async_control_core::ControlError> { crate::translation_http_deadline_core::send(0_u64, client, value, token).await }
`,result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native));
});
test('all complete original source substitutions retain native owners both sequences and inverses',limits,()=>{
 const plan=prepareHttpResourceLocalSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
