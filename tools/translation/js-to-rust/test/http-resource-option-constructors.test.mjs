// Independent constructor behavior SOURCE. No new case has run during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOptionConstructorSources} from '../../prepare-http-resource-option-constructors-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_option_bool_some as optional} from './runtime/primitive-option-runtime.mjs';
import {router_option_identity as carrier} from './runtime/primitive-option-runtime.mjs';
import {router_text_repeat as text} from './runtime/text-runtime.mjs';
import {router_core_json_copy as jsonCopy} from './runtime/json-update-runtime.mjs';
import {router_carrier_json_ok as jsonOk} from './runtime/owned-outcome-runtime.mjs';
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('real literal Some and contextual None preserve payload changes and generate strict literal tags',limits,async()=>{
 const source=imports+`/** @param {boolean} flag @param {boolean} value @returns {ReturnType<typeof optional>} */
export function changed(flag,value){if(flag){return {$:'Some',field0:!value};}else{return {$:'None'};}}
/** @param {boolean} flag @returns {ReturnType<typeof optional>} */
export function conditional(flag){return flag ? {$:'None'} : {$:'Some',field0:false};}
/** @returns {ReturnType<typeof carrier<ReturnType<typeof text>>>} */
export function owned(){return {$:'Some',field0:text('é😀',2n)};}
export function nested(){return {$:'Some',field0:{$:'Some',field0:true}};}
/** @param {ReturnType<typeof jsonCopy>} value */
export function list(value){return {$:'Some',field0:[value]};}
`;
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.match(result.typescript,/'Some' as const/u);assert.match(result.typescript,/'None' as const/u);assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/Some\(\(!value\)\)/u);assert.match(result.rust,/Option<Option<bool>>/u);await verifyHttpResourceTargets(result,api=>{for(const flag of [false,true])for(const value of [false,true])assert.deepEqual(api.changed(flag,value),flag?{$:'Some',field0:!value}:{$:'None'});assert.deepEqual(api.conditional(true),{$:'None'});assert.deepEqual(api.conditional(false),{$:'Some',field0:false});assert.deepEqual(api.owned(),{$:'Some',field0:'é😀é😀'});assert.deepEqual(api.nested(),{$:'Some',field0:{$:'Some',field0:true}});assert.deepEqual(api.list({nested:[17]}),{$:'Some',field0:[{nested:[17]}]});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native Some changed-payload and plain None returns reproduce complete original tokens',limits,async()=>{
 const source='pub fn changed(flag: bool, value: bool) -> Option<bool> { if flag { Some((!value)) } else { None } }\npub fn signed() -> Option<i64> { Some(-9223372036854775808_i64) }\npub fn unsigned() -> Option<u64> { Some(18446744073709551615_u64) }\npub fn nested() -> Option<Option<bool>> { Some(Some(true)) }\n',result=translateHttpResourceCallerRust(source,{...input(source,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(source,result.rust));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.changed(true,false),{$:'Some',field0:true});assert.deepEqual(api.changed(false,false),{$:'None'});assert.deepEqual(api.signed(),{$:'Some',field0:-9223372036854775808n});assert.deepEqual(api.unsigned(),{$:'Some',field0:18446744073709551615n});assert.deepEqual(api.nested(),{$:'Some',field0:{$:'Some',field0:true}});});
});
test('original if-let transformations preserve absence and compute their new Some payload',limits,async()=>{
 const source='pub fn changed(value: Option<bool>) -> Option<bool> { if let Some(payload) = value { Some(!payload) } else { return None; } }',result=translateHttpResourceShadowCallerRust(source,{...input(source,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);assert.match(result.rust,/Some\(\(!payload\)\)/u);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.changed({$:'None'}),{$:'None'});for(const value of [false,true])assert.deepEqual(api.changed({$:'Some',field0:value}),{$:'Some',field0:!value});});
});
test('contextual String-error Ok and Err constructors retain exact error and success payloads',limits,async()=>{
 const source=imports+`/** @param {boolean} flag @param {ReturnType<typeof text>} error @param {ReturnType<typeof jsonCopy>} value @returns {ReturnType<typeof jsonOk>} */
export function outcome(flag,error,value){if(flag){return {$:'Ok',field0:value};}else{return {$:'Err',field0:error};}}
`,result=translateHttpResourceCallerJavaScript(source,input(source));assert.match(result.rust,/Ok\(value\)/u);assert.match(result.rust,/Err\(error\)/u);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.outcome(true,'unused',{nested:[1]}),{$:'Ok',field0:{nested:[1]}});assert.deepEqual(api.outcome(false,'é😀',{}),{$:'Err',field0:'é😀'});});
});
test('literal tag const assertions round trip while contextual domains remain actual source obligations',limits,()=>{
 const source=imports+'export function typed(value:boolean):ReturnType<typeof optional>{return {$:"Some" as const,field0:!value};}\nexport function absent():ReturnType<typeof optional>{return {$:"None" as const};}\n',result=translateHttpResourceCallerTypeScript(source,input(source,'caller.mts')),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript));assert.doesNotMatch(result.javascript,/as const/u);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 for(const body of ['return {$:"None"};','return {$:"Some"};','return {$:"None",field0:true};','return {$:"Some",field0:true,extra:1};','return {get $(){return "Some"},field0:true};','return {["$"]:"Some",field0:true};','return {$:"Some" as string,field0:true};','return {$:"Other",field0:true};','return {$:"Ok",field0:true};','return {$:"Err",field0:"borrowed"};']){const value=imports+'export function bad(){'+body+'}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value,'caller.mts')),body);}
 const mismatch=imports+'export function bad():ReturnType<typeof optional>{return {$:"Some",field0:1n};}';assert.throws(()=>translateHttpResourceCallerTypeScript(mismatch,input(mismatch,'caller.mts')));
});
test('whole source joins and semantic meta remain independent of public literal constructor records',limits,()=>{
 const source=imports+'/** @returns {ReturnType<typeof optional>} */ export function make(){return {$:"Some",field0:true};}',result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions[0].flow.tail.value.value.value=false;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));const changed=input(source);changed.files=changed.files.map(row=>row.path==='caller.mjs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerJavaScript(source,changed));
});
test('seven complete original compiler equations retain native owners two ordered phases and full inverses',limits,()=>{
 const plan=prepareHttpResourceOptionConstructorSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
