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
    if(typeof before!=='string'||typeof after!=='string'||current.get(row.path)!==row.before.sourceId||row.completeInverse!==true)fail('complete adoption source association changed');
    for(const [source,change,wanted]of [[before,edit,after],[after,inverse,before]]){
      const [start,end]=change.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||source.slice(start,end)!==change.expected||source.slice(0,start)+change.replacement+source.slice(end)!==wanted)fail('complete adoption source inverse changed');
    }
    current.set(row.path,row.after.sourceId);
  }
  for(const row of bundle.current.files)if(current.has(row.path)&&current.get(row.path)!==row.sourceId)fail('current parent lacks continuous adoption history');
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
import {STATIC_SOURCE_LIFECYCLE_CASES,STATIC_SOURCE_LIFECYCLE_LIMITS,STATIC_SOURCE_LIFECYCLE_PROFILES,transportStaticSourceLifecycleCanonicals} from '../prepare-real-source-fixtures.mjs';
const STATIC_FOLDER=fileURLToPath(new URL('../source-profiles/static-source-lifecycle/',import.meta.url));
const staticError=message=>{throw new TypeError('Static source fixture: '+message);};
const staticHashBlob=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const staticDigest=rows=>hash(JSON.stringify(rows));
function staticCst(source,doc){
  if(doc.schema!=='meta-language-concrete-syntax-v1'||doc.language!=='Rust'||doc.source!==source||!Array.isArray(doc.nodes))staticError('complete CST source differs');
  let end=0;for(const node of doc.nodes.slice(1))if(node[0]!=='group'){if(node[2]!==end||!Number.isSafeInteger(node[3])||node[3]<end||node[3]>source.length)staticError('whole CST leaf partition differs');end=node[3];}if(end!==source.length)staticError('complete source CST partition required');return doc;
}
export function readStaticSourceLifecycle({folder=STATIC_FOLDER}={}){
  const index=JSON.parse(text(readFileSync(resolve(folder,'manifest.json'))));
  if(index.schema!=='router-static-source-lifecycle-v1'||index.archive!=='originals.json.gz'||!Number.isSafeInteger(index.rawBytes)||index.rawBytes<0||index.rawBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticError('fixed complete index required');
  const packed=readFileSync(resolve(folder,index.archive));if(packed.length!==index.bytes||hash(packed)!==index.sha256)staticError('full packed source differs');
  const raw=gunzipSync(packed,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)staticError('full original source differs');
  const bundle=JSON.parse(text(raw));if(bundle.schema!==index.schema||JSON.stringify(bundle.cases)!==JSON.stringify(STATIC_SOURCE_LIFECYCLE_CASES)||JSON.stringify(bundle.authority)!==JSON.stringify({namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}))staticError('test-data contract differs');
  if(!Array.isArray(bundle.profiles)||bundle.profiles.length!==2||new Set(bundle.profiles.map(row=>row.revision)).size!==2)staticError('two complete historical universes required');
  let bytes=0;for(const [id,row]of Object.entries(bundle.sources)){if(!/^[a-f0-9]{64}$/u.test(id)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||row.bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes||hash(row.source)!==id||staticHashBlob(Buffer.from(row.source))!==row.gitBlob)staticError('complete source content address differs');bytes+=row.bytes;if(bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticError('complete original source budget');}
  const canonicalRows=Object.entries(bundle.sources).filter(([,row])=>row.canonical!==undefined),documents=transportStaticSourceLifecycleCanonicals(canonicalRows);
  for(const [id,row]of canonicalRows)staticCst(row.source,documents.get(id));
  for(const profile of bundle.profiles){const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[profile.revision];if(!expected||profile.files.length!==expected.files||profile.files.reduce((sum,row)=>sum+row.bytes,0)!==expected.bytes||profile.sourceSetSha256!==expected.sourceSetSha256)staticError('fixed complete historical universe differs');}
  const profiles=[...bundle.profiles,bundle.current];
  for(const profile of profiles){if(!Array.isArray(profile.files)||!profile.files.length||profile.files.length>STATIC_SOURCE_LIFECYCLE_LIMITS.paths||profile.sourceSetSha256!==staticDigest(profile.files))staticError('complete profile rows differ');let previous='';
    for(const row of profile.files){if(typeof row.path!=='string'||row.path<=previous||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||!row.path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock'].includes(row.path))staticError('unique tracked Rust/Cargo path required');previous=row.path;const source=bundle.sources[row.sourceId];if(!source||source.bytes!==row.bytes||source.gitBlob!==row.gitBlob)staticError('complete file source/Git join differs');}
  }
  if(JSON.stringify(index.profiles)!==JSON.stringify(bundle.profiles.map(({revision,files,sourceSetSha256})=>({revision,files:files.length,sourceSetSha256})))||index.current!==bundle.current.sourceSetSha256)staticError('index full profile census differs');
  const current=new Map(bundle.current.files.map(row=>[row.path,row]));
  if(!Array.isArray(bundle.lineage)||bundle.lineage.length!==2)staticError('complete source lineage required');
  for(const profile of bundle.profiles){const stage=bundle.lineage.find(row=>row.revision===profile.revision);if(!stage||!Array.isArray(stage.files))staticError('actual profile lineage missing');const expected=profile.files.filter(row=>current.get(row.path)?.sourceId!==row.sourceId);if(JSON.stringify(stage.files.map(row=>row.path))!==JSON.stringify(expected.map(row=>row.path)))staticError('complete changed/deleted parent census differs');
    for(const row of stage.files){const before=profile.files.find(file=>file.path===row.path),after=current.get(row.path);if(JSON.stringify(row.before)!==JSON.stringify(before))staticError('actual original parent differs');if(!after){if(row.status!=='deleted'||row.current!==null||row.originalPreserved!==true)staticError('deleted original witness differs');continue;}
      if(row.status!=='changed'||JSON.stringify(row.after)!==JSON.stringify(after)||row.completeInverse!==true)staticError('actual current parent differs');const original=bundle.sources[before.sourceId],latest=bundle.sources[after.sourceId],document=documents.get(before.sourceId),latestDocument=documents.get(after.sourceId);if(!document||!latestDocument)staticError('both changed-parent canonical documents required');const boundaries=new Set([0,original.source.length,...document.nodes.flatMap(node=>[node[2],node[3]])]);
      if(!boundaries.has(row.edit.span[0])||!boundaries.has(row.edit.span[1]))staticError('whole original CST token/group boundary required');
      for(const [source,change,wanted]of [[original.source,row.edit,latest.source],[latest.source,row.inverse,original.source]]){const [start,end]=change.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||source.slice(start,end)!==change.expected||source.slice(0,start)+change.replacement+source.slice(end)!==wanted)staticError('complete source inverse differs');}
    }
  }
  return {index,bundle};
}
/** One explicit invocation captures data only; no global fixture/semantic cache. */
export function staticSourceLifecycleContext(testName,{folder=STATIC_FOLDER,root=ROOT,current=true}={}){
  const revision=STATIC_SOURCE_LIFECYCLE_CASES[testName];if(typeof revision!=='string')staticError('fixed original test association required');const {bundle,index}=readStaticSourceLifecycle({folder}),profile=bundle.profiles.find(row=>row.revision===revision);if(!profile)staticError('actual original profile missing');
  const historical=new Map(profile.files.map(row=>[row.path,bundle.sources[row.sourceId].source])),currentFiles=new Map(bundle.current.files.map(row=>[row.path,bundle.sources[row.sourceId].source]));
  if(current){
    const paths=staticExec('/usr/bin/git',['-C',root,'ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock'],{encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024}).split('\0').filter(Boolean).sort();if(JSON.stringify(paths)!==JSON.stringify(bundle.current.files.map(row=>row.path)))staticError('actual current source set differs');
    const raw=staticExec('/usr/bin/git',['-C',root,'cat-file','--batch'],{input:paths.map(path=>'HEAD:'+path+'\n').join(''),timeout:30000,maxBuffer:64*1024*1024});let at=0;
    for(const row of bundle.current.files){const end=raw.indexOf(10,at);if(end<at)staticError('complete current Git header');const [blob,kind,size]=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;const value=raw.subarray(at,at+row.bytes);at+=row.bytes;
      if(kind!=='blob'||blob!==row.gitBlob||Number(size)!==row.bytes||raw[at++]!==10||value.toString('utf8')!==currentFiles.get(row.path))staticError('current full Git source differs');
      let physical;try{physical=readFileSync(resolve(root,row.path));}catch(error){if(error.code!=='ENOENT')throw error;physical=value;}if(!physical.equals(value)||staticHashBlob(value)!==row.gitBlob||hash(value)!==row.sourceId)staticError('current physical/source/Git blob differs');
    }if(at!==raw.length)staticError('extra current Git bytes');
  }
  const source=path=>{if(!historical.has(path))staticError('unknown historical source path: '+path);return historical.get(path);};
  const sourceCurrent=path=>{if(!currentFiles.has(path))staticError('unknown current source path: '+path);return currentFiles.get(path);};
  // Return only detached source/profile/Cargo data. Ordinary compiler entrypoints
  // freshly rebuild every view, module binding, dependency and private proof.
  return {source,sourceCurrent,inputs:{entry:'src/lib.rs',sourceHead:profile.revision,compilationProfile:STATIC_PROFILE,sources:profile.files.map(row=>({source:row.path,bytes:row.bytes,sha256:row.sourceId,gitBlob:row.gitBlob})),originalBytes:profile.files.reduce((sum,row)=>sum+row.bytes,0),digest:profile.sourceSetSha256},current:{producerRevision:bundle.current.producerRevision,sourceSetSha256:bundle.current.sourceSetSha256,files:bundle.current.files},lineage:bundle.lineage.find(row=>row.revision===revision),scope:'Complete historical test source universe; current source evolution is retained data, never executable admission.',index};
}
