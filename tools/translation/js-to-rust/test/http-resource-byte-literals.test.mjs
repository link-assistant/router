// Independent byte construction SOURCE. Every case is drafted and unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {json_macro_null as nil} from '../../json-macro-runtime.mjs';
import {prepareHttpResourceByteLiteralSources} from '../../prepare-http-resource-byte-literal-sources.mjs';
const limits={timeout:60000};
const imports="import {router_core_json_parse_bytes as parseBytes} from './runtime/json-update-runtime.mjs';\n";
const source=imports+`export function boundaries(){return [0n,255n];}
export function nullBytes(){return [110n,117n,108n,108n];}
export function parsed(){return parseBytes([110n,117n,108n,108n]);}
export function local(){const bytes=[110n,117n,108n,108n];return parseBytes(bytes);}
export function updated(){let bytes=[0n];bytes=[255n];return bytes;}
export function separated(){return [2_55n,0n,1n];}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual dense bounded BigInt literals use the existing owned byte ABI in both target languages',limits,async()=>{
 for(const [language,path]of [['JavaScript','caller.mjs'],['TypeScript','caller.mts']]){
  const result=language==='JavaScript'?translateHttpResourceCallerJavaScript(source,input(source,path)):translateHttpResourceCallerTypeScript(source,input(source,path));assert.equal(result.javascript,source);assert.match(result.rust,/::std::vec!\[0_u8, 255_u8\]/u);
  await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.boundaries(),[0n,255n]);assert.deepEqual(api.nullBytes(),[110n,117n,108n,108n]);assert.deepEqual(api.parsed(),{$:'Some',field0:nil()});assert.deepEqual(api.local(),{$:'Some',field0:nil()});assert.deepEqual(api.updated(),[255n]);assert.deepEqual(api.separated(),[255n,0n,1n]);});
  const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 }
});
test('handwritten canonical native octet lists re-enter the original checked byte caller',limits,async()=>{
 for(const native of [
  'pub fn bytes() -> ::std::vec::Vec<u8> { ::std::vec![0_u8, 255_u8] }\n',
  'pub fn parsed() -> Option<crate::translation_core::Json> { crate::translation_core::json_parse_bytes(&::std::vec![110_u8, 117_u8, 108_u8, 108_u8]) }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));await verifyHttpResourceTargets(result,api=>{if(api.bytes)assert.deepEqual(api.bytes(),[0n,255n]);else assert.deepEqual(api.parsed(),{$:'Some',field0:nil()});});}
});
test('octet construction cannot erase numeric width density ownership native spelling or original-source obligations',limits,()=>{
 for(const body of [
  'return [256n];','return [-1n];','return [0];','return [1n,true];','return [1n,,2n];',
  'return [...[1n]];','return parseBytes([]);','return [18446744073709551616n];',
  'const bytes=[1n];const first=take(bytes);return take(bytes);',
  'return ['+Array(4097).fill('0n').join(',')+'];',
 ]){const value=imports+'function take(bytes:Extract<ReturnType<typeof read>, {$:"Ok"}>["field0"]){return bytes;}\nimport {std_fs_read as read} from "./runtime/extensions/filesystem-effects-runtime.mjs";\nexport function bad(){'+body+'}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value,'caller.mts')),body.slice(0,120));}
 for(const literal of ['::std::vec![256_u8]','::std::vec![1_u8, 2_u64]','::std::vec![01_u8]','::std::vec![1_u8; 2]','::std::vec![]']){const value='pub fn bad() -> ::std::vec::Vec<u8> { '+literal+' }\n';assert.throws(()=>translateHttpResourceCallerRust(value,{...input(value,'src/caller.rs'),javascriptPath:'caller.mjs'}),literal);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='boundaries').flow.tail.value.values[0]='256';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('complete byte literal source histories keep both ordered phases and original inverses',limits,()=>{
 const plan=prepareHttpResourceByteLiteralSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
