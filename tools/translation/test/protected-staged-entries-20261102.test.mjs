// Independent actual native filesystem entry cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
import {captureExplicitSourceMutationPolicy,installFreshSourceProposal} from '../unit-runtime-materialization.mjs';
import {installFreshSourceProposal as installOriginalGeneric} from '../owned-project-runtime-materialization.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'staged-native-entry-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,bytes)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),bytes);},read=path=>fs.readFileSync(join(root,path),'utf8');
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));put('source/authored.mjs','before');put('source/ordinary.mjs','before');put('source/stage.mjs','after');
 const row=path=>({path,before:read(path),after:'after',mode:fs.statSync(join(root,path)).mode&0o777});
 const proposal=rows=>({schema:'independent-staged-entry-source',root,baseRevision:null,inputs:[],outputs:rows});return {root,put,read,policy,row,proposal};
}
function denied(a,path){const scope=captureExplicitSourceMutationPolicy(a.root);try{assert.throws(()=>scope.allowMutationPaths([path]),/retained|alias|spelling|equivalence/u);assert.throws(()=>scope.verify(),/revoked/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}}
test('staged scopes and actual shared installer retain distinct hard-link directory entries',limits,t=>{
 const a=fixture(t);fs.unlinkSync(join(a.root,'source/ordinary.mjs'));fs.linkSync(join(a.root,'source/authored.mjs'),join(a.root,'source/ordinary.mjs'));a.policy(['source/authored.mjs']);const inode=fs.statSync(join(a.root,'source/authored.mjs')).ino,plan=a.proposal([a.row('source/ordinary.mjs')]);installFreshSourceProposal(JSON.stringify(plan),()=>plan);assert.equal(a.read('source/authored.mjs'),'before');assert.equal(fs.statSync(join(a.root,'source/authored.mjs')).ino,inode);assert.equal(a.read('source/ordinary.mjs'),'after');assert.notEqual(fs.statSync(join(a.root,'source/ordinary.mjs')).ino,inode);
});
test('protected symlink declarations retain their physical target entry before any shared installation',limits,t=>{
 const a=fixture(t);fs.symlinkSync('authored.mjs',join(a.root,'source/declaration.mjs'));a.policy(['source/declaration.mjs']);const plan=a.proposal([a.row('source/authored.mjs')]);assert.throws(()=>installFreshSourceProposal(JSON.stringify(plan),()=>plan),/physical entry retained/u);assert.equal(a.read('source/authored.mjs'),'before');denied(a,'source/authored.mjs');
});
test('unlisted final symlink entry replacement preserves the protected target',limits,t=>{
 const a=fixture(t);a.policy(['source/authored.mjs']);fs.symlinkSync('authored.mjs',join(a.root,'source/unlisted.mjs'));const scope=captureExplicitSourceMutationPolicy(a.root);try{scope.allowMutationPaths(['source/stage.mjs','source/unlisted.mjs']);fs.renameSync(join(a.root,'source/stage.mjs'),join(a.root,'source/unlisted.mjs'));scope.verify();}finally{scope.close();}assert.equal(a.read('source/authored.mjs'),'before');assert.equal(a.read('source/unlisted.mjs'),'after');assert.equal(fs.lstatSync(join(a.root,'source/unlisted.mjs')).isSymbolicLink(),false);
});
test('intermediate symlink endpoints and existing source ancestors cannot be renamed away',limits,t=>{
 const a=fixture(t);a.put('actual/value.mjs','before');fs.symlinkSync('../actual',join(a.root,'source/linked-dir'));a.policy(['source/linked-dir/value.mjs']);denied(a,'actual/value.mjs');denied(a,'source/linked-dir');denied(a,'actual');assert.equal(a.read('actual/value.mjs'),'before');
});
test('missing policy self through a declared alias and missing name ambiguity refuse',limits,t=>{
 const a=fixture(t);a.policy(['source/FUTURE.mjs']);denied(a,'source/future.mjs');a.policy(['source/café.mjs']);denied(a,'source/café.mjs');fs.unlinkSync(join(a.root,'translation/source-ownership.json'));fs.symlinkSync('../translation',join(a.root,'source/policy-parent'));denied(a,'source/policy-parent/source-ownership.json');assert.equal(fs.existsSync(join(a.root,'translation/source-ownership.json')),false);
});
test('existing case alias is refused on filesystems exposing that native alias',limits,t=>{
 const a=fixture(t),variant='source/AUTHORED.mjs';let stat;try{stat=fs.statSync(join(a.root,variant));}catch(error){if(error?.code==='ENOENT'){t.skip('case-insensitive existing-entry platform remains unqualified here');return;}throw error;}if(stat.ino!==fs.statSync(join(a.root,'source/authored.mjs')).ino){t.skip('distinct native case entries');return;}a.policy([variant]);denied(a,'source/authored.mjs');assert.equal(a.read('source/authored.mjs'),'before');
});
test('initial output equality does not authorize a later changed public path in the actual shared installer',limits,t=>{
 const a=fixture(t);fs.unlinkSync(join(a.root,'source/ordinary.mjs'));fs.linkSync(join(a.root,'source/authored.mjs'),join(a.root,'source/ordinary.mjs'));a.policy(['source/authored.mjs']);const row=a.row('source/ordinary.mjs'),plan=a.proposal([row]),original=fs.writeFileSync;let hit=false;
 const mock=t.mock.method(fs,'writeFileSync',(path,...rest)=>{const result=original(path,...rest);if(!hit&&typeof path==='string'&&path.includes('.router-source-install-')&&path.endsWith('/stage-0')){hit=true;row.path='source/authored.mjs';}return result;});syncBuiltinESMExports();try{assert.throws(()=>installFreshSourceProposal(JSON.stringify(plan),()=>plan),/authored|unmanaged/u);}finally{mock.mock.restore();syncBuiltinESMExports();}assert.equal(hit,true);assert.equal(a.read('source/authored.mjs'),'before');assert.equal(a.read('source/ordinary.mjs'),'before');
});
test('actual original generic guard uses the captured IO target despite a path getter changing after reads',limits,t=>{
 const a=fixture(t);a.policy(['source/authored.mjs']);const row=a.row('source/ordinary.mjs');let requested='source/ordinary.mjs',ordinaryReads=0,switched=false,restored=false;Object.defineProperty(row,'path',{get:()=>requested,enumerable:true});const plan=a.proposal([row]),open=fs.openSync,close=fs.closeSync,files=new Map();
 const opening=t.mock.method(fs,'openSync',(path,...rest)=>{const fd=open(path,...rest);files.set(fd,path);return fd;});
 const closing=t.mock.method(fs,'closeSync',fd=>{const path=files.get(fd);files.delete(fd);const result=close(fd);if(path===join(a.root,'source/ordinary.mjs')&&++ordinaryReads===2){requested='source/authored.mjs';switched=true;}else if(switched&&!restored&&path===join(a.root,'source/authored.mjs')){requested='source/ordinary.mjs';restored=true;}return result;});syncBuiltinESMExports();
 try{assert.throws(()=>installOriginalGeneric(JSON.stringify(plan),()=>plan),/authored|unmanaged/u);}finally{opening.mock.restore();closing.mock.restore();syncBuiltinESMExports();}assert.equal(switched,true);assert.equal(restored,true);assert.equal(a.read('source/authored.mjs'),'before');
});

test('actual common installer cannot admit one reported root then mutate another captured IO root',limits,t=>{const a=fixture(t),b=fixture(t);a.policy();b.policy(['source/authored.mjs']);const proposal=a.proposal([b.row('source/authored.mjs')]),fresh={...proposal};let reads=0;Object.defineProperty(fresh,'root',{get(){return ++reads===2?b.root:a.root;},enumerable:true});assert.throws(()=>installFreshSourceProposal(JSON.stringify(proposal),()=>fresh),/root differs/u);assert.equal(reads,2);assert.equal(a.read('source/authored.mjs'),'before');assert.equal(b.read('source/authored.mjs'),'before');});
