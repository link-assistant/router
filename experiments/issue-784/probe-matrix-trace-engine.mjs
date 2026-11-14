// Finite CLI observations; no compiler or source-authority claim.
import {spawnSync} from 'node:child_process';
for(const program of ["process.exitCode=1;", "import {closeSync,writeSync} from 'node:fs';closeSync(3);try{writeSync(3,'x');console.log('write accepted');}catch(error){console.log(JSON.stringify({code:error.code}));process.exitCode=1;}"]){
 const child=spawnSync('bun',['--max-old-space-size=64','--input-type=module','--eval',program],
  {encoding:'utf8',maxBuffer:65536,timeout:5000,stdio:['ignore','pipe','pipe','pipe']});
 console.log(JSON.stringify({program,status:child.status,signal:child.signal,error:child.error?.code,
  stdout:child.stdout,stderr:child.stderr,descriptor3:child.output[3]?.toString()}));
}
