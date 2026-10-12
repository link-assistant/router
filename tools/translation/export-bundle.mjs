// Copy the complete committed offline compiler; exported metadata grants no
// source, namespace, ownership, or runtime-equivalence authority.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants,closeSync,fstatSync,lstatSync,mkdirSync,openSync,readSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const TRANSLATOR_EXPORT_LIMITS=Object.freeze({files:2048,fileBytes:4*1024*1024,totalBytes:64*1024*1024,gitMilliseconds:10000,gitOutputBytes:4*1024*1024});
const roots=['tools/translation','scripts/translate-router.mjs','scripts/export-router-translator.mjs'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const selected=path=>{
  if(roots.slice(1).includes(path))return true;
  if(!path.startsWith('tools/translation/'))return false;
  const relative=path.slice('tools/translation/'.length);
  if(relative==='check-typescript-fixtures.mjs')return false;
  return !relative.includes('/')&&/\.(?:mjs|d\.mts)$/u.test(relative)||['extensions/','vendor/','source-profiles/'].some(prefix=>relative.startsWith(prefix));
};
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:TRANSLATOR_EXPORT_LIMITS.gitMilliseconds,maxBuffer:TRANSLATOR_EXPORT_LIMITS.gitOutputBytes,stdio:['ignore','pipe','pipe']});
function committedInputs(root){
  const head=git(root,['rev-parse','--verify','HEAD']).trim();
  if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head))throw new TypeError('Translator export requires a complete committed source HEAD');
  const records=git(root,['ls-tree','-r','-z',head,'--',...roots]).split('\0').filter(Boolean);
  const inputs=[];
  for(const record of records){
    const match=/^(\d{6}) (\S+) ([a-f0-9]+)\t(.+)$/u.exec(record);
    if(!match)throw new TypeError('Translator export received a malformed Git tree entry');
    const [,mode,type,blob,path]=match;if(!selected(path))continue;
    if(!/^[A-Za-z0-9_./@+-]{1,240}$/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Translator export requires safe repository-relative input paths');
    if(type!=='blob'||!['100644','100755'].includes(mode)||blob.length!==head.length)throw new TypeError('Translator export requires committed regular source files');
    inputs.push({path,mode,gitBlob:blob});
    if(inputs.length>TRANSLATOR_EXPORT_LIMITS.files)throw new RangeError('Translator export file budget exceeded');
  }
  inputs.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(!inputs.some(row=>row.path==='scripts/translate-router.mjs')||!inputs.some(row=>row.path==='tools/translation/bulk.mjs')||!inputs.some(row=>row.path==='tools/translation/vendor/meta-language/package.json')||!inputs.some(row=>row.path.startsWith('tools/translation/source-profiles/')))throw new TypeError('Translator export is missing required compiler, CLI, vendor or original-source inputs');
  const indexed=[];
  for(const record of git(root,['ls-files','--stage','-z','--',...roots]).split('\0').filter(Boolean)){
    const match=/^(\d{6}) ([a-f0-9]+) (\d+)\t(.+)$/u.exec(record);
    if(!match)throw new TypeError('Translator export received a malformed Git index entry');
    const [,mode,blob,stage,path]=match;if(!selected(path))continue;
    if(stage!=='0')throw new TypeError('Translator export cannot copy unmerged compiler inputs');
    indexed.push({path,mode,gitBlob:blob});
  }
  indexed.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(JSON.stringify(inputs)!==JSON.stringify(indexed))throw new TypeError('Translator export compiler index differs from its committed source HEAD');
  return {head,inputs};
}
function originalBytes(root,row){
  let directory=root;
  for(const part of row.path.split('/').slice(0,-1)){
    directory=join(directory,part);const stat=lstatSync(directory);
    if(stat.isSymbolicLink()||!stat.isDirectory())throw new TypeError('Translator export cannot follow a source directory link');
  }
  const path=join(root,row.path),before=lstatSync(path);
  if(before.isSymbolicLink()||!before.isFile())throw new TypeError('Translator export requires regular physical source inputs');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=fstatSync(fd);
    if(!stat.isFile()||stat.size>TRANSLATOR_EXPORT_LIMITS.fileBytes)throw new RangeError('Translator export source file budget exceeded');
    const bytes=Buffer.alloc(stat.size);let offset=0;
    while(offset<bytes.length){const read=readSync(fd,bytes,offset,bytes.length-offset,offset);if(!read)throw new TypeError('Translator export source changed during its bounded read');offset+=read;}
    const after=fstatSync(fd),extra=Buffer.alloc(1);
    if(readSync(fd,extra,0,1,bytes.length)||after.size!==stat.size||after.dev!==stat.dev||after.ino!==stat.ino||after.mtimeMs!==stat.mtimeMs)throw new TypeError('Translator export source changed during its bounded read');
    const algorithm=row.gitBlob.length===40?'sha1':'sha256',blob=createHash(algorithm).update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    if(blob!==row.gitBlob||((stat.mode&0o111)?'100755':'100644')!==row.mode)throw new TypeError('Translator export source bytes or mode differ from their committed Git input');
    return bytes;
  }finally{closeSync(fd);}
}
function freshDestination(root,output){
  if(typeof output!=='string'||!output)throw new TypeError('Translator export requires an explicit fresh destination');
  const requested=resolve(output),parent=realpathSync(dirname(requested)),destination=join(parent,basename(requested));
  if(destination===root||destination.startsWith(root+sep)||root.startsWith(destination+sep))throw new TypeError('Translator export destination must be separate from the source repository');
  // The existing parent is resolved once. Every descendant is created by this
  // export; an existing destination, including a dangling link, is refused.
  try{lstatSync(destination);throw new TypeError('Translator export destination already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  return destination;
}
function outputPath(destination,path){
  let directory=destination;
  const parts=path.split('/');
  for(let index=0;index<parts.length;index++){
    const stat=lstatSync(directory);
    if(stat.isSymbolicLink()||!stat.isDirectory())throw new TypeError('Translator export cannot follow an output directory link');
    if(index===parts.length-1)return join(directory,parts[index]);
    directory=join(directory,parts[index]);
    try{mkdirSync(directory);}catch(error){if(error.code!=='EEXIST')throw error;}
  }
}
export function exportTranslatorBundle({sourceRoot=fileURLToPath(new URL('../../',import.meta.url)),output}={}){
  const root=realpathSync(resolve(sourceRoot)),destination=freshDestination(root,output),before=committedInputs(root),copies=[];
  let totalBytes=0;
  for(const row of before.inputs){
    const bytes=originalBytes(root,row);totalBytes+=bytes.length;
    if(totalBytes>TRANSLATOR_EXPORT_LIMITS.totalBytes)throw new RangeError('Translator export total byte budget exceeded');
    copies.push({...row,bytes,sha256:sha256(bytes)});
  }
  const after=committedInputs(root);
  if(JSON.stringify(before)!==JSON.stringify(after))throw new TypeError('Translator export HEAD or source index changed during collection');
  for(const row of copies)if(!originalBytes(root,row).equals(row.bytes))throw new TypeError('Translator export source changed during collection');
  const inputs=copies.map(({path,mode,gitBlob,bytes,sha256})=>({path,mode,gitBlob,bytes:bytes.length,sha256}));
  const manifest={schema:'committed-offline-rust-meta-translator-bundle-v1',sourceHead:before.head,sourceInventorySha256:sha256(Buffer.from(JSON.stringify(inputs))),files:inputs.length,totalSourceBytes:totalBytes,inputs,entrypoint:'scripts/translate-router.mjs',runtimeParity:false,scope:'Complete selected committed forward compiler, vendored meta-language, extensions, original-source profiles and licenses; generated outputs, the repository fixture checker and test evidence are excluded.'};
  // Preflight completes before creating any destination. wx refuses overwrites.
  mkdirSync(destination,{mode:0o755});
  for(const row of copies)writeFileSync(outputPath(destination,row.path),row.bytes,{flag:'wx',mode:row.mode==='100755'?0o755:0o644});
  writeFileSync(outputPath(destination,'package.json'),'{"type":"module","private":true}\n',{flag:'wx'});
  if(JSON.stringify(before)!==JSON.stringify(committedInputs(root)))throw new TypeError('Translator export HEAD or source index changed during output');
  for(const row of copies)if(!originalBytes(root,row).equals(row.bytes))throw new TypeError('Translator export source changed during output');
  writeFileSync(outputPath(destination,'translator-bundle.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {destination,manifest};
}
