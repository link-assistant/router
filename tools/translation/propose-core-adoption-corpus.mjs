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

export const CORE_ADOPTION_PACKET_LIMITS=Object.freeze({files:1024,paths:20000,pathUnits:4096,fileBytes:8000000,fileUnits:2000000,sourceUnits:32*1024*1024,packetBytes:64*1024*1024,outputBytes:1024*1024*1024,packets:20000});
const L=CORE_ADOPTION_PACKET_LIMITS,FAILURE_RESERVE=16384;
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
  const rootIdentity=lstatSync(root);if(!rootIdentity.isDirectory()||rootIdentity.isSymbolicLink())fail('regular physical source root required');visit('src');
  if(!Object.hasOwn(files,'src/lib.rs'))fail('src/lib.rs entry required');
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
function writer(target){
  const records=[],directories=new Map();let totalBytes=0,created=false,identity=null;
  function current(){if(!created){identity=ownDirectory(target);created=true;directories.set('',identity);}if(!directorySame(identity,lstatSync(target.path))||realpathSync(target.path)!==target.physical)fail('owned proposal root changed');}
  function parent(relative){
    current();const parts=relative.split('/');parts.pop();let path='';
    for(const part of parts){path=path?path+'/'+part:part;const full=join(target.path,path);if(!directories.has(path)){mkdirSync(full,{recursive:false});directories.set(path,lstatSync(full));}const now=lstatSync(full);if(!now.isDirectory()||now.isSymbolicLink()||!directorySame(directories.get(path),now))fail('owned proposal directory changed');}
  }
  function put(relative,text,kind='json'){
    if(records.length>=L.packets||typeof text!=='string'||relative.split('/').some(part=>!part||part==='.'||part==='..')||relative.includes('\\'))fail('packet path/count');
    const bytes=Buffer.byteLength(text);if(bytes>L.packetBytes||totalBytes+bytes>L.outputBytes-FAILURE_RESERVE)fail('packet/output byte limit');
    const sha256=hash(text);parent(relative);writeFileSync(join(target.path,relative),text,{flag:'wx'});totalBytes+=bytes;
    const record={path:relative,kind,bytes,sha256};records.push(record);return record;
  }
  const json=(path,value)=>put(path,JSON.stringify(value)+'\n');
  return {json,text:(path,value)=>put(path,value,'rust-source'),get records(){return records;},get bytes(){return totalBytes;},get created(){return created;},
    complete(text){const bytes=Buffer.byteLength(text);if(bytes>L.packetBytes||totalBytes+bytes>L.outputBytes-FAILURE_RESERVE)fail('index/output byte limit');parent('index.pending.json');writeFileSync(join(target.path,'index.pending.json'),text,{flag:'wx'});renameSync(join(target.path,'index.pending.json'),join(target.path,'index.json'));totalBytes+=bytes;},
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
export function proposeCoreAdoptionCorpus(input){
  if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
  const requested=options(input),root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),write=writer(target);
  let stage='formatting',formatting=null,primitives=null,after=null,formattingTrace=null,primitiveTrace=null,summary=null;
  try{
    const first=createRulePipeline([
      {phase:'language',rules:[{id:'core-adoption:complete-formatting-corpus',apply:()=>proposeCoreFormattingCorpus({entry:'src/lib.rs',files:original.files,compilationProfile:PRODUCTION_PROFILE})}]},
      {phase:'repository',rules:[{id:'core-adoption:formatting-complete-packets',apply:proposal=>{
        rejoin(original);const files=Object.assign(Object.create(null),original.files);
        for(const row of proposal.rows)if(row.status==='proposed'){if(row.proposal.before.source!==files[row.path])fail('formatting source association');files[row.path]=row.proposal.after.source;}
        const packets=formattingPackets(proposal,write);summary=proposal.summary;return {files,packets};
      }}]},
    ]).run(null);
    formatting=first.value.packets;after=first.value.files;formattingTrace=first.trace;
    stage='primitives';rejoin(original);
    const second=createRulePipeline([
      {phase:'language',rules:[{id:'core-adoption:complete-primitives-corpus',apply:()=>proposeCorePrimitivesCorpus({entry:'src/lib.rs',files:after,compilationProfile:PRODUCTION_PROFILE})}]},
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
    const index={schema:'router-core-adoption-packets-v1',complete:true,entry:'src/lib.rs',sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,census,formatting,primitives,changes,summary:{sourceFiles:original.rows.length,changedFiles:changes.length,formatting:summary},phaseTrace:{formatting:formattingTrace,primitives:primitiveTrace},packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'review complete index and every packet before installing; this CLI never applies sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full API proposal at a time; per-packet serialization, live graph/CST residency still requires measured receiving'};
    const text=JSON.stringify(index)+'\n';
    // Every packet hash precedes this final fresh source rejoin. No hash or
    // caller-provided action occurs between it and stock index publication.
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
function completeAdoptionPackets(proposal,write,files,name){
  const graph=proposal.moduleGraph,excluded=['before','after','inputs','moduleGraph','proposals'];
  if(!graph||Object.keys(proposal.before).length!==Object.keys(files).length||Object.keys(proposal.after).length!==Object.keys(files).length)fail('complete returned source census differs');
  for(const path of Object.keys(files))if(proposal.before[path]!==files[path]||typeof proposal.after[path]!=='string')fail('returned source chain differs');
  const packets={metadata:write.json(name+'/metadata.json',{keys:Object.keys(proposal),values:fieldsExcept(proposal,excluded)}),before:Object.entries(proposal.before).map(([path,source],at)=>write.json(name+'/before/'+numbered(at)+'.json',{path,source})),after:Object.entries(proposal.after).map(([path,source],at)=>write.json(name+'/after/'+numbered(at)+'.json',{path,source})),inputs:proposal.inputs.map((row,at)=>write.json(name+'/inputs/'+numbered(at)+'.json',row)),proposals:[],moduleGraph:{metadata:write.json(name+'/graph/metadata.json',{keys:Object.keys(graph),values:fieldsExcept(graph,['modules','edges','diagnostics','concreteSyntaxMeta'])}),modules:graph.modules.map((row,at)=>write.json(name+'/graph/modules/'+numbered(at)+'.json',row)),edges:write.json(name+'/graph/edges.json',graph.edges),diagnostics:write.json(name+'/graph/diagnostics.json',graph.diagnostics),concreteSyntaxMeta:graph.concreteSyntaxMeta.map((row,at)=>write.json(name+'/graph/concrete/'+numbered(at)+'.json',row))}};
  for(let at=0;at<proposal.proposals.length;at++){const row=proposal.proposals[at];if(row.before.source!==files[row.file]||row.after.source!==proposal.after[row.file])fail('per-file source chain differs');assertAdoptionInverse(row);packets.proposals.push(write.json(name+'/proposals/'+numbered(at)+'.json',row));}
  return packets;
}
// Only the explicit adoption sequences capture Cargo inputs. The original
// formatting/primitives producer above keeps its original source contract.
function sequenceDependencies(root){
  function capture(){return ['Cargo.toml','Cargo.lock'].map(path=>{const absolute=join(root,path);if(!existsSync(absolute))return {path,absent:true};const before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size>L.fileBytes)fail('regular bounded Cargo source required');const raw=readFileSync(absolute),source=raw.toString('utf8'),after=lstatSync(absolute);if(!fileSame(before,after)||source.length>L.fileUnits||!Buffer.from(source,'utf8').equals(raw))fail('Cargo source identity/UTF8 changed');return {path,source,identity:{dev:after.dev,ino:after.ino,mode:after.mode,size:after.size,mtimeMs:after.mtimeMs,ctimeMs:after.ctimeMs}};});}
  const rows=capture(),inputs=rows.every(row=>!row.absent)?{manifest:rows[0].source,lock:rows[1].source}:undefined;
  return {rows,inputs,verify(){const current=capture();for(let at=0;at<rows.length;at++){const a=rows[at],b=current[at];if(a.path!==b.path||a.absent!==b.absent||a.source!==b.source||!a.absent&&!fileSame(a.identity,b.identity))fail('complete optional Cargo input changed');}}};
}
function fixedAdoptionStage(name,files,propose,original,write,dependencies,producerDependencies=false){
  // The full proposal/graph is reachable only in this call. Return the next
  // primitive source map and packet references, never the live proposal.
  return createRulePipeline([
    {phase:'language',rules:[{id:'core-adoption:complete-'+name+'-corpus',apply:()=>propose({entry:'src/lib.rs',files,compilationProfile:PRODUCTION_PROFILE,...((name==='literal'||name==='scalar-count'||name==='json'||producerDependencies)&&dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})})}]},
    {phase:'repository',rules:[{id:'core-adoption:'+name+'-complete-packets',apply:proposal=>{
      rejoin(original);dependencies.verify();const packets=completeAdoptionPackets(proposal,write,files,name);
      return {files:proposal.after,packets,summary:{sourceFiles:Object.keys(proposal.before).length,proposals:proposal.proposals.length,selections:proposal.proposals.reduce((sum,row)=>sum+row.selections.length,0),edits:proposal.proposals.reduce((sum,row)=>sum+row.edits.length,0),changedFiles:proposal.proposals.filter(row=>row.before.source!==row.after.source).length,skippedFiles:proposal.skipped.length}};
    }}]},
  ]).run(null);
}
export async function proposeCoreAdoptionSequence(input,sequence='literal'){
  if(sequence!=='literal'&&sequence!=='literal-algebraic'&&sequence!=='scalar-count'&&sequence!=='json-algebraic-primitives'&&sequence!=='json-updates'&&sequence!=='json-indices'&&sequence!=='json-copies')fail('fixed sequence must be literal, literal-algebraic, scalar-count, json-algebraic-primitives or json-updates');
  if(!['darwin','linux'].includes(process.platform))fail('POSIX source-proposal receiving required');
  const requested=options(input);
  // Lazy imports preserve the old API's module initialization graph. Selected
  // imports finish before taking the operation's complete source snapshot.
  const jsonSequence=sequence==='json-algebraic-primitives',jsonUpdates=sequence==='json-updates',jsonIndices=sequence==='json-indices',jsonCopies=sequence==='json-copies';
  const proposeCoreLiteralTextCorpus=sequence==='scalar-count'||jsonSequence||jsonUpdates||jsonIndices||jsonCopies?null:(await import('./migrate-core-literal-text.mjs')).proposeCoreLiteralTextCorpus;
  const updates=jsonUpdates?(await import('./migrate-core-json-updates.mjs')).proposeCoreJsonUpdateCorpus:null;
  const copies=jsonCopies?(await import('./migrate-core-json-copies.mjs')).proposeCoreJsonCopiesCorpus:null;
  const indices=jsonIndices?(await import('./migrate-core-json-indices.mjs')).proposeCoreJsonIndicesCorpus:null;
  const json=jsonSequence?(await import('./migrate-core-json.mjs')).proposeCoreJsonCorpus:null;
  const scalars=sequence==='scalar-count'?(await import('./migrate-core-scalars.mjs')).proposeCoreScalarsCorpus:null;
  const algebraic=sequence==='literal-algebraic'||jsonSequence?(await import('./migrate-core-algebraic.mjs')).proposeCoreAlgebraicCorpus:null;
  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target),stages=[];
  let stage=jsonCopies?'json-copies':jsonIndices?'json-indices':jsonUpdates?'json-updates':sequence==='scalar-count'?'scalar-count':jsonSequence?'json':'literal',after=original.files;
  try{
    for(const name of jsonCopies?['json-copies']:jsonIndices?['json-indices']:jsonUpdates?['json-updates']:jsonSequence?['json','algebraic','primitives']:sequence==='scalar-count'?['scalar-count']:sequence==='literal'?['literal']:['literal','algebraic']){
      stage=name;rejoin(original);dependencies.verify();const next=fixedAdoptionStage(name,after,name==='json-copies'?copies:name==='json-indices'?indices:name==='json-updates'?updates:name==='json'?json:name==='primitives'?proposeCorePrimitivesCorpus:name==='scalar-count'?scalars:name==='literal'?proposeCoreLiteralTextCorpus:algebraic,original,write,dependencies,jsonSequence||jsonUpdates||jsonIndices||jsonCopies);
      after=next.value.files;stages.push({name,packets:next.value.packets,summary:next.value.summary,trace:next.trace});
    }
    stage='final-source-and-index';const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units}),changes=[];
    for(const [path,source]of Object.entries(after)){pathName(path);if(!Object.hasOwn(original.files,path))fail('unexpected adopted source path');if(source!==original.files[path])changes.push({path,beforeSha256:hash(original.files[path]),afterSha256:hash(source),source:write.text('after/'+path,source)});}
    if(Object.keys(after).length!==original.rows.length)fail('adopted source path census differs');
    const index={schema:'router-core-adoption-sequence-packets-v1',complete:true,sequence,entry:'src/lib.rs',sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:L,inputs,dependencyInputs,census,stages,changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:'proposal only; review every complete stage and inverse before application; this CLI never applies sources',sourceChain:'each stage before equals previous complete after; reverse stage order and full per-file mappings to recover original sources',hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full API proposal/graph at a time; per-packet serialization; actual live heap/RSS requires receiving evidence'};
    const text=JSON.stringify(index)+'\n';rejoin(original);dependencies.verify();write.complete(text);
    return {schema:index.schema,complete:true,sequence,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:changes.length,stages:stages.map(({name,summary})=>({name,...summary})),packetCount:index.packets.length,packetBytes:index.packetBytes,outputBytes:write.bytes,semanticAdmission:false};
  }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error('sequence proposal failed and its incomplete receipt could not be written');failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length===6&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence')proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5]).then(receipt=>console.log(JSON.stringify(receipt)));
  else {if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY');console.log(JSON.stringify(proposeCoreAdoptionCorpus({root:args[1],output:args[3]})));}
}
