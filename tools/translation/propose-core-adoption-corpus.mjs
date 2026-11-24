import {crateEntrySourcePath} from './repository-layout.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
// A bounded, proposal-only source producer. Existing adoption APIs remain
// unchanged. Packets retain all returned evidence without one corpus-sized JSON.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,realpathSync,existsSync,renameSync} from 'node:fs';
import {resolve,join,dirname,basename,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {proposeCoreFormattingCorpus} from './propose-core-formatting-corpus.mjs';
import {proposeCorePrimitivesCorpus} from './migrate-core-primitives.mjs';
import {translationProgressReporter} from './translation-progress.mjs';

// Keep each relocatable lazy module edge at one source location. These helpers
// perform the original dynamic import on every request; no extra cache or
// changed sequence/stream dispatch is introduced.
function loadJsonReaderModule(){return import('./migrate-core-json-readers.mjs');}
function loadPacketStorageModule(){return import('./core-adoption-packet-storage.mjs');}

export const CORE_ADOPTION_PACKET_LIMITS=Object.freeze({files:1024,paths:20000,pathUnits:4096,fileBytes:8000000,fileUnits:2000000,sourceUnits:32*1024*1024,packetBytes:64*1024*1024,outputBytes:1024*1024*1024,packets:20000});
const L=CORE_ADOPTION_PACKET_LIMITS,FAILURE_RESERVE=16384;
const rootEntry=root=>repositoryRustLayout(root).entries[0];
const fail=message=>{throw new TypeError('Combined core adoption proposal: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const inside=(path,root)=>path===root||path.startsWith(root+'/');
const directorySame=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;
const fileSame=(a,b)=>directorySame(a,b)&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
function options(value){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))fail('own root/output data required');
  const keys=Reflect.ownKeys(value);if(keys.length!==2||!keys.includes('root')||!keys.includes('output'))fail('exact root/output fields required');
  const result={};for(const key of ['root','output']){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||!d.value.length||d.value.length>L.pathUnits||d.value.includes('\0'))fail('bounded primitive root/output paths required');result[key]=d.value;}
  return result;
}
function pathName(path){if(typeof path!=='string'||!path.endsWith('.rs')||path.length>L.pathUnits||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust path required');return path;}
function snapshot(root){
  const files=Object.create(null),rows=[],census=[];let units=0;
  function visit(path){
    if(census.length>=L.paths)fail('source tree census limit');const absolute=join(root,path),before=lstatSync(absolute);
    if(before.isSymbolicLink())fail('source tree links are unsupported');
    const kind=before.isDirectory()?'directory':before.isFile()?'file':'other';if(kind==='other')fail('source tree special file');
    census.push({path,kind,dev:before.dev,ino:before.ino,mode:before.mode});
    if(kind==='directory'){
      const names=readdirSync(absolute).sort();for(const name of names){if(name==='.'||name==='..'||name.includes('/')||name.includes('\\'))fail('source entry path');visit(path+'/'+name);}
      if(!directorySame(before,lstatSync(absolute)))fail('source directory identity changed');return;
    }
    if(!path.endsWith('.rs'))return;
    pathName(path);if(rows.length>=L.files||before.size>L.fileBytes)fail('source file count/byte limit');
    const bytes=readFileSync(absolute),source=bytes.toString('utf8'),after=lstatSync(absolute);
    if(!fileSame(before,after)||!Buffer.from(source,'utf8').equals(bytes))fail('source file identity/UTF8 changed');
    units+=source.length;if(source.length>L.fileUnits||units>L.sourceUnits)fail('source text limit');
    files[path]=source;rows.push({path,source,identity:{dev:after.dev,ino:after.ino,mode:after.mode,size:after.size,mtimeMs:after.mtimeMs,ctimeMs:after.ctimeMs}});
  }
  const rootIdentity=lstatSync(root);if(!rootIdentity.isDirectory()||rootIdentity.isSymbolicLink())fail('regular physical source root required');visit(posix.dirname(rootEntry(root)));
  if(!Object.hasOwn(files,rootEntry(root)))fail('src/lib.rs entry required');
  rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const ordered=Object.create(null);for(const row of rows)ordered[row.path]=row.source;
  return {root,rootIdentity,files:ordered,rows,census,units};
}
function rejoin(original){
  if(realpathSync(original.root)!==original.root||!directorySame(original.rootIdentity,lstatSync(original.root)))fail('source root identity changed');
  const current=snapshot(original.root);
  if(JSON.stringify(original.census)!==JSON.stringify(current.census)||current.rows.length!==original.rows.length)fail('complete source tree census changed');
  for(let at=0;at<original.rows.length;at++){const a=original.rows[at],b=current.rows[at];if(a.path!==b.path||a.source!==b.source||!fileSame(a.identity,b.identity))fail('complete source file changed');}
}
function destination(root,requested){
  const output=resolve(requested),parent=realpathSync(dirname(output)),physical=join(parent,basename(output));
  if(inside(physical,root)||inside(root,physical))fail('physical output overlaps source root');
  if(existsSync(output))fail('fresh outside output directory required');
  const identity=lstatSync(parent);if(!identity.isDirectory()||identity.isSymbolicLink())fail('regular physical output parent required');
  return {path:output,physical,parent,identity};
}
function ownDirectory(destination){
  if(!directorySame(destination.identity,lstatSync(destination.parent)))fail('output parent changed');
  mkdirSync(destination.path,{recursive:false});const own=lstatSync(destination.path);
  if(!own.isDirectory()||own.isSymbolicLink()||realpathSync(destination.path)!==destination.physical||!directorySame(destination.identity,lstatSync(destination.parent)))fail('output identity changed');
  return own;
}
function writer(target,gzipStorage=null,progress=null){
  const records=[],directories=new Map();let totalBytes=0,created=false,identity=null;
  const storageRows=[];let storedBytes=0,preparedGzip=null;
  function current(){if(!created){identity=ownDirectory(target);created=true;directories.set('',identity);}if(!directorySame(identity,lstatSync(target.path))||realpathSync(target.path)!==target.physical)fail('owned proposal root changed');}
  function parent(relative){
    current();const parts=relative.split('/');parts.pop();let path='';
    for(const part of parts){path=path?path+'/'+part:part;const full=join(target.path,path);if(!directories.has(path)){mkdirSync(full,{recursive:false});directories.set(path,lstatSync(full));}const now=lstatSync(full);if(!now.isDirectory()||now.isSymbolicLink()||!directorySame(directories.get(path),now))fail('owned proposal directory changed');}
  }
  function put(relative,text,kind='json'){
    if(records.length>=L.packets||typeof text!=='string'||relative.split('/').some(part=>!part||part==='.'||part==='..')||relative.includes('\\'))fail('packet path/count');
    const bytes=Buffer.byteLength(text);if(bytes>L.packetBytes||totalBytes+bytes>L.outputBytes-FAILURE_RESERVE)fail('packet/output byte limit');
    if(progress)progress({stage:'plan',state:'start',source:relative,phase:'proposal-packet-emit',completed:records.length,bytes});
    const sha256=hash(text);parent(relative);
    if(gzipStorage){
      const encoded=gzipStorage.encodeCoreAdoptionGzipPacket(text),file=relative+'.gz';
      if(storedBytes+encoded.bytes.length>gzipStorage.CORE_ADOPTION_GZIP_LIMITS.storedBytes-FAILURE_RESERVE)fail('stored packet/output byte limit');
      parent(file);writeFileSync(join(target.path,file),encoded.bytes,{flag:'wx'});storedBytes+=encoded.bytes.length;
      storageRows.push({path:relative,kind,rawBytes:bytes,rawSha256:sha256,file,bytes:encoded.bytes.length,sha256:encoded.sha256});
    }else writeFileSync(join(target.path,relative),text,{flag:'wx'});
    totalBytes+=bytes;
    const record={path:relative,kind,bytes,sha256};records.push(record);
    if(progress)progress({stage:'plan',state:'end',source:relative,phase:'proposal-packet-emit',completed:records.length,bytes});
    return record;
  }
  const json=(path,value)=>put(path,JSON.stringify(value)+'\n');
  return {json,jsonText:(path,text)=>put(path,text),text:(path,value)=>put(path,value,'rust-source'),get records(){return records;},get bytes(){return totalBytes;},get created(){return created;},
    complete(text){const bytes=Buffer.byteLength(text);if(bytes>L.packetBytes||totalBytes+bytes>L.outputBytes-FAILURE_RESERVE)fail('index/output byte limit');parent('index.pending.json');writeFileSync(join(target.path,'index.pending.json'),text,{flag:'wx'});renameSync(join(target.path,'index.pending.json'),join(target.path,'index.json'));totalBytes+=bytes;},
    prepareGzip(text){
      if(!gzipStorage||preparedGzip)fail('one explicit gzip publication required');
      preparedGzip=gzipStorage.prepareCoreAdoptionGzipIndex(text,storageRows);
      if(preparedGzip.logicalOutputBytes!==totalBytes+preparedGzip.indexBytes+preparedGzip.bytes||preparedGzip.storedOutputBytes!==storedBytes+preparedGzip.indexBytes+preparedGzip.bytes)fail('complete storage accounting differs');
      return preparedGzip;
    },
    completeGzip(text,prepared){
      if(!gzipStorage||prepared!==preparedGzip)fail('unprepared gzip publication');
      parent('packet-storage.pending.json');writeFileSync(join(target.path,'packet-storage.pending.json'),prepared.source,{flag:'wx'});
      renameSync(join(target.path,'packet-storage.pending.json'),join(target.path,'packet-storage.json'));
      // Reuse the exact original index writer and its last rename. All codec,
      // serialization and hash work finished before the final source guard.
      this.complete(text);totalBytes+=prepared.bytes;storedBytes=prepared.storedOutputBytes;
    },
    failure(error,stage){
      if(!created)return;
      // Report no arbitrary thrown-object getter, proxy or lazy stack.
      let message='unreported failure';if(error&&typeof error==='object'&&!types.isProxy(error)){const d=Object.getOwnPropertyDescriptor(error,'message');if(d&&Object.hasOwn(d,'value')&&typeof d.value==='string')message=d.value.slice(0,4096);}
      const text=JSON.stringify({schema:'router-core-adoption-incomplete-v1',complete:false,stage,message,packetCount:records.length,packetBytes:totalBytes,semanticAdmission:false})+'\n';
      if(Buffer.byteLength(text)>FAILURE_RESERVE)fail('failure receipt limit');parent('failure.json');writeFileSync(join(target.path,'failure.json'),text,{flag:'wx'});
    }};
}
const numbered=at=>String(at).padStart(6,'0');
function fieldsExcept(object,excluded){return Object.fromEntries(Object.entries(object).filter(([key])=>!excluded.includes(key)));}
function formattingPackets(proposal,write){
  return {metadata:write.json('formatting/metadata.json',{keys:Object.keys(proposal),values:fieldsExcept(proposal,['inputs','rows'])}),inputs:proposal.inputs.map((row,at)=>write.json('formatting/inputs/'+numbered(at)+'.json',row)),rows:proposal.rows.map((row,at)=>write.json('formatting/rows/'+numbered(at)+'.json',row))};
}
function primitivePackets(proposal,write){
  const graph=proposal.moduleGraph;
  if(JSON.stringify(Object.keys(graph))!==JSON.stringify(['modules','edges','diagnostics','concreteSyntaxMeta']))fail('unrecognized complete module graph shape');
  const result={metadata:write.json('primitives/metadata.json',{keys:Object.keys(proposal),values:fieldsExcept(proposal,['before','after','inputs','moduleGraph','proposals'])}),before:Object.entries(proposal.before).map(([path,source],at)=>write.json('primitives/before/'+numbered(at)+'.json',{path,source})),after:Object.entries(proposal.after).map(([path,source],at)=>write.json('primitives/after/'+numbered(at)+'.json',{path,source})),inputs:proposal.inputs.map((row,at)=>write.json('primitives/inputs/'+numbered(at)+'.json',row)),proposals:proposal.proposals.map((row,at)=>write.json('primitives/proposals/'+numbered(at)+'.json',row)),moduleGraph:{modules:graph.modules.map((row,at)=>write.json('primitives/graph/modules/'+numbered(at)+'.json',row)),edges:write.json('primitives/graph/edges.json',graph.edges),diagnostics:write.json('primitives/graph/diagnostics.json',graph.diagnostics),concreteSyntaxMeta:graph.concreteSyntaxMeta.map((row,at)=>write.json('primitives/graph/concrete/'+numbered(at)+'.json',row))}};
  return result;
}
export function proposeCoreAdoptionCorpus(input,progressInput=undefined){
  if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
  const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);
  if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});
  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),write=writer(target,null,progress);
  if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});
  let stage='formatting',formatting=null,primitives=null,after=null,formattingTrace=null,primitiveTrace=null,summary=null;
  try{
    const first=createRulePipeline([
      {phase:'language',rules:[{id:'core-adoption:complete-formatting-corpus',apply:()=>proposeCoreFormattingCorpus({entry:rootEntry(root),files:original.files,compilationProfile:PRODUCTION_PROFILE})}]},
      {phase:'repository',rules:[{id:'core-adoption:formatting-complete-packets',apply:proposal=>{
        rejoin(original);const files=Object.assign(Object.create(null),original.files);
        for(const row of proposal.rows)if(row.status==='proposed'){if(row.proposal.before.source!==files[row.path])fail('formatting source association');files[row.path]=row.proposal.after.source;}
        const packets=formattingPackets(proposal,write);summary=proposal.summary;return {files,packets};
      }}]},
    ]).run(null);
    formatting=first.value.packets;after=first.value.files;formattingTrace=first.trace;
    stage='primitives';rejoin(original);
    const second=createRulePipeline([
      {phase:'language',rules:[{id:'core-adoption:complete-primitives-corpus',apply:()=>proposeCorePrimitivesCorpus({entry:rootEntry(root),files:after,compilationProfile:PRODUCTION_PROFILE})}]},
      {phase:'repository',rules:[{id:'core-adoption:primitives-complete-packets',apply:proposal=>{
        rejoin(original);for(const path of Object.keys(after))if(proposal.before[path]!==after[path])fail('primitive source association');
        const packets=primitivePackets(proposal,write);return {files:proposal.after,packets};
      }}]},
    ]).run(null);
    primitives=second.value.packets;after=second.value.files;primitiveTrace=second.trace;stage='final-source-and-index';
    const inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units});
    const changes=[];
    for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
    if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
    const index={schema:'router-core-adoption-packets-v1',complete:true,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,census,formatting,primitives,changes,summary:{sourceFiles:original.rows.length,changedFiles:changes.length,formatting:summary},phaseTrace:{formatting:formattingTrace,primitives:primitiveTrace},packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'review complete index and every packet before installing; this CLI never applies sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full API proposal at a time; per-packet serialization, live graph/CST residency still requires measured receiving'};
    const text=JSON.stringify(index)+'\n';
    // Every packet hash precedes this final fresh source rejoin. No hash or
    // caller-provided action occurs between it and stock index publication.
    if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
    rejoin(original);write.complete(text);return {schema:index.schema,complete:true,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,packetCount:index.packets.length,packetBytes:index.packetBytes,outputBytes:write.bytes,semanticAdmission:false};
  }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error('combined proposal failed and its incomplete receipt could not be written');failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}
// These fixed sequences deliberately have their own packet schema. No caller
// callbacks, rule lists or configuration selectors enter the producer.
function assertAdoptionInverse(row){
  if(typeof row.before?.source!=='string'||typeof row.after?.source!=='string'||!Array.isArray(row.mapping))fail('complete file proposal required');
  let old=0,current=0,restored=row.after.source;
  for(const part of row.mapping){
    if(part.before[0]!==old||part.after[0]!==current)fail('inverse partition gap');
    const before=row.before.source.slice(...part.before),after=row.after.source.slice(...part.after);
    if(part.kind==='unchanged'){if(before!==after)fail('unchanged source partition differs');}
    else if(part.kind==='substitution'){if(before!==part.expected||after!==part.replacement)fail('substitution source partition differs');}
    else fail('unknown source partition kind');old=part.before[1];current=part.after[1];
  }
  if(old!==row.before.source.length||current!==row.after.source.length)fail('inverse partition endpoint');
  for(let at=row.mapping.length-1;at>=0;at--){const part=row.mapping[at];if(part.kind==='substitution')restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}
  if(restored!==row.before.source)fail('whole source inverse differs');
}
function completeAdoptionPackets(proposal,write,files,name,progress=null){
  const graph=proposal.moduleGraph,excluded=['before','after','inputs','moduleGraph','proposals'];
  if(!graph||Object.keys(proposal.before).length!==Object.keys(files).length||Object.keys(proposal.after).length!==Object.keys(files).length)fail('complete returned source census differs');
  for(const path of Object.keys(files))if(proposal.before[path]!==files[path]||typeof proposal.after[path]!=='string')fail('returned source chain differs');
  const packets={metadata:write.json(name+'/metadata.json',{keys:Object.keys(proposal),values:fieldsExcept(proposal,excluded)}),before:Object.entries(proposal.before).map(([path,source],at)=>write.json(name+'/before/'+numbered(at)+'.json',{path,source})),after:Object.entries(proposal.after).map(([path,source],at)=>write.json(name+'/after/'+numbered(at)+'.json',{path,source})),inputs:proposal.inputs.map((row,at)=>write.json(name+'/inputs/'+numbered(at)+'.json',row)),proposals:[],moduleGraph:{metadata:write.json(name+'/graph/metadata.json',{keys:Object.keys(graph),values:fieldsExcept(graph,['modules','edges','diagnostics','concreteSyntaxMeta'])}),modules:graph.modules.map((row,at)=>write.json(name+'/graph/modules/'+numbered(at)+'.json',row)),edges:write.json(name+'/graph/edges.json',graph.edges),diagnostics:write.json(name+'/graph/diagnostics.json',graph.diagnostics),concreteSyntaxMeta:graph.concreteSyntaxMeta.map((row,at)=>write.json(name+'/graph/concrete/'+numbered(at)+'.json',row))}};
  for(let at=0;at<proposal.proposals.length;at++){const row=proposal.proposals[at];if(row.before.source!==files[row.file]||row.after.source!==proposal.after[row.file])fail('per-file source chain differs');if(progress)progress({stage:'project-serialize',state:'start',source:row.file,phase:'packet-whole-source-inverse',completed:at});assertAdoptionInverse(row);if(progress)progress({stage:'project-serialize',state:'end',source:row.file,phase:'packet-whole-source-inverse',completed:at+1});packets.proposals.push(write.json(name+'/proposals/'+numbered(at)+'.json',row));}
  return packets;
}
// Only the explicit adoption sequences capture Cargo inputs. The original
// formatting/primitives producer above keeps its original source contract.
function sequenceDependencies(root){
  function capture(){return [repositoryRustLayout(root).manifest,repositoryRustLayout(root).lock].map(path=>{const absolute=join(root,path);if(!existsSync(absolute))return {path,absent:true};const before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size>L.fileBytes)fail('regular bounded Cargo source required');const raw=readFileSync(absolute),source=raw.toString('utf8'),after=lstatSync(absolute);if(!fileSame(before,after)||source.length>L.fileUnits||!Buffer.from(source,'utf8').equals(raw))fail('Cargo source identity/UTF8 changed');return {path,source,identity:{dev:after.dev,ino:after.ino,mode:after.mode,size:after.size,mtimeMs:after.mtimeMs,ctimeMs:after.ctimeMs}};});}
  const rows=capture(),inputs=rows.every(row=>!row.absent)?{manifest:rows[0].source,lock:rows[1].source}:undefined;
  return {rows,inputs,verify(){const current=capture();for(let at=0;at<rows.length;at++){const a=rows[at],b=current[at];if(a.path!==b.path||a.absent!==b.absent||a.source!==b.source||!a.absent&&!fileSame(a.identity,b.identity))fail('complete optional Cargo input changed');}}};
}
function fixedAdoptionStage(name,files,propose,original,write,dependencies,producerDependencies=false,progressInput){
  const progress=progressInput==null?null:translationProgressReporter(progressInput);
  // The full proposal/graph is reachable only in this call. Return the next
  // primitive source map and packet references, never the live proposal.
  return createRulePipeline([
    {phase:'language',rules:[{id:'core-adoption:complete-'+name+'-corpus',apply:()=>{
      if(progress)progress({stage:'project',state:'start',entry:rootEntry(original.root),phase:name+'-analysis'});
      const request={entry:rootEntry(original.root),files,compilationProfile:PRODUCTION_PROFILE,...((name==='literal'||name==='scalar-count'||name==='json'||producerDependencies)&&dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})};
      const result=name==='base64'&&progress?propose(request,progressInput):propose(request);
      if(progress)progress({stage:'project',state:'end',entry:rootEntry(original.root),phase:name+'-analysis'});
      return result;
    }}]},
    {phase:'repository',rules:[{id:'core-adoption:'+name+'-complete-packets',apply:proposal=>{
      rejoin(original);dependencies.verify();const packets=completeAdoptionPackets(proposal,write,files,name,progress);
      return {files:proposal.after,packets,summary:{sourceFiles:Object.keys(proposal.before).length,proposals:proposal.proposals.length,selections:proposal.proposals.reduce((sum,row)=>sum+row.selections.length,0),edits:proposal.proposals.reduce((sum,row)=>sum+row.edits.length,0),changedFiles:proposal.proposals.filter(row=>row.before.source!==row.after.source).length,skippedFiles:proposal.skipped.length}};
    }}]},
  ]).run(null);
}
export async function proposeCoreAdoptionSequence(input,sequence='literal',packetStorage,progressInput){
  if(packetStorage!==undefined&&packetStorage!=='gzip')fail('packet storage must be the explicit gzip mode');
  if(sequence!=='literal'&&sequence!=='literal-algebraic'&&sequence!=='scalar-count'&&sequence!=='json-algebraic-primitives'&&sequence!=='json-updates'&&sequence!=='json-indices'&&sequence!=='json-collections'&&sequence!=='json-copies'&&sequence!=='json-parse'&&sequence!=='json-readers'&&sequence!=='base64')fail('fixed sequence must be literal, literal-algebraic, scalar-count, json-algebraic-primitives, json-updates, json-indices, json-copies, json-collections, json-parse, json-readers or base64');
  if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
  const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);
  if(progress)progress({stage:'project',state:'start',phase:'producer-module-load'});
  // Lazy imports preserve the old API's module initialization graph. Selected
  // imports finish before taking the operation's complete source snapshot.
  const jsonSequence=sequence==='json-algebraic-primitives',jsonUpdates=sequence==='json-updates',jsonIndices=sequence==='json-indices',jsonCollections=sequence==='json-collections',jsonCopies=sequence==='json-copies',jsonParse=sequence==='json-parse',jsonReaders=sequence==='json-readers',base64=sequence==='base64';
  const proposeCoreLiteralTextCorpus=sequence==='scalar-count'||jsonSequence||jsonUpdates||jsonIndices||jsonCollections||jsonCopies||jsonParse||jsonReaders||base64?null:(await import('./migrate-core-literal-text.mjs')).proposeCoreLiteralTextCorpus;
  const updates=jsonUpdates?(await import('./migrate-core-json-updates.mjs')).proposeCoreJsonUpdateCorpus:null;
  const copies=jsonCopies?(await import('./migrate-core-json-copies.mjs')).proposeCoreJsonCopiesCorpus:null;
  const readers=jsonReaders?(await loadJsonReaderModule()).proposeCoreJsonReadersCorpus:null;
  const parse=jsonParse?(await import('./migrate-core-json-parse.mjs')).proposeCoreJsonParseCorpus:null;
  const indices=jsonIndices?(await import('./migrate-core-json-indices.mjs')).proposeCoreJsonIndicesCorpus:null;
  const collections=jsonCollections?(await import('./migrate-core-json-collections.mjs')).proposeCoreJsonCollectionsCorpus:null;
  const json=jsonSequence?(await import('./migrate-core-json.mjs')).proposeCoreJsonCorpus:null;
  const base64Producer=base64?(await import('./migrate-core-base64.mjs')).proposeCoreBase64Corpus:null;
  const scalars=sequence==='scalar-count'?(await import('./migrate-core-scalars.mjs')).proposeCoreScalarsCorpus:null;
  const algebraic=sequence==='literal-algebraic'||jsonSequence?(await import('./migrate-core-algebraic.mjs')).proposeCoreAlgebraicCorpus:null;
  const gzipStorage=packetStorage==='gzip'?await loadPacketStorageModule():null;
  if(progress)progress({stage:'project',state:'end',phase:'producer-module-load'});
  if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});
  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage,progress),stages=[];
  if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});
  let stage=base64?'base64':jsonReaders?'json-readers':jsonParse?'json-parse':jsonCopies?'json-copies':jsonCollections?'json-collections':jsonIndices?'json-indices':jsonUpdates?'json-updates':sequence==='scalar-count'?'scalar-count':jsonSequence?'json':'literal',after=original.files;
  try{
    for(const name of base64?['base64']:jsonReaders?['json-readers']:jsonParse?['json-parse']:jsonCopies?['json-copies']:jsonCollections?['json-collections']:jsonIndices?['json-indices']:jsonUpdates?['json-updates']:jsonSequence?['json','algebraic','primitives']:sequence==='scalar-count'?['scalar-count']:sequence==='literal'?['literal']:['literal','algebraic']){
      stage=name;rejoin(original);dependencies.verify();const next=fixedAdoptionStage(name,after,name==='base64'?base64Producer:name==='json-readers'?readers:name==='json-parse'?parse:name==='json-copies'?copies:name==='json-collections'?collections:name==='json-indices'?indices:name==='json-updates'?updates:name==='json'?json:name==='primitives'?proposeCorePrimitivesCorpus:name==='scalar-count'?scalars:name==='literal'?proposeCoreLiteralTextCorpus:algebraic,original,write,dependencies,base64||jsonSequence||jsonUpdates||jsonIndices||jsonCollections||jsonCopies||jsonParse||jsonReaders,progressInput);
      after=next.value.files;stages.push({name,packets:next.value.packets,summary:next.value.summary,trace:next.trace});
    }
    stage='final-source-and-index';const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
    for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
    if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
    const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'proposal only; review every complete stage and inverse before application; this CLI never applies sources',sourceChain:'each stage before equals previous complete after; reverse stage order and full per-file mappings to recover original sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full API proposal/graph at a time; per-packet serialization; actual live heap/RSS requires receiving evidence'};
    const text=JSON.stringify(index)+'\n',preparedStorage=gzipStorage?write.prepareGzip(text):null;
    // Final progress precedes the fresh source guard. Never call an observer
    // between this rejoin and index publication; stdout reports completion.
    if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
    rejoin(original);dependencies.verify();if(gzipStorage)write.completeGzip(text,preparedStorage);else write.complete(text);
    const receipt={schema:index.schema,complete:true,sequence,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:stages.map(({name,summary})=>({name,...summary})),packetCount:index.packets.length,packetBytes:index.packetBytes,outputBytes:write.bytes,semanticAdmission:false};
    return gzipStorage?{...receipt,outputBytes:preparedStorage.storedOutputBytes,logicalOutputBytes:write.bytes,packetStorage:'gzip',storageIndex:'packet-storage.json',storageSha256:preparedStorage.sha256}:receipt;
  }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error('sequence proposal failed and its incomplete receipt could not be written');failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}
// Fixed detached stream protocol. This is storage only: complete untrusted
// packets retain all original source/CST data and grant no compiler authority.
function adoptionStreamEvent(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own packet stream event required');
 const names=Reflect.ownKeys(value);if(names.length!==3||!['section','ordinal','text'].every(name=>names.includes(name)))fail('packet stream event fields');
 const result={};for(const name of names){const d=Object.getOwnPropertyDescriptor(value,name);if(!d||!Object.hasOwn(d,'value'))fail('packet stream event accessor');result[name]=d.value;}
 if(typeof result.section!=='string'||!Number.isSafeInteger(result.ordinal)||result.ordinal<0||result.ordinal>=L.packets||typeof result.text!=='string'||Buffer.byteLength(result.text)>L.packetBytes)fail('packet stream event bounds');
 return result;
}
function fixedAdoptionStreamStage(name,files,createStream,original,write,dependencies){
 return createRulePipeline([
  {phase:'language',rules:[{id:'core-adoption:prepare-'+name+'-corpus-stream',apply:()=>createStream({entry:rootEntry(original.root),files,compilationProfile:PRODUCTION_PROFILE,...(dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})})}]},
  {phase:'repository',rules:[{id:'core-adoption:'+name+'-stream-complete-packets',apply:stream=>{
   const packets={metadata:null,before:[],after:[],inputs:[],proposals:[],moduleGraph:{metadata:null,modules:[],edges:null,diagnostics:null,concreteSyntaxMeta:[]}},paths=Object.keys(files),ordinals=new Map(paths.map((path,at)=>[path,at])),proposed=new Map(),seen=new Set();
   const arrays=new Map([['before',packets.before],['after',packets.after],['inputs',packets.inputs],['proposals',packets.proposals],['graph-modules',packets.moduleGraph.modules],['graph-concrete',packets.moduleGraph.concreteSyntaxMeta]]),singles=new Map([['metadata','metadata'],['graph-metadata','metadata'],['graph-edges','edges'],['graph-diagnostics','diagnostics']]);
   const actual={sourceFiles:paths.length,proposals:0,selections:0,edits:0,changedFiles:0,skippedFiles:0};let lastProposal=-1,skipped=null,drained=false;
   function accept(raw){
    const event=adoptionStreamEvent(raw),list=arrays.get(event.section),single=singles.get(event.section);
    if(!list&&!single||list&&event.ordinal!==list.length||single&&(event.ordinal!==0||seen.has(event.section)))fail('unknown duplicate or out-of-order stream packet');
    const graph=event.section.startsWith('graph-'),value=graph?null:JSON.parse(event.text);
    // Graph packets already come from native JSON serialization of the full
    // captured graph. Preserve their exact bytes; do not rehydrate another
    // graph here. The independent reader reparses every untrusted packet.
    let relative;
    if(list)relative=name+'/'+(graph?'graph/'+(event.section==='graph-modules'?'modules':'concrete'):event.section)+'/'+numbered(event.ordinal)+'.json';
    else relative=name+'/'+(graph?'graph/':'')+single+'.json';
    if(event.section==='before'||event.section==='after'){
     if(event.ordinal>=paths.length||value.path!==paths[event.ordinal]||typeof value.source!=='string'||event.section==='before'&&value.source!==files[value.path]||event.section==='after'&&value.source!==(proposed.get(value.path)??files[value.path]))fail('stream complete source association differs');
    }else if(event.section==='inputs'){
     if(event.ordinal>=paths.length||value.file!==paths[event.ordinal]||value.source!==files[value.file]||typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(value.sha256))fail('stream input association differs');
    }else if(event.section==='proposals'){
     const at=ordinals.get(value.file);if(at===undefined||at<=lastProposal||value.file===crateEntrySourcePath(rootEntry(original.root),'src/translation_core.rs')||value.file.startsWith(crateEntrySourcePath(rootEntry(original.root),'src/translation_core/'))||proposed.has(value.file)||value.before?.source!==files[value.file]||typeof value.after?.source!=='string'||!Array.isArray(value.selections)||!Array.isArray(value.edits)||!Array.isArray(value.stages)||value.stages.length!==2)fail('per-file stream proposal differs');
     assertAdoptionInverse(value);for(const stage of value.stages)assertAdoptionInverse(stage);
     proposed.set(value.file,value.after.source);lastProposal=at;actual.proposals++;actual.selections+=value.selections.length;actual.edits+=value.edits.length;if(value.before.source!==value.after.source)actual.changedFiles++;
    }else if(event.section==='metadata'){
     const excluded=['before','after','inputs','moduleGraph','proposals'],keys=['schema','entry','compilationProfile','dependencyInputs','inputs','before','after','proposals','skipped',...(Object.hasOwn(value.values??{},'producerEffects')?['producerEffects']:[]),'moduleGraph','migrationSemantics','executableAdmission'];
     if(JSON.stringify(value.keys)!==JSON.stringify(keys)||JSON.stringify(Object.keys(value.values))!==JSON.stringify(keys.filter(key=>!excluded.includes(key)))||value.values.schema!=='router-owned-json-reader-corpus-v1'||value.values.entry!==rootEntry(original.root)||value.values.executableAdmission!==false||!Array.isArray(value.values.skipped))fail('complete stream metadata differs');
     skipped=value.values.skipped.map(row=>row.file);
    }
    const reference=write.jsonText(relative,event.text);if(list)list.push(reference);else if(graph)packets.moduleGraph[single]=reference;else packets[single]=reference;seen.add(event.section);
   }
   try{
    let result;for(;;){const next=stream.next();if(next.done){result=next.value;break;}accept(next.value);}
    rejoin(original);dependencies.verify();  // Original post-producer source guard; partial packets are not publication.
    if(!result||typeof result!=='object'||!result.after||!result.summary||!result.counts||packets.before.length!==paths.length||packets.after.length!==paths.length||packets.inputs.length!==paths.length||!['metadata','graph-metadata','graph-edges','graph-diagnostics'].every(section=>seen.has(section))||packets.moduleGraph.modules.length!==result.counts.modules||packets.moduleGraph.concreteSyntaxMeta.length!==result.counts.concreteSyntaxMeta||!Array.isArray(skipped))fail('incomplete stream EOF or packet census');
    if(JSON.stringify(Object.keys(result.after))!==JSON.stringify(paths)||paths.some(path=>result.after[path]!== (proposed.get(path)??files[path])))fail('stream final source census differs');
    const missing=paths.filter(path=>path!==crateEntrySourcePath(rootEntry(original.root),'src/translation_core.rs')&&!path.startsWith(crateEntrySourcePath(rootEntry(original.root),'src/translation_core/'))&&!proposed.has(path));if(new Set(skipped).size!==skipped.length||skipped.length!==missing.length||skipped.some((path,at)=>path!==missing[at]))fail('stream proposals/skips do not partition originals');
    actual.skippedFiles=skipped.length;if(JSON.stringify(result.summary)!==JSON.stringify(actual))fail('stream summary differs from complete packets');
    drained=true;return {files:result.after,packets,summary:actual,verify:()=>stream.verify()};
   }finally{if(!drained)stream.return();}
  }}]},
 ]).run(null);
}
// Only the actual CLI's explicit json-readers+gzip route selects this new
// schedule. Existing materialized APIs retain their original hash/observer work.
export async function proposeCoreJsonReadersGzipPackets(input,progressInput=undefined){
 if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
 const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);
 if(progress)progress({stage:'project',state:'start',phase:'producer-module-load'});
 const {iterateCoreJsonReadersCorpusPackets}=await loadJsonReaderModule(),gzipStorage=await loadPacketStorageModule();
 if(progress)progress({stage:'project',state:'end',phase:'producer-module-load'});
 if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});
 const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage,progress),name='json-readers';let stage=name;
 if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});
 try{
  rejoin(original);dependencies.verify();const next=fixedAdoptionStreamStage(name,original.files,iterateCoreJsonReadersCorpusPackets,original,write,dependencies),after=next.value.files,stages=[{name,packets:next.value.packets,summary:next.value.summary,trace:next.trace}];
  stage='final-source-and-index';const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
  for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
  if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
  const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence:name,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'proposal only; review every complete stage and inverse before application; this CLI never applies sources',sourceChain:'each stage before equals previous complete after; reverse stage order and full per-file mappings to recover original sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full graph/context and one complete per-file CST at a time; detached packet serialization; actual live heap/RSS requires receiving evidence'};
  const text=JSON.stringify(index)+'\n',preparedStorage=write.prepareGzip(text);
  if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
  next.value.verify();rejoin(original);dependencies.verify();write.completeGzip(text,preparedStorage);
  return {schema:index.schema,complete:true,sequence:name,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:stages.map(({name,summary})=>({name,...summary})),packetCount:index.packets.length,packetBytes:index.packetBytes,outputBytes:preparedStorage.storedOutputBytes,semanticAdmission:false,logicalOutputBytes:write.bytes,packetStorage:'gzip',storageIndex:'packet-storage.json',storageSha256:preparedStorage.sha256};
 }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error('stream sequence failed and its incomplete receipt could not be written');failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const raw=process.argv.slice(2),selected=[5,7,9].includes(raw.length)&&raw.at(-1)==='--progress';
  // Append the flag; existing positional path/sequence values keep their meaning.
  const args=selected?raw.slice(0,-1):raw;
  // Opt-in diagnostics only: complete source/private metadata never enters a
  // record. Read the monotonic clock only for this explicitly selected route.
  const started=selected?process.hrtime.bigint():null;
  const progress=selected?record=>process.stderr.write(JSON.stringify({...record,elapsedMilliseconds:Number((process.hrtime.bigint()-started)/1000000n)})+'\n'):undefined;
  if(args.length===8&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence'&&args[6]==='--packet-storage')(args[5]==='literal'&&args[7]==='gzip'?proposeCoreLiteralGzipPackets({root:args[1],output:args[3]},progress):args[5]==='json-readers'&&args[7]==='gzip'?proposeCoreJsonReadersGzipPackets({root:args[1],output:args[3]},progress):proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5],args[7],progress)).then(receipt=>console.log(JSON.stringify(receipt)));
  else if(args.length===6&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence')proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5],undefined,progress).then(receipt=>console.log(JSON.stringify(receipt)));
  else {if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY');console.log(JSON.stringify(proposeCoreAdoptionCorpus({root:args[1],output:args[3]},progress)));}
}

// Generated complete literal packet CLI; materialized and JSON APIs unchanged.
function loadLiteralTextPacketModule(){return import('./migrate-core-literal-text.mjs');}
function fixedLiteralAdoptionStreamStage(name,files,createStream,original,write,dependencies){
 return createRulePipeline([
  {phase:'language',rules:[{id:'core-adoption:prepare-'+name+'-corpus-stream',apply:()=>createStream({entry:rootEntry(original.root),files,compilationProfile:PRODUCTION_PROFILE,...(dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})})}]},
  {phase:'repository',rules:[{id:'core-adoption:'+name+'-stream-complete-packets',apply:stream=>{
   const packets={metadata:null,before:[],after:[],inputs:[],proposals:[],moduleGraph:{metadata:null,modules:[],edges:null,diagnostics:null,concreteSyntaxMeta:[]}},paths=Object.keys(files),ordinals=new Map(paths.map((path,at)=>[path,at])),proposed=new Map(),seen=new Set();
   const arrays=new Map([['before',packets.before],['after',packets.after],['inputs',packets.inputs],['proposals',packets.proposals],['graph-modules',packets.moduleGraph.modules],['graph-concrete',packets.moduleGraph.concreteSyntaxMeta]]),singles=new Map([['metadata','metadata'],['graph-metadata','metadata'],['graph-edges','edges'],['graph-diagnostics','diagnostics']]);
   const actual={sourceFiles:paths.length,proposals:0,selections:0,edits:0,changedFiles:0,skippedFiles:0};let lastProposal=-1,skipped=null,drained=false;
   function accept(raw){
    const event=adoptionStreamEvent(raw),list=arrays.get(event.section),single=singles.get(event.section);
    if(!list&&!single||list&&event.ordinal!==list.length||single&&(event.ordinal!==0||seen.has(event.section)))fail('unknown duplicate or out-of-order stream packet');
    const graph=event.section.startsWith('graph-'),value=graph?null:JSON.parse(event.text);
    // Graph packets already come from native JSON serialization of the full
    // captured graph. Preserve their exact bytes; do not rehydrate another
    // graph here. The independent reader reparses every untrusted packet.
    let relative;
    if(list)relative=name+'/'+(graph?'graph/'+(event.section==='graph-modules'?'modules':'concrete'):event.section)+'/'+numbered(event.ordinal)+'.json';
    else relative=name+'/'+(graph?'graph/':'')+single+'.json';
    if(event.section==='before'||event.section==='after'){
     if(event.ordinal>=paths.length||value.path!==paths[event.ordinal]||typeof value.source!=='string'||event.section==='before'&&value.source!==files[value.path]||event.section==='after'&&value.source!==(proposed.get(value.path)??files[value.path]))fail('stream complete source association differs');
    }else if(event.section==='inputs'){
     if(event.ordinal>=paths.length||value.file!==paths[event.ordinal]||value.source!==files[value.file]||typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(value.sha256))fail('stream input association differs');
    }else if(event.section==='proposals'){
     const at=ordinals.get(value.file);if(at===undefined||at<=lastProposal||proposed.has(value.file)||value.before?.source!==files[value.file]||typeof value.after?.source!=='string'||!Array.isArray(value.selections)||!Array.isArray(value.edits)||!Array.isArray(value.trace)||value.trace.length!==2||value.trace[0].phase!=='language'||value.trace[1].phase!=='repository')fail('per-file stream proposal differs');
     assertAdoptionInverse(value);
     proposed.set(value.file,value.after.source);lastProposal=at;actual.proposals++;actual.selections+=value.selections.length;actual.edits+=value.edits.length;if(value.before.source!==value.after.source)actual.changedFiles++;
    }else if(event.section==='metadata'){
     const excluded=['before','after','inputs','moduleGraph','proposals'],keys=[...["schema","entry","compilationProfile","before","after","inputs","moduleGraph","proposals","skipped","executableAdmission"],...(Object.hasOwn(value.values??{},'producerEffects')?['producerEffects']:[])];
     if(JSON.stringify(value.keys)!==JSON.stringify(keys)||JSON.stringify(Object.keys(value.values))!==JSON.stringify(keys.filter(key=>!excluded.includes(key)))||value.values.schema!=="router-owned-literal-text-corpus-v1"||value.values.entry!==rootEntry(original.root)||value.values.executableAdmission!==false||!Array.isArray(value.values.skipped))fail('complete stream metadata differs');
     skipped=value.values.skipped.map(row=>row.file);
    }
    const reference=write.jsonText(relative,event.text);if(list)list.push(reference);else if(graph)packets.moduleGraph[single]=reference;else packets[single]=reference;seen.add(event.section);
   }
   try{
    let result;for(;;){const next=stream.next();if(next.done){result=next.value;break;}accept(next.value);}
    rejoin(original);dependencies.verify();  // Original post-producer source guard; partial packets are not publication.
    if(!result||typeof result!=='object'||!result.after||!result.summary||!result.counts||packets.before.length!==paths.length||packets.after.length!==paths.length||packets.inputs.length!==paths.length||!['metadata','graph-metadata','graph-edges','graph-diagnostics'].every(section=>seen.has(section))||packets.moduleGraph.modules.length!==result.counts.modules||packets.moduleGraph.concreteSyntaxMeta.length!==result.counts.concreteSyntaxMeta||!Array.isArray(skipped))fail('incomplete stream EOF or packet census');
    if(JSON.stringify(Object.keys(result.after))!==JSON.stringify(paths)||paths.some(path=>result.after[path]!== (proposed.get(path)??files[path])))fail('stream final source census differs');
    const missing=paths.filter(path=>!proposed.has(path));if(new Set(skipped).size!==skipped.length||skipped.length!==missing.length||skipped.some((path,at)=>path!==missing[at]))fail('stream proposals/skips do not partition originals');
    actual.skippedFiles=skipped.length;if(JSON.stringify(result.summary)!==JSON.stringify(actual))fail('stream summary differs from complete packets');
    drained=true;return {files:result.after,packets,summary:actual,verify:()=>stream.verify()};
   }finally{if(!drained)stream.return();}
  }}]},
 ]).run(null);
}
export async function proposeCoreLiteralGzipPackets(input,progressInput=undefined){
 if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
 const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);
 if(progress)progress({stage:'project',state:'start',phase:'producer-module-load'});
 const {iterateCoreLiteralTextCorpusPackets}=await loadLiteralTextPacketModule(),gzipStorage=await loadPacketStorageModule();
 if(progress)progress({stage:'project',state:'end',phase:'producer-module-load'});
 if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});
 const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage,progress),name='literal';let stage=name;
 if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});
 try{
  rejoin(original);dependencies.verify();const next=fixedLiteralAdoptionStreamStage(name,original.files,iterateCoreLiteralTextCorpusPackets,original,write,dependencies),after=next.value.files,stages=[{name,packets:next.value.packets,summary:next.value.summary,trace:next.trace}];
  stage='final-source-and-index';const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
  for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
  if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
  const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence:name,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'proposal only; review every complete stage and inverse before application; this CLI never applies sources',sourceChain:'each stage before equals previous complete after; reverse stage order and full per-file mappings to recover original sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full graph/context and one complete per-file CST at a time; detached packet serialization; actual live heap/RSS requires receiving evidence'};
  const text=JSON.stringify(index)+'\n',preparedStorage=write.prepareGzip(text);
  if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
  next.value.verify();rejoin(original);dependencies.verify();write.completeGzip(text,preparedStorage);
  return {schema:index.schema,complete:true,sequence:name,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:stages.map(({name,summary})=>({name,...summary})),packetCount:index.packets.length,packetBytes:index.packetBytes,outputBytes:preparedStorage.storedOutputBytes,semanticAdmission:false,logicalOutputBytes:write.bytes,packetStorage:'gzip',storageIndex:'packet-storage.json',storageSha256:preparedStorage.sha256};
 }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error('stream sequence failed and its incomplete receipt could not be written');failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}

// Explicit bounded physical source packets; complete original producer helpers
// above keep their APIs, full inverses, exclusive lifetime and failure receipts.
import {formattingPacketIO as sourceBoundPacketIO} from './formatting-packet-io.mjs';
function sourceBoundOwnedPacketStages(stages){
 if(!Array.isArray(stages)||types.isProxy(stages)||Object.getPrototypeOf(stages)!==Array.prototype||!stages.length||stages.length>21||Reflect.ownKeys(stages).length!==stages.length+1)fail('bounded dense owned stage sequence required');
 const names=[];for(let at=0;at<stages.length;at++){const field=Object.getOwnPropertyDescriptor(stages,String(at));if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||names.includes(field.value))fail('unique own owned stage names required');names.push(field.value);}return names;
}
function sourceBoundOwnedPacketWriter(target,storage,progress){
 const original=writer(target,storage,progress),guard=text=>{if(typeof text!=='string'||original.bytes+Buffer.byteLength(text)>500000000-FAILURE_RESERVE)fail('complete task-owned source evidence exceeds 500 MB; no partial result can be completed');};
 return {json(path,value){const text=JSON.stringify(value)+'\n';guard(text);return original.jsonText(path,text);},text(path,text){guard(text);return original.text(path,text);},get records(){return original.records;},get bytes(){return original.bytes;},prepareGzip(text){guard(text);return original.prepareGzip(text);},completeGzip(text,prepared){return original.completeGzip(text,prepared);},failure(error,stage){return original.failure(error,stage);}};
}
export async function proposeSourceBoundOwnedCorePackets(input,stages,progressInput){
 const requested=options(input),names=sourceBoundOwnedPacketStages(stages),progress=progressInput==null?null:translationProgressReporter(progressInput);
 const bulk=await import('./source-bound-owned-core-bulk.mjs'),storage=await loadPacketStorageModule();
 if(names.some(name=>!bulk.SOURCE_BOUND_OWNED_CORE_STAGES.includes(name)))fail('unknown fixed owned stage');
 const root=realpathSync(resolve(requested.root)),original=snapshot(root),dependencies=sourceBoundPacketIO.sequenceDependencies(root);
 if(!dependencies.inputs||dependencies.rows.some(row=>row.absent))fail('complete actual package/workspace Cargo inputs required');
 const target=destination(root,requested.output),write=sourceBoundOwnedPacketWriter(target,storage,progress),receipts=[],iterator=bulk.proposeSourceBoundOwnedCoreStages({entry:rootEntry(root),files:original.files,dependencyInputs:dependencies.inputs,compilationProfile:PRODUCTION_PROFILE,stages:names});
 const sequence='source-bound-owned:'+names.join(',');let stage='original-source-capture',after=original.files,next=null;
 try{
  // Explicitly release whole packet references before awaiting another graph.
  while(!(next=await iterator.next()).done){
   {
    let packet=next.value;next=null;stage=packet.stage;
    rejoin(original);dependencies.verify();
    if(packet.index!==receipts.length||packet.stage!==names[receipts.length]||packet.executableAdmission!==false||packet.applicationSourcesInstalled!==false)fail('whole source-bound stage association differs');
    const prefix='owned/'+numbered(packet.index)+'-'+packet.stage,run=createRulePipeline([
     {phase:'language',rules:[{id:'owned-source-packets:retain-complete-original-'+packet.stage,apply:()=>packet.proposal}]},
     {phase:'repository',rules:[{id:'router:partition-complete-'+packet.stage+'-source-evidence',apply:proposal=>{
      const packets=completeAdoptionPackets(proposal,write,after,prefix,progress);
      return {files:Object.assign(Object.create(null),proposal.after),packets,summary:{sourceFiles:Object.keys(proposal.before).length,changedFiles:Object.keys(proposal.before).filter(path=>proposal.before[path]!==proposal.after[path]).length,executableCoverageGain:null}};
     }}]},
    ]).run(null);
    after=run.value.files;receipts.push({name:stage,packets:run.value.packets,summary:run.value.summary,trace:run.trace});packet=null;
    if(write.bytes>500000000)fail('complete task-owned source evidence exceeds 500 MB; no partial result can be completed');
   }
  }
  next=null;if(receipts.length!==names.length)fail('incomplete owned stage sequence');stage='final-source-and-index';
  const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
  for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
  if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
  const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages:receipts,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'source proposal only; no application installation or executable authority',sourceChain:'complete original source maps and per-file inverses in stage order; source inverse is not reverse execution',hostBoundary:'original exclusive packet output and complete physical source/Cargo guards; no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'whole original proposer retained for one stage; only next source strings and packet references cross stage boundaries; live heap/RSS receiving qualification required'};
  const text=JSON.stringify(index)+'\n',prepared=write.prepareGzip(text);
  if(prepared.storedOutputBytes>500000000||write.bytes+Buffer.byteLength(text)+prepared.bytes>500000000)fail('complete task-owned source evidence exceeds 500 MB');
  if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
  rejoin(original);dependencies.verify();write.completeGzip(text,prepared);
  return {schema:index.schema,complete:true,sequence,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:receipts.map(({name,summary})=>({name,...summary})),packetCount:index.packets.length,logicalOutputBytes:write.bytes,outputBytes:prepared.storedOutputBytes,packetStorage:'gzip',storageIndex:'packet-storage.json',storageSha256:prepared.sha256,semanticAdmission:false,applicationSourcesInstalled:false,executableCoverageGain:null};
 }catch(error){
  let failed=error;try{await iterator.return();}catch(closeError){failed=new AggregateError([error,closeError],'owned source proposal and iterator close failed');}
  try{write.failure(failed,stage);}catch(reportFailure){const failure=new Error('owned source proposal failed and its incomplete receipt could not be written');failure.cause=failed;failure.reportFailure=reportFailure;throw failure;}throw failed;
 }
}

// Additive full source packet composition. The old one-pass protocol stays intact.
export async function proposeSourceBoundCoreFixedPointPackets(input,stages,progressInput){
 const requested=options(input),names=sourceBoundOwnedPacketStages(stages),progress=progressInput==null?null:translationProgressReporter(progressInput);
 const bulk=await import('./source-bound-owned-core-fixed-point.mjs'),storage=await loadPacketStorageModule();
 if(names.some(name=>!bulk.SOURCE_BOUND_OWNED_CORE_STAGES.includes(name)))fail('unknown fixed owned stage');
 const root=realpathSync(resolve(requested.root)),original=snapshot(root),dependencies=sourceBoundPacketIO.sequenceDependencies(root);
 if(!dependencies.inputs||dependencies.rows.some(row=>row.absent))fail('complete actual package/workspace Cargo inputs required');
 const target=destination(root,requested.output),write=sourceBoundOwnedPacketWriter(target,storage,progress),receipts=[],iterator=bulk.proposeSourceBoundOwnedCoreFixedPointStages({entry:rootEntry(root),files:original.files,dependencyInputs:dependencies.inputs,compilationProfile:PRODUCTION_PROFILE,stages:names});
 const sequence='source-bound-owned-fixed-point:'+names.join(',');let stage='original-source-capture',after=original.files,next=null,terminal=null,terminalPacket=null;
 try{
  // Explicitly release whole packet references before awaiting another graph.
  while(!(next=await iterator.next()).done){
   {
    let packet=next.value;next=null;stage=packet.stage??"fixed-point-receipt";
    rejoin(original);dependencies.verify();
    if(packet.schema==='source-bound-owned-core-fixed-point-receipt-v1'){
     if(terminal||packet.stabilized!==true||packet.iterations!==receipts.length||packet.rounds!==receipts.length/names.length||JSON.stringify(packet.stages)!==JSON.stringify(names))fail('complete unchanged-round receipt association differs');terminal={...packet,stages:[...packet.stages]};terminalPacket=write.json('composition/fixed-point.json',terminal);packet=null;continue;
    }
    if(terminal||packet.schema!=='source-bound-owned-core-fixed-point-stage-v1'||packet.index!==receipts.length||packet.stage!==names[receipts.length%names.length]||packet.round!==Math.floor(receipts.length/names.length)||packet.stageIndex!==receipts.length%names.length||packet.executableAdmission!==false||packet.applicationSourcesInstalled!==false)fail('whole fixed-point source stage association differs');
    const prefix='owned/'+numbered(packet.index)+'-'+packet.stage,run=createRulePipeline([
     {phase:'language',rules:[{id:'owned-source-packets:retain-complete-original-'+packet.stage,apply:()=>packet.proposal}]},
     {phase:'repository',rules:[{id:'router:partition-complete-'+packet.stage+'-source-evidence',apply:proposal=>{
      const packets=completeAdoptionPackets(proposal,write,after,prefix,progress);
      return {files:Object.assign(Object.create(null),proposal.after),packets,summary:{sourceFiles:Object.keys(proposal.before).length,changedFiles:Object.keys(proposal.before).filter(path=>proposal.before[path]!==proposal.after[path]).length,executableCoverageGain:null}};
     }}]},
    ]).run(null);
    after=run.value.files;receipts.push({name:stage,round:packet.round,stageIndex:packet.stageIndex,packets:run.value.packets,summary:run.value.summary,trace:run.trace});packet=null;
    if(write.bytes>500000000)fail('complete task-owned source evidence exceeds 500 MB; no partial result can be completed');
   }
  }
  next=null;if(!terminal||!terminalPacket||receipts.length!==terminal.iterations)fail('complete unchanged-round source receipt required');receipts.push({name:'fixed-point-receipt',packet:terminalPacket});stage='final-source-and-index';
  const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
  for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
  if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
  const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence,entry:rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages:receipts,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'source proposal only; no application installation or executable authority',sourceChain:'complete original source maps and per-file inverses in stage order; source inverse is not reverse execution',hostBoundary:'original exclusive packet output and complete physical source/Cargo guards; no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'whole original proposer retained for one stage; only next source strings and packet references cross stage boundaries; live heap/RSS receiving qualification required'};
  const text=JSON.stringify(index)+'\n',prepared=write.prepareGzip(text);
  if(prepared.storedOutputBytes>500000000||write.bytes+Buffer.byteLength(text)+prepared.bytes>500000000)fail('complete task-owned source evidence exceeds 500 MB');
  if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});
  rejoin(original);dependencies.verify();write.completeGzip(text,prepared);
  return {schema:index.schema,complete:true,sequence,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:receipts.filter(row=>row.name!=='fixed-point-receipt').map(({name,round,stageIndex,summary})=>({name,round,stageIndex,...summary})),composition:{rounds:terminal.rounds,iterations:terminal.iterations,stabilized:true,coverageComplete:false,runtimeParity:false},packetCount:index.packets.length,logicalOutputBytes:write.bytes,outputBytes:prepared.storedOutputBytes,packetStorage:'gzip',storageIndex:'packet-storage.json',storageSha256:prepared.sha256,semanticAdmission:false,applicationSourcesInstalled:false,executableCoverageGain:null};
 }catch(error){
  let failed=error;try{await iterator.return();}catch(closeError){failed=new AggregateError([error,closeError],'owned source proposal and iterator close failed');}
  try{write.failure(failed,stage);}catch(reportFailure){const failure=new Error('owned source proposal failed and its incomplete receipt could not be written');failure.cause=failed;failure.reportFailure=reportFailure;throw failure;}throw failed;
 }
}
