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
