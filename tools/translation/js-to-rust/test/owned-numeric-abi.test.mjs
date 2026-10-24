// Independent regression SOURCE; run only after the entire bulk draft exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript,translateOwnedStateTypeScript,prepareOwnedStateRuntime,evaluateOwnedState,evaluateOwnedStateBatch} from '../owned-state.mjs';
import {translateOwnedStateRust} from '../owned-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedNumericAbi} from '../../prepare-owned-numeric-abi.mjs';
import {prepareOwnedStateFlow} from '../../prepare-owned-state-flow.mjs';
import {json_macro_null as nil,json_macro_string as string,json_macro_object as object,json_macro_i64 as signed} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {json_macro_null as nil,json_macro_i64 as signed,json_macro_u64 as unsigned} from './runtime/json-macro-runtime.mjs';
import {router_core_json_map_index as lookup} from './runtime/json-update-runtime.mjs';
import {serde_json_value_as_i64 as readSigned,serde_json_value_as_u64 as readUnsigned} from './runtime/json-runtime.mjs';
`;
const source=imports+`
/** @param {Parameters<typeof signed>[0]} value */
export function signedJson(value){return signed(value);}
export function minimum(){return signed(-9223372036854775808n);}
/** @returns {Parameters<typeof signed>[0]} */
export function maximum(){const observed=nil();return 9223372036854775807n;}
/** @param {boolean} choose @returns {Parameters<typeof signed>[0]} */
export function chooseSigned(choose){const observed=nil();return choose ? -1n : 1n;}
/** @param {boolean} choose */
export function joinSigned(choose){const observed=nil();if(choose){return -1n;}return 0n;}
/** @returns {ReturnType<typeof readSigned>} */
export function signedSome(){const observed=nil();return {$:'Some',field0:1n};}
/** @returns {ReturnType<typeof readUnsigned>} */
export function unsignedSome(){const observed=nil();return {$:'Some',field0:18446744073709551615n};}
/** @returns {Parameters<typeof signed>[0]} */
export function zero(){const observed=nil();return -0n;}
/** @param {Parameters<typeof lookup>[0]} values @param {string} key */
export function mapValue(values,key){return lookup(values,key);}
`;
function input(text=source,path='caller.mjs'){return ownedStateReceivingData([{path,source:text}]);}
function draft(){const data=input(),context=createOwnedStateContext(data),result=translateOwnedStateJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
async function modules(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-numeric-abi-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};
 for(const file of row.data.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});
 for(const file of row.data.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('signed endpoints typed returns Option payloads and map loans agree in actual JS strict TS and both interpreters',limits,async t=>{
 const row=draft(),targets=await modules(t,row),token=await prepareOwnedStateRuntime(row.result.program),map=object([['λ😀',string('value')]]).field0;
 const requests=[['signedJson',[-9223372036854775808n],signed(-9223372036854775808n)],['minimum',[],signed(-9223372036854775808n)],['maximum',[],9223372036854775807n],['chooseSigned',[true],-1n],['chooseSigned',[false],1n],['joinSigned',[true],-1n],['joinSigned',[false],0n],['signedSome',[],{$:'Some',field0:1n}],['unsignedSome',[],{$:'Some',field0:18446744073709551615n}],['zero',[],0n],['mapValue',[map,'λ😀'],string('value')],['mapValue',[map,'missing'],nil()]];
 for(const target of targets)for(const [name,args,expected]of requests)assert.deepEqual(target[name](...args),expected);assert.deepEqual(requests.map(([name,args])=>evaluateOwnedState(row.result.program,name,args,token)),requests.map(row=>row[2]));assert.deepEqual(evaluateOwnedStateBatch(row.result.program,requests.map(([name,args])=>[name,args]),token),requests.map(row=>row[2]));
});
test('actual emitted TS and canonical Rust recheck the complete signed and map ABI',limits,()=>{
 const row=draft(),typed=translateOwnedStateTypeScript(row.result.typescript,{context:createOwnedStateContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedStateRust(row.result.rust,{context:createOwnedStateContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);assert.match(row.result.typescript,/Parameters<typeof __ro_json_macro_i64>\[0\]/u);assert.match(row.result.typescript,/Parameters<typeof __ro_router_core_json_map_index>\[0\]/u);
});
test('overflow bare bigint unbound operation indices and arbitrary unary arithmetic refuse',limits,()=>{
 const bodies=['export function invalid(){return signed(-9223372036854775809n);}','/** @returns {Parameters<typeof signed>[0]} */ export function invalid(){const value=nil();return 9223372036854775808n;}','/** @returns {Parameters<typeof unsigned>[0]} */ export function invalid(){const value=nil();return -1n;}','/** @param {bigint} value */ export function invalid(value){return signed(value);}','/** @param {Parameters<typeof signed>[0]} value */ export function invalid(value){return signed(-value);}','/** @param {Parameters<typeof signed>[1]} value */ export function invalid(value){return signed(value);}'];
 for(const body of bodies){const text=imports+body,context=createOwnedStateContext(input(text));assert.throws(()=>translateOwnedStateJavaScript(text,{context,sourcePath:'caller.mjs'}));}
 const text=imports+'type Parameters<T>=[bigint];export function invalid(value:Parameters<typeof signed>[0]){return signed(value);}',context=createOwnedStateContext(input(text,'caller.mts'));assert.throws(()=>translateOwnedStateTypeScript(text,{context,sourcePath:'caller.mts'}));
 const row=draft();for(const [from,to]of [['-9223372036854775808_i64','-9223372036854775809_i64'],['9223372036854775807_i64','9223372036854775808_i64']]){const rust=row.result.rust.replace(from,to);assert.notEqual(rust,row.result.rust);const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:rust}]};assert.throws(()=>translateOwnedStateRust(rust,{context:createOwnedStateContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));}
});
test('all complete source histories compose the same adjacent CST successors',limits,()=>{
 const numeric=prepareOwnedNumericAbi(),flow=prepareOwnedStateFlow();assert.equal(numeric.files.length,7);for(const row of numeric.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}for(const path of ['tools/translation/js-to-rust/owned-state-source.mjs','tools/translation/js-to-rust/owned-state-operations.mjs','tools/translation/js-to-rust/owned-rust-syntax.mjs','tools/translation/js-to-rust/owned-rust-projection.mjs']){const row=flow.files.find(row=>row.path===path);assert.ok(row);assert.equal(row.current,row.currentAfter);}
});
