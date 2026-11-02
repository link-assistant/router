// Independent actual policy/direct-alias case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {captureExplicitSourceMutationPolicy} from '../unit-runtime-materialization.mjs';
import {assertProtectedDirectWriteTargets,assertProtectedMutationPaths,directMutationOutputPaths} from '../protected-preparer-writers-20261102-alias.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'direct-alias-policy-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(name,bytes)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),bytes);};
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 put('source/protected.mjs','original protected');put('source/ordinary.mjs','ordinary');put('translation/.keep','');
 return {root,put,policy,read:name=>fs.readFileSync(join(root,name),'utf8')};
}
function direct(scope,root,path){return scope.allowDirectWrites({root,outputs:[{path,before:'ignored byte declaration',after:'ignored byte declaration',mode:0o644}]});}
for(const link of ['symlink','hardlink'])for(const content of ['original protected',''])test(link+' physical alias veto includes equal final bytes and empty protected sources '+JSON.stringify(content),limits,t=>{
 const a=fixture(t);a.put('source/protected.mjs',content);a.policy(['source/protected.mjs']);const alias='source/unlisted.mjs';
 if(link==='symlink')fs.symlinkSync('protected.mjs',join(a.root,alias));else fs.linkSync(join(a.root,'source/protected.mjs'),join(a.root,alias));
 const scope=captureExplicitSourceMutationPolicy(a.root);try{assert.throws(()=>direct(scope,a.root,alias),/authored\/unmanaged or policy alias/u);assert.throws(()=>scope.verify(),/revoked/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}assert.equal(a.read('source/protected.mjs'),content);
});
test('policy-self symlink alias and dangling target are vetoed without trusting output byte claims',limits,t=>{
 const a=fixture(t);a.policy();fs.symlinkSync('../translation/source-ownership.json',join(a.root,'source/policy-alias.mjs'));
 let scope=captureExplicitSourceMutationPolicy(a.root);try{assert.throws(()=>direct(scope,a.root,'source/policy-alias.mjs'),/policy alias/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}
 fs.unlinkSync(join(a.root,'translation/source-ownership.json'));scope=captureExplicitSourceMutationPolicy(a.root);try{assert.throws(()=>direct(scope,a.root,'source/policy-alias.mjs'),/policy alias/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}assert.equal(fs.existsSync(join(a.root,'translation/source-ownership.json')),false);
});
test('protected symlink declarations protect physical targets and missing authored targets',limits,t=>{
 const a=fixture(t);fs.symlinkSync('protected.mjs',join(a.root,'source/declared.mjs'));a.policy(['source/declared.mjs']);let scope=captureExplicitSourceMutationPolicy(a.root);
 try{assert.throws(()=>direct(scope,a.root,'source/protected.mjs'),/policy alias/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}
 fs.unlinkSync(join(a.root,'source/declared.mjs'));fs.symlinkSync('future.mjs',join(a.root,'source/declared.mjs'));scope=captureExplicitSourceMutationPolicy(a.root);
 try{assert.throws(()=>direct(scope,a.root,'source/future.mjs'),/policy alias/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}
});
test('unprotected symlink and hard-link aliases retain original in-place operations',limits,t=>{
 const a=fixture(t);a.policy(['source/protected.mjs']);fs.symlinkSync('ordinary.mjs',join(a.root,'source/sym.mjs'));fs.linkSync(join(a.root,'source/ordinary.mjs'),join(a.root,'source/hard.mjs'));
 const scope=captureExplicitSourceMutationPolicy(a.root);try{for(const path of ['source/sym.mjs','source/hard.mjs']){direct(scope,a.root,path);fs.writeFileSync(join(a.root,path),path);scope.verify();}assert.equal(a.read('source/ordinary.mjs'),'source/hard.mjs');}finally{scope.close();}
});
for(const admission of ['staged','paths','direct'])test(admission+' caught mutation veto permanently poisons the scope',limits,t=>{
 const a=fixture(t);a.policy(['source/protected.mjs']);const scope=captureExplicitSourceMutationPolicy(a.root);
 try{assert.throws(()=>{if(admission==='staged')scope.allow({root:a.root,outputs:[{path:'source/protected.mjs',before:'original protected',after:'changed',mode:0o644}]});else if(admission==='paths')scope.allowMutationPaths(['source/protected.mjs']);else direct(scope,a.root,'source/protected.mjs');},/authored\/unmanaged/u);assert.throws(()=>scope.allowMutationPaths(['source/ordinary.mjs']),/revoked/u);assert.throws(()=>scope.verify(),/revoked/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}
});
test('staged equal-byte admission preserves its original no-op semantics while mutation paths veto it',limits,t=>{
 const a=fixture(t);a.policy(['source/protected.mjs']);const scope=captureExplicitSourceMutationPolicy(a.root),mode=fs.statSync(join(a.root,'source/protected.mjs')).mode&0o777;
 try{scope.allow({root:a.root,outputs:[{path:'source/protected.mjs',before:'original protected',after:'original protected',mode}]});scope.verify();assert.throws(()=>scope.allowMutationPaths(['source/protected.mjs']),/mutation path retained/u);}finally{assert.throws(()=>scope.close(),/revoked/u);}
});
test('own validated string arrays never invoke subclass or inherited custom iterators',limits,t=>{
 const a=fixture(t);let invoked=0;class HostileArray extends Array{[Symbol.iterator](){invoked++;throw new Error('iterator must not run');}}
 const protectedNames=new HostileArray('source/protected.mjs'),paths=new HostileArray('source/ordinary.mjs');
 assertProtectedMutationPaths({protectedNames,paths});assertProtectedDirectWriteTargets({root:a.root,protectedNames,paths});
 const outputs=new HostileArray({path:'source/ordinary.mjs'});assert.deepEqual(directMutationOutputPaths(outputs),['source/ordinary.mjs']);assert.equal(invoked,0);
});
test('missing-name case and Unicode ambiguity remain explicit compatibility refusals',limits,t=>{
 const a=fixture(t);for(const [protectedName,path]of [['source/FUTURE.mjs','source/future.mjs'],['source/caf\u00e9.mjs','source/cafe\u0301.mjs']])assert.throws(()=>assertProtectedDirectWriteTargets({root:a.root,protectedNames:[protectedName],paths:[path]}),/ambiguous/u);
});

for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original opaque readlink failure'))])test('all captured metadata closers are attempted after exact primary '+String(primary),limits,t=>{
 const a=fixture(t);fs.symlinkSync('ordinary.mjs',join(a.root,'source/alias.mjs'));const originalLstat=fs.lstatSync,originalReadlink=fs.readlinkSync;let failed=false,closingAttempts=0;const secondary=Object.freeze(new Error('independent closing failure'));
 const reads=t.mock.method(fs,'readlinkSync',(path,...rest)=>{if(path===join(a.root,'source/alias.mjs')){failed=true;throw primary;}return originalReadlink(path,...rest);});
 const stats=t.mock.method(fs,'lstatSync',(path,...rest)=>{if(failed){closingAttempts++;if(closingAttempts===1)throw secondary;}return originalLstat(path,...rest);});
 const diagnostic=t.mock.method(process.stderr,'write',()=>true);let caught=false;
 try{assertProtectedDirectWriteTargets({root:a.root,protectedNames:['source/protected.mjs'],paths:['source/alias.mjs']});}catch(error){caught=true;assert.equal(error,primary);}finally{reads.mock.restore();stats.mock.restore();diagnostic.mock.restore();}
 assert.equal(caught,true);assert.ok(closingAttempts>1,'later metadata closers must survive an earlier closing failure');
});
