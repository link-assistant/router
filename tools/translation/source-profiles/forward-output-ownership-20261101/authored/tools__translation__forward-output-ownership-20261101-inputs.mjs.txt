import {ownershipCompiler,ownershipCompilerRuntimeOriginData} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyOwnershipRuntimeOriginCurrent,captureOwnershipRuntimeSelectors} from './forward-output-ownership-20261101-native-origin.mjs';
import {accountForwardSourceProposalData} from './forward-output-ownership-20261101-source-accounting.mjs';
import {forwardFailureField} from './forward-output-ownership-20261101-failure.mjs';
import {readSelectedTrackedSourceBytes as readBoundedTrackedSourceBytes,withSelectedTrackedSourceOperation as withBoundedTrackedSourceOperation} from './selected-source-reader-20261101.mjs';
import {boundedSourceReadOpenFlags,checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
// Original producer input fence. Full source bytes, not digest permissions.
// SOURCE ONLY / UNRUN. Per-family original source/profile/compiler bounds stay.
import fs from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {sourceCorpusPaths,sourceCorpusText,SOURCE_CORPUS_LIMITS,discoverDefaultRustSourcePaths} from './forward-output-ownership-20261101-corpus.mjs';
import {withSelectedSourceIndexImage,selectedSourceIndexPaths,preloadSelectedSourceIndexInputs,readSelectedSourceRustPaths,readSelectedSourceInputListing} from './selected-source-reader-20261101-index.mjs';
import {captureSelectedSourceGitEnvelope,readSelectedSourceGitRows} from './selected-source-reader-20261101-metadata.mjs';
import {createForwardSourceDirectoryLedger} from './forward-output-ownership-20261101-directories.mjs';
import {locatePrivateNativeSource,readPrivateNativeSource} from './forward-output-ownership-20261101-native-data.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-storage.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {discoverCompilerSourceInputs} from './forward-output-ownership-20261101-discovery.mjs';
import {discoverSourceProfileInputs} from './forward-output-ownership-20261101-discovery.mjs';
const COMPILER=fileURLToPath(new URL('../../',import.meta.url)),MiB=1024*1024;let SHARING=null;
// Invocation-local immutable DATA sharing only. Every capture still performs
// the complete original fresh discovery, physical read and closing checks.
export function withForwardProducerSourceSharing(run){
 if(SHARING)return run();const previous=SHARING,group={files:new Map(),invalid:new Map(),fences:new Set()};SHARING=group;
 try{return run();}finally{SHARING=previous;group.files.clear();group.invalid.clear();group.fences.clear();}
}
const need=(value,message)=>{if(!value)throw TypeError('Forward producer input fence: '+message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const statFile=file=>fs.lstatSync(file,{bigint:true}),statFD=fd=>fs.fstatSync(fd,{bigint:true});
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());
// Preserve the old unused-options domain without invoking toJSON or retaining
// arbitrary object graphs. Used project limits already passed original storage
// checks; the recipe keeps only the same closed bounded numeric configuration.
export function captureForwardStorageRecipe(input,used){
 if(!used||input===undefined)return undefined;need(input&&typeof input==='object','original project-storage limit object required');const output={};
 for(const key of Object.keys(input)){need(Object.hasOwn(PROJECT_META_STORAGE_LIMITS,key),'unknown original project-storage limit');const value=input[key];need(Number.isSafeInteger(value)&&value>=1&&value<=PROJECT_META_STORAGE_LIMITS[key],'original project-storage limits may only narrow');output[key]=value;}
 return Object.freeze(output);
}
function close(operation,checks){let result,primary,failed=false;try{result=operation();}catch(error){primary=error;failed=true;}for(const check of checks)try{check();}catch(error){if(!failed){primary=error;failed=true;}}if(failed)throw primary;return result;}
function ordinary(root,name){need(typeof name==='string'&&name&&!/[\\\0\r\n:]/u.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'ordinary source path required');let full=root;for(const part of name.split('/')){full=join(full,part);try{const stat=statFile(full);need(!stat.isSymbolicLink()&&(full===join(root,name)||stat.isDirectory()),'linked source ancestor refused');}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;}}return full;}
function captureBytes(root,name,max){const full=ordinary(root,name),before=statFile(full);need(before.isFile()&&before.size<=BigInt(max),'bounded ordinary complete source required');checkBoundedSourcePath(full);const fd=fs.openSync(full,boundedSourceReadOpenFlags());return close(()=>{need(equal(stamp(before),stamp(statFD(fd))),'source replaced before open');const chunks=[];let at=0;while(at<Number(before.size)){const chunk=Buffer.alloc(Math.min(65536,Number(before.size)-at));let offset=0;while(offset<chunk.length){const count=fs.readSync(fd,chunk,offset,chunk.length-offset,at+offset);need(count>0,'source truncated');offset+=count;}chunks.push(chunk);at+=chunk.length;}need(fs.readSync(fd,Buffer.alloc(1),0,1,at)===0,'source grew');return {name,chunks,size:at,identity:stamp(before)};},[()=>need(equal(stamp(before),stamp(statFD(fd)))&&equal(stamp(before),stamp(statFile(full))),'complete source changed'),()=>fs.closeSync(fd)]);}
function bytes(root,name,max){
 const actual=captureBytes(root,name,max);if(!SHARING)return actual;const key=root+'\0'+name,previous=SHARING.files.get(key);
 if(previous&&equal(previous.identity,actual.identity)&&previous.size===actual.size&&previous.chunks.length===actual.chunks.length&&previous.chunks.every((chunk,index)=>chunk.equals(actual.chunks[index])))return previous;
 SHARING.files.set(key,actual);return actual;
}

function verifyBytes(root,row){const full=ordinary(root,row.name),before=statFile(full);need(equal(stamp(before),row.identity),'original source identity changed: '+row.name);checkBoundedSourcePath(full);const fd=fs.openSync(full,boundedSourceReadOpenFlags());return close(()=>{need(equal(stamp(statFD(fd)),row.identity),'original source changed on open');let at=0;const chunk=Buffer.alloc(65536);for(const original of row.chunks){let count=0;while(count<original.length){const n=fs.readSync(fd,chunk,count,original.length-count,at+count);need(n>0,'original source truncated');count+=n;}need(chunk.subarray(0,count).equals(original),'complete original source bytes changed: '+row.name);at+=count;}need(fs.readSync(fd,chunk,0,1,at)===0,'original source grew');},[()=>need(equal(stamp(statFD(fd)),row.identity)&&equal(stamp(statFile(full)),row.identity),'original source changed during closing'),()=>fs.closeSync(fd)]);}
// Long-lived plans keep complete namespace/index DATA, never a temporary
// image or compiler verdict. Raw index aggregate RSS/duration remains OPEN as
// the original standalone API; each physical read is chunked and exact.
export function captureForwardIndexNamespaceData(root,directoryLedger){
 return withSelectedSourceIndexImage(root,()=>{
  const envelope=captureSelectedSourceGitEnvelope(root),paths=selectedSourceIndexPaths(root),raw=[];
  for(const row of envelope.records)if(row.path===root&&row.identity?.length===6)directoryLedger.observe([row]);
  for(const path of paths?[paths.index,paths.shared].filter(Boolean):[]){let current;try{current=fs.realpathSync(path);}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;raw.push({path,target:null});continue;}raw.push({path,target:current,row:bytes(dirname(current),basename(current),Number.MAX_SAFE_INTEGER)});}
  return {rawByteOccurrences:raw.reduce((sum,entry)=>sum+(entry.row?.size??0),0),get namespaceDataAccounting(){return accountForwardSourceProposalData(envelope);},verify(){const checks=[()=>withSelectedSourceIndexImage(root,()=>need(equal(captureSelectedSourceGitEnvelope(root),envelope),'complete original HEAD/index/control namespace changed'))];for(const entry of raw)checks.push(()=>{if(entry.target===null){try{statFile(entry.path);need(false,'absent original index appeared');}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;}return;}need(fs.realpathSync(entry.path)===entry.target,'original index physical target changed');verifyBytes(dirname(entry.target),entry.row);});close(()=>{},checks);}};
 });
}
function git(root,args){return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{encoding:'utf8',timeout:30000,maxBuffer:16*MiB,env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});}
// The long read-operation observer supplies DATA for actual delegated reads.
// Direct plans never create a corpus or inherit its smaller aggregate domain.
// Valid UTF-8 native originals are later located in the genuine private full IR;
// only non-roundtripping direct bytes remain separately retained.
export function captureForwardProducerFence({root,sources,sourceCorpus,compilerRoot=COMPILER}={}){
 const corpusRoot=resolve(root);root=fs.realpathSync(corpusRoot);compilerRoot=fs.realpathSync(resolve(compilerRoot));
 const layout=repositoryRustLayout(root),hasGit=fs.existsSync(join(root,'.git'));
 const defaultSelection=sourceCorpus===undefined&&sources===undefined;
 const selection=()=>hasGit?withSelectedSourceIndexImage(root,()=>{const names=[...new Set([...selected,...layout.cargoInputs])];preloadSelectedSourceIndexInputs(root,names);return {rows:names.map(name=>({name,...readSelectedSourceGitRows(root,name)})),defaultPaths:defaultSelection?readSelectedSourceRustPaths(root):null};}):null;
 const revision=where=>{try{return git(where,['rev-parse','--verify','--quiet','HEAD']).trim();}catch(error){if(forwardFailureField(error,'status')!==1)throw error;return 'unborn:'+git(where,['symbolic-ref','--quiet','HEAD']).trim();}};
 const head=()=>hasGit?revision(root):null;
 const selected=(sourceCorpus?sourceCorpusPaths(sourceCorpus,corpusRoot):(sources??(hasGit?discoverDefaultRustSourcePaths(root).split('\0').filter(Boolean):[]))).slice().sort();
 const originalHead=head(),originalSelection=selection(),nativeNames=new Set(selected),cargoNames=new Set(layout.cargoInputs),observed=new Map();
 const cargoAbsent=layout.cargoInputs.filter(name=>!fs.existsSync(ordinary(root,name)));
 const originalRoot=root,directoryLedger=createForwardSourceDirectoryLedger();directoryLedger.observe([{path:root,identity:stamp(statFile(root))}]);const sharingGroup=SHARING,sourceDirectoryRecord={root,active:true,mutate:directoryLedger.mutate};
 let released=false,complete=false,rawNativeBytes=0,allNativeBytes=0,cargoBytes=0,fingerprintBytes=0;const fingerprintFiles=new Map();
 const nativeLimit=sourceCorpus?SOURCE_CORPUS_LIMITS.sourceBytes:32*MiB,cargoLimit=sourceCorpus?SOURCE_CORPUS_LIMITS.cargoBytes:32*MiB;
 const observePhysicalParents=(base,name)=>{let path=base;for(const part of ['',...name.split('/').slice(0,-1)]){if(part)path=join(path,part);directoryLedger.observe([{path,identity:stamp(statFile(path))}]);}};
 const currentSource=row=>{
  if(row.raw)return row.raw;
  if(row.locator)return Buffer.from(readPrivateNativeSource(row.readExpected(),row.locator),'utf8');
  if(sourceCorpus){const text=sourceCorpusText(sourceCorpus,corpusRoot,row.path);need(typeof text==='string','available original corpus source required');return Buffer.from(text,'utf8');}
  need(false,'direct native source has not joined its complete private CST: '+row.path);
 };
 const sameRecord=(event,row)=>event.root===root&&event.missing===row.missing&&equal(event.identity,row.identity)&&event.revision===row.revision&&event.flags===row.flags&&equal(event.parents,row.parents)&&event.bytes.equals(currentSource(row));
 const observe=event=>{
  need(!released,'live original producer capture required');
  const compilerRow=event.root===compilerRoot?knownCompilerInputs.get(event.path):null;
  if(compilerRow){need(!event.missing&&equal(event.identity,compilerRow.identity)&&event.bytes.length===compilerRow.size,'actual delegated compiler/profile input identity changed');let offset=0;for(const chunk of compilerRow.chunks){need(event.bytes.subarray(offset,offset+chunk.length).equals(chunk),'whole delegated compiler/profile input bytes changed');offset+=chunk.length;}if(compilerRoot===root)directoryLedger.observe(event.parents);return;}
  need(event.root===root,'actual delegated source belongs to another root');
  const native=nativeNames.has(event.path),cargo=cargoNames.has(event.path);
  // Actual original module graphs consume selected tracked source paths. Never
  // invent a new aggregate bucket or admit an unknown producer/helper domain.
  need(native||cargo,'delegated input outside original selected native/Cargo scope: '+event.path);
  const max=native?nativeLimit:cargoLimit;need(event.bytes.length<=max,'actual original per-file source domain exceeded');
  const previous=observed.get(event.path);if(previous){need(sameRecord(event,previous),'delegated complete source changed during planning: '+event.path);return;}
  need(!complete,'no new delegated inputs after original producer closing');
  const row={path:event.path,identity:event.identity,parents:event.parents,missing:event.missing,revision:event.revision,flags:event.flags,maxBytes:max,raw:event.bytes,locator:null,readExpected:null,native,bound:false};
  directoryLedger.observe(row.parents);observed.set(event.path,row);
  if(native){allNativeBytes+=event.bytes.length;if(sourceCorpus)need(observed.size<=SOURCE_CORPUS_LIMITS.trackedPaths+layout.cargoInputs.length&&allNativeBytes<=SOURCE_CORPUS_LIMITS.totalSourceBytes,'original explicit corpus source domain exceeded');}
  else{cargoBytes+=event.bytes.length;need(cargoBytes<=layout.cargoInputs.length*cargoLimit,'original actual Cargo input domain exceeded');}
 };
 const bindNative=(name,source,readExpected)=>{
  need(!complete&&!released&&nativeNames.has(name)&&typeof source==='string'&&typeof readExpected==='function','original selected source/private IR binding required');
  const row=observed.get(name);need(row,'every selected source must join its actual original bounded read/corpus capture');
  if(row.bound){need(currentSource(row).toString('utf8')===source,'repeated selected source differs from its full private CST');locatePrivateNativeSource(readExpected(),source);return;}
  need(currentSource(row).toString('utf8')===source,'one exact original native source binding required');
  const serialized=readExpected(),locator=locatePrivateNativeSource(serialized,source);row.bound=true;
  // The genuine original corpus already privately retains these exact native
  // strings. The fresh full CST was independently checked above; retain no
  // duplicate expected-map closure merely for later source-byte comparison.
  if(sourceCorpus){row.raw=null;row.locator=null;row.readExpected=null;return;}
  row.readExpected=readExpected;row.locator=locator;
  if(row.raw===null||Buffer.from(source,'utf8').equals(row.raw))row.raw=null;
  else{
   need(!sourceCorpus,'original corpus requires exact UTF-8');rawNativeBytes+=row.raw.length;row.readExpected=null;row.locator=null;
   if(SHARING){const key=root+'\0'+name,previous=SHARING.invalid.get(key);if(previous&&sameRecord({...row,root,bytes:row.raw},previous))row.raw=previous.raw;else SHARING.invalid.set(key,row);}
  }
 };
 const sourceNamespace=captureForwardIndexNamespaceData(root,directoryLedger),compilerNamespace=compilerRoot===root?sourceNamespace:captureForwardIndexNamespaceData(compilerRoot,directoryLedger);
 const compilerRevision=revision(compilerRoot),compilerIndex=withSelectedSourceIndexImage(compilerRoot,()=>readSelectedSourceInputListing(compilerRoot,'compiler-stage').toString('utf8'));
 const compiler=discoverCompilerSourceInputs({root:compilerRoot}),profiles=discoverSourceProfileInputs({root:compilerRoot});
 const compilerFiles=[],profileFiles=[];let compilerBytes=0,profileBytes=0;
 for(const [names,target,isProfile]of [[compiler,compilerFiles,false],[profiles,profileFiles,true]])for(const row of names){observePhysicalParents(compilerRoot,row.path);const original=bytes(compilerRoot,row.path,32*MiB);if(isProfile){profileBytes+=original.size;need(profileBytes<=256*MiB,'original profile byte bound');}else{compilerBytes+=original.size;need(compilerBytes<=256*MiB,'original compiler byte bound');}target.push(original);}
 const knownCompilerInputs=new Map([...compilerFiles,...profileFiles].map(row=>[row.name,row]));
 const nativeOrigin=ownershipCompilerRuntimeOriginData(ownershipCompiler());need(nativeOrigin&&nativeOrigin.schema==='actual-private-native-compiler-origin-data-20261101','actual private native compiler source origin unavailable');
 const typescriptRoot=nativeOrigin.packageRoot,typescriptRoots=[typescriptRoot],typescript=[],directories=[],typescriptSelections=[];let typescriptBytes=0;
 const localTypeRoot=join(compilerRoot,'js/node_modules/typescript');let localPresent=false;try{statFile(localTypeRoot);localPresent=true;}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;}
 if(localPresent){const physical=fs.realpathSync(localTypeRoot);if(!typescriptRoots.includes(physical))typescriptRoots.push(physical);typescriptSelections.push({path:localTypeRoot,physical});}else typescriptSelections.push({path:localTypeRoot,physical:null});
 for(const base of typescriptRoots){let cohortFiles=0,cohortBytes=0;const visit=name=>{const full=name?ordinary(base,name):base,stat=statFile(full);need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary installed compiler directory required');const names=fs.readdirSync(full).sort();directories.push({root:base,name,names,identity:stamp(stat)});for(const child of names){const relative=name?name+'/'+child:child,entry=statFile(ordinary(base,relative));if(entry.isDirectory())visit(relative);else{need(++cohortFiles<=512,'original independent installed compiler path bound');observePhysicalParents(base,relative);const row=bytes(base,relative,32*MiB);cohortBytes+=row.size;typescriptBytes+=row.size;need(cohortBytes<=64*MiB,'original independent installed compiler byte bound');if(base===typescriptRoot){const birth=nativeOrigin.files.find(value=>value.path===join(base,relative));need(birth&&equal(birth.identity,row.identity),'actual loaded compiler birth/source identity differs');}typescript.push({...row,root:base});}}};visit('');}
 const nativeSelectors=captureOwnershipRuntimeSelectors([...nativeOrigin.selectors.map(row=>row.path),join(compilerRoot,'js/package.json'),join(compilerRoot,'package.json'),join(compilerRoot,'js/node_modules/typescript/package.json')],[nativeOrigin.selectorRoot,compilerRoot]);directoryLedger.observe(nativeSelectors.parents);
 const nativeOriginAccounting=accountForwardSourceProposalData(nativeOrigin);
 // The exact original private producer binds its actual full implementation
 // list, including licenses/binaries outside the compiler/profile selectors.
 // Known families retain32MiB. Explicit extra fingerprints had no configured
 // aggregate/per-file ceiling; their retained payload/RSS remains OPEN.
 const fingerprint=name=>{
  need(!released&&!complete,'one live original implementation fingerprint phase required');observePhysicalParents(compilerRoot,name);const previous=knownCompilerInputs.get(name)??fingerprintFiles.get(name),actual=bytes(compilerRoot,name,knownCompilerInputs.has(name)?32*MiB:Number.MAX_SAFE_INTEGER);
  if(previous)need(equal(previous.identity,actual.identity)&&previous.size===actual.size&&previous.chunks.length===actual.chunks.length&&previous.chunks.every((chunk,index)=>chunk.equals(actual.chunks[index])),'whole original implementation input changed: '+name);else{fingerprintFiles.set(name,actual);fingerprintBytes+=actual.size;}
  const engine=createHash('sha256');for(const chunk of actual.chunks)engine.update(chunk);return engine.digest('hex');
 };

 // Sessions with a genuine corpus capture their complete initial evidence
 // together. One invocation-level Git/source-selection fence covers all actual
 // reads; no per-file operation launches a repeated whole-repository census.
 const sourceOperationLimits=sourceCorpus?{paths:SOURCE_CORPUS_LIMITS.trackedPaths+layout.cargoInputs.length,bytes:SOURCE_CORPUS_LIMITS.totalSourceBytes+layout.cargoInputs.length*cargoLimit}:undefined;
 if(sourceCorpus)withBoundedTrackedSourceOperation(root,()=>{
  for(const name of [...selected,...layout.cargoInputs])if(sourceCorpusText(sourceCorpus,corpusRoot,name)!==null)readBoundedTrackedSourceBytes(root,name,{maxBytes:nativeNames.has(name)?nativeLimit:cargoLimit});
 },{limits:sourceOperationLimits,observe:event=>{
  observe(event);const original=sourceCorpusText(sourceCorpus,corpusRoot,event.path);need(typeof original==='string'&&event.bytes.equals(Buffer.from(original,'utf8')),'actual complete corpus bytes differ from captured originals');if(nativeNames.has(event.path))observed.get(event.path).raw=null;
 }});
 const verifyObserved=()=>withBoundedTrackedSourceOperation(root,()=>{
  const checks=[];for(const row of observed.values())checks.push(()=>readBoundedTrackedSourceBytes(root,row.path,{maxBytes:row.maxBytes}));close(()=>{},checks);
 },{limits:sourceOperationLimits,observe:event=>{const row=observed.get(event.path);need(row&&sameRecord(event,row),'complete original delegated native/Cargo source changed: '+event.path);}});
 const verify=()=>{
  need(!released&&fs.realpathSync(root)===originalRoot,'released/replaced original input root');
  const checks=[()=>directoryLedger.verify(),()=>need(head()===originalHead&&equal(selection(),originalSelection),'original HEAD/source selection changed'),()=>need(revision(compilerRoot)===compilerRevision&&withSelectedSourceIndexImage(compilerRoot,()=>readSelectedSourceInputListing(compilerRoot,'compiler-stage').toString('utf8'))===compilerIndex,'original compiler HEAD/index changed'),()=>need(equal(discoverCompilerSourceInputs({root:compilerRoot}),compiler)&&equal(discoverSourceProfileInputs({root:compilerRoot}),profiles),'compiler/profile census changed')];
  checks.push(()=>sourceNamespace.verify());if(compilerNamespace!==sourceNamespace)checks.push(()=>compilerNamespace.verify());checks.push(verifyObserved);
  for(const name of cargoAbsent)checks.push(()=>need(!fs.existsSync(ordinary(root,name)),'absent original Cargo input appeared'));
  // Absent optional corpus Cargo inputs remain absent; ordinary direct plans
  // retain actual consumed Cargo inputs and the complete original Git selection.
  if(sourceCorpus)for(const name of layout.cargoInputs)if(sourceCorpusText(sourceCorpus,corpusRoot,name)===null)checks.push(()=>need(!fs.existsSync(ordinary(root,name)),'absent original corpus Cargo input appeared'));
  for(const row of fingerprintFiles.values())checks.push(()=>verifyBytes(compilerRoot,row));
  for(const row of [...compilerFiles,...profileFiles])checks.push(()=>verifyBytes(compilerRoot,row));
  checks.push(()=>verifyOwnershipRuntimeOriginCurrent(nativeOrigin),()=>nativeSelectors.verify());for(const selection of typescriptSelections)checks.push(()=>{if(selection.physical===null){try{statFile(selection.path);need(false,'absent receiving compiler dependency appeared');}catch(error){if(forwardFailureField(error,'code')!=='ENOENT')throw error;}}else need(fs.realpathSync(selection.path)===selection.physical,'receiving installed compiler selection changed');});
  for(const row of typescript)checks.push(()=>verifyBytes(row.root,row));
  for(const row of directories)checks.push(()=>{const full=row.name?ordinary(row.root,row.name):row.root;need(equal(stamp(statFile(full)),row.identity)&&equal(fs.readdirSync(full).sort(),row.names),'complete installed compiler directory changed');});
  close(()=>{},checks);
 };
 // Closed actual own-stage operation: no caller path, callback or prefix
 // permission. Only this library's exclusive empty directory creation/removal
 // may advance the invocation's same-root private source-parent ledgers.
 const stageMutation=(target,operation)=>{
  const records=new Set(sourceDirectoryRecord.active?[sourceDirectoryRecord]:[]);if(sharingGroup)for(const row of sharingGroup.fences)if(row.active&&row.root===root)records.add(row);
  let run=operation;for(const row of records){const inner=run;run=()=>row.mutate([target],inner);}return run();
 };
 const createOwnedStage=()=>{
  need(!released,'live original source scope required for own stage creation');need(fs.realpathSync(root)===root,'original stage parent path changed');
  const suffix=randomUUID();need(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(suffix),'one actual generated UUID required');
  const target=join(root,'.router-isolated-matrix-'+suffix),parentIdentity=stamp(statFile(root)).slice(0,3);
  stageMutation(target,()=>fs.mkdirSync(target,{mode:0o700}));const created=statFile(target);need(created.isDirectory()&&!created.isSymbolicLink(),'ordinary freshly created private stage required');
  const ownIdentity=stamp(created).slice(0,3);let removed=false;
  return Object.freeze({path:target,sourceAuthority:false,semanticAuthority:false,close(){
   if(removed)return;need(fs.realpathSync(root)===root&&equal(stamp(statFile(root)).slice(0,3),parentIdentity),'own stage parent replaced');
   const current=statFile(target);need(current.isDirectory()&&!current.isSymbolicLink()&&equal(stamp(current).slice(0,3),ownIdentity)&&fs.readdirSync(target).length===0,'unknown/replaced/nonempty own stage retained: '+target);
   stageMutation(target,()=>{const before=statFile(target);need(equal(stamp(before).slice(0,3),ownIdentity)&&fs.readdirSync(target).length===0,'own stage changed before exact empty removal');fs.rmdirSync(target);});removed=true;
  }});
 };
 const seal=()=>{need(!complete&&!released,'one original source sealing phase required');for(const name of selected){const row=observed.get(name);need(row&&(sourceCorpus||row.bound),'every selected source must retain its complete original source representation');}verify();complete=true;};
 if(sharingGroup)sharingGroup.fences.add(sourceDirectoryRecord);
 return Object.freeze({root,createOwnedStage,corpus:sourceCorpus,paths:Object.freeze([...selected]),observe,bindNative,seal,verify,fingerprint,mutateOutputDirectories:directoryLedger.mutate,get retainedBytes(){return compilerBytes+profileBytes+typescriptBytes+cargoBytes+rawNativeBytes+fingerprintBytes+nativeSelectors.retainedRawByteOccurrences+sourceNamespace.rawByteOccurrences+(compilerNamespace===sourceNamespace?0:compilerNamespace.rawByteOccurrences);},retainedBytesCoordinate:'raw-input-payload-occurrences-only',nativeOriginAccounting,get nativeInputBytes(){return allNativeBytes;},release(){released=true;sourceDirectoryRecord.active=false;if(sharingGroup)sharingGroup.fences.delete(sourceDirectoryRecord);compilerFiles.length=profileFiles.length=typescript.length=directories.length=0;observed.clear();fingerprintFiles.clear();knownCompilerInputs.clear();nativeSelectors.release();directoryLedger.release();}});
}
