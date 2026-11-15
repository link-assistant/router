import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deriveInvocationFreezerProducerEvolution} from '../invocation-freezer-producer-evolution.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const path='tools/translation/prepare-invocation-local-freezer.mjs';
const archive=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/current-receiving-source-history/complete-originals.json.gz',import.meta.url)),{maxOutputLength:1048576}));
const original=archive.templates.find(row=>row.path===path).source;
const current=readFileSync(new URL('../prepare-invocation-local-freezer.mjs',import.meta.url),'utf8');
test('complete original freezer producer derives the physical scanner successor through both CST phases',{timeout:60000},()=>{
 const row=deriveInvocationFreezerProducerEvolution(original,current);
 assert.equal(row.after,current);assert.equal(row.inverse,original);assert.equal(row.originalSha256,'f0cdde90b547b6c7a6f4e638ac4b12d3c323ca541dd0bac6632924409a78c602');
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(stage.trace.map(item=>item.phase),['language','repository']);}
 assert.equal(row.nativeSelections.length,2);assert.equal(row.stages[0].before,original);assert.equal(row.stages[1].after,current);
});
test('complete original producer remains a receiving preimage without replacing its original scanner contract',{timeout:60000},()=>{
 const row=deriveInvocationFreezerProducerEvolution(original,original);
 assert.equal(row.current,original);assert.equal(row.after,current);assert.ok(original.includes("if(before!==row.original&&before!==row.after)fail('unexpected complete current source')"));
 assert.ok(row.after.includes("if(sourceEvolution.original!==row.after)fail('complete original scanner source differs')"));
});
test('unknown complete producer edits and changed original history never gain a successor',{timeout:60000},()=>{
 for(const changed of [current+'\n// unrelated\n',current.replace("'./proof-scanner-source-evolution.mjs'","'./foreign.mjs'"),current.replace('sourceEvolution.original!==row.after','false'),current.replace("fail('complete physical source changed')","void 0")]){
  assert.notEqual(changed,current);assert.throws(()=>deriveInvocationFreezerProducerEvolution(original,changed),/unregistered complete current producer/);
 }
 assert.throws(()=>deriveInvocationFreezerProducerEvolution(original+' ',current),/complete original\/current source/);
});
