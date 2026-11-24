// Independent conditional value source regressions. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceConditionalValueSources} from '../../prepare-http-resource-conditional-value-sources.mjs';
const limits={timeout:60000},imports=`import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_text_repeat as repeat} from './runtime/text-runtime.mjs';
import {router_owned_result_u64_err as err,router_owned_result_u64_unwrap as unwrap} from './runtime/owned-result-runtime.mjs';
`;
const source=imports+`export function count(flag:boolean){const selected=flag?2n:5n;return selected;}
export function borrowed(flag:boolean,left:string,right:string){return flag?left:right;}
export function repeated(flag:boolean,left:string,right:string){return repeat(flag?left:right,2n);}
export function copied(flag:boolean,left:Parameters<typeof copy>[0],right:Parameters<typeof copy>[0]){return copy(flag?copy(left):copy(right));}
export function moved(flag:boolean,value:ReturnType<typeof copy>){return flag?value:value;}
export function selected(flag:boolean){return flag?7n:unwrap(err('selected failure'));}
export function nested(flag:boolean){return (flag?true:false)?1n:9n;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('conditional returns locals and arguments evaluate only the selected actual source arm',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);const borrowed=JSON.parse(result.meta).functions.find(row=>row.name==='borrowed');assert.deepEqual(borrowed.flow.returnRoots,['left','right']);
 await verifyHttpResourceTargets(result,async api=>{for(const flag of [true,false]){assert.equal(api.count(flag),flag?2n:5n);assert.equal(api.borrowed(flag,'é','😀'),flag?'é':'😀');assert.equal(api.repeated(flag,'é','😀'),flag?'éé':'😀😀');assert.deepEqual(api.copied(flag,{$:'Null'},{$:'String',field0:'é😀'}),flag?{$:'Null'}:{$:'String',field0:'é😀'});assert.deepEqual(api.moved(flag,{$:'Null'}),{$:'Null'});assert.equal(api.nested(flag),flag?1n:9n);}assert.equal(api.selected(true),7n);assert.throws(()=>api.selected(false),/selected failure/u);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete canonical native conditional initializers arguments and returned roots round trip',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.match(native.javascript,/ \? /u);for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
});
test('conditional arm types moves and public metadata cannot waive complete incoming state joins',limits,()=>{
 for(const body of [
  'export function bad(flag:boolean){return flag?1n:true;}',
  'export function bad(){return 1n?true:false;}',
  'export function bad(flag:boolean,value:ReturnType<typeof copy>){const selected=flag?value:copy(value);return value;}',
  'export function bad(flag:boolean,left:ReturnType<typeof copy>,right:ReturnType<typeof copy>){return flag?left:right;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='borrowed').flow.tail.value.roots=['left'];assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original conditional source families retain both ordered rule sequences and inverses',limits,()=>{
 const plan=prepareHttpResourceConditionalValueSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
