// Independent source freshness and operation-lifetime cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {rustFixedType} from '../checked-types.mjs';
import {originalPrimitiveCopySource,sharedReferenceCopyIdentity,SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE} from '../shared-reference-copy-source.mjs';
import {currentPrimitiveCopySource,currentSharedReferenceCopyIdentity,withCurrentStandardCopySourceOperation,SHARED_REFERENCE_COPY_SOURCE as currentShared,STANDARD_OPTION_COPY_SOURCE as currentOption} from '../current-standard-copy-source.mjs';
import {withFreshStandardCopyInputs} from '../fresh-standard-copy-inputs.mjs';
import {prepareFreshStandardCopySources} from '../prepare-fresh-standard-copy-sources.mjs';
const limits={timeout:60000},root=new URL('../',import.meta.url);
const inputs=['copy-standard/rust-marker-1.89.0.rs.gz','option-deref/core-option.rs.gz','option-deref/manifest.json','copy-standard/LICENSE-MIT','copy-standard/LICENSE-APACHE','option-deref/LICENSE-MIT','option-deref/LICENSE-APACHE'];
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-fresh-copy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const name of inputs){const destination=join(directory,name);mkdirSync(dirname(destination),{recursive:true});copyFileSync(new URL('source-profiles/'+name,root),destination);}return directory;
}
const primitive=name=>({...rustFixedType(name),rustPrimitiveName:name});
function changed(path){const original=readFileSync(path),bytes=Buffer.from(original);bytes[bytes.length-1]^=1;writeFileSync(path,bytes);return original;}
function caught(run){try{run();return {thrown:false};}catch(value){return {thrown:true,value};}}
test('fresh Copy inputs retain complete sources and explicitly deny authority',limits,t=>{
 const directory=fixture(t),frame=withFreshStandardCopyInputs(value=>value,{directory});
 assert.deepEqual(frame.inputFiles,inputs);assert.equal(frame.sources.length,2);assert.ok(Object.isFrozen(frame.sources));
 assert.deepEqual(frame.sources.map(row=>[row.path,row.bytes]),[['library/core/src/marker.rs',53066],['library/core/src/option.rs',86718]]);
 for(const row of [frame,...frame.sources]){assert.equal(row.sourceAuthority,false);assert.equal(row.namespaceAuthority,false);assert.equal(row.runtimeAuthority,false);assert.ok(Object.isFrozen(row));}
 assert.equal(frame.crossInvocationCache,false);assert.ok(frame.sources[0].source.includes('pub trait Copy'));assert.ok(frame.sources[1].source.includes('pub enum Option'));
});
test('every pinned archive, manifest and license is checked before the callback and again at close',limits,t=>{
 const directory=fixture(t);
 for(const name of inputs){const path=join(directory,name),original=changed(path);let called=false;
  assert.throws(()=>withFreshStandardCopyInputs(()=>{called=true;},{directory}));assert.equal(called,false);writeFileSync(path,original);
  assert.throws(()=>withFreshStandardCopyInputs(()=>{changed(path);return 'unqualified';},{directory}));writeFileSync(path,original);
  assert.equal(withFreshStandardCopyInputs(()=>true,{directory}),true);
 }
});
test('a successful previous read cannot authorize changed bytes in a later call',limits,t=>{
 const directory=fixture(t);assert.equal(withFreshStandardCopyInputs(()=>7,{directory}),7);changed(join(directory,inputs[0]));let called=false;
 assert.throws(()=>withFreshStandardCopyInputs(()=>{called=true;},{directory}));assert.equal(called,false);
});
test('callback throw values survive simultaneous closing failures and restoration permits a new call',limits,t=>{
 const directory=fixture(t),path=join(directory,inputs[2]);
 for(const sentinel of [null,undefined,new Error('original caller failure')]){let original;
  const result=caught(()=>withFreshStandardCopyInputs(()=>{original=changed(path);throw sentinel;},{directory}));assert.equal(result.thrown,true);assert.strictEqual(result.value,sentinel);writeFileSync(path,original);
  assert.equal(withFreshStandardCopyInputs(()=>true,{directory}),true);
 }
});
test('source fences reject asynchronous and proxy callbacks/results without reading then getters',limits,t=>{
 const directory=fixture(t);let reads=0;const thenable=Object.create({get then(){reads++;throw new Error('getter must not run');}});
 assert.throws(()=>withFreshStandardCopyInputs(()=>thenable,{directory}));assert.equal(reads,0);
 assert.throws(()=>withFreshStandardCopyInputs(async()=>1,{directory}));assert.throws(()=>withFreshStandardCopyInputs(new Proxy(()=>1,{}),{directory}));
 assert.throws(()=>withFreshStandardCopyInputs(()=>new Proxy({},{}),{directory}));assert.throws(()=>withFreshStandardCopyInputs(()=>Promise.resolve(1),{directory}));
 assert.throws(()=>withFreshStandardCopyInputs(()=>1,{directory:17}));
});
test('all primitive Copy facts preserve old shapes while separate operations issue independent records',limits,()=>{
 const domains=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'].map(primitive);domains.push({kind:'bool'},{kind:'float',rustPrimitiveName:'f64'});
 for(const type of domains){const old=originalPrimitiveCopySource(type),first=currentPrimitiveCopySource(type),second=currentPrimitiveCopySource(type);
  assert.ok(first);assert.deepEqual(first,old);assert.deepEqual(second,old);assert.notStrictEqual(first,second);assert.equal(first.namespaceAuthority,false);
  withCurrentStandardCopySourceOperation(()=>{const local=currentPrimitiveCopySource(type);assert.strictEqual(currentPrimitiveCopySource(type),local);withCurrentStandardCopySourceOperation(()=>assert.strictEqual(currentPrimitiveCopySource(type),local));});
 }
 assert.strictEqual(currentShared,SHARED_REFERENCE_COPY_SOURCE);assert.strictEqual(currentOption,STANDARD_OPTION_COPY_SOURCE);
});
test('type refusal and shared reference identity retain their original domains',limits,()=>{
 for(const type of [null,{kind:'data',name:'Local'},{...primitive('u64'),rustOwnership:{kind:'owned'}},{...primitive('u64'),rustReference:{kind:'shared'}},{...primitive('u64'),rustGenericIdentityUnresolved:true}])assert.equal(currentPrimitiveCopySource(type),originalPrimitiveCopySource(type));
 const shared={kind:'fixed',rustReference:{kind:'shared',pointee:primitive('u64')}};
 assert.equal(currentSharedReferenceCopyIdentity(shared),sharedReferenceCopyIdentity(shared));assert.equal(currentSharedReferenceCopyIdentity({...shared,rustReference:{...shared.rustReference,kind:'mutable'}}),null);
});
test('operation state is cleared after throws, invalid results and depth refusals',limits,()=>{
 const type=primitive('u64'),first=currentPrimitiveCopySource(type);
 for(const sentinel of [undefined,null,new Error('failure')]){const result=caught(()=>withCurrentStandardCopySourceOperation(()=>{currentPrimitiveCopySource(type);throw sentinel;}));assert.equal(result.thrown,true);assert.strictEqual(result.value,sentinel);assert.notStrictEqual(currentPrimitiveCopySource(type),first);}
 assert.throws(()=>withCurrentStandardCopySourceOperation(()=>({then(){}})));
 const descend=()=>withCurrentStandardCopySourceOperation(descend);assert.throws(descend,/bounded nested/u);assert.deepEqual(currentPrimitiveCopySource(type),first);
});
// Isolate only source-data files; compiler imports still resolve to original
// modules. Never mutate checked-in inputs shared by concurrent test files.
async function isolatedCurrent(t){
 const directory=fixture(t),profiles=join(directory,'source-profiles');mkdirSync(profiles,{recursive:true});
 for(const name of inputs){const destination=join(profiles,name);mkdirSync(dirname(destination),{recursive:true});copyFileSync(join(directory,name),destination);}
 for(const name of ['fresh-standard-copy-inputs.mjs','current-standard-copy-source.mjs']){
  let source=readFileSync(new URL(name,root),'utf8');source=source.replace(/from '(\.\.?\/[^']+)'/gu,(whole,path)=>path==='./fresh-standard-copy-inputs.mjs'?whole:'from '+JSON.stringify(new URL(path,root).href));
  writeFileSync(join(directory,name),source);
 }
 return {api:await import(pathToFileURL(join(directory,'current-standard-copy-source.mjs')).href),profiles};
}
test('private Copy consumers fence current files even when a fact was already read inside the operation',limits,async t=>{
 const {api,profiles}=await isolatedCurrent(t),type=primitive('u64');
 for(const name of inputs){const path=join(profiles,name);let original;
  assert.throws(()=>api.withCurrentStandardCopySourceOperation(()=>{assert.ok(api.currentPrimitiveCopySource(type));original=changed(path);assert.ok(api.currentPrimitiveCopySource(type));}));
  writeFileSync(path,original);assert.deepEqual(api.currentPrimitiveCopySource(type),originalPrimitiveCopySource(type));
 }
});
test('twenty-four complete source equations retain complete inverses and the two rule phases',limits,()=>{
 const plan=prepareFreshStandardCopySources();assert.equal(plan.files.length,24);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
