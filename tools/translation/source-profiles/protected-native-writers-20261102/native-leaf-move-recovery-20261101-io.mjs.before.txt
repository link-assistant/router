// Internal bounded DATA I/O. These helpers issue no semantic/write permission.
import fs from 'node:fs';
import {resolve,dirname} from 'node:path';
import {readCurrentSourceProposalFile} from './unit-runtime-materialization.mjs';
import {relativeReconcilePath as path,requireReconcile as need,RECONCILE_LIMITS,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
export const inode=stat=>({dev:stat.dev,ino:stat.ino,mode:stat.mode});
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function requireDurabilityPlatform(){need(['linux','darwin'].includes(process.platform)&&Number.isInteger(fs.constants.O_DIRECTORY)&&Number.isInteger(fs.constants.O_NOFOLLOW),'directory-fsync/no-follow durability is unsupported on this platform');}
export function absolute(root,name){let full=root;const initial=fs.lstatSync(root);need(initial.isDirectory()&&!initial.isSymbolicLink(),'ordinary recovery root required');for(const part of path(name).split('/').slice(0,-1)){full=resolve(full,part);const stat=fs.lstatSync(full);need(stat.isDirectory()&&!stat.isSymbolicLink(),'linked recovery ancestor refused');}return resolve(root,name);}
const stable=stat=>stat===null?null:[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeMs,stat.ctimeMs,stat.nlink];
function named(full){try{return fs.lstatSync(full);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function closeAll(checks){const errors=[];for(const check of checks)try{check();}catch(error){errors.push(error);}if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Durable resource closing failures');}
function withClose(work,close){let value,primary,failed=false;try{value=work();}catch(error){failed=true;primary=error;}try{close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return value;}
export function readRow(root,name){const full=absolute(root,name),before=named(full),source=readCurrentSourceProposalFile(root,name),stat=named(full);need(same(stable(before),stable(stat)),'complete recovery source changed during capture');if(source===null){need(stat===null,'absent recovery source reappeared');return null;}need(stat&&stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=RECONCILE_LIMITS.file,'ordinary bounded recovery source required');return {source,identity:inode(stat),stamp:stable(stat),mode:stat.mode&0o777,nlink:stat.nlink};}
export function names(full){const before=fs.lstatSync(full);need(before.isDirectory()&&!before.isSymbolicLink(),'ordinary complete recovery census required');const handle=fs.opendirSync(full),result=[];withClose(()=>{for(;;){const row=handle.readSync();if(row===null)break;need(result.length<RECONCILE_LIMITS.count,'bounded complete recovery census required');need(!row.isSymbolicLink(),'linked recovery entry refused');result.push(row.name);}},()=>closeAll([()=>handle.closeSync(),()=>need(same(stable(before),stable(fs.lstatSync(full))),'recovery directory changed during census')]));return result.sort();}
export function syncDirectory(full){
 requireDurabilityPlatform();
 const before=fs.lstatSync(full);need(before.isDirectory()&&!before.isSymbolicLink(),'ordinary fsync directory required');const fd=fs.openSync(full,fs.constants.O_RDONLY|(fs.constants.O_DIRECTORY??0)|(fs.constants.O_NOFOLLOW??0));
 withClose(()=>{const actual=fs.fstatSync(fd);need(same(inode(actual),inode(before)),'fsync directory identity changed');fs.fsyncSync(fd);},()=>closeAll([()=>fs.closeSync(fd),()=>need(same(stable(fs.lstatSync(full)),stable(before)),'fsync directory replaced/changed')]));
}
export function syncFile(full){requireDurabilityPlatform();const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);withClose(()=>{const stat=fs.fstatSync(fd);need(stat.isFile()&&stat.size<=RECONCILE_LIMITS.file,'bounded ordinary fsync file required');fs.fsyncSync(fd);},()=>fs.closeSync(fd));}
export function writeNew(root,name,text,mode){
 requireDurabilityPlatform();need(typeof text==='string'&&Buffer.byteLength(text)<=RECONCILE_LIMITS.file,'bounded complete durable source required');const full=absolute(root,name),fd=fs.openSync(full,'wx',mode);withClose(()=>{const bytes=Buffer.from(text);let at=0;while(at<bytes.length){const count=fs.writeSync(fd,bytes,at,bytes.length-at);need(count>0,'complete durable write required');at+=count;}fs.fchmodSync(fd,mode);fs.fsyncSync(fd);},()=>fs.closeSync(fd));const row=readRow(root,name);need(row&&row.source===text&&row.mode===mode,'complete durable source readback differs');syncDirectory(dirname(full));return row.identity;
}
export function receiptSource(value){need(boundedReconcileWireBytes(value)+1<=RECONCILE_LIMITS.file,'bounded complete durable receipt required');return JSON.stringify(value)+'\n';}
export function writeReceipt(root,name,value){const text=receiptSource(value),old=readRow(root,name);if(old){need(old.source===text&&old.mode===0o600&&old.nlink===1,'different existing receipt retained');syncFile(absolute(root,name));syncDirectory(dirname(absolute(root,name)));return old.identity;}return writeNew(root,name,text,0o600);}
export function linkNew(root,from,to,source,expectedInode,mode){requireDurabilityPlatform();const sourceRow=readRow(root,from);need(sourceRow&&sourceRow.source===source&&same(sourceRow.identity,expectedInode)&&sourceRow.mode===mode,'owned complete link source differs');fs.linkSync(absolute(root,from),absolute(root,to));const row=readRow(root,to);need(row&&row.source===source&&same(row.identity,expectedInode),'complete no-overwrite link readback differs');syncFile(absolute(root,to));syncDirectory(dirname(absolute(root,to)));return row.identity;}
export function unlinkOwned(root,name,source,expectedInode,mode){requireDurabilityPlatform();const row=readRow(root,name);need(row&&row.source===source&&row.mode===mode&&same(row.identity,expectedInode),'external recovery artifact retained');fs.unlinkSync(absolute(root,name));syncDirectory(dirname(absolute(root,name)));}
export function renameOwned(root,from,to,source,expectedInode,mode,oldTarget=null){
 requireDurabilityPlatform();
 const row=readRow(root,from);need(row&&row.source===source&&row.mode===mode&&same(row.identity,expectedInode),'owned durable rename source differs');const target=readRow(root,to);need(oldTarget?target&&target.source===oldTarget.source&&same(target.identity,oldTarget.identity):target===null,'external durable rename target retained');
 fs.renameSync(absolute(root,from),absolute(root,to));const installed=readRow(root,to);need(installed&&installed.source===source&&same(installed.identity,expectedInode),'durable installed inode/source differs');syncFile(absolute(root,to));syncDirectory(dirname(absolute(root,to)));if(dirname(from)!==dirname(to))syncDirectory(dirname(absolute(root,from)));
}
// Public removals quarantine first. An unexpected captured replacement is never
// unlinked; restore a regular inode without overwriting any newly present path.
export function quarantinePublic(root,from,to,source,expectedInode,mode){
 requireDurabilityPlatform();
 const before=readRow(root,from);need(before&&before.source===source&&before.mode===mode&&same(before.identity,expectedInode)&&readRow(root,to)===null,'public quarantine originals differ');fs.renameSync(absolute(root,from),absolute(root,to));
 let captured;try{captured=readRow(root,to);need(captured&&captured.source===source&&captured.mode===mode&&same(captured.identity,expectedInode),'unexpected public replacement retained in quarantine');}catch(error){
  try{const stat=fs.lstatSync(absolute(root,to));if(stat.isFile()&&!stat.isSymbolicLink()){fs.linkSync(absolute(root,to),absolute(root,from));const restored=fs.lstatSync(absolute(root,from));need(same(inode(stat),inode(restored)),'unexpected captured replacement changed during restoration');syncDirectory(dirname(absolute(root,from)));}}catch{/* Never overwrite a reappeared public name or remove unknown data. */}
  throw error;
 }
 syncFile(absolute(root,to));syncDirectory(dirname(absolute(root,to)));syncDirectory(dirname(absolute(root,from)));
}
export function retained(error,transactionPath){if(error&&typeof error==='object')try{Object.defineProperty(error,'recoveryPaths',{value:[transactionPath,transactionPath+'.anchor.json'],enumerable:true});}catch{/* Preserve primary errors. */}return error;}
