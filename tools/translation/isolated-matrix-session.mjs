import {forwardFailureField} from './forward-output-ownership-20261101-failure.mjs';
import {readForwardCustodyText} from './forward-output-ownership-20261101.mjs';
import {captureForwardProducerFence} from './forward-output-ownership-20261101-inputs.mjs';
import {applyForwardMatrixParts} from './forward-output-ownership-20261101-matrix.mjs';
import {createForwardStagingClosure} from './forward-output-ownership-20261101-staging.mjs';
// Process lifetime and DATA custody only. Original compilers still perform all
// CST/meta, source, owner, type and body checks in each fresh sequential worker.
import stockFs from 'node:fs';
import stockProcesses from 'node:child_process';
import stockCrypto from 'node:crypto';
import {types} from 'node:util';
import {assertPrivateParserExecution} from './private-parser-execution.mjs';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compilationMatrixDescription} from './compilation-matrix.mjs';
import {captureSourceCorpus,sourceCorpusPaths,sourceCorpusText} from './forward-output-ownership-20261101-corpus.mjs';
import {discoverCompilerSourceInputs} from './compiler-source-inputs.mjs';
import {discoverSourceProfileInputs} from './source-profile-inputs.mjs';
import {translationProgressReporter} from './translation-progress.mjs';
const compilerRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),worker=fileURLToPath(new URL('./isolated-matrix-profile.mjs',import.meta.url));
const allowed=new Set(['bulk.mjs','retained-bulk.mjs','owned-definitions-bulk.mjs','retained-owned-definitions-bulk.mjs']);
const roots=['tools/translation/meta','js/generated/rust-draft','ts/generated/rust-draft','tools/translation/projects','js/generated/rust-project','ts/generated/rust-project'];
const ownedRoots=['tools/translation/generated/owned-definitions','js/generated/rust-owned-definitions','ts/generated/rust-owned-definitions'];
const hash=value=>createHash('sha256').update(value).digest('hex'),json=value=>JSON.stringify(value)+'\n';
const fail=message=>{throw TypeError('Isolated complete matrix: '+message);};
function safe(name){if(typeof name!=='string'||name.length>4096||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('unsafe relative source/output path');return name;}

// Explicit stock initialization, followed by fresh fences. No input verdict is
// cached: source checks run before each worker and once in the final batch.
const hostDescriptor=Object.getOwnPropertyDescriptor;
const hostPins=[...['execFileSync','spawnSync'].map(key=>[stockProcesses,key]),...['existsSync','lstatSync','mkdirSync','mkdtempSync','readFileSync','readdirSync','rmSync','writeFileSync'].map(key=>[stockFs,key]),[stockCrypto,'createHash'],[stockCrypto.Hash.prototype,'update'],[stockCrypto.Hash.prototype,'digest'],[process,'execPath'],[process,'env']].map(([owner,key])=>({owner,key,field:hostDescriptor(owner,key)}));
function stockHost(){
 if(Object.getOwnPropertyDescriptor!==hostDescriptor)fail('stock host descriptor changed');
 for(const {owner,key,field}of hostPins){const actual=hostDescriptor(owner,key);if(!actual||!field||actual.value!==field.value||actual.get!==field.get||actual.set!==field.set||actual.writable!==field.writable||actual.enumerable!==field.enumerable||actual.configurable!==field.configurable)fail('stock host operation changed: '+key);}
 assertPrivateParserExecution();
}
function physical(root,name){let path=root;for(const part of safe(name).split('/')){path=join(path,part);try{if(lstatSync(path).isSymbolicLink())fail('symbolic source/output path');}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;}}return path;}
function files(root,name){const path=physical(root,name);if(!existsSync(path))return [];const stat=lstatSync(path);if(!stat.isDirectory())fail('output root must be an ordinary directory');return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(root,name+'/'+entry.name):entry.isFile()?[safe(name+'/'+entry.name)]:fail('nonregular output child')).sort();}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function installedTypes(){
 const base=join(compilerRoot,'js/node_modules/typescript'),rows=[];let total=0;
 function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){const full=join(path,entry.name),stat=lstatSync(full);if(stat.isSymbolicLink())fail('linked installed TypeScript source');if(stat.isDirectory())walk(full);else{if(!stat.isFile()||stat.size>32*1024*1024||rows.length>=512)fail('installed TypeScript file bound');const bytes=readFileSync(full);total+=bytes.length;if(total>64*1024*1024)fail('installed TypeScript aggregate bound');rows.push({path:relative(base,full),bytes:bytes.length,sha256:hash(bytes)});}}}
 walk(base);rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);return rows;
}
export function createIsolatedMatrixSession({root,matrix,corpus,paths,entries,plannerModule,originalDeadline=Infinity}={}){
 root=resolve(root);const description=compilationMatrixDescription(matrix),selectedPaths=sourceCorpusPaths(corpus,root);
 if(!allowed.has(plannerModule)||JSON.stringify(paths)!==JSON.stringify(selectedPaths))fail('genuine complete source selection required');
 const owned=plannerModule.includes('owned-definitions'),outputRoots=owned?[...roots,...ownedRoots]:roots;
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000});
 let gitDirectory=null;
 if(existsSync(join(root,'.git')))gitDirectory=git('rev-parse','--absolute-git-dir').trim();
 function head(){if(!gitDirectory)return null;try{return git('rev-parse','--verify','--quiet','HEAD').trim();}catch(error){if(forwardFailureField(error,'status')!==1)throw error;return {unborn:true,branch:git('symbolic-ref','--quiet','HEAD').trim()};}}
 const state=()=>({head:head(),tracked:gitDirectory?git('ls-files','-z','--','*.rs').split('\0').filter(Boolean).sort():null,compiler:discoverCompilerSourceInputs({root:compilerRoot}),profiles:discoverSourceProfileInputs({root:compilerRoot}),typescript:installedTypes()});
 const originalFence=captureForwardProducerFence({root,sources:selectedPaths,sourceCorpus:corpus});
 const before=state(),selection={profiles:description.profiles.map(({name,compilationProfile})=>({name,compilationProfile})),requiredProfiles:description.requiredProfiles},records=new WeakMap();
 // Generated staging output obeys the original per-profile/aggregate bounds;
 // it is temporary generated storage, not an expanded verification archive.
 const ownedStage=originalFence.createOwnedStage(),staging=ownedStage.path,started=performance.now(),deadline=Math.min(originalDeadline,started+3600000);let closed=false,mirrorClosed=false,total=0;
 const mirror=createForwardStagingClosure(staging);
 function open(){stockHost();mirror.assertRoot();if(closed||lstatSync(staging).isSymbolicLink())fail('closed or replaced staging session');}
 function current(){
  open();originalFence.verify();const fresh=captureSourceCorpus({root,paths:selectedPaths});
  if(JSON.stringify(fresh)!==JSON.stringify(corpus)||JSON.stringify(state())!==JSON.stringify(before))fail('complete original source/compiler/TypeScript/Git inputs changed');
  for(const path of [...selectedPaths,...corpus.cargo.filter(row=>row.available).map(row=>row.source)])if(sourceCorpusText(fresh,root,path)!==sourceCorpusText(corpus,root,path))fail('complete original source text changed');
 }
 try{
  writeFileSync(join(staging,'.router-stage-owner.json'),json({schema:'router-private-matrix-staging-owner-v1',pid:process.pid,sourceRoot:root,staging,sourceSetSha256:corpus.sourceSetSha256,head:before.head,createdAt:new Date().toISOString(),rustExecuted:false}),{flag:'wx'});mirror.original('.router-stage-owner.json',readFileSync(join(staging,'.router-stage-owner.json'),'utf8'));
  for(const path of [...selectedPaths,...corpus.cargo.filter(row=>row.available).map(row=>row.source)]){const target=physical(staging,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,sourceCorpusText(corpus,root,path),{flag:'wx'});mirror.original(path,sourceCorpusText(corpus,root,path));}
  if(gitDirectory){writeFileSync(join(staging,'.git'),'gitdir: '+gitDirectory+'\n',{flag:'wx',mode:0o444});mirror.original('.git','gitdir: '+gitDirectory+'\n');}
 }catch(error){for(const cleanup of [()=>{mirror.close({removeRoot:false});mirrorClosed=true;},()=>ownedStage.close()])try{cleanup();}catch{try{process.stderr.write(JSON.stringify({schema:'router-forward-private-mirror-retained-v1',path:staging})+'\n');}catch{}}throw error;}
 function validate(plan){
  open();const record=records.get(plan);if(!record)fail('unissued staged byte plan');
  for(const output of plan.outputs){const path=physical(staging,output.path),stat=lstatSync(path);if(!stat.isFile()||stat.size!==output.bytes)fail('complete staged output byte size differs');const bytes=readFileSync(path);if(hash(bytes)!==output.sha256)fail('complete staged output bytes differ');physical(root,output.path);}
  const actual=[...plan.outputRoots.flatMap(name=>files(staging,name)),record.member.directory+'/parity/rust-source-inventory.json'].sort(),expected=plan.outputs.map(row=>row.path).sort();if(JSON.stringify(actual)!==JSON.stringify(expected))fail('complete staged output census differs');
  for(const name of plan.outputRoots)for(const path of files(root,name))physical(root,path);return plan;
 }
 function plan(options){
  open();if(options.root!==root||options.matrix!==matrix||options.sourceCorpus!==corpus||JSON.stringify(options.sources)!==JSON.stringify(selectedPaths)||JSON.stringify(options.entries)!==JSON.stringify(entries))fail('foreign source/matrix selection');
  const member=description.profiles.find(row=>row.directory===options.outputPrefix);if(!member||JSON.stringify(member.compilationProfile)!==JSON.stringify(options.compilationProfile))fail('foreign complete profile');
  current();const timeout=Math.floor(deadline-performance.now());if(timeout<1)fail('original complete matrix deadline');
  const request={schema:'router-isolated-profile-request-v1',root:staging,plannerModule,selection,matrixSha256:matrix.sha256,name:member.name,directory:member.directory,paths:selectedPaths,entries,corpus,progress:options.progress!==undefined&&options.progress!==null};
  const child=spawnSync(process.execPath,[worker],{cwd:staging,input:json(request),encoding:'utf8',maxBuffer:16*1024*1024,timeout,killSignal:'SIGTERM',env:{...process.env,NODE_OPTIONS:'--max-old-space-size=2048',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'core.hooksPath',GIT_CONFIG_VALUE_0:'/dev/null'}});
  if(child.status!==0||child.signal||child.error)throw Error('Fresh complete profile '+member.name+' failed: '+json({status:child.status,signal:child.signal,error:child.error?.message,stdout:child.stdout,stderr:child.stderr}));
  for(const line of child.stderr.split('\n').filter(Boolean)){const record=JSON.parse(line);if(record.schema!=='rust-meta-translation-progress-v1')fail('foreign profile diagnostic');const {schema,...event}=record;translationProgressReporter(options.progress)(event);}
  const result=JSON.parse(child.stdout);if(result.schema!=='router-isolated-profile-output-v1'||result.root!==staging||result.sourceSetSha256!==corpus.sourceSetSha256||result.matrixSha256!==matrix.sha256||result.name!==member.name||result.directory!==member.directory||result.semanticAuthority!==false||result.runtimeParity!==false||result.rustExecuted!==false)fail('complete profile custody equation differs');
  const value=result.plan,wantedRoots=outputRoots.map(name=>member.directory+'/'+name);if(value.schema!=='checked-bulk-output-plan-v1'||value.outputPrefix!==member.directory||JSON.stringify(value.outputRoots)!==JSON.stringify(wantedRoots)||!Array.isArray(value.outputs)||value.outputs.length>200000||!Number.isSafeInteger(value.expectedBytes)||value.expectedBytes<0||value.expectedBytes>512*1024*1024)fail('complete original output plan bounds differ');
  let bytes=0;const names=new Set();for(const row of value.outputs){safe(row.path);if(!(row.path===member.directory+'/parity/rust-source-inventory.json'||wantedRoots.some(name=>row.path.startsWith(name+'/')))||names.has(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>64*1024*1024||!(/^[a-f0-9]{64}$/u).test(row.sha256))fail('complete original output row differs');names.add(row.path);bytes+=row.bytes;}
  if(bytes!==value.expectedBytes||!value.manifest?.originalSourceCorpus||JSON.stringify(value.manifest.originalSourceCorpus.sources)!==JSON.stringify(corpus.sources)||JSON.stringify(value.manifest.originalSourceCorpus.cargo)!==JSON.stringify(corpus.cargo)||value.manifest.originalSourceCorpus.sourceSetSha256!==corpus.sourceSetSha256||JSON.stringify(value.manifest.compilationProfile)!==JSON.stringify(member.compilationProfile))fail('complete original profile/source manifest differs');
  total+=bytes;if(total>1024*1024*1024)fail('original complete matrix byte budget');

  const issued=freeze({...value,root});mirror.output(issued,result.materializationCustody,plannerModule);records.set(issued,{member,options:{...options,progress:undefined}});return issued;
 }
 function *sourceEntries(plan){validate(plan);current();for(const output of plan.outputs){const text=readForwardCustodyText(physical(staging,output.path),64*1024*1024);if(Buffer.byteLength(text)!==output.bytes||hash(text)!==output.sha256)fail('staged full output differs');yield [output.path,text];}current();}

 function checkedPlans(input){
  open();if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('complete ordinary selected profile array required');
  const fields=Object.getOwnPropertyDescriptors(input),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||length.value!==description.profiles.length||Reflect.ownKeys(fields).length!==length.value+1)fail('complete selected profile set required');
  const plans=[];for(let index=0;index<length.value;index++){const field=fields[index];if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('complete dense selected profile set required');const plan=field.value,record=records.get(plan);if(!record||record.member!==description.profiles[index])fail('unissued or reordered selected profile plan');plans.push(plan);}
  // No public callback or remembered source verdict crosses this boundary.
  // Every worker already ran its genuine original private-plan guards.
  for(const plan of plans)validate(plan);
  current();
  return plans;
 }
 function mutateOutputDirectories(targets,operation,{outputRoot=root}={}){
  open();if(!Array.isArray(targets)||typeof operation!=='function')fail('exact original receiving mutation required');
  const receiving=stockFs.realpathSync(resolve(outputRoot)),domains=['.router-forward-output-ownership','profiles/matrix-'+matrix.sha256+'.json'];
  for(const member of description.profiles){for(const name of outputRoots)domains.push(member.directory+'/'+name);domains.push(member.directory+'/parity/rust-source-inventory.json');}
  if(outputRoots.includes('tools/translation/generated/owned-definitions'))domains.push('profiles/owned-definitions-matrix-'+matrix.sha256+'.json');
  for(const target of targets){if(typeof target!=='string'||resolve(target)!==target)fail('absolute actual receiving target required');const name=relative(receiving,target).split(sep).join('/');if(!name||name==='..'||name.startsWith('../')||!domains.some(domain=>name===domain||name.startsWith(domain+'/')||domain.startsWith(name+'/')))fail('mutation escapes original private session output domain');}
  return originalFence.mutateOutputDirectories(targets,operation);
 }
 function applyAll(input,{check=false,outputRoot=root}={}){const plans=checkedPlans(input);const mutation=(targets,run)=>mutateOutputDirectories(targets,run,{outputRoot});return applyForwardMatrixParts({plans,check,sourceEntries,current,root,outputRoot,plannerModule,originalDeadline:deadline,mutateOutputDirectories:mutation,reissue:()=>{const originalTotal=total;total=0;try{return plans.map(value=>plan(records.get(value).options));}finally{total=originalTotal;}}});
 }
 function close(){if(!closed){if(!mirrorClosed){mirror.close({removeRoot:false});mirrorClosed=true;}ownedStage.close();originalFence.release();closed=true;}}
 return Object.freeze({plan,validate,checkedPlans,applyAll,sourceEntries,current,mutateOutputDirectories,close,deadline,recoveryPath:staging});
}
