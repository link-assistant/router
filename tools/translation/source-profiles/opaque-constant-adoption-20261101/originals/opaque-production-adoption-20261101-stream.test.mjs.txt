// Original corpus vs per-event DATA/CST domain source cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withActualPolicySourceUniverse} from '../policy-nominal-producer-20261101-corpus.mjs';
import {createOpaqueAdoptionView,opaqueAdoptionPaths,opaqueAdoptionSource,closeOpaqueAdoptionView} from '../opaque-production-adoption-20261101-view.mjs';
import {emitOpaqueSourcePair,emitOpaqueStructuredData} from '../opaque-production-adoption-20261101-source-events.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copiedNative} from './opaque-production-adoption-20261101-fixtures.mjs';
const options={timeout:60000};
test('more than1024 whole files stay in the actual corpus rather than a fixture owner subset',options,t=>{
 const extra=Array.from({length:1100},(_,i)=>({path:'rust/tests/opaque_unchanged_'+i+'.rs',source:'// independent full source '+i+'\n'})),root=copiedNative(t,extra);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);try{const paths=opaqueAdoptionPaths(view);assert.ok(paths.length>1024);for(const row of extra)assert.equal(opaqueAdoptionSource(view,row.path),row.source);}finally{closeOpaqueAdoptionView(view);}});
});
test('ordinary16MiB DATA stays separate from raw18MiB captured originals and actual full-CST refusal',options,t=>{
 const extras=Array.from({length:3},(_,i)=>({path:'rust/tests/opaque_large_'+i+'.rs',source:'/*'+String(i).repeat(6*1024*1024-5)+'*/\n'})),root=copiedNative(t,extras);let raw=0,refusals=0;
 assert.throws(()=>accountData(extras),/budget/);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,event=>{accountData(event);if(event.kind==='complete-source-chunk'){assert.ok(event.source.length<=65536);raw+=Buffer.byteLength(event.source);}if(event.kind==='complete-source-cst-refusal'){refusals++;assert.equal(event.cstProduced,false);assert.equal(event.completeRawSourcesDelivered,true);}return null;});try{for(const row of extras){const source=opaqueAdoptionSource(view,row.path),result=emitOpaqueSourcePair(view,{path:row.path,phase:'independent-original-CST-domain',before:source,after:source});assert.equal(result.cstProduced,false);}assert.equal(refusals,3);assert.equal(raw,extras.reduce((sum,row)=>sum+Buffer.byteLength(row.source)*3,0));}finally{closeOpaqueAdoptionView(view);}});
});
test('representable whole sources transport complete metadata and canonical JSON traces in bounded chunks',options,t=>{
 const root=copiedNative(t),parts=new Map(),jsonParts=[];withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,event=>{if(event.kind==='complete-source-chunk'){const previous=parts.get(event.role)??'';assert.equal(event.offset,previous.length);parts.set(event.role,previous+event.source);}if(event.kind==='complete-data-json-chunk')jsonParts.push(event.source);return null;});try{const source='pub fn independently_checked(value:u64)->u64{value}\n';assert.equal(emitOpaqueSourcePair(view,{path:'independent-full-source.rs',phase:'CST-only-DATA-control',before:source,after:source}).cstProduced,true);assert.equal(parts.get('before'),source);assert.equal(parts.get('after'),source);assert.equal(parts.get('inverse'),source);assert.equal(transportConcreteSyntaxMeta(parts.get('beforeMeta')).source,source);assert.equal(transportConcreteSyntaxMeta(parts.get('afterMeta')).source,source);assert.deepEqual(JSON.parse(jsonParts.join('')).trace.map(row=>row.phase),['language','repository']);}finally{closeOpaqueAdoptionView(view);}});
});
test('structured metadata chunks retain alias occurrences JSON escapes and surrogate pairs exactly',options,t=>{
 const root=copiedNative(t),source=('é😀\\\"\n').repeat(40000),shared={source},value={left:shared,right:shared},parts=[];withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,event=>{accountData(event);if(event.kind==='complete-data-json-chunk')parts.push(event.source);return null;});try{emitOpaqueStructuredData(view,{phase:'independent-full-alias-DATA'},value);assert.equal(parts.join(''),JSON.stringify(value));assert.deepEqual(JSON.parse(parts.join('')),value);}finally{closeOpaqueAdoptionView(view);}});
});
