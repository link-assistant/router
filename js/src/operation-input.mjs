import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,dirname,parse} from 'node:path';
const fail=message=>Object.assign(new Error(message),{code:'operation_input',exitCode:2});
export async function requireNativePath(path) {
  for (let current=resolve(path);;) {
    let stat;try {stat=await lstat(current);}catch(error) {if (error.code!=='ENOENT') throw error;}
    if (stat?.isSymbolicLink()) throw fail('Operation input contains a symlink');
    if (current===parse(current).root) return stat;current=dirname(current);
  }
}
export async function readNativeText(path,{cwd=process.cwd(),maxBytes=64*1024*1024}={}) {
  path=resolve(cwd,path);await requireNativePath(path);const file=await open(path,constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat=await file.stat();if (!stat.isFile() || stat.size>maxBytes) throw fail('Operation input requires a regular file within its byte budget');
    const chunks=[];let bytes=0;
    while (true) {const buffer=Buffer.alloc(Math.min(65536,maxBytes-bytes+1)),part=await file.read(buffer,0,buffer.length,null);if (!part.bytesRead) break;bytes+=part.bytesRead;if (bytes>maxBytes) throw fail('Operation input exceeds its byte budget');chunks.push(buffer.subarray(0,part.bytesRead));}
    return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));
  } finally {await file.close();}
}
