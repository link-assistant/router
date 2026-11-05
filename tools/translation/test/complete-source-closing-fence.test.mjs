// Complete source closing lifecycle cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {withCompleteSourceClosingFence as close,requireSynchronousSourceCallback} from '../complete-source-closing-fence.mjs';
import {withFreshImplNamespaceSource as single} from '../fresh-impl-namespace-source.mjs';
import {withFreshAncestorNamespaceSources as multi,withFreshImplNamespaceSource as copiedSingle} from '../fresh-ancestor-namespace-source.mjs';
import {prepareCompleteSourceClosingSources} from '../prepare-complete-source-closing-sources.mjs';
const limits={timeout:60000},sourceRoot=fileURLToPath(new URL('../source-profiles/derive-ancestor-scope/',import.meta.url));
function caught(run){try{return {thrown:false,value:run()};}catch(value){return {thrown:true,value};}}
function fixture(t){const parent=mkdtempSync(join(tmpdir(),'router-complete-closing-')),directory=join(parent,'source-profiles','derive-ancestor-scope');mkdirSync(directory,{recursive:true});t.after(()=>rmSync(parent,{recursive:true,force:true}));copyFileSync(join(sourceRoot,'manifest.json'),join(directory,'manifest.json'));const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));for(const pin of manifest.sources){const path=resolve(directory,pin.archive);mkdirSync(dirname(path),{recursive:true});copyFileSync(resolve(sourceRoot,pin.archive),path);}return {directory,manifest};}
function changed(path){const original=readFileSync(path),value=Buffer.from(original);value[value.length-1]^=1;writeFileSync(path,value);return original;}
test('all closing callbacks run in order after successful work even when several throw',limits,()=>{
 const events=[],first=new Error('first closing failure'),second=new Error('second closing failure'),result=caught(()=>close(()=>{events.push('work');return 'result';},[()=>{events.push('first');throw first;},()=>{events.push('second');throw second;},()=>{events.push('final');}]));assert.deepEqual(events,['work','first','second','final']);assert.equal(result.thrown,true);assert.strictEqual(result.value,first);
});
test('primary errors including null and undefined survive every closing failure',limits,()=>{
 for(const primary of [null,undefined,new Error('primary'),Symbol('primary')]){const events=[],result=caught(()=>close(()=>{events.push('work');throw primary;},[()=>{events.push('one');throw null;},()=>{events.push('two');throw undefined;},()=>{events.push('three');}]));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);assert.deepEqual(events,['work','one','two','three']);}
 const result=caught(()=>close(()=>true,[()=>{throw undefined;}]));assert.equal(result.thrown,true);assert.equal(result.value,undefined);assert.equal(close(()=>7,[]),7);
});
test('invalid async and thenable results still close every input without getter invocation',limits,()=>{
 let reads=0,closed=0;const result=Object.create({get then(){reads++;throw new Error('must not read');}});assert.throws(()=>close(()=>result,[()=>{closed++;},()=>{closed++;}]),/finish synchronously/u);assert.equal(reads,0);assert.equal(closed,2);
 const events=[];assert.throws(()=>close(()=>1,[()=>Promise.resolve('later'),()=>{events.push('closed');}]),/finish synchronously/u);assert.deepEqual(events,['closed']);
});
test('callback/array validation refuses proxies and accessor fields before work',limits,()=>{
 let applied=0,read=0,worked=false;const proxy=new Proxy(()=>true,{apply(){applied++;return true;}});assert.throws(()=>requireSynchronousSourceCallback(proxy));assert.equal(applied,0);assert.throws(()=>close(async()=>1,[]));
 const callbacks=[];Object.defineProperty(callbacks,'0',{configurable:true,get(){read++;return ()=>true;}});assert.throws(()=>close(()=>{worked=true;},callbacks));assert.equal(read,0);assert.equal(worked,false);assert.throws(()=>close(()=>1,[async()=>true]));assert.throws(()=>close(()=>1,Object.assign([()=>true],{extra:true})));
});
for(const reader of [single,copiedSingle])test('the actual single-source reader preserves callback throws during manifest closing failure '+(reader===single?'primary':'copied'),limits,t=>{
 const {directory}=fixture(t),path=join(directory,'manifest.json');for(const primary of [null,undefined,new Error('reader callback')]){let original;const result=caught(()=>reader(()=>{original=changed(path);throw primary;},{directory}));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);writeFileSync(path,original);assert.equal(reader(frame=>frame.source.length,{directory}),65553);}
 let called=false;assert.throws(()=>reader(async()=>{called=true;},{directory}),/finish synchronously/u);assert.equal(called,false);let reads=0;assert.throws(()=>reader(()=>({get then(){reads++;throw new Error('not read');}}),{directory}),/finish synchronously/u);assert.equal(reads,0);
});
test('the actual multi-source reader preserves primary errors and recovers on the next fresh call',limits,t=>{
 const {directory,manifest}=fixture(t),paths=manifest.sources.slice(0,2).map(row=>row.path),path=join(directory,'manifest.json');for(const primary of [null,undefined,new Error('ancestor callback')]){let original;const result=caught(()=>multi(paths,()=>{original=changed(path);throw primary;},{directory}));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);writeFileSync(path,original);assert.equal(multi(paths,frame=>frame.sources.length,{directory}),2);}
 let called=false;assert.throws(()=>multi(paths,async()=>{called=true;},{directory}),/finish synchronously/u);assert.equal(called,false);
});
test('five complete source equations retain full originals, inverses and both declared phases',limits,()=>{
 const plan=prepareCompleteSourceClosingSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
