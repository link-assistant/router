import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {partitionWholeFiles} from '../run-node-test-shard.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('whole-file shards partition every current and future file exactly once with a complete deterministic census',()=>{
 for(const count of [1,2,8,16]){
  const files=Array.from({length:657},(_,index)=>'whole-'+String(index).padStart(4,'0')+'.test.mjs');
  const shards=Array.from({length:count},(_,index)=>partitionWholeFiles([...files].reverse(),index+1,count));
  assert.deepEqual(shards.flatMap(row=>row.selected).sort(),files);
  assert.equal(new Set(shards.flatMap(row=>row.selected)).size,files.length);
  assert.ok(shards.every(row=>JSON.stringify(row.all)===JSON.stringify(files)));
  assert.ok(Math.max(...shards.map(row=>row.selected.length))-Math.min(...shards.map(row=>row.selected.length))<=1);
  const future=[...files,'whole-future.test.mjs'];
  assert.deepEqual(Array.from({length:count},(_,index)=>partitionWholeFiles(future,index+1,count)).flatMap(row=>row.selected).sort(),future);
 }
});
test('whole-file shard identities cannot omit bins repeat files or silently select no files',()=>{
 for(const [index,count]of [[0,2],[3,2],[1,0],[1,17],[1.5,2]])assert.throws(()=>partitionWholeFiles(['a.test.mjs','b.test.mjs'],index,count),/bounded/u);
 assert.throws(()=>partitionWholeFiles(['a.test.mjs','a.test.mjs'],1,2),/distinct/u);
 assert.throws(()=>partitionWholeFiles([],1,1),/distinct/u);
 assert.throws(()=>partitionWholeFiles(['a.test.mjs'],2,2),/contain/u);
});
function fixture(){
 const directory=fs.mkdtempSync(path.join(root,'js/node_modules/whole-node-shard-fixture-'));
 const files=Array.from({length:4},(_,index)=>path.join(directory,String(index)+'.test.mjs'));
 for(const [index,file]of files.entries())fs.writeFileSync(file,"import test from 'node:test';\ntest('complete original "+index+"',{timeout:2000},()=>{});\n");
 return {directory,files,dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
function run(f,index=1,count=2,extra=[]){
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync('node',[path.join(root,'scripts/run-node-test-shard.mjs'),'--outer-timeout-ms=20000','--whole-file-shard='+index+'/'+count,'--test-concurrency=1',...extra,...f.files],{cwd:root,env,encoding:'utf8',timeout:25000,maxBuffer:4*1024*1024});
 const match=result.stderr.match(/Complete Node deadline evidence: (.+)\n/u);
 if(!match)return {result};
 const directory=match[1],read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
 return {result,directory,terminal:read('terminal.json'),audit:read('case-deadlines.json'),shard:read('whole-file-shard.json')};
}
test('every complete positive shard retains the unchanged original runner audit and matching full source census',{timeout:60000},()=>{
 const f=fixture();
 try{
  const outputs=[run(f,1),run(f,2)];
  for(const value of outputs){
   assert.equal(value.result.status,0,value.result.stderr);assert.equal(value.terminal.exitCode,0);assert.equal(value.audit.passed,true);assert.equal(value.shard.exitCode,0);
   assert.equal(value.shard.originalOuterTimeoutMs,20000);assert.ok(value.shard.runnerOuterTimeoutMs<=20000);assert.equal(value.shard.caseDeadlinesChanged,false);
   assert.deepEqual(value.terminal.allSelectedWholeFiles,value.shard.selectedFiles);
   assert.equal(value.shard.completeSources.length,4);assert.equal(value.audit.records.length,2);
   for(const source of value.shard.completeSources)assert.equal(source.source,fs.readFileSync(source.path,'utf8'));
   for(const row of value.audit.records)assert.equal(row.deadline.milliseconds,2000);
  }
  assert.equal(outputs[0].shard.sourceCensusSha256,outputs[1].shard.sourceCensusSha256);
  assert.deepEqual(outputs.flatMap(row=>row.shard.selectedFiles).sort(),f.files);
 }finally{f.dispose();}
});
test('a real failed original case remains fatal and later complete selected files still run',{timeout:60000},()=>{
 const f=fixture();
 try{
  fs.writeFileSync(f.files[0],"import test from 'node:test';test('original failure',()=>{throw Error('original failure retained');});\n");
  const value=run(f);assert.equal(value.result.status,1);assert.equal(value.terminal.exitCode,1);assert.equal(value.shard.exitCode,1);
  assert.ok(value.audit.records.some(row=>row.name==='original failure'&&row.type==='test:fail'));
  assert.ok(value.audit.records.some(row=>row.name==='complete original 2'&&row.type==='test:pass'));
  assert.match(fs.readFileSync(path.join(value.directory,'stdout.raw.tap'),'utf8'),/original failure retained/u);
 }finally{f.dispose();}
});
test('a complete source change in another shard cannot hide behind a successful selected runner',{timeout:60000},()=>{
 const f=fixture();
 try{
  fs.writeFileSync(f.files[0],"import test from 'node:test';import fs from 'node:fs';test('mutate another whole file',()=>{fs.appendFileSync("+JSON.stringify(f.files[1])+",'\\n// changed during the actual cohort\\n');});\n");
  const value=run(f);assert.equal(value.terminal.exitCode,0);assert.equal(value.audit.passed,true);assert.equal(value.result.status,1);assert.equal(value.shard.exitCode,1);assert.match(value.shard.refusal,/Complete original shard source changed/u);
 }finally{f.dispose();}
});
test('name filters and repeated normalized paths cannot replace complete selected files',{timeout:60000},()=>{
 const f=fixture();
 try{
  const filtered=run(f,1,2,['--test-name-pattern=one']);assert.notEqual(filtered.result.status,0);assert.match(filtered.result.stderr,/whole source/u);
  f.files.push(f.files[0]);const duplicate=run(f);assert.notEqual(duplicate.result.status,0);assert.match(duplicate.result.stderr,/distinct/u);
 }finally{f.dispose();}
});

