// Independent consuming text reverse/ownership/canonical source SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},imports=`import {router_text_to_owned as copy,router_text_append_owned as append,router_text_clear_owned as clear,router_text_trim as trim} from './runtime/text-runtime.mjs';
`,source=imports+`export function built(input:string){let value=copy("prefix:");value=append(value,input);return value;}
export function cleared(input:string){let value=copy(input);value=clear(value);value=append(value,"é😀");return value;}
export function consumed(input:ReturnType<typeof copy>,suffix:string){return append(input,suffix);}
`;
function input(value=source,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('consuming text source checks both language directions preserves state and reproduces the complete canonical native module',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),js=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,js.rust));assert.ok(result.rust.includes('crate::translation_text_core::append_owned(value, input)'));assert.ok(result.rust.includes('crate::translation_text_core::clear_owned(value)'));const native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'roundtrip.mjs'});assert.ok(sameRustSourceSyntax(native.rust,result.rust));await verifyHttpResourceTargets(result,async api=>{for(const value of ['','é😀','a\0b']){assert.equal(api.built(value),'prefix:'+value);assert.equal(api.cleared(value),'é😀');assert.equal(api.consumed(value,'tail'),value+'tail');}});
});
test('live borrowed views double use and borrowed primitive inputs cannot manufacture an owned consuming argument',limits,()=>{
 for(const body of ['export function bad(value:string){return append(value,"tail");}','export function bad(){const value=copy("x");const first=append(value,"tail");return append(value,"again");}','export function bad(){let value=copy(" x ");const view=trim(value);value=append(value,"tail");return copy(view);}']){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)));}const result=translateHttpResourceCallerTypeScript(source,input()),forged=JSON.parse(result.meta);forged.functions[0].flow.type='str';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(forged),source,input(),{language:'TypeScript'}));
});
