// Independent all-width strict counter/for rules SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareResourceWidthLoopSources} from '../../prepare-resource-width-loop-sources.mjs';
const limits={timeout:60000},widths=[['u8',0n,255n],['u16',0n,65535n],['u32',0n,4294967295n],['u64',0n,18446744073709551615n],['u128',0n,340282366920938463463374607431768211455n],['i8',-128n,127n],['i16',-32768n,32767n],['i32',-2147483648n,2147483647n],['i64',-9223372036854775808n,9223372036854775807n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]],imports=widths.map(([type])=>'import {router_integer_'+type+'_saturating_add as add_'+type+'} from "./runtime/integer-runtime.mjs";').join('
')+'
';
const source=imports+widths.map(([type,minimum,maximum])=>`export function upper_${type}():ReturnType<typeof add_${type}>{let count=0n;for(let index:ReturnType<typeof add_${type}> = ${maximum-1n}n;index<${maximum}n;index++){count=add_${type}(count,1n);}return count;}
export function lower_${type}():ReturnType<typeof add_${type}>{let count=0n;for(let index:ReturnType<typeof add_${type}> = ${minimum+1n}n;index>${minimum}n;--index){count=add_${type}(count,1n);}return count;}
export function continued_${type}():ReturnType<typeof add_${type}>{let count=0n;for(let index:ReturnType<typeof add_${type}> = 0n;index<3n;++index){if(index===1n){continue;}count=add_${type}(count,1n);}return count;}
`).join('
');
const input=(value=source,sourcePath='caller.mts')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('thirty actual all-width upper/lower/continue loops receive JS strict TS and complete native inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));const rows=JSON.parse(result.meta).functions;for(const [type]of widths){const row=rows.find(row=>row.name==='upper_'+type),loop=row.flow.steps.find(row=>row.kind==='scalar-for');assert.equal(loop.initializer.value.type,type);assert.equal(loop.increment.value.operation,'router_integer_'+type+'_saturating_add');}
 await verifyHttpResourceTargets(result,api=>{for(const [type]of widths){assert.equal(api['upper_'+type](),1n);assert.equal(api['lower_'+type](),1n);assert.equal(api['continued_'+type](),2n);}});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('all-width unit updates still require strict bounds live mutable counters immutable limits and unassigned bodies',limits,()=>{
 for(const [type,,maximum]of widths)for(const body of [
  'for(let index:ReturnType<typeof add_'+type+'>='+maximum+'n;index<='+maximum+'n;index++){}',
  'for(let index:ReturnType<typeof add_'+type+'>=0n;;index++){}',
  'for(let index:ReturnType<typeof add_'+type+'>=0n;index<3n;index++){index=2n;}',
  'for(const index:ReturnType<typeof add_'+type+'>=0n;index<3n;index++){}',
  'let bound:ReturnType<typeof add_'+type+'>=3n;for(let index:ReturnType<typeof add_'+type+'>=0n;index<bound;index++){bound=2n;}',
 ]){const value=imports+'export function bad(){'+body+'return null;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),type);}
});
test('native integer update and original counter metadata cannot be forged or replayed for a changed source',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta),loop=meta.functions.find(row=>row.name==='upper_i8').flow.steps.find(row=>row.kind==='scalar-for');loop.increment.value.operation='router_integer_i16_saturating_add';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));const changed=source.replace('index<3n','index<=3n');assert.throws(()=>readHttpResourceCallerMeta(result.meta,changed,input(),{language:'TypeScript'}));
});
test('three full source equations preserve original range/counter obligations native selected owners two phases and inverses',limits,()=>{
 const plan=prepareResourceWidthLoopSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
