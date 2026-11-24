import '../project.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodeStaticSourceStorage,decodeStaticSourceStorage,decodeStaticSourceTextData} from '../static-source-layout-storage.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),json=JSON.stringify;
function fixture(){
 const prefix='// Ω😀 '+('complete source trivia '.repeat(100))+'\n';
 const first=prefix+'pub fn alpha()->u8{1}\n',last=prefix+'pub fn alpha()->u8{2}\n';
 const source=value=>({source:value,bytes:Buffer.byteLength(value),gitBlob:createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(value)+'\0')).update(value).digest('hex'),canonical:transportConcreteSyntaxSource(value,{language:'Rust'}).meta});
 const before={path:'src/alpha.rs',sourceId:hash(first),bytes:Buffer.byteLength(first),gitBlob:source(first).gitBlob},after={path:'rust/src/alpha.rs',sourceId:hash(last),bytes:Buffer.byteLength(last),gitBlob:source(last).gitBlob};
 const row={path:before.path,status:'changed',before,after,edit:{span:[0,first.length],expected:first,replacement:last},inverse:{span:[0,last.length],expected:last,replacement:first},completeInverse:true};
 return {schema:'router-static-source-lifecycle-v1',cases:{},profiles:[{revision:'historical',files:[before]}],current:{files:[after]},lineage:[{revision:'historical',files:[row]}],sources:{[before.sourceId]:source(first),[after.sourceId]:source(last)},authority:{namespace:false,semantic:false,execution:false},trace:[]};
}
function encode(bundle){const raw=Buffer.from(json(bundle)+'\n'),stored=encodeStaticSourceStorage(bundle,raw);return {raw,stored,index:{schema:bundle.schema,storage:stored.storage}};}

test('captured Rust path substitutions retain every original logical and CST byte',{timeout:60000},()=>{
 const bundle=fixture(),before=json(bundle),{raw,stored,index}=encode(bundle);
 assert.equal(stored.storage.codec,'router-static-cst-repository-layout-storage-v2');
 assert.deepEqual(decodeStaticSourceStorage(stored.raw,index),bundle);
 assert.equal(json(bundle),before,'owned input remains unchanged');
 assert.equal(stored.storage.logicalRawBytes,raw.length);assert.equal(stored.storage.logicalRawSha256,hash(raw));
 const physical=decodeStaticSourceStorage(stored.raw,index).lineage[0].files[0].after.path;
 assert.equal(physical,'rust/src/alpha.rs');
 const wire=JSON.parse(stored.raw);assert.deepEqual(wire.pathSubstitutions,[[0,0,physical]]);
 assert.equal(wire.payload.payload.lineage[0].files[0][1].after.path,'src/alpha.rs');
});

test('foreign repeated missing or changed path descriptors refuse without changing old literal storage',{timeout:60000},()=>{
 const bundle=fixture(),{stored,index}=encode(bundle);
 const mutations=[wire=>wire.pathSubstitutions[0][2]='rust/src/foreign.rs',wire=>wire.pathSubstitutions.push(wire.pathSubstitutions[0]),wire=>wire.pathSubstitutions=[],wire=>wire.logicalRawBytes++,wire=>wire.payload.payload.current.files[0].path='foreign.rs',wire=>wire.metadataEncoding='foreign',wire=>wire.columnEncoding='foreign',wire=>wire.payload.payload.current.files[0].sourceId=99999,wire=>wire.payload.columnTables[0][0]='not hex'];
 for(const mutate of mutations){const wire=JSON.parse(stored.raw);mutate(wire);assert.throws(()=>decodeStaticSourceStorage(Buffer.from(json(wire)+'\n'),index),TypeError);}
 const foreign=fixture();foreign.lineage[0].files[0].after.path='other.rs';const encoded=encode(foreign);
 assert.notEqual(encoded.stored.storage?.codec,'router-static-cst-repository-layout-storage-v2');
 assert.deepEqual(decodeStaticSourceStorage(encoded.stored.raw,encoded.index),foreign);
});

test('source-text projection restores physical labels and retains its false authority flags',{timeout:60000},()=>{
 const bundle=fixture(),{stored,index}=encode(bundle),projection=decodeStaticSourceTextData(stored.raw,index);
 assert.equal(projection.bundle.lineage[0].files[0].after.path,'rust/src/alpha.rs');
 for(const [id,row]of Object.entries(bundle.sources)){assert.equal(projection.bundle.sources[id].source,row.source);assert.equal(Object.hasOwn(projection.bundle.sources[id],'canonical'),false);}
 assert.equal(projection.validation.canonicalDocuments,false);
 assert.equal(projection.validation.logicalPayloadDigest,false);
 assert.equal(projection.validation.compilerAuthority,false);
});
