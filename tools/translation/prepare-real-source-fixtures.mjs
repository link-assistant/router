#!/usr/bin/env node
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
const CORE=['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','Cargo.toml','Cargo.lock'];
const ADOPTIONS=['bcfbe8516a87d9cbd85c3573ac05fa80cf8dc85b','92a6d41d671d8288e9bd3e3adcd47309ff1c6c9a','400e77e0fbcce4f8bfc035a51220a9ccfe68b776'];
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
    const candidates=items.filter(item=>item.term===expected.term&&item.name===expected.name&&(current||item.start===expected.start&&item.end===expected.end));
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
  const currentPaths=[...new Set([...paths,...CORE])].sort();let raw,adoptions;
  if(historyArchive===null){
    const changedPaths=git(root,['diff','--name-only',original,current,'--',...paths],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
    adoptions=ADOPTIONS.map(value=>{const commit=revision(root,value),parent=git(root,['rev-parse',commit+'^'],{encoding:'utf8'}).trim();return {revision:commit,parent,paths:git(root,['diff-tree','--no-commit-id','--name-only','-r',commit,'--',...changedPaths],{encoding:'utf8'}).trim().split('\n').filter(Boolean)};});
    raw=batch(root,[...paths.map(path=>original+':'+path),...currentPaths.map(path=>current+':'+path),...adoptions.flatMap(stage=>stage.paths.flatMap(path=>[stage.parent+':'+path,stage.revision+':'+path]))]);
  }else{
    if(typeof historyArchive!=='string')fail('explicit reviewed archive directory required');const history=archivedHistory(historyArchive,manifest),fresh=batch(root,currentPaths.map(path=>current+':'+path));raw=new Map(paths.map(path=>[original+':'+path,history.originals.get(path)]));for(const [key,row]of fresh)raw.set(key,row);
    adoptions=history.stages.map(({revision,parent,paths})=>({revision,parent,paths}));for(const stage of history.stages)for(const row of stage.files){raw.set(stage.parent+':'+row.path,row.before);raw.set(stage.revision+':'+row.path,row.after);}
  }
  if(raw.size>REAL_SOURCE_FIXTURE_LIMITS.files||[...raw.values()].reduce((sum,row)=>sum+row.bytes,0)>REAL_SOURCE_FIXTURE_LIMITS.rawBytes)fail('complete replay source bounds');
  const changedPaths=paths.filter(path=>raw.get(original+':'+path).source!==raw.get(current+':'+path).source);
  const snapshot=()=>currentPaths.map(path=>{const row=raw.get(current+':'+path),bytes=readFileSync(resolve(root,path));if(decode(bytes)!==row.source)fail('physical current source differs from selected revision: '+path);return {path,bytes:bytes.length,sha256:hash(bytes),gitBlob:row.gitBlob};});
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
      const record=(rev,path)=>{const row=raw.get(rev+':'+path);return {path,sourceId:row.sha256,bytes:row.bytes,gitBlob:row.gitBlob};};
      const lineage=adoptions.map(stage=>({...stage,files:stage.paths.map(path=>{const before=record(stage.parent,path),after=record(stage.revision,path);return {path,before,after,...delta(state.sources.get(before.sourceId),state.sources.get(after.sourceId))};})}));
      for(const path of changedPaths){let id=raw.get(original+':'+path).sha256;for(const stage of lineage){const row=stage.files.find(row=>row.path===path);if(row){if(row.before.sourceId!==id)fail('adoption history is not continuous');id=row.after.sourceId;}}if(id!==raw.get(current+':'+path).sha256)fail('current parent requires separately reviewed adoption history: '+path);}
      return {schema:'router-complete-real-source-fixtures-v1',historical:{revision:original,manifestSha256:REAL_SOURCE_MANIFEST_SHA256,files:paths.map(path=>record(original,path)),selections:state.selections},current:{revision:current,files:currentPaths.map(path=>record(current,path)),selections:state.currentSelections,behaviorIds:CURRENT_IDS},lineage,sources:Object.fromEntries([...state.sources].map(([id,row])=>[id,{source:row.source,bytes:row.bytes,canonical:row.canonical}])),authority:{namespace:false,dispatch:false,ownership:false,executable:false}};
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
