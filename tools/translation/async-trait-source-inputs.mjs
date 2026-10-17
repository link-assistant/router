// Complete original inputs only. A source selection is not an attribute
// expansion certificate or permission to ignore a caller's nested effects.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {deriveDependencyOriginalInputs,deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
const root=new URL('./source-profiles/async-trait-output/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',root)),profile=JSON.parse(profileBytes);
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original async-trait source: '+message);};
function archiveMembers(archive){
 const tar=gunzipSync(archive,{maxOutputLength:2*1024*1024}),members=new Map();let nextName=null;
 const field=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
 for(let at=0;at+512<=tar.length;){
  const header=tar.subarray(at,at+512);if(header.every(value=>value===0)){if(tar.subarray(at).some(value=>value!==0))fail('archive has nonzero trailing bytes');break;}
  const octal=field(header,124,12).trim();if(!/^[0-7]+$/u.test(octal))fail('archive member size differs');
  const size=parseInt(octal,8),sum=header.reduce((total,value,index)=>total+(index>=148&&index<156?32:value),0);
  if(size>262144||at+512+size>tar.length||sum!==parseInt(field(header,148,8).trim(),8))fail('archive header differs');
  const kind=field(header,156,1),body=tar.subarray(at+512,at+512+size);let name=field(header,0,100),prefix=field(header,345,155);if(prefix)name=prefix+'/'+name;
  if(kind==='L'){if(nextName||size>4096)fail('unbounded archive long name');nextName=body.toString('utf8').split('\0')[0];}
  else {if(nextName){name=nextName;nextName=null;}if(name.startsWith('/')||name.split('/').some(part=>part==='..'||part===''))fail('archive path escapes');if(kind==='0'||kind===''){if(members.has(name))fail('duplicate archive member');members.set(name,body);}else if(kind!=='5')fail('unsupported archive member kind');}
  at+=512+Math.ceil(size/512)*512;
 }
 if(nextName)fail('unconsumed archive long name');return members;
}
export function createAsyncTraitSourceInputs({deriveDependencies,archive}={}){
 if(!isDeriveDependencyProof(deriveDependencies)||types.isProxy(deriveDependencies))fail('genuine original dependency inputs required');
 if(deriveDependencies.sourceProfileSha256!==profile.dependencySourceProfileSha256)fail('original syntax dependency source profile differs');
 const original=deriveDependencyOriginalInputs(deriveDependencies),sections=original.lock.split('[[package]]').filter(section=>/^\s*name = "async-trait"\nversion = "0\.1\.92"/mu.test(section));
 if(sections.length!==1||!sections[0].includes('checksum = "'+profile.sha256+'"')||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"')||!/^async-trait = "0\.1"$/mu.test(original.manifest))fail('original direct dependency and complete locked registry owner differ');
 if(!Buffer.isBuffer(archive)||types.isProxy(archive)||archive.length!==profile.bytes||hash(archive)!==profile.sha256)fail('complete original archive differs');
 const members=archiveMembers(archive),sources=new Map();if(members.size!==profile.members.length)fail('complete original archive inventory differs');
 for(const row of profile.members){const bytes=members.get(row.path);if(!bytes||bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete original member differs');const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);if(hash(source)!==row.sha256)fail('original Unicode decoding differs');const path=row.path.slice(('async-trait-'+profile.version+'/').length);sources.set('async-trait/'+path,freeze({package:'async-trait',version:profile.version,path,archiveSha256:profile.sha256,sha256:row.sha256,source}));}
 const vcs=JSON.parse(sources.get('async-trait/.cargo_vcs_info.json').source);if(vcs.git?.sha1!==profile.revision)fail('original revision differs');
 const upstream=sources.get('async-trait/Cargo.toml.orig').source;
 if(!upstream.includes('proc-macro = true')||!upstream.includes('default-features = false')||!upstream.includes('"clone-impls", "full", "parsing", "printing", "proc-macro", "visit-mut"'))fail('original parser and printer feature inputs differ');
 for(const pin of profile.dependencies){const locked=deriveDependencies.packages.find(row=>row.name===pin.name);if(locked?.version!==pin.version||locked.archiveSha256!==pin.sha256)fail('original syntax dependency owner differs');for(const row of locked.members)sources.set(pin.name+'/'+row.path,deriveDependencySource(deriveDependencies,pin.name,row.path));}
 const proof=freeze({schema:'original-async-trait-inputs-v1',profileSha256:hash(profileBytes),archiveSha256:profile.sha256,revision:profile.revision,manifestSha256:deriveDependencies.manifestSha256,lockSha256:deriveDependencies.lockSha256,dependencyDigest:deriveDependencies.digest,sourceMembers:[...sources.values()].map(({package:packageName,path,sha256})=>({package:packageName,path,sha256})),namespaceAuthority:false,headerTargetAuthority:false,wholeExpansionCompiled:false,runtimeParity:false});
 issued.set(proof,{sources,deriveDependencies,original});return proof;
}
export function loadAsyncTraitSourceInputs(deriveDependencies){return createAsyncTraitSourceInputs({deriveDependencies,archive:readFileSync(new URL(profile.archive,root))});}
export function requireAsyncTraitSourceInputs(proof){if(types.isProxy(proof)||!issued.has(proof))fail('copied or foreign source inputs');return proof;}
export function originalAsyncTraitSource(proof,packageName,path){requireAsyncTraitSourceInputs(proof);const origin=issued.get(proof).sources.get(packageName+'/'+path);if(!origin)fail('source is outside complete retained input inventory');return origin;}
export function originalAsyncTraitInputEvidence(proof){requireAsyncTraitSourceInputs(proof);const state=issued.get(proof);return freeze({profile,originalCargoInputs:state.original,sources:[...state.sources.values()]});}
