// Independent complete for-header SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceForHeaderSources} from '../../prepare-http-resource-for-header-sources.mjs';
const limits={timeout:60000};
const imports="import {router_integer_u64_saturating_add as add,router_integer_i64_saturating_add as signedAdd,router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';\n";
const source=imports+`export function assigned(){let count=0n;for(let index=0n;index<3n;index=add(index,1n)){count=add(count,1n);}return count;}
export function continued(){let count=0n;for(let index=0n;index<4n;index++){if(index===1n){continue;}count=add(count,1n);}return count;}
export function scoped(){let count=0n;for(let index=0n;index<3n;++index){{if(index===1n){continue;}}count=add(count,1n);}return count;}
export function stopped(){let count=0n;for(let index=0n;index<3n;index++){count=add(count,1n);break;}return count;}
export function nested(){let count=0n;for(let index=0n;index<2n;index++){for(let inner=0n;inner<2n;inner++){if(inner===0n){continue;}count=add(count,1n);}continue;}return count;}
export function returned(){for(let index=0n;index<3n;index++){return index;}return 9n;}
export function omitted(){let index=0n;for(;index<2n;index=add(index,1n)){}return index;}
export function unconditioned(){let index=0n;for(index=0n;;index=add(index,1n)){if(index===2n){break;}}return index;}
export function repeated(){let count=0n;for(let index=0n;index<2n;index++){count=add(count,1n);}for(let index=0n;index<2n;index++){count=add(count,1n);}return count;}
export function upper(){let count=0n;for(let index=18446744073709551614n;index<18446744073709551615n;index++){count=add(count,1n);}return count;}
export function lower(){let count=0n;for(let index=1n;index>0n;--index){count=add(count,1n);}return count;}
export function signedLoop():ReturnType<typeof signed>{let count=0n;for(let index=-2n;index<1n;index++){count=signedAdd(count,1n);}return count;}
export function signedLower(){let count=0n;for(let index=-9223372036854775807n;index> -9223372036854775808n;index--){count=add(count,1n);}return count;}
export function zero(){let count=0n;for(let index=18446744073709551615n;index<18446744073709551615n;index++){count=add(count,1n);}return count;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual scalar for headers preserve update order scope and every nearest control path',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));
 assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const [name,expected]of Object.entries({assigned:3n,continued:3n,scoped:2n,stopped:1n,nested:2n,returned:0n,omitted:2n,unconditioned:2n,repeated:4n,upper:1n,lower:1n,signedLoop:3n,signedLower:1n,zero:0n}))assert.equal(api[name](),expected,name);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='signedLoop').flow.steps[0].value.type,'i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native scoped while and repeated continue updates reproduce every complete original Rust token',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),inverse=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});
 assert.ok(sameRustSourceSyntax(translated.rust,inverse.rust));assert.equal(inverse.rustExecuted,false);
});
test('unit counter update requires actual strict bounds immutable limits and an unassigned body',limits,()=>{
 for(const body of [
  'export function bad(){for(let index=0n;index<=18446744073709551615n;index++){}return null;}',
  'export function bad(){for(let index=0n;;index++){}return null;}',
  'export function bad(){for(let index=0n;index<3n;index++){index=18446744073709551615n;}return null;}',
  'export function bad(){for(let index=0n;index<3n;index++){{index=1n;}}return null;}',
  'export function bad(){let limit=3n;for(let index=0n;index<limit;index++){limit=0n;}return null;}',
  'export function bad(){for(const index=0n;index<3n;index++){}return null;}',
  'export function bad(){for(let index=0n;index<3n;index++){}return index;}',
  'export function bad(){for(var index=0n;index<3n;index=add(index,1n)){}return null;}',
  'export function bad(){for(let index=0n,index=0n;index<3n;index=add(index,1n)){}return null;}',
  'export function bad(){for(let index=0n;index<3n;index=true){}return null;}',
  'export function bad(){for(let index=0n;index>0n;index++){}return null;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);
 meta.functions.find(row=>row.name==='continued').flow.steps.find(row=>row.kind==='scalar-for').increment.value.args[1].value='2';
 assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete for header source copies retain every original and both ordered substitution sequences',limits,()=>{
 const plan=prepareHttpResourceForHeaderSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
