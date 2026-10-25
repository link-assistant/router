// Independent written-return and cold generic regression SOURCE. All unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceColdReturnTypeSources} from '../../prepare-http-resource-cold-return-type-sources.mjs';
const limits={timeout:60000},imports="import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';\nimport {router_text_repeat as repeat} from './runtime/text-runtime.mjs';\n";
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('ordinary original JavaScript return docs remain actual whole-body obligations',limits,async()=>{
 const source='/** @param {string} input @returns {string} */ export function chosen(input){return input;}\n/** @returns {boolean} */ export function truth(){return true;}\n',result=translateHttpResourceCallerJavaScript(source,input(source));assert.equal(result.javascript,source);await verifyHttpResourceTargets(result,async api=>{assert.equal(api.chosen('é😀'),'é😀');assert.equal(api.truth(),true);});
 for(const source of ['/** @returns {boolean} */ export function bad(){return 1n;}','/** @returns {bigint} */ export function bad(){return true;}','/** @returns {number} */ export function bad(){return 0n;}'])assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),source);
});
test('original deferred generic declarations preserve complete settled value types in JS and TS',limits,async()=>{
 const source=imports+'/** @returns {ReturnType<typeof defer<boolean>>} */ export function chosen(){return defer(async()=>{return true;});}\n',result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.ok(result.nativeSourceInputs.some(row=>row.kind==='original-cold-flow-type-declaration'));
 await verifyHttpResourceTargets(result,async(api,{filesystem})=>{assert.equal(await api.chosen(),true);let calls=0;const pending=filesystem.deferFilesystemFlow(async()=>{calls++;return 'é😀';});assert.equal(calls,0);assert.equal(await pending,'é😀');assert.equal(calls,1);});
 const templated=imports+'type Cold<Value>=ReturnType<typeof defer<Value>>;export function chosen():Cold<boolean>{return defer(async()=>{return true;});}\n';const fromTemplate=translateHttpResourceCallerTypeScript(templated,input(templated,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,fromTemplate.rust));assert.ok(sameRustSourceSyntax(fromTemplate.rust,translateHttpResourceCallerJavaScript(fromTemplate.javascript,input(fromTemplate.javascript)).rust));
});
test('complete native async scalar and owning returns emit genuine cold future docs',limits,async()=>{
 for(const native of ['pub async fn chosen() -> bool { true }\n','pub async fn chosen(input: &str) -> String { crate::translation_text_core::repeat(input, 2_u64) }\n']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/@returns \{ReturnType<typeof /u);const restored=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript));assert.ok(sameRustSourceSyntax(native,restored.rust));await verifyHttpResourceTargets(result,async api=>{assert.equal(await api.chosen('é😀'),native.includes('String')?'é😀é😀':true);});assert.equal(result.rustExecuted,false);}
});
test('future/value erasure fake generic operations and changed declarations refuse',limits,()=>{
 for(const body of [
  '/** @returns {boolean} */ export function bad(){return defer(async()=>{return true;});}',
  '/** @returns {ReturnType<typeof defer<boolean>>} */ export function bad(){return true;}',
  '/** @returns {ReturnType<typeof defer<string>>} */ export function bad(){return defer(async()=>{return true;});}',
  '/** @returns {ReturnType<typeof repeat<boolean>>} */ export function bad(){return repeat(\'x\',1n);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const source=imports+'/** @returns {ReturnType<typeof defer<boolean>>} */ export function chosen(){return defer(async()=>{return true;});}\n',path='runtime/extensions/filesystem-effects-runtime.d.mts';for(const change of ['missing','changed']){const options=input(source);options.files=options.files.flatMap(row=>row.path!==path?[row]:change==='missing'?[]:[{...row,source:row.source+'\n// changed\n'}]);assert.throws(()=>translateHttpResourceCallerJavaScript(source,options),change);}
});
test('all complete original cold-return substitutions keep source inverses and fixed phases',limits,()=>{
 const plan=prepareHttpResourceColdReturnTypeSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.semanticAuthority,false);
});
