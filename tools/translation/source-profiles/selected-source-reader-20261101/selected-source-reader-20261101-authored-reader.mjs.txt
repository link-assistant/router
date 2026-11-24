// Selected original-source DATA successor. Complete predecessor copied below.
// No parser frame, corpus/type/owner issuer. SOURCE ONLY / UNRUN.
// SOURCE ONLY / UNRUN. Every read is fresh; operation records are synchronous
// closing evidence, expire on return, and are never reused as a source permit.
import fs from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {types} from 'node:util';
import {captureSelectedSourceGitEnvelope,verifySelectedSourceGitEnvelope,readSelectedSourceGitRows} from './selected-source-reader-20261101-metadata.mjs';
import {withSelectedSourceIndexImage,preloadSelectedSourceIndexInputs} from './selected-source-reader-20261101-index.mjs';
const MiB=1024*1024,CHUNK=65536;let ACTIVE=null;
const need=(yes,message)=>{if(!yes)throw new TypeError('Bounded original source DATA: '+message);};
const stamp=stat=>{need(typeof stat.dev==='bigint'&&typeof stat.ino==='bigint'&&typeof stat.mtimeNs==='bigint'&&typeof stat.ctimeNs==='bigint','precise native source identity/time support required');return [stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function ownError(error,key){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,key);return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function relative(name){need(typeof name==='string'&&name&&Buffer.byteLength(name)<=4096&&!name.includes('\\')&&!name.includes(':')&&!name.includes('\0')&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'ordinary original relative source path required');return name;}
function close(operation,checks){let result,primary,failed=false;try{result=operation();}catch(error){failed=true;primary=error;}for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;}
export function boundedSourceReadOpenFlags(){
 if(process.platform==='win32')return fs.constants.O_RDONLY|(Number.isInteger(fs.constants.O_NOFOLLOW)?fs.constants.O_NOFOLLOW:0)|(Number.isInteger(fs.constants.O_NONBLOCK)?fs.constants.O_NONBLOCK:0);
 need(Number.isInteger(fs.constants.O_NOFOLLOW)&&Number.isInteger(fs.constants.O_NONBLOCK),'POSIX no-follow/nonblocking source open support required');return fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK;
}
export function checkBoundedSourcePath(file){
 if(process.platform!=='win32')return;const stat=fs.lstatSync(file,{bigint:true});const attributes=stat.fileAttributes,reparse=typeof attributes==='bigint'?Boolean(attributes&0x400n):Number.isInteger(attributes)&&Boolean(attributes&0x400);need(!stat.isSymbolicLink()&&!reparse,'Node-visible Windows reparse/link input refused');need(resolve(fs.realpathSync(file)).toLowerCase()===resolve(file).toLowerCase(),'Windows reparse/path alias refused');
 // Node does not expose every opaque reparse tag or an atomic no-reparse open.
 // Ordinary Windows support requires cooperating/frozen source paths; stronger
 // hostile replacement/FIFO/reparse guarantees remain explicitly OPEN.
}

function ancestors(root,name){let full=root;const rows=[];const first=fs.lstatSync(root,{bigint:true});need(first.isDirectory()&&!first.isSymbolicLink(),'ordinary source operation root required');checkBoundedSourcePath(root);rows.push({path:root,identity:stamp(first)});for(const part of relative(name).split('/').slice(0,-1)){full=join(full,part);let stat;try{stat=fs.lstatSync(full,{bigint:true});}catch(error){if(ownError(error,'code')!=='ENOENT')throw error;stat=null;}need(stat===null||stat.isDirectory()&&!stat.isSymbolicLink(),'linked/non-directory original source ancestor');if(stat)checkBoundedSourcePath(full);rows.push({path:full,identity:stat?stamp(stat):null});}return rows;}
function checkAncestors(rows){for(const row of rows){let stat;try{stat=fs.lstatSync(row.path,{bigint:true});}catch(error){if(ownError(error,'code')!=='ENOENT')throw error;stat=null;}if(stat)checkBoundedSourcePath(row.path);need(equal(stat?stamp(stat):null,row.identity),'original source ancestor changed');}}
function git(root,args,{maxBytes=16*MiB,encoding,literal=true}={}){
 return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,...(literal?['--literal-pathspecs']:[]),'-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{encoding,timeout:30000,maxBuffer:Math.max(1,maxBytes),env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_PAGER:'cat'}});
}
function head(root){try{return git(root,['rev-parse','--verify','--quiet','HEAD'],{encoding:'utf8',maxBytes:1024}).trim();}catch(error){if(ownError(error,'status')!==1)throw error;return 'unborn:'+git(root,['symbolic-ref','--quiet','HEAD'],{encoding:'utf8',maxBytes:4096}).trim();}}

function physical(root,name,maxBytes){
 const parents=ancestors(root,name),file=join(root,name);let before;try{before=fs.lstatSync(file,{bigint:true});}catch(error){if(ownError(error,'code')==='ENOENT')return {missing:true,file,parents};throw error;}
 need(before.isFile()&&!before.isSymbolicLink()&&typeof before.size==='bigint'&&before.size>=0n&&before.size<=BigInt(Number.MAX_SAFE_INTEGER),'ordinary original source file required');need(before.size<=maxBytes,'source corpus input exceeds its byte budget at '+name);
 checkBoundedSourcePath(file);const fd=fs.openSync(file,boundedSourceReadOpenFlags());return close(()=>{
  need(equal(stamp(before),stamp(fs.fstatSync(fd,{bigint:true}))),'original source replaced before bounded open');const chunks=[];let total=0;
  for(;;){const bytes=Buffer.alloc(Math.min(CHUNK,maxBytes-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;need(total<=maxBytes,'original source grew beyond its original byte budget');chunks.push(bytes.subarray(0,count));}
  const bytes=Buffer.concat(chunks,total);need(BigInt(bytes.length)===before.size,'complete original file changed length');return {missing:false,file,parents,identity:stamp(before),bytes};
 },[()=>checkBoundedSourcePath(file),()=>need(equal(stamp(before),stamp(fs.fstatSync(fd,{bigint:true})))&&equal(stamp(before),stamp(fs.lstatSync(file,{bigint:true}))),'complete original source changed during bounded read'),()=>checkAncestors(parents),()=>fs.closeSync(fd)]);
}
function snapshot(root,name,maxBytes,closingFlags=undefined){
 const value=physical(root,name,maxBytes);if(!value.missing)return value;
 return close(()=>{
  const flags=closingFlags===undefined?readSelectedSourceGitRows(root,name).flags:closingFlags,records=flags.split('\0').filter(Boolean);
  if(!records.some(record=>record.startsWith('S ')&&record.slice(2)===name)){
   // Preserve the ordinary missing-file failure; a user's deletion is never
   // resurrected just because some Git object exists for the pathname.
   const fd=fs.openSync(value.file,boundedSourceReadOpenFlags());return close(()=>{need(false,'missing ordinary file appeared unexpectedly');},[()=>fs.closeSync(fd)]);
  }
  const revision=head(root);need(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision),'one exact sparse source HEAD required');const spec=revision+':'+name,size=Number(git(root,['cat-file','-s',spec],{encoding:'utf8',maxBytes:1024}).trim());need(Number.isSafeInteger(size)&&size>=0&&size<=maxBytes,'original sparse source exceeds its byte budget');
  const bytes=git(root,['cat-file','blob',spec],{maxBytes});need(bytes.length===size,'whole immutable sparse source bytes required');
  need(head(root)===revision&&(closingFlags===undefined?readSelectedSourceGitRows(root,name).flags:closingFlags)===flags,'original sparse HEAD/skip state changed');let appeared=false;try{fs.lstatSync(value.file,{bigint:true});appeared=true;}catch(error){if(ownError(error,'code')!=='ENOENT')throw error;}need(!appeared,'original sparse file appeared during immutable source read');return {...value,revision,flags,bytes};
 },[()=>checkAncestors(value.parents)]);
}
function selectedSnapshot(root,name,maxBytes){
 const selectedGit=readSelectedSourceGitRows(root,name);
 return close(()=>({...snapshot(root,name,maxBytes),selectedGit}),[()=>need(equal(readSelectedSourceGitRows(root,name),selectedGit),'actual literal index/skip rows changed during source read')]);
}

// Source closers always reread full originals, even after an index/read poison.
// The enclosing private image independently reissues ALL selected index/skip
// rows and HEAD after these source closers, including every sparse row.
function checkRecord(root,name,row){
 checkAncestors(row.parents);const current=snapshot(root,name,row.maxBytes,row.missing?row.flags:undefined);need(current.missing===row.missing&&equal(current.identity??null,row.identity??null)&&current.revision===row.revision&&current.flags===row.flags&&current.bytes.equals(row.bytes),'complete original operation source changed: '+name);
}
function readSelectedBody(root,name,options=undefined){
 let canonical=null,spelling=null,frames=[];
 try{
  spelling=resolve(root);for(let frame=ACTIVE;frame;frame=frame.parent)if(frame.spellings.has(spelling))frames.push(frame);for(const frame of frames)if(frame.failed)throw frame.primary;
  canonical=fs.realpathSync(spelling);for(let frame=ACTIVE;frame;frame=frame.parent)if(frame.root===canonical&&!frames.includes(frame))frames.push(frame);for(const frame of frames){need(frame.root===canonical,'original source root alias changed');if(frame.failed)throw frame.primary;const identity=stamp(fs.lstatSync(spelling,{bigint:true})),before=frame.spellings.get(spelling);need(before===undefined||equal(before,identity),'original source root spelling identity changed');frame.spellings.set(spelling,identity);}root=canonical;
  let maxBytes=32*MiB;if(options!==undefined){need(options&&typeof options==='object'&&!types.isProxy(options)&&[Object.prototype,null].includes(Object.getPrototypeOf(options)),'ordinary own source-read options required');const keys=Reflect.ownKeys(options);need(keys.length<=1&&keys.every(key=>key==='maxBytes'),'closed source-read option required');if(keys.length){const field=Object.getOwnPropertyDescriptor(options,'maxBytes');need(field&&field.enumerable&&Object.hasOwn(field,'value'),'own source-read limit without getters required');maxBytes=field.value===undefined?32*MiB:field.value;}}need(Number.isSafeInteger(maxBytes)&&maxBytes>=0,'finite original per-read byte budget required');relative(name);const row=selectedSnapshot(root,name,maxBytes);let privateBytes=null;
  for(const frame of frames){const previous=frame.records.get(name);if(previous){need(previous.missing===row.missing&&equal(previous.identity??null,row.identity??null)&&previous.revision===row.revision&&previous.flags===row.flags&&equal(previous.selectedGit,row.selectedGit)&&row.bytes.equals(previous.bytes),'source restored/replaced inside the same original operation');if(privateBytes===null)privateBytes=previous.bytes;}}
  for(const frame of frames)if(!frame.records.has(name)){need(frame.records.size<frame.limits.paths,'original source operation path bound');frame.bytes+=row.bytes.length;need(frame.bytes<=frame.limits.bytes,'explicit original source-operation byte bucket exceeded');if(privateBytes===null)privateBytes=Buffer.from(row.bytes);frame.records.set(name,{...row,maxBytes,bytes:privateBytes});}

  for(const frame of frames)if(frame.observe){need(!frame.observing,'recursive source DATA observer refused');frame.observing=true;try{const event={root,path:name,bytes:Buffer.from(row.bytes),identity:row.identity?[...row.identity]:null,parents:row.parents.map(parent=>({path:parent.path,identity:parent.identity?[...parent.identity]:null})),missing:row.missing,revision:row.revision??null,flags:row.flags??null,maxBytes,sourceAuthority:false,semanticAuthority:false};const result=frame.observe(event);need(!types.isPromise(result)&&!types.isProxy(result)&&!(result!==null&&(typeof result==='object'||typeof result==='function')&&Reflect.has(result,'then')),'source DATA observer must finish synchronously');}finally{frame.observing=false;}}

  return row.bytes;
 }catch(error){if(canonical===null){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frames.includes(frame))frames.push(frame);}for(const frame of frames)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}
}
// The callback is ordinary synchronous source work. A caught source failure
// poisons this operation even if a caller restores bytes and tries again.
function operationOptions(options){
 const values={observe:undefined,limits:undefined,preload:undefined};if(options!==undefined){need(options&&typeof options==='object'&&!types.isProxy(options)&&[Object.prototype,null].includes(Object.getPrototypeOf(options)),'ordinary own operation options required');const keys=Reflect.ownKeys(options);need(keys.length<=3,'closed operation option keys required');for(const key of keys){need(key==='observe'||key==='limits'||key==='preload','closed operation option key required');const field=Object.getOwnPropertyDescriptor(options,key);need(field&&field.enumerable&&Object.hasOwn(field,'value'),'own operation options without getters required');values[key]=field.value;}}
 const {observe,limits,preload}=values;need(observe===undefined||typeof observe==='function'&&!types.isProxy(observe)&&!types.isAsyncFunction(observe),'ordinary synchronous source DATA observer required');const bounds={paths:Infinity,bytes:Infinity};
 if(limits!==undefined){need(limits&&typeof limits==='object'&&!types.isProxy(limits)&&[Object.prototype,null].includes(Object.getPrototypeOf(limits)),'ordinary explicit source-operation buckets required');const keys=Reflect.ownKeys(limits);need(keys.length<=2,'closed source-operation bucket count required');for(const key of keys){need(key==='paths'||key==='bytes','known explicit source-operation bucket required');const field=Object.getOwnPropertyDescriptor(limits,key);need(field&&field.enumerable&&Object.hasOwn(field,'value')&&Number.isSafeInteger(field.value)&&field.value>=0,'finite own caller-selected original source bucket without getters required');bounds[key]=field.value;}}
 return {observe,bounds,preload};
}
function operationSelectedBody(root,run,options=undefined){
 let initialized;try{const {observe,bounds,preload}=operationOptions(options);need(typeof run==='function'&&!types.isProxy(run)&&!types.isAsyncFunction(run),'ordinary synchronous source operation required');const spelling=resolve(root);root=fs.realpathSync(spelling);if(preload!==undefined)preloadSelectedSourceIndexInputs(root,preload);let nesting=0;for(let outer=ACTIVE;outer;outer=outer.parent)need(++nesting<256,'bounded original source operation nesting');initialized={root,observe,observing:false,limits:bounds,spellings:new Map([[spelling,stamp(fs.lstatSync(spelling,{bigint:true}))],[root,stamp(fs.lstatSync(root,{bigint:true}))]]),records:new Map(),bytes:0,failed:false,primary:undefined,git:captureSelectedSourceGitEnvelope(root),identity:stamp(fs.lstatSync(root,{bigint:true})),parent:ACTIVE};}
 catch(error){for(let outer=ACTIVE;outer;outer=outer.parent)if(!outer.failed){outer.failed=true;outer.primary=error;}throw error;}
 const frame=initialized;ACTIVE=frame;let result,primary,failed=false;
 try{result=run();need(!types.isPromise(result)&&!types.isProxy(result)&&!(result!==null&&(typeof result==='object'||typeof result==='function')&&Reflect.has(result,'then')),'source operation must complete synchronously');}catch(error){failed=true;primary=error;}
 finally{ACTIVE=frame.parent;}
 if(frame.failed&&!failed){failed=true;primary=frame.primary;}
 const checks=[()=>need(equal(stamp(fs.lstatSync(root,{bigint:true})),frame.identity),'original operation root identity/time changed'),()=>verifySelectedSourceGitEnvelope(root,frame.git),...[...frame.spellings].map(([spelling,identity])=>()=>need(fs.realpathSync(spelling)===root&&equal(stamp(fs.lstatSync(spelling,{bigint:true})),identity),'original source root spelling/alias changed')),...[...frame.records].map(([name,row])=>()=>checkRecord(root,name,row))];
 for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}}
 frame.records.clear();frame.spellings.clear();if(failed){for(let outer=ACTIVE;outer;outer=outer.parent)if(outer.root===root&&!outer.failed){outer.failed=true;outer.primary=primary;}throw primary;}return result;
}

// The owned index image outlives the complete source frame and its closers.
// No original reader/delegation is silently enrolled in this successor.
function selectedIngress(root,run){try{return withSelectedSourceIndexImage(root,run);}catch(error){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}}
export function readSelectedTrackedSourceBytes(root,name,options=undefined){return selectedIngress(root,()=>readSelectedBody(root,name,options));}
export function withSelectedTrackedSourceOperation(root,run,options=undefined){
 try{operationOptions(options);need(typeof run==='function'&&!types.isProxy(run)&&!types.isAsyncFunction(run),'ordinary synchronous source operation required');}catch(error){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}
 return selectedIngress(root,()=>operationSelectedBody(root,run,options));
}
