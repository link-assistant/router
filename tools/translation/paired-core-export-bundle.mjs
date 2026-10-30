import {TRANSLATOR_ENTRYPOINTS} from './translator-entrypoints.mjs';
// Copy the complete committed offline compiler; exported metadata grants no
// source, namespace, ownership, or runtime-equivalence authority.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants,closeSync,fstatSync,lstatSync,mkdirSync,openSync,readSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isCompilerSourceInputPath,COMPILER_SOURCE_INPUT_LIMITS} from './compiler-source-inputs.mjs';

export const TRANSLATOR_EXPORT_LIMITS=Object.freeze({files:2048,fileBytes:4*1024*1024,totalBytes:64*1024*1024,gitMilliseconds:10000,gitOutputBytes:4*1024*1024});
// Physical compiler input dependencies of the three fresh paired source readers.
// This list is DATA, never native namespace/type/compilation authority.
export const PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS=Object.freeze(["rust/src/translation_primitive_sequences_core.rs","rust/src/translation_primitive_vectors_core.rs","rust/src/translation_owned_text_vectors_core.rs"]);
export const PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS=Object.freeze(['LICENSE']);
const roots=['tools/translation',...TRANSLATOR_ENTRYPOINTS,...PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS,...PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const selected=path=>{
  if(roots.slice(1).includes(path))return true;
  if(!path.startsWith('tools/translation/'))return false;
  const relative=path.slice('tools/translation/'.length);
  return isCompilerSourceInputPath(path)||['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>relative.startsWith(prefix));
};
const git=(root,args,input)=>{
  // Export never borrows an inherited repository, index, object store or config
  // override. In particular, its fresh compiler index cannot mutate the source
  // index or the receiving application's index through GIT_INDEX_FILE.
  const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')));
  env.GIT_CONFIG_NOSYSTEM='1';env.GIT_CONFIG_GLOBAL='/dev/null';
  return execFileSync('git',args,{cwd:root,env,input,encoding:'utf8',timeout:TRANSLATOR_EXPORT_LIMITS.gitMilliseconds,maxBuffer:TRANSLATOR_EXPORT_LIMITS.gitOutputBytes,stdio:[input===undefined?'ignore':'pipe','pipe','pipe']});
};
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
    if(inputs.length>PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS.logicalFiles)throw new RangeError('Translator export file budget exceeded');
  }
  inputs.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(!inputs.some(row=>row.path==="scripts/translate-router-flat-native-owned-field-meta.mjs")||!inputs.some(row=>row.path==='scripts/translate-router.mjs')||!inputs.some(row=>row.path==='tools/translation/bulk.mjs')||!inputs.some(row=>row.path==='tools/translation/vendor/meta-language/package.json')||!inputs.some(row=>row.path.startsWith('tools/translation/source-profiles/')))throw new TypeError('Translator export is missing required compiler, CLI, vendor or original-source inputs');
  if(!PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS.every(path=>inputs.some(row=>row.path===path)))throw new TypeError('Paired core translator export is missing a committed native source input');
  if(!PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS.every(path=>inputs.some(row=>row.path===path)))throw new TypeError('Paired core translator export is missing its committed project license');
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
function compilerIndex(destination,inputs,objectFormat){
  // This unborn repository only enumerates the copied compiler closure. It has
  // no source HEAD, target sources, namespace facts or runtime-parity authority.
  git(destination,['init','--quiet','--template=','--object-format='+objectFormat]);
  const blobs=git(destination,['hash-object','-w','--stdin-paths','--no-filters'],inputs.map(row=>row.path).join('\n')+'\n').trim().split('\n');
  if(JSON.stringify(blobs)!==JSON.stringify(inputs.map(row=>row.gitBlob)))throw new TypeError('Translator export compiler objects differ from the original committed bytes');
  // Explicit original modes and object IDs avoid attributes, filters and CRLF
  // normalization that git add could apply to the copied original sources.
  git(destination,['update-index','-z','--index-info'],inputs.map(row=>`${row.mode} ${row.gitBlob}\t${row.path}\0`).join(''));
  const actual=git(destination,['ls-files','--stage','-z']).split('\0').filter(Boolean);
  const expected=inputs.map(row=>`${row.mode} ${row.gitBlob} 0\t${row.path}`);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new TypeError('Translator export compiler index differs from the original committed inventory');
  for(const row of inputs)originalBytes(destination,row);
}
export function exportPairedCoreTranslatorBundle({sourceRoot=fileURLToPath(new URL('../../',import.meta.url)),output}={}){
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
  const partitioned=partitionOriginalCompilerInputs(inputs,before.head);if(totalBytes+partitioned.bytes>TRANSLATOR_EXPORT_LIMITS.totalBytes)throw new RangeError('Partitioned compiler source and metadata exceed the original total byte budget');
  const manifest={schema:'committed-offline-rust-meta-translator-bundle-v1',partitionSchema:'committed-translator-input-partitions-v1',partitions:partitioned.descriptions,sourceHead:before.head,sourceInventorySha256:sha256(Buffer.from(JSON.stringify(inputs))),files:inputs.length,totalSourceBytes:totalBytes,inputs,entrypoint:'scripts/translate-router.mjs',compilerIndex:{kind:'fresh-unborn-enumeration',objectFormat:before.head.length===40?'sha1':'sha256',sourceHeadPresent:false,namespaceAuthority:false},nativeCompatibilitySources:inputs.filter(row=>PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS.includes(row.path)),projectLicenseSources:inputs.filter(row=>PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS.includes(row.path)),nativeRustCompilationExecuted:false,nativeCallerBindingQualified:false,runtimeParity:false,scope:'Complete committed production compiler fingerprint closure, forward/reverse generation CLIs, vendored meta-language, extensions, original-source profiles, complete project/vendor licenses and the three physical native compatibility inputs of fresh sequence/vector readers. Native files are source DATA, not a compiled crate or type/namespace/caller permit. Generated outputs and test evidence are excluded. Actual native caller translation additionally requires the complete receiving source graph, Cargo inputs and pinned TypeScript dependency.'};
  // Preflight completes before creating any destination. wx refuses overwrites.
  mkdirSync(destination,{mode:0o755});
  for(const row of copies)writeFileSync(outputPath(destination,row.path),row.bytes,{flag:'wx',mode:row.mode==='100755'?0o755:0o644});
  writeFileSync(outputPath(destination,'package.json'),'{"type":"module","private":true}\n',{flag:'wx'});
  for(const part of partitioned.parts)writeFileSync(outputPath(destination,part.file),part.source,{flag:'wx',mode:0o644});
  compilerIndex(destination,inputs,manifest.compilerIndex.objectFormat);
  for(const part of partitioned.parts)originalBytes(destination,part.record);
  if(JSON.stringify(before)!==JSON.stringify(committedInputs(root)))throw new TypeError('Translator export HEAD or source index changed during output');
  for(const row of copies)if(!originalBytes(root,row).equals(row.bytes))throw new TypeError('Translator export source changed during output');
  writeFileSync(outputPath(destination,'translator-bundle.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {destination,manifest};
}

export const PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS=Object.freeze({filesPerPartition:TRANSLATOR_EXPORT_LIMITS.files,partitions:Math.ceil(COMPILER_SOURCE_INPUT_LIMITS.files/TRANSLATOR_EXPORT_LIMITS.files),logicalFiles:COMPILER_SOURCE_INPUT_LIMITS.files,fileBytes:TRANSLATOR_EXPORT_LIMITS.fileBytes,totalBytes:TRANSLATOR_EXPORT_LIMITS.totalBytes});
function partitionOriginalCompilerInputs(inputs,sourceHead){
 const limit=PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS;if(!inputs.length||inputs.length>limit.logicalFiles)throw new RangeError('Partitioned translator export logical file budget exceeded');const parts=[],whole=sha256(Buffer.from(JSON.stringify(inputs)));let bytes=0;
 for(let start=0;start<inputs.length;start+=limit.filesPerPartition){
  if(parts.length>=limit.partitions)throw new RangeError('Partitioned translator export partition budget exceeded');const rows=inputs.slice(start,start+limit.filesPerPartition),index=parts.length+1,file='translator-input-partitions/part-'+String(index).padStart(4,'0')+'.json',source=JSON.stringify({schema:'committed-translator-input-partition-v1',sourceHead,sourceInventorySha256:whole,index,inputs:rows,files:rows.length,totalSourceBytes:rows.reduce((sum,row)=>sum+row.bytes,0),sourceAuthority:false,semanticAuthority:false,runtimeParity:false})+'\n',raw=Buffer.from(source);
  if(raw.length>limit.fileBytes||(bytes+=raw.length)>limit.totalBytes)throw new RangeError('Partitioned translator export metadata byte budget exceeded');const algorithm=sourceHead.length===40?'sha1':'sha256',gitBlob=createHash(algorithm).update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');parts.push({file,source,record:{path:file,mode:'100644',gitBlob},description:{file,index,files:rows.length,totalSourceBytes:rows.reduce((sum,row)=>sum+row.bytes,0),bytes:raw.length,sha256:sha256(raw)}});
 }
 const reconstructed=parts.flatMap(part=>JSON.parse(part.source).inputs);if(JSON.stringify(reconstructed)!==JSON.stringify(inputs))throw new TypeError('Every original compiler input must appear exactly once in its partition');return {parts,bytes,descriptions:parts.map(part=>part.description)};
}
