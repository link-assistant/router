// NEW process contract: trusted stock launch/stdio bootstrap, exclusive owned
// snapshot lifetime, and detached JSON outputs. This is not a native-spawn or
// arbitrary-hostile-process proof, nor a replacement for old callback APIs.
import fs from 'node:fs';
import childProcess from 'node:child_process';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {Buffer as ByteBuffer} from 'node:buffer';
import process from 'node:process';
import {StringDecoder} from 'node:string_decoder';
import {EventEmitter} from 'node:events';
import {Readable,Writable,Stream} from 'node:stream';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {setInterval as interval,clearInterval as clear} from 'node:timers';
import {originalPrivateParserExpectedCommonIntrinsicsUnchanged,throwOriginalCapturedTypeError,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {independentParserSha256} from './private-parser-sha256.mjs';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';

const SOURCE_HEAD = "750e78b728c75d7b89b86555df516796556a6135";
const REGISTRY_RAW_SHA256 = "d2de2bc127cfa928232767140f4fbb66ac3d1888ee7ca6a4fa31cc041dd5c2ba";
const DRIVER_SHA256 = "54d7fccc15d22d1a2ba66386397bc705bddf8000e6ab34722d6d8ee48d2791b6";
const LIMIT={input:33554432,wire:536870912,output:536870912,frame:8388608,artifacts:16384,
  chunk:65536,stderr:8388608,rss:3221225472,disk:1610612736,milliseconds:2400000};
const initial=originalPrivateParserExpectedCommonIntrinsicsUnchanged();
const get=initial?Object.getOwnPropertyDescriptor:null,keys=initial?Reflect.ownKeys:null,apply=initial?Reflect.apply:null,proto=initial?Object.getPrototypeOf:null,own=initial?Object.hasOwn:null,isProxy=initial?types.isProxy:null;
const spawn=initial?childProcess.spawn:null,execFile=initial?childProcess.execFileSync:null,kill=initial?process.kill.bind(process):null;
const fsBirth=initial?Object.fromEntries(['openSync','closeSync','fstatSync','lstatSync','writeSync','readFileSync','mkdirSync','mkdtempSync','chmodSync','unlinkSync','rmdirSync','realpathSync','readdirSync'].map(key=>[key,fs[key]])):null;
const parse=initial?JSON.parse:null,stringify=initial?JSON.stringify:null;
const pointField=initial?get(String,'fromCodePoint'):null,point=pointField&&own(pointField,'value')?pointField.value:null;
const pointQualified=!!point&&originalCapturedFunctionSource(point)==='function fromCodePoint() { [native code] }';
const hostRoot=initial?globalThis:null,numberGlobal=initial?get(hostRoot,'Number'):null,mathGlobal=initial?get(hostRoot,'Math'):null;
const number=numberGlobal&&own(numberGlobal,'value')?numberGlobal.value:null,math=mathGlobal&&own(mathGlobal,'value')?mathGlobal.value:null;
const integerField=number?get(number,'isInteger'):null,safeIntegerField=number?get(number,'isSafeInteger'):null,minField=math?get(math,'min'):null,maxField=math?get(math,'max'):null;
const isInteger=integerField&&own(integerField,'value')?integerField.value:null,isSafeInteger=safeIntegerField&&own(safeIntegerField,'value')?safeIntegerField.value:null,min=minField&&own(minField,'value')?minField.value:null,max=maxField&&own(maxField,'value')?maxField.value:null;
const numericNative=initial&&number&&math&&!isProxy(number)&&!isProxy(math)&&originalCapturedFunctionSource(number)==='function Number() { [native code] }'&&typeof isInteger==='function'&&typeof isSafeInteger==='function'&&typeof min==='function'&&typeof max==='function'&&!isProxy(isInteger)&&!isProxy(isSafeInteger)&&!isProxy(min)&&!isProxy(max)&&originalCapturedFunctionSource(isInteger)==='function isInteger() { [native code] }'&&originalCapturedFunctionSource(isSafeInteger)==='function isSafeInteger() { [native code] }'&&originalCapturedFunctionSource(min)==='function min() { [native code] }'&&originalCapturedFunctionSource(max)==='function max() { [native code] }';
const scalarPins=numericNative?[[hostRoot,'Number',numberGlobal],[hostRoot,'Math',mathGlobal],[number,'isInteger',integerField],[number,'isSafeInteger',safeIntegerField],[math,'min',minField],[math,'max',maxField]]:[];
const scalarParents=numericNative?[[number,proto(number)],[math,proto(math)],[isInteger,proto(isInteger)],[isSafeInteger,proto(isSafeInteger)],[min,proto(min)],[max,proto(max)]]:[];
const now=initial?Date.now:null,readFlags=initial?fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW:0;
const uint8Field=initial?get(hostRoot,'Uint8Array'):null,uint8=uint8Field&&own(uint8Field,'value')?uint8Field.value:null;
const uint8Names=uint8&&!isProxy(uint8)?keys(uint8):null;
const uint8PrototypeField=uint8Names&&!uint8Names.includes('stack')?get(uint8,'prototype'):null,uint8Prototype=uint8PrototypeField&&own(uint8PrototypeField,'value')?uint8PrototypeField.value:null;
const sharedTypedConstructor=uint8?proto(uint8):null,sharedTypedPrototype=uint8Prototype?proto(uint8Prototype):null;
const typedOwners=initial&&uint8&&uint8Prototype&&sharedTypedConstructor&&sharedTypedPrototype?[uint8,uint8Prototype,sharedTypedConstructor,sharedTypedPrototype]:[];
const typedNames=[];let typedShape=typedOwners.length===4;for(let at=0;at<typedOwners.length;at++){const names=keys(typedOwners[at]);if(names.includes('stack'))typedShape=false;typedNames.push(names);}
const typedLengthField=typedShape?get(sharedTypedPrototype,'length'):null,typedLength=typedLengthField&&!own(typedLengthField,'value')&&own(typedLengthField,'get')&&own(typedLengthField,'set')?typedLengthField.get:null;
const typedFunctionParent=initial?proto(function(){}):null;
const sharedPrototypeLink=typedShape?get(sharedTypedConstructor,'prototype'):null,uint8Back=typedShape?get(uint8Prototype,'constructor'):null,sharedBack=typedShape?get(sharedTypedPrototype,'constructor'):null;
let typedNative=!!(typedShape&&typeof uint8==='function'&&typeof sharedTypedConstructor==='function'&&!isProxy(uint8)&&!isProxy(sharedTypedConstructor)&&originalCapturedFunctionSource(uint8)==='function Uint8Array() { [native code] }'&&originalCapturedFunctionSource(sharedTypedConstructor)==='function TypedArray() { [native code] }'&&proto(sharedTypedConstructor)===typedFunctionParent&&proto(sharedTypedPrototype)===Object.prototype&&sharedPrototypeLink&&own(sharedPrototypeLink,'value')&&sharedPrototypeLink.value===sharedTypedPrototype&&uint8Back&&own(uint8Back,'value')&&uint8Back.value===uint8&&sharedBack&&own(sharedBack,'value')&&sharedBack.value===sharedTypedConstructor&&typeof typedLength==='function'&&!isProxy(typedLength)&&typedLengthField.set===undefined&&typedLengthField.enumerable===false&&typedLengthField.configurable===true&&proto(typedLength)===typedFunctionParent&&originalCapturedFunctionSource(typedLength)==='function get length() { [native code] }');
if(typedNative){const probe=new uint8(1);typedNative=proto(probe)===uint8Prototype&&apply(typedLength,probe,[])===1&&probe[0]===0;}

const bufferPrototype=initial?ByteBuffer.prototype:null,from=initial?ByteBuffer.from:null,byteLength=initial?ByteBuffer.byteLength:null,alloc=initial?ByteBuffer.alloc:null;
const functionSourceRoot=initial?resolve(dirname(fileURLToPath(import.meta.url)),'../..'):null;
const executable=initial?process.execPath:null,platform=initial?process.platform:null,parentPid=initial?process.pid:null;
const bunAtBirth=initial&&typeof process.versions.bun==='string';
const engineAtBirth=initial?{name:bunAtBirth?'bun':'node',version:process.version,platform}:null;
const hashPrototype=initial?proto(createHash('sha256')):null;
const libraryPins=[];
if(initial){
  const owners=[...typedOwners,childProcess,childProcess.ChildProcess,childProcess.ChildProcess.prototype,EventEmitter,EventEmitter.prototype,Stream,Stream.prototype,Readable,Readable.prototype,Writable,Writable.prototype,StringDecoder,StringDecoder.prototype,ByteBuffer,ByteBuffer.prototype];
  const census=[];for(let at=0;at<owners.length;at++){const names=keys(owners[at]);if(names.includes('stack'))throwOriginalCapturedTypeError('Original project batch: unexpected bootstrap stack');census.push(names);}
  for(let at=0;at<owners.length;at++){const owner=owners[at],names=census[at];libraryPins.push({owner,parent:proto(owner),names,fields:names.map(key=>get(owner,key))});}
}
function fail(message){throwOriginalCapturedTypeError('Original project batch: '+message);}
function same(a,b){return !!a===!!b&&(!a||own(a,'value')===own(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(own(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set));}
function guard(){
  if(!initial||!originalPrivateParserExpectedCommonIntrinsicsUnchanged())fail('host operations changed');
  if(!pointQualified||!same(get(String,'fromCodePoint'),pointField))fail('stock point operation changed');
  if(!numericNative)fail('stock numeric operations unavailable');for(let at=0;at<scalarPins.length;at++){const row=scalarPins[at];if(!same(get(row[0],row[1]),row[2]))fail('stock numeric operation changed');}for(let at=0;at<scalarParents.length;at++)if(proto(scalarParents[at][0])!==scalarParents[at][1])fail('stock numeric ancestry changed');
  if(!typedNative||!same(get(hostRoot,'Uint8Array'),uint8Field))fail('stock Uint8Array owner changed');
  for(let at=0;at<libraryPins.length;at++){const row=libraryPins[at],actual=keys(row.owner);if(proto(row.owner)!==row.parent||actual.length!==row.names.length)fail('stock process library shape changed');for(let k=0;k<actual.length;k++)if(actual[k]!==row.names[k])fail('stock process library keys changed');}
  for(let at=0;at<libraryPins.length;at++){const row=libraryPins[at];for(let k=0;k<row.names.length;k++)if(!same(get(row.owner,row.names[k]),row.fields[k]))fail('stock process library identity changed');}
}
function safePath(path){return typeof path==='string'&&path.length>0&&path.length<=4096&&!path.includes('\\')&&!path.includes(':')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');}
function stat(value){
  if(!value||typeof value!=='object'||isProxy(value))fail('own stat record required');const result={__proto__:null},names=['dev','ino','mode','size','mtimeMs','ctimeMs'];
  for(let at=0;at<names.length;at++){const key=names[at],field=get(value,key);if(!field||!own(field,'value')||typeof field.value!=='number'||field.value!==field.value)fail('own primitive stat field required');result[key]=field.value;}
  const blocks=get(value,'blocks');if(blocks){if(!own(blocks,'value')||!isSafeInteger(blocks.value)||blocks.value<0)fail('own allocated-block count required');result.blocks=blocks.value;}
  if(!isSafeInteger(result.dev)||!isSafeInteger(result.ino)||!isSafeInteger(result.mode)||!isSafeInteger(result.size)||result.size<0)fail('bounded stat numbers required');return result;
}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}
function reader(){guard();const field=get(fs,'readSync');if(!field||!own(field,'value')||typeof field.value!=='function'||isProxy(field.value))fail('own read function required');return field.value;}
function readAt(fd,bytes,offset,length,position){const fn=reader(),count=apply(fn,undefined,[fd,bytes,offset,length,position]);guard();if(!isInteger(count)||count<0||count>length)fail('read count');return count;}
function nativeHash(bytes){
  guard();const value=createHash('sha256');if(!value||isProxy(value)||proto(value)!==hashPrototype)fail('stock hash receiver changed');
  const u=get(hashPrototype,'update'),d=get(hashPrototype,'digest');if(!u||!d||!own(u,'value')||!own(d,'value')||typeof u.value!=='function'||typeof d.value!=='function'||isProxy(u.value)||isProxy(d.value))fail('own hash methods required');
  apply(u.value,value,[bytes]);guard();const result=apply(d.value,value,['hex']);guard();if(typeof result!=='string')fail('hash primitive required');return result;
}
function bufferShape(bytes){if(proto(bytes)!==bufferPrototype)fail('raw byte prototype changed');const size=apply(typedLength,bytes,[]),names=keys(bytes);if(names.length!==size)fail('raw byte own fields changed');for(let at=0;at<names.length;at++)if(names[at]!==''+at)fail('raw byte own names changed');}
function exactUtf8(text,bytes){
  if(typeof text!=='string'||proto(bytes)!==bufferPrototype)fail('decoded byte shape');const size=apply(typedLength,bytes,[]);let at=0;
  function byte(value){if(at>=size||bytes[at++]!==value)fail('decoded raw bytes differ');}
  for(let i=0;i<text.length;i++){let code=text.charCodeAt(i);if(code>=55296&&code<=56319){const low=text.charCodeAt(++i);if(!(low>=56320&&low<=57343))fail('unpaired UTF16');code=65536+(code-55296)*1024+low-56320;}else if(code>=56320&&code<=57343)fail('unpaired UTF16');
    if(code<128)byte(code);else if(code<2048){byte(192|(code>>>6));byte(128|(code&63));}else if(code<65536){byte(224|(code>>>12));byte(128|((code>>>6)&63));byte(128|(code&63));}else{byte(240|(code>>>18));byte(128|((code>>>12)&63));byte(128|((code>>>6)&63));byte(128|(code&63));}}
  if(at!==size)fail('decoded byte length differs');return text;
}
function decodeBytes(bytes){
  guard();if(proto(bytes)!==bufferPrototype)fail('raw byte prototype');const size=apply(typedLength,bytes,[]),pieces=[];let text='';
  for(let at=0;at<size;){const first=bytes[at++];let code,count,min;if(first<128){code=first;count=0;min=0;}else if(first>=194&&first<=223){code=first&31;count=1;min=128;}else if(first>=224&&first<=239){code=first&15;count=2;min=2048;}else if(first>=240&&first<=244){code=first&7;count=3;min=65536;}else fail('invalid UTF8 leading byte');
    if(at+count>size)fail('short UTF8 sequence');for(let i=0;i<count;i++){const next=bytes[at++];if((next&192)!==128)fail('invalid UTF8 continuation');code=(code<<6)|(next&63);}if(code<min||code>1114111||code>=55296&&code<=57343)fail('invalid UTF8 scalar');const value=point(code);if(text.length+value.length>4096){pieces.push(text);text='';}text+=value;
  }if(text)pieces.push(text);return pieces.join('');
}
function readFile(path,bound){
  guard();const before=stat(fsBirth.lstatSync(path));if((before.mode&0xf000)!==0x8000||!isSafeInteger(before.size)||before.size<0||before.size>bound)fail('regular bounded source required');
  const fd=fsBirth.openSync(path,readFlags);let bytes;
  try{if(!sameFile(before,stat(fsBirth.fstatSync(fd))))fail('file changed before read');bytes=alloc(before.size);let at=0;while(at<before.size){const count=readAt(fd,bytes,at,min(65536,before.size-at),at);if(!count)fail('short read');at+=count;}if(readAt(fd,alloc(1),0,1,at)!==0||!sameFile(before,stat(fsBirth.fstatSync(fd))))fail('file changed during read');}
  finally{fsBirth.closeSync(fd);}guard();if(!sameFile(before,stat(fsBirth.lstatSync(path)))||apply(typedLength,bytes,[])!==before.size||proto(bytes)!==bufferPrototype)fail('file/byte association changed');return {path,before,bytes};
}
function driver(root,task){
  const file=readFile(join(root,'tools/translation/isolated-project-driver.mjs'),262144),digest=nativeHash(file.bytes);guard();bufferShape(file.bytes);if(apply(typedLength,file.bytes,[])!==file.before.size)fail('driver byte length changed');const text=decodeBytes(file.bytes);exactUtf8(text,file.bytes);
  if(digest!==DRIVER_SHA256||independentParserSha256(text)!==DRIVER_SHA256)fail('complete driver source changed');
  const rootLine='const ORIGINAL_ROOT = '+stringify(root)+';',taskLine='const TASK_ROOT = '+stringify(task)+';';
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'original-child:authenticate-complete-driver',apply:value=>{if(independentParserSha256(value)!==DRIVER_SHA256)fail('driver language source changed');return value;}}]},
    {phase:'repository',rules:[exactSubstitutionRule('original-child:bind-original-root','const ORIGINAL_ROOT = null;',rootLine,'Fixed original-root binding changed'),exactSubstitutionRule('original-child:bind-owned-task','const TASK_ROOT = null;',taskLine,'Fixed task-root binding changed')]}]);
  const result=pipeline.run(text);guard();if(!sameFile(file.before,stat(fsBirth.lstatSync(file.path))))fail('driver source path changed');
  const reversed=result.value.replace(taskLine,'const TASK_ROOT = null;').replace(rootLine,'const ORIGINAL_ROOT = null;');if(reversed!==text)fail('driver binding whole undo');return {text:result.value,source:text,path:file.path,state:file.before,trace:result.trace};
}
function exactRecord(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||proto(value)!==Object.prototype)fail('protocol record required');const actual=keys(value);if(actual.length!==names.length)fail('protocol fields');for(let at=0;at<actual.length;at++)if(typeof actual[at]!=='string'||!names.includes(actual[at]))fail('protocol fields');}
function validateRequest(text){
  let depth=0,cells=0;for(let at=0;at<text.length;at++){const unit=text[at];if(unit==='"'){for(at++;at<text.length;at++){if(text[at]==='\\')at++;else if(text[at]==='"')break;}}else if(unit==='['||unit==='{'){if(++depth>4)fail('request nesting bound');}else if(unit===']'||unit==='}'){if(--depth<0)fail('request delimiter');}else if((unit===','||unit===':')&&++cells>8240)fail('request cell bound');}if(depth!==0)fail('request delimiter');
  const value=parse(text);exactRecord(value,['schema','sourceFiles','entries']);if(value.schema!=='original-project-child-request-v1'||!Array.isArray(value.sourceFiles)||!value.sourceFiles.length||value.sourceFiles.length>1024||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>8)fail('request schema/count');
  const paths=new Set();let total=0;for(let at=0;at<value.sourceFiles.length;at++){const row=value.sourceFiles[at];exactRecord(row,['path','source']);if(!safePath(row.path)||!(row.path.endsWith('.rs')||/(^|\/)Cargo\.(?:toml|lock)$/u.test(row.path))||typeof row.source!=='string'||paths.has(row.path))fail('request source row');const bytes=from(row.source,'utf8');exactUtf8(row.source,bytes);const count=apply(typedLength,bytes,[]);if(count>2097152||(total+=count)>16777216)fail('request source byte bound');paths.add(row.path);}
  const entries=new Set();for(let at=0;at<value.entries.length;at++){const path=value.entries[at];if(typeof path!=='string'||!path.endsWith('.rs')||!paths.has(path)||entries.has(path))fail('request entry association');entries.add(path);}if(stringify(value)!==text)fail('canonical JSON request required');return value;
}
function errorText(error){if(!error||typeof error!=='object'||isProxy(error))return 'unclassified infrastructure failure';const field=get(error,'message');return field&&own(field,'value')&&typeof field.value==='string'?field.value.slice(0,4096):'unclassified infrastructure failure';}
function vanishedDescendant(error,root,path){
  if(path===root||!path.startsWith(root+'/')||!error||typeof error!=='object'||isProxy(error))return false;
  const code=get(error,'code');return !!(code&&own(code,'value')&&code.value==='ENOENT');
}
function diskBytes(root){
  let total=0,entries=0;const pending=[root];
  while(pending.length){
    const path=pending.pop();if(++entries>40000)fail('owned disk entry bound');let state;
    try{state=stat(fsBirth.lstatSync(path));}catch(error){if(vanishedDescendant(error,root,path))continue;throw error;}
    if((state.mode&0xf000)===0xa000)fail('owned task contains link');total+=max(state.size,own(state,'blocks')?state.blocks*512:state.size);if(!isSafeInteger(total)||total>LIMIT.disk)fail('owned disk bound');
    if((state.mode&0xf000)===0x4000){let names;try{names=fsBirth.readdirSync(path);}catch(error){if(vanishedDescendant(error,root,path))continue;throw error;}for(let at=0;at<names.length;at++)pending.push(join(path,names[at]));}
    else if((state.mode&0xf000)!==0x8000)fail('owned disk type');
  }return total;
}
function removeTask(root){
  const pending=[{path:root,directory:false}];
  for(let at=0;at<pending.length;at++){
    const row=pending[at],state=stat(fsBirth.lstatSync(row.path)),kind=state.mode&0xf000;
    if(kind===0x4000){row.directory=true;fsBirth.chmodSync(row.path,0o700);const names=fsBirth.readdirSync(row.path);for(let i=0;i<names.length;i++)pending[pending.length]={path:join(row.path,names[i]),directory:false};}
    else if(kind!==0x8000&&kind!==0xa000)fail('owned cleanup node type');
  }
  for(let at=pending.length-1;at>=0;at--){const row=pending[at];if(row.directory)fsBirth.rmdirSync(row.path);else fsBirth.unlinkSync(row.path);}
}

function processRss(childPid){
  const text=apply(execFile,childProcess,['/bin/ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8',timeout:2000,maxBuffer:4194304,env:{PATH:'/usr/bin:/bin',LC_ALL:'C'}}]),rows=text.trim().split('\n').map(line=>line.trim().split(/\s+/u).map(number)),pids=new Set(childPid>0?[childPid]:[]),base=rows.find(row=>row[0]===parentPid);let changed=true;
  while(changed){changed=false;for(let at=0;at<rows.length;at++){const row=rows[at];if(pids.has(row[1])&&!pids.has(row[0])){pids.add(row[0]);changed=true;}}}
  let total=base?base[2]*1024:0;for(let at=0;at<rows.length;at++)if(rows[at][0]!==parentPid&&pids.has(rows[at][0]))total+=rows[at][2]*1024;if(!isSafeInteger(total)||!base)fail('process monitor census');return total;
}

/** Return detached artifact text only; every invocation owns one fresh child. */
export async function translateOriginalProjectBatch(serializedRequest){
  guard();if(platform!=='darwin'&&platform!=='linux')fail('qualified POSIX platform required');if(typeof serializedRequest!=='string'||serializedRequest.length>LIMIT.input)fail('bounded primitive JSON request required');const request=from(serializedRequest,'utf8');exactUtf8(serializedRequest,request);if(byteLength(serializedRequest,'utf8')>LIMIT.input)fail('request wire bound');const sourceInput=validateRequest(serializedRequest);guard();
  const root=fsBirth.realpathSync(functionSourceRoot),task=fsBirth.mkdtempSync(join(tmpdir(),'router-original-project-'));
  let child=null,timer=null,closed=false,failure=null,primaryFailure=null,header=null,trailer=null,pending='',wire=0,stderr='',peakRss=0,peakDisk=0,ticks=0,activeArtifact=null;const artifacts=[];
  const started=now(),decoder=new StringDecoder('utf8');
  function stop(message){if(!failure)failure=message;if(child?.pid&&!closed){try{kill(-child.pid,'SIGTERM');}catch{}try{kill(-child.pid,'SIGKILL');}catch{}}}
  function accept(value){
    guard();if(!value||typeof value!=='object'||Array.isArray(value)||proto(value)!==Object.prototype)fail('protocol record required');const kindField=get(value,'kind');if(!kindField||!own(kindField,'value')||typeof kindField.value!=='string')fail('protocol kind required');
    if(value.kind==='error'){exactRecord(value,['kind','message','sourceHead','requestSha256']);fail(typeof value.message==='string'?value.message:'child failure');}
    if(!header){exactRecord(value,['kind','schema','engine','sourceHead','registrySha256','requestSha256','artifacts','artifactBytes']);if(value.kind!=='header'||value.schema!=='original-project-child-output-v1'||value.sourceHead!==SOURCE_HEAD||value.registrySha256!==REGISTRY_RAW_SHA256||!isInteger(value.artifacts)||value.artifacts<0||value.artifacts>LIMIT.artifacts||!isInteger(value.artifactBytes)||value.artifactBytes<0||value.artifactBytes>LIMIT.output)fail('protocol header');exactRecord(value.engine,['name','version','platform']);if(value.engine.name!==engineAtBirth.name||value.engine.version!==engineAtBirth.version||value.engine.platform!==engineAtBirth.platform)fail('actual engine association');header=value;return;}
    if(trailer)fail('protocol data after completion');
    if(value.kind==='artifact'){
      exactRecord(value,['kind','index','path','bytes','sha256','chunks']);if(activeArtifact||value.index!==artifacts.length||!safePath(value.path)||artifacts.some(row=>row.path===value.path)||!isInteger(value.bytes)||value.bytes<0||value.bytes>LIMIT.output||!isInteger(value.chunks)||value.chunks<1||value.chunks>131072||typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(value.sha256))fail('artifact descriptor');
      const file=join(task,'spool',String(value.index)),fd=fsBirth.openSync(file,'wx',0o600);activeArtifact={...value,file,fd,parts:[],written:0};return;
    }
    if(value.kind==='chunk'){
      exactRecord(value,['kind','index','chunk','text','sha256']);const row=activeArtifact;if(!row||value.index!==row.index||value.chunk!==row.parts.length||typeof value.text!=='string'||value.text.length>LIMIT.chunk||independentParserSha256(value.text)!==value.sha256)fail('artifact chunk association');
      const bytes=from(value.text,'utf8');exactUtf8(value.text,bytes);const count=apply(typedLength,bytes,[]);if((row.written+=count)>row.bytes)fail('artifact byte bound');let at=0;while(at<count){const wrote=fsBirth.writeSync(row.fd,bytes,at,count-at);if(!isInteger(wrote)||wrote<1||wrote>count-at)fail('spool write count');at+=wrote;}
      row.parts.push({bytes:count,units:value.text.length,sha256:value.sha256});if(row.parts.length===row.chunks){fsBirth.closeSync(row.fd);row.fd=null;if(row.written!==row.bytes)fail('artifact final byte count');artifacts.push(row);activeArtifact=null;}return;
    }
    exactRecord(value,['kind','sourceHead','registrySha256','requestSha256','artifacts','artifactBytes','sourceFiles','snapshotFiles','issuerContextEscaped','semanticAuthority']);
    if(value.kind!=='complete'||activeArtifact||value.sourceHead!==header.sourceHead||value.registrySha256!==header.registrySha256||value.requestSha256!==header.requestSha256||value.artifacts!==header.artifacts||value.artifacts!==artifacts.length||value.artifactBytes!==header.artifactBytes||value.artifactBytes!==artifacts.reduce((n,row)=>n+row.bytes,0)||value.issuerContextEscaped!==false||value.semanticAuthority!==false)fail('protocol completion association');trailer=value;
  }
  try{
    fsBirth.mkdirSync(join(task,'spool'),{mode:0o700});
    const bound=driver(root,task),requestSha256=nativeHash(serializedRequest);guard();if(!sameFile(bound.state,stat(fsBirth.lstatSync(bound.path))))fail('final driver identity changed');
    // No caller callbacks or source read/hash follows this pure association.
    if(bound.source.length>262144||independentParserSha256(bound.source)!==DRIVER_SHA256||get(process,'execPath')?.value!==executable)fail('final launch association');guard();exactUtf8(serializedRequest,request);
    const argv=(bunAtBirth?[]:['--max-old-space-size=2304']).concat(['--input-type=module','--eval',bound.text]);
    child=apply(spawn,childProcess,[executable,argv,{cwd:task,detached:true,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',LC_ALL:'C',TZ:'UTC',NODE_NO_WARNINGS:'1'},stdio:['pipe','pipe','pipe']}]);
    const completion=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>{closed=true;resolve({code,signal});});});
    child.stdout.on('data',bytes=>{if(failure)return;try{guard();wire+=bytes.length;if(wire>LIMIT.wire)fail('protocol wire bound');pending+=decoder.write(bytes);if(pending.length>LIMIT.frame*2)fail('protocol frame bound');let end;while((end=pending.indexOf('\n'))!==-1){const line=pending.slice(0,end);pending=pending.slice(end+1);if(byteLength(line,'utf8')>LIMIT.frame)fail('protocol frame bound');accept(parse(line));}}catch(error){stop(errorText(error));}});
    child.stderr.on('data',bytes=>{try{guard();if(stderr.length+bytes.length>LIMIT.stderr)fail('stderr bound');stderr+=bytes.toString('utf8');}catch(error){stop(errorText(error));}});
    child.stdin.on('error',error=>stop(errorText(error)));child.stdin.end(request);
    timer=interval(()=>{try{guard();if(now()-started>LIMIT.milliseconds)fail('wall bound');if(child.pid){peakRss=max(peakRss,processRss(child.pid));if(peakRss>LIMIT.rss)fail('aggregate RSS bound');}if(++ticks%4===0)peakDisk=max(peakDisk,diskBytes(task));}catch(error){stop(errorText(error));}},250);
    const status=await completion;closed=true;if(timer){clear(timer);timer=null;}if(failure)fail(failure);pending+=decoder.end();if(pending!==''||!header||!trailer||status.code!==0||status.signal)fail('incomplete/failed child: '+stderr.slice(0,4096));
    if(header.requestSha256!==requestSha256||!Array.isArray(trailer.sourceFiles)||trailer.sourceFiles.length!==sourceInput.sourceFiles.length||!isInteger(trailer.snapshotFiles)||trailer.snapshotFiles<1||trailer.snapshotFiles>2048)fail('request digest/census association');
    for(let at=0;at<sourceInput.sourceFiles.length;at++){const expected=sourceInput.sourceFiles[at],actual=trailer.sourceFiles[at];exactRecord(actual,['path','sha256','bytes']);if(actual.path!==expected.path||actual.bytes!==byteLength(expected.source,'utf8')||actual.sha256!==nativeHash(expected.source))fail('final source association');guard();}guard();const detached=[];
    for(let at=0;at<artifacts.length;at++){
      const row=artifacts[at],fd=fsBirth.openSync(row.file,readFlags),parts=[];let offset=0;
      try{for(let pi=0;pi<row.parts.length;pi++){const part=row.parts[pi],bytes=alloc(part.bytes);let pos=0;while(pos<part.bytes){const count=readAt(fd,bytes,pos,part.bytes-pos,offset+pos);if(!count)fail('short spool read');pos+=count;}const text=decodeBytes(bytes);guard();exactUtf8(text,bytes);if(text.length!==part.units||independentParserSha256(text)!==part.sha256)fail('spool chunk integrity changed');parts.push(text);offset+=part.bytes;}if(readAt(fd,alloc(1),0,1,offset)!==0)fail('spool grew');}finally{fsBirth.closeSync(fd);}
      const text=parts.join('');if(byteLength(text,'utf8')!==row.bytes||nativeHash(text)!==row.sha256)fail('artifact whole digest changed');guard();detached.push({path:row.path,text,bytes:row.bytes,sha256:row.sha256});peakRss=max(peakRss,processRss(0));if(peakRss>LIMIT.rss)fail('aggregate RSS bound after materialization');
    }
    guard();return {schema:'detached-original-project-batch-v1',sourceHead:SOURCE_HEAD,requestSha256,artifacts:detached,receipt:{...trailer,engine:header.engine,driverSha256:DRIVER_SHA256,trace:bound.trace,peakSampledAggregateRssBytes:peakRss,peakSampledTaskDiskBytes:peakDisk,diskMeasurement:'sum max(logical bytes, own POSIX blocks*512 when available), including directories; sampled',elapsedMilliseconds:now()-started,observerContract:'fresh trusted stock process; exclusive owned snapshot; no parent semantic token',semanticAuthority:false}};
  }catch(error){primaryFailure=errorText(error);fail(primaryFailure);}finally{
    if(timer)clear(timer);if(child&&!closed){stop('batch final cleanup');try{await new Promise(resolve=>child.once('close',resolve));}catch{}}
    if(activeArtifact?.fd!==null&&activeArtifact?.fd!==undefined)try{fsBirth.closeSync(activeArtifact.fd);}catch{}
    try{removeTask(task);}catch(error){const cleanupFailure=errorText(error);fail(primaryFailure===null?'owned cleanup failed: '+cleanupFailure:primaryFailure+'; owned cleanup failed: '+cleanupFailure);}
  }
}
