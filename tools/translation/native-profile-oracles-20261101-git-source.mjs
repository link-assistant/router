// Bounded Git DATA transport only. No Rust command, compiler or caller command.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve,isAbsolute,join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {NATIVE_PROFILE_ORACLE_LIMITS as LIMIT} from './native-profile-oracles-20261101-control.mjs';
export const nativeOracleSourceFailure=message=>{throw new TypeError('Native oracle source: '+message);};
const fail=nativeOracleSourceFailure;
export function nativeOraclePath(path){return typeof path==='string'&&path.length>0&&Buffer.byteLength(path)<=LIMIT.pathBytes&&!/[\\:\0\r\n]/u.test(path)&&!path.startsWith('/')&&!/\p{Surrogate}/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&part.toLowerCase()!=='.git');}
const oid=value=>typeof value==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value);
function environment(){const nil=process.platform==='win32'?'NUL':'/dev/null';return {...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:nil,GIT_CONFIG_GLOBAL:nil,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_PAGER:'cat'};}
function start(root,args,startedAt,lifecycle=()=>{}){
 const remaining=LIMIT.deadlineMs-(performance.now()-startedAt);if(!(remaining>0))fail('original whole native deadline exceeded');
 const child=spawn(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'--literal-pathspecs','-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{cwd:root,env:environment(),stdio:['pipe','pipe','pipe']});
 let stopped=false,error,closed=false,resolveClose,resolveDone,rejectDone;const waiters=new Set(),close=new Promise(resolve=>{resolveClose=resolve;}),done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});done.catch(()=>{});
 function stop(primary){if(stopped)return;stopped=true;error=primary;for(const waiter of [...waiters]){waiters.delete(waiter);waiter.reject(primary);}}
 function notify(event){try{lifecycle(event);}catch(primary){stop(primary);child.kill('SIGKILL');}}
 // Pending I/O has detachable waiters, rather than accumulating one .then()
 // listener on a shared abort promise for every chunk of the source corpus.
 function wait(promise,drain=false){return new Promise((resolve,reject)=>{const waiter={reject,drain};if(stopped){Promise.resolve(promise).catch(()=>{});reject(error);return;}if(drain&&closed){Promise.resolve(promise).catch(()=>{});reject(new TypeError('Native oracle source: Git closed before stdin drain'));return;}waiters.add(waiter);Promise.resolve(promise).then(value=>{if(waiters.delete(waiter))resolve(value);},primary=>{if(waiters.delete(waiter))reject(primary);});});}
 child.once('error',primary=>{stop(primary);rejectDone(primary);if(!child.pid){closed=true;resolveClose();notify({kind:'closed',pid:null,spawnFailed:true});}});
 child.stdin.on('error',primary=>{stop(primary);child.kill('SIGKILL');});
 child.once('close',(code,signal)=>{if(closed)return;closed=true;resolveClose();notify({kind:'closed',pid:child.pid??null,code,signal});if(signal||code!==0){const primary=new TypeError('Native oracle source: bounded Git child did not finish');stop(primary);rejectDone(primary);}else resolveDone();for(const waiter of [...waiters])if(waiter.drain){waiters.delete(waiter);waiter.reject(new TypeError('Native oracle source: Git closed before stdin drain'));}});
 const timer=setTimeout(()=>{const primary=new TypeError('Native oracle source: original whole native deadline exceeded');stop(primary);child.kill('SIGKILL');},remaining);notify({kind:'spawned',pid:child.pid??null});
 async function shutdown(tasks){stop(new TypeError('Native oracle source: source operation aborted'));for(const close of [()=>child.kill('SIGKILL'),()=>child.stdin.destroy(),()=>child.stdout.destroy(),()=>child.stderr.destroy()])try{close();}catch{}await Promise.allSettled(tasks);if(!closed){const left=Math.max(0,Math.min(2000,LIMIT.deadlineMs-(performance.now()-startedAt)));let timeout;try{await Promise.race([close,new Promise(resolve=>{timeout=setTimeout(resolve,left);})]);}finally{clearTimeout(timeout);}if(!closed)notify({kind:'shutdown-unconfirmed',pid:child.pid??null});}}
 return {child,done,wait,shutdown,abort:primary=>{stop(primary);child.kill('SIGKILL');},finish:()=>clearTimeout(timer)};
}
async function* chunks(stream,process){const iterator=stream[Symbol.asyncIterator]();for(;;){const next=await process.wait(iterator.next());if(next.done)return;yield next.value;}}
async function small(root,args,{startedAt,tick,charge,lifecycle,physical=()=>{},transient=()=>{}},expected=null){
 let expectedBytes=null;if(expected!==null){if(typeof expected!=='string'||Buffer.byteLength(expected)>LIMIT.gitBytes)fail('bounded complete original Git comparison required');transient(Buffer.byteLength(expected));expectedBytes=Buffer.from(expected);}
 const process=start(root,args,startedAt,lifecycle),out=[];let size=0,errorBytes=0,failed=false;
 const errors=(async()=>{for await(const bytes of chunks(process.child.stderr,process)){errorBytes+=bytes.length;if(errorBytes>LIMIT.rawBytes)fail('complete Git stderr bound');physical(bytes.length);charge(bytes.length);}})();errors.catch(primary=>process.abort(primary));
 try{process.child.stdin.end();for await(const bytes of chunks(process.child.stdout,process)){tick();size+=bytes.length;if(size>LIMIT.gitBytes)fail('complete Git census bound');physical(bytes.length);if(expectedBytes){if(size>expectedBytes.length||!bytes.equals(expectedBytes.subarray(size-bytes.length,size)))fail('complete closing Git bytes differ');}else{charge(bytes.length);out.push(Buffer.from(bytes));}}await errors;await process.wait(process.done);if(expectedBytes&&size!==expectedBytes.length)fail('complete closing Git output length differs');if(!expectedBytes)transient(size*2);return expectedBytes?null:Buffer.concat(out,size);}catch(primary){failed=true;try{await process.shutdown([errors]);}catch{}throw primary;}finally{if(!failed)process.child.stdin.destroy();process.finish();}
}
function text(bytes){const value=new TextDecoder('utf8',{fatal:true}).decode(bytes);if(!Buffer.from(value).equals(bytes))fail('exact Git UTF8 census required');return value;}
export async function readNativeOracleGitCensus(root,sourceSha,options){
 if(!/^[a-f0-9]{40}$/u.test(sourceSha))fail('exact same-SHA HEAD required');
 const headSource=text(await small(root,['rev-parse','--verify','HEAD'],options)),head=headSource.trim();if(head!==sourceSha)fail('HEAD differs from original source SHA');
 const topSource=text(await small(root,['rev-parse','--show-toplevel'],options)),top=topSource.trim();if(resolve(top)!==root)fail('exact original Git root spelling required');
 const tree=text(await small(root,['ls-tree','-rz','--full-tree',sourceSha],options)),index=text(await small(root,['ls-files','--stage','-z'],options));
 const rows=[],seen=new Set();for(const raw of tree.split('\0').filter(Boolean)){
  const tab=raw.indexOf('\t'),parts=raw.slice(0,tab).split(' '),path=raw.slice(tab+1);
  if(tab<0||!nativeOraclePath(path)||seen.has(path.toLowerCase())||!['100644','100755'].includes(parts[0])||parts[1]!=='blob'||!oid(parts[2]))fail('ordinary unique tracked HEAD blobs required; symlinks/submodules/case aliases unsupported');
  seen.add(path.toLowerCase());rows.push({path,mode:parts[0],oid:parts[2]});if(rows.length>Math.floor(LIMIT.gitBytes/48))fail('bounded whole HEAD metadata row count');
 }
 const indices=index.split('\0').filter(Boolean);if(indices.length!==rows.length)fail('complete index/HEAD selection differs');
 for(let at=0;at<rows.length;at++){const raw=indices[at],tab=raw.indexOf('\t'),parts=raw.slice(0,tab).split(' '),row=rows[at];if(tab<0||raw.slice(tab+1)!==row.path||parts.length!==3||parts[0]!==row.mode||parts[1]!==row.oid||parts[2]!=='0')fail('complete original index/HEAD mode/blob/stage join differs');}
 if(!rows.length)fail('nonempty complete original tracked cohort required');return {head,rows,tree,index,headSource,topSource};
}
export async function compareNativeOracleGitCensus(root,sourceSha,original,options){
 if(!original||original.head!==sourceSha||typeof original.tree!=='string'||typeof original.index!=='string')fail('complete original Git census comparison DATA required');
 await small(root,['rev-parse','--verify','HEAD'],options,original.headSource);await small(root,['rev-parse','--show-toplevel'],options,original.topSource);await small(root,['ls-tree','-rz','--full-tree',sourceSha],options,original.tree);await small(root,['ls-files','--stage','-z'],options,original.index);
}
export async function readNativeOracleGitMetadataPaths(root,options){
 const directory=text(await small(root,['rev-parse','--absolute-git-dir'],options)).trim(),common=text(await small(root,['rev-parse','--path-format=absolute','--git-common-dir'],options)).trim(),ref=text(await small(root,['rev-parse','--symbolic-full-name','HEAD'],options)).trim();
 if(!isAbsolute(directory)||!isAbsolute(common)||/[\0\r\n]/u.test(directory+common)||ref!=='HEAD'&&!/^refs\/heads\/[A-Za-z0-9_./-]+$/u.test(ref)||ref.split('/').some(part=>part==='.'||part==='..'))fail('exact ordinary Git metadata scope required');
 return [...new Set([join(directory,'HEAD'),join(directory,'index'),join(common,'packed-refs'),...(ref==='HEAD'?[]:[join(common,ref)])])];
}
// One concurrent writer/reader pair, never one Git process per source file.
export async function streamNativeOracleHeadBlobs(root,rows,consume,{startedAt,tick,charge,lifecycle,physical=()=>{}}){
 if(!Array.isArray(rows)||!rows.length||rows.length>LIMIT.sourcePaths||typeof consume!=='function')fail('bounded exact HEAD rows/consumer required');
 for(const row of rows)if(!nativeOraclePath(row.path)||!oid(row.oid)||!['100644','100755'].includes(row.mode))fail('ordinary exact HEAD row required');
 const process=start(root,['cat-file','--batch'],startedAt,lifecycle),iterator=process.child.stdout[Symbol.asyncIterator]();let chunk=Buffer.alloc(0),at=0,total=0,failed=false;
 const stderr=(async()=>{let bytes=0;for await(const part of chunks(process.child.stderr,process)){bytes+=part.length;if(bytes>LIMIT.rawBytes)fail('bounded complete batch stderr');physical(part.length);charge(part.length);}})();stderr.catch(primary=>process.abort(primary));
 // Writing all requests before reading stdout can deadlock both pipe buffers.
 const writer=(async()=>{for(const row of rows){if(!process.child.stdin.write(row.oid+'\n'))await process.wait(once(process.child.stdin,'drain'),true);}process.child.stdin.end();})();writer.catch(primary=>process.abort(primary));
 async function take(maximum){while(at===chunk.length){const next=await process.wait(iterator.next());if(next.done)fail('complete batch blob stream ended early');chunk=next.value;at=0;}const size=Math.min(maximum,chunk.length-at),part=chunk.subarray(at,at+size);at+=size;physical(size);return part;}
 async function line(){const parts=[];let length=0;for(;;){const part=await take(1);if(part[0]===10)return Buffer.concat(parts,length).toString('ascii');if(++length>256)fail('bounded exact cat-file header');parts.push(Buffer.from(part));}}
 try{for(const row of rows){await tick();const header=await line(),match=/^([a-f0-9]{40}|[a-f0-9]{64}) blob (0|[1-9][0-9]*)$/u.exec(header);if(!match||match[1]!==row.oid)fail('actual batch blob identity/header differs');const size=Number(match[2]);if(!Number.isSafeInteger(size)||size>LIMIT.sourceFileBytes||(total+=size)>LIMIT.sourceBytes)fail('original native source byte bound');await process.wait(consume({kind:'start',row,size}));let left=size;while(left){const part=await take(Math.min(left,65536));await tick();await process.wait(consume({kind:'chunk',row,bytes:part}));left-=part.length;}if((await take(1))[0]!==10)fail('exact batch blob delimiter required');await process.wait(consume({kind:'end',row,size}));}if(at!==chunk.length||!(await process.wait(iterator.next())).done)fail('unexpected trailing batch bytes');await writer;await stderr;await process.wait(process.done);return {paths:rows.length,bytes:total};}catch(primary){failed=true;try{await process.shutdown([writer,stderr]);}catch{}throw primary;}finally{if(!failed)process.child.stdin.destroy();process.finish();}
}
