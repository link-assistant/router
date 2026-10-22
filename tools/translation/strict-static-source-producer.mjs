#!/usr/bin/env node
import {readSelectedGitSizeRecords} from './selected-git-size-records.mjs';
import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {encodeStaticSourceStorageIncremental} from './static-source-layout-storage.mjs';
import {relocatedRustSourcePath,rustPackageSourcePath} from './repository-layout.mjs';
// Reviewed source-fixture producer. Git/CST history is data, never an issuer
// of namespace, method-dispatch, ownership or executable authority.
// Enter through the ordinary project bootstrap before structural extraction
// reaches the mutually dependent Host/Formatting/Text class declarations.
import './project.mjs';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute,dirname,basename,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {sourceItems} from './rust-structure.mjs';
import {extractImplDeclarations} from './impl-resolver.mjs';

export const REAL_SOURCE_ORIGINAL_REVISION='5de1dea8b777dcd6e637758efc2c260150735af5';
export const REAL_SOURCE_MANIFEST_SHA256='fc81dbdc0ddf1c650f41c41a4c44f3e30db4c28f76170f2857983f7d80c0ff67';
export const REAL_SOURCE_FIXTURE_LIMITS=Object.freeze({files:64,fileBytes:2*1024*1024,rawBytes:8*1024*1024,outputBytes:32*1024*1024});
const MANIFEST='tools/translation/fixtures/real-source-provenance.json';
const PREFIX='tools/translation/source-profiles/real-source-fixtures/';
const CORE=['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml','Cargo.lock'];
const ADOPTIONS=['bcfbe8516a87d9cbd85c3573ac05fa80cf8dc85b','92a6d41d671d8288e9bd3e3adcd47309ff1c6c9a','400e77e0fbcce4f8bfc035a51220a9ccfe68b776','eeb05407b75f32ee46a55913cbf3731760b76d15'];
const CURRENT_IDS=['identity-token','identity-first-block','login-status','format-resume_message'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Real source fixture: '+message);};
const pin=source=>({bytes:Buffer.byteLength(source),sha256:hash(source)});
const decode=bytes=>{const text=bytes.toString('utf8');if(!Buffer.from(text,'utf8').equals(bytes))fail('complete UTF8 source required');return text;};
const git=(root,args,options={})=>execFileSync('/usr/bin/git',['-C',root,...args],{timeout:30_000,maxBuffer:REAL_SOURCE_FIXTURE_LIMITS.outputBytes,...options});
const revision=(root,value)=>{if(typeof value!=='string'||!(/^[0-9a-f]{40}$/u.test(value)||value==='HEAD'))fail('explicit full revision or HEAD required');return git(root,['rev-parse','--verify',value+'^{commit}'],{encoding:'utf8'}).trim();};

/** Exact isolated selection; complete parent and discarded partitions remain. */
export function selectRealSourceFixture(source,entry,{current=false}={}){
  const items=sourceItems(source),declarations=[],selections=[];
  for(const expected of entry.declarations){
    let candidates=items.filter(item=>item.term===expected.term&&item.name===expected.name&&(current||item.start===expected.start&&item.end===expected.end));
    if(current){
      // Imports can share their first path component. Match the complete pinned
      // declaration before considering an actual changed function/constant.
      const exact=candidates.filter(item=>hash(source.slice(item.start,item.end))===expected.sha256);
      candidates=exact.length?exact:['fn','const'].includes(expected.term)?candidates:[];
    }
    if(candidates.length!==1)fail('unique original declaration required: '+entry.id+'/'+expected.name);
    const item=candidates[0],text=source.slice(item.start,item.end),actual={name:item.name,term:item.term,start:item.start,end:item.end,...pin(text)};
    if(!current&&actual.sha256!==expected.sha256)fail('original declaration hash changed');
    selections.push(actual);declarations.push(text);
  }
  const methods=[];
  for(const expected of entry.methodPins??[]){
    const candidates=extractImplDeclarations(source).implementations.filter(row=>row.typePath.join('::')===expected.owner).flatMap(row=>row.methods).filter(row=>row.name===expected.name&&(current||row.span.start===expected.start&&row.span.end===expected.end));
    if(candidates.length!==1)fail('unique original method required: '+entry.id+'/'+expected.name);
    const item=candidates[0],text=source.slice(item.span.start,item.span.end),actual={owner:expected.owner,name:item.name,start:item.span.start,end:item.span.end,...pin(text)};
    if(item.source!==text||!current&&actual.sha256!==expected.sha256)fail('original method hash changed');
    selections.push(actual);methods.push(actual);declarations.push(`impl ${expected.owner} {\n${text}\n}`);
  }
  const spans=selections.map(row=>[row.start,row.end]).sort((a,b)=>a[0]-b[0]),partitions=[];let end=0;
  for(const span of spans){if(span[0]<end)fail('overlapping selected declarations');if(span[0]>end)partitions.push({kind:'preserved-unselected',span:[end,span[0]]});partitions.push({kind:'selected',span});end=span[1];}
  if(end<source.length)partitions.push({kind:'preserved-unselected',span:[end,source.length]});
  if(partitions.map(row=>source.slice(...row.span)).join('')!==source)fail('complete parent partition inverse changed');
  if(entry.carrier)declarations.push(entry.carrier.source);
  return {id:entry.id,path:entry.path,parentSha256:hash(source),declarations:selections.filter(row=>!row.owner),methodPins:methods,partitions,source:declarations.join('\n'),carrier:entry.carrier??null,scope:current?'Exact current declarations in an authored Core carrier; not complete parent/crate admission.':'Exact historical native declarations; no source body substitutions.'};
}

function batch(root,requests){
  const keys=[...new Set(requests)];if(keys.length>REAL_SOURCE_FIXTURE_LIMITS.files)fail('Git source count bound');
  const bytes=git(root,['cat-file','--batch'],{input:keys.join('\n')+'\n'}),rows=new Map();let at=0,total=0;
  for(const key of keys){
    const newline=bytes.indexOf(10,at);if(newline<at)fail('incomplete Git header');const header=bytes.subarray(at,newline).toString('ascii').split(' '),length=Number(header[2]);
    if(header.length!==3||!/^[0-9a-f]{40}$/u.test(header[0])||header[1]!=='blob'||!Number.isSafeInteger(length)||length<0||length>REAL_SOURCE_FIXTURE_LIMITS.fileBytes)fail('complete bounded Git blob required');
    at=newline+1;const raw=bytes.subarray(at,at+length);if(raw.length!==length||bytes[at+length]!==10)fail('incomplete Git body');at+=length+1;total+=length;if(total>REAL_SOURCE_FIXTURE_LIMITS.rawBytes)fail('complete source byte bound');
    const source=decode(raw),blob=createHash('sha1').update(Buffer.from(`blob ${raw.length}\0`)).update(raw).digest('hex');if(blob!==header[0])fail('Git source blob differs');rows.set(key,{source,gitBlob:blob,...pin(source)});
  }
  if(at!==bytes.length)fail('extra Git bytes');return rows;
}
function delta(before,after){
  let start=0,end=before.source.length,suffix=after.source.length;
  while(start<end&&start<suffix&&before.source[start]===after.source[start])start++;
  while(end>start&&suffix>start&&before.source[end-1]===after.source[suffix-1]){end--;suffix--;}
  const boundaries=[...new Set([0,before.source.length,...before.document.nodes.flatMap(row=>[row[2],row[3]])])].sort((a,b)=>a-b);
  start=boundaries.filter(at=>at<=start).at(-1);end=boundaries.find(at=>at>=end);suffix=end+after.source.length-before.source.length;
  const edit={span:[start,end],expected:before.source.slice(start,end),replacement:after.source.slice(start,suffix)};
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[],repositoryRules:[{id:'repository.reviewed-native-adoption-history',edits:[edit]}]});
  if(applied.value.source!==after.source)fail('actual adoption output differs');
  const inverse={span:[start,start+edit.replacement.length],expected:edit.replacement,replacement:edit.expected};
  const undone=after.source.slice(0,inverse.span[0])+inverse.replacement+after.source.slice(inverse.span[1]);if(undone!==before.source)fail('complete adoption inverse differs');
  return {edit,inverse,trace:applied.trace,afterCanonicalSha256:hash(serializeConcreteSyntaxMeta(applied.value)),completeInverse:true,meaning:'Exact reviewed Git adoption source delta; not a new semantic or dispatch proof.'};
}
function archivedHistory(folder,manifest){
  const index=JSON.parse(decode(readFileSync(resolve(folder,'manifest.json'))));
  if(index.schema!=='router-complete-real-source-fixtures-v1'||index.archive!=='originals.json.gz'||index.originalRevision!==REAL_SOURCE_ORIGINAL_REVISION||index.originalManifestSha256!==REAL_SOURCE_MANIFEST_SHA256||!Number.isSafeInteger(index.rawBytes)||index.rawBytes>REAL_SOURCE_FIXTURE_LIMITS.outputBytes)fail('reviewed history index differs');
  const packed=readFileSync(resolve(folder,index.archive));if(packed.length!==index.bytes||hash(packed)!==index.sha256)fail('reviewed history compressed bytes differ');
  const raw=gunzipSync(packed,{maxOutputLength:REAL_SOURCE_FIXTURE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)fail('reviewed history raw bytes differ');const bundle=JSON.parse(decode(raw));
  if(bundle.historical.revision!==REAL_SOURCE_ORIGINAL_REVISION||bundle.historical.manifestSha256!==REAL_SOURCE_MANIFEST_SHA256||bundle.lineage.length!==ADOPTIONS.length)fail('reviewed original history differs');
  const source=row=>{const value=bundle.sources[row.sourceId];if(!value||typeof value.source!=='string'||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>REAL_SOURCE_FIXTURE_LIMITS.fileBytes||value.bytes!==row.bytes||Buffer.byteLength(value.source)!==row.bytes||hash(value.source)!==row.sourceId||createHash('sha1').update(Buffer.from(`blob ${row.bytes}\0`)).update(value.source).digest('hex')!==row.gitBlob)fail('reviewed complete source differs');return {...value,sha256:row.sourceId,gitBlob:row.gitBlob};};
  const expected=[...new Set(manifest.entries.flatMap(row=>[row.path,...(row.testSource?[row.testSource]:[])]))].sort();
  if(JSON.stringify(bundle.historical.files.map(row=>row.path))!==JSON.stringify(expected))fail('reviewed original fifteen-source census differs');
  const originals=new Map(bundle.historical.files.map(row=>[row.path,source(row)])),current=new Map([...originals].map(([path,row])=>[path,row.sha256]));
  for(const entry of manifest.entries)if(originals.get(entry.path)?.sha256!==entry.sourceSha256)fail('reviewed original manifest/source pin differs');
  const stages=bundle.lineage.map((stage,index)=>{
    if(stage.revision!==ADOPTIONS[index]||!/^[0-9a-f]{40}$/u.test(stage.parent))fail('reviewed adoption revisions differ');
    const paths=stage.files.map(row=>row.path);if(JSON.stringify(paths)!==JSON.stringify(stage.paths)||new Set(paths).size!==paths.length)fail('reviewed adoption path census differs');
    const files=stage.files.map(row=>{
      if(!originals.has(row.path)||row.before.path!==row.path||row.after.path!==row.path||current.get(row.path)!==row.before.sourceId||row.completeInverse!==true)fail('reviewed adoption association differs');const before=source(row.before),after=source(row.after);
      for(const [text,edit,wanted]of [[before.source,row.edit,after.source],[after.source,row.inverse,before.source]]){const [start,end]=edit.span;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>text.length||text.slice(start,end)!==edit.expected||text.slice(0,start)+edit.replacement+text.slice(end)!==wanted)fail('reviewed complete adoption inverse differs');}
      current.set(row.path,row.after.sourceId);return {path:row.path,before,after};
    });return {revision:stage.revision,parent:stage.parent,paths,files};
  });
  return {originals,stages};
}

/** Trusted stock Git/filesystem source tool; never installs application bytes. */
export function prepareRealSourceFixtures({root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),currentRevision='HEAD',historyArchive=null}={}){
  root=realpathSync(root);const current=revision(root,currentRevision),original=historyArchive===null?revision(root,REAL_SOURCE_ORIGINAL_REVISION):REAL_SOURCE_ORIGINAL_REVISION;
  const manifestBytes=git(root,['show',current+':'+MANIFEST]);if(hash(manifestBytes)!==REAL_SOURCE_MANIFEST_SHA256)fail('original complete fixture manifest changed');
  if(historyArchive===null&&!git(root,['show',original+':'+MANIFEST]).equals(manifestBytes))fail('historical fixture manifest changed');
  const manifest=JSON.parse(decode(manifestBytes)),paths=[...new Set(manifest.entries.flatMap(row=>[row.path,...(row.testSource?[row.testSource]:[])]))].sort();
  const currentPaths=[...new Set([...paths,...CORE])].sort(),physical=path=>rustPackageSourcePath(root,path);let raw,adoptions;
  const currentBatch=()=>{const selected=batch(root,currentPaths.map(path=>current+':'+physical(path)));return new Map(currentPaths.map(path=>[current+':'+path,selected.get(current+':'+physical(path))]));};
  if(historyArchive===null){
    const changedPaths=paths; // Preserve all four fixed historical adoption domains after a physical move.
    adoptions=ADOPTIONS.map(value=>{const commit=revision(root,value),parent=git(root,['rev-parse',commit+'^'],{encoding:'utf8'}).trim();return {revision:commit,parent,paths:git(root,['diff-tree','--no-commit-id','--name-only','-r',commit,'--',...changedPaths],{encoding:'utf8'}).trim().split('\n').filter(Boolean)};});
    raw=new Map([...batch(root,[...paths.map(path=>original+':'+path),...adoptions.flatMap(stage=>stage.paths.flatMap(path=>[stage.parent+':'+path,stage.revision+':'+path]))]),...currentBatch()]);
  }else{
    if(typeof historyArchive!=='string')fail('explicit reviewed archive directory required');const history=archivedHistory(historyArchive,manifest),fresh=currentBatch();raw=new Map(paths.map(path=>[original+':'+path,history.originals.get(path)]));for(const [key,row]of fresh)raw.set(key,row);
    adoptions=history.stages.map(({revision,parent,paths})=>({revision,parent,paths}));for(const stage of history.stages)for(const row of stage.files){raw.set(stage.parent+':'+row.path,row.before);raw.set(stage.revision+':'+row.path,row.after);}
  }
  if(raw.size>REAL_SOURCE_FIXTURE_LIMITS.files||[...raw.values()].reduce((sum,row)=>sum+row.bytes,0)>REAL_SOURCE_FIXTURE_LIMITS.rawBytes)fail('complete replay source bounds');
  const changedPaths=paths.filter(path=>raw.get(original+':'+path).source!==raw.get(current+':'+path).source);
  const snapshot=()=>currentPaths.map(path=>{const row=raw.get(current+':'+path),bytes=readFileSync(resolve(root,physical(path)));if(decode(bytes)!==row.source)fail('physical current source differs from selected revision: '+path);return {path,physicalPath:physical(path),bytes:bytes.length,sha256:hash(bytes),gitBlob:row.gitBlob};});
  const before=snapshot();
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'native-fixture.complete-cst-and-exact-declarations',apply:()=>{
      const sources=new Map();let retainedBytes=0;
      for(const [key,row]of raw)if(!sources.has(row.sha256)){
        const transported=key.endsWith('.rs')?transportConcreteSyntaxSource(row.source,{language:'Rust'}):null;
        if(transported&&transported.source!==row.source)fail('complete native source CST changed');
        const value={source:row.source,bytes:row.bytes,canonical:transported?.meta??null};retainedBytes+=Buffer.byteLength(JSON.stringify(value));if(retainedBytes>REAL_SOURCE_FIXTURE_LIMITS.outputBytes)fail('retained complete fixture byte bound');sources.set(row.sha256,{...value,document:transported?.document??null});
      }
      const selections=manifest.entries.map(entry=>{const row=raw.get(original+':'+entry.path);if(row.sha256!==entry.sourceSha256)fail('original complete parent hash differs: '+entry.path);return selectRealSourceFixture(row.source,entry);});
      const currentSelections=manifest.entries.map(entry=>selectRealSourceFixture(raw.get(current+':'+entry.path).source,entry,{current:true}));
      return {sources,selections,currentSelections};
    }}]},
    {phase:'repository',rules:[{id:'native-fixture.content-addressed-history-and-packets',apply:state=>{
      const record=(rev,path)=>{const row=raw.get(rev+':'+path);return {path,...(rev===current?{physicalPath:physical(path)}:{}),sourceId:row.sha256,bytes:row.bytes,gitBlob:row.gitBlob};};
      const lineage=adoptions.map(stage=>({...stage,files:stage.paths.map(path=>{const before=record(stage.parent,path),after=record(stage.revision,path);return {path,before,after,...delta(state.sources.get(before.sourceId),state.sources.get(after.sourceId))};})}));
      const currentEvolution=[];
      for(const path of paths){let before=record(original,path);for(const stage of lineage){const row=stage.files.find(row=>row.path===path);if(row){if(row.before.sourceId!==before.sourceId)fail('adoption history is not continuous');before=row.after;}}
        const after=record(current,path);if(before.sourceId!==after.sourceId)currentEvolution.push({path,before,after,...delta(state.sources.get(before.sourceId),state.sources.get(after.sourceId))});
      }
      return {schema:'router-complete-real-source-fixtures-v1',historical:{revision:original,manifestSha256:REAL_SOURCE_MANIFEST_SHA256,files:paths.map(path=>record(original,path)),selections:state.selections},current:{revision:current,files:currentPaths.map(path=>record(current,path)),selections:state.currentSelections,behaviorIds:CURRENT_IDS},lineage,currentEvolution,sources:Object.fromEntries([...state.sources].map(([id,row])=>[id,{source:row.source,bytes:row.bytes,canonical:row.canonical}])),authority:{namespace:false,dispatch:false,ownership:false,executable:false}};
    }}]},
  ]);
  const result=pipeline.run(null),payload={...result.value,trace:result.trace},rawPayload=Buffer.from(JSON.stringify(payload)+'\n'),packed=gzipSync(rawPayload,{level:9,mtime:0});if(rawPayload.length>REAL_SOURCE_FIXTURE_LIMITS.outputBytes)fail('complete fixture output bound');
  const index={schema:payload.schema,originalRevision:original,currentRevision:current,originalManifestSha256:REAL_SOURCE_MANIFEST_SHA256,archive:'originals.json.gz',rawBytes:rawPayload.length,rawSha256:hash(rawPayload),bytes:packed.length,sha256:hash(packed),historicalFiles:paths.length,currentFiles:currentPaths.length,trace:result.trace,scope:'Historical originals plus separately reviewed current isolated carriers; no whole-crate parity or native execution claim.'};
  const notice=`# Complete historical Router fixture sources\n\nOriginals: Router Git ${original}; original fixture manifest SHA256 ${REAL_SOURCE_MANIFEST_SHA256}. All 15 complete production/native-test parents are retained without source substitutions. Current isolated-carrier parents: ${current}. Full source CST partitions, exact selections and adoption inverses are in the content-addressed archive. Existing Router LICENSE applies. This fixture is test data, never namespace, dispatch, ownership or executable authority.\n`;
  const files=[{path:PREFIX+'originals.json.gz',encoding:'base64',content:packed.toString('base64')},{path:PREFIX+'manifest.json',encoding:'utf8',content:JSON.stringify(index,null,2)+'\n'},{path:PREFIX+'NOTICE.md',encoding:'utf8',content:notice}].map(row=>{const bytes=Buffer.from(row.content,row.encoding);return {...row,bytes:bytes.length,sha256:hash(bytes)};});
  const after=snapshot();if(JSON.stringify(before)!==JSON.stringify(after))fail('current source snapshot changed');
  return {schema:'router-real-source-fixture-proposal-v1',sourceRoot:root,originalRevision:original,currentRevision:current,historyMode:historyArchive===null?'original-Git-blobs':'explicit-reviewed-archive-replay',before,after,files,trace:result.trace,limits:REAL_SOURCE_FIXTURE_LIMITS,completeInverse:true,trustedToolDomain:'Reviewed stock Git/filesystem/crypto source producer, not hostile-callback, atomic filesystem or native-total attestation. Explicit archive replay does not re-attest unavailable historical Git objects.'};
}

function within(root,path){const value=relative(root,path);return value!==''&&value!=='..'&&!value.startsWith('..'+sep)&&!isAbsolute(value);}
function physical(path){let at=path;const tail=[];for(;;){try{return resolve(realpathSync(at),...tail);}catch(error){if(error.code!=='ENOENT')throw error;let link;try{link=lstatSync(at);}catch(missing){if(missing.code!=='ENOENT')throw missing;}if(link)fail('unresolved output ancestor');const next=dirname(at);if(next===at)fail('output ancestor unavailable');tail.unshift(basename(at));at=next;}}}
export function writeRealSourceFixtureProposal(proposal,output){
  if(proposal?.schema!=='router-real-source-fixture-proposal-v1'||typeof output!=='string'||!isAbsolute(output))fail('prepared proposal and absolute external output required');
  const root=realpathSync(proposal.sourceRoot),target=resolve(output),expected=physical(target),overlaps=value=>value===root||within(root,value)||within(value,root);if(overlaps(target)||overlaps(expected))fail('output must be physically outside source root');
  mkdirSync(target,{recursive:true});if(realpathSync(target)!==expected||overlaps(realpathSync(target)))fail('physical output changed');
  for(const row of proposal.files){const relativePath=row.path.slice(PREFIX.length);if(row.path!==PREFIX+relativePath||!['originals.json.gz','manifest.json','NOTICE.md'].includes(relativePath))fail('fixed fixture output path required');const bytes=Buffer.from(row.content,row.encoding);if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete proposed bytes changed');writeFileSync(resolve(target,relativePath),bytes,{flag:'wx'});}
  writeFileSync(resolve(target,'proposal.json'),JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});return target;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(![6,8].includes(args.length)||args[0]!=='--root'||args[2]!=='--current-revision'||args[4]!=='--output'||args.length===8&&args[6]!=='--history-archive')fail('usage: --root PATH --current-revision SHA --output ABSOLUTE_PATH [--history-archive REVIEWED_DIRECTORY]');
  const proposal=prepareRealSourceFixtures({root:args[1],currentRevision:args[3],historyArchive:args[7]??null});process.stdout.write(JSON.stringify({output:writeRealSourceFixtureProposal(proposal,args[5]),historyMode:proposal.historyMode,files:proposal.files.map(({path,bytes,sha256})=>({path,bytes,sha256})),trace:proposal.trace})+'\n');
}


// Explicit sibling test-data contract. The original producer above is unchanged.
// Complete historical sources never issue namespace, ownership or behavior facts.
export const STATIC_SOURCE_LIFECYCLE_LIMITS=Object.freeze({paths:20000,fileBytes:8*1024*1024,sourceBytes:64*1024*1024,outputBytes:256*1024*1024});
export const STATIC_SOURCE_LIFECYCLE_CASES=Object.freeze({"bang-output-observer.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","compilation-matrix.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","derive-bang-footprints.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","fixed-arrays.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","integer-range-patterns.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","json-macro-arrays.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","json-source-f64-borrows.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","macro-use-bindings.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","matrix-bulk.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","namespace-census.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","option-ok-or-else.test.mjs":"e4561e76506ed25a7e638fb1e00a965f8479e1db","option-ok-or.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","production-iterator-chains.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","rust-structure-performance.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","slice-membership-originals.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5","trait-object-derive-source.test.mjs":"5de1dea8b777dcd6e637758efc2c260150735af5"});
export const STATIC_SOURCE_LIFECYCLE_PROFILES=Object.freeze({"5de1dea8b777dcd6e637758efc2c260150735af5":{"files":806,"bytes":9952429,"sourceSetSha256":"fa513c50ae94c3ccba510ddd5a954451bedf63a2a823805c62eb8fee08b4affa"},"e4561e76506ed25a7e638fb1e00a965f8479e1db":{"files":808,"bytes":9961521,"sourceSetSha256":"8683ed8c1f78d91f109d9c3f41151fa54e605833e03caac2bb821f00aa8f6d16"}});
import {transportConcreteSyntaxSources,transportConcreteSyntaxMetaChunks} from './concrete-syntax-meta.mjs';
const STATIC_SOURCE_PREFIX='tools/translation/source-profiles/static-source-lifecycle/';
const staticFail=message=>{throw new TypeError('Static source lifecycle: '+message);};
const staticGit=(root,args,options={})=>execFileSync('/usr/bin/git',['-C',root,...args],{timeout:30000,maxBuffer:STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes+8*1024*1024,...options});
const staticBlob=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const staticRowsDigest=rows=>hash(JSON.stringify(rows));
// New sibling schedule only. Native APIs still independently rebuild every row;
// these grouping counts never grant CST, namespace or semantic admission.
function staticSourceCsts(rows,accept){
  let pending=[],units=0,bytes=0;
  const flush=()=>{if(!pending.length)return;const actual=transportConcreteSyntaxSources(pending.map(([,row])=>({source:row.source,language:'Rust'})));
    if(actual.rows.length!==pending.length)staticFail('complete source batch census differs');for(let i=0;i<pending.length;i++)accept(pending[i][0],actual.rows[i]);pending=[];units=0;bytes=0;};
  for(const [id,row]of rows){const size=Buffer.byteLength(row.source);if(row.source.length>65536){flush();accept(id,transportConcreteSyntaxSource(row.source,{language:'Rust'}));continue;}
    if(pending.length===256||units+row.source.length>65536||bytes+size>262144)flush();pending.push([id,row]);units+=row.source.length;bytes+=size;
  }flush();
}
/** Full untrusted stored-CST transport; no source-origin shortcut or receipt. */
export function transportStaticSourceLifecycleCanonicals(rows){
  const out=new Map();visitStaticSourceLifecycleCanonicals(rows,(id,document)=>out.set(id,document));return out;
}
/** Explicit data-only visitor; each complete native batch is consumed locally.
 * No callback equivalence or semantic/source authority is issued by this API. */
export function visitStaticSourceLifecycleCanonicals(rows,accept){
  if(typeof accept!=='function')staticFail('canonical data visitor required');
  let pending=[],units=0,bytes=0,canonical=0;
  const flush=()=>{if(!pending.length)return;const actual=transportConcreteSyntaxMetaChunks([pending.map(([,row])=>row.canonical)]),values=actual.chunks[0]?.rows;
    if(!values||values.length!==pending.length)staticFail('complete canonical batch census differs');
    for(let i=0;i<pending.length;i++){const [id,row]=pending[i],value=values[i];if(value.meta!==row.canonical||value.source!==row.source||value.document.language!=='Rust')staticFail('complete canonical source association differs');accept(id,value.document);}
    pending=[];units=0;bytes=0;canonical=0;};
  for(const [id,row]of rows){if(typeof row.source!=='string'||typeof row.canonical!=='string')staticFail('complete changed-parent CST missing');
    // Never parse untrusted metadata to plan a batch. Primitive length is
    // bounded first; the existing native preflight/grammar owns every parse.
    if(row.canonical.length>33554432)staticFail('complete canonical code-unit bound');const size=Buffer.byteLength(row.source);
    if(pending.length&&(pending.length===256||units+row.source.length>65536||bytes+size>262144||canonical+row.canonical.length>33554432))flush();
    pending.push([id,row]);units+=row.source.length;bytes+=size;canonical+=row.canonical.length;
  }flush();
}
function staticDelta(before,after){
  const operation=createRulePipeline([
    {phase:'language',rules:[{id:'static-fixture.whole-original-cst-span',apply:()=>{
      let start=0,end=before.source.length,suffix=after.source.length;
      while(start<end&&start<suffix&&before.source[start]===after.source[start])start++;
      while(end>start&&suffix>start&&before.source[end-1]===after.source[suffix-1]){end--;suffix--;}
      const boundaries=before.boundaries,afterBoundaries=new Set(after.boundaries),difference=after.source.length-before.source.length;
      start=boundaries.filter(at=>at<=start&&afterBoundaries.has(at)).at(-1);end=boundaries.find(at=>at>=end&&afterBoundaries.has(at+difference));
      if(start===undefined||end===undefined)staticFail('paired original/current CST boundary required');suffix=end+difference;
      return {span:[start,end],expected:before.source.slice(start,end),replacement:after.source.slice(start,suffix)};
    }}]},
    {phase:'repository',rules:[{id:'static-fixture.exact-current-parent-and-inverse',apply:edit=>{
      const [start,end]=edit.span;if(before.source.slice(start,end)!==edit.expected||before.source.slice(0,start)+edit.replacement+before.source.slice(end)!==after.source)staticFail('actual whole-parent substitution differs');
      const inverse={span:[start,start+edit.replacement.length],expected:edit.replacement,replacement:edit.expected};
      if(after.source.slice(...inverse.span)!==inverse.expected||after.source.slice(0,inverse.span[0])+inverse.replacement+after.source.slice(inverse.span[1])!==before.source)staticFail('complete adoption inverse differs');
      return {edit,inverse};
    }}]},
  ]).run(null);
  return {...operation.value,trace:operation.trace,afterCanonicalSha256:hash(after.canonical),completeInverse:true,meaning:'Exact reviewed Git adoption source delta; not a new semantic or dispatch proof.'};
}
function staticCapture(root,rev,{nestedPackage=false}={}){
  const listing=readSelectedGitSizeRecords({revision:rev,run:(args,options)=>staticGit(root,args,options),select:path=>!(!path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock',...(nestedPackage?['rust/Cargo.toml']:[])].includes(path)),maxPaths:STATIC_SOURCE_LIFECYCLE_LIMITS.paths,maxFileBytes:STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes,maxTotalBytes:STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes}),rows=[];
  for(const record of listing){const tab=record.indexOf('\t'),path=record.slice(tab+1),fields=record.slice(0,tab).trim().split(/\s+/u);
    if(!path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock',...(nestedPackage?['rust/Cargo.toml']:[])].includes(path))continue;
    if(tab<0||fields.length!==4||fields[1]!=='blob'||path.startsWith('/')||path.includes('\\')||path.split('/').some(value=>!value||value==='.'||value==='..'))staticFail('complete tracked source row required');
    const bytes=Number(fields[3]);if(!Number.isSafeInteger(bytes)||bytes<0||bytes>STATIC_SOURCE_LIFECYCLE_LIMITS.fileBytes)staticFail('individual source byte bound');
    rows.push({path,gitBlob:fields[2],bytes});
  }
  rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(!rows.length||rows.length>STATIC_SOURCE_LIFECYCLE_LIMITS.paths||new Set(rows.map(row=>row.path)).size!==rows.length||rows.reduce((sum,row)=>sum+row.bytes,0)>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticFail('complete source census bound');
  const raw=staticGit(root,['cat-file','--batch'],{input:rows.map(row=>rev+':'+row.path+'\n').join('')}),sources=new Map();let at=0;
  for(const row of rows){const end=raw.indexOf(10,at);if(end<at)staticFail('complete source header');const fields=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;
    if(fields.length!==3||fields[0]!==row.gitBlob||fields[1]!=='blob'||Number(fields[2])!==row.bytes)staticFail('source Git association differs');
    const bytes=raw.subarray(at,at+row.bytes);at+=row.bytes;if(bytes.length!==row.bytes||raw[at++]!==10||staticBlob(bytes)!==row.gitBlob)staticFail('complete original Git body differs');
    const source=decode(bytes);row.sourceId=hash(bytes);sources.set(row.sourceId,{source,bytes:bytes.length,gitBlob:row.gitBlob});
  }
  if(at!==raw.length)staticFail('extra source batch bytes');return {files:rows,sources,sourceSetSha256:staticRowsDigest(rows)};
}
import {encodeStaticSourceStorage,decodeStaticSourceStorage} from './static-source-layout-storage.mjs';
import {serializeSourceMapJson} from './source-map-json.mjs';
function staticReadArchive(folder){
  const index=JSON.parse(decode(readFileSync(resolve(folder,'manifest.json'))));
  if(index.schema!=='router-static-source-lifecycle-v1'||index.archive!=='originals.json.gz'||!Number.isSafeInteger(index.rawBytes)||index.rawBytes<0||index.rawBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('reviewed index differs');
  const packed=readFileSync(resolve(folder,index.archive));if(packed.length!==index.bytes||hash(packed)!==index.sha256)staticFail('reviewed packed source differs');
  const raw=gunzipSync(packed,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes});if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)staticFail('reviewed full source differs');
  const bundle=decodeStaticSourceStorage(raw,index);if(bundle.schema!==index.schema||JSON.stringify(bundle.cases)!==JSON.stringify(STATIC_SOURCE_LIFECYCLE_CASES))staticFail('fixed test association differs');
  return {index,bundle};
}
/** Source-only deterministic proposal. No application or generated source installs. */
export function prepareStaticSourceLifecycleProposal({root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),currentRevision='HEAD',historyArchive=null}={}){
  root=realpathSync(root);const subjectRevision=revision(root,currentRevision),history=historyArchive===null?null:staticReadArchive(historyArchive),sources=new Map(),profiles=[];
  let sourceBytes=0,retainedBytes=0;
  const add=(id,row)=>{if(sources.has(id)){if(sources.get(id).source!==row.source)staticFail('source identity collision');return;}sourceBytes+=row.bytes;if(sourceBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticFail('deduplicated complete source byte bound');sources.set(id,{...row});};
  const revisions=[...new Set(Object.values(STATIC_SOURCE_LIFECYCLE_CASES))];
  for(const rev of revisions){
    let captured;
    if(history){const profile=history.bundle.profiles.find(row=>row.revision===rev);if(!profile||profile.sourceSetSha256!==staticRowsDigest(profile.files))staticFail('historical full profile differs');captured={...profile,sources:new Map(profile.files.map(row=>{const value=history.bundle.sources[row.sourceId];if(!value||value.bytes!==row.bytes||hash(value.source)!==row.sourceId||staticBlob(Buffer.from(value.source))!==row.gitBlob)staticFail('historical complete source bytes differ');return [row.sourceId,value];}))};}
    else captured=staticCapture(root,revision(root,rev));
    const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[rev];if(captured.files.length!==expected.files||captured.files.reduce((sum,row)=>sum+row.bytes,0)!==expected.bytes||captured.sourceSetSha256!==expected.sourceSetSha256)staticFail('fixed complete historical universe differs');
    profiles.push({revision:rev,files:captured.files,sourceSetSha256:captured.sourceSetSha256});for(const [id,row]of captured.sources)add(id,row);
  }
  // Preserve the fixed historical universes. Current Router captures include
  // both workspace and nested package manifests plus the shared lockfile.
  const fresh=staticCapture(root,subjectRevision,{nestedPackage:true});for(const [id,row]of fresh.sources)add(id,row);
  const actual=()=>fresh.files.map(row=>{let bytes;try{bytes=readFileSync(resolve(root,row.path));}catch(error){if(error.code!=='ENOENT')throw error;bytes=staticGit(root,['show',subjectRevision+':'+row.path]);}if(bytes.length!==row.bytes||hash(bytes)!==row.sourceId||staticBlob(bytes)!==row.gitBlob)staticFail('current physical/Git source differs: '+row.path);return row;});
  const before=actual(),provenanceRevision=history?.bundle.current.sourceSetSha256===fresh.sourceSetSha256?history.bundle.current.producerRevision:subjectRevision;
  const frontier=JSON.parse(decode(staticGit(root,['show',subjectRevision+':tools/translation/fixtures/formatting-owner-frontier.json'])));
  const historical=profiles.find(row=>row.revision===revisions[0]);for(const row of frontier.originalFiles){const file=historical.files.find(file=>file.path===row.source);if(!file||file.sourceId!==row.sha256||file.bytes!==row.bytes)staticFail('all original formatting parents must join');}
  const currentByPath=new Map(fresh.files.map(row=>[row.path,row])),changedIds=new Set(),lineage=[];
  for(const profile of profiles){const files=[];for(const before of profile.files){const moved=relocatedRustSourcePath(before.path),after=(before.path==='Cargo.toml'?currentByPath.get(moved):undefined)??currentByPath.get(before.path)??currentByPath.get(moved);if(!after){files.push({path:before.path,status:'deleted',before,current:null,originalPreserved:true});continue;}if(before.sourceId!==after.sourceId){changedIds.add(before.sourceId);changedIds.add(after.sourceId);files.push({path:before.path,status:'changed',before,after});}}lineage.push({revision:profile.revision,files});}
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'static-fixture.complete-original-cst-and-current-source-joins',apply:()=>{
      for(const row of sources.values()){retainedBytes+=Buffer.byteLength(JSON.stringify({source:row.source,bytes:row.bytes,gitBlob:row.gitBlob}));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('retained source bound');}
      const changed=[...sources].filter(([id])=>changedIds.has(id));
      // Serialize the complete first document independently and compare every
      // code unit with the transport wire before sharing equal primitive DATA.
      // The full fresh second-document comparison remains mandatory below.
      const firstDocuments=new Map();
      staticSourceCsts(changed,(id,cst)=>{const row=sources.get(id);if(cst.source!==row.source||cst.document.language!=='Rust')staticFail('complete source CST differs');const first=JSON.stringify(cst.document);if(first!==cst.meta)staticFail('independent first CST serialization differs');retainedBytes+=Buffer.byteLength(JSON.stringify(cst.meta));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete retained CST bound');row.canonical=cst.meta;firstDocuments.set(id,row.canonical);});
      visitStaticSourceLifecycleCanonicals(changed,(id,document)=>{
        if(JSON.stringify(document)!==firstDocuments.get(id))staticFail('independent complete CST classification differs');firstDocuments.delete(id);
        const boundaries=new Set([0,document.source.length]);for(const node of document.nodes){boundaries.add(node[2]);boundaries.add(node[3]);}
        sources.get(id).boundaries=[...boundaries].sort((a,b)=>a-b);
      });
      for(const stage of lineage)for(const row of stage.files)if(row.status==='changed'){
        Object.assign(row,staticDelta(sources.get(row.before.sourceId),sources.get(row.after.sourceId)));retainedBytes+=Buffer.byteLength(JSON.stringify(row));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete inverse retention bound');
      }
      return {lineage};
    }}]},
    {phase:'repository',rules:[{id:'static-fixture.fixed-historical-universes-and-reversible-current-parents',apply:state=>({schema:'router-static-source-lifecycle-v1',cases:STATIC_SOURCE_LIFECYCLE_CASES,profiles,current:{producerRevision:provenanceRevision,files:fresh.files,sourceSetSha256:fresh.sourceSetSha256},lineage:state.lineage,sources:Object.fromEntries([...sources].map(([id,row])=>[id,{source:row.source,bytes:row.bytes,gitBlob:row.gitBlob,...(row.canonical?{canonical:row.canonical}:{})}])),authority:{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}})}]},
  ]),result=pipeline.run(null),bundle={...result.value,trace:result.trace},raw=serializeSourceMapJson(bundle);
  if(raw.length>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete output byte bound');
  const stored=encodeStaticSourceStorage(bundle,raw),packed=gzipSync(stored.raw,{level:1,mtime:0}),index={schema:bundle.schema,archive:'originals.json.gz',rawBytes:stored.raw.length,rawSha256:hash(stored.raw),bytes:packed.length,sha256:hash(packed),...(stored.storage?{storage:stored.storage}:{}),profiles:profiles.map(({revision,files,sourceSetSha256})=>({revision,files:files.length,sourceSetSha256})),current:bundle.current.sourceSetSha256,trace:result.trace},notice='# Complete static source lifecycle fixtures\n\nTwo complete original Router Rust/Cargo source universes and separately captured current source parents. All original LICENSE terms apply. Historical revisions: '+revisions.join(', ')+'. Full source/Git blob/CST joins and reversible actual source evolution are data only: no namespace, dispatch, ownership, trait, semantic or execution authority. Current producer revision is provenance; exact full source rows determine freshness across compiler/asset-only commits.\n';
  const files=[{path:STATIC_SOURCE_PREFIX+'originals.json.gz',encoding:'base64',content:packed.toString('base64')},{path:STATIC_SOURCE_PREFIX+'manifest.json',encoding:'utf8',content:JSON.stringify(index,null,2)+'\n'},{path:STATIC_SOURCE_PREFIX+'NOTICE.md',encoding:'utf8',content:notice}].map(row=>({...row,bytes:Buffer.byteLength(row.content,row.encoding),sha256:hash(Buffer.from(row.content,row.encoding))}));
  const after=actual();if(JSON.stringify(before)!==JSON.stringify(after))staticFail('source inputs changed');
  return {schema:'router-static-source-lifecycle-proposal-v1',sourceRoot:root,subjectRevision,provenanceRevision,before,after,files,cstSchedule:{source:'existing bounded Sources; large rows existing single transport',canonical:'every canonical through full untrusted MetaChunks',substitution:'actual whole-span language/repository pipeline; full inverse',retention:'first full document JSON captured during source pass; full fresh second JSON compared before retaining only whole-node boundaries; native batch results released after visitor consumption'},trace:result.trace,limits:STATIC_SOURCE_LIFECYCLE_LIMITS,completeInverse:true,authority:bundle.authority};
}
export function writeStaticSourceLifecycleProposal(proposal,output){
  if(proposal?.schema!=='router-static-source-lifecycle-proposal-v1'||typeof output!=='string'||!isAbsolute(output))staticFail('explicit external proposal output required');
  if(!Array.isArray(proposal.files)||proposal.files.length!==3||new Set(proposal.files.map(row=>row.path)).size!==3)staticFail('three complete fixed artifacts required');
  const root=realpathSync(proposal.sourceRoot),target=resolve(output),expected=physical(target),overlaps=value=>value===root||within(root,value)||within(value,root);if(overlaps(target)||overlaps(expected))staticFail('output overlaps sources');
  mkdirSync(target,{recursive:true});if(realpathSync(target)!==expected||overlaps(realpathSync(target)))staticFail('output physical identity differs');
  for(const row of proposal.files){const name=row.path.slice(STATIC_SOURCE_PREFIX.length);if(row.path!==STATIC_SOURCE_PREFIX+name||!['manifest.json','originals.json.gz','NOTICE.md'].includes(name))staticFail('fixed output path required');const bytes=Buffer.from(row.content,row.encoding);if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)staticFail('full proposal bytes differ');writeFileSync(resolve(target,name),bytes,{flag:'wx'});}
  writeFileSync(resolve(target,'proposal.json'),JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});return target;
}

// Generated invocation-local source/CST allocation variant; original producer stays exact.
export function prepareStrictStaticSourceLifecycleProposal({root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),currentRevision='HEAD',historyArchive=null}={}){
  root=realpathSync(root);const subjectRevision=revision(root,currentRevision);
  let history=historyArchive===null?null:staticReadArchive(historyArchive);
  const sources=new Map(),profiles=[];
  let sourceBytes=0,retainedBytes=0;
  const add=(id,row)=>{if(sources.has(id)){if(sources.get(id).source!==row.source)staticFail('source identity collision');return;}sourceBytes+=row.bytes;if(sourceBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.sourceBytes)staticFail('deduplicated complete source byte bound');sources.set(id,{...row});};
  const revisions=[...new Set(Object.values(STATIC_SOURCE_LIFECYCLE_CASES))];
  for(const rev of revisions){
    let captured;
    if(history){const profile=history.bundle.profiles.find(row=>row.revision===rev);if(!profile||profile.sourceSetSha256!==staticRowsDigest(profile.files))staticFail('historical full profile differs');captured={...profile,sources:new Map(profile.files.map(row=>{const value=history.bundle.sources[row.sourceId];if(!value||value.bytes!==row.bytes||hash(value.source)!==row.sourceId||staticBlob(Buffer.from(value.source))!==row.gitBlob)staticFail('historical complete source bytes differ');return [row.sourceId,value];}))};}
    else captured=staticCapture(root,revision(root,rev));
    const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[rev];if(captured.files.length!==expected.files||captured.files.reduce((sum,row)=>sum+row.bytes,0)!==expected.bytes||captured.sourceSetSha256!==expected.sourceSetSha256)staticFail('fixed complete historical universe differs');
    profiles.push({revision:rev,files:captured.files,sourceSetSha256:captured.sourceSetSha256});for(const [id,row]of captured.sources)add(id,row);
    captured=null;
  }
  // Preserve the fixed historical universes. Current Router captures include
  // both workspace and nested package manifests plus the shared lockfile.
  const fresh=staticCapture(root,subjectRevision,{nestedPackage:true});for(const [id,row]of fresh.sources)add(id,row);
  const actual=()=>fresh.files.map(row=>{let bytes;try{bytes=readFileSync(resolve(root,row.path));}catch(error){throw error;}if(bytes.length!==row.bytes||hash(bytes)!==row.sourceId||staticBlob(bytes)!==row.gitBlob)staticFail('current physical/Git source differs: '+row.path);return row;});
  const before=actual(),provenanceRevision=history?.bundle.current.sourceSetSha256===fresh.sourceSetSha256?history.bundle.current.producerRevision:subjectRevision;
  const frontier=JSON.parse(decode(staticGit(root,['show',subjectRevision+':tools/translation/fixtures/formatting-owner-frontier.json'])));
  const historical=profiles.find(row=>row.revision===revisions[0]);for(const row of frontier.originalFiles){const file=historical.files.find(file=>file.path===row.source);if(!file||file.sourceId!==row.sha256||file.bytes!==row.bytes)staticFail('all original formatting parents must join');}
  const currentByPath=new Map(fresh.files.map(row=>[row.path,row])),changedIds=new Set(),lineage=[];
  for(const profile of profiles){const files=[];for(const before of profile.files){const moved=relocatedRustSourcePath(before.path),after=(before.path==='Cargo.toml'?currentByPath.get(moved):undefined)??currentByPath.get(before.path)??currentByPath.get(moved);if(!after){files.push({path:before.path,status:'deleted',before,current:null,originalPreserved:true});continue;}if(before.sourceId!==after.sourceId){changedIds.add(before.sourceId);changedIds.add(after.sourceId);files.push({path:before.path,status:'changed',before,after});}}lineage.push({revision:profile.revision,files});}
  // All original archive bytes have already received complete decoding and
  // logical digest checks. Drop only first-pass inputs freshly overwritten by
  // BOTH complete source and canonical transports below. Unchanged/deleted
  // parents retain every historical canonical value and output field.
  history=null;
  for(const id of changedIds){
    const row=sources.get(id);
    if(row&&Object.hasOwn(row,'canonical')){const value={...row};delete value.canonical;sources.set(id,value);}
  }
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'static-fixture.complete-original-cst-and-current-source-joins',apply:()=>{
      for(const row of sources.values()){retainedBytes+=Buffer.byteLength(JSON.stringify({source:row.source,bytes:row.bytes,gitBlob:row.gitBlob}));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('retained source bound');}
      const changed=[...sources].filter(([id])=>changedIds.has(id));
      // Serialize the complete first document independently and compare every
      // code unit with the transport wire before sharing equal primitive DATA.
      // The full fresh second-document comparison remains mandatory below.
      const firstDocuments=new Map();
      staticSourceCsts(changed,(id,cst)=>{const row=sources.get(id);if(cst.source!==row.source||cst.document.language!=='Rust')staticFail('complete source CST differs');const first=JSON.stringify(cst.document);if(first!==cst.meta)staticFail('independent first CST serialization differs');retainedBytes+=Buffer.byteLength(JSON.stringify(cst.meta));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete retained CST bound');row.canonical=cst.meta;firstDocuments.set(id,row.canonical);});
      visitStaticSourceLifecycleCanonicals(changed,(id,document)=>{
        if(JSON.stringify(document)!==firstDocuments.get(id))staticFail('independent complete CST classification differs');firstDocuments.delete(id);
        const boundaries=new Set([0,document.source.length]);for(const node of document.nodes){boundaries.add(node[2]);boundaries.add(node[3]);}
        sources.get(id).boundaries=[...boundaries].sort((a,b)=>a-b);
      });
      for(const stage of lineage)for(const row of stage.files)if(row.status==='changed'){
        Object.assign(row,staticDelta(sources.get(row.before.sourceId),sources.get(row.after.sourceId)));retainedBytes+=Buffer.byteLength(JSON.stringify(row));if(retainedBytes>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete inverse retention bound');
      }
      return {lineage};
    }}]},
    {phase:'repository',rules:[{id:'static-fixture.fixed-historical-universes-and-reversible-current-parents',apply:state=>({schema:'router-static-source-lifecycle-v1',cases:STATIC_SOURCE_LIFECYCLE_CASES,profiles,current:{producerRevision:provenanceRevision,files:fresh.files,sourceSetSha256:fresh.sourceSetSha256},lineage:state.lineage,sources:Object.fromEntries([...sources].map(([id,row])=>[id,{source:row.source,bytes:row.bytes,gitBlob:row.gitBlob,...(row.canonical?{canonical:row.canonical}:{})}])),authority:{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false}})}]},
  ]),result=pipeline.run(null),bundle={...result.value,trace:result.trace},raw=serializeSourceMapJson(bundle);
  if(raw.length>STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes)staticFail('complete output byte bound');
  const stored=encodeStaticSourceStorageIncremental(bundle,raw),packed=gzipSync(stored.raw,{level:9,mtime:0}),index={schema:bundle.schema,archive:'originals.json.gz',rawBytes:stored.raw.length,rawSha256:hash(stored.raw),bytes:packed.length,sha256:hash(packed),...(stored.storage?{storage:stored.storage}:{}),profiles:profiles.map(({revision,files,sourceSetSha256})=>({revision,files:files.length,sourceSetSha256})),current:bundle.current.sourceSetSha256,trace:result.trace},notice='# Complete static source lifecycle fixtures\n\nTwo complete original Router Rust/Cargo source universes and separately captured current source parents. All original LICENSE terms apply. Historical revisions: '+revisions.join(', ')+'. Full source/Git blob/CST joins and reversible actual source evolution are data only: no namespace, dispatch, ownership, trait, semantic or execution authority. Current producer revision is provenance; exact full source rows determine freshness across compiler/asset-only commits.\n';
  const files=[{path:STATIC_SOURCE_PREFIX+'originals.json.gz',encoding:'base64',content:packed.toString('base64')},{path:STATIC_SOURCE_PREFIX+'manifest.json',encoding:'utf8',content:JSON.stringify(index,null,2)+'\n'},{path:STATIC_SOURCE_PREFIX+'NOTICE.md',encoding:'utf8',content:notice}].map(row=>({...row,bytes:Buffer.byteLength(row.content,row.encoding),sha256:hash(Buffer.from(row.content,row.encoding))}));
  const after=actual();if(JSON.stringify(before)!==JSON.stringify(after))staticFail('source inputs changed');
  return {schema:'router-static-source-lifecycle-proposal-v1',sourceRoot:root,subjectRevision,provenanceRevision,before,after,files,cstSchedule:{source:'existing bounded Sources; large rows existing single transport',canonical:'every canonical through full untrusted MetaChunks',substitution:'actual whole-span language/repository pipeline; full inverse',retention:'first full document JSON captured during source pass; full fresh second JSON compared before retaining only whole-node boundaries; native batch results released after visitor consumption'},trace:result.trace,limits:STATIC_SOURCE_LIFECYCLE_LIMITS,completeInverse:true,authority:bundle.authority};
}
export function transportStaticSourceLifecycleCanonicalsShared(rows){
  if(!originalBatchedDataFreezeIntrinsicsUnchanged())return transportStaticSourceLifecycleCanonicals(rows);
  const out=new Map(),prefixes=new Map();
  visitStaticSourceLifecycleCanonicals(rows,(id,document)=>{
    if(!originalBatchedDataFreezeIntrinsicsUnchanged()||!Object.isFrozen(document)||!Object.isFrozen(document.nodes)){out.set(id,document);return;}
    const nodes=document.nodes,key=document.source.slice(0,1024),previous=prefixes.get(key);let selected=document;
    if(previous&&nodes.length>=128){
      const end=Math.min(nodes.length,previous.length);let equal=0;
      for(let at=1;at<end;at++){const left=nodes[at],right=previous[at];let same=true;for(let field=0;field<7;field++)if(left[field]!==right[field]){same=false;break;}if(same)equal++;}
      // The new outer array costs one reference per node. Share only when
      // more than a quarter of the seven-field immutable rows are identical.
      if(equal>nodes.length/4){
        const values=nodes.slice();
        for(let at=1;at<end;at++){const left=nodes[at],right=previous[at];let same=true;for(let field=0;field<7;field++)if(left[field]!==right[field]){same=false;break;}if(same)values[at]=right;}
        Object.freeze(values);selected=Object.freeze({...document,nodes:values});
      }
    }
    if(prefixes.has(key)||prefixes.size<256)prefixes.set(key,selected.nodes);
    out.set(id,selected);
  });return out;
}
