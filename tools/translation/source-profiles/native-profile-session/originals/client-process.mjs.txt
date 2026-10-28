/** One operation owns one actual spawned child. No PID from disk is signalled. */
import {spawn} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {constants} from 'node:os';
import {clientFailure} from './client-files.mjs';
function boundedInteger(value,maximum,label){if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>maximum)throw clientFailure(label+' exceeds its finite bound');return Number(value);}
function launchInput(context){
 const {command,args=[],env={},cwd}=context;if(typeof command!=='string'||!command||command.includes('\0')||Buffer.byteLength(command)>4096)throw clientFailure('Client command requires a bounded executable name');
 if(!Array.isArray(args)||args.length>10000||args.some(value=>typeof value!=='string'||value.includes('\0'))||Buffer.byteLength(args.join('\0'))>2097152)throw clientFailure('Client argv requires bounded NUL-free strings');
 if(typeof cwd!=='string'||!isAbsolute(cwd)||cwd.includes('\0'))throw clientFailure('Client launch requires an absolute working directory');
 if(context.stdin!==undefined&&(typeof context.stdin!=='string'||Buffer.byteLength(context.stdin)>8388608))throw clientFailure('Client stdin requires bounded text');
 const environment=Object.create(null);let bytes=0;const entries=Object.entries(env);if(entries.length>4096)throw clientFailure('Client environment exceeds its entry bound');
 for(const [key,value]of entries){if(!key||key.includes('=')||key.includes('\0')||typeof value!=='string'||value.includes('\0'))throw clientFailure('Client environment requires NUL-free string entries');bytes+=Buffer.byteLength(key)+Buffer.byteLength(value)+2;if(bytes>2097152)throw clientFailure('Client environment exceeds its byte bound');environment[key]=value;}
 return {command,args:[...args],cwd,env:environment,stdin:context.stdin,timeout:boundedInteger(context.timeoutMs??60000,86400000,'Client deadline'),limit:boundedInteger(context.maxOutputBytes??8388608,8388608,'Client output cap'),interactive:context.interactive===true};
}
export async function runOwnedClientProcess(context){
 const input=launchInput(context),signal=context.signal;if(signal?.aborted)throw clientFailure('Client launch cancelled before spawn');
 let child;try{child=spawn(input.command,input.args,{cwd:input.cwd,env:input.env,shell:false,windowsHide:!input.interactive,stdio:input.interactive?'inherit':[input.stdin===undefined?'ignore':'pipe','pipe','pipe']});}catch{throw clientFailure('Client executable could not be started');}
 const stdout=[],stderr=[];let stdoutBytes=0,stderrBytes=0,failure=null,settled=false,exited=false,code=null,exitSignal=null;
 let deadline,grace,drain,lastResort;
 let complete=()=>{};const finished=new Promise(done=>{complete=done;});
 const finish=()=>{if(settled)return;settled=true;complete();};
 const stop=(message,requestedSignal='SIGTERM')=>{
  failure??=clientFailure(message);if(settled)return;if(!exited){try{child.kill(requestedSignal);}catch{}if(!grace)grace=setTimeout(()=>{if(!exited)try{child.kill('SIGKILL');}catch{}},3000);}
  if(!lastResort)lastResort=setTimeout(()=>{child.stdout?.destroy();child.stderr?.destroy();child.unref();finish();},5000);
 };
 const cancel=()=>stop('Client launch cancelled'),interrupt=()=>stop('Client launch interrupted','SIGINT'),terminate=()=>stop('Client launch terminated','SIGTERM');
 const collect=(destination,chunk,channel)=>{
  if(channel==='stdout')stdoutBytes+=chunk.length;else stderrBytes+=chunk.length;
  if((channel==='stdout'?stdoutBytes:stderrBytes)>input.limit){stop('Client '+channel+' exceeds its output cap');return;}destination.push(Buffer.from(chunk));
 };
 child.stdout?.on('data',(chunk)=>collect(stdout,chunk,'stdout'));child.stderr?.on('data',(chunk)=>collect(stderr,chunk,'stderr'));
 child.stdout?.on('error',()=>stop('Client stdout could not be read'));child.stderr?.on('error',()=>stop('Client stderr could not be read'));
 child.once('error',(error)=>{failure=clientFailure(error.code==='ENOENT'?'Client executable is not installed or not on PATH':'Client executable could not be started');});
 child.once('exit',(status,reason)=>{exited=true;code=status;exitSignal=reason;clearTimeout(grace);drain=setTimeout(()=>{failure??=clientFailure('Client output streams did not close after exit');child.stdout?.destroy();child.stderr?.destroy();finish();},1000);});
 child.once('close',(status,reason)=>{if(code===null)code=status;if(exitSignal===null)exitSignal=reason;finish();});
 child.stdin?.on('error',error=>{if(Object(error).code!=='EPIPE')stop('Client stdin could not be written');});if(input.stdin!==undefined)child.stdin?.end(input.stdin);
 deadline=setTimeout(()=>stop('Client execution deadline exceeded'),input.timeout);signal?.addEventListener('abort',cancel,{once:true});if(context.forwardSignals===true){process.on('SIGINT',interrupt);process.on('SIGTERM',terminate);}if(signal?.aborted)cancel();
 try{
  await finished;const result={client_exit_code:code??(exitSignal?128+(Object( constants.signals )[exitSignal]??0):1),signal:exitSignal,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8')};
  if(failure){Object.assign(failure,{data:result});throw failure;}return result;
 }finally{clearTimeout(deadline);clearTimeout(grace);clearTimeout(drain);clearTimeout(lastResort);signal?.removeEventListener('abort',cancel);if(context.forwardSignals===true){process.off('SIGINT',interrupt);process.off('SIGTERM',terminate);}child.stdin?.destroy();child.stdout?.destroy();child.stderr?.destroy();}
}
