// Storage inverses and refusals; metadata supplies no source or compiler authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {packStaticStorageTransport,unpackStaticStorageTransport} from '../static-storage-transport.mjs';

const first='a'.repeat(64),second='b'.repeat(64);
const blobA='c'.repeat(40),blobB='d'.repeat(40);
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const before={path:'src/a.rs',sourceId:first,bytes:3,gitBlob:blobA};
  const after={path:'rust/src/a.rs',sourceId:second,bytes:4,gitBlob:blobB};
  return {schema:'router-static-cst-global-column-table-storage-v1',
    columnTables:Array.from({length:6},()=>['AAEC/w==']),
    payload:{profiles:[{files:[before]}],current:{files:[after]},
      lineage:[{files:[['router-lineage-row-v1',{before:{...before},after:{...after}}]]}],
      sources:{[first]:{gitBlob:blobA},[second]:{gitBlob:blobB}}}};
}
const unpack=wire=>unpackStaticStorageTransport(wire.payload,wire.columnEncoding,wire.metadataEncoding);

test('all complete Git blob references factor and restore every byte without mutating inputs',()=>{
  const input=fixture(),before=JSON.stringify(input),wire=packStaticStorageTransport(input);
  assert.equal(wire.metadataEncoding,'source-and-blob-index-v1');
  assert.equal(wire.payload.payload.profiles[0].files[0].gitBlob,0);
  assert.equal(wire.payload.payload.current.files[0].gitBlob,1);
  assert.equal(wire.payload.payload.lineage[0].files[0][1].after.gitBlob,1);
  assert.equal(JSON.stringify(unpack(wire)),before);
  assert.equal(JSON.stringify(input),before);
  assert.ok(JSON.stringify(wire.payload).length<before.length);
});

test('legacy source indices plain metadata and columns retain their complete inverses',()=>{
  const input=fixture(),wire=packStaticStorageTransport(input);
  wire.metadataEncoding='source-index-v1';
  const body=wire.payload.payload;
  for(const row of [...body.profiles[0].files,...body.current.files,
    body.lineage[0].files[0][1].before,body.lineage[0].files[0][1].after]){
    row.gitBlob=row.sourceId===0?blobA:blobB;
  }
  assert.deepEqual(unpack(wire),input);
  assert.deepEqual(unpackStaticStorageTransport(input,'plain-v1','plain-v1'),input);
});

test('foreign absent or non-string Git blob values retain legacy literal metadata',()=>{
  for(const value of ['foreign',null,3,undefined]){
    const input=fixture();input.payload.current.files[0].gitBlob=value;
    if(value===undefined)delete input.payload.current.files[0].gitBlob;
    const wire=packStaticStorageTransport(input);
    assert.equal(wire.metadataEncoding,'source-index-v1');
    assert.equal(JSON.stringify(unpack(wire)),JSON.stringify(input));
  }
});

test('forged Git indices and incomplete dictionary values refuse on full and text-only reads',()=>{
  const original=packStaticStorageTransport(fixture());
  const mutations=[wire=>{wire.payload.payload.current.files[0].gitBlob=0;},
    wire=>{wire.payload.payload.current.files[0].gitBlob=-0;},
    wire=>{wire.payload.payload.current.files[0].gitBlob=1.5;},
    wire=>{wire.payload.payload.current.files[0].gitBlob='1';},
    wire=>{delete wire.payload.payload.current.files[0].gitBlob;},
    wire=>{wire.payload.payload.sources[second].gitBlob=null;},
    wire=>{wire.metadataEncoding='foreign';}];
  for(const mutate of mutations)for(const columns of [true,false]){
    const wire=clone(original);mutate(wire);
    assert.throws(()=>unpackStaticStorageTransport(wire.payload,wire.columnEncoding,
      wire.metadataEncoding,{columns}),TypeError);
  }
});

test('text projection restores all metadata while preserving its unexpanded columns',()=>{
  const input=fixture(),wire=packStaticStorageTransport(input);
  const projected=unpackStaticStorageTransport(wire.payload,wire.columnEncoding,
    wire.metadataEncoding,{columns:false});
  assert.deepEqual(projected.payload,input.payload);
  assert.equal(projected.columnTables[0][0],'000102ff');
});
