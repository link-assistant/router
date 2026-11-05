// Git metadata DATA only. No corpus/type/owner issuer. SOURCE ONLY / UNRUN.
// No global Rust census: actual selected rows and original Git control-file
// identities are joined by the reader's private invocation-local frame.
import fs from 'node:fs';
import {resolve,join,dirname,isAbsolute,relative,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {types} from 'node:util';
import {selectedSourceIndexPaths,selectedSourceIndexRows} from './selected-source-reader-20261101-index.mjs';
const need=(yes,message)=>{if(!yes)throw TypeError('Selected source Git DATA: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function ownError(error,key){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,key);return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function identity(stat,complete=true){
 need(typeof stat.dev==='bigint'&&typeof stat.ino==='bigint'&&typeof stat.mtimeNs==='bigint'&&typeof stat.ctimeNs==='bigint','precise Git namespace identity/time support required');
 return (complete?[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs]:[stat.dev,stat.ino,stat.mode]).map(String);
}
function git(root,args,maxBytes=16*1024*1024,literal=true){
 return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,...(literal?['--literal-pathspecs']:[]),'-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{
  encoding:'utf8',timeout:30000,maxBuffer:maxBytes,
  env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_PAGER:'cat'}
 });
}
function one(value,empty=false){
 // Git's line terminator is removed, never arbitrary pathname whitespace.
 const text=value.endsWith('\n')?value.slice(0,-1):value;
 need((empty||text.length>0)&&!text.includes('\0'),'one exact Git metadata pathname/reference required');return text;
}
function gitPath(root,name){const value=one(git(root,['rev-parse','--git-path',name]));return isAbsolute(value)?resolve(value):resolve(root,value);}
function optional(root,args){try{return one(git(root,args),true);}catch(error){if(ownError(error,'status')===1)return null;throw error;}}
function head(root){
 const value=optional(root,['rev-parse','--verify','--quiet','HEAD']);
 if(value!==null){need(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value),'exact original HEAD identity required');return value;}
 const ref=optional(root,['symbolic-ref','--quiet','HEAD']);need(ref!==null,'original unborn HEAD reference required');return 'unborn:'+ref;
}
const below=(parent,file)=>{const path=relative(parent,file);return path===''||path!=='..'&&!path.startsWith('..'+sep)&&!isAbsolute(path);};
function lstat(file){try{return fs.lstatSync(file,{bigint:true});}catch(error){if(ownError(error,'code')==='ENOENT')return null;throw error;}}
function row(file,complete){const stat=lstat(file);if(!stat)return {path:file,identity:null};return {path:file,identity:identity(stat,complete),link:stat.isSymbolicLink()?fs.readlinkSync(file):null};}
function refName(value){need(value==='HEAD'||value.startsWith('refs/')&&!value.split('/').some(part=>!part||part==='.'||part==='..')&&!/[\0\r\n\\]/u.test(value),'actual Git symbolic reference path required');return value;}

export function captureSelectedSourceGitEnvelope(root){
 root=resolve(root);const records=new Map(),anchors=[root];let result,primary,failed=false;
 const add=file=>{
  file=resolve(file);if(records.has(file))return;
  const complete=anchors.some(anchor=>below(anchor,file)),value=row(file,complete);records.set(file,value);
  if(value.link!==undefined&&value.link!==null)add(resolve(dirname(file),value.link));
  const parent=dirname(file);if(parent!==file)add(parent);
 };
 // Fence starts before the first Git discovery. Every path is acquired as soon
 // as genuinely discovered; even partial acquisition executes ALL closers.
 try{
  const marker=join(root,'.git');add(root);add(marker);
  if(records.get(marker).identity===null)result={present:false,records:[...records.values()]};
  else{
   const directory=one(git(root,['rev-parse','--absolute-git-dir']));need(isAbsolute(directory),'absolute actual Git directory required');anchors.push(resolve(directory));add(directory);
   const commonText=one(git(root,['rev-parse','--git-common-dir'])),common=isAbsolute(commonText)?resolve(commonText):resolve(root,commonText);anchors.push(common);add(common);
   const path=name=>{const file=gitPath(root,name);add(file);return file;};
   const issued=selectedSourceIndexPaths(root),index=path('index'),shared=issued?.shared??null;need(issued&&issued.index===index,'actual original index transport coordinate differs');
   if(shared)add(shared);
   for(const file of [path('HEAD'),path('packed-refs'),join(common,'packed-refs'),join(common,'config'),join(directory,'config.worktree'),join(directory,'commondir'),join(directory,'gitdir'),path('info/sparse-checkout')])add(file);
   const originalHead=head(root),refs=[],seen=new Set();let current='HEAD';
   for(;;){refName(current);need(!seen.has(current),'cyclic actual symbolic reference');seen.add(current);path(current);const next=optional(root,['symbolic-ref','--quiet','--no-recurse',current]);refs.push({name:current,next});if(next===null)break;current=next;}
   // Reftable storage may be a linked actual Git control directory. Capture
   // real target names too; never treat this as source symlink permission.
   const tables=path('reftable'),tableNames=[],pending=[tables],walked=new Set();
   while(pending.length){const file=pending.pop(),stat=lstat(file);if(!stat)continue;if(stat.isSymbolicLink()){const target=fs.realpathSync(file);add(target);pending.push(target);continue;}if(stat.isDirectory()&&!walked.has(file)){walked.add(file);const names=fs.readdirSync(file).sort();tableNames.push({path:file,names});for(const name of names){const child=join(file,name);add(child);pending.push(child);}}}
   result={present:true,directory:resolve(directory),common,index,shared,head:originalHead,refs,tableNames,records:null};
   need(head(root)===originalHead,'HEAD changed during Git envelope acquisition');
  }
 }catch(error){failed=true;primary=error;}
 for(const original of records.values())try{
  need(same(row(original.path,original.identity!==null&&original.identity.length===6),original),'Git metadata changed during acquisition/closing');
 }catch(error){if(!failed){failed=true;primary=error;}}
 if(failed)throw primary;
 result.records=[...records.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);return result;
}

export function verifySelectedSourceGitEnvelope(root,original){need(same(captureSelectedSourceGitEnvelope(root),original),'original HEAD/index/ref/control namespace changed');}

export function readSelectedSourceGitRows(root,name){
 if(!lstat(join(root,'.git')))return null;
 // Four stages are a conservative Git index maximum. No unrelated pathname
 // can contribute output under literal pathspecs. The bound scales ONLY with
 // this actual pathname and the fixed Git mode/OID/stage record grammar.
 // The image transport bounds combined batch output by these exact names.
 // A literal file pathspec also matches a tracked directory prefix. Exclude
 // its literal slash-terminated descendant prefix, so an ordinary untracked
 // file shadowing an indexed directory does not acquire an unrelated cap.
 const {stage,flags}=selectedSourceIndexRows(root,name);
 const staged=stage.split('\0').filter(Boolean),flagged=flags.split('\0').filter(Boolean),seen=new Set();need(staged.length<=4&&flagged.length<=4,'one literal Git input stage set required');
 for(const value of staged){const match=/^([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t([\s\S]*)$/u.exec(value);need(match&&match[4]===name&&!seen.has(match[3]),'complete exact literal index stage rows required');seen.add(match[3]);}
 for(const value of flagged)need(value.length>=2&&value[1]===' '&&value.slice(2)===name,'complete exact literal skip-worktree rows required');
 need((stage===''||stage.endsWith('\0'))&&(flags===''||flags.endsWith('\0')),'complete Git row delimiters required');
 return {stage,flags};
}
