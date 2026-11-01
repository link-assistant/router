// Operational hosted-CI gate. Never a semantic or translation proof.
// Importing performs no subprocess, file read, test or Rust invocation.
import {spawn} from 'node:child_process';
import {constants,lstatSync,fstatSync,openSync,closeSync,readSync,readdirSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve,basename} from 'node:path';
import {performance} from 'node:perf_hooks';
import {closeNativeOracleChild} from './native-profile-oracles-20261101-lifecycle.mjs';
import {NATIVE_PROFILE_ORACLE_LIMITS as LIMIT,inspectNativeProfileCiContext} from './native-profile-oracles-20261101-control.mjs';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url))),gates=new WeakMap();
const killChild=child=>{try{child.kill('SIGKILL');}catch{}};
const fail=message=>{throw new TypeError('Native profile CI gate: '+message);};
const fields=['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'];
const stamp=info=>fields.map(key=>String(info[key])).join(':');
function record(path,maximum){
 const before=lstatSync(path,{bigint:true});if(!before.isFile()||before.isSymbolicLink()||before.size>BigInt(maximum))fail('bounded ordinary complete workflow required');
 let flags=constants.O_RDONLY;for(const name of ['O_NOFOLLOW','O_NONBLOCK'])if(Number.isInteger(constants[name])&&constants[name]>0)flags|=constants[name];else if(process.platform!=='win32')fail('safe workflow open unavailable');
 const fd=openSync(path,flags);let primary=false;try{if(stamp(before)!==stamp(fstatSync(fd,{bigint:true})))fail('workflow descriptor changed');const bytes=Buffer.alloc(Number(before.size)+1);let at=0;while(at<bytes.length){const count=readSync(fd,bytes,at,bytes.length-at,null);if(!count)break;at+=count;}if(at!==Number(before.size)||stamp(before)!==stamp(fstatSync(fd,{bigint:true}))||stamp(before)!==stamp(lstatSync(path,{bigint:true})))fail('workflow source EOF/identity changed');return {path,identity:stamp(before),bytes:bytes.subarray(0,at)};}catch(error){primary=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primary)throw error;}}
}
function workflows(){const directory=join(ROOT,'.github/workflows'),info=lstatSync(directory,{bigint:true});if(!info.isDirectory()||info.isSymbolicLink()||realpathSync(directory)!==directory)fail('ordinary workflow namespace required');const names=readdirSync(directory).sort();if(names.length>128)fail('complete workflow census bound');const files=names.filter(name=>/\.ya?ml$/u.test(name)).map(name=>record(join(directory,name),1048576));if(files.reduce((total,row)=>total+row.bytes.length,0)>8388608)fail('complete workflow source bound');if(stamp(info)!==stamp(lstatSync(directory,{bigint:true}))||JSON.stringify(names)!==JSON.stringify(readdirSync(directory).sort()))fail('workflow namespace changed');return {directory,identity:stamp(info),names,files};}
function context(){return {ci:process.env.CI,actions:process.env.GITHUB_ACTIONS,runnerEnvironment:process.env.RUNNER_ENVIRONMENT,job:process.env.GITHUB_JOB,repository:process.env.GITHUB_REPOSITORY,workflowRef:process.env.GITHUB_WORKFLOW_REF,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,sourceSha:process.env.ROUTER_NATIVE_PROFILE_SHA,checkoutSha:process.env.GITHUB_SHA,javascriptResult:process.env.ROUTER_NATIVE_PROFILE_JAVASCRIPT};}
function tick(state){if(state.failed||performance.now()-state.startedAt>LIMIT.deadlineMs)fail('private CI operation expired or poisoned');}
function gitEnvironment(){const nil=process.platform==='win32'?'NUL':'/dev/null';return {...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:nil,GIT_CONFIG_GLOBAL:nil,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'};}
async function git(state,args){
 tick(state);const child=spawn(process.platform==='win32'?'git':'/usr/bin/git',['--literal-pathspecs','-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','core.fsmonitor=false',...args],{cwd:ROOT,env:gitEnvironment(),stdio:['ignore','pipe','pipe']});
 const chunks=[];let bytes=0,timedOut=false,primary=false;
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>code===0&&!signal&&!timedOut?resolve():reject(new TypeError('Native profile CI gate: Git source guard failed')));});done.catch(()=>{});
 let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;killChild(child);reject(new TypeError('Native source guard deadline exceeded'));},Math.max(1,LIMIT.deadlineMs-(performance.now()-state.startedAt)));});
 async function consume(stream,retain){for await(const chunk of stream){tick(state);state.rawBytes+=chunk.length;if(state.rawBytes>LIMIT.rawBytes)fail('complete Git gate raw bound');bytes+=chunk.length;if(bytes>LIMIT.gitBytes)fail('bounded source guard output');if(retain)chunks.push(Buffer.from(chunk));}}
 const streams=[consume(child.stdout,true),consume(child.stderr,false)];for(const stream of streams)stream.catch(()=>killChild(child));
 try{await Promise.race([Promise.all([...streams,done]),deadline]);tick(state);return Buffer.concat(chunks);}catch(error){primary=true;state.failed=true;killChild(child);throw error;}finally{clearTimeout(timer);if(primary)await closeNativeOracleChild(child,[...streams,done]);}
}
function sameWorkflows(left,right){if(left.directory!==right.directory||left.identity!==right.identity||JSON.stringify(left.names)!==JSON.stringify(right.names)||left.files.length!==right.files.length)fail('complete workflow namespace changed');for(let at=0;at<left.files.length;at++){const a=left.files[at],b=right.files[at];if(a.path!==b.path||a.identity!==b.identity||!a.bytes.equals(b.bytes))fail('complete same-SHA workflow changed');}}
async function closing(state){tick(state);const current=context(),report=inspectNativeProfileCiContext(current);if(!report.eligibleContext||JSON.stringify(current)!==JSON.stringify(state.context))fail('original hosted CI environment changed');if(realpathSync(ROOT)!==ROOT)fail('original checkout alias changed');sameWorkflows(state.workflows,workflows());const head=new TextDecoder('utf8',{fatal:true}).decode(await git(state,['rev-parse','--verify','HEAD'])).trim();if(head!==state.sourceSha)fail('original HEAD changed');await git(state,['diff','--quiet','--no-ext-diff','--no-textconv','HEAD','--']);await git(state,['diff','--cached','--quiet','--no-ext-diff','--no-textconv','HEAD','--']);sameWorkflows(state.workflows,workflows());tick(state);}
export async function createNativeProfileOracleCiGate(){
 const actual=context(),report=inspectNativeProfileCiContext(actual);if(!report.eligibleContext)fail(report.reasons.join('; '));if(realpathSync(ROOT)!==ROOT)fail('canonical module checkout required');
 const state={context:actual,sourceSha:actual.sourceSha,startedAt:performance.now(),failed:false,rawBytes:0,workflows:workflows()};
 try{const {auditWorkflows}=await import('../../scripts/check-js-first-workflows.mjs');const sources=Object.fromEntries(state.workflows.files.map(row=>[basename(row.path),new TextDecoder('utf8',{fatal:true}).decode(row.bytes)]));const errors=auditWorkflows(sources);if(errors.length)fail('complete existing JavaScript-first workflow audit refused: '+errors.join('; '));await closing(state);const handle=Object.freeze(Object.create(null));gates.set(handle,state);return handle;}catch(error){state.failed=true;throw error;}
}
export async function requireNativeProfileOracleCiGate(handle){const state=gates.get(handle);if(!state)fail('foreign gate handle; DATA reports cannot unlock Rust');try{await closing(state);return Object.freeze({root:ROOT,sourceSha:state.sourceSha,startedAt:state.startedAt,remainingMs:LIMIT.deadlineMs-(performance.now()-state.startedAt),rawBytes:state.rawBytes,operationalHostedCiOnly:true,semanticAuthority:false});}catch(error){state.failed=true;throw error;}}
export function poisonNativeProfileOracleCiGate(handle){const state=gates.get(handle);if(!state)fail('foreign gate handle');state.failed=true;}
