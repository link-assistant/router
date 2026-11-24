// Independent native directory close/resource cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {captureExplicitSourceMutationPolicy} from '../unit-runtime-materialization.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'staged-entry-closing-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const name of ['source/first.mjs','source/second.mjs']){fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),'before');}return root;}
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('opaque original native directory failure'))])test('directory handles and metadata close after exact primary '+String(primary),limits,t=>{
 const root=fixture(t),scope=captureExplicitSourceMutationPolicy(root),open=fs.opendirSync,lstat=fs.lstatSync;let failed=false,opened=0,closed=0,postFailureStats=0;
 const dirs=t.mock.method(fs,'opendirSync',(path,...rest)=>{const handle=open(path,...rest);opened++;return {readSync(){if(!failed){failed=true;throw primary;}return handle.readSync();},closeSync(){closed++;return handle.closeSync();}};});
 const stats=t.mock.method(fs,'lstatSync',(...args)=>{if(failed)postFailureStats++;return lstat(...args);});let caught=false;try{scope.allowMutationPaths(['source/first.mjs']);}catch(error){caught=true;assert.equal(error,primary);}finally{dirs.mock.restore();stats.mock.restore();assert.throws(()=>scope.close(),/revoked/u);}assert.equal(caught,true);assert.ok(opened>=2);assert.equal(closed,opened);assert.ok(postFailureStats>1);
});
test('exhausted native entry metadata budget still closes every opened directory and poisons scope',limits,t=>{
 const root=fixture(t),scope=captureExplicitSourceMutationPolicy(root),open=fs.opendirSync;let opened=0,closed=0;
 const mock=t.mock.method(fs,'opendirSync',(path,...rest)=>{const handle=open(path,...rest);opened++;let extra=0,nativeDone=false;return {readSync(){if(!nativeDone){const entry=handle.readSync();if(entry!==null)return entry;nativeDone=true;}return {name:Buffer.from('independent-budget-entry-'+extra++)};},closeSync(){closed++;return handle.closeSync();}};});
 try{assert.throws(()=>scope.allowMutationPaths(['source/first.mjs']),/bound/u);}finally{mock.mock.restore();assert.throws(()=>scope.close(),/revoked/u);}assert.ok(opened>=2);assert.equal(closed,opened);
});
test('subclass inherited iterators cannot replace validated physical entry path values',limits,t=>{
 const root=fixture(t),scope=captureExplicitSourceMutationPolicy(root);let invoked=0;class OwnPaths extends Array{[Symbol.iterator](){invoked++;throw new Error('iterator must not run');}}
 try{scope.allowMutationPaths(new OwnPaths('source/first.mjs'));scope.verify();}finally{scope.close();}assert.equal(invoked,0);
});
