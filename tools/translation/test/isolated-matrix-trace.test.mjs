import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../compilation-matrix.mjs';
import {captureSourceCorpus} from '../source-corpus.mjs';

const worker=fileURLToPath(new URL('../isolated-matrix-profile.mjs',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-live-matrix-trace-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'src'));
 writeFileSync(join(root,'src/lib.rs'),'pub fn answer()->u8{7}\n');
 const selection={profiles:DECLARED_FAMILY_PROFILES.filter(row=>row.name==='neutral')};
 const matrix=createCompilationMatrix(selection),member=compilationMatrixDescription(matrix).profiles[0];
 const paths=['src/lib.rs'],corpus=captureSourceCorpus({root,paths});
 return {root,request:{schema:'router-isolated-profile-request-v1',root,plannerModule:'bulk.mjs',selection,matrixSha256:matrix.sha256,name:member.name,directory:member.directory,paths,entries:paths,corpus,progress:false}};
}
function vector(root){
 const rows=[];
 function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){const name=path?path+'/'+entry.name:entry.name;if(entry.isDirectory())walk(name);else rows.push({path:name,sha256:hash(readFileSync(join(root,name)))});}}
 walk('');return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
async function run(t,request,trace){
 const child=spawn(process.execPath,['--max-old-space-size=192',worker],{cwd:request.root,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=192',ROUTER_TRANSLATION_MATRIX_TRACE:trace},stdio:['pipe','pipe','pipe','pipe']});
 const closed=once(child,'close');let exited=false,live=false;
 child.once('close',()=>{exited=true;});
 t.after(async()=>{if(!exited){child.kill('SIGTERM');await closed;}});
 const chunks=[[],[],[]],sizes=[0,0,0];
 for(const [index,stream]of [child.stdout,child.stderr,child.stdio[3]].entries())stream.on('data',bytes=>{
  sizes[index]+=bytes.length;
  if(sizes[index]>16*1024*1024){child.kill('SIGTERM');return;}
  chunks[index].push(bytes);
  if(index===2&&child.exitCode===null&&child.signalCode===null)live=true;
 });
 child.stdin.end(JSON.stringify(request)+'\n');
 const [code,signal]=await closed;
 for(const size of sizes)assert.ok(size<=16*1024*1024,'complete worker stream bound');
 return {code,signal,live,stdout:Buffer.concat(chunks[0]).toString(),stderr:Buffer.concat(chunks[1]).toString(),trace:Buffer.concat(chunks[2]).toString()};
}

test('matrix diagnostics arrive before actual worker exit with identical complete output bytes',{timeout:60000},async t=>{
 const {root,request}=fixture(t),plain=await run(t,request,'0');
 assert.equal(plain.code,0,plain.stderr);assert.equal(plain.signal,null);assert.equal(plain.trace,'');assert.equal(plain.stderr,'');
 const before=vector(root),traced=await run(t,request,'1');
 assert.equal(traced.code,0,traced.stderr);assert.equal(traced.signal,null);assert.equal(traced.live,true);
 assert.equal(traced.stderr,plain.stderr);assert.equal(traced.stdout,plain.stdout);assert.deepEqual(vector(root),before);
 const records=traced.trace.trim().split('\n').map(line=>JSON.parse(line));
 assert.ok(records.length>4);let previous=0;
 for(const row of records){
  assert.equal(row.schema,'router-isolated-matrix-worker-trace-v1');assert.equal(row.profile,'neutral');assert.ok(Number.isSafeInteger(row.workerPid)&&row.workerPid>0);
  assert.ok(Number.isSafeInteger(row.workerElapsedMilliseconds)&&row.workerElapsedMilliseconds>=previous);previous=row.workerElapsedMilliseconds;
  assert.ok(Object.values(row).every(value=>typeof value==='string'||Number.isSafeInteger(value)));
  assert.ok(Buffer.byteLength(JSON.stringify(row))<65536);assert.equal(Object.hasOwn(row,'sourceText'),false);
 }
 assert.deepEqual(records.slice(0,3).map(row=>[row.stage,row.state]),[['corpus','start'],['corpus','end'],['plan','start']]);
 assert.deepEqual(records.at(-1).stage,'plan');assert.equal(records.at(-1).state,'end');
 const result=JSON.parse(traced.stdout);
 for(const output of result.plan.outputs){const bytes=readFileSync(join(root,output.path));assert.equal(bytes.length,output.bytes);assert.equal(hash(bytes),output.sha256);}
});

test('live diagnostics preserve the original complete corpus refusal and leave outputs absent',{timeout:30000},async t=>{
 const {root,request}=fixture(t),before=vector(root);
 request.corpus={...request.corpus,sourceSetSha256:'0'.repeat(64)};
 for(const trace of ['0','1']){
  const result=await run(t,request,trace);
  assert.notEqual(result.code,0);assert.match(result.stderr,/Complete mirrored source corpus differs/);assert.equal(result.stdout,'');assert.deepEqual(vector(root),before);
  if(trace==='1'){const records=result.trace.trim().split('\n').map(line=>JSON.parse(line));assert.equal(records.length,1);assert.equal(records[0].stage,'corpus');assert.equal(records[0].state,'start');}
  else assert.equal(result.trace,'');
 }
});
