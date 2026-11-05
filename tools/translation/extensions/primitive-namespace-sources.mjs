// Complete original files for bounded namespace evidence. Loading them grants
// no layouts, trait implementations, build configuration or executable bodies.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../source-profiles/primitive-from-namespace/',import.meta.url);
const hash=data=>createHash('sha256').update(data).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='2632c873ceb60b03dd20253502b23d36d4da88395eafb0f9cdf814b05b631a9d')throw new TypeError('Original primitive namespace profile differs');
export const PRIMITIVE_NAMESPACE_SOURCE_PROFILE=freeze({...JSON.parse(bytes),manifestSha256:hash(bytes)});
let sources;
const original=(raw,pin)=>{
  const blob=createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex');
  if(raw.length!==pin.bytes||hash(raw)!==pin.sha256||blob!==pin.gitBlobSha)throw new TypeError('Original namespace source differs from its complete Git blob');
  return freeze({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});
};
export function originalPrimitiveNamespaceSources(){
  if(sources)return new Map(sources);
  const result=new Map(),profile=PRIMITIVE_NAMESPACE_SOURCE_PROFILE;
  for(const pin of profile.coreSources){
    const encoded=readFileSync(new URL(pin.archive,root));
    if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original core namespace archive differs');
    result.set(pin.path,original(gunzipSync(encoded,{maxOutputLength:4_000_000}),pin));
  }
  const pin=profile.stdarch,encoded=readFileSync(new URL(pin.archive,root));
  if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original stdarch namespace archive differs');
  for(const license of pin.licenses){const raw=readFileSync(new URL(license.path,root));original(raw,license);}
  const tar=gunzipSync(encoded,{maxOutputLength:100_000_000}),expected=new Map(pin.namespaceSourceFiles.map(file=>[file.path,file]));let visited=0;
  for(let at=0;at+512<=tar.length;){
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const text=(start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
    const name=text(0,100),prefix=text(345,155),full=(prefix?prefix+'/':'')+name,path=full.slice(full.indexOf('/')+1),size=parseInt(text(124,12)||'0',8);
    if(!Number.isSafeInteger(size)||size<0||size>8_000_000||at+512+size>tar.length)throw new TypeError('Original stdarch tar member escapes its bound');
    if(expected.has(path)){
      if(!['0',''].includes(text(156,1))||result.has(path))throw new TypeError('Original stdarch namespace source has a duplicate or nonregular member');
      result.set(path,original(tar.subarray(at+512,at+512+size),expected.get(path)));visited++;
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(visited!==135||visited!==expected.size)throw new TypeError('Original stdarch namespace census lacks complete source files');
  sources=result;return new Map(sources);
}

// Fresh source DATA lane. The original cached data API above stays intact.
export function originalFreshPrimitiveNamespaceSources(){
  const inventory=readFileSync(new URL('manifest.json',root));if(hash(inventory)!=='2632c873ceb60b03dd20253502b23d36d4da88395eafb0f9cdf814b05b631a9d')throw new TypeError('Complete current primitive namespace inventory differs');const profile=freeze({...JSON.parse(inventory),manifestSha256:hash(inventory)}),result=new Map();
  for(const pin of profile.coreSources){
    const encoded=readFileSync(new URL(pin.archive,root));
    if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original core namespace archive differs');
    result.set(pin.path,original(gunzipSync(encoded,{maxOutputLength:4_000_000}),pin));
  }
  const pin=profile.stdarch,encoded=readFileSync(new URL(pin.archive,root));
  if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original stdarch namespace archive differs');
  for(const license of pin.licenses){const raw=readFileSync(new URL(license.path,root));original(raw,license);}
  const tar=gunzipSync(encoded,{maxOutputLength:100_000_000}),expected=new Map(pin.namespaceSourceFiles.map(file=>[file.path,file]));let visited=0;
  for(let at=0;at+512<=tar.length;){
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const text=(start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
    const name=text(0,100),prefix=text(345,155),full=(prefix?prefix+'/':'')+name,path=full.slice(full.indexOf('/')+1),size=parseInt(text(124,12)||'0',8);
    if(!Number.isSafeInteger(size)||size<0||size>8_000_000||at+512+size>tar.length)throw new TypeError('Original stdarch tar member escapes its bound');
    if(expected.has(path)){
      if(!['0',''].includes(text(156,1))||result.has(path))throw new TypeError('Original stdarch namespace source has a duplicate or nonregular member');
      result.set(path,original(tar.subarray(at+512,at+512+size),expected.get(path)));visited++;
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(visited!==135||visited!==expected.size)throw new TypeError('Original stdarch namespace census lacks complete source files');
  if(!readFileSync(new URL('manifest.json',root)).equals(inventory))throw new TypeError('Complete original namespace inventory changed while loading');return new Map(result);
}

// Fresh additive source DATA over the same whole original archive.
export function originalFreshPrimitiveNamespaceSourcesWithDocumentation(){
  const assetProfileURL=new URL('../architecture-documentation-assets/complete-document-asset-inputs.json.gz',root),assetProfileBytes=readFileSync(assetProfileURL);if(assetProfileBytes.length>1048576||hash(assetProfileBytes)!=='8c560d64e9a1f18588be0837e46123c16a701be453bad6e58c8dfca1525a4994')throw new TypeError('Complete current original documentation asset profile differs');const documentation=JSON.parse(gunzipSync(assetProfileBytes,{maxOutputLength:1048576}).toString('utf8'));if(documentation.schema!=='original-architecture-documentation-assets-v1'||documentation.assets.length!==1||documentation.assets[0].path!=='crates/core_arch/src/core_arch_docs.md')throw new TypeError('Exact original documentation source asset domain required');
  const inventory=readFileSync(new URL('manifest.json',root));if(hash(inventory)!=='2632c873ceb60b03dd20253502b23d36d4da88395eafb0f9cdf814b05b631a9d')throw new TypeError('Complete current primitive namespace inventory differs');const profile=freeze({...JSON.parse(inventory),manifestSha256:hash(inventory)}),result=new Map();
  for(const pin of profile.coreSources){
    const encoded=readFileSync(new URL(pin.archive,root));
    if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original core namespace archive differs');
    result.set(pin.path,original(gunzipSync(encoded,{maxOutputLength:4_000_000}),pin));
  }
  if(documentation.primitiveManifestSha256!==hash(inventory)||documentation.stdarchArchiveSha256!==profile.stdarch.archiveSha256||profile.stdarch.namespaceSourceFiles.length!==135)throw new TypeError('Complete original namespace/documentation source profiles differ');
  const pin=profile.stdarch,encoded=readFileSync(new URL(pin.archive,root));
  if(encoded.length!==pin.archiveBytes||hash(encoded)!==pin.archiveSha256)throw new TypeError('Original stdarch namespace archive differs');
  for(const license of pin.licenses){const raw=readFileSync(new URL(license.path,root));original(raw,license);}
  const tar=gunzipSync(encoded,{maxOutputLength:100_000_000}),expected=new Map([...pin.namespaceSourceFiles,...documentation.assets].map(file=>[file.path,file]));if(expected.size!==136)throw new TypeError('Original Rust census and documentation asset must stay distinct');let visited=0;
  for(let at=0;at+512<=tar.length;){
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const text=(start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
    const name=text(0,100),prefix=text(345,155),full=(prefix?prefix+'/':'')+name,path=full.slice(full.indexOf('/')+1),size=parseInt(text(124,12)||'0',8);
    if(!Number.isSafeInteger(size)||size<0||size>8_000_000||at+512+size>tar.length)throw new TypeError('Original stdarch tar member escapes its bound');
    if(expected.has(path)){
      if(!['0',''].includes(text(156,1))||result.has(path))throw new TypeError('Original stdarch namespace source has a duplicate or nonregular member');
      const row=original(tar.subarray(at+512,at+512+size),expected.get(path));result.set(path,path==='crates/core_arch/src/core_arch_docs.md'?freeze({...row,assetRole:'documentation-source',actualRustNamespacePath:null,sourceFileContextQualified:false,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false}):row);visited++;
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(visited!==136||visited!==expected.size||!documentation.assets.every(row=>result.has(row.path)))throw new TypeError('Original Rust census or documentation asset is incomplete');
  if(!readFileSync(new URL('manifest.json',root)).equals(inventory)||!readFileSync(assetProfileURL).equals(assetProfileBytes)||hash(readFileSync(new URL(pin.archive,root)))!==pin.archiveSha256)throw new TypeError('Complete original namespace/documentation inputs changed while loading');for(const core of profile.coreSources)if(hash(readFileSync(new URL(core.archive,root)))!==core.archiveSha256)throw new TypeError('Complete original core namespace input changed while loading');for(const license of pin.licenses)original(readFileSync(new URL(license.path,root)),license);return new Map(result);
}
