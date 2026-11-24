// Generated whole bounded source helpers; prepare-formatting-packet-cli.mjs owns this file.
import {crateEntrySourcePath} from './repository-layout.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,realpathSync,existsSync,renameSync} from 'node:fs';
import {resolve,join,dirname,basename,posix} from 'node:path';
export const SOURCE_FORMATTING_PACKET_LIMITS=Object.freeze({files:1024,paths:20000,pathUnits:4096,fileBytes:8000000,fileUnits:2000000,sourceUnits:32*1024*1024,packetBytes:64*1024*1024,outputBytes:1024*1024*1024,packets:20000});
const L=SOURCE_FORMATTING_PACKET_LIMITS,FAILURE_RESERVE=16384;
const rootEntry=root=>repositoryRustLayout(root).entries[0];
const fail=message=>{throw new TypeError('Source-backed formatting packets: '+message);};
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
      const encoded=gzipStorage.encodeFormattingGzipPacket(text),file=relative+'.gz';
      if(storedBytes+encoded.bytes.length>gzipStorage.SOURCE_FORMATTING_GZIP_LIMITS.storedBytes-FAILURE_RESERVE)fail('stored packet/output byte limit');
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
      preparedGzip=gzipStorage.prepareFormattingGzipIndex(text,storageRows);
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
      const text=JSON.stringify({schema:'router-source-backed-formatting-incomplete-v1',complete:false,stage,message,packetCount:records.length,packetBytes:totalBytes,semanticAdmission:false})+'\n';
      if(Buffer.byteLength(text)>FAILURE_RESERVE)fail('failure receipt limit');parent('failure.json');writeFileSync(join(target.path,'failure.json'),text,{flag:'wx'});
    }};
}
const numbered=at=>String(at).padStart(6,'0');
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
function formattingDependencies(root){
  function capture(){return [repositoryRustLayout(root).manifest,repositoryRustLayout(root).lock].concat(repositoryRustLayout(root).cargoInputs).filter((path,at,all)=>all.indexOf(path)===at).map(path=>{const absolute=join(root,path);if(!existsSync(absolute))return {path,absent:true};const before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size>L.fileBytes)fail('regular bounded Cargo source required');const raw=readFileSync(absolute),source=raw.toString('utf8'),after=lstatSync(absolute);if(!fileSame(before,after)||source.length>L.fileUnits||!Buffer.from(source,'utf8').equals(raw))fail('Cargo source identity/UTF8 changed');return {path,source,identity:{dev:after.dev,ino:after.ino,mode:after.mode,size:after.size,mtimeMs:after.mtimeMs,ctimeMs:after.ctimeMs}};});}
  const rows=capture(),inputs=rows.slice(0,2).every(row=>!row.absent)?{manifest:rows[0].source,lock:rows[1].source}:undefined;
  return {rows,inputs,verify(){const current=capture();for(let at=0;at<rows.length;at++){const a=rows[at],b=current[at];if(a.path!==b.path||a.absent!==b.absent||a.source!==b.source||!a.absent&&!fileSame(a.identity,b.identity))fail('complete optional Cargo input changed');}}};
}
function adoptionStreamEvent(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own packet stream event required');
 const names=Reflect.ownKeys(value);if(names.length!==3||!['section','ordinal','text'].every(name=>names.includes(name)))fail('packet stream event fields');
 const result={};for(const name of names){const d=Object.getOwnPropertyDescriptor(value,name);if(!d||!Object.hasOwn(d,'value'))fail('packet stream event accessor');result[name]=d.value;}
 if(typeof result.section!=='string'||!Number.isSafeInteger(result.ordinal)||result.ordinal<0||result.ordinal>=L.packets||typeof result.text!=='string'||Buffer.byteLength(result.text)>L.packetBytes)fail('packet stream event bounds');
 return result;
}

export const formattingPacketIO=Object.freeze({limits:L,rootEntry,options,pathName,snapshot,rejoin,destination,writer,sequenceDependencies:formattingDependencies,adoptionStreamEvent,numbered,assertAdoptionInverse,hash});
