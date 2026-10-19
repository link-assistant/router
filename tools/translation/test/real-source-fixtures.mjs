import {relocatedRustSourcePath} from '../repository-layout.mjs';
// Historical test data only. Every compiler attempt still uses the ordinary
// source/CST/grammar/checker path; these records never grant semantic authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {REAL_SOURCE_MANIFEST_SHA256,REAL_SOURCE_ORIGINAL_REVISION,REAL_SOURCE_FIXTURE_LIMITS,selectRealSourceFixture} from '../prepare-real-source-fixtures.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const FOLDER=fileURLToPath(new URL('../source-profiles/real-source-fixtures/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Complete original source fixture: '+message);};
function text(bytes){const value=bytes.toString('utf8');if(!Buffer.from(value,'utf8').equals(bytes))fail('UTF8 bytes changed');return value;}
export function verifyRealSourceFixtureLineage(bundle){
  const current=new Map(bundle.historical.files.map(row=>[row.path,row.sourceId]));
  for(const stage of bundle.lineage)for(const row of stage.files){
    const before=bundle.sources[row.before.sourceId]?.source,after=bundle.sources[row.after.sourceId]?.source,edit=row.edit,inverse=row.inverse;
    if(typeof before!=='string'||typeof after!=='string'||mappedCurrentSource(current,row.path)!==row.before.sourceId||row.completeInverse!==true)fail('complete adoption source association changed');
    for(const [source,change,wanted]of [[before,edit,after],[after,inverse,before]]){
      const [start,end]=change.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||source.slice(start,end)!==change.expected||source.slice(0,start)+change.replacement+source.slice(end)!==wanted)fail('complete adoption source inverse changed');
    }
    current.set(row.path,row.after.sourceId);
  }
  for(const row of bundle.current.files)if(current.has(row.path)&&mappedCurrentSource(current,row.path)!==row.sourceId)fail('current parent lacks continuous adoption history');
  return true;
}
export function originalRealSourceManifest(){
  const bytes=readFileSync(new URL('../fixtures/real-source-provenance.json',import.meta.url));if(hash(bytes)!==REAL_SOURCE_MANIFEST_SHA256)fail('historical manifest changed');return JSON.parse(text(bytes));
}
export function readRealSourceFixtureBundle({folder=FOLDER}={}){
  const index=JSON.parse(text(readFileSync(resolve(folder,'manifest.json'))));
  if(index.schema!=='router-complete-real-source-fixtures-v1'||index.archive!=='originals.json.gz'||index.originalRevision!==REAL_SOURCE_ORIGINAL_REVISION||index.originalManifestSha256!==REAL_SOURCE_MANIFEST_SHA256||!Number.isSafeInteger(index.rawBytes)||index.rawBytes>REAL_SOURCE_FIXTURE_LIMITS.outputBytes)fail('archive index changed');
  const packed=readFileSync(resolve(folder,index.archive));if(packed.length!==index.bytes||hash(packed)!==index.sha256)fail('complete compressed source changed');
  const raw=gunzipSync(packed,{maxOutputLength:REAL_SOURCE_FIXTURE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)fail('complete original source archive changed');
  const bundle=JSON.parse(text(raw));if(bundle.schema!==index.schema||bundle.historical.revision!==index.originalRevision||bundle.current.revision!==index.currentRevision||bundle.historical.manifestSha256!==REAL_SOURCE_MANIFEST_SHA256||bundle.historical.files.length!==15||bundle.historical.files.length!==index.historicalFiles||bundle.current.files.length!==index.currentFiles)fail('complete original source census changed');
  const sources=Object.entries(bundle.sources);if(sources.length>REAL_SOURCE_FIXTURE_LIMITS.files)fail('source count bound');let total=0;
  for(const [id,row]of sources){if(!/^[0-9a-f]{64}$/u.test(id)||typeof row.source!=='string'||row.bytes!==Buffer.byteLength(row.source)||row.bytes>REAL_SOURCE_FIXTURE_LIMITS.fileBytes||hash(row.source)!==id)fail('complete source content address changed');total+=row.bytes;}
  if(total>REAL_SOURCE_FIXTURE_LIMITS.rawBytes)fail('complete source byte bound');
  for(const row of [...bundle.historical.files,...bundle.current.files])if(!bundle.sources[row.sourceId]||bundle.sources[row.sourceId].bytes!==row.bytes)fail('source file association changed');
  const manifest=originalRealSourceManifest();for(const entry of manifest.entries){const row=bundle.historical.files.filter(row=>row.path===entry.path);if(row.length!==1||row[0].sourceId!==entry.sourceSha256)fail('pinned original parent association changed');}
  verifyRealSourceFixtureLineage(bundle);
  return {index,bundle,manifest};
}
function sourceAt(bundle,period,path,{root=ROOT,physical=false}={}){
  const rows=bundle[period].files.filter(row=>row.path===path);if(rows.length!==1)fail('unique complete source path required: '+path);
  const row=bundle.sources[rows[0].sourceId];if(physical&&text(readFileSync(resolve(root,path)))!==row.source)fail('actual current parent differs: '+path);
  if(path.endsWith('.rs')){
    // This is only the stored fixture partition. The producer/focused tests
    // validate the full CST independently; each real compilation stays fresh.
    if(typeof row.canonical!=='string')fail('complete source CST missing');const doc=JSON.parse(row.canonical);
    if(doc.schema!=='meta-language-concrete-syntax-v1'||doc.language!=='Rust'||doc.source!==row.source||!Array.isArray(doc.nodes))fail('complete source CST changed');
    let end=0;for(const node of doc.nodes.slice(1))if(node[0]!=='group'){if(node[2]!==end||!Number.isSafeInteger(node[3])||node[3]<end||node[3]>row.source.length)fail('complete source leaf partition changed');end=node[3];}if(end!==row.source.length)fail('incomplete source leaf partition');
  }
  return row.source;
}
export function historicalRealSource(path,options){const {bundle}=readRealSourceFixtureBundle(options);return sourceAt(bundle,'historical',path);}
export function historicalRealSourceEntry(id,options){
  const {bundle,manifest}=readRealSourceFixtureBundle(options),entry=manifest.entries.find(row=>row.id===id);if(!entry)fail('unknown original source entry');
  const original=sourceAt(bundle,'historical',entry.path),selection=selectRealSourceFixture(original,entry),expected=bundle.historical.selections.find(row=>row.id===id);
  if(JSON.stringify(selection)!==JSON.stringify(expected))fail('exact historical selection changed');return {entry,original,source:selection.source,selection};
}
export function currentRealSourceEntry(id,options={}){
  const {bundle,manifest}=readRealSourceFixtureBundle(options),entry=manifest.entries.find(row=>row.id===id);if(!entry||!bundle.current.behaviorIds.includes(id))fail('unknown current source carrier');
  const original=sourceAt(bundle,'current',entry.path,{...options,physical:true}),selection=selectRealSourceFixture(original,entry,{current:true}),expected=bundle.current.selections.find(row=>row.id===id);
  if(JSON.stringify(selection)!==JSON.stringify(expected))fail('exact current selection changed');
  const files={'src/lib.rs':'pub mod translation_core;\n'+selection.source};
  for(const path of ['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs'])files[path]=sourceAt(bundle,'current',path,{...options,physical:true});
  const dependencyInputs={manifest:sourceAt(bundle,'current','Cargo.toml',{...options,physical:true}),lock:sourceAt(bundle,'current','Cargo.lock',{...options,physical:true})};
  return {entry,original,source:selection.source,selection,files,dependencyInputs,revision:bundle.current.revision,scope:'Current full source parent retained; exact declarations in an authored Core carrier, not full parent/crate admission.'};
}


// Explicit sibling for complete historical/current static test-source data.
// No source/cache/owner verdict from this reader is accepted by the compiler.
import {execFileSync as staticExec} from 'node:child_process';
import {PRODUCTION_PROFILE as STATIC_PROFILE} from '../cfg-profile.mjs';
import {STATIC_SOURCE_LIFECYCLE_CASES,STATIC_SOURCE_LIFECYCLE_LIMITS,STATIC_SOURCE_LIFECYCLE_PROFILES,visitStaticSourceLifecycleCanonicals} from '../prepare-real-source-fixtures.mjs';
const STATIC_FOLDER=fileURLToPath(new URL('../source-profiles/static-source-lifecycle/',import.meta.url));
const staticError=message=>{throw new TypeError('Static source fixture: '+message);};
const staticHashBlob=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const staticDigest=rows=>hash(JSON.stringify(rows));
function staticCst(source,doc){
  if(doc.schema!=='meta-language-concrete-syntax-v1'||doc.language!=='Rust'||doc.source!==source||!Array.isArray(doc.nodes))staticError('complete CST source differs');
  let end=0;for(const node of doc.nodes.slice(1))if(node[0]!=='group'){if(node[2]!==end||!Number.isSafeInteger(node[3])||node[3]<end||node[3]>source.length)staticError('whole CST leaf partition differs');end=node[3];}if(end!==source.length)staticError('complete source CST partition required');return doc;
}
// Release packed/raw archive backing before complete native CST validation.
// The full index and decoded bundle remain fresh ordinary return data.
import {decodeStaticSourceStorage} from '../static-source-storage-codec.mjs';
function readStaticArchiveData(folder){
  const index=JSON.parse(text(readFileSync(resolve(folder,'manifest.json'))));
  if(index.schema!=='router-static-source-lifecycle-v1'||index.archive!=='originals.json.gz'||!Number.isSafeInteger(index.rawBytes)||index.rawBytes<0||index.rawBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticError('fixed complete index required');
  const packed=readFileSync(resolve(folder,index.archive));if(packed.length!==index.bytes||hash(packed)!==index.sha256)staticError('full packed source differs');
  const raw=gunzipSync(packed,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)staticError('full original source differs');
  const bundle=decodeStaticSourceStorage(raw,index);return {index,bundle};
}
export function readStaticSourceLifecycle({folder=STATIC_FOLDER}={}){
  const {index,bundle}=readStaticArchiveData(folder);
  if(bundle.schema!==index.schema||JSON.stringify(bundle.cases)!==JSON.stringify(STATIC_SOURCE_LIFECYCLE_CASES)||JSON.stringify(bundle.authority)!==JSON.stringify({namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}))staticError('test-data contract differs');
  if(!Array.isArray(bundle.profiles)||bundle.profiles.length!==2||new Set(bundle.profiles.map(row=>row.revision)).size!==2)staticError('two complete historical universes required');
  let bytes=0;for(const [id,row]of Object.entries(bundle.sources)){if(!/^[a-f0-9]{64}$/u.test(id)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||row.bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes||hash(row.source)!==id||staticHashBlob(Buffer.from(row.source))!==row.gitBlob)staticError('complete source content address differs');bytes+=row.bytes;if(bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticError('complete original source budget');}
  const changedParents=[];
  for(const profile of bundle.profiles){const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[profile.revision];if(!expected||profile.files.length!==expected.files||profile.files.reduce((sum,row)=>sum+row.bytes,0)!==expected.bytes||profile.sourceSetSha256!==expected.sourceSetSha256)staticError('fixed complete historical universe differs');}
  const profiles=[...bundle.profiles,bundle.current];
  for(const profile of profiles){if(!Array.isArray(profile.files)||!profile.files.length||profile.files.length>STATIC_SOURCE_LIFECYCLE_LIMITS.paths||profile.sourceSetSha256!==staticDigest(profile.files))staticError('complete profile rows differ');let previous='';
    for(const row of profile.files){if(typeof row.path!=='string'||row.path<=previous||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||!row.path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock','rust/Cargo.toml'].includes(row.path))staticError('unique tracked Rust/Cargo path required');previous=row.path;const source=bundle.sources[row.sourceId];if(!source||source.bytes!==row.bytes||source.gitBlob!==row.gitBlob)staticError('complete file source/Git join differs');}
  }
  if(JSON.stringify(index.profiles)!==JSON.stringify(bundle.profiles.map(({revision,files,sourceSetSha256})=>({revision,files:files.length,sourceSetSha256})))||index.current!==bundle.current.sourceSetSha256)staticError('index full profile census differs');
  const current=new Map(bundle.current.files.map(row=>[row.path,row]));
  if(!Array.isArray(bundle.lineage)||bundle.lineage.length!==2)staticError('complete source lineage required');
  for(const profile of bundle.profiles){const stage=bundle.lineage.find(row=>row.revision===profile.revision);if(!stage||!Array.isArray(stage.files))staticError('actual profile lineage missing');const expected=profile.files.filter(row=>mappedCurrentSource(current,row.path)?.sourceId!==row.sourceId);if(JSON.stringify(stage.files.map(row=>row.path))!==JSON.stringify(expected.map(row=>row.path)))staticError('complete changed/deleted parent census differs');
    for(const row of stage.files){const before=profile.files.find(file=>file.path===row.path),after=mappedCurrentSource(current,row.path);if(JSON.stringify(row.before)!==JSON.stringify(before))staticError('actual original parent differs');if(!after){if(row.status!=='deleted'||row.current!==null||row.originalPreserved!==true)staticError('deleted original witness differs');continue;}
      if(row.status!=='changed'||JSON.stringify(row.after)!==JSON.stringify(after)||row.completeInverse!==true)staticError('actual current parent differs');const original=bundle.sources[before.sourceId],latest=bundle.sources[after.sourceId];if(typeof original.canonical!=='string'||typeof latest.canonical!=='string')staticError('both changed-parent canonical documents required');changedParents.push(row);
      for(const [source,change,wanted]of [[original.source,row.edit,latest.source],[latest.source,row.inverse,original.source]]){const [start,end]=change.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||source.slice(start,end)!==change.expected||source.slice(0,start)+change.replacement+source.slice(end)!==wanted)staticError('complete source inverse differs');}
    }
  }
  // Reject malformed complete metadata/source equations before reparsing all
  // native canonical documents. Every valid packet still takes the complete
  // original CST and boundary checks; no verdict or absence is cached.
  const canonicalRows=Object.entries(bundle.sources).filter(([,row])=>row.canonical!==undefined),boundariesBySource=new Map();
  visitStaticSourceLifecycleCanonicals(canonicalRows,(id,document)=>{
    staticCst(bundle.sources[id].source,document);
    const boundaries=new Set([0,document.source.length]);for(const node of document.nodes){boundaries.add(node[2]);boundaries.add(node[3]);}
    boundariesBySource.set(id,boundaries);
  });
  for(const row of changedParents){
    const boundaries=boundariesBySource.get(row.before.sourceId),latestBoundaries=boundariesBySource.get(row.after.sourceId);
    if(!boundaries||!latestBoundaries)staticError('both changed-parent canonical documents required');
    if(!boundaries.has(row.edit.span[0])||!boundaries.has(row.edit.span[1]))staticError('whole original CST token/group boundary required');
  }
  return {index,bundle};
}
/** One explicit invocation captures data only; no global fixture/semantic cache. */
export function staticSourceLifecycleContext(testName,{folder=STATIC_FOLDER,root=ROOT,current=true}={}){
  const revision=STATIC_SOURCE_LIFECYCLE_CASES[testName];if(typeof revision!=='string')staticError('fixed original test association required');const {bundle,index}=readStaticSourceLifecycle({folder}),profile=bundle.profiles.find(row=>row.revision===revision);if(!profile)staticError('actual original profile missing');
  const historical=new Map(profile.files.map(row=>[row.path,bundle.sources[row.sourceId].source])),currentFiles=new Map(bundle.current.files.map(row=>[row.path,bundle.sources[row.sourceId].source]));
  if(current){
    const paths=staticExec('/usr/bin/git',['-C',root,'ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','rust/Cargo.toml'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).split('\0').filter(Boolean).sort();if(JSON.stringify(paths)!==JSON.stringify(bundle.current.files.map(row=>row.path)))staticError('actual current source set differs');
    const raw=staticExec('/usr/bin/git',['-C',root,'cat-file','--batch'],{input:paths.map(path=>'HEAD:'+path+'\n').join(''),timeout:30000,maxBuffer:64*1024*1024});let at=0;
    for(const row of bundle.current.files){const end=raw.indexOf(10,at);if(end<at)staticError('complete current Git header');const [blob,kind,size]=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;const value=raw.subarray(at,at+row.bytes);at+=row.bytes;
      if(kind!=='blob'||blob!==row.gitBlob||Number(size)!==row.bytes||raw[at++]!==10||value.toString('utf8')!==currentFiles.get(row.path))staticError('current full Git source differs');
      let physical;try{physical=readFileSync(resolve(root,row.path));}catch(error){if(error.code!=='ENOENT')throw error;physical=value;}if(!physical.equals(value)||staticHashBlob(value)!==row.gitBlob||hash(value)!==row.sourceId)staticError('current physical/source/Git blob differs');
    }if(at!==raw.length)staticError('extra current Git bytes');
  }
  const source=path=>{if(!historical.has(path))staticError('unknown historical source path: '+path);return historical.get(path);};
  const sourceCurrent=path=>{const physical=currentFiles.has(path)?path:relocatedRustSourcePath(path);if(!currentFiles.has(physical))staticError('unknown current source path: '+path);return currentFiles.get(physical);};
  // Return only detached source/profile/Cargo data. Ordinary compiler entrypoints
  // freshly rebuild every view, module binding, dependency and private proof.
  return {source,sourceCurrent,inputs:{entry:'src/lib.rs',sourceHead:profile.revision,compilationProfile:STATIC_PROFILE,sources:profile.files.map(row=>({source:row.path,bytes:row.bytes,sha256:row.sourceId,gitBlob:row.gitBlob})),originalBytes:profile.files.reduce((sum,row)=>sum+row.bytes,0),digest:profile.sourceSetSha256},current:{producerRevision:bundle.current.producerRevision,sourceSetSha256:bundle.current.sourceSetSha256,files:bundle.current.files},lineage:bundle.lineage.find(row=>row.revision===revision),scope:'Complete historical test source universe; current source evolution is retained data, never executable admission.',index};
}

// Separate fixed associations, never additions/aliases to the original16 table.
// The readers retain their full original validation with explicit physical path substitutions. These are sources,
// not a namespace, ownership, checked program or historical compiler verdict.
const ASSOCIATED_SOURCE_MANIFEST_SHA256='dabbc7daf61a793c4d1f0fef828b894b67f466df4db32c4f9fc7aa746d1d95f1';
function associatedSourceEntry(id){
 const raw=readFileSync(new URL('./fixtures/outside-static-source-associations.json',import.meta.url));
 if(hash(raw)!==ASSOCIATED_SOURCE_MANIFEST_SHA256)staticError('outside association manifest differs');
 const manifest=JSON.parse(text(raw));
 if(manifest.schema!=='outside-static-source-associations-v1'||manifest.entries?.length!==6||new Set(manifest.entries.map(row=>row.id)).size!==6||manifest.entries.some(row=>Object.hasOwn(STATIC_SOURCE_LIFECYCLE_CASES,row.id))||JSON.stringify(manifest.authority)!==JSON.stringify({namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}))staticError('separate six-case data contract required');
 const rows=manifest.entries.filter(row=>row.id===id);if(rows.length!==1)staticError('unknown explicit outside association');return rows[0];
}
export function staticSourceAssociatedContext(caseId,{folder=STATIC_FOLDER,root=ROOT,current=true}={}){
 const association=associatedSourceEntry(caseId),revision=association.revision,{bundle,index}=readStaticSourceLifecycle({folder}),profile=bundle.profiles.find(row=>row.revision===revision);
 if(!profile||!Array.isArray(association.parents)||!association.parents.length)staticError('actual associated historical profile missing');
 for(const parent of association.parents){const rows=profile.files.filter(row=>row.path===parent.path),row=rows[0];if(rows.length!==1||row.sourceId!==parent.sha256||row.bytes!==parent.bytes||row.gitBlob!==parent.gitBlob)staticError('outside full original parent differs');}
 const historical=new Map(profile.files.map(row=>[row.path,bundle.sources[row.sourceId].source])),currentFiles=new Map(bundle.current.files.map(row=>[row.path,bundle.sources[row.sourceId].source]));
 if(current){
  const paths=staticExec('/usr/bin/git',['-C',root,'ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','rust/Cargo.toml'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).split('\0').filter(Boolean).sort();if(JSON.stringify(paths)!==JSON.stringify(bundle.current.files.map(row=>row.path)))staticError('actual current source set differs');
  const raw=staticExec('/usr/bin/git',['-C',root,'cat-file','--batch'],{input:paths.map(path=>'HEAD:'+path+'\n').join(''),timeout:30000,maxBuffer:64*1024*1024});let at=0;
  for(const row of bundle.current.files){const end=raw.indexOf(10,at);if(end<at)staticError('complete current Git header');const [blob,kind,size]=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;const value=raw.subarray(at,at+row.bytes);at+=row.bytes;
   if(kind!=='blob'||blob!==row.gitBlob||Number(size)!==row.bytes||raw[at++]!==10||value.toString('utf8')!==currentFiles.get(row.path))staticError('current full Git source differs');
   let physical;try{physical=readFileSync(resolve(root,row.path));}catch(error){if(error.code!=='ENOENT')throw error;physical=value;}if(!physical.equals(value)||staticHashBlob(value)!==row.gitBlob||hash(value)!==row.sourceId)staticError('current physical/source/Git blob differs');
  }if(at!==raw.length)staticError('extra current Git bytes');
 }
 const source=path=>{if(!historical.has(path))staticError('unknown associated historical source path: '+path);return historical.get(path);};
 const sourceCurrent=path=>{const physical=currentFiles.has(path)?path:relocatedRustSourcePath(path);if(!currentFiles.has(physical))staticError('unknown associated current source path: '+path);return currentFiles.get(physical);};
 return {source,sourceCurrent,association,inputs:{entry:'src/lib.rs',sourceHead:profile.revision,compilationProfile:STATIC_PROFILE,sources:profile.files.map(row=>({source:row.path,bytes:row.bytes,sha256:row.sourceId,gitBlob:row.gitBlob})),originalBytes:profile.files.reduce((sum,row)=>sum+row.bytes,0),digest:profile.sourceSetSha256},current:{producerRevision:bundle.current.producerRevision,sourceSetSha256:bundle.current.sourceSetSha256,files:bundle.current.files},lineage:bundle.lineage.find(row=>row.revision===revision),scope:'Explicit outside-original16 historical DATA association; current sources and later compiler obligations remain separate.',index};
}

// A separately authenticated plain-source TEST DATA API. It intentionally
// validates no canonical CST and cannot replace the complete/default readers.
import {openSync as textOpen,readSync as textRead,fstatSync as textFstat,lstatSync as textLstat,closeSync as textClose,constants as textFsConstants} from 'node:fs';
import {decodeStaticSourceTextData} from '../static-source-storage-codec.mjs';
const TEXT_DATA_ASSETS=['tools/translation/source-profiles/static-source-lifecycle/manifest.json','tools/translation/source-profiles/static-source-lifecycle/originals.json.gz'];
const textDataIdentity=info=>[info.dev,info.ino,info.mode,info.nlink,info.uid,info.gid,info.size,info.mtimeMs,info.ctimeMs];
const textDataSameIdentity=(left,right)=>left.length===right.length&&left.every((value,index)=>value===right[index]);
function textDataFile(path,maximum){
 const named=textLstat(path);if(!named.isFile()||named.isSymbolicLink()||named.size>maximum)staticError('bounded regular text-data input required');
 const before=textDataIdentity(named),fd=textOpen(path,textFsConstants.O_RDONLY|textFsConstants.O_NOFOLLOW);
 try{
  if(!textDataSameIdentity(before,textDataIdentity(textFstat(fd))))staticError('text-data FD/name identity differs');
  const parts=[];let size=0;
  for(;;){const part=Buffer.allocUnsafe(Math.min(65536,named.size-size+1)),count=textRead(fd,part,0,part.length,null);if(!count)break;size+=count;if(size>named.size)staticError('text-data file changed size');parts.push(part.subarray(0,count));}
  if(size!==named.size||!textDataSameIdentity(before,textDataIdentity(textFstat(fd)))||!textDataSameIdentity(before,textDataIdentity(textLstat(path))))staticError('text-data complete bytes/identity changed');
  return {path,identity:before,bytes:Buffer.concat(parts,size)};
 }finally{textClose(fd);}
}
function textDataCurrentPath(root,path){
 if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||path.includes(':')||/[\0\r\n]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))staticError('safe complete text-data current path required');
 let parent=resolve(root);const parts=path.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);const info=textLstat(parent);if(!info.isDirectory()||info.isSymbolicLink())staticError('text-data source parent changed');}
 return resolve(root,path);
}
function textDataGitBodies(root,head,rows){
 const raw=staticExec('/usr/bin/git',['-C',root,'cat-file','--batch'],{input:rows.map(row=>head+':'+row.relative+'\n').join(''),timeout:30000,maxBuffer:64*1024*1024});let at=0;
 for(const row of rows){
  const end=raw.indexOf(10,at);if(end<at)staticError('complete text-data Git header');const fields=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;
  if(fields.length!==3||!/^[a-f0-9]{40}$/u.test(fields[0])||fields[1]!=='blob'||!/^\d+$/u.test(fields[2])||Number(fields[2])!==row.bytes.length)staticError('exact text-data Git frame differs');
  const value=raw.subarray(at,at+row.bytes.length);at+=row.bytes.length;
  if(raw[at++]!==10||!value.equals(row.bytes)||staticHashBlob(value)!==fields[0])staticError('complete text-data physical/Git bytes differ');
 }if(at!==raw.length)staticError('extra text-data Git bytes');
}
function validateStaticTextData(bundle,index){
 if(bundle.schema!==index.schema||JSON.stringify(bundle.cases)!==JSON.stringify(STATIC_SOURCE_LIFECYCLE_CASES)||JSON.stringify(bundle.authority)!==JSON.stringify({namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}))staticError('source-text test-data contract differs');
 if(!Array.isArray(bundle.profiles)||bundle.profiles.length!==2||new Set(bundle.profiles.map(row=>row.revision)).size!==2)staticError('two complete text-data historical universes required');
 let bytes=0;for(const [id,row]of Object.entries(bundle.sources)){if(!/^[a-f0-9]{64}$/u.test(id)||typeof row.source!=='string'||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes||Buffer.byteLength(row.source)!==row.bytes||Buffer.from(row.source,'utf8').toString('utf8')!==row.source||hash(row.source)!==id||staticHashBlob(Buffer.from(row.source))!==row.gitBlob)staticError('complete source-text content address differs');bytes+=row.bytes;if(bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticError('complete source-text source budget');}
 for(const profile of bundle.profiles){const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[profile.revision];if(!expected||profile.files.length!==expected.files||profile.files.reduce((sum,row)=>sum+row.bytes,0)!==expected.bytes||profile.sourceSetSha256!==expected.sourceSetSha256)staticError('fixed complete text-data historical universe differs');}
 for(const profile of [...bundle.profiles,bundle.current]){
  if(!Array.isArray(profile.files)||!profile.files.length||profile.files.length>STATIC_SOURCE_LIFECYCLE_LIMITS.paths||profile.sourceSetSha256!==staticDigest(profile.files))staticError('complete source-text profile differs');let previous='';
  for(const row of profile.files){if(typeof row.path!=='string'||row.path<=previous||row.path.startsWith('/')||row.path.includes('\\')||row.path.includes(':')||/[\0\r\n]/u.test(row.path)||row.path.split('/').some(part=>!part||part==='.'||part==='..')||!row.path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock','rust/Cargo.toml'].includes(row.path))staticError('unique tracked text-data Rust/Cargo path required');previous=row.path;const source=bundle.sources[row.sourceId];if(!source||source.bytes!==row.bytes||source.gitBlob!==row.gitBlob)staticError('complete source-text file association differs');}
 }
 if(JSON.stringify(index.profiles)!==JSON.stringify(bundle.profiles.map(({revision,files,sourceSetSha256})=>({revision,files:files.length,sourceSetSha256})))||index.current!==bundle.current.sourceSetSha256)staticError('source-text index profile census differs');
 const current=new Map(bundle.current.files.map(row=>[row.path,row]));
 if(!Array.isArray(bundle.lineage)||bundle.lineage.length!==2||new Set(bundle.lineage.map(stage=>stage.revision)).size!==2)staticError('complete source-text lineage required');
 for(const profile of bundle.profiles){
  const stage=bundle.lineage.find(row=>row.revision===profile.revision);if(!stage||!Array.isArray(stage.files))staticError('source-text profile lineage missing');const expected=profile.files.filter(row=>mappedCurrentSource(current,row.path)?.sourceId!==row.sourceId);
  if(JSON.stringify(stage.files.map(row=>row.path))!==JSON.stringify(expected.map(row=>row.path)))staticError('source-text changed/deleted census differs');
  for(const row of stage.files){const before=profile.files.find(file=>file.path===row.path),after=mappedCurrentSource(current,row.path);if(JSON.stringify(row.before)!==JSON.stringify(before))staticError('source-text original parent differs');if(!after){if(row.status!=='deleted'||row.current!==null||row.originalPreserved!==true)staticError('source-text deleted original witness differs');continue;}
   if(row.status!=='changed'||JSON.stringify(row.after)!==JSON.stringify(after)||row.completeInverse!==true)staticError('source-text current parent differs');
   const original=bundle.sources[before.sourceId].source,latest=bundle.sources[after.sourceId].source;
   for(const [source,change,wanted]of [[original,row.edit,latest],[latest,row.inverse,original]]){const [start,end]=change.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||source.slice(start,end)!==change.expected||source.slice(0,start)+change.replacement+source.slice(end)!==wanted)staticError('complete source-text inverse differs');}
  }
 }
}
function staticTextSourceProjection(table){return path=>{if(!Object.hasOwn(table,path))staticError('path outside associated source-text parents/Cargo');return table[path];};}
/** Entire source universe authenticated afresh, only parent/Cargo strings retained.
 * Test DATA only: neither this object nor any flag is a compiler source permit. */
export function staticSourceAssociatedTextData(caseId,{folder=STATIC_FOLDER,root=ROOT}={}){
 const association=associatedSourceEntry(caseId),head=staticExec('/usr/bin/git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).trim();if(!/^[a-f0-9]{40}$/u.test(head))staticError('actual text-data Git head required');
 const currentPaths=staticExec('/usr/bin/git',['-C',root,'ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','rust/Cargo.toml'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).split('\0').filter(Boolean).sort();
 if(!currentPaths.length||currentPaths.length>STATIC_SOURCE_LIFECYCLE_LIMITS.paths||new Set(currentPaths).size!==currentPaths.length)staticError('complete current source-text census required');
 const actualAssets=TEXT_DATA_ASSETS.map(relative=>({...textDataFile(textDataCurrentPath(root,relative),STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes),relative}));
 textDataGitBodies(root,head,actualAssets);
 const suppliedIndex=textDataFile(resolve(folder,'manifest.json'),STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes),suppliedArchive=textDataFile(resolve(folder,'originals.json.gz'),STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes);
 if(!suppliedIndex.bytes.equals(actualAssets[0].bytes)||!suppliedArchive.bytes.equals(actualAssets[1].bytes))staticError('source-text archive/index differs from actual current Git assets');
 const index=JSON.parse(text(suppliedIndex.bytes));
 if(index.schema!=='router-static-source-lifecycle-v1'||index.archive!=='originals.json.gz'||!Number.isSafeInteger(index.rawBytes)||index.rawBytes<0||index.rawBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes||suppliedArchive.bytes.length!==index.bytes||hash(suppliedArchive.bytes)!==index.sha256)staticError('complete authenticated text-data index/packed bytes differ');
 const raw=gunzipSync(suppliedArchive.bytes,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)staticError('complete authenticated text-data raw bytes differ');
 const projection=decodeStaticSourceTextData(raw,index),bundle=projection.bundle;validateStaticTextData(bundle,index);
 const profile=bundle.profiles.find(row=>row.revision===association.revision);if(!profile||!Array.isArray(association.parents)||!association.parents.length)staticError('actual source-text associated profile missing');
 for(const pin of association.parents){const rows=profile.files.filter(row=>row.path===pin.path);if(rows.length!==1||rows[0].sourceId!==pin.sha256||rows[0].bytes!==pin.bytes||rows[0].gitBlob!==pin.gitBlob)staticError('whole source-text associated parent differs');}
 if(JSON.stringify(currentPaths)!==JSON.stringify(bundle.current.files.map(row=>row.path)))staticError('actual current source-text set differs');
 const physical=bundle.current.files.map(row=>({...textDataFile(textDataCurrentPath(root,row.path),STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes),relative:row.path}));textDataGitBodies(root,head,physical);
 for(let at=0;at<physical.length;at++){const row=bundle.current.files[at],value=physical[at].bytes;if(value.length!==row.bytes||text(value)!==bundle.sources[row.sourceId].source||hash(value)!==row.sourceId||staticHashBlob(value)!==row.gitBlob)staticError('complete current source-text physical/Git/source differs');}
 const table=Object.create(null);for(const path of [...association.parents.map(row=>row.path),'Cargo.toml','Cargo.lock']){const rows=profile.files.filter(row=>row.path===path);if(rows.length!==1||Object.hasOwn(table,path))staticError('unique whole parent/Cargo text-data path required');table[path]=bundle.sources[rows[0].sourceId].source;}
 const authentication={sourceDataOnly:true,canonicalDocuments:false,logicalPayloadDigest:false,compilerAuthority:false,sourceRows:Object.keys(bundle.sources).length,historicalProfiles:bundle.profiles.map(row=>({revision:row.revision,files:row.files.length,bytes:row.files.reduce((sum,file)=>sum+file.bytes,0),sourceSetSha256:row.sourceSetSha256})),currentFiles:physical.length,currentSourceSetSha256:bundle.current.sourceSetSha256,manifestAndArchiveCurrentGit:true,completeSourceHashesAndInverses:true};
 // Retain no archive, canonical, whole-source table, Git buffer or layout in
 // the returned closure. All mutable source identities are rejoined at exit.
 for(const row of [...actualAssets,suppliedIndex,suppliedArchive,...physical]){if(!textDataSameIdentity(row.identity,textDataIdentity(textLstat(row.path))))staticError('source-text input identity changed before return');}
 if(staticExec('/usr/bin/git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).trim()!==head)staticError('source-text actual Git head changed before return');
 return Object.freeze({source:staticTextSourceProjection(Object.freeze(table)),association,authentication:Object.freeze(authentication),scope:'Whole current Git-authenticated historical source TEST DATA only; no CST/namespace/semantic proof.'});
}

// Repository layout equations apply only to an already captured complete row.
// The existing full byte, native CST, Git, census and inverse checks stay live.
function mappedCurrentSource(rows,path) {
 const moved=relocatedRustSourcePath(path);
 return (path==='Cargo.toml'?rows.get(moved):undefined)??rows.get(path)??rows.get(moved);
}
