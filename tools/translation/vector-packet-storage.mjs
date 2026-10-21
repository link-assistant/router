// Generated complete bounded vector DATA transport; prepare-source-backed-vectors.mjs owns this file.
// Transport integrity only. Decoding a packet grants no compiler/source authority.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';

export const SOURCE_VECTOR_GZIP_LIMITS=Object.freeze({packetBytes:64*1024*1024,outputBytes:1024*1024*1024,storedBytes:384*1024*1024,packets:20000,paths:20000,pathUnits:4096,failureReserve:16384});
const L=SOURCE_VECTOR_GZIP_LIMITS,SCHEMA="router-source-backed-vector-gzip-storage-v1";
const fail=message=>{throw new TypeError("Vector packet storage: "+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
function size(value,maximum){if(!Number.isSafeInteger(value)||value<0||value>maximum)fail('invalid byte/count bound');return value;}
function name(value){
  if(typeof value!=='string'||!value.length||value.length>L.pathUnits||/[\x00-\x1f:\\]/u.test(value)||posix.isAbsolute(value)||posix.normalize(value)!==value||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('noncanonical packet path');
  return value;
}
function data(value,keys){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))fail('own storage record required');
  const descriptors=Object.getOwnPropertyDescriptors(value),actual=Reflect.ownKeys(descriptors);
  if(actual.length!==keys.length||actual.some(key=>typeof key!=='string'||!keys.includes(key)))fail('unrecognized storage record fields');
  const result={};for(const key of keys){const descriptor=descriptors[key];if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('storage accessor refused');result[key]=descriptor.value;}return result;
}
function list(value,maximum){
  if(!Array.isArray(value)||types.isProxy(value))fail('dense storage array required');
  const descriptors=Object.getOwnPropertyDescriptors(value),length=size(descriptors.length?.value,maximum);
  if(Reflect.ownKeys(descriptors).length!==length+1)fail('storage array holes or extra keys');
  const result=[];for(let at=0;at<length;at++){const descriptor=descriptors[String(at)];if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('storage array accessor refused');result.push(descriptor.value);}return result;
}
function logical(value){
  const row=data(value,['path','kind','bytes','sha256']);name(row.path);size(row.bytes,L.packetBytes);
  if(!['json','rust-source'].includes(row.kind)||!digest(row.sha256))fail('invalid logical packet descriptor');return row;
}
function stored(value){
  const row=data(value,['path','kind','rawBytes','rawSha256','file','bytes','sha256']);name(row.path);name(row.file);size(row.rawBytes,L.packetBytes);size(row.bytes,L.storedBytes);
  if(row.file!==row.path+'.gz'||!['json','rust-source'].includes(row.kind)||!digest(row.rawSha256)||!digest(row.sha256))fail('invalid stored packet descriptor');return row;
}
function text(raw){const value=raw.toString('utf8');if(!Buffer.from(value,'utf8').equals(raw))fail('invalid packet UTF8');return value;}
function canonical(raw){const source=text(raw);let value;try{value=JSON.parse(source);}catch{fail('invalid storage/index JSON');}if(JSON.stringify(value)+'\n'!==source)fail('noncanonical storage/index JSON or duplicate keys');return value;}

export function encodeVectorGzipPacket(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>L.packetBytes)fail('bounded primitive packet text required');
  const bytes=gzipSync(source,{mtime:0});return {bytes,sha256:hash(bytes)};
}

// Pure metadata construction; all its JSON/hash work precedes the producer's
// final fresh source/Cargo guard. The manifest is storage data, never a proof.
export function prepareVectorGzipIndex(indexText,records){
  if(typeof indexText!=='string')fail('primitive logical index required');
  const indexBytes=Buffer.byteLength(indexText);size(indexBytes,L.packetBytes);
  const rows=list(records,L.packets).map(stored),seen=new Set();let rawBytes=indexBytes,storedBytes=indexBytes;
  for(const row of rows){if(seen.has(row.path))fail('duplicate logical storage path');seen.add(row.path);rawBytes+=row.rawBytes;storedBytes+=row.bytes;}
  const value={schema:SCHEMA,complete:true,encoding:'gzip',index:{path:'index.json',bytes:indexBytes,sha256:hash(indexText)},packets:rows};
  const source=JSON.stringify(value)+'\n',bytes=Buffer.byteLength(source);size(bytes,L.packetBytes);
  if(rawBytes+bytes>L.outputBytes-L.failureReserve||storedBytes+bytes>L.storedBytes-L.failureReserve)fail('logical/stored output byte limit');
  return {source,bytes,sha256:hash(source),indexBytes,logicalOutputBytes:rawBytes+bytes,storedOutputBytes:storedBytes+bytes};
}

function physicalRoot(value){
  if(typeof value!=='string'||!value.length||value.includes('\0'))fail('primitive output root required');let root=resolve(value);
  // These two stock Darwin aliases are also used by the receiving monitors.
  for(const alias of ['/tmp','/var'])if(root===alias||root.startsWith(alias+'/'))root=join(realpathSync(alias),root.slice(alias.length));
  let current='/';for(const part of root.split('/').filter(Boolean)){current=join(current,part);const item=lstatSync(current);if(item.isSymbolicLink()||!item.isDirectory())fail('linked/non-directory storage root');}
  if(realpathSync(root)!==root)fail('storage root is not physical');return root;
}

export function openVectorGzipPackets(output){
  const root=physicalRoot(output),rootIdentity=lstatSync(root);
  function file(relative){
    name(relative);const parts=relative.split('/');let current=root;
    for(const part of parts.slice(0,-1)){current=join(current,part);const item=lstatSync(current);if(!item.isDirectory()||item.isSymbolicLink())fail('linked packet directory');}
    const path=join(root,relative),identity=lstatSync(path);if(!identity.isFile()||identity.isSymbolicLink())fail('regular stored packet required');return {path,identity};
  }
  function read(relative,maximum,expected=null){
    const before=file(relative);size(before.identity.size,maximum);if(expected&&!same(before.identity,expected))fail('stored packet identity changed');
    const raw=readFileSync(before.path),after=file(relative).identity;if(!same(before.identity,after)||raw.length!==before.identity.size)fail('stored packet changed during read');return {raw,identity:after};
  }
  const indexFile=read('index.json',L.packetBytes),manifestFile=read('packet-storage.json',L.packetBytes),index=canonical(indexFile.raw),manifest=data(canonical(manifestFile.raw),['schema','complete','encoding','index','packets']);
  if(manifest.schema!==SCHEMA||manifest.complete!==true||manifest.encoding!=='gzip')fail('incomplete or unsupported storage index');
  const indexBinding=data(manifest.index,['path','bytes','sha256']);
  if(indexBinding.path!=='index.json'||indexBinding.bytes!==indexFile.raw.length||!digest(indexBinding.sha256)||indexBinding.sha256!==hash(indexFile.raw))fail('logical index binding changed');
  const expectedKeys=['schema','complete','sequence','entry','sourceRoot','compilationProfile','limits','inputs','dependencyInputs','census','stages','changes','packets','packetBytes','semanticAdmission','installation','sourceChain','hostBoundary','memory'];
  data(index,expectedKeys);
  if(index.schema!=="router-source-backed-vector-packets-v1"||index.complete!==true||index.semanticAdmission!==false||index.sequence!=="source-backed-vector")fail("complete vector logical index required");
  const limits=data(index.limits,['files','paths','pathUnits','fileBytes','fileUnits','sourceUnits','packetBytes','outputBytes','packets']);
  const expectedLimits={files:1024,paths:20000,pathUnits:4096,fileBytes:8000000,fileUnits:2000000,sourceUnits:32*1024*1024,packetBytes:L.packetBytes,outputBytes:L.outputBytes,packets:L.packets};
  for(const key of Object.keys(expectedLimits))if(limits[key]!==expectedLimits[key])fail('logical packet limits changed');
  const logicalRows=list(index.packets,L.packets).map(logical),storageRows=list(manifest.packets,L.packets).map(stored),packets=new Map(),expectedFiles=new Map();let rawBytes=0,storedBytes=indexFile.raw.length+manifestFile.raw.length;
  if(logicalRows.length!==storageRows.length)fail('storage packet census differs');
  for(const [at,row] of logicalRows.entries()){
    const physical=storageRows[at];if(physical.path!==row.path||physical.kind!==row.kind||physical.rawBytes!==row.bytes||physical.rawSha256!==row.sha256||packets.has(row.path)||expectedFiles.has(physical.file))fail('ordered complete packet association differs');
    if(['index.json','packet-storage.json','failure.json'].includes(row.path))fail('reserved packet path');
    packets.set(row.path,Object.freeze({logical:Object.freeze(row),stored:Object.freeze(physical)}));expectedFiles.set(physical.file,physical.bytes);rawBytes+=row.bytes;storedBytes+=physical.bytes;
  }
  if(index.packetBytes!==rawBytes||rawBytes+indexFile.raw.length+manifestFile.raw.length>L.outputBytes-L.failureReserve||storedBytes>L.storedBytes-L.failureReserve)fail('logical/stored aggregate byte limit');
  expectedFiles.set('index.json',indexFile.raw.length);expectedFiles.set('packet-storage.json',manifestFile.raw.length);
  function inventory(){
    const observed=new Map(),directories=new Set(['']);let entries=0,bytes=0;
    function visit(relative){
      if(++entries>L.packets+L.paths+3)fail('physical storage census bound');const before=lstatSync(join(root,relative));
      if(before.isSymbolicLink())fail('linked storage entry');
      if(before.isDirectory()){directories.add(relative);for(const child of readdirSync(join(root,relative)).sort())visit(relative?relative+'/'+child:child);}
      else if(before.isFile()){if(!expectedFiles.has(relative)||observed.has(relative)||before.size!==expectedFiles.get(relative))fail('unlisted/incomplete or changed physical packet');bytes+=before.size;if(bytes>L.storedBytes)fail('physical storage byte limit');observed.set(relative,before);}
      else fail('special storage entry');
      if(!same(before,lstatSync(join(root,relative))))fail('physical storage census changed');
    }
    visit('');if(observed.size!==expectedFiles.size||bytes!==storedBytes)fail('physical packet inventory differs');
    // Empty/unlisted directory trees are not part of this fixed writer format.
    const required=new Set(['']);for(const path of expectedFiles.keys()){const parts=path.split('/');parts.pop();while(parts.length){required.add(parts.join('/'));parts.pop();}}
    if(required.size!==directories.size||[...directories].some(path=>!required.has(path)))fail('unlisted physical directory');return observed;
  }
  const identities=inventory();
  function controls(){
    if(!same(rootIdentity,lstatSync(root))||physicalRoot(root)!==root||!same(indexFile.identity,file('index.json').identity)||!same(manifestFile.identity,file('packet-storage.json').identity))fail('storage root/index identity changed');
  }
  function verify(){
    controls();const current=inventory();for(const [path,identity]of identities)if(!same(identity,current.get(path)))fail('complete physical inventory identity changed');
    const currentIndex=read('index.json',L.packetBytes,indexFile.identity).raw,currentManifest=read('packet-storage.json',L.packetBytes,manifestFile.identity).raw;
    if(!currentIndex.equals(indexFile.raw)||!currentManifest.equals(manifestFile.raw))fail('complete storage/index bytes changed');controls();return true;
  }
  return {index,storage:manifest,verify,
    read(descriptor){
      const row=logical(descriptor),association=packets.get(row.path);if(!association||Object.keys(row).some(key=>row[key]!==association.logical[key]))fail('unregistered logical packet descriptor');controls();
      const storedRow=association.stored,packed=read(storedRow.file,L.storedBytes,identities.get(storedRow.file)).raw;
      if(packed.length!==storedRow.bytes||hash(packed)!==storedRow.sha256)fail('complete stored packet digest differs');
      let decoded;try{decoded=gunzipSync(packed,{maxOutputLength:Math.max(1,row.bytes)});}catch{fail('invalid gzip or decoded packet bound');}
      if(decoded.length!==row.bytes||hash(decoded)!==row.sha256)fail('complete decoded packet size/digest differs');text(decoded);controls();return decoded;
    },
  };
}
