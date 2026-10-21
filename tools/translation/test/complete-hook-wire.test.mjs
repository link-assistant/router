import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliCompressSync,constants} from 'node:zlib';
import {encodeCompleteHookWire,decodeCompleteHookWire,compareCompleteHookWires} from './fixtures/complete-hook-wire.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('complete callback wire retains every field and crosses independently read bounded leaves',{timeout:60000},()=>{
 const original={workload:{tape:[{args:['x'.repeat(1024*1024+37),'utf8'],value:'actual digest'}],result:{value:{source:'original',rows:[1,null,true],extra:{retained:'all'}}}}},wire=encodeCompleteHookWire(original),header=JSON.parse(wire);
 assert.equal(header.schema,'complete-hook-observation-brotli-frames-v2');assert.equal(header.frames.length,2);assert.deepStrictEqual(decodeCompleteHookWire(wire),original);
 const sizes=compareCompleteHookWires(wire,encodeCompleteHookWire(original));assert.equal(sizes.left.logicalBytes,Buffer.byteLength(JSON.stringify(original)));assert.deepStrictEqual(sizes.left,sizes.right);
});

test('valid complete nested mutations and different-length complete payloads fail decoded byte equality',{timeout:60000},()=>{
 const original={all:{source:'complete original',nested:{value:'actual digest'},tail:'retained'}};
 const wire=encodeCompleteHookWire(original);original.all.nested.value+=' ';const changed=encodeCompleteHookWire(original);
 assert.deepStrictEqual(decodeCompleteHookWire(changed),original);assert.throws(()=>compareCompleteHookWires(wire,changed),/complete decoded bytes/u);
 const longer=encodeCompleteHookWire({tail:'x'.repeat(1024*1024+17)});
 assert.throws(()=>compareCompleteHookWires(wire,longer),/complete decoded bytes/u);
 assert.throws(()=>compareCompleteHookWires(longer,wire),/complete decoded bytes/u);
});

test('independent leaf metadata and complete raw hash both remain required',{timeout:60000},()=>{
 const wire=encodeCompleteHookWire({complete:'original bytes'});
 for(const field of ['rawSha256','storedSha256','ordinal','rawBytes','storedBytes']){
  const changed=JSON.parse(wire);changed.frames[0][field]=typeof changed.frames[0][field]==='string'?'0'.repeat(64):-1;
  assert.throws(()=>compareCompleteHookWires(wire,JSON.stringify(changed)),/full bounded payload/u);
 }
 const changed=JSON.parse(wire);changed.rawSha256='0'.repeat(64);assert.throws(()=>compareCompleteHookWires(wire,JSON.stringify(changed)),/full bounded payload/u);
});

test('validly repacked later leaf corruption still fails full comparison after an earlier difference',{timeout:60000},()=>{
 const wire=encodeCompleteHookWire({first:'a'.repeat(1024*1024),last:'original tail'}),changed=JSON.parse(encodeCompleteHookWire({first:'b'.repeat(1024*1024),last:'original tail'}));
 const raw=Buffer.from('different valid bytes'),packed=brotliCompressSync(raw,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}),last=changed.frames.at(-1);
 Object.assign(last,{rawBytes:raw.length,rawSha256:hash(raw),storedBytes:packed.length,storedSha256:hash(packed),brotli:packed.toString('base64')});
 // The first leaf is already different; the later complete framing equation
 // still has to be read, and this malformed raw-size equation must be refused.
 assert.throws(()=>compareCompleteHookWires(wire,JSON.stringify(changed)),/full bounded payload/u);
});
