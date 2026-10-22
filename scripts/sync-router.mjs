#!/usr/bin/env node
// Drive the existing checked translators sequentially. A successful draft
// synchronization never certifies whole-source behavior or unlocks Rust CI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const implementationRoot=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const directions=new Set(['both','javascript-to-rust','rust-to-javascript']);
const MAX_INPUT_BYTES=256*1024*1024;
const MAX_FILE_BYTES=32*1024*1024,MAX_INPUT_PATHS=32768;
const affinityDescriptor='js/src/affinity-schema-descriptor.mjs';
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
  // Exclude only exact producer-owned outputs. Their handwritten neighbors
  // remain original inputs, including other native descriptors and Rust files.
  if(/^(?:rust\/)?src\/generated_js_first\/(?:policy|mod)\.rs$/u.test(name)
    ||name==='tools/translation/js-to-rust/generated/owned-core-witness.rs'
    ||name==='tools/translation/js-to-rust/generated/owned-base64-witness.rs'
    ||name==='tools/translation/js-to-rust/generated/owned-ascii-witness.rs'
    ||name===affinityDescriptor)return false;
  return name.endsWith('.rs')||/(^|\/)Cargo\.(?:toml|lock)$/u.test(name)
    ||name.startsWith('js/src/')
    ||name.startsWith('js/portable/')
    ||name.startsWith('js/schemas/')
    ||name.startsWith('parity/fixtures/js-first/')
    ||/^js\/[^/]+\.(?:json|d\.ts|mjs|js|cjs)$/u.test(name);
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
function originalBytes(root,name,status,remaining) {
  if(status.size>MAX_FILE_BYTES||status.size>remaining)throw Error('Original synchronization inputs exceed bounded capture');
  const fd=fs.openSync(path.join(root,name),fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  const chunks=[],buffer=Buffer.alloc(64*1024);let length=0;
  try {
    let count;
    while((count=fs.readSync(fd,buffer,0,Math.min(buffer.length,Math.min(MAX_FILE_BYTES,remaining)-length+1),null))!==0) {
      length+=count;
      if(length>MAX_FILE_BYTES||length>remaining)throw Error('Original synchronization inputs exceed bounded capture');
      chunks.push(Buffer.from(buffer.subarray(0,count)));
    }
  } finally {fs.closeSync(fd);}
  return Buffer.concat(chunks,length);
}
export function captureSyncInputs(root) {
  // Ownership does not permit linked generated inputs or linked ancestors.
  originalFileStatus(root,affinityDescriptor);
  const head=git(root,['rev-parse','HEAD']).toString().trim();
  const names=[...new Set(git(root,['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(name=>name&&protectedInput(name)))].sort();
  if(names.length>MAX_INPUT_PATHS)throw Error('Original synchronization input inventory is too large');
  const status=new Map(names.map(name=>[name,originalFileStatus(root,relativeName(name))]));
  const missing=names.filter(name=>status.get(name)===null),blobs=new Map();
  if(missing.length) {
    const bytes=git(root,['cat-file','--batch'],missing.map(name=>head+':'+relativeName(name)+'\n').join(''));let offset=0;
    for(const name of missing){const end=bytes.indexOf(10,offset),fields=bytes.subarray(offset,end).toString().split(' '),length=Number(fields[2]);if(end<0||fields[1]!=='blob'||!Number.isSafeInteger(length)||length<0)throw Error('Missing original source input: '+name);offset=end+1;blobs.set(name,bytes.subarray(offset,offset+length));offset+=length;if(bytes[offset++]!==10)throw Error('Invalid original Git object boundary');}
    if(offset!==bytes.length)throw Error('Trailing original Git object bytes');
  }
  let total=0;
  const files=names.map(name=>{
    relativeName(name);
    const bytes=blobs.get(name)??originalBytes(root,name,status.get(name),MAX_INPUT_BYTES-total);total+=bytes.length;
    if(bytes.length>MAX_FILE_BYTES||total>MAX_INPUT_BYTES)throw Error('Original synchronization inputs exceed bounded capture');
    return {path:name,storage:blobs.has(name)?'original-HEAD-sparse-fallback':'worktree',bytes:bytes.length,sha256:hash(bytes)};
  });
  return {head,files,totalBytes:total};
}
function producer(module,expression,root,check) {
  const url=pathToFileURL(path.join(implementationRoot,module)).href;
  return ['--input-type=module','--eval',`import * as producer from ${JSON.stringify(url)};const root=process.argv[1],check=process.argv[2]==='true';${expression}`,root,String(check)];
}
function affinityDescriptorInput(root) {
  const descriptor=path.join(root,affinityDescriptor);
  if(fs.existsSync(descriptor)||fs.existsSync(path.join(root,'js/src/affinity-schema.mjs')))return true;
  const native=path.join(root,'js/src');
  if(!fs.existsSync(native))return false;
  let ancestor=root;
  for(const component of ['js','src']) {
    ancestor=path.join(ancestor,component);
    if(fs.lstatSync(ancestor).isSymbolicLink())throw Error('Linked original synchronization source refused: '+ancestor);
  }
  let visited=1,bytes=0,compiler;
  const visit=directory=>{
    if(fs.lstatSync(directory).isSymbolicLink())throw Error('Linked original synchronization source refused: '+directory);
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      if(++visited>MAX_INPUT_PATHS)throw Error('Original synchronization input inventory is too large');
      const filename=path.join(directory,entry.name);
      if(entry.isSymbolicLink())throw Error('Linked original synchronization source refused: '+filename);
      if(entry.isDirectory()){if(visit(filename))return true;continue;}
      if(!entry.isFile()||!entry.name.endsWith('.mjs'))continue;
      const name=relativeName(path.relative(root,filename)),status=originalFileStatus(root,name);
      const source=originalBytes(root,name,status,MAX_INPUT_BYTES-bytes);bytes+=source.length;
      // Planning runs before producer children can bind their source root.
      // Use this receiving project's dependencies, including in an exported
      // CLI whose inherited compiler source-root environment is unrelated.
      if(compiler===undefined){
        const receivingPackage=path.join(root,'js/package.json');
        const receivingRequire=createRequire(receivingPackage);
        const missing=()=>{
          const error=new Error("Cannot find module 'typescript' in receiving dependency search paths\nRequire stack:\n- "+receivingPackage);
          error.code='MODULE_NOT_FOUND';return error;
        };
        let installed;
        for(const searchRoot of receivingRequire.resolve.paths('typescript')??[]){
          const candidate=path.join(searchRoot,'typescript');
          if(fs.existsSync(candidate)&&fs.statSync(candidate).isDirectory()){installed=fs.realpathSync(candidate);break;}
        }
        // Bun can auto-resolve a missing bare package from its cache. Never
        // request that resolution before finding a real receiving dependency.
        if(installed===undefined)throw missing();
        const metadata=path.join(installed,'package.json');
        const descriptor=fs.openSync(metadata,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
        let packageData;
        try{
          const status=fs.fstatSync(descriptor);
          if(!status.isFile()||status.size>1048576)throw Error('Receiving TypeScript package metadata exceeds its bounded scope');
          const bytes=Buffer.alloc(1048577);let count=0;
          while(count<bytes.length){const read=fs.readSync(descriptor,bytes,count,bytes.length-count,null);if(!read)break;count+=read;}
          if(count>1048576)throw Error('Receiving TypeScript package metadata exceeds its bounded scope');
          packageData=JSON.parse(bytes.subarray(0,count).toString('utf8'));
        }finally{fs.closeSync(descriptor);}
        if(packageData===null||typeof packageData!=='object'||Array.isArray(packageData))throw Error('Invalid receiving TypeScript package metadata');
        if(Object.hasOwn(packageData,'exports'))throw Error('Unsupported receiving TypeScript package exports; pinned compiler main resolution is required');
        const resolved=receivingRequire.resolve(installed),actual=fs.realpathSync(resolved);
        const relative=path.relative(installed,actual);
        if(relative===''||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw missing();
        compiler=receivingRequire(resolved);
      }
      const ts=compiler;
      const file=ts.createSourceFile('module-ownership.mjs',source.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      if(file.parseDiagnostics.length)throw new Error('invalid module ownership syntax');
      for(const statement of file.statements) {
        if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
        const specifier=statement.moduleSpecifier;
        if(specifier&&ts.isStringLiteral(specifier)&&(specifier.text.startsWith('./')||specifier.text.startsWith('../'))
          &&path.resolve(path.dirname(filename),specifier.text)===descriptor)return true;
      }
    }
    return false;
  };
  return visit(native);
}
export function synchronizationSteps({root,direction='both',check=false,profiles=true}={}) {
  root=path.resolve(root);
  if(!directions.has(direction)||typeof check!=='boolean'||typeof profiles!=='boolean')throw Error('Invalid synchronization options');
  originalFileStatus(root,affinityDescriptor);
  const steps=[];
  // Every reverse producer now consumes the explicit owned application profile.
  // Its own full source/runtime snapshot is re-read before artifact packaging;
  // forward-generated receiving inputs are not mislabelled handwritten inputs.
  const reverse=id=>({id,timeoutMs:120_000,args:producer('scripts/regenerate-js-first.mjs',`const result=producer.regenerate(root,{check});console.log(JSON.stringify(result));if(check&&result.changed.length)process.exitCode=1;`,root,check)});
  const affinity=(checkOnly=false)=>({id:'original-affinity-schema',timeoutMs:600_000,args:producer('tools/translation/serialization-schema/native-descriptor.mjs',`console.log(JSON.stringify(await producer.produceNativeAffinityDescriptor({root,write:!check})));`,root,check||checkOnly)});
  // The native descriptor is itself a reverse input. Its complete source
  // context also includes generated policy Rust, so establish that first.
  // Both full reverse passes retain all artifacts; only their cheap duplicate
  // work is intentional, never a second canonical or matrix translation.
  const affinityInput=direction==='javascript-to-rust'&&affinityDescriptorInput(root);
  if(direction==='both'||direction==='javascript-to-rust'&&affinityInput) {
    steps.push(reverse('javascript-meta-rust-preparation'));
    steps.push(affinity(direction==='javascript-to-rust'));
  } else if(direction==='rust-to-javascript')steps.push(affinity());
  if(direction!=='rust-to-javascript') {
    steps.push(reverse('javascript-meta-rust'));
    steps.push({id:'javascript-meta-typescript',timeoutMs:300_000,args:producer('tools/translation/js-to-rust/native-typescript.mjs',`const result=producer.regenerateNativeTypeScript(root,{sourceRoot:root,check});console.log(JSON.stringify(result));if(check&&(result.changed.length||result.unexpected.length))process.exitCode=1;`,root,check)});
  }
  if(direction!=='javascript-to-rust') {
    const base=[path.join(implementationRoot,'scripts/translate-router.mjs'),'--root',root,'--progress',...(check?['--check']:[])];
    steps.push({id:'rust-meta-javascript-typescript',timeoutMs:2_400_000,args:base});
    if(profiles)steps.push({id:'rust-platform-matrix',timeoutMs:3_600_000,args:[...base,'--profile-matrix']});
    steps.push({id:'original-serialization-registry',timeoutMs:600_000,args:producer('tools/translation/serialization-schema/bulk.mjs',`console.log(JSON.stringify(producer.produceBulkSerialization({root,write:!check})));`,root,check)});
  }
  return steps;
}
function retainedLog(filename) {
  const digest=createHash('sha256'),buffer=Buffer.alloc(64*1024);let bytes=0;
  const fd=fs.openSync(filename,'r');
  try {let count;while((count=fs.readSync(fd,buffer,0,buffer.length,null))!==0){digest.update(buffer.subarray(0,count));bytes+=count;}}
  finally {fs.closeSync(fd);}
  return {bytes,sha256:digest.digest('hex')};
}
// The same runner serves the complete CLI and bounded individual producer
// diagnostics. It never changes a planned command, deadline or check mode.
export function runSynchronizationProducer({root,step,outputDirectory,index=0}={}) {
  if(!step||!Array.isArray(step.args)||!step.args.every(value=>typeof value==='string')
    ||typeof step.id!=='string'||!/^[a-z0-9-]+$/u.test(step.id)
    ||!Number.isSafeInteger(step.timeoutMs)||step.timeoutMs<1||step.timeoutMs>3_600_000
    ||!Number.isSafeInteger(index)||index<0||index>32768)throw Error('Invalid synchronization producer');
  const started=performance.now(),created=[],fds=[];let result,runnerError;
  try {
    originalFileStatus(root,affinityDescriptor);
    for(const stream of ['stdout','stderr']) {
      const filename=String(index).padStart(2,'0')+'-'+step.id+'.'+stream+'.raw.log';
      const fd=fs.openSync(path.join(outputDirectory,filename),'wx');fds.push(fd);created.push(filename);
    }
    result=spawnSync(process.execPath,step.args,{cwd:root,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:root},timeout:step.timeoutMs,stdio:['ignore',...fds]});
  } catch(error){runnerError=error;}
  finally {for(const fd of fds)fs.closeSync(fd);}
  const logs=created.map(filename=>({path:filename,...retainedLog(path.join(outputDirectory,filename))}));
  return {id:step.id,mandatory:true,status:result?.status===0&&!result.error&&!runnerError?'passed':'failed',command:[process.execPath,...step.args],exitCode:result?.status??null,signal:result?.signal??null,error:runnerError?.message??result?.error?.message??null,timeoutMs:step.timeoutMs,elapsedSeconds:(performance.now()-started)/1000,logs};
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
    const record=runSynchronizationProducer({root,step,outputDirectory:output,index});
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
  const receipt={schema:'router-translation-sync-v1',root,direction,mode:check?'check':'write',profiles,directory:output,records,originalInputsUnchanged:inputsUnchanged,inputError,elapsedSeconds:(performance.now()-started)/1000,exitCode:failed||!inputsUnchanged?1:0,artifactsCurrent:check&&!failed&&inputsUnchanged,ownedCoreProfile:'router-owned-core-reverse-v1; actual generated application discovery with full per-operation input reread and refusal inventory',scope:'Checked translator drafts; explicit refusals and handwritten original bodies remain. This receipt does not certify whole-source synchronization.',runtimeParity:false,wholeSourceSynchronization:false,fullGatePass:false,rustExecuted:false};
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
