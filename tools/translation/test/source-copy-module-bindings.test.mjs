import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings as single,verifyNativeCopiedModuleBindings as batch} from '../source-copy-native-bindings.mjs';
const ts=ownershipCompiler(),row=(name,source)=>({path:'/private/tmp/router-module-bindings/'+name+'.mjs',source});
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};

test('one fresh native program retains all independent module scope results and actual installed compiler',{timeout:60000},()=>{
 assert.equal(ts.version,'5.9.3');
 const rows=[row('first',"import {posix} from 'node:path'; const local=1; export const value=posix.join(String(local),process.cwd());"),row('second','const local=2; export const value=Buffer.byteLength(String(local))+Math.max(1,2);'),row('third','export function value(input){const local=input;return local;}')];
 assert.deepEqual(batch(ts,rows),rows.map(({path,source})=>single(ts,path,source)));
 assert.deepEqual(batch(ts,rows),rows.map(({path,source})=>single(ts,path,source)));
});

test('a sibling declaration never supplies an unbound local and original initialization errors remain exact',{timeout:60000},()=>{
 const provider=row('provider','export const missing=1; const hidden=2; export {hidden};');
 for(const source of ['export const value={missing};','export const value=hidden;','export const value=misspelledFunction();','export const value=new URL("https://example.test"); const URL=class {};']){
  const consumer=row('consumer',source),expected=outcome(()=>single(ts,consumer.path,consumer.source));assert.ok(expected.error);
  assert.deepEqual(outcome(()=>batch(ts,[provider,consumer])),expected);
 }
 const consumer=row('consumer','export const value=1;');assert.deepEqual(batch(ts,[provider,consumer]),[provider,consumer].map(({path,source})=>single(ts,path,source)));
});

test('unscoped scripts duplicate paths missing sources and aggregate source bounds refuse before admission',{timeout:60000},()=>{
 const valid=row('valid','export const value=1;');
 for(const rows of [[],[valid,valid],[row('global','const injected=1;')],[{path:valid.path}],[row('large','export const value="'+'x'.repeat(2097152)+'";')]])assert.throws(()=>batch(ts,rows),TypeError);
 assert.deepEqual(batch(ts,[valid]),[single(ts,valid.path,valid.source)]);
});

test('global augmentations cannot introduce sibling bindings and changed whole source is freshly checked',{timeout:60000},()=>{
 const provider=row('provider','export {}; declare global { var injected:number; }'),consumer=row('consumer','export const value=injected;');
 assert.throws(()=>batch(ts,[provider,consumer]),/global augmentation/);
 assert.throws(()=>batch(ts,[row('namespace','export const value=1; export as namespace injected;'),consumer]),/global augmentation/);
 const valid=row('fresh','export const value=1;');assert.deepEqual(batch(ts,[valid]),[single(ts,valid.path,valid.source)]);
 const changed={...valid,source:'export const value=changedAfterFirstVerdict;'};
 assert.deepEqual(outcome(()=>batch(ts,[changed])),outcome(()=>single(ts,changed.path,changed.source)));
 assert.deepEqual(batch(ts,[valid]),[single(ts,valid.path,valid.source)]);
});
