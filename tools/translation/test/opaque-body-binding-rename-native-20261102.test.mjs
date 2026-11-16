// Independent complete source candidate fixtures; not an executable capture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOpaqueNativeBindingRenameData} from '../opaque-body-binding-rename-20261102-native.mjs';
const options={timeout:60000,concurrency:false};
const group={owner:'module_sample',before:'value',after:'renamed',bindingKind:'local',targetOccurrences:2};
function data(source){return {originalSources:new Map([['rust/src/sample.rs',source]]),adoptedSources:new Map([['rust/src/sample.rs',source]]),constantIndexOrigins:{bodyLiterals:[{source:'rust/src/sample.rs',qualifiedName:'module.sample',targetFunction:'module_sample',sourceAuthority:false,semanticAuthority:false}]}};}
test('whole original native let/reference edits retain trivia, full source and a lossless candidate inverse',options,()=>{const before='pub fn sample(input: u8) -> u8 { let mut value = input; value += 1; value }\n// value\n',expected='pub fn sample(input: u8) -> u8 { let mut renamed = input; renamed += 1; renamed }\n// value\n',result=proposeOpaqueNativeBindingRenameData(data(before),[group]);assert.equal(result.rustEdits.length,1);assert.equal(result.rustEdits[0].before,before);assert.equal(result.rustEdits[0].after,expected);assert.equal(result.nativeEdits.length,3);assert.equal(result.selections[0].nativeOccurrences,3);assert.equal(result.semanticAuthority,false);});
test('parameter occurrences are selected from the actual original signature and complete body',options,()=>{const before='pub fn sample(value: u8) -> u8 { value + 1 }\n',result=proposeOpaqueNativeBindingRenameData(data(before),[{...group,bindingKind:'parameter'}]);assert.equal(result.rustEdits[0].after,'pub fn sample(renamed: u8) -> u8 { renamed + 1 }\n');});
test('native capture, shadowing, member/macro spellings and ambiguous physical owners refuse',options,()=>{for(const source of [
 'pub fn sample(input:u8)->u8{let value=input;let renamed=2;value+renamed}',
 'pub fn sample(input:u8)->u8{let value=input;{let value=2;value;}value}',
 'pub fn sample(input:u8)->u8{let value=input;input.value+value}',
 'pub fn sample(input:u8)->u8{let value=input;value!();value}',
 'pub fn sample(input:u8)->u8{let value=input;value} pub fn sample(input:u8)->u8{input}',
 ])assert.throws(()=>proposeOpaqueNativeBindingRenameData(data(source),[group]));});
test('caller-built candidate metadata never becomes a source or semantic receipt',options,()=>{const capture=data('pub fn sample(input:u8)->u8{let value=input;value}'),result=proposeOpaqueNativeBindingRenameData(capture,[group]);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(Object.hasOwn(result,'compilerQualified'),false);assert.throws(()=>proposeOpaqueNativeBindingRenameData({...capture,constantIndexOrigins:{bodyLiterals:[]}},[group]));});
