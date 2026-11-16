// Independent scoped-continuation regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceScopedBranchSources} from '../../prepare-http-resource-scoped-branch-sources.mjs';
const limits={timeout:60000},imports=`import {router_integer_u64_wrapping_add as add,router_integer_u64_saturating_add as increment} from './runtime/integer-runtime.mjs';
import {router_owned_result_u64_err as error} from './runtime/owned-result-runtime.mjs';
import {router_http_transport_client_new as create,router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
`;
const source=imports+`/** @param {boolean} choice */ export function adjusted(choice){let total=0n;if(choice){const delta=2n;total=add(total,delta);}else{const delta=3n;total=add(total,delta);}const delta=7n;return add(total,delta);}
/** @param {boolean} choice */ export function lexical(choice){if(choice){let value=0n;value=increment(value,1n);}const value=4n;return value;}
/** @param {boolean} choice */ export function nested(choice){let value=1n;if(choice){if(choice){const delta=2n;value=add(value,delta);}}else{value=increment(value,1n);}return value;}
/** @param {boolean} choice */ export function shortForm(choice){let value=0n;if(choice)value=1n;else if(!choice)value=2n;return value;}
/** @param {boolean} choice */ export function early(choice){if(choice)return 3n;return 4n;}
/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function released(client,choice){return releaseBoth(client,choice);}
/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ function releaseBoth(client,choice){if(choice){dispose(client);}else{dispose(client);}return null;}
/** @param {boolean} choice */ export function scopedClient(choice){if(choice){const made=create(0n,0n,0n,'');if(made.$==='Err'){return made;}const client=made.field0;dispose(client);}return error('done');}
`;
function input(text,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:text}])};}
test('actual lexical blocks continuing mutations single statements else-if and cleanup agree in JS and strict TS',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/let mut value = 0_u64/u);assert.match(result.rust,/let value = 4_u64/u);assert.doesNotMatch(result.rust,/let mut value = 4_u64/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 await verifyHttpResourceTargets(result,async(api,{transport})=>{for(const choice of [false,true]){assert.equal(api.adjusted(choice),choice?9n:10n);assert.equal(api.lexical(choice),4n);assert.equal(api.nested(choice),choice?3n:2n);assert.equal(api.shortForm(choice),choice?1n:2n);assert.equal(api.early(choice),choice?3n:4n);assert.deepEqual(api.scopedClient(choice),{$:'Err',field0:'done'});const client=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(client.$,'Ok');assert.equal(api.released(client.field0,choice),null);}});
});
test('only incoming bindings continue and scope exit states never become function exits',limits,()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),data=JSON.parse(result.meta),fn=data.functions.find(row=>row.name==='adjusted'),branch=fn.flow.steps.find(row=>row.kind==='scoped-if');for(const arm of [branch.yes,branch.no]){assert.equal(arm.resourceExits.length,0);assert.equal(arm.loopExits.length,0);assert.equal(arm.scopeFallthroughs.length,1);assert.deepEqual(arm.scopeFallthroughs[0].map(([name])=>name),['choice','total']);}assert.deepEqual(data.functions.find(row=>row.name==='releaseBoth').flow.resourceExits,[[{name:'client',disposed:true}]]);
 branch.yes.scopeFallthroughs[0].push(['delta',{type:'u64',input:false}]);assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(data),source,input(source)));
});
test('escaped locals conditional moves mismatched releases use-after-release and leaked scoped resources refuse',limits,()=>{
 for(const body of [
  '/** @param {boolean} choice */ export function bad(choice){if(choice){const hidden=1n;}return hidden;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function bad(client,choice){if(choice){dispose(client);}return null;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function bad(client,choice){if(choice){dispose(client);}else{dispose(client);}return dispose(client);}',
  '/** @param {boolean} choice */ export function bad(choice){if(choice){const made=create(0n,0n,0n,\'\');if(made.$===\'Err\'){return made;}const client=made.field0;}return error(\'done\');}',
  '/** @param {boolean} choice */ export function bad(choice){if(choice){return 1n;}else{return 2n;}return 3n;}',
 ]){const text=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(text,input(text)),body);}
});
test('whole handwritten canonical native scoped assignments and declarations reproduce every token',limits,()=>{
 const native='pub fn selected(choice: bool) -> u64 { let mut total = 0_u64; if choice { let delta = 2_u64; total = crate::translation_integer_core::u64_wrapping_add(total, delta); } else { let delta = 3_u64; total = crate::translation_integer_core::u64_wrapping_add(total, delta); } let delta = 7_u64; crate::translation_integer_core::u64_wrapping_add(total, delta) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('complete original flow projection and adjacent recipes preserve native owner boundaries and both inverses',limits,()=>{
 const plan=prepareHttpResourceScopedBranchSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
