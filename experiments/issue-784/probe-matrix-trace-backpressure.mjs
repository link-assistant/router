// Finite native-pipe reproduction. No compiler or source admission is exercised.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const program=`import {writeSync} from 'node:fs';import {Socket} from 'node:net';
// libuv opens the inherited diagnostic descriptor in nonblocking mode, as
// with the parent's active stderr pipe in CI. A fresh child pipe is blocking.
const socket=new Socket({fd:3,readable:false,writable:true});
const bytes=Buffer.alloc(2*1024*1024,120);let offset=0;
process.stdout.write('ready\\n');
try{while(offset<bytes.length)offset+=writeSync(3,bytes,offset,bytes.length-offset);}
catch(error){process.stderr.write(JSON.stringify({code:error.code,offset,total:bytes.length})+'\\n');process.exitCode=1;}
finally{socket.destroy();}`;
const child=spawn(process.execPath,['--max-old-space-size=64','--input-type=module','--eval',program],
 {stdio:['ignore','pipe','pipe','pipe']});
const closed=once(child,'close'),output=[],errors=[];let bytes=0,drain;
const bound=setTimeout(()=>child.kill('SIGTERM'),5000);
child.stdout.once('data',()=>{drain=setTimeout(()=>child.stdio[3].resume(),100);});
child.stdio[3].on('data',chunk=>{bytes+=chunk.length;assert.ok(bytes<=2*1024*1024);});
child.stdio[3].pause();
child.stdout.on('data',chunk=>output.push(chunk));
child.stderr.on('data',chunk=>errors.push(chunk));
try{
 const [code,signal]=await closed,stderr=Buffer.concat(errors).toString();
 assert.equal(signal,null);assert.equal(code,1,stderr);
 const failure=JSON.parse(stderr);assert.equal(failure.code,'EAGAIN');
 console.log(JSON.stringify({code,signal,stdout:Buffer.concat(output).toString(),stderr,
  pipeBytesRead:bytes,finiteInputBytes:2*1024*1024,compilerExecuted:false}));
}finally{clearTimeout(bound);clearTimeout(drain);}
