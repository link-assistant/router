// Independent text contract regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as text from '../text-runtime.mjs';
import {TEXT_CONTRACTS,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_RUNTIME_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {prepareTextCore} from '../prepare-text-core.mjs';
import {prepareSseCore} from '../prepare-sse-core.mjs';
import {prepareTextRootSources} from '../prepare-text-root-sources.mjs';
const limits={timeout:60000};
test('Rust Unicode whitespace differs from JavaScript trim and preserves non-whitespace BOMs',limits,()=>{
 const spaces=[9,10,11,12,13,32,0x85,0xa0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200a,0x2028,0x2029,0x202f,0x205f,0x3000];for(const code of spaces){const character=String.fromCodePoint(code);assert.equal(text.router_text_trim(character+'世界 😀'+character),'世界 😀');assert.equal(text.router_text_trim_start(character+'x'+character),'x'+character);assert.equal(text.router_text_trim_end(character+'x'+character),character+'x');}for(const value of ['\ufeff','\u180e','\u200b'])assert.equal(text.router_text_trim(value+'x'+value),value+'x'+value);assert.equal(text.router_text_trim('\u0085\t\n'),'');
});
test('find lengths counts and slices use UTF-8 bytes and complete Unicode scalar boundaries',limits,()=>{
 assert.equal(text.router_text_len_utf8('a😀b'),6n);assert.equal(text.router_text_len_chars('a😀b'),3n);assert.deepEqual(text.router_text_find('a😀b','b'),{$:'Some',field0:5n});assert.deepEqual(text.router_text_rfind('a😀b',''),{$:'Some',field0:6n});assert.deepEqual(text.router_text_find('a😀b','x'),{$:'None'});assert.deepEqual(text.router_text_slice_bytes('a😀b',1n,5n),{$:'Some',field0:'😀'});assert.deepEqual(text.router_text_slice_bytes('a😀b',2n,5n),{$:'None'});assert.deepEqual(text.router_text_slice_bytes('a😀b',6n,6n),{$:'Some',field0:''});assert.deepEqual(text.router_text_slice_bytes('a😀b',0n,18446744073709551615n),{$:'None'});assert.equal(text.router_text_take_chars('a😀b',2n),'a😀');assert.equal(text.router_text_drop_chars('a😀b',1n),'😀b');assert.equal(text.router_text_drop_chars('a😀b',18446744073709551615n),'');assert.equal(text.router_text_matches_count('aaa','aa'),1n);assert.equal(text.router_text_matches_count('😀',''),2n);
});
test('replacement is literal and empty patterns operate on character boundaries',limits,()=>{
 assert.equal(text.router_text_replace('😀','','$&'),'$&😀$&');assert.equal(text.router_text_replacen('😀','', '_',1n),'_😀');assert.equal(text.router_text_replacen('aaaa','aa','$1',1n),'$1aa');assert.equal(text.router_text_replace('aaa','aa','x'),'xa');assert.equal(text.router_text_replacen('hello','l','x',0n),'hello');assert.equal(text.router_text_repeat('',18446744073709551615n),'');assert.equal(text.router_text_repeat('😀',2n),'😀😀');assert.deepEqual(text.router_text_strip_prefix('😀abc','😀'),{$:'Some',field0:'abc'});assert.deepEqual(text.router_text_strip_suffix('abc😀','😀'),{$:'Some',field0:'abc'});assert.deepEqual(text.router_text_strip_suffix('abc',''),{$:'Some',field0:'abc'});
});
test('primitive validation rejects coercion malformed scalars excessive output and invalid widths before allocation',limits,()=>{
 let called=false;const object={toString(){called=true;return 'text';}};assert.throws(()=>text.router_text_trim(object),/primitive text/u);assert.equal(called,false);for(const value of ['\ud800','\udfff','a\ud800b'])assert.throws(()=>text.router_text_contains(value,''),/Unicode scalar/u);assert.throws(()=>text.router_text_repeat('x',1048577n),/output bound/u);assert.throws(()=>text.router_text_replace('x'.repeat(1024),'x','y'.repeat(1025)),/output bound/u);assert.throws(()=>text.router_text_trim('x'.repeat(1048577)),/input bound/u);for(const value of [-1n,18446744073709551616n,1,{}])assert.throws(()=>text.router_text_take_chars('abc',value),/u64/u);const result=text.router_text_find('😀a','a');assert.equal(Object.isFrozen(result),true);
});
test('all twenty declarations native bodies and complete native root histories retain their original source',limits,()=>{
 assert.equal(TEXT_CONTRACTS.length,20);assert.equal(emitTextDeclarations(),TEXT_DECLARATIONS_SOURCE);assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));assert.equal(TEXT_RUNTIME_SOURCE,readFileSync(new URL('../text-runtime.mjs',import.meta.url),'utf8'));for(const plan of [prepareTextCore(),prepareSseCore()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const preparation=prepareTextRootSources();assert.equal(preparation.files.length,2);for(const row of preparation.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);}assert.equal(preparation.receivingExecuted,false);
});
