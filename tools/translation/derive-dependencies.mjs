import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const hash=value=>createHash('sha256').update(value).digest('hex');
const profileBytes=readFileSync(new URL('./source-profiles/derive/manifest.json',import.meta.url));
export const DERIVE_SOURCE_PROFILE=Object.freeze(JSON.parse(profileBytes));
const proofs=new WeakSet();
const proofSources=new WeakMap();
const proofInputs=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(DERIVE_SOURCE_PROFILE);

// Archive bytes remain memory inputs. Nothing is extracted or installed.
function members(archive) {
  const tar=gunzipSync(archive,{maxOutputLength:32*1024*1024}),result=new Map();let nextName=null;
  const text=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
  for(let at=0;at+512<=tar.length;) {
    const header=tar.subarray(at,at+512);if(header.every(value=>value===0))break;
    const octal=text(header,124,12).trim();if(!/^[0-7]+$/.test(octal))throw new TypeError('Unproved derive archive size');
    const size=parseInt(octal,8);if(!Number.isSafeInteger(size)||size>32*1024*1024||at+512+size>tar.length)throw new TypeError('Unbounded derive archive member');
    const checksum=parseInt(text(header,148,8).trim(),8),sum=header.reduce((total,value,index)=>total+(index>=148&&index<156?32:value),0);
    if(sum!==checksum)throw new TypeError('Invalid derive archive header');
    let name=text(header,0,100),prefix=text(header,345,155);if(prefix)name=prefix+'/'+name;
    const body=tar.subarray(at+512,at+512+size),kind=text(header,156,1);
    if(kind==='L'){if(size>4096)throw new TypeError('Unbounded derive archive path');nextName=body.toString('utf8').split('\0')[0];}
    else {
      if(nextName){name=nextName;nextName=null;}
      if(kind==='0'||kind==='') {if(result.has(name))throw new TypeError('Duplicate derive source member');result.set(name,body);}
      else if(!['5','x','g'].includes(kind))throw new TypeError('Unsupported derive archive member kind');
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(nextName)throw new TypeError('Unconsumed derive archive path');
  return result;
}

export function createDeriveDependencyProof({manifest,lock,archives,standardCore}={}) {
  if(typeof manifest!=='string'||typeof lock!=='string'||!(archives instanceof Map))throw new TypeError('Derive proof requires actual manifest, lock and archive bytes');
  const profile=DERIVE_SOURCE_PROFILE;
  if(hash(manifest)!==profile.manifestSha256||hash(lock)!==profile.lockSha256)throw new TypeError('Derive dependency manifest or lock does not match the audited source profile');
  const packages=[],sources=new Map();
  for(const entry of profile.packages) {
    const sections=lock.split('[[package]]').filter(section=>new RegExp('^\\s*name = "'+entry.name+'"\\nversion = "'+entry.version.replaceAll('.','\\.')+'"','m').test(section));
    if(sections.length!==1||!sections[0].includes('checksum = "'+entry.sha256+'"')||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"'))throw new TypeError('Derive archive lacks exact locked registry identity');
    const bytes=archives.get(entry.name+'@'+entry.version);
    if(!Buffer.isBuffer(bytes)||bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new TypeError('Derive archive checksum mismatch: '+entry.name);
    const files=members(bytes),checked=[];
    for(const [path,digest]of Object.entries(entry.members)) {
      const contents=files.get(entry.name+'-'+entry.version+'/'+path);
      if(!contents||hash(contents)!==digest)throw new TypeError('Derive source member checksum mismatch: '+entry.name+'/'+path);
      checked.push({path,sha256:digest});
      sources.set(entry.name+'/'+path,freeze({package:entry.name,version:entry.version,path,archiveSha256:entry.sha256,sha256:digest,source:contents.toString('utf8')}));
    }
    packages.push({name:entry.name,version:entry.version,archiveSha256:entry.sha256,members:checked});
  }
  if(!Buffer.isBuffer(standardCore))throw new TypeError('Derive error namespace requires actual pinned core source bytes');
  const core=gunzipSync(standardCore,{maxOutputLength:300000});
  if(core.length!==profile.standardCore.bytes||hash(core)!==profile.standardCore.sha256)throw new TypeError('Unproved standard compile_error owner source');
  const evidence={schema:'locked-derive-dependencies-v1',manifestSha256:hash(manifest),lockSha256:hash(lock),sourceProfileSha256:hash(profileBytes),edition:profile.rustEdition,rustVersion:profile.rustVersion,features:profile.dependencies,packages,standardCore:{url:profile.standardCore.url,sha256:hash(core)}};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.add(proof);proofSources.set(proof,sources);proofInputs.set(proof,Object.freeze({manifest,lock}));return proof;
}

export function isDeriveDependencyProof(proof){return !!proof&&proofs.has(proof);}
// Actual immutable source data only; copied carriers cannot select these bytes.
export function deriveDependencyOriginalInputs(proof){const inputs=proofInputs.get(proof);if(!inputs)throw new TypeError('Original derive inputs require their genuine private dependency proof');return inputs;}
export function deriveDependencySource(proof,packageName,path) {
  const sources=proofSources.get(proof);if(!sources)throw new TypeError('Unsealed derive dependency source proof');
  const source=sources.get(packageName+'/'+path);if(!source)throw new TypeError('Derive source was not an audited archive member');
  return source;
}
export function loadDeriveDependencyProof({manifest,lock}) {
  const root=new URL('./source-profiles/derive/',import.meta.url);
  return createDeriveDependencyProof({manifest,lock,archives:new Map(DERIVE_SOURCE_PROFILE.packages.map(entry=>[entry.name+'@'+entry.version,readFileSync(new URL(entry.archive,root))])),standardCore:readFileSync(new URL(DERIVE_SOURCE_PROFILE.standardCore.archive,root))});
}
export function deriveDependencyProfile({manifest,lock}) {
  // Unsupported Cargo inputs have no certificate authority. Other language
  // profiles can still run; corrupted consumed archive bytes remain fatal.
  const actualManifest=typeof manifest==='string'?hash(manifest):null,actualLock=typeof lock==='string'?hash(lock):null;
  if(actualManifest!==DERIVE_SOURCE_PROFILE.manifestSha256||actualLock!==DERIVE_SOURCE_PROFILE.lockSha256)return {proof:null,diagnostics:[{kind:'unsupported-profile',profile:'locked-derive-source-profile-v1',message:'Derive namespaces remain unresolved: manifest or lock is outside the audited dependency profile',manifestSha256:actualManifest,lockSha256:actualLock}]};
  return {proof:loadDeriveDependencyProof({manifest,lock}),diagnostics:[]};
}
export function deriveExternalModules(proof) {
  if(!isDeriveDependencyProof(proof))throw new TypeError('Unsealed derive dependency evidence');
  return new Map([['serde',['Serialize','Deserialize']],['schemars',['JsonSchema']],['clap',['ValueEnum','Args']]].map(([name,derives])=>[name,{complete:false,kind:'mod',bindings:derives.map(derive=>({name:derive,namespace:'macro',macroKind:'derive',kind:'proc-macro-derive',target:[name,derive],source:'locked-derive-source:'+proof.digest,deriveDependencyDigest:proof.digest}))}]));
}
