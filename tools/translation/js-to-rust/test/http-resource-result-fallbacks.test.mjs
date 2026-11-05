// Independent alternate Result branch SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceResultFallbackSources} from '../../prepare-http-resource-result-fallback-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {std_fs_read as read,tokio_fs_read as asyncRead,std_fs_read_to_string as readText,deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_core_json_parse_bytes as parseBytes} from './runtime/json-update-runtime.mjs';
import {router_carrier_json_none as none} from './runtime/owned-outcome-runtime.mjs';
import {router_text_repeat as repeat,router_text_trim as trim,router_text_is_empty as empty} from './runtime/text-runtime.mjs';
import {router_async_receive as receive,router_async_dispose as dispose} from './runtime/async-control-runtime.mjs';
`;
const source=imports+`/** @param {string} path */ export function parsed(path){const selected=read(path);if(selected.$==='Err'){return none();}const bytes=selected.field0;return parseBytes(bytes);}
/** @param {string} path */ export function asyncParsed(path){return defer(async()=>{const selected=await asyncRead(path);if(selected.$==='Err'){return none();}const bytes=selected.field0;return parseBytes(bytes);});}
/** @param {string} path */ export function emptyFile(path){const selected=readText(path);if(selected.$==='Err'){return false;}const contents=selected.field0;return empty(contents);}
/** @param {string} path @param {string} fallback */ export function defaultText(path,fallback){const selected=readText(path);if(selected.$==='Err'){return repeat(fallback,1n);}const contents=selected.field0;return repeat(trim(contents),1n);}
/** @param {string} path @param {string} fallback */ export function rooted(path,fallback){const selected=readText(path);if(selected.$==='Err'){return trim(fallback);}return trim(fallback);}
/** @param {string} path @param {Parameters<typeof receive>[0]} receiver */ export function cleaned(path,receiver){const selected=read(path);if(selected.$==='Err'){dispose(receiver);return none();}const bytes=selected.field0;dispose(receiver);return parseBytes(bytes);}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('explicit complete failure fallbacks compose filesystem bytes parsing and owning default values',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/Err\(_\) => \{ return \{/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const expected=object([['name',text('é😀')]]);await verifyHttpResourceTargets(result,async(api,{filesystem,control})=>{const calls=[],bytes=new TextEncoder().encode('{"name":"é😀"}'),failure=Object.assign(new Error('missing'),{code:'ENOENT'}),read=path=>{calls.push(path);if(path==='missing')throw failure;return path==='empty'?new Uint8Array():bytes;};await filesystem.withEffectCapabilities({fs:{sync:{readFileSync:read},async:{async readFile(path){return read(path);}}}},async()=>{assert.deepEqual(api.parsed('ok'),{$:'Some',field0:expected});assert.deepEqual(api.parsed('empty'),{$:'None'});assert.deepEqual(api.parsed('missing'),{$:'None'});const count=calls.length,pending=api.asyncParsed('ok');assert.equal(calls.length,count);assert.deepEqual(await pending,{$:'Some',field0:expected});assert.deepEqual(await api.asyncParsed('missing'),{$:'None'});assert.equal(api.emptyFile('missing'),false);assert.equal(api.emptyFile('empty'),true);assert.equal(api.defaultText('missing','fallback'),'fallback');assert.equal(api.rooted('missing',' é😀 '),'é😀');assert.equal(api.rooted('ok',' é😀 '),'é😀');for(const path of ['ok','missing']){const channel=control.router_async_channel(1n);assert.equal(channel.$,'Ok');assert.deepEqual(api.cleaned(path,channel.field0[1]),path==='ok'?{$:'Some',field0:expected}:{$:'None'});}});});
});
test('complete canonical native discarded-error branch reproduces all original tokens',limits,()=>{
 const native='pub fn parsed(path: &str) -> Option<crate::translation_core::Json> { let selected = match ::std::fs::read(path) { Ok(__ro_http_value) => __ro_http_value, Err(_) => { return { crate::translation_carriers_core::json_none() }; } }; let bytes = selected; crate::translation_core::json_parse_bytes(&bytes) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('incomplete fallbacks wrong domains success payloads and partial helper releases still refuse',limits,()=>{
 for(const body of [
  '/** @param {string} path */ export function bad(path){const selected=read(path);if(selected.$===\'Err\'){const ignored=false;}const bytes=selected.field0;return parseBytes(bytes);}',
  '/** @param {string} path */ export function bad(path){const selected=read(path);if(selected.$===\'Err\'){return false;}const bytes=selected.field0;return parseBytes(bytes);}',
  '/** @param {string} path */ export function bad(path){const selected=read(path);if(selected.$===\'Err\'){return parseBytes(selected.field0);}const bytes=selected.field0;return parseBytes(bytes);}',
  '/** @param {string} path @param {Parameters<typeof receive>[0]} receiver */ export function bad(path,receiver){return partial(path,receiver);}/** @param {string} path @param {Parameters<typeof receive>[0]} receiver */ function partial(path,receiver){const selected=read(path);if(selected.$===\'Err\'){dispose(receiver);return none();}const bytes=selected.field0;return parseBytes(bytes);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='parsed').flow.steps[0].resultFallback.type='bool';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('all original guard and native projection source copies retain ordered complete inverses',limits,()=>{
 const plan=prepareHttpResourceResultFallbackSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
