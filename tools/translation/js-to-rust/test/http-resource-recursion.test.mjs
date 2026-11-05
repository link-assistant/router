// Independent explicit recursive signature SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceRecursiveSources} from '../../prepare-http-resource-recursive-sources.mjs';
const limits={timeout:60000},imports="import {router_text_repeat as repeat} from './runtime/text-runtime.mjs';\nimport {router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';\n";
const body=`/** @param {boolean} flag @returns {boolean} */ export function recursive(flag){if(flag){return recursive(false);}else{return true;}}
/** @param {boolean} flag @returns {boolean} */ export function first(flag){if(flag){return second(false);}else{return false;}}
/** @param {boolean} flag @returns {boolean} */ function second(flag){return first(flag);}
/** @param {string} input @param {boolean} done @returns {string} */ export function expanded(input,done){if(done){return repeat(input,1n);}else{return expanded(input,true);}}
/** @param {boolean} flag @returns {null} */ export function completed(flag){if(flag){return completed(false);}else{return null;}}
/** @param {boolean} flag @returns {bigint} */ export function amount(flag){if(flag){return amount(false);}else{return 0n;}}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('every original recursive group body satisfies its explicit scalar or owned signature under JS and strict TS',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const rows=JSON.parse(result.meta).functions;assert.ok(rows.every(row=>row.recursiveSignature!==null));assert.deepEqual(rows.map(row=>row.recursiveSignature.domain),['bool','bool','bool','text-owned','unit','u64']);assert.match(result.typescript,/recursive\(flag: boolean\): boolean/u);
 await verifyHttpResourceTargets(result,async api=>{for(const flag of [true,false]){assert.equal(api.recursive(flag),true);assert.equal(api.first(flag),false);assert.equal(api.completed(flag),null);assert.equal(api.amount(flag),0n);}assert.equal(api.expanded('é😀',false),'é😀');assert.equal(api.expanded('x',true),'x');});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('a declared return is an obligation and cannot waive missing bodies resource effects or ownership',limits,()=>{
 for(const body of [
  '/** @param {boolean} flag */ export function bad(flag){if(flag){return bad(false);}else{return true;}}',
  '/** @param {boolean} flag @returns {boolean} */ export function bad(flag){if(flag){return bad(false);}else{return 0n;}}',
  '/** @param {string} input @param {boolean} done @returns {string} */ export function bad(input,done){if(done){return input;}else{return bad(input,true);}}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} done @returns {boolean} */ export function bad(client,done){if(done){return true;}else{return bad(client,true);}}',
  '/** @param {boolean} flag @returns {number} */ export function bad(flag){if(flag){return bad(false);}else{return 0n;}}',
 ]){const source=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),body);}
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),changed=JSON.parse(result.meta);changed.functions[0].recursiveSignature.domain='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(changed),source,input(source)));
});
test('actual typed return spans erase into complete JS while canonical recursive Rust reproduces',limits,()=>{
 const native='pub fn recursive(flag: bool) -> bool { if flag { recursive(false) } else { true } }\npub fn first(flag: bool) -> bool { if flag { second(false) } else { false } }\nfn second(flag: bool) -> bool { first(flag) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/@returns \{boolean\}/u);const typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(native,typed.rust));assert.ok(JSON.parse(typed.meta).functions.every(row=>row.recursiveSignature.erase!==null));
 for(const comment of ['', '/** @returns {string} */\n']){const source=comment+'export function recursive(flag:boolean):boolean {if(flag){return recursive(false);}else{return true;}}\n',typed=translateHttpResourceCallerTypeScript(source,input(source,'caller.mts'));assert.match(typed.javascript,/@returns \{boolean\}/u);const restored=translateHttpResourceCallerJavaScript(typed.javascript,input(typed.javascript));assert.ok(sameRustSourceSyntax(typed.rust,restored.rust));assert.equal(typed.typescript,source);}
});
test('complete original grouping source adapter and inverse substitutions retain both rule sequences',limits,()=>{
 const plan=prepareHttpResourceRecursiveSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
