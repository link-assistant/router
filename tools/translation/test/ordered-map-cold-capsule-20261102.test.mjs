// DATA-boundary cases SOURCE only. Full cold compiler cases use the explicit
// installed-profile receiving entry; no new Host export is assumed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrderedMapForwardSourceCapsule,createOrderedMapReverseSourceCapsule,readOrderedMapForwardSourceCapsule,readOrderedMapReverseSourceCapsule,ORDERED_MAP_CAPSULE_LIMITS as L} from '../ordered-map-cold-capsule-20261102.mjs';
const options={timeout:60000,concurrency:false};
test('source capsules accept canonical primitive JSON rather than callbacks or public receipt objects',options,()=>{
 let calls=0;const value={toString(){calls++;return '{}';},toJSON(){calls++;return {};}};for(const run of [createOrderedMapForwardSourceCapsule,createOrderedMapReverseSourceCapsule,readOrderedMapForwardSourceCapsule,readOrderedMapReverseSourceCapsule]){for(const input of [value,undefined,null,[],0])assert.throws(()=>run(input),/canonical|JSON|string/);for(const input of [' {}','{}\n','{"schema":0,"schema":1}'])assert.throws(()=>run(input),/canonical/);}assert.equal(calls,0);
});
test('source capsule DATA depth is bounded before canonical reserialization',options,()=>{
 const text='['.repeat(L.depth+1)+'0'+']'.repeat(L.depth+1);assert.throws(()=>createOrderedMapForwardSourceCapsule(text),/depth|cell/);assert.throws(()=>readOrderedMapReverseSourceCapsule(text),/depth|cell/);
});
test('complete file byte bounds refuse before any source-profile producer',options,()=>{
 const packet={schema:'ordered-map-forward-source-packet-v1',entry:'src/lib.rs',files:[{path:'src/lib.rs',source:'x'.repeat(L.file+1)}],cargoManifest:'',cargoLock:'',compilationProfile:null};assert.throws(()=>createOrderedMapForwardSourceCapsule(JSON.stringify(packet)),/source images|byte bound/);
});
test('bare meta public flags unknown fields and wrong capsule direction grant no source context',options,()=>{
 const source={schema:'ordered-map-forward-source-packet-v1',entry:'src/lib.rs',files:[],cargoManifest:'',cargoLock:'',compilationProfile:null};for(const extra of [{semanticAuthority:true},{privateReceiptsSerialized:false},{sourceContext:{genuine:true}}])assert.throws(()=>readOrderedMapForwardSourceCapsule(JSON.stringify({schema:'router-ordered-map-source-capsule-20261102-v1',direction:'forward',source,meta:'{}',...extra})),/shape/);assert.throws(()=>readOrderedMapReverseSourceCapsule(JSON.stringify({schema:'router-ordered-map-source-capsule-20261102-v1',direction:'forward',source,meta:'{}'})),/direction/);
});
