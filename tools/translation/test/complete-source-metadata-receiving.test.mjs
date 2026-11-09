import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {receiveCompleteSourceMetadata,receiveCompleteSourceMetadataLayers} from './complete-source-metadata-receiving.mjs';
const wire=source=>serializeConcreteSyntaxMeta(createConcreteSyntaxMeta(source,{language:'Rust'}));
const row=(before,after)=>({beforeMeta:before,afterMeta:after,stages:[{beforeMeta:before,afterMeta:before},{beforeMeta:before,afterMeta:after}]});
const consume=(receiver,metas)=>metas.map(meta=>receiver.next(meta));

test('receiving retains every repeated full metadata import in original order',{timeout:60000},()=>{
 const before=wire('pub fn value()->u8{1u8}'),after=wire('pub fn value()->u8{2u8}');
 const receiver=receiveCompleteSourceMetadata([row(before,after)]),metas=[before,after,before,before,before,after];
 assert.throws(()=>receiver.finish(),/every original metadata import/);
 assert.throws(()=>receiver.next(after));
 const results=consume(receiver,metas);receiver.finish();
 assert.deepEqual(results.map(result=>result.meta),metas);
 for(let at=0;at<results.length;at++)for(let previous=0;previous<at;previous++)assert.notEqual(results[at].document,results[previous].document);
 assert.throws(()=>receiver.next(before),/consumed once/);
});

test('receiving rejects a forged late canonical document and keeps later invocations fresh',{timeout:60000},()=>{
 const good=wire('pub fn value(){}'),doc=JSON.parse(good);doc.authority.type=true;
 const forged=JSON.stringify(doc),bad=row(good,forged),receiver=receiveCompleteSourceMetadata([bad]);
 assert.throws(()=>receiver.next(good));
 const restored=receiveCompleteSourceMetadata([row(good,good)]);
 for(const result of consume(restored,Array(6).fill(good)))assert.equal(result.source,'pub fn value(){}');
 restored.finish();
});

test('complete receiving crosses a wire partition while preserving all original individual documents',{timeout:60000},()=>{
 const before=wire(' '.repeat(400000)),after=wire(' '.repeat(400001));
 const receiver=receiveCompleteSourceMetadata([row(before,after)]),metas=[before,after,before,before,before,after];
 assert.ok(metas.reduce((sum,meta)=>sum+meta.length,0)>2000000);
 for(const meta of metas){const result=receiver.next(meta);assert.equal(result.meta,meta);assert.equal(result.source,meta===before?' '.repeat(400000):' '.repeat(400001));}
 receiver.finish();
});

test('declared layers preserve every original import with separate bounded receiving calls',{timeout:60000},()=>{
 const meta=wire('pub fn value()->u8{7u8}'),layers=Array.from({length:2},()=>Array.from({length:42},()=>row(meta,meta)));
 assert.throws(()=>receiveCompleteSourceMetadata(layers.flat()));
 const receiver=receiveCompleteSourceMetadataLayers(layers),documents=new Set();
 assert.throws(()=>receiver.finish(),/every original metadata import/);
 for(const layer of layers)for(const original of layer)for(const expected of [original.beforeMeta,original.afterMeta,...original.stages.flatMap(stage=>[stage.beforeMeta,stage.afterMeta])]){
  const result=receiver.next(expected);assert.equal(result.meta,expected);assert.equal(result.source,'pub fn value()->u8{7u8}');assert.ok(!documents.has(result.document));documents.add(result.document);
 }
 assert.equal(documents.size,504);receiver.finish();assert.throws(()=>receiver.next(meta),/consumed once/);
});

test('layer boundaries retain late forgery refusal and incomplete final-layer detection',{timeout:60000},()=>{
 const good=wire('pub fn value(){}'),doc=JSON.parse(good);doc.authority.type=true;
 const forged=JSON.stringify(doc),receiver=receiveCompleteSourceMetadataLayers([[row(good,good)],[row(good,forged)]]);
 consume(receiver,Array(6).fill(good));assert.throws(()=>receiver.next(good));assert.throws(()=>receiver.finish());
 const restored=receiveCompleteSourceMetadataLayers([[row(good,good)],[row(good,good)]]);
 consume(restored,Array(11).fill(good));assert.throws(()=>restored.finish(),/every original metadata import/);
 restored.next(good);restored.finish();
});

test('each layer retains the original document limit and the layer census is finite',{timeout:60000},()=>{
 const meta=wire('pub fn value(){}'),large=Array.from({length:43},()=>row(meta,meta));
 assert.throws(()=>receiveCompleteSourceMetadataLayers([large]));
 assert.throws(()=>receiveCompleteSourceMetadataLayers([]));
 assert.throws(()=>receiveCompleteSourceMetadataLayers([[]]));
 assert.throws(()=>receiveCompleteSourceMetadataLayers(Array.from({length:257},()=>[row(meta,meta)])));
});
