import {forwardFailureField as errorField} from './forward-output-ownership-20261101-failure.mjs';
import {applyPartitionedForwardCustody} from './forward-output-ownership-20261101-transaction.mjs';
import {FORWARD_OWNERSHIP_PRODUCERS,describeForwardOutputPartitions} from './forward-output-ownership-20261101-partitions.mjs';
import {boundedSourceReadOpenFlags,checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
// Exact generated-output custody only. Original private compilers admit source.
// SOURCE ONLY / UNRUN. Requires cooperating/exclusive writers; not crash atomic.
import fs from 'node:fs';
import {types} from 'node:util';
import {resolve,dirname,join} from 'node:path';
const MiB=1024*1024,CHUNK=65536;
export {equalFiles as compareForwardCustodyFiles,lines as readForwardCustodyIndex,readSmall as readForwardCustodyText};
export const FORWARD_OWNERSHIP_LIMITS=Object.freeze({prefixedProfileBytes:512*MiB,matrixBytes:1024*MiB,isolatedProfilePaths:200000,unprefixedAggregateBytes:null,directProfilePaths:null,standaloneDurationMs:null,pathBytes:4096,indexRowBytes:6*4096+256});
export {FORWARD_OWNERSHIP_PRODUCERS};
const PRIVATE=new WeakMap();
const need=(value,message)=>{if(!value)throw new TypeError('Forward output custody: '+message);};
const same=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>same(value,b[index]));
const synchronousCallback=value=>typeof value==='function'&&!types.isProxy(value)&&!types.isAsyncFunction(value);
function synchronous(value){need(!types.isPromise(value)&&!types.isProxy(value)&&!(value!==null&&(typeof value==='object'||typeof value==='function')&&Reflect.has(value,'then')),'operational callbacks must complete synchronously');return value;}
function statData(native){need([native.dev,native.ino,native.mode,native.size,native.mtimeNs,native.ctimeNs].every(value=>typeof value==='bigint'),'precise bigint filesystem identity/time support required');need(native.size<=BigInt(Number.MAX_SAFE_INTEGER),'exact representable physical file size required');return {dev:native.dev.toString(),ino:native.ino.toString(),mode:Number(native.mode),size:Number(native.size),mtimeNs:native.mtimeNs.toString(),ctimeNs:native.ctimeNs.toString(),isFile:()=>native.isFile(),isDirectory:()=>native.isDirectory(),isSymbolicLink:()=>native.isSymbolicLink()};}
const statFile=file=>statData(fs.lstatSync(file,{bigint:true})),statFD=fd=>statData(fs.fstatSync(fd,{bigint:true}));
const identity=stat=>[stat.dev,stat.ino,stat.mode];
const complete=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs];
function closing(operation,checks){let value,primary,failed=false;const secondary=[];try{value=operation();}catch(error){primary=error;failed=true;}for(const check of checks)try{check();}catch(error){if(!failed){primary=error;failed=true;}else secondary.push(error);}if(failed){if(primary&&typeof primary==='object')try{Object.defineProperty(primary,'forwardClosingFailures',{value:secondary,enumerable:true});}catch{}throw primary;}return value;}
function path(name){need(typeof name==='string'&&Buffer.byteLength(name)<=4096&&name.length&&!/[\\\0\r\n:]/u.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'ordinary relative output path required');return name;}
function physical(root,name){path(name);let current=root;for(const part of name.split('/')){current=join(current,part);try{const stat=statFile(current);need(!stat.isSymbolicLink()&&(current===join(root,name)||stat.isDirectory()),'linked/non-directory output ancestor refused');}catch(error){if(errorField(error,'code')!=='ENOENT')throw error;}}return current;}
function ordinary(root,name){const full=physical(root,name);let stat;try{stat=statFile(full);}catch(error){if(errorField(error,'code')==='ENOENT')return null;throw error;}need(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o7000)===0,'ordinary output file without special mode bits required');return {full,stat};}
function openRead(file){const before=statFile(file);need(before.isFile()&&!before.isSymbolicLink(),'ordinary exact bank source required');checkBoundedSourcePath(file);const fd=fs.openSync(file,boundedSourceReadOpenFlags());try{need(same(complete(before),complete(statFD(fd))),'source identity changed on open');return {fd,before,file};}catch(error){try{fs.closeSync(fd);}catch{}throw error;}}
function closeRead(row){closing(()=>{need(same(complete(row.before),complete(statFD(row.fd)))&&same(complete(row.before),complete(statFile(row.file))),'complete source changed during streamed read');},[()=>fs.closeSync(row.fd)]);}
function equalFiles(left,right,tick=()=>{}){const a=openRead(left);let b;return closing(()=>{b=openRead(right);if(a.before.size!==b.before.size)return false;const x=Buffer.alloc(CHUNK),y=Buffer.alloc(CHUNK);let at=0;while(at<a.before.size){tick();const size=Math.min(CHUNK,a.before.size-at),nx=fs.readSync(a.fd,x,0,size,at),ny=fs.readSync(b.fd,y,0,size,at);need(nx===size&&ny===size,'source truncated during full comparison');if(!x.subarray(0,size).equals(y.subarray(0,size)))return false;at+=size;}need(fs.readSync(a.fd,x,0,1,at)===0&&fs.readSync(b.fd,y,0,1,at)===0,'source grew during comparison');return true;},[()=>{if(b)closeRead(b);},()=>closeRead(a)]);}
function readSmall(file,max){const row=openRead(file);return closing(()=>{need(row.before.size<=max,'bounded bookkeeping source required');const bytes=Buffer.alloc(row.before.size);let at=0;while(at<bytes.length){const count=fs.readSync(row.fd,bytes,at,bytes.length-at,at);need(count>0,'bookkeeping source truncated');at+=count;}const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);return source;},[()=>closeRead(row)]);}
function writeAll(fd,bytes){let at=0;while(at<bytes.length){const count=fs.writeSync(fd,bytes,at,bytes.length-at);need(count>0,'complete source write required');at+=count;}}
function writeText(file,source,mode,tick,exactMode=true){need(typeof source==='string','original producer primitive source required');const fd=fs.openSync(file,'wx',mode);let bytes=0;return closing(()=>{for(let at=0;at<source.length;){tick();let end=Math.min(at+CHUNK,source.length);if(end<source.length&&source.charCodeAt(end-1)>=0xd800&&source.charCodeAt(end-1)<=0xdbff&&source.charCodeAt(end)>=0xdc00&&source.charCodeAt(end)<=0xdfff)end--;const raw=Buffer.from(source.slice(at,end),'utf8');writeAll(fd,raw);bytes+=raw.length;at=end;}if(exactMode)fs.fchmodSync(fd,mode);return bytes;},[()=>fs.closeSync(fd)]);}
function equalText(file,source,tick){const row=openRead(file);return closing(()=>{let offset=0;const bytes=Buffer.alloc(CHUNK*4);for(let at=0;at<source.length;){tick();let end=Math.min(at+CHUNK,source.length);if(end<source.length&&source.charCodeAt(end-1)>=0xd800&&source.charCodeAt(end-1)<=0xdbff&&source.charCodeAt(end)>=0xdc00&&source.charCodeAt(end)<=0xdfff)end--;const part=Buffer.from(source.slice(at,end),'utf8');let got=0;while(got<part.length){const count=fs.readSync(row.fd,bytes,got,part.length-got,offset+got);if(!count)return false;got+=count;}if(!bytes.subarray(0,got).equals(part))return false;offset+=got;at=end;}return offset===row.before.size&&fs.readSync(row.fd,bytes,0,1,offset)===0;},[()=>closeRead(row)]);}
function lines(file,tick=()=>{}){
 return { *[Symbol.iterator](){
  const reader=openRead(file);let at=0,pending='',primary,failed=false;const decoder=new TextDecoder('utf-8',{fatal:true});
  try{const bytes=Buffer.alloc(CHUNK);while(at<reader.before.size){tick();const count=fs.readSync(reader.fd,bytes,0,Math.min(CHUNK,reader.before.size-at),at);need(count>0,'bank index truncated');at+=count;pending+=decoder.decode(bytes.subarray(0,count),{stream:true});let end;while((end=pending.indexOf('\n'))>=0){need(Buffer.byteLength(pending.slice(0,end))<=6*4096+256,'bounded bank index row required');yield JSON.parse(pending.slice(0,end));pending=pending.slice(end+1);}need(Buffer.byteLength(pending)<=6*4096+256,'bounded unfinished bank index row required');}pending+=decoder.decode();need(pending==='','complete bank index newline required');}
  catch(error){failed=true;primary=error;}
  finally{try{closeRead(reader);}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
 }};
}

// Operational filesystem library: callbacks themselves prove NO compiler
// admission. Actual callers independently join their original private plan.
// This one-use operational handle only retains callbacks and custody inputs.
export function createForwardOutputCustody({producer,root,outputRoot=root,prefixes=[''],entries,verify,reissue,mutateOutputDirectories,extraPaths=[],deadline=Infinity}){
 need(FORWARD_OWNERSHIP_PRODUCERS.includes(producer)&&synchronousCallback(entries)&&synchronousCallback(verify)&&synchronousCallback(reissue),'closed operational producer role and synchronous custody callbacks required');
 const partitions=describeForwardOutputPartitions({producer,prefixes,extraPaths});need(synchronousCallback(mutateOutputDirectories),'operational directory bookkeeping callback required; it proves no compiler permission');
 const handle=Object.freeze({schema:'one-use-operational-forward-custody-20261101'});PRIVATE.set(handle,{producer,root:fs.realpathSync(resolve(root)),outputRoot:fs.realpathSync(resolve(outputRoot)),prefixes:[...prefixes],partitions,mutateOutputDirectories,deadline,entries,verify,reissue,extraPaths:[...extraPaths]});return handle;
}
export function applyForwardOutputCustody(handle,options={}){
 const state=PRIVATE.get(handle);need(state,'unconsumed operational custody handle required');PRIVATE.delete(handle);let result,primary,failed=false;const secondary=[];
 try{result=applyCustody(state,options);}catch(error){failed=true;primary=error;}
 // Close the complete original source fence before any rollback evidence is
 // removed. A failure here still has every original public inode and byte copy.
 for(const verify of [()=>{if(state.verifyClosing)synchronous(state.verifyClosing());else synchronous(state.verify());},()=>{if(state.verifyFresh)synchronous(state.verifyFresh());}])try{verify();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}
 if(failed&&state.rollbackClosing)try{state.rollbackClosing();}catch(error){secondary.push(error);}
 if(failed&&state.finalizeFailure&&secondary.length===0)try{state.finalizeFailure();}catch(error){secondary.push(error);}
 if(!failed&&state.finalizeSuccess){
  state.publicationCleanupAttempted=true;try{state.finalizeSuccess();}catch(error){failed=true;primary=error;}
  // Cleanup can invoke filesystem hooks or encounter a cooperating source
  // change. Close BOTH original and fresh sources again before success. The
  // old backups may already be gone: late failure reports partial publication,
  // never an invented successful rollback after evidence deletion.
  for(const verify of [()=>{if(state.verifyClosing)synchronous(state.verifyClosing());else synchronous(state.verify());},()=>{if(state.verifyFresh)synchronous(state.verifyFresh());}])try{verify();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}
  state.partialPublication=failed;
 }
 state.preserveHistorical=Boolean(state.preserveHistorical||failed||secondary.length);
 if(state.historyBank&&!state.preserveHistorical)try{state.historyBank.close();}catch(error){failed=true;primary=error;state.preserveHistorical=true;}
 if(state.releaseFresh)try{state.releaseFresh();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);state.preserveHistorical=true;state.partialPublication=Boolean(state.publicationCleanupAttempted);}
 if(failed){let paths=[];try{if(state.recoveryPaths)paths=state.recoveryPaths();}catch(error){secondary.push(error);}if(primary&&typeof primary==='object')try{Object.defineProperties(primary,{forwardOuterClosingFailures:{value:secondary,enumerable:true},forwardOuterRecoveryPaths:{value:paths,enumerable:true},forwardPartialPublication:{value:Boolean(state.partialPublication),enumerable:true}});}catch{}if(paths.length)try{process.stderr.write(JSON.stringify({schema:'router-forward-custody-retained-v1',paths,partialPublication:Boolean(state.partialPublication)})+'\n');}catch{}throw primary;}
 return result;
}

// These are ordinary operational filesystem DATA functions. They issue no
// original private plan, source/type/owner token or compiler verdict.
export const forwardCustodyFilesystemData=Object.freeze({errorField,need,same,synchronous,synchronousCallback,identity,complete,statFile,statFD,path,physical,ordinary,openRead,closeRead,equalFiles,readSmall,writeAll,writeText,equalText,lines,closing});
function applyCustody(state,options){return applyPartitionedForwardCustody(state,options);}
