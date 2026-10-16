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
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY');
  console.log(JSON.stringify(proposeCoreAdoptionCorpus({root:args[1],output:args[3]})));
}
