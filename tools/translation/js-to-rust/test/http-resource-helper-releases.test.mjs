// Independent all-exit helper release SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceReleaseSources} from '../../prepare-http-resource-release-sources.mjs';
const limits={timeout:60000},imports=`import {router_http_transport_client_new as create,router_http_transport_client_clone as clone,router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
import {router_carrier_json_err as error} from './runtime/owned-outcome-runtime.mjs';
`;
const source=imports+`export function closed(){const created=create(0n,0n,0n,'');if(created.$==='Err'){return created;}const client=created.field0;release(client);return error('closed');}
export function duplicated(){const created=create(0n,0n,0n,'');if(created.$==='Err'){return created;}const client=created.field0;const result=clone(client);if(result.$==='Err'){release(client);return result;}release(client);return result;}
/** @param {Parameters<typeof dispose>[0]} client */ export function released(client){return release(client);}
/** @param {Parameters<typeof dispose>[0]} client */ function release(client){return dispose(client);}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('complete actual helper release states permit owned cleanup and original error branches',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const rows=JSON.parse(result.meta).functions;assert.deepEqual(rows.find(row=>row.name==='release').flow.resourceExits,[[{name:'client',disposed:true}]]);assert.deepEqual(rows.find(row=>row.name==='released').flow.resourceExits,[[{name:'client',disposed:true}]]);assert.match(result.rust,/release\(&mut client\)/u);
 await verifyHttpResourceTargets(result,async(api,{transport})=>{for(let at=0;at<40;at++){assert.deepEqual(api.closed(),{$:'Err',field0:'closed'});const copied=api.duplicated();assert.equal(copied.$,'Ok');assert.equal(api.released(copied.field0),null);}const created=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(created.$,'Ok');assert.equal(api.released(created.field0),null);});
 assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('partial releases reused released inputs aliasing and forged exit metadata cannot qualify',limits,()=>{
 for(const body of [
  '/** @param {Parameters<typeof dispose>[0]} client */ export function bad(client){const value=release(client);return clone(client);}/** @param {Parameters<typeof dispose>[0]} client */ function release(client){return dispose(client);}',
  '/** @param {Parameters<typeof dispose>[0]} client */ export function bad(client){return partial(client,true);}/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ function partial(client,choice){if(choice){return dispose(client);}else{return null;}}',
  '/** @param {Parameters<typeof dispose>[0]} client */ export function bad(client){return both(client,client);}/** @param {Parameters<typeof dispose>[0]} left @param {Parameters<typeof dispose>[0]} right */ function both(left,right){dispose(left);return dispose(right);}',
 ]){const candidate=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(candidate,input(candidate)));}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),data=JSON.parse(result.meta);data.functions.find(row=>row.name==='release').flow.resourceExits[0][0].disposed=false;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(data),source,input(source)));
});
test('whole handwritten canonical native release calls reproduce through fresh source checking',limits,()=>{
 const native='pub fn released(client: &mut crate::translation_http_transport_core::Client) -> () { release(&mut *client) }\nfn release(client: &mut crate::translation_http_transport_core::Client) -> () { crate::translation_http_transport_core::client_dispose(&mut *client) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native));
});
test('all complete original source substitutions retain ordered native selection and inverses',limits,()=>{
 const plan=prepareHttpResourceReleaseSources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
