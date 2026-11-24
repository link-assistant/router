// Independent complete case SOURCE. Entire file UNRUN. The operational FS
// controls below are not compiler proofs; genuine original APIs are exercised
// separately, including all eight existing original producer variants.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createForwardOutputCustody,applyForwardOutputCustody,compareForwardCustodyFiles,readForwardCustodyText,FORWARD_OWNERSHIP_PRODUCERS} from '../forward-output-ownership-20261101.mjs';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
const common='js/generated/rust-project/unit.mjs',owned='js/generated/rust-owned-definitions/unit.mjs';
function folder(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-forward-custody-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function write(root,name,value){const full=join(root,name);fs.mkdirSync(dirname(full),{recursive:true});fs.writeFileSync(full,value);}
function thrown(run){let failed=false,result;try{run();}catch(error){failed=true;result=error;}assert.equal(failed,true);return result;}
function operation(root,entries,{producer='bulk.mjs',verify=()=>{},reissue,onReissue,deadline=Infinity}={}){
 const pairs=()=>entries.map(row=>[...row]),mutation=(targets,run)=>run();
 return createForwardOutputCustody({producer,root,entries:pairs,verify,mutateOutputDirectories:mutation,deadline,reissue:reissue??(()=>{onReissue?.();return {entries:pairs,verify,mutateOutputDirectories:mutation};})});
}
function git(root,args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','user.name=Forward fixture','-c','user.email=fixture@example.invalid',...args],{timeout:10000,stdio:'pipe',env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_AUTHOR_DATE:'2026-11-01T00:00:00Z',GIT_COMMITTER_DATE:'2026-11-01T00:00:00Z'}});}
function project(t){const root=folder(t);write(root,'src/lib.rs','pub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\n');git(root,['init','--quiet']);git(root,['add','src/lib.rs']);git(root,['commit','--quiet','-m','Exact independent native baseline']);return root;}

test('operational handles are one-use and cannot manufacture a genuine original compiler plan',t=>{
 const root=folder(t),handle=operation(root,[[common,'export const value=1;\n']]);applyForwardOutputCustody(handle);assert.throws(()=>applyForwardOutputCustody(handle),/unconsumed/);
 // Metadata and operational callbacks have ambient filesystem roles only.
 return import('../bulk.mjs').then(api=>assert.throws(()=>api.applyRegenerationPlan(handle),/Unsealed/));
});
test('one complete reissue agrees across base and optional-owned partitions before any public write',t=>{
 const root=folder(t),first=[[common,'old base\n'],[owned,'old owned\n']];applyForwardOutputCustody(operation(root,first,{producer:'owned-definitions-bulk.mjs'}));let fresh=0;
 const next=[[common,'new base\n'],[owned,'new owned\n']];applyForwardOutputCustody(operation(root,next,{producer:'owned-definitions-bulk.mjs',onReissue(){fresh++;assert.equal(fs.readFileSync(join(root,common),'utf8'),'old base\n');assert.equal(fs.readFileSync(join(root,owned),'utf8'),'old owned\n');}}));
 assert.equal(fresh,1);assert.equal(fs.readFileSync(join(root,common),'utf8'),'new base\n');assert.equal(fs.readFileSync(join(root,owned),'utf8'),'new owned\n');
 for(const kind of ['base','owned'])assert.equal(fs.readdirSync(join(root,'.router-forward-output-ownership/parts/canonical',kind)).filter(name=>name.startsWith('bank-')).length,1);
});
test('differing fresh producer output refuses the complete batch and leaves all public peers untouched',t=>{
 const root=folder(t);applyForwardOutputCustody(operation(root,[[common,'old\n']]));const mutation=(targets,run)=>run();
 assert.throws(()=>applyForwardOutputCustody(operation(root,[[common,'new\n']],{reissue:()=>({entries:()=>[[common,'different\n']],verify:()=>{},mutateOutputDirectories:mutation})})),/fresh private producer output differs/);
 assert.equal(fs.readFileSync(join(root,common),'utf8'),'old\n');assert.equal(fs.existsSync(join(root,'.router-forward-output-ownership/pending')),false);
});
test('exact owned stale deletion preserves an unknown authored neighbor',t=>{
 const root=folder(t),stale='js/generated/rust-project/previous.mjs',neighbor='js/generated/rust-project/authored.mjs';applyForwardOutputCustody(operation(root,[[common,'same\n'],[stale,'old owned\n']]));write(root,neighbor,'authored neighbor\n');
 applyForwardOutputCustody(operation(root,[[common,'same\n']]));assert.equal(fs.existsSync(join(root,stale)),false);assert.equal(fs.readFileSync(join(root,neighbor),'utf8'),'authored neighbor\n');
});
test('captured unexpected replacement survives even when the exact public original is independently restored',t=>{
 const root=folder(t);applyForwardOutputCustody(operation(root,[[common,'original\n']]));const rename=fs.renameSync,link=fs.linkSync;let captured=null;
 try{fs.renameSync=function(from,to,...args){if(from===join(root,common)&&String(to).includes('/pending/captured-')){fs.unlinkSync(from);fs.writeFileSync(from,'external bytes never delete\n');const result=rename(from,to,...args);captured=String(to);link(join(root,'.router-forward-output-ownership/pending/before-0'),from);return result;}return rename(from,to,...args);};
  assert.throws(()=>applyForwardOutputCustody(operation(root,[[common,'next\n']])),/unexpected captured replacement retained/);
 }finally{fs.renameSync=rename;}
 assert.ok(captured);assert.equal(fs.readFileSync(captured,'utf8'),'external bytes never delete\n');assert.equal(fs.readFileSync(join(root,common),'utf8'),'original\n');
 const pending=join(root,'.router-forward-output-ownership/pending'),before=fs.readdirSync(pending).sort();assert.throws(()=>applyForwardOutputCustody(operation(root,[[common,'next\n']])),/unresolved preparation retained/);assert.deepEqual(fs.readdirSync(pending).sort(),before);assert.equal(fs.readFileSync(captured,'utf8'),'external bytes never delete\n');
});
test('a failed late public install restores every earlier partition without overwriting a replacement',t=>{
 const root=folder(t),producer='owned-definitions-bulk.mjs';applyForwardOutputCustody(operation(root,[[common,'base old\n'],[owned,'owned old\n']],{producer}));const link=fs.linkSync,primary=Object.freeze(new Error('independent late partition install'));let hit=false;
 try{fs.linkSync=function(from,to,...args){if(!hit&&to===join(root,owned)&&String(from).includes('/stage-')){hit=true;throw primary;}return link(from,to,...args);};assert.equal(thrown(()=>applyForwardOutputCustody(operation(root,[[common,'base new\n'],[owned,'owned new\n']],{producer}))),primary);}finally{fs.linkSync=link;}
 assert.equal(hit,true);assert.equal(fs.readFileSync(join(root,common),'utf8'),'base old\n');assert.equal(fs.readFileSync(join(root,owned),'utf8'),'owned old\n');
});
test('all outer source closers preserve a falsy or frozen primary and retain recovery evidence',t=>{
 for(const primary of [undefined,false,0,'',Object.freeze(new Error('frozen first failure'))]){
  const root=folder(t);applyForwardOutputCustody(operation(root,[[common,'before\n']]));let calls=0;const verify=()=>{calls++;if(calls>3)throw Object.freeze(new Error('independent source closing failure'));};
  const failure=thrown(()=>applyForwardOutputCustody(operation(root,[[common,'after\n']],{verify,reissue:()=>{throw primary;}})));assert.equal(failure,primary);assert.ok(calls>3);assert.equal(fs.readFileSync(join(root,common),'utf8'),'before\n');
 }
});
test('right-open failure closes the already-open left fd and preserves the exact primary',t=>{
 const root=folder(t),left=join(root,'left'),right=join(root,'right');fs.writeFileSync(left,'left');fs.writeFileSync(right,'right');const open=fs.openSync,close=fs.closeSync,live=new Set();
 try{fs.openSync=function(file,...args){if(file===right)throw false;const fd=open(file,...args);live.add(fd);return fd;};fs.closeSync=function(fd){const result=close(fd);live.delete(fd);return result;};assert.equal(thrown(()=>compareForwardCustodyFiles(left,right)),false);assert.equal(live.size,0);}finally{fs.openSync=open;fs.closeSync=close;for(const fd of live)close(fd);}
});
test('bounded bookkeeping reads reject max+one growth through actual closing',t=>{
 const root=folder(t),file=join(root,'bounded'),read=fs.readSync;fs.writeFileSync(file,'1234');let changed=false;
 try{fs.readSync=function(fd,bytes,offset,length,position){const result=read(fd,bytes,offset,length,position);if(!changed){changed=true;fs.appendFileSync(file,'5');}return result;};assert.throws(()=>readForwardCustodyText(file,4),/changed/);}finally{fs.readSync=read;}assert.equal(fs.readFileSync(file,'utf8'),'12345');
});
test('an expired actual caller deadline refuses without reissue or public mutation',t=>{
 const root=folder(t);let fresh=false;assert.throws(()=>applyForwardOutputCustody(operation(root,[[common,'never\n']],{deadline:0,onReissue(){fresh=true;}})),/deadline/);assert.equal(fresh,false);assert.equal(fs.existsSync(join(root,common)),false);
});

for(const producer of FORWARD_OWNERSHIP_PRODUCERS)test('actual private '+producer+' receives separately, preserves neighbors, repeats and refuses edited peers',{timeout:180000},async t=>{
 const root=project(t),outputRoot=folder(t),api=await import('../'+producer),options={root,outputRoot,sources:['src/lib.rs'],entries:['src/lib.rs']};let plan=api.planRegeneration(options);api.applyRegenerationPlan(plan);const target=plan.manifest.projects[0].targets.javascript,file=join(outputRoot,target),neighbor=dirname(target)+'/independent-authored.mjs';
 assert.equal(fs.existsSync(join(root,target)),false);write(outputRoot,neighbor,'export const authored = 17;\n');assert.deepEqual(api.applyRegenerationPlan(plan,{check:true}).failures,[]);assert.equal(api.applyRegenerationPlan(plan).noOp,true);assert.equal(fs.readFileSync(join(outputRoot,neighbor),'utf8'),'export const authored = 17;\n');const first=await import(pathToFileURL(file).href+'?first');assert.equal(first.answer(),7n);assert.equal(first.blocked,undefined);
 write(root,'src/lib.rs','pub fn answer()->u8{8} pub fn blocked()->u8{unknown!(9)}\n');assert.throws(()=>api.applyRegenerationPlan(plan));plan=api.planRegeneration(options);api.applyRegenerationPlan(plan);const second=await import(pathToFileURL(file).href+'?second');assert.equal(second.answer(),8n);const authored=fs.readFileSync(file,'utf8')+'\n// independent edited peer\n';fs.writeFileSync(file,authored);assert.throws(()=>api.applyRegenerationPlan(plan),/edited .*forward peer retained/);assert.equal(fs.readFileSync(file,'utf8'),authored);assert.equal(fs.readFileSync(join(outputRoot,neighbor),'utf8'),'export const authored = 17;\n');
});
test('actual partitioned copied compiler receives outputs and refuses a stale compiler helper',{timeout:180000},t=>{
 const root=project(t),compiler=join(folder(t),'compiler'),outputRoot=folder(t);exportPartitionedTranslatorBundle({sourceRoot:SOURCE,output:compiler});const require=createRequire(join(SOURCE,'js/package.json'));fs.mkdirSync(join(compiler,'js/node_modules'),{recursive:true});fs.cpSync(dirname(require.resolve('typescript/package.json')),join(compiler,'js/node_modules/typescript'),{recursive:true});
 const script='import fs from "node:fs";import {join} from "node:path";import {pathToFileURL} from "node:url";const api=await import(process.argv[1]),root=process.argv[2],outputRoot=process.argv[3],options={root,outputRoot,sources:["src/lib.rs"],entries:["src/lib.rs"]},plan=api.planRegeneration(options);api.applyRegenerationPlan(plan);const target=plan.manifest.projects[0].targets.javascript,module=await import(pathToFileURL(join(outputRoot,target)));if(module.answer()!==7n)throw Error("copied actual output mismatch");const helper=new URL("./effect-assets.mjs",process.argv[1]),before=fs.readFileSync(helper);fs.appendFileSync(helper,"\\n// independent stale helper\\n");let failed=false;try{api.applyRegenerationPlan(plan);}catch{failed=true;}finally{fs.writeFileSync(helper,before);}if(!failed)throw Error("stale helper admitted");api.applyRegenerationPlan(api.planRegeneration(options));console.log(JSON.stringify({copied:true,sourceOutputAbsent:!fs.existsSync(join(root,target))}));';
 const env={...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:compiler};delete env.NODE_OPTIONS;delete env.NODE_PATH;const observed=JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',script,pathToFileURL(join(compiler,'tools/translation/bulk.mjs')).href,root,outputRoot],{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024}));assert.deepEqual(observed,{copied:true,sourceOutputAbsent:true});
});
