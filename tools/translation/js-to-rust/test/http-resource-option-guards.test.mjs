// Independent complete Option branch regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOptionSources} from '../../prepare-http-resource-option-sources.mjs';
const limits={timeout:60000},imports=`import {router_text_find as find,router_text_strip_prefix as prefix} from './runtime/text-runtime.mjs';
import {router_owned_result_u64_ok as ok,router_owned_result_u64_err as error} from './runtime/owned-result-runtime.mjs';
import {router_carrier_json_none as none,router_carrier_json_some as some,router_carrier_json_err as jsonError,router_carrier_json_ok as jsonOk} from './runtime/owned-outcome-runtime.mjs';
import {router_http_transport_client_new as create,router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
`;
const source=imports+`/** @param {string} input */ export function searched(input){const found=find(input,'é');if(found.$==='None'){return error('absent');}return ok(found.field0);}
/** @param {string} input */ export function stripped(input){const found=prefix(input,'x');if(found.$==='None'){return found;}return found;}
export function absent(){const created=create(0n,0n,0n,'');if(created.$==='Err'){return created;}const client=created.field0;const value=none();if(value.$==='None'){dispose(client);return jsonError('absent');}const payload=value.field0;dispose(client);return jsonOk(payload);}
/** @param {Parameters<typeof some>[0]} input */ export function present(input){const created=create(0n,0n,0n,'');if(created.$==='Err'){return created;}const client=created.field0;const value=some(input);if(value.$!=='Some'){dispose(client);return jsonError('absent');}const payload=value.field0;dispose(client);return jsonOk(payload);}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('None fallback and Some payload move retain native cleanup and JS plus strict TS behavior',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/Some\(__ro_http_some\)/u);assert.match(result.rust,/strip_prefix\(input, "x"\)\?/u);assert.equal(result.rustExecuted,false);
 await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.searched('aé😀'),{$:'Ok',field0:1n});assert.deepEqual(api.searched('none'),{$:'Err',field0:'absent'});assert.deepEqual(api.stripped('xé'),{$:'Some',field0:'é'});assert.deepEqual(api.stripped('é'),{$:'None'});for(let at=0;at<40;at++){assert.deepEqual(api.absent(),{$:'Err',field0:'absent'});assert.deepEqual(api.present({$:'Null'}),{$:'Ok',field0:{$:'Null'}});}});
});
test('wrong tags missing cleanup mixed fallback domains and repeated Option moves refuse',limits,()=>{
 for(const body of [
  "/** @param {string} input */ export function bad(input){const found=find(input,'é');if(found.$==='Err'){return error('absent');}return ok(found.field0);}",
  "/** @param {string} input */ export function bad(input){const found=find(input,'é');if(found.$==='None'){return true;}return ok(found.field0);}",
  "export function bad(){const created=create(0n,0n,0n,'');if(created.$==='Err'){return created;}const client=created.field0;const value=none();if(value.$==='None'){return jsonError('absent');}const payload=value.field0;dispose(client);return jsonOk(payload);}",
  "/** @param {string} input */ export function bad(input){const found=prefix(input,'x');if(found.$==='None'){return found;}const first=found;return found;}",
 ]){const candidate=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(candidate,input(candidate)),body);}
});
test('handwritten Option question propagation and canonical fallback reproduce every native token',limits,()=>{
 const native=`pub fn stripped<'a>(input: &'a str) -> Option<&'a str> { let found = crate::translation_text_core::strip_prefix(input, "x")?; Some(found) }
pub fn searched(input: &str) -> Result<u64, String> { let found = match crate::translation_text_core::find(input, "é") { Some(__ro_http_some) => __ro_http_some, None => { return { crate::translation_owned_results_core::u64_err("absent") }; } }; crate::translation_owned_results_core::u64_ok(found) }
`,result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
 const changed=native.replace('Some(__ro_http_some) => __ro_http_some','Some(other) => other');assert.throws(()=>translateHttpResourceCallerRust(changed,{...input(changed,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('complete original forward inverse and parent substitutions retain both source sequences',limits,()=>{
 const plan=prepareHttpResourceOptionSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
