// Independent real-project move/recovery policy case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {planNativeLeafModuleMove,applyNativeLeafModuleMove} from '../native-module-move-20261101.mjs';
import {planDurableNativeLeafMove,applyDurableNativeLeafMove,recoverDurableNativeLeafMove} from '../native-leaf-move-recovery-20261101.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
const limits={timeout:60000,concurrency:false};
const supported=['linux','darwin'].includes(process.platform)&&Number.isInteger(fs.constants.O_DIRECTORY)&&Number.isInteger(fs.constants.O_NOFOLLOW);
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-native-project-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(name,text)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),text);},read=name=>fs.readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','user.name=Protected source fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Independent exact native source fixture']);};
 const owner='pub mod leaf;\npub fn ready()->bool{leaf::value()}\n',leaf='// Independent policy fixture 雪😀\npub fn value()->bool{true}\n';
 const unit={schema:'router-forward-project-unit-v1',id:'policy-case',entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/policy.mjs',typescript:'ts/src/policy.mts',meta:'translation/policy-case.json',inverse:'literals'};
 put('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');put('rust/Cargo.toml',fs.readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));put('Cargo.lock',fs.readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));put(unit.entry,owner);put('rust/src/leaf.rs',leaf);put('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 const initial={root,manifestPath:'unit.json'};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(initial)),initial);
 const request={schema:'router-native-leaf-module-move-20261101-v1',id:'policy-move',entry:unit.entry,from:'rust/src/leaf.rs',to:'rust/src/renamed.rs',module:'leaf',javascript:unit.javascript,typescript:unit.typescript,meta:unit.meta,baselineRevision:null};put('move.json',JSON.stringify(request));commit();
 const options={root,manifestPath:'move.json'},policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 return {root,put,read,owner,leaf,unit,request,options,policy,commit,nativePlan:()=>planNativeLeafModuleMove(options),nativeApply:plan=>applyNativeLeafModuleMove(JSON.stringify(plan),options),durablePlan:()=>planDurableNativeLeafMove(options),durableApply:plan=>applyDurableNativeLeafMove(JSON.stringify(plan),options),recover:(transactionPath,direction)=>recoverDurableNativeLeafMove({...options,transactionPath,direction})};
}
for(const durable of [false,true])for(const path of ['rust/src/leaf.rs','rust/src/renamed.rs','rust/src/lib.rs','translation/policy-case.json'])test((durable?'durable':'native')+' move refuses protected source/deletion/destination/review '+path,limits,t=>{
 if(durable&&!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t),plan=durable?a.durablePlan():a.nativePlan(),review=a.read(a.unit.meta);a.policy([path]);
 assert.throws(()=>durable?a.durableApply(plan):a.nativeApply(plan),/explicit authored\/unmanaged/u);
 assert.equal(a.read(a.request.from),a.leaf);assert.equal(a.read(a.unit.entry),a.owner);assert.equal(a.read(a.unit.meta),review);
 assert.equal(fs.existsSync(join(a.root,a.request.to)),false);assert.deepEqual(fs.readdirSync(join(a.root,'rust/src')).sort(),['leaf.rs','lib.rs']);
});
test('native no-op under authored/unmanaged policy retains the original source inode and paired bytes',limits,t=>{
 const a=fixture(t),js=a.read(a.unit.javascript),ts=a.read(a.unit.typescript);a.nativeApply(a.nativePlan());a.commit();a.policy([a.unit.entry],[a.request.to]);
 const inode=fs.statSync(join(a.root,a.request.to)).ino,result=a.nativeApply(a.nativePlan());assert.equal(result.noOp,true);assert.deepEqual(result.changed,[]);assert.equal(fs.statSync(join(a.root,a.request.to)).ino,inode);assert.equal(a.read(a.unit.javascript),js);assert.equal(a.read(a.unit.typescript),ts);
});
test('malformed ownership policy is captured before the fixed fresh native move producer',limits,t=>{
 const a=fixture(t),plan=a.nativePlan();a.put('move.json','{');a.put('translation/source-ownership.json','{"schema":"other","authored":[],"unmanaged":[]}');
 assert.throws(()=>a.nativeApply(plan),/explicit source ownership policy/u);assert.equal(a.read(a.request.from),a.leaf);assert.equal(fs.existsSync(join(a.root,a.request.to)),false);
});
test('recovery preflights actual current-to-terminal rows and preserves a protected no-op terminal',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();const plan=a.durablePlan(),rename=fs.renameSync,primary=new Error('independent owner interruption');let transactionPath,hit=false;
 const mock=t.mock.method(fs,'renameSync',(from,to,...rest)=>{if(!hit&&to===join(a.root,a.unit.entry)){hit=true;throw primary;}return rename(from,to,...rest);});
 try{assert.throws(()=>a.durableApply(plan),error=>{assert.equal(error,primary);transactionPath=error.recoveryPaths[0];return true;});}finally{mock.mock.restore();}assert.equal(hit,true);
 const before=fs.readdirSync(join(a.root,transactionPath)).sort();a.policy([a.unit.entry]);assert.throws(()=>a.recover(transactionPath,'finish'),/explicit authored\/unmanaged/u);assert.deepEqual(fs.readdirSync(join(a.root,transactionPath)).sort(),before);assert.equal(a.read(a.unit.entry),a.owner);
 assert.equal(a.recover(transactionPath,'rollback').complete,true);assert.equal(a.read(a.request.from),a.leaf);assert.equal(a.read(a.unit.entry),a.owner);assert.equal(fs.existsSync(join(a.root,a.request.to)),false);assert.equal(a.recover(transactionPath,'rollback').noOp,true);
});
test('finished durable recovery accepts newly protected matching source without rewriting it',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t),result=a.durableApply(a.durablePlan());a.policy([a.unit.entry,a.request.to],[a.request.from]);const inode=fs.statSync(join(a.root,a.request.to)).ino;
 assert.equal(a.recover(result.transactionPath,'finish').noOp,true);assert.equal(fs.statSync(join(a.root,a.request.to)).ino,inode);assert.equal(a.read(a.request.to),a.leaf);
});
