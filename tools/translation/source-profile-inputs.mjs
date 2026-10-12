// Complete tracked profile bytes are compiler fingerprints, never semantic
// authority. Original pins, licenses, docs and draft receipts all remain inputs.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants,lstatSync,realpathSync,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
export const SOURCE_PROFILE_INPUT_LIMITS=Object.freeze({files:8192,fileBytes:32*1024*1024,totalBytes:256*1024*1024});
const prefix='tools/translation/source-profiles/',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new TypeError('Source profile inputs: '+message);};
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
function limits(input){
  if(input===undefined)return SOURCE_PROFILE_INPUT_LIMITS;
  if(!input||typeof input!=='object'||Object.keys(input).some(key=>!Object.hasOwn(SOURCE_PROFILE_INPUT_LIMITS,key)))fail('unknown input limits');
  const value={...SOURCE_PROFILE_INPUT_LIMITS,...input};
  for(const key of Object.keys(value))if(!Number.isSafeInteger(value[key])||value[key]<1||value[key]>SOURCE_PROFILE_INPUT_LIMITS[key])fail('input limits may only narrow their finite bounds');
  return value;
}
function originalPath(root,path){
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
export function discoverSourceProfileInputs({root,limits:inputLimits}={}){
  const bounds=limits(inputLimits);root=realpathSync(resolve(root));
  const git=(...args)=>execFileSync('git',args,{cwd:root,timeout:10000,maxBuffer:8*1024*1024});
  const top=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(git('rev-parse','--show-toplevel')).replace(/\n$/u,'');
  if(realpathSync(top)!==root)fail('root is not its original Git worktree root');
  const decode=bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(decode(git('ls-files','--others','-z','--',prefix)).split('\0').filter(Boolean).length)fail('untracked profile inputs must be frozen before fingerprinting');
  const rows=decode(git('ls-files','--stage','-z','--',prefix)).split('\0').filter(Boolean);
  if(!rows.length||rows.length>bounds.files)fail('tracked profile count exceeds its finite bounds or is empty');
  const seen=new Set(),entries=[];let totalBytes=0;
  for(const row of rows){
    const match=/^(100644|100755) ([a-f0-9]{40}|[a-f0-9]{64}) 0\t(.+)$/s.exec(row);
    if(!match)fail('unknown mode, unmerged stage or nonregular tracked profile');
    const path=match[3];if(seen.has(path))fail('duplicate tracked profile path');seen.add(path);entries.push({path,gitBlob:match[2],mode:match[1]});
  }
  entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const result=entries.map(entry=>{
    const path=originalPath(root,entry.path),before=lstatSync(path);
    if(!Number.isSafeInteger(before.size)||before.size>bounds.fileBytes||totalBytes+before.size>bounds.totalBytes)fail('profile bytes exceed their finite bounds: '+entry.path);
    const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let bytes;
    try{
      const opened=fstatSync(fd);if(!opened.isFile()||!sameFile(before,opened))fail('profile changed before original bytes were opened');
      bytes=Buffer.alloc(before.size);let offset=0;
      while(offset<bytes.length){const size=readSync(fd,bytes,offset,Math.min(65536,bytes.length-offset),offset);if(!size)fail('profile became shorter during bounded read');offset+=size;}
      if(readSync(fd,Buffer.alloc(1),0,1,offset)!==0)fail('profile grew during bounded read');const after=fstatSync(fd);
      if(bytes.length!==before.size||!sameFile(before,after)||originalPath(root,entry.path)!==path||!sameFile(before,lstatSync(path)))fail('profile original bytes/path changed during fingerprinting');
    }finally{closeSync(fd);}
    totalBytes+=bytes.length;
    return Object.freeze({...entry,bytes:bytes.length,sha256:hash(bytes),semanticAuthority:false});
  });
  return Object.freeze(result);
}
