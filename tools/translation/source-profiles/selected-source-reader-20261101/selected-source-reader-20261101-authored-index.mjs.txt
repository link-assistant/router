// Invocation-owned complete Git index DATA transport. SOURCE ONLY / UNRUN.
// Native Git validates and decodes exact copied index images. The scanner only
// locates the split-link dependency; it never issues source/type/row authority.
import fs from 'node:fs';
import {resolve,join,dirname,isAbsolute,relative,sep} from 'node:path';
import {tmpdir,homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {types} from 'node:util';
import {repositoryRustLayout} from './repository-layout.mjs';
import {captureSelectedSourceGitEnvelope,verifySelectedSourceGitEnvelope} from './selected-source-reader-20261101-metadata.mjs';
let ACTIVE=null;const CHUNK=65536,HANDLES=new WeakMap();
const need=(yes,message)=>{if(!yes)throw TypeError('Selected source owned index DATA: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function own(error,key){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,key);return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function close(run,checks){let value,primary,failed=false;try{value=run();}catch(error){failed=true;primary=error;}for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return value;}
function identity(stat,full=true){need(typeof stat.ino==='bigint'&&typeof stat.mtimeNs==='bigint'&&typeof stat.ctimeNs==='bigint','precise index identity/time required');return (full?[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs]:[stat.dev,stat.ino,stat.mode,stat.uid,stat.gid]).map(String);}
function lstat(file){try{return fs.lstatSync(file,{bigint:true});}catch(error){if(own(error,'code')==='ENOENT')return null;throw error;}}
function flags(){if(process.platform!=='win32')need(Number.isInteger(fs.constants.O_NOFOLLOW)&&Number.isInteger(fs.constants.O_NONBLOCK),'POSIX no-follow/nonblocking index support required');return fs.constants.O_RDONLY|(Number.isInteger(fs.constants.O_NOFOLLOW)?fs.constants.O_NOFOLLOW:0)|(Number.isInteger(fs.constants.O_NONBLOCK)?fs.constants.O_NONBLOCK:0);}
function one(value){return value.endsWith('\n')?value.slice(0,-1):value;}
function environment(){return {...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_PAGER:'cat'};}
function git(root,args,{env=environment(),literal=true,maximum=16*1024*1024,timeout=30000,encoding='utf8'}={}){return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,...(literal?['--literal-pathspecs']:[]),'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','gc.auto=0','-c','maintenance.auto=false',...args],{env,...(encoding===null?{}:{encoding}),...(timeout===null?{}:{timeout}),...(maximum===null?{}:{maxBuffer:maximum})});}
function actualPath(root,name){const value=one(git(root,['rev-parse','--git-path',name]));need(value&&!value.includes('\0'),'actual Git metadata path required');return isAbsolute(value)?resolve(value):resolve(root,value);}
const below=(parent,file)=>{const name=relative(parent,file);return name===''||name!=='..'&&!name.startsWith('..'+sep)&&!isAbsolute(name);};
function namespace(state,file){
 file=resolve(file);if(state.namespace.has(file))return;const stat=lstat(file),full=state.anchors.some(root=>below(root,file));
 const value={path:file,full,identity:stat?identity(stat,full):null,link:stat?.isSymbolicLink()?fs.readlinkSync(file):null};state.namespace.set(file,value);
 if(value.link!==null)namespace(state,resolve(dirname(file),value.link));const parent=dirname(file);if(parent!==file)namespace(state,parent);
}
function verifyNamespace(state){const checks=[];for(const row of state.namespace.values())checks.push(()=>{const stat=lstat(row.path);need(same(stat?identity(stat,row.full):null,row.identity)&&(stat?.isSymbolicLink()?fs.readlinkSync(row.path):null)===row.link,'original index namespace changed: '+row.path);});return close(()=>{},checks);}
function known(state,file){const stat=fs.lstatSync(file,{bigint:true});need(stat.isFile()&&!stat.isSymbolicLink(),'ordinary own index image required');const value={path:file,id:identity(stat,false),stamp:identity(stat)};state.files.set(file,value);return value;}
function checkOwn(state){
 if(!state.directory)return;need(same(identity(fs.lstatSync(state.directory,{bigint:true}),false),state.directoryId),'owned index directory replaced');
 const expected=[...state.files.keys()].map(file=>file.slice(state.directory.length+1)).sort(),actual=fs.readdirSync(state.directory).sort();need(same(expected,actual),'unknown index image paths retained at '+state.directory);
 for(const row of state.files.values()){const stat=fs.lstatSync(row.path,{bigint:true});need(stat.isFile()&&!stat.isSymbolicLink()&&same(identity(stat,false),row.id),'owned index image replaced: '+row.path);if(!row.nativeMutable)need(same(identity(stat),row.stamp),'immutable index preimage changed: '+row.path);else equalImages(row.path,row.preimage);}
}
function fill(fd,buffer,size,at){let count=0;while(count<size){const read=fs.readSync(fd,buffer,count,size-count,at+count);if(!read)break;count+=read;}return count;}
function equalImages(left,right){return opened(left,a=>opened(right,b=>{const beforeA=fs.fstatSync(a,{bigint:true}),beforeB=fs.fstatSync(b,{bigint:true});need(beforeA.size===beforeB.size&&beforeA.size<=BigInt(Number.MAX_SAFE_INTEGER),'whole own shared image sizes differ');const size=Number(beforeA.size),x=Buffer.alloc(CHUNK),y=Buffer.alloc(CHUNK);let at=0;for(;;){const maximum=Math.min(CHUNK,size-at+1),n=fill(a,x,maximum,at),m=fill(b,y,maximum,at);need(n===m&&x.subarray(0,n).equals(y.subarray(0,m)),'whole own shared image bytes differ');if(!n)break;at+=n;need(at<=size,'own shared image grew');}need(at===size&&same(identity(beforeA),identity(fs.fstatSync(a,{bigint:true})))&&same(identity(beforeB),identity(fs.fstatSync(b,{bigint:true}))),'own shared images changed while comparing');}));}
function opened(file,run){const fd=fs.openSync(file,flags());return close(()=>run(fd),[()=>fs.closeSync(fd)]);}
function writeAll(fd,bytes,at){let count=0;while(count<bytes.length){const written=fs.writeSync(fd,bytes,count,bytes.length-count,at+count);need(written>0,'complete own index write required');count+=written;}}
function copySource(state,source,name){
 namespace(state,source);const before=lstat(source),destination=join(state.directory,name);
 if(!before)return null;
 const canonical=fs.realpathSync(source);namespace(state,canonical);const original=fs.lstatSync(canonical,{bigint:true});need(original.isFile()&&!original.isSymbolicLink()&&original.size>=0n&&original.size<=BigInt(Number.MAX_SAFE_INTEGER),'ordinary finite original index image required');
 const fd=fs.openSync(canonical,flags());let output=null,row=null;
 return close(()=>{
  need(same(identity(original),identity(fs.fstatSync(fd,{bigint:true}))),'index replaced before copy');output=fs.openSync(destination,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL,0o600);known(state,destination);
  const buffer=Buffer.alloc(CHUNK);let at=0;for(;;){const count=fs.readSync(fd,buffer,0,Math.min(CHUNK,Number(original.size)-at+1),at);if(!count)break;need(at+count<=Number(original.size),'original index grew');writeAll(output,buffer.subarray(0,count),at);at+=count;}need(BigInt(at)===original.size,'whole original index bytes required');
  known(state,destination);row={source,canonical,destination,identity:identity(original),size:at};state.originals.push(row);return row;
 },[()=>need(same(identity(original),identity(fs.fstatSync(fd,{bigint:true})))&&same(identity(original),identity(fs.lstatSync(canonical,{bigint:true}))),'original index changed during copy'),()=>verifyNamespace(state),()=>fs.closeSync(fd),()=>{if(output!==null)fs.closeSync(output);}]);
}
function compareOriginal(state,row){
 return opened(row.canonical,left=>opened(row.destination,right=>{
  need(same(identity(fs.fstatSync(left,{bigint:true})),row.identity),'original index identity/time changed');const a=Buffer.alloc(CHUNK),b=Buffer.alloc(CHUNK);let at=0;
  for(;;){const n=fill(left,a,Math.min(CHUNK,row.size-at+1),at),m=fill(right,b,Math.min(CHUNK,row.size-at+1),at);need(n===m&&a.subarray(0,n).equals(b.subarray(0,m)),'complete original index bytes differ');if(!n)break;at+=n;need(at<=row.size,'original/preimage grew');}
  need(at===row.size&&same(identity(fs.fstatSync(left,{bigint:true})),row.identity)&&same(identity(fs.lstatSync(row.canonical,{bigint:true})),row.identity),'complete original index closing changed');
 }));
}
function duplicate(state,source,name){const file=join(state.directory,name),input=fs.openSync(source,flags());let output=null;return close(()=>{output=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL,0o600);known(state,file);const buffer=Buffer.alloc(CHUNK);let at=0;for(;;){const count=fs.readSync(input,buffer,0,CHUNK,at);if(!count)break;writeAll(output,buffer.subarray(0,count),at);at+=count;}known(state,file);return file;},[()=>fs.closeSync(input),()=>{if(output!==null)fs.closeSync(output);}]);}

// Git index-format v2/v3/v4 + actual object format. Unknown extension payloads
// are skipped byte-exactly and remain in the copy for genuine Git validation.
function linkDependency(file,width){return opened(file,fd=>{
 const before=fs.fstatSync(fd,{bigint:true});need(before.size<=BigInt(Number.MAX_SAFE_INTEGER),'finite index image size required');const size=Number(before.size),end=size-width,cache=Buffer.alloc(CHUNK);let start=-1,length=0;
 const byte=at=>{need(Number.isSafeInteger(at)&&at>=0&&at<end,'complete index layout required');if(at<start||at>=start+length){start=at;length=fs.readSync(fd,cache,0,Math.min(CHUNK,end-at),at);need(length>0,'index layout truncated');}return cache[at-start];};
 const word=at=>((byte(at)*0x1000000)+(byte(at+1)<<16)+(byte(at+2)<<8)+byte(at+3));
 need(size>=12+width&&word(0)===0x44495243,'genuine Git index header required');const version=word(4),count=word(8);need(version===2||version===3||version===4,'OPEN: future Git index layout not yet transported');let at=12;
 for(let index=0;index<count;index++){
  const entry=at,flagAt=at+40+width,extended=Boolean(byte(flagAt)&0x40);at=flagAt+2+(extended?2:0);need(at<end,'complete index flags/name required');
  if(version===4){while(byte(at++)&0x80){} }
  while(byte(at++)!==0){}if(version!==4)at=entry+Math.ceil((at-entry)/8)*8;
 }
 let link=null,hasLink=false;
 while(at<end){need(at+8<=end,'complete index extension header required');const signature=String.fromCharCode(byte(at),byte(at+1),byte(at+2),byte(at+3)),size=word(at+4);at+=8;need(at+size<=end,'complete index extension payload required');if(signature==='link'){need(!hasLink&&size>=width,'one complete split-index dependency required');hasLink=true;let hex='';for(let index=0;index<width;index++)hex+=byte(at+index).toString(16).padStart(2,'0');if(!/^0+$/u.test(hex))link=hex;}at+=size;}
 need(at===end&&same(identity(fs.fstatSync(fd,{bigint:true})),identity(before)),'index layout changed while locating dependency');return {version,link,hasLink};
});}
function acquire(state){
 namespace(state,state.root);namespace(state,join(state.root,'.git'));if(!lstat(join(state.root,'.git'))){state.present=false;state.envelope=captureSelectedSourceGitEnvelope(state.root);return;}
 state.present=true;state.gitdir=one(git(state.root,['rev-parse','--absolute-git-dir']));need(isAbsolute(state.gitdir),'absolute actual Git directory required');state.anchors.push(state.gitdir);namespace(state,state.gitdir);namespace(state,join(state.gitdir,'commondir'));namespace(state,join(state.gitdir,'gitdir'));namespace(state,join(state.gitdir,'config.worktree'));
 const common=one(git(state.root,['rev-parse','--git-common-dir']));state.common=isAbsolute(common)?resolve(common):resolve(state.root,common);state.anchors.push(state.common);namespace(state,state.common);namespace(state,join(state.common,'config'));namespace(state,join(state.common,'packed-refs'));namespace(state,actualPath(state.root,'info/sparse-checkout'));
 state.index=actualPath(state.root,'index');namespace(state,state.index);state.shared=null;
 const format=one(git(state.root,['rev-parse','--show-object-format']));need(format==='sha1'||format==='sha256','OPEN: future Git object format not yet transported');const width=format==='sha1'?20:32;
 let parent=null;for(const candidate of [tmpdir(),...(process.platform==='win32'?[]:['/tmp']),homedir(),process.cwd()]){let file;try{file=fs.realpathSync(candidate);}catch(error){if(['ENOENT','EACCES'].includes(own(error,'code')))continue;throw error;}if(!state.anchors.some(anchor=>below(anchor,file))&&(!state.namespace.has(file)||!state.namespace.get(file).full)){parent=file;break;}}need(parent,'OPEN: no independent existing scratch parent for exact index namespace');
 namespace(state,parent);state.directory=fs.mkdtempSync(join(parent,'router-selected-index-'));state.directoryId=identity(fs.lstatSync(state.directory,{bigint:true}),false);
 const index=copySource(state,state.index,'original-index');
 if(index){const dependency=linkDependency(index.destination,width);state.working=duplicate(state,index.destination,'index');
  if(dependency.link){const name='sharedindex.'+dependency.link,primary=join(state.gitdir,name),fallback=join(dirname(state.index),name);namespace(state,primary);state.shared=lstat(primary)?primary:fallback;namespace(state,state.shared);const shared=copySource(state,state.shared,'original-shared');need(shared,'exact original shared index required');const working=duplicate(state,shared.destination,name);state.files.get(working).nativeMutable=true;state.files.get(working).preimage=shared.destination;}
  if(dependency.hasLink){
   const head=copySource(state,actualPath(state.root,'HEAD'),'original-HEAD');need(head,'actual original Git HEAD bytes required');duplicate(state,head.destination,'HEAD');
   checkOwn(state);verifyNamespace(state);
   // Fixed DATA-only flattening. Hooks/fsmonitor/maintenance/lazy fetch are
   // disabled. Original common config/object/ref source remains available;
   // repo_read_index uses the OWN gitdir for the copied split dependency.
   const childEnv={...environment(),GIT_DIR:state.directory,GIT_COMMON_DIR:state.common,GIT_WORK_TREE:state.root,GIT_INDEX_FILE:state.working};
   git(state.root,['update-index','--no-split-index'],{env:childEnv});
   known(state,state.working);need(!linkDependency(state.working,width).hasLink,'genuine private flatten must remove entire split-link extension');checkOwn(state);verifyNamespace(state);
   // The flat image no longer reads this working shared copy. Drop only its
   // actual known bytes/ID now; keep the immutable source preimage for closing.
   for(const [file,row] of state.files)if(row.nativeMutable){equalImages(file,row.preimage);need(same(identity(fs.lstatSync(file,{bigint:true}),false),row.id),'own shared image replaced');fs.unlinkSync(file);state.files.delete(file);}
  }
 }else state.working=join(state.directory,'index');
 state.flatId=lstat(state.working)?identity(fs.lstatSync(state.working,{bigint:true})):null;
 state.envelope=captureSelectedSourceGitEnvelope(state.root);
}
function verify(state){
 const previous=state.checking;state.checking=true;
 try{return close(()=>{},[()=>checkOwn(state),...state.originals.map(row=>()=>compareOriginal(state,row)),()=>verifyNamespace(state),()=>{if(state.envelope)verifySelectedSourceGitEnvelope(state.root,state.envelope);},()=>verifyRows(state),()=>verifyListings(state),...[...state.children.values()].map(handle=>()=>verifySelectedSourceIndexImage(handle)),()=>checkOwn(state)]);}
 finally{state.checking=previous;}
}

function cleanupOwn(state){
 if(!state.directory)return;checkOwn(state);const checks=[];
 for(const row of state.files.values())checks.push(()=>{const stat=fs.lstatSync(row.path,{bigint:true});need(same(identity(stat,false),row.id),'unknown/replaced own file retained: '+row.path);fs.unlinkSync(row.path);state.files.delete(row.path);});
 checks.push(()=>{need(same(identity(fs.lstatSync(state.directory,{bigint:true}),false),state.directoryId)&&fs.readdirSync(state.directory).length===0,'unknown own index directory contents retained: '+state.directory);fs.rmdirSync(state.directory);state.cleaned=true;});return close(()=>{},checks);
}
function cleanup(state){return close(()=>{},[...[...state.children.values()].map(handle=>()=>closeSelectedSourceIndexImage(handle)),()=>cleanupOwn(state)]);}

function stateOf(handle){const state=HANDLES.get(handle);need(state&&!state.closed,'actual live private index-image handle required');return state;}
function poison(state,primary){for(let frame=state;frame;frame=frame.parent)if(frame.root===state.root&&!frame.failed){frame.failed=true;frame.primary=primary;}}
function activated(state,run,closing=false){
 const previous=ACTIVE;
 const guards=()=>{need(!state.closed,'closed private index image refused');if(state.failed&&!closing)throw state.primary;for(let frame=previous;frame;frame=frame.parent)need(frame.root!==state.root||frame===state,'incompatible same-root index handles cannot overlap');need(fs.realpathSync(state.root)===state.root&&fs.realpathSync(state.spelling)===state.root,'original index root spelling changed');};
 const invoke=()=>{ACTIVE=state;const result=run();if(state.failed&&!closing)throw state.primary;need(!types.isPromise(result)&&!types.isProxy(result)&&!(result!==null&&['object','function'].includes(typeof result)&&Reflect.has(result,'then')),'ordinary synchronous index DATA result required');return result;};
 try{
  // Closing guards may fail, but all actual source/own-image closers still run.
  if(closing){let value;close(guards,[()=>{value=invoke();}]);return value;}
  guards();return invoke();
 }catch(error){poison(state,error);for(let frame=previous;frame;frame=frame.parent)if(frame.root===state.root&&!frame.failed){frame.failed=true;frame.primary=error;}throw error;}
 finally{ACTIVE=previous;}
}

export function acquireSelectedSourceIndexImage(root){
 let spelling,canonical;try{spelling=resolve(root);canonical=fs.realpathSync(spelling);}catch(error){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}const handle=Object.freeze({schema:'private-selected-index-data-image-v1',sourceAuthority:false,semanticAuthority:false}),state={root:canonical,spelling,parent:null,anchors:[canonical],namespace:new Map(),originals:[],files:new Map(),rows:new Map(),listings:new Map(),children:new Map(),directory:null,failed:false,primary:undefined,closed:false,checking:false,cleaned:false,recoveryPaths:null};
 HANDLES.set(handle,state);let failed=false,primary;
 try{activated(state,()=>{namespace(state,spelling);acquire(state);});return handle;}catch(error){failed=true;primary=error;}
 try{activated(state,()=>close(()=>{},[()=>verify(state),()=>cleanup(state)]),true);}catch(error){if(!failed){failed=true;primary=error;}}
 state.closed=true;reportRecovery(state,'acquire-failed');throw primary;
}
export function withSelectedSourceIndexHandle(handle,run){
 const state=stateOf(handle);return activated(state,()=>{need(typeof run==='function'&&!types.isProxy(run)&&!types.isAsyncFunction(run),'ordinary synchronous index DATA callback required');return run();});
}
export function verifySelectedSourceIndexImage(handle){const state=stateOf(handle);let primary,failed=state.failed;if(failed)primary=state.primary;try{activated(state,()=>verify(state),true);}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
export function closeSelectedSourceIndexImage(handle){
 const state=stateOf(handle);let primary,failed=state.failed;if(failed)primary=state.primary;
 try{activated(state,()=>close(()=>{},[()=>verify(state),()=>cleanup(state)]),true);}catch(error){if(!failed){failed=true;primary=error;}}
 finally{state.recoveryPaths=collectRecovery(state);state.closed=true;state.originals.length=0;state.rows.clear();state.namespace.clear();state.files.clear();state.listings.clear();state.children.clear();state.envelope=null;}
 if(failed)throw primary;
}
function collectRecovery(state){const paths=state.directory&&!state.cleaned?[state.directory]:[];for(const handle of state.children.values()){const child=HANDLES.get(handle);paths.push(...(child.recoveryPaths??collectRecovery(child)));}return [...new Set(paths)];}
function reportRecovery(state,phase){
 // Internal synchronous wrappers cannot return their handle on failure. Emit
 // bounded inert recovery DATA instead of mutating ANY original thrown value.
 // This is diagnostic output, never a cleanup/source/semantic permission.
 if(state.recoveryReported)return;state.recoveryReported=true;
 try{
  const available=state.recoveryPaths??collectRecovery(state);if(!available.length)return;
  const maximum=512*1024,reserve=512,paths=[];let bytes=0,omitted=0;
  for(const path of available){
   if(path.length>maximum-reserve){omitted++;continue;}
   const encoded=JSON.stringify(path),size=Buffer.byteLength(encoded,'utf8')+1;
   if(bytes+size>maximum-reserve){omitted++;continue;}bytes+=size;paths.push(path);
  }
  const record={schema:'selected-source-reader-recovery-data-v1',phase,recoveryPaths:paths,omittedPaths:omitted,complete:omitted===0,sourceAuthority:false,semanticAuthority:false,cleanupAllowed:false};
  const output=Buffer.from(JSON.stringify(record)+'\n');if(output.length>maximum)return;
  let at=0;while(at<output.length){const count=fs.writeSync(2,output,at,output.length-at);if(!Number.isInteger(count)||count<=0||count>output.length-at)return;at+=count;}
 }catch{
  // stderr failure cannot replace a falsy, frozen, primitive or other primary.
 }
}
export function inspectSelectedSourceIndexImage(handle){
 const state=HANDLES.get(handle);need(state,'actual privately issued index-image handle required');return Object.freeze({root:state.root,temporaryDirectory:state.directory,closed:state.closed,failed:state.failed,recoveryPaths:Object.freeze(state.recoveryPaths??collectRecovery(state)),sourceAuthority:false,semanticAuthority:false,cleanupAllowed:false});
}
export function withSelectedSourceIndexImage(root,run){
 try{
  need(typeof run==='function'&&!types.isProxy(run)&&!types.isAsyncFunction(run),'ordinary synchronous index DATA callback required');const canonical=fs.realpathSync(resolve(root));
  for(let frame=ACTIVE;frame;frame=frame.parent)if(frame.root===canonical)return activated(frame,run);
  const handle=acquireSelectedSourceIndexImage(root);
  try{return close(()=>withSelectedSourceIndexHandle(handle,run),[()=>closeSelectedSourceIndexImage(handle)]);}
  catch(error){reportRecovery(HANDLES.get(handle),'scope-failed');throw error;}
 }catch(error){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}
}
function current(root){
 try{const canonical=fs.realpathSync(resolve(root));for(let frame=ACTIVE;frame;frame=frame.parent)if(frame.root===canonical){if(frame.failed&&!frame.checking)throw frame.primary;return frame;}throw TypeError('actual active selected-index DATA frame required');}
 catch(error){for(let frame=ACTIVE;frame;frame=frame.parent)if(!frame.failed){frame.failed=true;frame.primary=error;}throw error;}
}

export function selectedSourceIndexPaths(root){const state=current(root);return state.present?{index:state.index,shared:state.shared}:null;}
function decodeRows(raw,names){
 const result=new Map(names.map(name=>[name,{stage:'',flags:''}])),seen=new Set();need(raw===''||raw.endsWith('\0'),'complete actual Git combined row delimiters required');
 for(const value of raw.split('\0').filter(Boolean)){
  const match=/^([A-Za-z?]) ([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t([\s\S]*)$/u.exec(value);need(match&&result.has(match[5])&&!seen.has(match[5]+'\0'+match[4]),'complete exact selected Git stage/tag rows required');seen.add(match[5]+'\0'+match[4]);
  const row=result.get(match[5]);row.stage+=match[2]+' '+match[3]+' '+match[4]+'\t'+match[5]+'\0';row.flags+=match[1]+' '+match[5]+'\0';
 }
 return result;
}
function batchQuery(state,names){
 const exact=names.flatMap(name=>[':(top,literal)'+name,':(top,literal,exclude)'+name+'/']),maximum=names.reduce((sum,name)=>sum+4*(Buffer.byteLength(name,'utf8')+132),1),env={...environment(),GIT_INDEX_FILE:state.working};
 checkOwn(state);verifyNamespace(state);need(same(lstat(state.working)?identity(fs.lstatSync(state.working,{bigint:true})):null,state.flatId),'private flattened index changed');
 return close(()=>decodeRows(git(state.root,['ls-files','--stage','-v','-z','--',...exact],{env,literal:false,maximum}),names),[()=>checkOwn(state),()=>need(same(lstat(state.working)?identity(fs.lstatSync(state.working,{bigint:true})):null,state.flatId),'private flat index changed during actual row decode'),()=>verifyNamespace(state)]);
}
function namesData(names){
 need(Array.isArray(names)&&!types.isProxy(names)&&Object.getPrototypeOf(names)===Array.prototype,'ordinary selected metadata preload array required');const descriptor=Object.getOwnPropertyDescriptor(names,'length'),count=descriptor.value,result=[];
 need(Reflect.ownKeys(names).length===count+1,'dense selected preload without incidental fields required');for(let at=0;at<count;at++){const field=Object.getOwnPropertyDescriptor(names,String(at));need(field&&Object.hasOwn(field,'value')&&typeof field.value==='string'&&field.value&&Buffer.byteLength(field.value)<=4096&&!/[\\:\0]/u.test(field.value)&&field.value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'own ordinary relative selected metadata names required');result.push(field.value);}return [...new Set(result)].sort();
}
function batches(state,names,consume){
 // Geometry, not a total selection bound. Conservative byte/UTF16 packing;
 // an individually large original path gets its own native argv attempt.
 // Include the real root and fixed command/config overhead in both counters.
 const baseUnits=2*state.root.length+2048,baseBytes=Buffer.byteLength(state.root)+2048;let batch=[],units=baseUnits,bytes=baseBytes,selected=new Set();
 const flush=()=>{if(batch.length)consume(batch);batch=[];selected=new Set();units=baseUnits;bytes=baseBytes;};
 for(const name of names){const args=[':(top,literal)'+name,':(top,literal,exclude)'+name+'/'],u=args.reduce((sum,value)=>sum+2*value.length+4,0),b=args.reduce((sum,value)=>sum+Buffer.byteLength(value)+1,0),parts=name.split('/');let prefix='',overlap=false;
  for(const part of parts.slice(0,-1)){prefix=prefix?prefix+'/'+part:part;if(selected.has(prefix))overlap=true;}
  if(batch.length&&(units+u>30000||bytes+b>24000||overlap))flush();batch.push(name);selected.add(name);units+=u;bytes+=b;
 }flush();
}
export function preloadSelectedSourceIndexInputs(root,names){
 const state=current(root);try{const selected=namesData(names).filter(name=>!state.rows.has(name));if(!state.present){for(const name of selected)state.rows.set(name,null);return;}
  batches(state,selected,batch=>{for(const [name,row] of batchQuery(state,batch))state.rows.set(name,row);});
 }catch(error){poison(state,error);throw error;}
}
function verifyRows(state){
 if(!state.present){need([...state.rows.values()].every(row=>row===null),'absent Git row domain changed');return;}
 const checks=[];batches(state,[...state.rows.keys()].sort(),batch=>checks.push(()=>{for(const [name,row] of batchQuery(state,batch))need(same(row,state.rows.get(name)),'complete selected Git rows changed at closing');}));return close(()=>{},checks);
}
export function selectedSourceIndexRows(root,name){const state=current(root);preloadSelectedSourceIndexInputs(root,[name]);const row=state.rows.get(name);return row===null?null:{...row};}

// CLOSED original query forms, not arbitrary args/prefix/env dispatch. Omitted
// native maxBuffer/timeout remain omitted rather than becoming wrapper16Mi.
function listingSpec(cwd,kind){
 const common={encoding:null,literal:true,maximum:null,timeout:null};
 if(kind==='rust-paths'||kind==='owned-rust-paths')return {args:['ls-files','-z','--','*.rs'],options:{...common,literal:false,...(kind==='owned-rust-paths'?{maximum:16*1024*1024,timeout:30000}:{})},text:true};
 if(kind==='cargo-paths'||kind==='owned-cargo-paths')return {args:['ls-files','-z','--',...repositoryRustLayout(cwd).cargoInputs],options:{...common,...(kind==='owned-cargo-paths'?{maximum:16*1024*1024,timeout:30000}:{})},text:true};
 const input={
  'compiler-stage':['--stage','tools/translation/'],
  'compiler-others':['--others','tools/translation/'],
  'profile-stage':['--stage','tools/translation/source-profiles/'],
  'profile-others':['--others','tools/translation/source-profiles/']
 }[kind];need(input,'one fixed original source-input listing kind required');
 return {args:['ls-files',input[0],'-z','--',input[1]],options:{...common,maximum:8*1024*1024,timeout:10000},text:false};
}
function runListing(state,cwd,spec){
 checkOwn(state);verifyNamespace(state);need(same(lstat(state.working)?identity(fs.lstatSync(state.working,{bigint:true})):null,state.flatId),'private flat index changed before original query');
 return close(()=>git(cwd,spec.args,{...spec.options,env:{...environment(),GIT_INDEX_FILE:state.working}}),[()=>checkOwn(state),()=>verifyNamespace(state),()=>need(same(lstat(state.working)?identity(fs.lstatSync(state.working,{bigint:true})):null,state.flatId),'private flat index changed after original query')]);
}
function actualListing(state,cwd,kind){
 namespace(state,cwd);const spec=listingSpec(cwd,kind),raw=runListing(state,cwd,spec);need(Buffer.isBuffer(raw),'complete original raw Git listing required');const key=cwd+'\0'+kind,previous=state.listings.get(key);
 if(previous)need(same(spec,previous.spec)&&raw.equals(previous.raw),'complete original listing changed during operation');else state.listings.set(key,{cwd,kind,spec,raw:Buffer.from(raw)});
 return spec.text?raw.toString('utf8'):Buffer.from(raw);
}
function fixedListing(root,kind){
 const owner=current(root),cwd=resolve(root);try{
  if(owner.present)return actualListing(owner,cwd,kind);
  // Only an EXPLICIT original Git listing performs native ancestor discovery.
  // Ordinary/no-Git byte reads and empty operations acquire no such dependency.
  const top=fs.realpathSync(one(git(cwd,['rev-parse','--show-toplevel'])));need(top!==owner.root&&below(top,fs.realpathSync(cwd)),'actual inherited Git ancestor required');let handle=owner.children.get(top);
  if(!handle){handle=acquireSelectedSourceIndexImage(top);owner.children.set(top,handle);}
  return withSelectedSourceIndexHandle(handle,()=>actualListing(stateOf(handle),cwd,kind));
 }catch(error){poison(owner,error);throw error;}
}
function verifyListings(state){
 const checks=[];for(const original of state.listings.values())checks.push(()=>{const spec=listingSpec(original.cwd,original.kind);need(same(spec,original.spec)&&runListing(state,original.cwd,spec).equals(original.raw),'complete original listing/cwd selection changed at closing');});return close(()=>{},checks);
}
export function readSelectedSourceRustPaths(root){return fixedListing(root,'rust-paths');}
export function readSelectedSourceOwnedRustPaths(root){return fixedListing(root,'owned-rust-paths');}
export function readSelectedSourceCargoPaths(root){return fixedListing(root,'cargo-paths');}
export function readSelectedSourceOwnedCargoPaths(root){return fixedListing(root,'owned-cargo-paths');}
export function readSelectedSourceInputListing(root,kind){const state=current(root);try{need(['compiler-stage','compiler-others','profile-stage','profile-others'].includes(kind),'one fixed original compiler/profile listing required');return fixedListing(root,kind);}catch(error){poison(state,error);throw error;}}
