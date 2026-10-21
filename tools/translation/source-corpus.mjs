import {repositoryRustLayout} from './repository-layout.mjs';
// Capture complete original tracked bytes once; configured compilation never
// reconsults a mutable source reader or invents a fragment as an original file.
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
const states=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const safe=path=>typeof path==='string'&&Buffer.byteLength(path)<=4096&&path.endsWith('.rs')&&!path.includes('\\')&&!path.includes(':')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
export const SOURCE_CORPUS_LIMITS=Object.freeze({trackedPaths:20_000,sourceBytes:8*1024*1024,totalSourceBytes:64*1024*1024,cargoBytes:8*1024*1024});

// A missing sparse file comes from this checkout's immutable HEAD. A missing
// ordinary file remains an error; a user's deletion is never resurrected.
export function trackedSourceBytes(root,path,{maxBytes=32*1024*1024}={}){
  const absolute=join(root,path);
  if(existsSync(absolute)){
    if(statSync(absolute).size>maxBytes)throw new TypeError(`source corpus input exceeds its byte budget at ${path}`);
    const bytes=readFileSync(absolute);
    if(bytes.length>maxBytes)throw new TypeError(`source corpus input exceeds its byte budget at ${path}`);
    return bytes;
  }
  const records=execFileSync('git',['ls-files','-v','-z','--',path],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  if(!records.some(record=>record.startsWith('S ')&&record.slice(2)===path))return readFileSync(absolute);
  const size=Number(execFileSync('git',['cat-file','-s',`HEAD:${path}`],{cwd:root,encoding:'utf8'}).trim());
  if(!Number.isSafeInteger(size)||size>maxBytes)throw new TypeError(`source corpus input exceeds its byte budget at ${path}`);
  return execFileSync('git',['show',`HEAD:${path}`],{cwd:root,maxBuffer:maxBytes});
}
export function trackedSource(root,path){return trackedSourceBytes(root,path).toString('utf8');}

function originalPaths(paths){
  if(!Array.isArray(paths)||utilTypes.isProxy(paths)||Object.getPrototypeOf(paths)!==Array.prototype)throw new TypeError('source corpus paths require an ordinary data array');
  const length=Object.getOwnPropertyDescriptor(paths,'length').value;
  if(!length||length>SOURCE_CORPUS_LIMITS.trackedPaths)throw new TypeError('source corpus tracked path budget exceeds 20000 or is empty');
  const result=[];
  for(const key of Reflect.ownKeys(paths))if(key!=='length'&&(typeof key!=='string'||!(/^(0|[1-9][0-9]*)$/).test(key)||Number(key)>=length))throw new TypeError('source corpus paths have incidental properties');
  for(let index=0;index<length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(paths,String(index));
    if(!descriptor||!('value'in descriptor)||!descriptor.enumerable||!safe(descriptor.value))throw new TypeError('source corpus requires safe original Rust path data');
    result.push(descriptor.value);
  }
  if(new Set(result).size!==result.length)throw new TypeError('source corpus paths must be distinct');
  return result.sort();
}
function exactText(bytes,path){
  const text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))throw new TypeError(`source corpus requires exact UTF-8 source bytes at ${path}`);
  return text;
}
export function captureSourceCorpus({root,paths}={}){
  root=resolve(root);paths=originalPaths(paths);
  const texts=new Map(),sources=[];let totalSourceBytes=0;
  for(const path of paths){
    const bytes=trackedSourceBytes(root,path,{maxBytes:SOURCE_CORPUS_LIMITS.sourceBytes});
    if(bytes.length>SOURCE_CORPUS_LIMITS.sourceBytes)throw new TypeError(`source corpus file byte budget exceeds 8388608 at ${path}`);
    totalSourceBytes+=bytes.length;
    if(totalSourceBytes>SOURCE_CORPUS_LIMITS.totalSourceBytes)throw new TypeError('source corpus total byte budget exceeds 67108864');
    texts.set(path,exactText(bytes,path));sources.push({source:path,bytes:bytes.length,sha256:hash(bytes)});
  }
  const cargo=[];
  for(const path of repositoryRustLayout(root).cargoInputs){
    // Cargo files are optional only for stand-alone fixture directories. A
    // tracked sparse file must still be captured through its immutable HEAD.
    let bytes=null;
    if(existsSync(join(root,path)))bytes=trackedSourceBytes(root,path,{maxBytes:SOURCE_CORPUS_LIMITS.cargoBytes});
    else if(existsSync(join(root,'.git'))){
      const tracked=execFileSync('git',['ls-files','-z','--',path],{cwd:root,encoding:'utf8'}).split('\0').includes(path);
      if(tracked)bytes=trackedSourceBytes(root,path,{maxBytes:SOURCE_CORPUS_LIMITS.cargoBytes});
    }
    if(bytes===null){texts.set(path,null);cargo.push({source:path,available:false});continue;}
    if(bytes.length>SOURCE_CORPUS_LIMITS.cargoBytes)throw new TypeError('source corpus Cargo input byte budget exceeds 8388608');
    texts.set(path,exactText(bytes,path));cargo.push({source:path,available:true,bytes:bytes.length,sha256:hash(bytes)});
  }
  const description=freeze({schema:'original-source-corpus-v1',sources,cargo,totalSourceBytes,limits:SOURCE_CORPUS_LIMITS,namespaceAuthority:false,runtimeAuthority:false});
  const corpus=freeze({...description,sourceSetSha256:hash(JSON.stringify({sources,cargo}))});
  states.set(corpus,{root,texts,paths});return corpus;
}
export function sourceCorpusPaths(corpus,root){
  const state=states.get(corpus);
  if(!state||state.root!==resolve(root))throw new TypeError('source corpus is unsealed or belongs to another repository root');
  return [...state.paths];
}
export function assertSourceCorpusSelection(corpus,root,paths){
  const expected=sourceCorpusPaths(corpus,root),selected=originalPaths(paths);
  if(selected.length!==expected.length||selected.some((path,index)=>path!==expected[index]))throw new TypeError('source selection differs from the privately captured original corpus');
  return expected;
}
export function sourceCorpusText(corpus,root,path){
  const state=states.get(corpus);
  if(!state||state.root!==resolve(root)||!state.texts.has(path))throw new TypeError('source corpus is unsealed or the original input is absent');
  return state.texts.get(path);
}
