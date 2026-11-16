// Independent post-test loop SOURCE. All cases remain unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceDoLoopSources} from '../../prepare-http-resource-do-loop-sources.mjs';
const limits={timeout:60000},imports="import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';\n";
const source=imports+`export function once(){let count=0n;do{count=add(count,1n);}while(false);return count;}
export function continued(){let count=0n;do{count=add(count,1n);continue;}while(count<1n);return count;}
export function nested(){let outer=0n;let inner=0n;do{outer=add(outer,1n);do{inner=add(inner,1n);continue;}while(false);continue;}while(outer<2n);return inner;}
export function branches(){let count=0n;do{count=add(count,1n);if(count===1n){continue;}if(count===3n){break;}}while(count<2n);return count;}
export function returned(){do{return true;}while(false);return false;}
export function stopped(){let count=0n;do{count=add(count,1n);break;}while(true);return count;}
export function infinite(){let count=0n;for(;;){count=add(count,1n);if(count===2n){break;}}return count;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual do loops execute once and preserve post-test continue break return and nearest nested control',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);assert.match(result.rust,/loop \{/u);assert.match(result.rust,/else \{ break; \}\ncontinue;/u);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.once(),1n);assert.equal(api.continued(),1n);assert.equal(api.nested(),2n);assert.equal(api.branches(),2n);assert.equal(api.returned(),true);assert.equal(api.stopped(),1n);assert.equal(api.infinite(),2n);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete canonical while-and-gate native inverse reproduces every original source token',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.match(native.javascript,/for \(;;\)/u);assert.equal(native.rustExecuted,false);
});
test('post-test loops retain original lexical scalar type and terminal-source refusals',limits,()=>{
 for(const body of [
  'export function bad(){let count=0n;do{count=true;}while(false);return count;}',
  'export function bad(){do{return true;}while(1n);return false;}',
  'export function bad(){outer:do{continue outer;}while(false);return null;}',
  'export function bad(){do return true;while(false);return false;}',
  'export function bad(){do{const local=true;}while(local);return null;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='continued').flow.steps.find(row=>row.kind==='do-while').condition.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original loop source copies retain exact language and repository inverses',limits,()=>{
 const plan=prepareHttpResourceDoLoopSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
