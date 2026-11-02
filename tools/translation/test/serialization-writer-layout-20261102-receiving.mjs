// Complete original receiving-producer cases. Explicit entry, no toy compiler.
// No invocation or dependency installation occurred during source drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {protectedFlatWriterFixture} from './protected-flat-writer-20261102-fixture.mjs';
import {produceNativeAffinityDescriptor} from '../serialization-schema/native-descriptor.mjs';
import {produceBulkSerialization} from '../serialization-schema/bulk.mjs';
const options={timeout:60000,concurrency:false};
export function registerSerializationWriterReceivingCases(){
 test('actual full native producer writes four artifacts and accepts already imported js/src twice',options,async t=>{
  const root=protectedFlatWriterFixture(t),native=join(root,'js/src/affinity-schema.mjs'),before=fs.readFileSync(native);
  const first=await produceNativeAffinityDescriptor({root,write:true,applyImport:true});
  assert.equal(first.written,true);assert.equal(first.appliedImport,true);assert.equal(first.receipt.owners.length,7);
  assert.deepEqual(fs.readFileSync(native),before);
  const expected=Object.fromEntries(Object.entries(first.outputs).map(([kind,path])=>[kind,fs.readFileSync(join(root,path))]));
  first.outputs.javascript='rust/src/lib.rs';
  const second=await produceNativeAffinityDescriptor({root,write:true,applyImport:true});
  assert.equal(second.outputs.javascript,'js/src/affinity-schema-descriptor.mjs');
  for(const [kind,path]of Object.entries(second.outputs))assert.deepEqual(fs.readFileSync(join(root,path)),expected[kind]);
  assert.deepEqual(fs.readFileSync(native),before);
  assert.equal((await produceNativeAffinityDescriptor({root})).checked,true);
 });
 test('actual full producer applies the retained original source patch only to js/src',options,async t=>{
  const root=protectedFlatWriterFixture(t),native=join(root,'js/src/affinity-schema.mjs');
  const packet=JSON.parse(gunzipSync(fs.readFileSync(new URL('../source-profiles/serialization-writer-layout-20261102/complete-source.json.gz',import.meta.url)),{maxOutputLength:2097152}).toString('utf8'));
  fs.writeFileSync(native,packet.nativeImportEquation.before);
  const result=await produceNativeAffinityDescriptor({root,write:true,applyImport:true});
  assert.equal(result.appliedImport,true);assert.equal(fs.readFileSync(native,'utf8'),packet.nativeImportEquation.after);
  assert.equal(fs.existsSync(join(root,'packages/javascript/native/affinity-schema.mjs')),false);
 });
 test('actual full bulk producer reopens complete artifacts and preflights a protected final destination',options,t=>{
  const root=protectedFlatWriterFixture(t),first=produceBulkSerialization({root,write:true});
  assert.equal(first.checked,true);assert.equal(first.runtimeAuthority,false);
  const expected=Object.fromEntries(Object.entries(first.outputs).map(([kind,path])=>[kind,fs.readFileSync(join(root,path))]));
  const policy=join(root,'translation/source-ownership.json');fs.mkdirSync(join(root,'translation'),{recursive:true});
  fs.writeFileSync(policy,JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:[],unmanaged:[first.outputs.inventory]}));
  assert.throws(()=>produceBulkSerialization({root,write:true}),/authored\/unmanaged/u);
  for(const [kind,path]of Object.entries(first.outputs))assert.deepEqual(fs.readFileSync(join(root,path)),expected[kind]);
  assert.equal(produceBulkSerialization({root}).checked,true);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))registerSerializationWriterReceivingCases();
