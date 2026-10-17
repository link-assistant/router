// Fixed bootstrap TEXT. The parent authenticates this complete file and binds
// only the two private paths below; this file is never reopened as executable.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {types} from 'node:util';

const ORIGINAL_ROOT = null;
const TASK_ROOT = null;
const SOURCE_HEAD = "c39bd4f983b15fbf168851b94c3d6443a8832e16";
const REGISTRY_GZIP_SHA256 = "7d44dd41de6590ffe2e58a8a7459f464ae58e99b7ba064deedeb1e1d97db2731";
const REGISTRY_RAW_SHA256 = "f3f87164243ae2c2a7c31ab11074c49b6396b48eccebff70da2e20c29c5aa01e";
const REGISTRY_PATH='tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz';
const LIMIT={files:1024,entries:8,file:2097152,source:16777216,input:33554432,
  compilerFiles:2048,compilerFile:33554432,compiler:67108864,outputs:16384,
  output:536870912,wire:536870912,frame:8388608,chunk:65536};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixedGit='/usr/bin/git',sourceRecords=[],snapshotRecords=[],applicationRecords=[];
const ENGINE={name:process.versions.bun?'bun':'node',version:process.version,platform:process.platform};
const fsAtBirth=Object.fromEntries(['readSync','openSync','closeSync','lstatSync','fstatSync','readFileSync','writeFileSync','realpathSync'].map(key=>[key,fs[key]]));
const hashAtBirth=createHash,parseAtBirth=JSON.parse,stringifyAtBirth=JSON.stringify;
let wireBytes=0,requestDigest=null,work=null;
function fail(message){throw new TypeError('Original project child: '+message);}
function stable(){
  if(createHash!==hashAtBirth||JSON.parse!==parseAtBirth||JSON.stringify!==stringifyAtBirth)fail('bootstrap operation changed');
  for(const key of Object.keys(fsAtBirth))if(fs[key]!==fsAtBirth[key])fail('bootstrap filesystem operation changed');
}
function safePath(path){return typeof path==='string'&&path.length>0&&path.length<=4096&&!path.includes('\\')&&!path.includes(':')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}
function sameDirectory(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;}
function exactText(bytes){const value=bytes.toString('utf8');if(!Buffer.from(value,'utf8').equals(bytes))fail('noncanonical UTF8');return value;}
function readRegular(root,path,bound,records){
  if(!safePath(path))fail('unsafe registered path');let directory=root;const ancestors=[];
  const rootStat=fs.lstatSync(root);if(!rootStat.isDirectory()||rootStat.isSymbolicLink())fail('linked root');ancestors.push({path:root,state:rootStat});
  const parts=path.split('/');for(let at=0;at<parts.length-1;at++){directory=join(directory,parts[at]);const state=fs.lstatSync(directory);if(!state.isDirectory()||state.isSymbolicLink())fail('linked source directory');ancestors.push({path:directory,state});}
  const file=join(root,path),before=fs.lstatSync(file);if(!before.isFile()||before.isSymbolicLink()||!Number.isSafeInteger(before.size)||before.size<0||before.size>bound)fail('source file shape or bound');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let bytes;
  try{
    const opened=fs.fstatSync(fd);if(!sameFile(before,opened))fail('source changed before read');bytes=Buffer.alloc(before.size);let at=0;
    while(at<bytes.length){const count=fs.readSync(fd,bytes,at,Math.min(65536,bytes.length-at),at);if(!Number.isInteger(count)||count<1||count>bytes.length-at)fail('source read count');at+=count;}
    if(fs.readSync(fd,Buffer.alloc(1),0,1,at)!==0||!sameFile(before,fs.fstatSync(fd)))fail('source changed during read');
  }finally{fs.closeSync(fd);}
  if(!sameFile(before,fs.lstatSync(file)))fail('source path changed');for(const row of ancestors)if(!sameDirectory(row.state,fs.lstatSync(row.path)))fail('source ancestor changed');
  if(records)records.push({file,state:before,ancestors});return bytes;
}
function current(records){for(const row of records){if(!sameFile(row.state,fs.lstatSync(row.file)))fail('final source identity changed');for(const parent of row.ancestors)if(!sameDirectory(parent.state,fs.lstatSync(parent.path)))fail('final source ancestor changed');}}
function verifyRow(row,root,path,records){const bytes=readRegular(root,path,LIMIT.compilerFile,records);if(bytes.length!==row.bytes||hash(bytes)!==row.sha256||((fs.lstatSync(join(root,path)).mode&0o111)?'100755':'100644')!==row.mode)fail('registered complete bytes or mode changed: '+row.path);return bytes;}
function record(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('JSON record required');const keys=Object.keys(value);if(keys.length!==names.length||keys.some(key=>!names.includes(key)))fail('JSON record fields');return value;}
function requestPreflight(text){let depth=0,cells=0,strings=0;for(let at=0;at<text.length;at++){const unit=text[at];if(unit==='"'){if(++strings>LIMIT.files*6+LIMIT.entries+32)fail('JSON string-count bound');for(at++;at<text.length;at++){if(text[at]==='\\')at++;else if(text[at]==='"')break;}}else if(unit==='['||unit==='{'){if(++depth>4)fail('JSON nesting bound');}else if(unit===']'||unit==='}'){if(--depth<0)fail('JSON delimiters');}else if((unit===','||unit===':')&&++cells>LIMIT.files*8+LIMIT.entries+32)fail('JSON cell bound');}if(depth!==0)fail('JSON delimiters');}
function readRequest(text){
  requestPreflight(text);const value=record(JSON.parse(text),['schema','sourceFiles','entries']);if(value.schema!=='original-project-child-request-v1'||!Array.isArray(value.sourceFiles)||!value.sourceFiles.length||value.sourceFiles.length>LIMIT.files||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>LIMIT.entries)fail('request schema/count');
  const paths=new Set();let total=0;
  for(const row of value.sourceFiles){record(row,['path','source']);if(!safePath(row.path)||!(row.path.endsWith('.rs')||['Cargo.toml','Cargo.lock'].includes(row.path))||typeof row.source!=='string'||paths.has(row.path))fail('source row');const bytes=Buffer.from(row.source,'utf8');if(exactText(bytes)!==row.source||bytes.length>LIMIT.file||(total+=bytes.length)>LIMIT.source)fail('source text/aggregate bound');paths.add(row.path);}
  if(new Set(value.entries).size!==value.entries.length||value.entries.some(path=>typeof path!=='string'||!path.endsWith('.rs')||!paths.has(path)))fail('entry association');return value;
}
function outputPath(root,path){if(!safePath(path))fail('output path');const file=join(root,path);fs.mkdirSync(dirname(file),{recursive:true,mode:0o700});return file;}
function git(root,args,input){return execFileSync(fixedGit,args,{cwd:root,env:{PATH:'/usr/bin:/bin',HOME:root,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_OPTIONAL_LOCKS:'0'},input,encoding:'utf8',timeout:10000,maxBuffer:8388608,stdio:['pipe','pipe','pipe']});}
function freshIndex(root,rows){
  git(root,['init','--quiet','--template=']);const sourceRows=rows.filter(row=>row.origin==='compiler');
  const ids=git(root,['hash-object','-w','--stdin-paths','--no-filters'],sourceRows.map(row=>row.path).join('\n')+'\n').trim().split('\n');if(ids.some((id,index)=>id!==sourceRows[index].gitBlob)||ids.length!==sourceRows.length)fail('copied Git object association');
  git(root,['update-index','-z','--index-info'],sourceRows.map(row=>`${row.mode} ${row.gitBlob}\t${row.path}\0`).join(''));
  return sourceRows.map(row=>`${row.mode} ${row.gitBlob} 0\t${row.path}\0`).join('');
}
function compilerReadOnly(root){const pending=[root];while(pending.length){const path=pending.pop(),state=fs.lstatSync(path);if(state.isSymbolicLink())fail('linked private compiler');if(state.isDirectory()){for(const name of fs.readdirSync(path))pending.push(join(path,name));fs.chmodSync(path,0o555);}else if(state.isFile())fs.chmodSync(path,state.mode&0o111?0o555:0o444);else fail('private compiler node type');}}
function removeOwned(root){const pending=[root];while(pending.length){const path=pending.pop(),state=fs.lstatSync(path);if(state.isDirectory()&&!state.isSymbolicLink()){fs.chmodSync(path,0o700);for(const name of fs.readdirSync(path))pending.push(join(path,name));}}fs.rmSync(root,{recursive:true,force:true});}
async function line(value){const text=JSON.stringify(value)+'\n',bytes=Buffer.byteLength(text);if(bytes>LIMIT.frame||(wireBytes+=bytes)>LIMIT.wire)fail('wire bound');await new Promise((resolve,reject)=>process.stdout.write(text,error=>error?reject(error):resolve()));}
async function artifactPass(root,row,index,emit,expectedState){
  if(!safePath(row.path)||!Number.isInteger(row.bytes)||row.bytes<0||row.bytes>LIMIT.output)fail('bounded original artifact required');
  const parts=row.path.split('/'),ancestors=[];let directory=root;const rootState=fs.lstatSync(root);if(!rootState.isDirectory()||rootState.isSymbolicLink())fail('artifact root');ancestors.push({path:root,state:rootState});
  for(let at=0;at<parts.length-1;at++){directory=join(directory,parts[at]);const state=fs.lstatSync(directory);if(!state.isDirectory()||state.isSymbolicLink())fail('artifact ancestor');ancestors.push({path:directory,state});}
  const file=join(root,row.path),before=fs.lstatSync(file);if(!before.isFile()||before.isSymbolicLink()||before.size!==row.bytes||expectedState&&!sameFile(before,expectedState))fail('original artifact identity');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW),digest=createHash('sha256');let offset=0,chunks=0;
  try{
    if(!sameFile(before,fs.fstatSync(fd)))fail('artifact fd identity');
    while(offset<row.bytes){
      const count=Math.min(65536,row.bytes-offset),bytes=Buffer.alloc(count);let read=0;while(read<count){const n=fs.readSync(fd,bytes,read,count-read,offset+read);if(!Number.isInteger(n)||n<1||n>count-read)fail('artifact read count');read+=n;}
      let end=count;
      if(offset+count<row.bytes){let start=count-1;while(start>=0&&(bytes[start]&192)===128)start--;if(start<0)fail('artifact UTF8 boundary');const lead=bytes[start],width=lead<128?1:lead>=194&&lead<=223?2:lead>=224&&lead<=239?3:lead>=240&&lead<=244?4:1;if(start+width>count)end=start;}
      if(end<1)fail('artifact chunk progress');const raw=bytes.subarray(0,end),text=exactText(raw);if(text.length>LIMIT.chunk)fail('artifact text chunk bound');digest.update(raw);if(emit)await line({kind:'chunk',index,chunk:chunks,text,sha256:hash(raw)});chunks++;offset+=end;
    }
    if(chunks===0){digest.update(Buffer.alloc(0));if(emit)await line({kind:'chunk',index,chunk:0,text:'',sha256:hash('')});chunks=1;}
    if(fs.readSync(fd,Buffer.alloc(1),0,1,offset)!==0||!sameFile(before,fs.fstatSync(fd)))fail('artifact changed during pass');
  }finally{fs.closeSync(fd);}
  if(digest.digest('hex')!==row.sha256||!sameFile(before,fs.lstatSync(file)))fail('complete original artifact digest/path');for(const parent of ancestors)if(!sameDirectory(parent.state,fs.lstatSync(parent.path)))fail('artifact ancestor changed');stable();return {chunks,state:before};
}
function message(error){if(!error||typeof error!=='object'||types.isProxy(error))return 'unclassified failure';const field=Object.getOwnPropertyDescriptor(error,'message');return field&&Object.hasOwn(field,'value')&&typeof field.value==='string'?field.value.slice(0,4096):'unclassified failure';}
async function main(){
  if(typeof ORIGINAL_ROOT!=='string'||typeof TASK_ROOT!=='string')fail('private launch bindings missing');
  let inputBytes=0;const input=[];for await(const chunk of process.stdin){if((inputBytes+=chunk.length)>LIMIT.input)fail('input wire bound');input.push(chunk);}
  const inputRaw=Buffer.concat(input),inputText=exactText(inputRaw);requestDigest=hash(inputRaw);const request=readRequest(inputText);input.length=0;
  work=fs.mkdtempSync(join(TASK_ROOT,'child-'));const compilerRoot=join(work,'compiler'),applicationRoot=join(work,'application');fs.mkdirSync(compilerRoot,{mode:0o700});fs.mkdirSync(applicationRoot,{mode:0o700});
  const packed=readRegular(ORIGINAL_ROOT,REGISTRY_PATH,1048576,sourceRecords);if(hash(packed)!==REGISTRY_GZIP_SHA256)fail('registry archive changed');const raw=gunzipSync(packed,{maxOutputLength:1048576});if(hash(raw)!==REGISTRY_RAW_SHA256)fail('registry decoded changed');const registry=JSON.parse(exactText(raw));
  if(registry.schema!=='original-project-isolated-compiler-v1'||registry.sourceHead!==SOURCE_HEAD||registry.typescriptVersion!=='5.9.3'||registry.sources.length!==registry.files||registry.files>LIMIT.compilerFiles||registry.totalBytes>LIMIT.compiler)fail('complete fixed registry required');
  const tsRoot=fs.realpathSync(join(ORIGINAL_ROOT,'packages/javascript/node_modules/typescript')),seen=new Set();let copied=0;
  for(const row of registry.sources){if(!safePath(row.path)||seen.has(row.path)||!['compiler','typescript'].includes(row.origin)||!['100644','100755'].includes(row.mode)||!Number.isInteger(row.bytes)||row.bytes<0||row.bytes>LIMIT.compilerFile)fail('registry row');seen.add(row.path);const root=row.origin==='typescript'?tsRoot:ORIGINAL_ROOT,path=row.origin==='typescript'?row.path.slice('packages/javascript/node_modules/typescript/'.length):row.path;if(row.origin==='typescript'&&!row.path.startsWith('packages/javascript/node_modules/typescript/'))fail('TS source route');const bytes=verifyRow(row,root,path,sourceRecords);copied+=bytes.length;if(copied>LIMIT.compiler)fail('compiler aggregate bound');fs.writeFileSync(outputPath(compilerRoot,row.path),bytes,{flag:'wx',mode:row.mode==='100755'?0o555:0o444});}
  if(copied!==registry.totalBytes)fail('compiler census changed');const index=freshIndex(compilerRoot,registry.sources);compilerReadOnly(compilerRoot);
  for(const row of registry.sources)verifyRow(row,compilerRoot,row.path,snapshotRecords);current(sourceRecords);stable();
  for(const row of request.sourceFiles){fs.writeFileSync(outputPath(applicationRoot,row.path),row.source,{flag:'wx',mode:0o600});const bytes=readRegular(applicationRoot,row.path,LIMIT.file,applicationRecords);if(exactText(bytes)!==row.source)fail('materialized source association');}
  process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=compilerRoot;process.env.HOME=work;process.env.TMPDIR=work;process.chdir(applicationRoot);
  // Canonical production ESM entry, including its actual TLA/core source rules.
  const bulk=await import(pathToFileURL(join(compilerRoot,'tools/translation/bulk.mjs')).href);
  const corpusModule=await import(pathToFileURL(join(compilerRoot,'tools/translation/source-corpus.mjs')).href);
  const paths=request.sourceFiles.filter(row=>row.path.endsWith('.rs')).map(row=>row.path),sourceCorpus=corpusModule.captureSourceCorpus({root:applicationRoot,paths});
  const plan=bulk.planRegeneration({root:applicationRoot,sources:paths,entries:request.entries,compilationProfile:null,sourceCorpus});
  if(plan.outputs.length>LIMIT.outputs||plan.expectedBytes>LIMIT.output)fail('artifact aggregate bound');const applied=bulk.applyRegenerationPlan(plan,{check:false});if(applied.failures.length)fail('original output application failed');stable();
  for(const row of registry.sources){const origin=row.origin==='typescript'?tsRoot:ORIGINAL_ROOT,path=row.origin==='typescript'?row.path.slice('packages/javascript/node_modules/typescript/'.length):row.path;verifyRow(row,origin,path,sourceRecords);verifyRow(row,compilerRoot,row.path,snapshotRecords);}
  for(const row of request.sourceFiles){const bytes=readRegular(applicationRoot,row.path,LIMIT.file,applicationRecords);if(exactText(bytes)!==row.source)fail('original input changed during compilation');}current(applicationRecords);
  if(git(compilerRoot,['ls-files','--stage','-z'])!==index)fail('compiler index changed');current(sourceRecords);current(snapshotRecords);stable();
  await line({kind:'header',schema:'original-project-child-output-v1',engine:ENGINE,sourceHead:SOURCE_HEAD,registrySha256:REGISTRY_RAW_SHA256,requestSha256:requestDigest,artifacts:plan.outputs.length,artifactBytes:plan.expectedBytes});
  let total=0;
  for(let at=0;at<plan.outputs.length;at++){
    const output=plan.outputs[at];if((total+=output.bytes)>LIMIT.output)fail('artifact aggregate byte bound');const first=await artifactPass(applicationRoot,output,at,false);
    await line({kind:'artifact',index:at,path:output.path,bytes:output.bytes,sha256:output.sha256,chunks:first.chunks});
    const second=await artifactPass(applicationRoot,output,at,true,first.state);if(second.chunks!==first.chunks)fail('artifact chunk census changed');
  }
  if(total!==plan.expectedBytes)fail('artifact final byte census');current(sourceRecords);current(snapshotRecords);current(applicationRecords);stable();
  await line({kind:'complete',sourceHead:SOURCE_HEAD,registrySha256:REGISTRY_RAW_SHA256,requestSha256:requestDigest,artifacts:plan.outputs.length,artifactBytes:total,sourceFiles:request.sourceFiles.map(row=>({path:row.path,sha256:hash(row.source),bytes:Buffer.byteLength(row.source)})),snapshotFiles:registry.files,issuerContextEscaped:false,semanticAuthority:false});
}
try{await main();}catch(error){try{await line({kind:'error',message:message(error),sourceHead:SOURCE_HEAD,requestSha256:requestDigest});}catch{}process.exitCode=1;}
finally{if(work)try{removeOwned(work);}catch{process.exitCode=1;}}
