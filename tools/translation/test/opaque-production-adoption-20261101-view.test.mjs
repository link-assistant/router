// Independent actual opaque-token/callback/input source cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {withActualPolicySourceUniverse} from '../policy-nominal-producer-20261101-corpus.mjs';
import {createOpaqueAdoptionView,opaqueAdoptionPaths,opaqueAdoptionSource,emitOpaqueAdoptionEvent,advanceOpaqueAdoptionView,skipOpaqueAdoptionStage,closeOpaqueAdoptionView,assertOpaqueAdoptionView} from '../opaque-production-adoption-20261101-view.mjs';
import {emitOpaqueSourcePair,emitOpaqueStructuredData} from '../opaque-production-adoption-20261101-source-events.mjs';
import {produceOpaqueLocalStage} from '../opaque-production-adoption-20261101-local-closure.mjs';
import {produceOpaqueJsonFieldStage} from '../opaque-production-adoption-20261101-json-fields.mjs';
import {copiedNative,exactThrown} from './opaque-production-adoption-20261101-fixtures.mjs';
const options={timeout:60000};
test('copied complete corpus token is real while fake/detached/expired views grant no transition',options,t=>{
 const root=copiedNative(t);let expired;withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);expired=view;try{const paths=opaqueAdoptionPaths(view);assert.ok(paths.length>5);assert.equal(typeof opaqueAdoptionSource(view,paths[0]),'string');assert.throws(()=>createOpaqueAdoptionView({...context},()=>null));assert.throws(()=>opaqueAdoptionSource({...view},paths[0]));assert.throws(()=>advanceOpaqueAdoptionView(view,{schema:'actual-opaque-json-fields-candidate-result-20261101',updates:[]}));}finally{closeOpaqueAdoptionView(view);}});assert.throws(()=>opaqueAdoptionPaths(expired));assert.throws(()=>produceOpaqueJsonFieldStage(expired));
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen observer failure'))])test('observer fault stays sticky and exact through caught attempts/closing '+String(primary),options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>{throw primary;});try{assert.equal(exactThrown(()=>emitOpaqueAdoptionEvent(view,{kind:'independent-control'})),primary);assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),primary);assert.equal(exactThrown(()=>emitOpaqueStructuredData(view,{phase:'caught-then-retry'},{source:'must not resume'})),primary);}finally{closeOpaqueAdoptionView(view);}});
});
for(const answer of [Promise.resolve(null),{then(){return null;}},new Proxy({},{})])test('observer invalid result poisons ordinary attempts',options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>answer);try{const primary=exactThrown(()=>emitOpaqueAdoptionEvent(view,{kind:'independent-control'}));assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),primary);}finally{closeOpaqueAdoptionView(view);}});
});
test('recursive delivery is refused immediately and remains sticky',options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{let view;view=createOpaqueAdoptionView(context,()=>emitOpaqueAdoptionEvent(view,{kind:'nested-independent-event'}));try{const primary=exactThrown(()=>emitOpaqueAdoptionEvent(view,{kind:'outer-independent-event'}));assert.match(primary.message,/recursive/);assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),primary);}finally{closeOpaqueAdoptionView(view);}});
});
test('whole original same-byte replacement cannot be hidden by successful callback DATA',options,t=>{
 const root=copiedNative(t);assert.throws(()=>withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);try{const path=opaqueAdoptionPaths(view)[0],full=join(root,path),bytes=fs.readFileSync(full);fs.writeFileSync(full+'.replacement',bytes);fs.renameSync(full+'.replacement',full);emitOpaqueSourcePair(view,{path,phase:'independent-stale-control',before:opaqueAdoptionSource(view,path),after:opaqueAdoptionSource(view,path)});}finally{closeOpaqueAdoptionView(view);}}),/changed|identity|invalidated|original/i);
});

test('genuine ahead-produced local token cannot skip the whole-view revision fence',options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);try{const token=produceOpaqueLocalStage(view,'local-option');for(const stage of ['output-owners','local-language','canonical-readers'])skipOpaqueAdoptionStage(view,stage);assert.throws(()=>advanceOpaqueAdoptionView(view,token),/fixed actual kernel result/);assert.throws(()=>advanceOpaqueAdoptionView(view,token),/privately produced/);}finally{closeOpaqueAdoptionView(view);}});
});

test('caught temporary WeakMap prototype replacement cannot expose a private issuer map or clear failure',options,t=>{
 const root=copiedNative(t);assert.throws(()=>withActualPolicySourceUniverse({root},context=>{let view,first,intercepted=false;const get=WeakMap.prototype.get;view=createOpaqueAdoptionView(context,()=>{try{WeakMap.prototype.get=function(){intercepted=true;throw false;};first=exactThrown(()=>opaqueAdoptionPaths(view));}finally{WeakMap.prototype.get=get;}return null;});try{assert.equal(exactThrown(()=>emitOpaqueAdoptionEvent(view,{kind:'independent-intrinsic-control'})),first);assert.equal(intercepted,false);assert.match(first.message,/private state operations/);assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),first);}finally{WeakMap.prototype.get=get;closeOpaqueAdoptionView(view);}}),/invalidated|private state/i);
});

test('foreign reply prototype hooks are refused before then lookup without running their traps',options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{let called=false;const answer=Object.create(new Proxy({},{has(){called=true;throw false;}})),view=createOpaqueAdoptionView(context,()=>answer);try{const primary=exactThrown(()=>emitOpaqueAdoptionEvent(view,{kind:'independent-prototype-control'}));assert.equal(called,false);assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),primary);}finally{closeOpaqueAdoptionView(view);}});
});

test('a caught missing-source read or source-option accessor cannot clear an actual view failure',options,t=>{
 const root=copiedNative(t);for(const invalid of ['missing','getter'])assert.throws(()=>withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);let called=false;try{const sourceOptions={};Object.defineProperty(sourceOptions,'original',{get(){called=true;throw false;}});const primary=exactThrown(()=>invalid==='missing'?opaqueAdoptionSource(view,'rust/src/definitely-absent-opaque-source.rs'):opaqueAdoptionSource(view,opaqueAdoptionPaths(view)[0],sourceOptions));assert.equal(called,false);assert.equal(exactThrown(()=>assertOpaqueAdoptionView(view)),primary);}finally{closeOpaqueAdoptionView(view);}}),/invalidated/);
});
