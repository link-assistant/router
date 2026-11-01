// CI-only operational process monitor. No subprocess starts during import.
// Only the closed profile Cargo command can enter runNativeProfileOracle.
import {spawn} from 'node:child_process';
import {openSync,writeSync,closeSync,lstatSync,fstatSync,constants,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {summarizeNativeOracleProcessTree,inspectNativeOracleResourceObservation} from './native-profile-oracles-20261101-metrics.mjs';
import {createNativeOracleDiskMonitor} from './native-profile-oracles-20261101-disk.mjs';
import {closeNativeOracleChild} from './native-profile-oracles-20261101-lifecycle.mjs';
import {NATIVE_PROFILE_ORACLE_LIMITS as LIMIT,nativeProfileOracleCommand} from './native-profile-oracles-20261101-control.mjs';
import {requireNativeProfileOracleCiGate} from './native-profile-oracles-20261101-gate.mjs';
import {inspectNativeProfileOracleWorkspace,verifyNativeProfileOracleWorkspace} from './native-profile-oracles-20261101-materialize.mjs';
const receipts=new WeakMap();
export const inspectNativeProfileOracleProcessReceipt=gate=>receipts.get(gate)??null;
const killChild=child=>{try{child.kill('SIGKILL');}catch{}};
const fail=message=>{throw new TypeError('Native profile process: '+message);};
const identity=info=>['dev','ino','mode','uid','gid','nlink'].map(key=>String(info[key])).join(':');
function write(fd,bytes){let at=0;while(at<bytes.length){const count=writeSync(fd,bytes,at,bytes.length-at,null);if(count<=0)fail('complete raw evidence write required');at+=count;}}
function exactDirectory(path){const info=lstatSync(path,{bigint:true});if(!info.isDirectory()||info.isSymbolicLink()||realpathSync(path)!==path)fail('ordinary exact evidence namespace required');return identity(info);}
// Descendant census contains PID/PPID/RSS only: never arguments or environment.
async function sampleTree(pid,remaining){
 const windows=process.platform==='win32';const file=windows?'powershell.exe':'ps',args=windows?['-NoProfile','-NonInteractive','-Command','Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize | ConvertTo-Json -Compress']:['-axo','pid=,ppid=,rss='];
 const child=spawn(file,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});let bytes=0,errorBytes=0,timedOut=false;const chunks=[];
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>code===0&&!signal&&!timedOut?resolve():reject(new TypeError('Native profile process: RSS sampler failed')));});done.catch(()=>{});
 let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;killChild(child);reject(new TypeError('Native RSS sampler deadline exceeded'));},Math.max(1,Math.min(5000,remaining)));});
 const streams=[(async()=>{for await(const chunk of child.stdout){bytes+=chunk.length;if(bytes>1048576)fail('bounded complete process census');chunks.push(Buffer.from(chunk));}})(),(async()=>{for await(const chunk of child.stderr){errorBytes+=chunk.length;if(errorBytes>65536)fail('bounded sampler stderr');}})()];for(const stream of streams)stream.catch(()=>killChild(child));
 let failed=false;try{await Promise.race([Promise.all([...streams,done]),deadline]);const source=new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)),rows=windows?JSON.parse(source):source.trim().split('\n').filter(Boolean).map(line=>{const values=line.trim().split(/\s+/u);if(values.length!==3||values.some(value=>!/^\d+$/u.test(value)))fail('complete process census grammar');return {ProcessId:Number(values[0]),ParentProcessId:Number(values[1]),WorkingSetSize:Number(values[2])*1024};});if(!Array.isArray(rows))fail('complete process census array required');return summarizeNativeOracleProcessTree(rows.map(row=>({pid:row.ProcessId,parent:row.ParentProcessId,rss:row.WorkingSetSize})),pid);}catch(error){failed=true;killChild(child);throw error;}finally{clearTimeout(timer);if(failed)await closeNativeOracleChild(child,[...streams,done]);}
}
async function stopTree(child){
 if(!Number.isSafeInteger(child.pid))return;
 if(process.platform!=='win32'){try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error?.code!=='ESRCH')throw error;}return;}
 const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});let expired=false;const done=new Promise((resolve,reject)=>{killer.once('error',reject);killer.once('close',(code,signal)=>!expired&&!signal&&code===0?resolve():reject(new TypeError('Native profile process: descendant termination unconfirmed')));});let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;killChild(killer);reject(new TypeError('Native descendant termination deadline exceeded'));},5000);});let failed=false;try{await Promise.race([done,timeout]);}catch(error){failed=true;throw error;}finally{clearTimeout(timer);if(failed)await closeNativeOracleChild(killer,[done]);}
}
export async function runNativeProfileOracle(gate,workspace){
 let authorization=await requireNativeProfileOracleCiGate(gate);const initial=inspectNativeProfileOracleWorkspace(workspace);if(initial.status!=='materialized'||initial.sourceSha!==authorization.sourceSha)fail('genuine same-SHA materialized workspace required');
 const command=nativeProfileOracleCommand(initial.profileId),root=initial.evidenceRoot,directoryIdentity=exactDirectory(root),startedAt=authorization.startedAt,paths={stdout:join(root,'native-stdout-'+randomUUID()+'.raw'),stderr:join(root,'native-stderr-'+randomUUID()+'.raw')};
 let rawBytes=0,maximumSampledRss=null,samples=0,minimumFree=null,lastHeartbeat=0,child=null,stdout=null,stderr=null,failed=false,primary,terminationError=null,unconfirmedPid=null,code=null,signal=null;
 const disk=createNativeOracleDiskMonitor(root,startedAt);
 const check=()=>{disk.tick();if(exactDirectory(root)!==directoryIdentity)fail('evidence directory replaced');const remaining=BigInt(disk.inspect().freeBytes);if(minimumFree===null||remaining<minimumFree)minimumFree=remaining;const info=inspectNativeProfileOracleWorkspace(workspace),observation=inspectNativeOracleResourceObservation({elapsedMs:performance.now()-startedAt,freeBytes:remaining,evidenceBytes:info.retainedBytes+info.rawBytes+authorization.rawBytes+rawBytes,rawBytes:info.rawBytes+authorization.rawBytes+rawBytes,sampledRssBytes:maximumSampledRss});if(!observation.withinLimits)fail(observation.reasons.join('; '));};
 const flags=constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0);
 const rawIdentities=new Map();function openRaw(path){const fd=openSync(path,flags,0o600);try{const info=fstatSync(fd,{bigint:true});if(!info.isFile()||info.nlink!==1n)fail('private raw evidence descriptor required');rawIdentities.set(path,identity(info));return fd;}catch(error){try{closeSync(fd);}catch{}throw error;}}
 function rawClosing(){let failed=false,primary;for(const [path,prior]of rawIdentities)try{const info=lstatSync(path,{bigint:true});if(!info.isFile()||info.isSymbolicLink()||identity(info)!==prior)fail('raw evidence path replaced');}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
 const tick=()=>{check();return undefined;};
 let monitorTimer=null,monitorPending=Promise.resolve(),monitorActive=false,monitorFailed=false,monitorError;
 try{
  check();await verifyNativeProfileOracleWorkspace(workspace,{tick});authorization=await requireNativeProfileOracleCiGate(gate);check();stdout=openRaw(paths.stdout);stderr=openRaw(paths.stderr);
  const target=join(authorization.root,'target');if(resolve(target)!==target)fail('fixed existing Cargo target required');exactDirectory(target);
  const env={...process.env,CARGO_TARGET_DIR:target,ROUTER_SOURCE_COMMIT:authorization.sourceSha,TMPDIR:initial.tmpRoot,TEMP:initial.tmpRoot,TMP:initial.tmpRoot};
  // Original RUSTFLAGS/profile/debug settings are inherited; dependencies can
  // reuse the gated original CI target instead of building a second cache.
  child=spawn(command.file,command.args,{cwd:initial.cwd,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32',windowsHide:true});
  const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(exit,status)=>{code=exit;signal=status;resolve();});});done.catch(()=>{});
  async function consume(stream,fd){for await(const bytes of stream){check();rawBytes+=bytes.length;if(rawBytes+authorization.rawBytes+inspectNativeProfileOracleWorkspace(workspace).rawBytes>LIMIT.rawBytes)fail('complete shared raw output bound exceeded');write(fd,bytes);}}
  const streams=[consume(child.stdout,stdout),consume(child.stderr,stderr)];for(const promise of streams)promise.catch(()=>{try{killChild(child);}catch{}});
  const monitor=async()=>{if(monitorFailed)return;try{check();if(Number.isSafeInteger(child.pid)){const sample=await sampleTree(child.pid,LIMIT.deadlineMs-(performance.now()-startedAt));if(sample.rootPresent){samples++;maximumSampledRss=Math.max(maximumSampledRss??0,sample.sampledRss);check();}}if(performance.now()-lastHeartbeat>30000){lastHeartbeat=performance.now();process.stdout.write('Native profile oracle running; complete raw output retained.\n');}}catch(error){monitorFailed=true;monitorError=error;try{await stopTree(child);}catch(stopError){terminationError=String(stopError);}}};
  monitorTimer=setInterval(()=>{if(monitorActive||monitorFailed)return;monitorActive=true;monitorPending=monitor().finally(()=>{monitorActive=false;});monitorPending.catch(()=>{});},LIMIT.sampleMs);
  let deadlineTimer;const deadline=new Promise((_,reject)=>{deadlineTimer=setTimeout(()=>{monitorFailed=true;monitorError=new TypeError('Native profile process: whole native operation deadline exceeded');reject(monitorError);},Math.max(1,LIMIT.deadlineMs-(performance.now()-startedAt)));});
  try{await Promise.race([Promise.all([...streams,done]),deadline]);}catch(error){failed=true;primary=error;try{await stopTree(child);}catch(stopError){terminationError=String(stopError);}const shutdown=await closeNativeOracleChild(child,[...streams,done]);unconfirmedPid=shutdown.unconfirmedPid;if(!shutdown.shutdownSettled&&!terminationError)terminationError='Native child shutdown unconfirmed; receiving recovery retained';}finally{clearTimeout(deadlineTimer);clearInterval(monitorTimer);monitorTimer=null;await monitorPending;}
  if(!failed&&monitorFailed){failed=true;primary=monitorError;}if(!failed&&(code!==0||signal)){failed=true;primary=new TypeError('Native profile oracle failed; consult complete retained CI raw evidence');}
 }catch(error){if(!failed){failed=true;primary=error;}}finally{
  if(monitorTimer!==null)clearInterval(monitorTimer);
  for(const fd of [stdout,stderr])if(fd!==null)try{closeSync(fd);}catch(error){if(!failed){failed=true;primary=error;}}
  for(const close of [()=>{disk.tick(true);check();},()=>rawClosing(),()=>verifyNativeProfileOracleWorkspace(workspace,{tick}),async()=>{authorization=await requireNativeProfileOracleCiGate(gate);check();}])try{await close();}catch(error){if(!failed){failed=true;primary=error;}}
 }
 const receipt=Object.freeze({schema:'native-profile-process-receipt-v1',sourceSha:authorization.sourceSha,profileId:initial.profileId,command,code,signal,rawBytes,paths:Object.freeze(paths),maximumSampledRss,samples,disk:disk.inspect(),minimumFreeBytes:minimumFree===null?null:String(minimumFree),sampledPeaksAreNotHardMemoryProof:true,terminationError,unconfirmedPid,complete:!failed,semanticAuthority:false});
 receipts.set(gate,receipt);if(failed)throw primary;return receipt;
}
