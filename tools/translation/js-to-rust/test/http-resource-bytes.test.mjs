// Independent octet/resource composition SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceByteSources} from '../../prepare-http-resource-byte-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {std_fs_read as read,tokio_fs_read as asyncRead,deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_core_json_parse_bytes as parseBytes} from './runtime/json-update-runtime.mjs';
`;
const owned="Extract<ReturnType<typeof read>, {$: 'Ok'}>['field0']",source=imports+`export function raw(path:string){return read(path);}
export function asyncRaw(path:string){return defer(async()=>{return await asyncRead(path);});}
export function parsed(bytes:Parameters<typeof parseBytes>[0]){return parseBytes(bytes);}
export function identity(bytes:${owned}):${owned}{return bytes;}
export function borrowed(bytes:Parameters<typeof parseBytes>[0]){return bytes;}
export function localView(bytes:${owned}){const view=borrowed(bytes);return parseBytes(view);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
const octets=value=>Object.freeze([...new TextEncoder().encode(value)].map(value=>BigInt(value)));
test('actual filesystem octets and shared JSON byte parsing preserve Unicode null invalid UTF8 and empty input',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/::std::vec::Vec<u8>/u);assert.match(result.rust,/bytes: &\[u8\]/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const valid=octets('{"name":"é😀"}'),expected=object([['name',text('é😀')]]);await verifyHttpResourceTargets(result,async(api,{filesystem})=>{assert.deepEqual(api.parsed(valid),{$:'Some',field0:expected});assert.deepEqual(api.parsed(octets('null')),{$:'Some',field0:nil()});for(const bytes of [Object.freeze([]),octets('{'),Object.freeze([255n]),Object.freeze([192n,128n])])assert.deepEqual(api.parsed(bytes),{$:'None'});assert.strictEqual(api.identity(valid),valid);assert.strictEqual(api.borrowed(valid),valid);assert.deepEqual(api.localView(valid),{$:'Some',field0:expected});assert.throws(()=>api.parsed(Object.freeze([256n])),TypeError);const calls=[],nativeBytes=new TextEncoder().encode('{"name":"é😀"}');await filesystem.withEffectCapabilities({fs:{sync:{readFileSync(path){calls.push(path);return nativeBytes;}},async:{async readFile(path){calls.push(path);return nativeBytes;}}}},async()=>{assert.deepEqual(api.raw('sync'),{$:'Ok',field0:valid});const pending=api.asyncRaw('async');assert.deepEqual(calls,['sync']);assert.deepEqual(await pending,{$:'Ok',field0:valid});assert.deepEqual(calls,['sync','async']);});});
});
test('complete canonical native owned Vec and shared octet slice signatures reproduce every token',limits,()=>{
 for(const native of [
  'pub fn raw(path: &str) -> Result<::std::vec::Vec<u8>, ::std::io::Error> { ::std::fs::read(path) }\n',
  'pub fn identity(bytes: ::std::vec::Vec<u8>) -> ::std::vec::Vec<u8> { bytes }\n',
  "pub fn borrowed<'a>(bytes: &'a [u8]) -> &'a [u8] { bytes }\n",
  'pub fn parsed(bytes: &[u8]) -> Option<crate::translation_core::Json> { crate::translation_core::json_parse_bytes(bytes) }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('successful payload queries cannot change tags ownership element widths roots or source meta',limits,()=>{
 for(const body of [
  'export function bad(bytes:readonly bigint[]){return parseBytes(bytes);}',
  "export function bad(bytes:Extract<ReturnType<typeof read>, {$: 'Err'}>['field0']){return bytes;}",
  "export function bad(bytes:Extract<ReturnType<typeof read>, {$: 'Ok', extra:true}>['field0']){return bytes;}",
  `export function bad(bytes:${owned}){return borrowed(bytes);} export function borrowed(bytes:Parameters<typeof parseBytes>[0]){return bytes;}`,
  `export function bad(bytes:${owned},other:${owned}){let current=bytes;const view=borrowed(current);current=other;return parseBytes(view);} export function borrowed(bytes:Parameters<typeof parseBytes>[0]){return bytes;}`,
  `export function bad(bytes:${owned}){const first=identity(bytes);return identity(bytes);} export function identity(bytes:${owned}){return bytes;}`,
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='identity').parameters[0].type='json-list-owned';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('full original byte facade domains callbacks native and successful-query copies retain both inverses',limits,()=>{
 const plan=prepareHttpResourceByteSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
