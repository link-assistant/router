// Independent consuming native/primitive text interface SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_text_append_owned as append,router_text_clear_owned as clear} from '../text-runtime.mjs';
import {TEXT_CONTRACTS,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {prepareTextConsumingSources} from '../prepare-text-consuming-sources.mjs';
import {prepareTextConsumingNativeSources} from '../prepare-text-consuming-native-sources.mjs';
const limits={timeout:60000};
test('consuming append and clear preserve Unicode primitive values without coercing objects',limits,()=>{
 for(const value of ['','é😀','a\0b'])for(const suffix of ['','é😀','tail']){assert.equal(append(value,suffix),value+suffix);assert.equal(clear(append(value,suffix)),'');}let converted=0;const hostile={toString(){converted++;return 'x';},valueOf(){converted++;return 'x';}};for(const args of [[hostile,'x'],['x',hostile],[null,'x']])assert.throws(()=>append(...args),TypeError);assert.throws(()=>clear(hostile),TypeError);assert.equal(converted,0);for(const value of ['\ud800','\udfff']){assert.throws(()=>append(value,''),TypeError);assert.throws(()=>append('',value),TypeError);assert.throws(()=>clear(value),TypeError);}
});
test('original one MiB UTF-8 input/output bounds remain exact and separate from JS code units',limits,()=>{
 const full='a'.repeat(1048576),three='é'.repeat(524288);assert.equal(append(full,''),full);assert.equal(clear(full),'');assert.equal(append(three,''),three);assert.throws(()=>append(full,'a'),RangeError);assert.throws(()=>append(three,'é'),RangeError);assert.throws(()=>append('a'.repeat(1048577),''),RangeError);
});
test('owned parameter ABI native source declarations and nine complete compiler histories stay joined',limits,()=>{
 const appendContract=TEXT_CONTRACTS.find(row=>row.rustName==='append_owned'),clearContract=TEXT_CONTRACTS.find(row=>row.rustName==='clear_owned');assert.deepEqual(appendContract.parameters,['text-owned','str']);assert.deepEqual(clearContract.parameters,['text-owned']);assert.equal(appendContract.returns,'text-owned');assert.equal(appendContract.root,null);assert.equal(emitTextDeclarations(),readFileSync(new URL('../text-runtime.d.mts',import.meta.url),'utf8'));assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));const plan=prepareTextConsumingSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const native=prepareTextConsumingNativeSources();assert.equal(native.current,native.after);assert.equal(native.inverse,native.before);assert.deepEqual(native.stages.map(stage=>stage.phase),['language','repository']);assert.equal(native.rustExecuted,false);
});
