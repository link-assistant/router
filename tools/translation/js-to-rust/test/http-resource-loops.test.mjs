// Independent complete scalar loop regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceLoopSources} from '../../prepare-http-resource-loop-sources.mjs';
const limits={timeout:60000},imports=`import {router_integer_u64_wrapping_add as add,router_integer_u64_saturating_add as increment} from './runtime/integer-runtime.mjs';
import {router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
`;
const guard=name=>'if(typeof '+name+'!=="bigint"||'+name+'<0n||'+name+'>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
const source=imports+`/** @param {bigint} limit */ export function counted(limit){${guard('limit')}let count=0n;let total=0n;while(count<limit){total=add(total,count);count=increment(count,1n);}return total;}
/** @param {bigint} limit */ export function nested(limit){${guard('limit')}let outer=0n;let total=0n;while(outer<limit){let inner=0n;while(inner<limit){total=add(total,1n);inner=increment(inner,1n);}outer=increment(outer,1n);}return total;}
export function toggled(){let pending=true;while(pending){pending=false;}return pending;}
export function empty(){while(false){}return null;}
/** @param {bigint} limit */ export function branched(limit){${guard('limit')}let count=0n;while(count<limit){if(count===0n){count=increment(count,1n);}else{count=increment(count,1n);}}return count;}
export function scopes(){let total=0n;let first=true;while(first){let value=0n;value=add(value,1n);total=add(total,value);first=false;}let second=true;while(second){const value=2n;total=add(total,value);second=false;}return total;}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('mutable scalar while fragments preserve values lexical scopes and strict receiving targets',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/let mut count = 0_u64/u);assert.match(result.rust,/while \(count < limit\)/u);assert.match(result.rust,/let mut value = 0_u64/u);assert.match(result.rust,/let value = 2_u64/u);assert.equal(result.rustExecuted,false);
 await verifyHttpResourceTargets(result,async api=>{for(const [limit,expected]of [[0n,0n],[1n,0n],[5n,10n],[10n,45n]])assert.equal(api.counted(limit),expected);for(const [limit,expected]of [[0n,0n],[1n,1n],[3n,9n]])assert.equal(api.nested(limit),expected);assert.equal(api.toggled(),false);assert.equal(api.empty(),null);assert.equal(api.branched(4n),4n);assert.equal(api.scopes(),3n);assert.throws(()=>api.counted(-1n),RangeError);});
});
test('constant parameter owned mutations abrupt exits and loopback resource changes remain refused',limits,()=>{
 for(const body of [
  'export function bad(){const count=0n;while(count<1n){count=increment(count,1n);}return count;}',
  '/** @param {boolean} pending */ export function bad(pending){while(pending){pending=false;}return pending;}',
  'export function bad(){let text="x";while(false){}return text;}',
  'export function bad(){let count=0n;while(count<1n){return count;}return count;}',
  'export function bad(){let count=0n;while(count<1n){break;}return count;}',
  'export function bad(){let count=0n;while(count<1n){continue;}return count;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} pending */ export function bad(client,pending){while(pending){dispose(client);}return null;}',
  'export function bad(){let count=0n;while(count<1n){count=true;}return count;}',
 ]){const candidate=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(candidate,input(candidate)),body);}
});
test('handwritten canonical scalar native assignments and loop blocks reproduce every original token',limits,()=>{
 const native='pub fn counted(limit: u64) -> u64 { let mut count = 0_u64; let mut total = 0_u64; while (count < limit) { total = crate::translation_integer_core::u64_wrapping_add(total, count); count = crate::translation_integer_core::u64_saturating_add(count, 1_u64); } total }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
 const changed=native.replace('let mut count','let count');assert.throws(()=>translateHttpResourceCallerRust(changed,{...input(changed,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('full original flow reader and projection sources retain ordered native substitutions and inverses',limits,()=>{
 const plan=prepareHttpResourceLoopSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
