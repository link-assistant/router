// Full source-copy and foreign-authority cases SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeBorrowedStandardMapNativeContext} from '../borrowed-standard-map-20261103-native-context-source.mjs';
import {withBorrowedStandardMapNativeSourceABI,requireBorrowedStandardMapNativeSourceABI} from '../borrowed-standard-map-20261103-native-abi.mjs';
import {requireBorrowedStandardMapNativeSourceContext} from '../borrowed-standard-map-20261103-native-context.mjs';
import {proposeFixedBorrowedStandardMapNativeAbi} from '../borrowed-standard-map-20261103-fixed-abi-source.mjs';
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
test('the distinct native context is a complete counted source copy with a Rust-helper-specific owner',{timeout:60000},()=>{
 const result=proposeBorrowedStandardMapNativeContext();
 assert.equal(result.after,read(result.path));assert.equal(result.inverse,result.before);assert.equal(result.history.inverse,result.before);
 assert.deepEqual(result.trace.map(step=>step.phase),['language','repository']);
 assert.ok(result.after.includes("module.path.join('::')==='borrowed_standard_map_20261102'"));
 assert.equal(result.after.includes("module.path.join('::')==='translation_ordered_text_map_core'"),false);
 // The copied native context retains the actual Cargo/source producer boundaries.
 for(const source of ['assertResolvedSourceScopeOrigin','originalCargoEditionEvidence','deriveDependencyOriginalInputs','unresolvedBangMacroScope','no_implicit_prelude'])assert.ok(result.after.includes(source));
 assert.equal(result.semanticAuthority,false);
});
test('copied ABI records and public source/type qualifiers cannot issue original ownership',()=>{
 for(const value of [null,{},Object.freeze({schema:'private-borrowed-standard-map-native-source-ABI-20261103-v1',path:'crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals',callerBodyQualified:true,actualInvocationObserved:true})]){
  assert.throws(()=>requireBorrowedStandardMapNativeSourceABI(value,{parser:{}}),/foreign, copied or expired/u);
 }
 assert.throws(()=>requireBorrowedStandardMapNativeSourceContext({schema:'borrowed-standard-map-native-source-context-20261103-v1'},{}),/copied\/foreign/u);
});
test('an object-shaped parser or asynchronous callback never enters the native operation',()=>{
 let called=false;assert.throws(()=>withBorrowedStandardMapNativeSourceABI({facts:{}},()=>{called=true;}));assert.equal(called,false);
 assert.throws(()=>withBorrowedStandardMapNativeSourceABI({},async()=>{}),/synchronously/u);
});
test('fixed native compatibility identities retain the preceding whole ABI and its inverse',{timeout:60000},()=>{
 const result=proposeFixedBorrowedStandardMapNativeAbi();
 assert.equal(result.after,read(result.path));assert.equal(result.history.inverse,result.before);assert.equal(result.inverse,result.before);
 assert.deepEqual(result.trace.map(step=>step.phase),['language','repository']);
 assert.ok(result.after.includes('sourcePins[path]'));assert.ok(result.after.includes('binding.declaration?.source!==leaf.file'));
 assert.equal(result.semanticAuthority,false);
});
