#!/usr/bin/env node
// Drive the existing checked translators sequentially. A successful draft
// synchronization never certifies whole-source behavior or unlocks Rust CI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const implementationRoot=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const directions=new Set(['both','javascript-to-rust','rust-to-javascript']);
const MAX_INPUT_BYTES=256*1024*1024;
function git(root,args,input) {
  const result=spawnSync('git',args,{cwd:root,input,maxBuffer:MAX_INPUT_BYTES,timeout:30_000});
  if(result.status!==0)throw Error(result.error?.message??result.stderr.toString()??'Git input capture failed');
  return result.stdout;
}
function relativeName(name) {
  if(!name||path.isAbsolute(name)||name.includes('\\')||/[\x00-\x1f]/u.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Invalid original source path');
  return name;
}
function protectedInput(name) {
  // These exact Rust paths are already owned by buildArtifacts(). Other Rust
  // files in this directory remain protected original inputs.
  if(name==='src/generated_js_first/policy.rs'||name==='src/generated_js_first/mod.rs')return false;
  return name.endsWith('.rs')||/(^|\/)Cargo\.(?:toml|lock)$/u.test(name)
    ||name.startsWith('packages/javascript/native/')
    ||name.startsWith('packages/javascript/portable/')
    ||name.startsWith('packages/javascript/schemas/')
    ||name.startsWith('parity/fixtures/js-first/')
    ||/^packages\/javascript\/[^/]+\.(?:json|d\.ts|mjs|js|cjs)$/u.test(name);
}
function originalFileStatus(root,name) {
  let ancestor=root;
  const parts=name.split('/');
  for(const [index,part] of parts.entries()) {
    ancestor=path.join(ancestor,part);
    let status;
    try{status=fs.lstatSync(ancestor);}catch(error){if(error.code==='ENOENT')return null;throw error;}
    if(status.isSymbolicLink())throw Error('Linked original synchronization source refused: '+name);
    if(index<parts.length-1&&!status.isDirectory())throw Error('Original source ancestor must be a directory: '+name);
    if(index===parts.length-1){if(!status.isFile())throw Error('Original synchronization source must be a regular file: '+name);return status;}
  }
}
export function captureSyncInputs(root) {
  const head=git(root,['rev-parse','HEAD']).toString().trim();
  const names=[...new Set(git(root,['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(name=>name&&protectedInput(name)))].sort();
  if(names.length>32768)throw Error('Original synchronization input inventory is too large');
  const status=new Map(names.map(name=>[name,originalFileStatus(root,relativeName(name))]));
  const missing=names.filter(name=>status.get(name)===null),blobs=new Map();
  if(missing.length) {
    const bytes=git(root,['cat-file','--batch'],missing.map(name=>head+':'+relativeName(name)+'\n').join(''));let offset=0;
    for(const name of missing){const end=bytes.indexOf(10,offset),fields=bytes.subarray(offset,end).toString().split(' '),length=Number(fields[2]);if(end<0||fields[1]!=='blob'||!Number.isSafeInteger(length)||length<0)throw Error('Missing original source input: '+name);offset=end+1;blobs.set(name,bytes.subarray(offset,offset+length));offset+=length;if(bytes[offset++]!==10)throw Error('Invalid original Git object boundary');}
    if(offset!==bytes.length)throw Error('Trailing original Git object bytes');
  }
  let total=0;
  const files=names.map(name=>{
    relativeName(name);const absolute=path.join(root,name);
    const bytes=blobs.get(name)??fs.readFileSync(absolute);total+=bytes.length;
    if(bytes.length>32*1024*1024||total>MAX_INPUT_BYTES)throw Error('Original synchronization inputs exceed bounded capture');
    return {path:name,storage:blobs.has(name)?'original-HEAD-sparse-fallback':'worktree',bytes:bytes.length,sha256:hash(bytes)};
  });
  return {head,files,totalBytes:total};
}
function producer(module,expression,root,check) {
  const url=pathToFileURL(path.join(implementationRoot,module)).href;
  return ['--input-type=module','--eval',`import * as producer from ${JSON.stringify(url)};const root=process.argv[1],check=process.argv[2]==='true';${expression}`,root,String(check)];
}
export function synchronizationSteps({root,direction='both',check=false,profiles=true}={}) {
  root=path.resolve(root);
  if(!directions.has(direction)||typeof check!=='boolean'||typeof profiles!=='boolean')throw Error('Invalid synchronization options');
  const steps=[];
  if(direction!=='rust-to-javascript') {
    steps.push({id:'javascript-meta-rust',timeoutMs:120_000,args:producer('scripts/regenerate-js-first.mjs',`const result=producer.regenerate(root,{check});console.log(JSON.stringify(result));if(check&&result.changed.length)process.exitCode=1;`,root,check)});
    steps.push({id:'javascript-meta-typescript',timeoutMs:300_000,args:producer('tools/translation/js-to-rust/native-typescript.mjs',`const result=producer.regenerateNativeTypeScript(root,{sourceRoot:root,check});console.log(JSON.stringify(result));if(check&&(result.changed.length||result.unexpected.length))process.exitCode=1;`,root,check)});
  }
  if(direction!=='javascript-to-rust') {
    const base=[path.join(implementationRoot,'scripts/translate-router.mjs'),'--root',root,'--progress',...(check?['--check']:[])];
    steps.push({id:'rust-meta-javascript-typescript',timeoutMs:2_400_000,args:base});
    if(profiles)steps.push({id:'rust-platform-matrix',timeoutMs:3_600_000,args:[...base,'--profile-matrix']});
    steps.push({id:'original-affinity-schema',timeoutMs:600_000,args:producer('tools/translation/serialization-schema/native-descriptor.mjs',`console.log(JSON.stringify(await producer.produceNativeAffinityDescriptor({root,write:!check})));`,root,check)});
    steps.push({id:'original-serialization-registry',timeoutMs:600_000,args:producer('tools/translation/serialization-schema/bulk.mjs',`console.log(JSON.stringify(producer.produceBulkSerialization({root,write:!check})));`,root,check)});
  }
  return steps;
}
export function syncRouter({root=implementationRoot,direction='both',check=false,profiles=true,outputDirectory,onProgress}={}) {
  root=fs.realpathSync(path.resolve(root));
  const steps=synchronizationSteps({root,direction,check,profiles});
  const output=outputDirectory?path.resolve(outputDirectory):fs.mkdtempSync(path.join(os.tmpdir(),'router-sync-'));
  if(outputDirectory){if(fs.existsSync(output))throw Error('Synchronization receipt directory already exists');fs.mkdirSync(output,{recursive:true});}
  const before=captureSyncInputs(root),records=[];let failed=false;
  fs.writeFileSync(path.join(output,'inputs-before.json'),JSON.stringify(before,null,2)+'\n');
  const started=performance.now();
  for(const [index,step] of steps.entries()) {
    if(failed){records.push({id:step.id,status:'unrun-prerequisite-failure',mandatory:true});continue;}
    onProgress?.({stage:step.id,state:'start',check});
    if(JSON.stringify(captureSyncInputs(root))!==JSON.stringify(before)){records.push({id:step.id,status:'failed',mandatory:true,error:'Original input changed before producer execution',originalInputsUnchanged:false,logs:[]});failed=true;continue;}
    const stageStarted=performance.now();
    const result=spawnSync(process.execPath,step.args,{cwd:root,timeout:step.timeoutMs,maxBuffer:8*1024*1024});
    const logs=[];
    for(const [name,bytes] of [['stdout',result.stdout??Buffer.alloc(0)],['stderr',result.stderr??Buffer.alloc(0)]]){const filename=String(index).padStart(2,'0')+'-'+step.id+'.'+name+'.raw.log';fs.writeFileSync(path.join(output,filename),bytes,{flag:'wx'});logs.push({path:filename,bytes:bytes.length,sha256:hash(bytes)});}
    const record={id:step.id,mandatory:true,status:result.status===0&&!result.error?'passed':'failed',command:[process.execPath,...step.args],exitCode:result.status,signal:result.signal,error:result.error?.message??null,timeoutMs:step.timeoutMs,elapsedSeconds:(performance.now()-stageStarted)/1000,logs};
    if(record.status==='passed') {
      try {
        const current=captureSyncInputs(root);fs.writeFileSync(path.join(output,String(index).padStart(2,'0')+'-inputs-after.json'),JSON.stringify(current,null,2)+'\n');
        record.originalInputsUnchanged=JSON.stringify(before)===JSON.stringify(current);
        if(!record.originalInputsUnchanged){record.status='failed';record.error='Original input changed during synchronization';}
      } catch(error){record.status='failed';record.originalInputsUnchanged=false;record.error=error.message;}
    }
    records.push(record);failed=record.status!=='passed';
    onProgress?.({stage:step.id,state:'end',status:record.status,elapsedSeconds:record.elapsedSeconds});
  }
  let after,inputError=null;
  try{after=captureSyncInputs(root);}catch(error){inputError=error.message;}
  const inputsUnchanged=after!==undefined&&JSON.stringify(before)===JSON.stringify(after);
  const receipt={schema:'router-translation-sync-v1',root,direction,mode:check?'check':'write',profiles,directory:output,records,originalInputsUnchanged:inputsUnchanged,inputError,elapsedSeconds:(performance.now()-started)/1000,exitCode:failed||!inputsUnchanged?1:0,artifactsCurrent:check&&!failed&&inputsUnchanged,scope:'Checked translator drafts; explicit refusals and handwritten original bodies remain. This receipt does not certify whole-source synchronization.',runtimeParity:false,wholeSourceSynchronization:false,fullGatePass:false,rustExecuted:false};
  if(after)fs.writeFileSync(path.join(output,'inputs-after.json'),JSON.stringify(after,null,2)+'\n');
  fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return receipt;
}
function main() {
  const args=process.argv.slice(2),options={};let mode;
  for(let i=0;i<args.length;i++){
    const flag=args[i];
    if(flag==='--check'||flag==='--write'){if(mode)throw Error('Specify exactly one synchronization mode');mode=flag;options.check=flag==='--check';}
    else if(flag==='--canonical-only')options.profiles=false;
    else if(['--root','--direction','--output'].includes(flag)&&args[i+1]&&!args[i+1].startsWith('--'))options[{'--root':'root','--direction':'direction','--output':'outputDirectory'}[flag]]=args[++i];
    else throw Error('Usage: sync-router.mjs (--check|--write) [--root ROOT] [--direction both|javascript-to-rust|rust-to-javascript] [--canonical-only] [--output NEW_DIRECTORY]');
  }
  if(!mode)throw Error('An explicit --check or --write mode is required');
  const result=syncRouter({...options,onProgress:record=>process.stderr.write(JSON.stringify(record)+'\n')});
  console.log(JSON.stringify({receipt:path.join(result.directory,'receipt.json'),exitCode:result.exitCode,artifactsCurrent:result.artifactsCurrent,originalInputsUnchanged:result.originalInputsUnchanged,wholeSourceSynchronization:false,rustExecuted:false}));process.exitCode=result.exitCode;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
