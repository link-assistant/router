import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeMatrixTrace} from '../matrix-trace-writer.mjs';

const moduleURL=new URL('../matrix-trace-writer.mjs',import.meta.url).href;
const payload=JSON.stringify({sequence:1,message:'λ🦊 pressure '.repeat(80)})+'\n';
const repetitions=1400,expected=Buffer.from(payload.repeat(repetitions));
assert.ok(expected.length<2*1024*1024,'finite real-pipe workload');
async function run(t,{delay=100,deadline=3000,closed=false}={}){
 const source=`import {Socket} from 'node:net';import {closeSync} from 'node:fs';
import {writeMatrixTrace} from ${JSON.stringify(moduleURL)};
const socket=${closed?'null':"new Socket({fd:3,readable:false,writable:true})"};
process.stdout.write('ready\\n');
${closed?'closeSync(3);':''}
try{const count=writeMatrixTrace(${JSON.stringify(closed?'record\n':payload)}.repeat(${closed?1:repetitions}),performance.now()+${deadline});
process.stdout.write(JSON.stringify({count})+'\\n');}
catch(error){process.stdout.write(JSON.stringify({code:error.code,message:error.message})+'\\n');process.exitCode=1;}
finally{socket?.destroy();}`;
 // The stock shell duplicates its inherited stderr onto descriptor 3, exactly
 // the CI transport. Local Bun 1.4.4 did not preserve extra spawn stdio slots.
 const child=spawn('sh',['-c','exec 3>&2; exec "$@"','matrix-trace-test',process.execPath,
  '--max-old-space-size=64','--input-type=module','--eval',source],{stdio:['ignore','pipe','pipe']});
 const end=once(child,'close'),stdout=[],chunks=[];let bytes=0,timer,finished=false;
 const bound=setTimeout(()=>child.kill('SIGTERM'),5000);
 child.once('close',()=>{finished=true;});
 t.after(async()=>{clearTimeout(timer);clearTimeout(bound);if(!finished){child.kill('SIGTERM');child.stderr.resume();await end;}});
 child.stdout.once('data',()=>{timer=setTimeout(()=>child.stderr.resume(),delay);});
 child.stdout.on('data',chunk=>stdout.push(chunk));
 child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>expected.length){child.kill('SIGTERM');return;}chunks.push(chunk);});
 child.stderr.pause();
 const [code,signal]=await end;clearTimeout(bound);clearTimeout(timer);
 assert.equal(signal,null);assert.ok(bytes<=expected.length);
 return {code,stdout:Buffer.concat(stdout).toString(),bytes:Buffer.concat(chunks)};
}

test('real nonblocking trace pipe preserves all bytes through pressure and partial Unicode writes',{timeout:60000},async t=>{
 const result=await run(t);
 assert.equal(result.code,0,result.stdout.slice(0,400));
 assert.deepEqual(result.bytes,expected);
 assert.equal(JSON.parse(result.stdout.trim().split('\n')[1]).count,expected.length);
});

test('a blocked trace retains the original absolute deadline and its exact completed prefix',{timeout:60000},async t=>{
 const result=await run(t,{delay:250,deadline:40});
 assert.equal(result.code,1,result.stdout.slice(0,400));assert.equal(JSON.parse(result.stdout.trim().split('\n')[1]).code,'ETIMEDOUT');
 assert.ok(result.bytes.length>0&&result.bytes.length<=expected.length);
 assert.deepEqual(result.bytes,expected.subarray(0,result.bytes.length));
});

test('trace transport preserves permanent descriptor errors and rejects unbounded deadlines',{timeout:60000},async t=>{
 const result=await run(t,{closed:true});
 assert.equal(result.code,1,result.stdout.slice(0,400));assert.equal(JSON.parse(result.stdout.trim().split('\n')[1]).code,'EBADF');assert.equal(result.bytes.length,0);
 for(const deadline of [undefined,NaN,Infinity,-Infinity])assert.throws(()=>writeMatrixTrace('record\n',deadline),/finite deadline/);
});
