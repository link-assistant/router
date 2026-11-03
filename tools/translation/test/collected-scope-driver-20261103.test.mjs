// Complete actual immutable Git sources + original Rust/JS/TS collectors.
// All cases UNRUN during source-only drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,mkdirSync,writeFileSync,readFileSync,renameSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {collectRouterDraftScope} from '../../../scripts/collect-router-draft-scope-20261103.mjs';
function fixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'router-collected-scope-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const nil=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nil,GIT_CONFIG_SYSTEM:nil,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 const run=(args,options)=>execFileSync('git',args,{cwd:root,env,maxBuffer:40*1024*1024,timeout:20000,...options});
 run(['init','--quiet']);const put=(path,text)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),text);};
 put('rust/src/lib.rs','pub fn rust_fun() -> bool { true }\n');
 put('js/src/main.mjs','export function js_fun(){return true;}\n');
 put('ts/src/main.mts','export function ts_fun(): boolean{return true;}\n');
 put('js/package.json','{"type":"module"}\n');put('fixtures/independent.case','independent expected result: true\n');
 const commit=()=>{run(['add','--all']);run(['-c','user.name=Scope fixture','-c','user.email=scope@example.test','-c','core.hooksPath='+nil,'-c','commit.gpgsign=false','-c','gc.auto=0','-c','maintenance.auto=false','commit','--quiet','-m','scope fixture']);return run(['rev-parse','HEAD']).toString().trim();};
 const revision=commit();return {root,run,put,commit,revision};
}
function collect(data,assignments=[]){const events=[];const summary=collectRouterDraftScope({revision:data.revision,run:data.run,assignments},event=>{assert.equal(Object.isFrozen(event),true);events.push(event);});return {summary,events,rows:events.filter(event=>event.kind==='native-observation-batch').flatMap(event=>event.reconciliation.rows)};}
test('one complete committed selection reaches all three real language collectors and retains non-code package inputs',{timeout:120000},t=>{
 const data=fixture(t),result=collect(data);assert.equal(result.summary.collectionCompleted,true);assert.equal(result.summary.physicalSources,4);assert.equal(result.summary.refusedBatches,0);
 for(const name of ['rust_fun','js_fun','ts_fun'])assert.ok(result.rows.some(row=>row.observation.name===name),name);
 for(const event of result.events.filter(row=>row.kind==='native-observation-batch')){
  assert.deepEqual(event.trace,[{phase:'language',id:'language:complete-original-CST-and-native-scope-observations'},{phase:'repository',id:'repository:numbered-actual-adoptions-and-all-evidence-source-joins'}]);
  assert.deepEqual(event.ruleDiscovery.roots,['repository:numbered-actual-adoptions-and-all-evidence-source-joins']);assert.deepEqual(event.ruleDiscovery.dependencies,['language:complete-original-CST-and-native-scope-observations']);assert.equal(event.ruleDiscovery.semanticAuthority,false);
 }
 assert.ok(result.events.some(event=>event.kind==='physical-source-census'&&event.sources.some(row=>row.path==='js/package.json')));
 assert.equal(result.summary.productionFunctionDenominator,null);assert.equal(result.summary.translationCoverage,null);assert.equal(result.summary.completeProductionScope,false);assert.equal(result.summary.unassignedObservations,result.summary.observations);
 // Uncommitted edits cannot change an explicitly immutable source revision.
 data.put('rust/src/lib.rs','this uncommitted source must not be consumed');
 assert.deepEqual(collect(data).rows.map(row=>row.id),result.rows.map(row=>row.id));
});
test('new case-source changes invalidate a real observed assignment even when the production function is unchanged',{timeout:120000},t=>{
 const data=fixture(t),initial=collect(data),selected=initial.rows.find(row=>row.observation.name==='rust_fun'&&row.observation.kind==='parsed-function');assert.ok(selected);
 const source=selected.observation.origin,path='fixtures/independent.case',caseOrigin={revision:data.revision,path,blob:data.run(['rev-parse','HEAD:'+path]).toString().trim(),mode:'100644',bytes:readFileSync(join(data.root,path)).length};
 const lane=()=>({status:'required',paths:[]}),assignment={observation:selected.id,role:'application',reviewStatus:'OPEN',requirements:['L01','L02','T01'],implementations:[{path:source.path,symbol:'rust_fun',span:[selected.observation.span.byteStart,selected.observation.span.byteEnd]}],lanes:{forwardJavaScript:lane(),strictTypeScript:lane(),reverseRust:{status:'required',paths:[source.path]},synchronization:lane()},independentCases:[path],unresolved:['actual-cross-language-adoption-required'],evidence:[source,caseOrigin]};
 const joined=collect(data,[assignment]);assert.equal(joined.summary.physicalSources,5);assert.equal(joined.summary.assignedObservations,1);assert.equal(joined.summary.staleObservations,0);assert.equal(Object.isFrozen(assignment),false);assert.equal(Object.isFrozen(assignment.requirements),false);
 data.put(path,'changed independent case expectation\n');data.revision=data.commit();const stale=collect(data,[assignment]);assert.equal(stale.summary.staleObservations,1);assert.deepEqual(stale.rows.find(row=>row.id===selected.id).staleEvidence,[path]);
 data.put('rust/src/lib.rs','pub fn new_fun() -> bool { false }\n');data.revision=data.commit();const changed=collect(data,[assignment]);assert.equal(changed.summary.assignedObservations,0);assert.equal(changed.summary.unmatchedAssignments,1);assert.ok(changed.events.some(event=>event.kind==='unmatched-adoption-evidence'&&event.observations.includes(selected.id)));
});
test('every actual parsed source blob closes after its consumer; callback primaries survive closing failures',{timeout:120000},t=>{
 const data=fixture(t),sourceBlob=data.run(['rev-parse','HEAD:rust/src/lib.rs']).toString().trim(),path=join(data.root,'.git/objects',sourceBlob.slice(0,2),sourceBlob.slice(2));
 const primary=Object.freeze(new Error('consumer primary'));let thrown=false,changed=false;
 try{collectRouterDraftScope({revision:data.revision,run:data.run},event=>{
  if(!changed&&event.kind==='native-observation-batch'&&event.language==='Rust'){renameSync(path,path+'.saved');changed=true;throw primary;}
 });}catch(error){thrown=true;assert.equal(error,primary);}finally{if(changed)renameSync(path+'.saved',path);}
 assert.equal(thrown,true);assert.equal(changed,true);assert.equal(collect(data).summary.collectionCompleted,true);
});
test('falsy callback errors retain exact identity and invalid callback forms perform no Git I/O',{timeout:120000},t=>{
 const data=fixture(t);for(const primary of [undefined,null,false,0,'']){let thrown=false;try{collectRouterDraftScope({revision:data.revision,run:data.run},()=>{throw primary;});}catch(error){thrown=true;assert.equal(error,primary);}assert.equal(thrown,true);}
 let calls=0;assert.throws(()=>collectRouterDraftScope({revision:data.revision,run:()=>{calls++;throw Error('must not read');}},async()=>{}));assert.equal(calls,0);
});
test('lossy or truncated immutable Git metadata refuses before any observation event',()=>{
 for(const raw of [Buffer.from([0xff,0]),Buffer.from('100644 blob '+'b'.repeat(40)+'\trust/src/lib.rs')]){
  let emitted=0;assert.throws(()=>collectRouterDraftScope({revision:'a'.repeat(40),run:()=>raw},()=>{emitted++;}));assert.equal(emitted,0);
 }
});
