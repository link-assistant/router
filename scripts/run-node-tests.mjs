#!/usr/bin/env node
// Whole Node files, original case budgets/concurrency, independent duration audit.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readCaseSource,canonicalCasePath} from './node-case-deadlines.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const RAW_LIMIT=256*1024*1024;
const fileIdentity=state=>Object.fromEntries(['dev','ino','mode','size','mtimeMs','ctimeMs'].map(key=>[key,state[key]]));
function plainDirectory(directory){for(let current=canonicalCasePath(directory);;current=path.dirname(current)){const state=fs.lstatSync(current);if(!state.isDirectory()||state.isSymbolicLink())throw Error('Deadline output directory must have no linked ancestors');if(path.dirname(current)===current)break;}}
export function nodeTestArguments(args){
 const files=[],flags=[];
 for(const arg of args){
  if(/^--test-concurrency=[1-9]\d{0,2}$/u.test(arg))flags.push(arg);
  else if(arg.startsWith('-'))throw Error('Only unchanged test concurrency and whole source files are allowed');
  else files.push(arg);
 }
 if(!files.length||files.length>4096||flags.length>1)throw Error('Complete explicit Node test files required');
 return {files,flags};
}
export async function runAuditedNodeTests({root,files,flags=[],outputDirectory,outerTimeoutMs=3600000,node=process.execPath}={}){
 const started=performance.now();
 root=canonicalCasePath(root);if(!Number.isSafeInteger(outerTimeoutMs)||outerTimeoutMs<1||outerTimeoutMs>3600000)throw Error('Finite original enclosing Node budget required');
 ({files,flags}=nodeTestArguments([...flags,...files]));
 const absoluteFiles=files.map(file=>canonicalCasePath(path.resolve(root,file)));
 for(const file of absoluteFiles){if(path.relative(root,file).startsWith('..')||!fs.statSync(file).isFile())throw Error('Whole Node source must be inside selected root');}
 const originalSources=absoluteFiles.map(file=>readCaseSource(file));
 if(originalSources.reduce((sum,row)=>sum+row.bytes,0)>64*1024*1024)throw Error('Complete original Node source bound exceeded');
 const outputBase=path.join(root,'packages/javascript/node_modules/.node-case-deadlines');
 if(!outputDirectory){plainDirectory(path.dirname(outputBase));fs.mkdirSync(outputBase,{recursive:true});plainDirectory(outputBase);outputDirectory=fs.mkdtempSync(path.join(outputBase,'complete-'));}
 else {outputDirectory=canonicalCasePath(outputDirectory);plainDirectory(path.dirname(outputDirectory));fs.mkdirSync(outputDirectory,{mode:0o700});}
 const outputIdentity=fs.lstatSync(outputDirectory),guardOutput=()=>{plainDirectory(outputDirectory);const after=fs.lstatSync(outputDirectory);if(after.dev!==outputIdentity.dev||after.ino!==outputIdentity.ino||after.mode!==outputIdentity.mode)throw Error('Deadline output directory identity changed');};
 const receipt=path.join(outputDirectory,'case-deadlines.json');
 const codeSources=['node-case-deadlines.mjs','node-case-deadline-reporter.mjs','run-node-tests.mjs'].map(name=>readCaseSource(fileURLToPath(new URL(name,import.meta.url))));
 const request={schema:'complete-node-case-deadline-request-v1',root,files:absoluteFiles,receipt};
 const raw=Buffer.from(JSON.stringify(request,null,2)+'\n'),requestPath=path.join(outputDirectory,'request.json');fs.writeFileSync(requestPath,raw,{flag:'wx',mode:0o600});
 const requestFact=readCaseSource(requestPath);
 const reporter=fileURLToPath(new URL('./node-case-deadline-reporter.mjs',import.meta.url));
 const command=[node,'--test',...flags,'--test-reporter='+reporter,...files];
 const write=(name,value)=>fs.writeFileSync(path.join(outputDirectory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
 write('command.json',{root,command,outerTimeoutMs,requestSha256:hash(raw),node:process.versions,codeSources,originalSources,typescriptOverride:process.env.ROUTER_TRANSLATION_TSC??null,caseLimitsChanged:false});
 const env={...process.env,ROUTER_NODE_DEADLINE_REQUEST:requestPath,ROUTER_NODE_DEADLINE_REQUEST_SHA256:hash(raw)};
 let child,killTimer,outerTimer,interrupted=null,outputError=null,launchError=null,shutdownStarted=null;
 const groupCleanup={supported:process.platform!=='win32',group:null,signals:[],complete:false,error:null};
 const signalOwned=signal=>{if(!child?.pid)return;try{if(process.platform==='win32')child.kill(signal);else process.kill(-child.pid,signal);groupCleanup.signals.push({signal,elapsedMs:performance.now()-started});}catch(error){if(error.code!=='ESRCH')groupCleanup.error??=error.stack??error.message;}};
 const startShutdown=()=>{if(shutdownStarted!==null||!child?.pid)return;shutdownStarted=performance.now();groupCleanup.group=child.pid;signalOwned('SIGTERM');killTimer=setTimeout(()=>signalOwned('SIGKILL'),1000);killTimer.unref();};
 const terminate=reason=>{interrupted??=reason;startShutdown();};
 const ownedGroupAlive=()=>{try{process.kill(-child.pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
 async function finishShutdown(){
  if(!child?.pid){groupCleanup.complete=true;return;}
  startShutdown();
  if(process.platform==='win32')return; // Direct close is awaited; no Unix group claim.
  const until=Math.min(started+outerTimeoutMs,shutdownStarted+2000);
  try{
   while(ownedGroupAlive()){
    if(performance.now()>=until){signalOwned('SIGKILL');throw Error('Owned Node process group did not close within unchanged enclosing cleanup budget');}
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   groupCleanup.complete=true;
  }catch(error){groupCleanup.error??=error.stack??error.message;signalOwned('SIGKILL');}
 }
 const onInt=()=>terminate('SIGINT'),onTerm=()=>terminate('SIGTERM');process.on('SIGINT',onInt);process.on('SIGTERM',onTerm);
 async function retain(stream,name,destination){
  const filename=path.join(outputDirectory,name),fd=fs.openSync(filename,'wx+',0o600);let bytes=0,observedBytes=0,expected=null,readback=null,identity=null;const digest=createHash('sha256');
  try{for await(const chunk of stream){observedBytes+=chunk.length;let offset=0;while(offset<chunk.length){const written=fs.writeSync(fd,chunk,offset,chunk.length-offset);if(written<=0)throw Error('No raw log write progress');digest.update(chunk.subarray(offset,offset+written));offset+=written;bytes+=written;}if(!destination.write(chunk))await once(destination,'drain');if(bytes>RAW_LIMIT){outputError??='Raw stream exceeded256MiB stop threshold; full partial retained';terminate(outputError);}}}
  catch(error){outputError??=error.stack??error.message;terminate('raw stream failure');}
  finally{
   expected=digest.digest('hex');
   try{
    identity=fileIdentity(fs.fstatSync(fd));if(JSON.stringify(fileIdentity(fs.lstatSync(filename)))!==JSON.stringify(identity))throw Error('Retained raw fd/path identity differs');
    const verification=createHash('sha256'),buffer=Buffer.alloc(65536);let count=0,length;
    while((length=fs.readSync(fd,buffer,0,buffer.length,count))>0){count+=length;if(count>bytes)throw Error('Retained raw grew beyond complete stream');verification.update(buffer.subarray(0,length));}
    readback={bytes:count,sha256:verification.digest('hex')};
    if(count!==bytes||readback.sha256!==expected||JSON.stringify(fileIdentity(fs.fstatSync(fd)))!==JSON.stringify(identity)||JSON.stringify(fileIdentity(fs.lstatSync(filename)))!==JSON.stringify(identity))throw Error('Complete retained raw bytes or identity differ');
   }catch(error){outputError??=error.stack??error.message;}finally{fs.closeSync(fd);}
  }
  return {path:name,bytes,observedBytes,sha256:expected,readback,identity};
 }
 let exit={code:null,signal:null},logs=[];
 try{
  child=spawn(node,command.slice(1),{cwd:root,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  child.once('exit',startShutdown);
  const closed=new Promise(resolve=>{child.once('error',error=>{launchError=error.stack??error.message;});child.once('close',(code,signal)=>resolve({code,signal}));});
  outerTimer=setTimeout(()=>terminate('unchanged enclosing deadline'),Math.max(1,outerTimeoutMs-(performance.now()-started)));outerTimer.unref();
  const pumps=[retain(child.stdout,'stdout.raw.tap',process.stdout),retain(child.stderr,'stderr.raw.log',process.stderr)];
  exit=await closed;logs=await Promise.all(pumps);
 }finally{await finishShutdown();clearTimeout(outerTimer);clearTimeout(killTimer);process.removeListener('SIGINT',onInt);process.removeListener('SIGTERM',onTerm);}
 let audit=null,auditError=null,auditPin=null,receiptFact=null;
 const verify=()=>{
  guardOutput();if(groupCleanup.error||groupCleanup.supported&&!groupCleanup.complete)throw Error(groupCleanup.error??'Owned Node process group cleanup incomplete');if(performance.now()-started>outerTimeoutMs)throw Error('Complete Node execution and final audit exceeded unchanged outer deadline');
  if(JSON.stringify(readCaseSource(requestPath))!==JSON.stringify(requestFact))throw Error('Deadline request bytes/identity changed');
  for(const before of codeSources)if(JSON.stringify(readCaseSource(before.path))!==JSON.stringify(before))throw Error('Deadline runner/reporter source changed during complete run');
  let bytes=0;if(!Array.isArray(audit?.sourceRecords)||audit.sourceRecords.length>4096)throw Error('Complete bounded source records required');
  const byPath=new Map();
  for(const before of audit.sourceRecords){if(typeof before.path!=='string'||path.relative(root,before.path).startsWith('..')||byPath.has(before.path)||!Number.isSafeInteger(before.bytes)||before.bytes<0||(bytes+=before.bytes)>64*1024*1024)throw Error('Deadline source bounds/root differ');if(JSON.stringify(readCaseSource(before.path))!==JSON.stringify(before))throw Error('Deadline test source changed after child completion');byPath.set(before.path,before);}
  for(const before of originalSources)if(JSON.stringify(byPath.get(before.path))!==JSON.stringify(before))throw Error('Complete original selected source has no exact audit join');
  if(JSON.stringify(readCaseSource(receipt,128*1024*1024))!==JSON.stringify(receiptFact))throw Error('Deadline audit receipt bytes/identity changed');
  for(const log of logs)if(JSON.stringify(fileIdentity(fs.lstatSync(path.join(outputDirectory,log.path))))!==JSON.stringify(log.identity))throw Error('Full retained raw identity changed after readback');
 };
 try{
  receiptFact=readCaseSource(receipt,128*1024*1024);auditPin={path:'case-deadlines.json',bytes:receiptFact.bytes,sha256:receiptFact.sha256};audit=JSON.parse(receiptFact.source);
  if(audit.requestSha256!==hash(raw)||audit.allEventsForwardedToBuiltinTap!==true||audit.passed!==true)throw Error('Independent complete source/deadline audit failed');
  verify();
 }catch(error){auditError=error.stack??error.message;}
 const result={schema:'complete-audited-node-test-run-v1',root,command,outputDirectory,exit,logs,audit:auditPin,auditSummary:audit?{passed:audit.passed,durationBreaches:audit.durationBreaches,errors:audit.errors}:null,auditError,launchError,outputError,interrupted,groupCleanup,elapsedMs:performance.now()-started,outerTimeoutMs,childClosed:true,processGroupCleanupSupported:process.platform!=='win32',allCaseLimitsUnchanged:true,allSelectedWholeFiles:files,exitCode:exit.code===0&&!auditError&&!outputError&&!launchError&&!interrupted&&!groupCleanup.error&&(!groupCleanup.supported||groupCleanup.complete)&&performance.now()-started<=outerTimeoutMs?0:1,runtimeParity:false,rustExecuted:false};
 write('terminal.json',result);
 if(result.exitCode===0)try{verify();}catch(error){result.exitCode=1;result.auditError='Final receipt boundary: '+(error.stack??error.message);write('finalization-refusal.json',result);}
 return result;
}
async function main(){
 const args=process.argv.slice(2);let outerTimeoutMs=3600000;
 if(args[0]?.startsWith('--outer-timeout-ms=')){if(!/^--outer-timeout-ms=[1-9]\d{0,6}$/u.test(args[0]))throw Error('Exact finite outer budget option required');outerTimeoutMs=Number(args.shift().split('=')[1]);}
 const root=fileURLToPath(new URL('../',import.meta.url)),selected=nodeTestArguments(args);
 const result=await runAuditedNodeTests({root,...selected,outerTimeoutMs});process.stderr.write('Complete Node deadline evidence: '+result.outputDirectory+'\n');
 if(result.exitCode)process.stderr.write(JSON.stringify({exitCode:result.exitCode,auditError:result.auditError,firstAuditErrors:result.auditSummary?.errors?.slice(0,20)??[],completeErrorsInReceipt:true})+'\n');
 process.exitCode=result.exitCode;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.stack??error.message);process.exitCode=1;});
