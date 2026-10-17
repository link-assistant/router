// Exact Cargo-lock-qualified 1.0.219 originals, never a Deserialize/type issuer.
// In-memory TAR traversal follows derive-dependencies.mjs; complete originals,
// licenses and the before source are retained in this change's evidence.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {captureSourceModuleViews} from './source-module-views.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const sharedInitial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const descriptorSafeInitial=!!(sharedInitial&&!Object.getOwnPropertyDescriptor(Object.prototype,'get')&&!Object.getOwnPropertyDescriptor(Object.prototype,'set'));
const parsePin=descriptorSafeInitial?Object.getOwnPropertyDescriptor(JSON,'parse'):null;
const initial=!!(descriptorSafeInitial&&parsePin&&Object.hasOwn(parsePin,'value')&&typeof parsePin.value==='function'&&!types.isProxy(parsePin.value)&&originalCapturedFunctionSource(parsePin.value)==='function parse() { [native code] }');
const contexts=initial?new WeakMap():null;
const profileSha='bc3333bcd99d123ff2b8c5cb364ccc03d526091ce24fdc5b6eb0eb6bd195d232';
const lockSha='fd7b70edb83b6cdb7b04931b25e0366389044f36c76344ea1578e12872d8a931';
const root=new URL('./source-profiles/locked-serde-219/',import.meta.url);
const fail=message=>throwOriginalCapturedTypeError('Locked Serde source: '+message);
export function assertOriginalLockedSerdeOperations(){
 if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified source operations changed');
 if(Object.getOwnPropertyDescriptor(Object.prototype,'get')||Object.getOwnPropertyDescriptor(Object.prototype,'set'))fail('inherited descriptor accessors changed');
 const now=Object.getOwnPropertyDescriptor(JSON,'parse');if(!now||!Object.hasOwn(now,'value')||now.value!==parsePin.value||now.enumerable!==parsePin.enumerable||now.writable!==parsePin.writable||now.configurable!==parsePin.configurable)fail('qualified JSON parser changed');
}
const guard=assertOriginalLockedSerdeOperations;
function hash(value){const result=createHash('sha256').update(value).digest('hex');guard();return result;}
// Decode may execute a host hook. Only its primitive complete pinned result is
// used, and the live guards run before any subsequent parse or reflection.
function decoded(raw,bytes,sha){
 const value=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);guard();
 if(typeof value!=='string'||value.length>bytes)fail('bounded decoded primitive text required');let length=0;
 for(let at=0;at<value.length;at++){const code=value.charCodeAt(at);if(code<128)length++;else if(code<2048)length+=2;else if(code>=55296&&code<=56319){const low=value.charCodeAt(++at);if(!(low>=56320&&low<=57343))fail('unpaired decoded source surrogate');length+=4;}else if(code>=56320&&code<=57343)fail('unpaired decoded source surrogate');else length+=3;}
 if(length!==bytes||hash(value)!==sha)fail('complete decoded source differs from raw pin');guard();return value;
}
function read(name,bytes,sha){const raw=readFileSync(new URL(name,root));guard();if(raw.length!==bytes||hash(raw)!==sha)fail('complete registered input changed: '+name);return raw;}
function frozen(value){if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
function ascii(bytes,start,size){const part=bytes.subarray(start,start+size);guard();if(types.isProxy(part))fail('proxied TAR header');const text=part.toString('latin1');guard();if(typeof text!=='string'||text.length!==size)fail('TAR header decode differs');for(let index=0;index<size;index++)if(text.charCodeAt(index)!==bytes[start+index]||bytes[start+index]>127)fail('TAR header decode differs');const end=text.indexOf('\0');if(end<0)return text;for(let index=end;index<text.length;index++)if(text.charCodeAt(index)!==0&&text.charCodeAt(index)!==32)fail('noncanonical TAR header tail');return text.slice(0,end);}
function octal(bytes,start,size){const text=ascii(bytes,start,size).trim();if(!/^[0-7]+$/u.test(text))fail('invalid TAR integer');let value=0;for(let at=0;at<text.length;at++)value=value*8+text.charCodeAt(at)-48;return value;}
function members(packed,entry){
 const tar=gunzipSync(packed,{maxOutputLength:4194304});guard();if(tar.length!==entry.decodedTarBytes||tar.length%512!==0)fail('complete TAR length differs');
 const result=[];let at=0,ended=false;
 while(at<tar.length){const header=tar.subarray(at,at+512);guard();if(types.isProxy(header))fail('proxied TAR header');let zero=true;for(let index=0;index<512;index++)if(header[index]!==0)zero=false;
  if(zero){ended=true;for(let index=at;index<tar.length;index++)if(tar[index]!==0)fail('nonzero data after TAR end');break;}
  const size=octal(header,124,12),mode=octal(header,100,8),checksum=octal(header,148,8);let sum=0;for(let index=0;index<512;index++)sum+=index>=148&&index<156?32:header[index];
  if(sum!==checksum||size>2097152||at+512+size>tar.length)fail('TAR checksum or member bound');
  let path=ascii(header,0,100),prefix=ascii(header,345,155);if(prefix)path=prefix+'/'+path;
  if(!path.startsWith(entry.name+'-1.0.219/')||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..')||!['','0'].includes(ascii(header,156,1)))fail('unsupported original archive member');
  if(result.some(row=>row.path===path))fail('duplicate original archive member');
  const pin=entry.members.find(row=>row.path===path);if(!pin||pin.bytes!==size||pin.archiveMode!==mode||pin.kind!=='file')fail('full member census differs');
  const raw=tar.subarray(at+512,at+512+size);guard();if(types.isProxy(raw))fail('proxied original member');if(hash(raw)!==pin.sha256)fail('complete member hash differs');
  const source=decoded(raw,size,pin.sha256);result.push({...pin,package:entry.name,version:entry.version,memberPath:path.slice(entry.name.length+9),source});
  at+=512+(size+511-(size+511)%512);
 }
 if(!ended||result.length!==entry.members.length)fail('complete member census or archive terminator missing');return result;
}
function original(){
 guard();const profileRaw=read('manifest.json',14566,profileSha),text=decoded(profileRaw,profileRaw.length,profileSha);guard();const manifest=JSON.parse(text);guard();
 if(manifest.schema!=='complete-locked-serde-source-profile-v1'||manifest.packages.length!==2||manifest.lock.sha256!==lockSha||manifest.lock.bytes!==117119)fail('registered manifest identity differs');
 const lockPacked=read('Cargo.lock.gz',28639,'442f7d9f62cd431068fce554cd5c66a118211a140a9b437bfcd841a9405f05b5'),lockRaw=gunzipSync(lockPacked,{maxOutputLength:117119});guard();if(lockRaw.length!==117119||hash(lockRaw)!==lockSha)fail('complete original lock differs');const lock=decoded(lockRaw,117119,lockSha),sources=[],packages=[];
 for(const entry of manifest.packages){
  if(!['serde','serde_derive'].includes(entry.name)||entry.version!=='1.0.219'||entry.archive!==entry.name+'-1.0.219.crate')fail('unregistered package/version');
  const sections=lock.split('[[package]]').filter(section=>section.includes('\nname = "'+entry.name+'"\n')&&section.includes('\nversion = "1.0.219"\n'));
  if(sections.length!==1||!sections[0].includes('\nchecksum = "'+entry.archiveSha256+'"')||!sections[0].includes('\nsource = "registry+https://github.com/rust-lang/crates.io-index"'))fail('lock/package checksum identity differs');
  const packed=read(entry.archive,entry.archiveBytes,entry.archiveSha256),rows=members(packed,entry);sources.push(...rows);packages.push({...entry,members:rows.map(({source,...row})=>row)});
 }
 if(sources.length!==54||sources.reduce((sum,row)=>sum+row.bytes,0)!==853174)fail('full locked source inventory differs');
 guard();return frozen({schema:'original-locked-serde-source-context-v1',manifest,manifestSha256:profileSha,lock,lockSha256:lockSha,packages,sources,sourceAcquisitionComplete:true,semanticOwnerProved:false,deriveExpansionProved:false,visitorDispatchProved:false,constructorSemanticsProved:false,mapTraversalProved:false,runtimeAuthority:false,namespaceAuthority:false});
}
export function captureOriginalLockedSerdeSourceContext(){
 guard();if(arguments.length)fail('registered zero-argument issuer required');const facts=original();guard();const token=Object.freeze({schema:'private-locked-serde-source-context-v1'});contexts.set(token,{facts,modules:new Map()});return token;
}
export function requireOriginalLockedSerdeSourceContext(context){
 guard();const state=contexts.get(context);if(!state)fail('copied or foreign source context');const now=original();
 if(now.lock!==state.facts.lock||now.sources.length!==state.facts.sources.length)fail('original source context changed');for(let at=0;at<now.sources.length;at++){const a=now.sources[at],b=state.facts.sources[at];if(a.path!==b.path||a.source!==b.source||a.sha256!==b.sha256)fail('complete source context changed');}guard();return context;
}
export function originalLockedSerdeSourceFacts(context){requireOriginalLockedSerdeSourceContext(context);return contexts.get(context).facts;}
export function originalLockedSerdeSourceModule(context,packageName,memberPath){
 requireOriginalLockedSerdeSourceContext(context);if(typeof packageName!=='string'||typeof memberPath!=='string'||!memberPath.endsWith('.rs'))fail('original Rust source member required');const state=contexts.get(context),key=packageName+'/'+memberPath;let module=state.modules.get(key);
 if(!module){const rows=state.facts.sources.filter(row=>row.package===packageName&&row.memberPath===memberPath);if(rows.length!==1)fail('unregistered source member');const source=rows[0].source,file=rows[0].path,views=captureSourceModuleViews({source,sourcePath:file,compilationProfile:null});guard();module=frozen({source,file,path:[],compilationProfile:null,sourceView:views.views[0]});state.modules.set(key,module);}guard();return module;
}
