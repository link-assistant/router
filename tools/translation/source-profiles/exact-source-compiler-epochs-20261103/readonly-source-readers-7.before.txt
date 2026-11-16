// Complete selected tracked bytes are fingerprints, never semantic authority.
// The caller fixes its source family and retains the original read guards.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants,lstatSync,realpathSync,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
function limits(input,bounds,fail){
  if(input===undefined)return bounds;
  if(!input||typeof input!=='object'||Object.keys(input).some(key=>!Object.hasOwn(bounds,key)))fail('unknown input limits');
  const value={...bounds,...input};
  for(const key of Object.keys(value))if(!Number.isSafeInteger(value[key])||value[key]<1||value[key]>bounds[key])fail('input limits may only narrow their finite bounds');
  return value;
}
function originalPath(root,path,prefix,fail){
  if(!path.startsWith(prefix)||path.includes('\\')||path.includes('\0')||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('tracked profile path escapes its input directory');
  let current=root;
  const parts=path.split('/');
  for(let index=0;index<parts.length;index++){
    current=join(current,parts[index]);const state=lstatSync(current);
    if(state.isSymbolicLink()||index<parts.length-1&&!state.isDirectory()||index===parts.length-1&&!state.isFile())fail('profile path is not original regular-file input: '+path);
  }
  if(realpathSync(current)!==current)fail('profile path has an unknown real path: '+path);
  return current;
}
export function discoverTrackedInputs({root,prefix,select=()=>true,limits:inputLimits,maximumLimits,errorPrefix}={}){
  const fail=message=>{throw new TypeError(errorPrefix+': '+message);};
  if(typeof prefix!=='string'||!prefix.endsWith('/')||prefix.split('/').slice(0,-1).some(part=>!part||part==='.'||part==='..'||part.includes('\\'))||typeof select!=='function')fail('invalid tracked input selection');
  const bounds=limits(inputLimits,maximumLimits,fail);root=realpathSync(resolve(root));
  const git=(...args)=>execFileSync('git',args,{cwd:root,timeout:10000,maxBuffer:8*1024*1024});
  const top=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(git('rev-parse','--show-toplevel')).replace(/\n$/u,'');
  if(realpathSync(top)!==root)fail('root is not its original Git worktree root');
  const decode=bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(decode(git('ls-files','--others','-z','--',prefix)).split('\0').filter(path=>path&&select(path)).length)fail('untracked profile inputs must be frozen before fingerprinting');
  const rows=decode(git('ls-files','--stage','-z','--',prefix)).split('\0').filter(Boolean);
  if(rows.length>100000)fail('tracked path listing exceeds its finite bounds');
  const seen=new Set(),entries=[];let totalBytes=0;
  for(const row of rows){
    const match=/^([0-7]{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t(.+)$/s.exec(row);
    if(!match)fail('unknown tracked index entry');
    const path=match[4];if(!select(path))continue;
    if(!['100644','100755'].includes(match[1])||match[3]!=='0')fail('unknown mode, unmerged stage or nonregular tracked profile');
    if(seen.has(path))fail('duplicate tracked profile path');seen.add(path);entries.push({path,gitBlob:match[2],mode:match[1]});
  }
  if(!entries.length||entries.length>bounds.files)fail('tracked input count exceeds its finite bounds or is empty');
  entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const result=entries.map(entry=>{
    const path=originalPath(root,entry.path,prefix,fail),before=lstatSync(path);
    if(!Number.isSafeInteger(before.size)||before.size>bounds.fileBytes||totalBytes+before.size>bounds.totalBytes)fail('profile bytes exceed their finite bounds: '+entry.path);
    const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let bytes;
    try{
      const opened=fstatSync(fd);if(!opened.isFile()||!sameFile(before,opened))fail('profile changed before original bytes were opened');
      bytes=Buffer.alloc(before.size);let offset=0;
      while(offset<bytes.length){const size=readSync(fd,bytes,offset,Math.min(65536,bytes.length-offset),offset);if(!size)fail('profile became shorter during bounded read');offset+=size;}
      if(readSync(fd,Buffer.alloc(1),0,1,offset)!==0)fail('profile grew during bounded read');const after=fstatSync(fd);
      if(bytes.length!==before.size||!sameFile(before,after)||originalPath(root,entry.path,prefix,fail)!==path||!sameFile(before,lstatSync(path)))fail('profile original bytes/path changed during fingerprinting');
    }finally{closeSync(fd);}
    totalBytes+=bytes.length;
    return Object.freeze({...entry,bytes:bytes.length,sha256:hash(bytes),semanticAuthority:false});
  });
  return Object.freeze(result);
}
