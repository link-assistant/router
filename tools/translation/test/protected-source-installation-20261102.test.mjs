// Independent operational source-ownership cases. All execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {installFreshSourceProposal,installFreshAsyncSourceProposal} from '../unit-runtime-materialization.mjs';
const limits={timeout:60000,concurrency:false},policyPath='translation/source-ownership.json';
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-protected-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(name,text)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),text);},read=name=>fs.readFileSync(join(root,name),'utf8');
 const policy=(authored=[],unmanaged=[])=>put(policyPath,JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 const plan=(rows)=>({schema:'independent-protected-source-case',root,baseRevision:null,inputs:[],outputs:rows.map(([path,before,after])=>({path,before,after,inverse:before,mode:0o644}))});
 const apply=value=>installFreshSourceProposal(JSON.stringify(value),()=>value);
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','user.name=Source policy fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:10000,maxBuffer:1048576});
 return {root,put,read,policy,plan,apply,git};
}
test('absent policy preserves ordinary writes modes no-op cycles and metadata parent creation',limits,t=>{
 const api=fixture(t),value=api.plan([['js/src/unit.mjs',null,'export const unit=1;\n'],['translation/unit.json',null,'{}\n']]);assert.equal(api.apply(value).changed.length,2);assert.equal(api.read('js/src/unit.mjs'),'export const unit=1;\n');
 const noop=api.plan([['js/src/unit.mjs','export const unit=1;\n','export const unit=1;\n']]);assert.deepEqual(api.apply(noop).changed,[]);
});
for(const path of ['js/src/unit.mjs','ts/src/unit.ts','rust/src/lib.rs','js/runtime/unit.mjs','translation/unit.json'])test('explicit authored source cannot be overwritten at '+path,limits,t=>{
 const api=fixture(t);api.put(path,'independently authored\n');api.policy([path]);const value=api.plan([[path,'independently authored\n','replacement\n'],['ts/src/other.ts',null,'must stay absent\n']]);assert.throws(()=>api.apply(value),/explicit authored\/unmanaged source/u);assert.equal(api.read(path),'independently authored\n');assert.equal(fs.existsSync(join(api.root,'ts/src/other.ts')),false);
});
test('unmanaged files and protected deletions are retained while exact no-ops remain legal',limits,t=>{
 const api=fixture(t),path='ts/src/manual.ts';api.put(path,'manual\n');api.policy([],[path]);assert.throws(()=>api.apply(api.plan([[path,'manual\n',null]])),/explicit authored\/unmanaged/u);assert.deepEqual(api.apply(api.plan([[path,'manual\n','manual\n']])).changed,[]);assert.equal(api.read(path),'manual\n');
});
test('generated proposals cannot create replace or delete their own ownership policy',limits,t=>{
 const api=fixture(t),body='{"schema":"router-explicit-source-ownership-v1","authored":[],"unmanaged":[]}';assert.throws(()=>api.apply(api.plan([[policyPath,null,body]])),/source or policy retained/u);api.put(policyPath,body);assert.throws(()=>api.apply(api.plan([[policyPath,body,null]])),/source or policy retained/u);assert.throws(()=>api.apply(api.plan([[policyPath,body,body+'\n']])),/source or policy retained/u);assert.deepEqual(api.apply(api.plan([[policyPath,body,body]])).changed,[]);
});
test('policy capture precedes fresh production and rejects removal and restored source',limits,t=>{
 const api=fixture(t);api.policy();const before=api.read(policyPath),value=api.plan([['js/src/unit.mjs',null,'new\n']]);
 assert.throws(()=>installFreshSourceProposal(JSON.stringify(value),()=>{fs.unlinkSync(join(api.root,policyPath));return value;}),/policy changed/u);assert.equal(fs.existsSync(join(api.root,'js/src/unit.mjs')),false);
 api.put(policyPath,before);assert.throws(()=>installFreshSourceProposal(JSON.stringify(value),()=>{api.put(policyPath,before+'\n');api.put(policyPath,before);fs.utimesSync(join(api.root,policyPath),0,0);return value;}),/policy changed or was restored/u);assert.equal(fs.existsSync(join(api.root,'js/src/unit.mjs')),false);
});
test('same policy inode cannot move through a replaced parent directory',limits,t=>{
 const api=fixture(t);api.policy();fs.mkdirSync(join(api.root,'alternate'));fs.linkSync(join(api.root,policyPath),join(api.root,'alternate/source-ownership.json'));
 const value=api.plan([['js/src/unit.mjs',null,'new\n']]);assert.throws(()=>installFreshSourceProposal(JSON.stringify(value),()=>{fs.renameSync(join(api.root,'translation'),join(api.root,'saved'));fs.renameSync(join(api.root,'alternate'),join(api.root,'translation'));return value;}),/root or parent changed/u);assert.equal(fs.existsSync(join(api.root,'js/src/unit.mjs')),false);
});
test('malformed duplicate extended and oversized policy lists fail before the producer',limits,t=>{
 const api=fixture(t),value=api.plan([['js/src/unit.mjs',null,'new\n']]);let runs=0;
 for(const body of ['{',JSON.stringify({schema:'other',authored:[],unmanaged:[]}),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['js/src/x.mjs'],unmanaged:['js/src/x.mjs']}),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:[],unmanaged:[],force:true}),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:Array.from({length:4097},(_,index)=>'js/src/'+index+'.mjs'),unmanaged:[]})]){api.put(policyPath,body);assert.throws(()=>installFreshSourceProposal(JSON.stringify(value),()=>{runs++;return value;}));}
 assert.equal(runs,0);assert.equal(fs.existsSync(join(api.root,'js/src/unit.mjs')),false);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen failure'))])test('policy closing preserves exact primary '+String(primary),limits,t=>{
 const api=fixture(t);api.policy();const body=api.read(policyPath),value=api.plan([['js/src/unit.mjs',null,'new\n']]),messages=[];const mock=t.mock.method(process.stderr,'write',chunk=>{messages.push(String(chunk));return true;});let caught=false;
 try{try{installFreshSourceProposal(JSON.stringify(value),()=>{api.put(policyPath,body+'\n');throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}}finally{mock.mock.restore();}
 assert.equal(caught,true);assert.equal(fs.existsSync(join(api.root,'js/src/unit.mjs')),false);assert.ok(messages.map(text=>JSON.parse(text)).some(row=>row.closingFailed===true));
});
test('asynchronous source production shares protected paths and captured policy epoch',limits,async t=>{
 const api=fixture(t);api.put('seed.txt','seed\n');api.git(['init','--quiet']);api.git(['add','seed.txt']);api.git(['commit','--quiet','-m','Independent policy baseline']);api.policy(['ts/src/manual.ts']);api.put('ts/src/manual.ts','manual\n');const value=api.plan([['ts/src/manual.ts','manual\n','replacement\n']]);value.baseRevision=api.git(['rev-parse','HEAD']).trim();
 await assert.rejects(installFreshAsyncSourceProposal(JSON.stringify(value),async()=>{await Promise.resolve();return value;}),/explicit authored\/unmanaged/u);assert.equal(api.read('ts/src/manual.ts'),'manual\n');
 const next=api.plan([['js/src/new.mjs',null,'new\n']]);next.baseRevision=value.baseRevision;await assert.rejects(installFreshAsyncSourceProposal(JSON.stringify(next),async()=>{api.policy([]);await Promise.resolve();return next;}),/policy changed/u);assert.equal(fs.existsSync(join(api.root,'js/src/new.mjs')),false);
});
test('policy change during staging refuses publication and retains available recovery bytes',limits,t=>{
 const api=fixture(t);api.put('js/src/unit.mjs','old\n');api.policy();const policy=api.read(policyPath),value=api.plan([['js/src/unit.mjs','old\n','new\n']]),write=fs.writeFileSync;let changed=false;
 const mock=t.mock.method(fs,'writeFileSync',(path,...args)=>{const result=write(path,...args);if(!changed&&String(path).includes('/stage-')){changed=true;write(join(api.root,policyPath),policy+'\n');}return result;});syncBuiltinESMExports();
 try{assert.throws(()=>api.apply(value),error=>{assert.ok(Array.isArray(error.recoveryPaths));assert.ok(error.recoveryPaths.length>=1);return true;});}finally{mock.mock.restore();syncBuiltinESMExports();}
 assert.equal(changed,true);assert.equal(api.read('js/src/unit.mjs'),'old\n');assert.ok(fs.readdirSync(api.root).some(name=>name.startsWith('.router-source-install-')));
});
