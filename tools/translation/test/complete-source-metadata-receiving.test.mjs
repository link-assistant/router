import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {receiveCompleteSourceMetadata} from './complete-source-metadata-receiving.mjs';
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
