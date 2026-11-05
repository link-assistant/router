// Source provenance for the initial audited package. This registry is not
// macro-call resolution, platform selection or namespace-completeness proof.
import {cargoLayoutManifestMatches} from './cargo-layout-input-compatibility.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {freezeMacroTree,originalTopLevelMacroInvocations} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,declarativeDefinitionHeader} from './declarative-macros.mjs';
const directory=new URL('./source-profiles/declarative/',import.meta.url);
const manifestBytes=readFileSync(new URL('manifest.json',directory));
export const DECLARATIVE_SOURCE_PROFILE=freezeMacroTree(JSON.parse(manifestBytes));
const hash=value=>createHash('sha256').update(value).digest('hex'),proofs=new WeakMap(),definitionOrigins=new WeakMap();
function readMembers(archive) {
  const tar=gunzipSync(archive,{maxOutputLength:32*1024*1024}),members=new Map();let longName=null;
  const string=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
  for(let at=0;at+512<=tar.length;) {
    const header=tar.subarray(at,at+512);if(header.every(value=>value===0))break;
    const octal=string(header,124,12).trim();if(!/^[0-7]+$/u.test(octal))throw new TypeError('Declarative source archive size is unproved');
    const size=parseInt(octal,8);if(!Number.isSafeInteger(size)||size>32*1024*1024||at+512+size>tar.length)throw new TypeError('Declarative source archive bounds exceeded');
    const checksum=parseInt(string(header,148,8).trim(),8),sum=header.reduce((total,value,index)=>total+(index>=148&&index<156?32:value),0);
    if(sum!==checksum)throw new TypeError('Declarative source archive header checksum mismatch');
    let name=string(header,0,100),prefix=string(header,345,155);if(prefix)name=prefix+'/'+name;
    const body=tar.subarray(at+512,at+512+size),kind=string(header,156,1);
    if(kind==='L'){if(size>4096)throw new TypeError('Declarative archive name budget exceeded');longName=body.toString('utf8').split('\0')[0];}
    else {
      if(longName){name=longName;longName=null;}
      if(kind==='0'||kind===''){if(members.has(name))throw new TypeError('Duplicate declarative archive member');members.set(name,body);}
      else if(!['5','x','g'].includes(kind))throw new TypeError('Unproved declarative archive member kind');
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(longName)throw new TypeError('Unconsumed declarative archive name');return members;
}

export function createDeclarativeSourceProof({manifest,lock,tokioArchive,standardArchives,standardCfgIfArchive,rustLicense}={}) {
  const profile=DECLARATIVE_SOURCE_PROFILE;
  if(typeof manifest!=='string'||typeof lock!=='string'||(hash(manifest)!==profile.manifestSha256&&!cargoLayoutManifestMatches(manifest,profile.manifestSha256))||hash(lock)!==profile.lockSha256)throw new TypeError('Declarative source dependencies differ from the audited manifest/lock');
  const entry=profile.tokio,sections=lock.split('[[package]]').filter(section=>section.includes('name = "tokio"\nversion = "'+entry.version+'"'));
  if(sections.length!==1||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"')||!sections[0].includes('checksum = "'+entry.sha256+'"'))throw new TypeError('Declarative macro source lacks exact locked registry owner');
  if(!Buffer.isBuffer(tokioArchive)||tokioArchive.length!==entry.bytes||hash(tokioArchive)!==entry.sha256)throw new TypeError('Declarative Tokio archive checksum mismatch');
  if(!(standardArchives instanceof Map))throw new TypeError('Declarative standard macro source inputs are required');
  const files=readMembers(tokioArchive),sources=new Map();
  for(const member of entry.members) {
    const bytes=files.get(entry.name+'-'+entry.version+'/'+member.path);
    if(!bytes||bytes.length!==member.bytes||hash(bytes)!==member.sha256)throw new TypeError('Declarative locked member checksum mismatch');
    sources.set('tokio/'+member.path,bytes.toString('utf8'));
  }
  for(const member of profile.standard) {
    const archive=standardArchives.get(member.path);
    if(!Buffer.isBuffer(archive)||archive.length!==member.archiveBytes||hash(archive)!==member.archiveSha256)throw new TypeError('Declarative standard compressed source checksum mismatch');
    const bytes=gunzipSync(archive,{maxOutputLength:256000});
    if(bytes.length!==member.bytes||hash(bytes)!==member.sha256)throw new TypeError('Declarative standard original source checksum mismatch');
    sources.set('rust/'+member.path,bytes.toString('utf8'));
  }
  const cfg=profile.standardCfgIf,stdLock=sources.get('rust/library/Cargo.lock'),stdManifest=sources.get('rust/library/std/Cargo.toml');
  const cfgSections=stdLock.split('[[package]]').filter(section=>section.includes('name = "cfg-if"\nversion = "'+cfg.version+'"'));
  if(cfgSections.length!==1||!cfgSections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"')||!cfgSections[0].includes('checksum = "'+cfg.sha256+'"')||!stdManifest.includes("cfg-if = { version = \"1.0\", features = ['rustc-dep-of-std'] }"))throw new TypeError('Declarative standard cfg_if owner differs from actual standard manifest/lock');
  if(!Buffer.isBuffer(standardCfgIfArchive)||standardCfgIfArchive.length!==cfg.bytes||hash(standardCfgIfArchive)!==cfg.sha256)throw new TypeError('Declarative standard cfg_if archive checksum mismatch');
  const cfgMembers=readMembers(standardCfgIfArchive);
  for(const member of cfg.members) {
    const bytes=cfgMembers.get(cfg.name+'-'+cfg.version+'/'+member.path);
    if(!bytes||bytes.length!==member.bytes||hash(bytes)!==member.sha256)throw new TypeError('Declarative standard cfg_if source checksum mismatch');
    sources.set('cfg-if/'+member.path,bytes.toString('utf8'));
  }
  if(!Buffer.isBuffer(rustLicense)||rustLicense.length!==profile.rustLicense.bytes||hash(rustLicense)!==profile.rustLicense.sha256)throw new TypeError('Declarative Rust source license checksum mismatch');
  const evidence={schema:profile.schema,manifestSha256:hash(manifest),lockSha256:hash(lock),sourceProfileSha256:hash(manifestBytes),tokio:entry,standard:profile.standard,standardCfgIf:cfg,rust:profile.rust,ownerVerified:false,namespaceComplete:false,generatedBehavior:false,outstandingClosure:profile.outstandingClosure};
  const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,sources);return proof;
}
export function loadDeclarativeSourceProof({manifest,lock}) {
  const profile=DECLARATIVE_SOURCE_PROFILE;
  return createDeclarativeSourceProof({manifest,lock,tokioArchive:readFileSync(new URL(profile.tokio.archive,directory)),standardArchives:new Map(profile.standard.map(member=>[member.path,readFileSync(new URL(member.archive,directory))])),standardCfgIfArchive:readFileSync(new URL(profile.standardCfgIf.archive,directory)),rustLicense:readFileSync(new URL(profile.rustLicense.path,directory))});
}
export function taskLocalSourceDefinitions(proof) {
  const sources=proofs.get(proof);if(!sources)throw new TypeError('Unsealed declarative dependency source proof');
  const source=sources.get('tokio/src/task/task_local.rs');
  return new Map(['task_local','__task_local_inner'].map(name=>[name,sourceDefinition(proof,source,'tokio/src/task/task_local.rs',name,['tokio'])]));
}
export function isDeclarativeSourceProof(value){return !!value&&proofs.has(value);}
export function standardThreadLocalSourceDefinitions(proof) {
  const sources=proofs.get(proof);if(!sources)throw new TypeError('Unsealed declarative dependency source proof');
  return new Map([
    ['thread_local',sourceDefinition(proof,sources.get('rust/library/std/src/thread/local.rs'),'rust/library/std/src/thread/local.rs','thread_local',['std'])],
    ...['no_threads','native','os'].map(branch=>[branch,sourceDefinition(proof,sources.get('rust/library/std/src/sys/thread_local/'+(branch==='native'?'native/mod.rs':branch+'.rs')),'rust/library/std/src/sys/thread_local/'+(branch==='native'?'native/mod.rs':branch+'.rs'),'thread_local_inner',['std'])]),
  ]);
}
export function standardCfgIfSourceDefinition(proof) {
  const sources=proofs.get(proof);if(!sources)throw new TypeError('Unsealed declarative dependency source proof');
  return sourceDefinition(proof,sources.get('cfg-if/src/lib.rs'),'cfg-if/src/lib.rs','cfg_if',['cfg_if']);
}
export function declarativeStandardInvocations(proof,path) {
  const sources=proofs.get(proof),source=sources?.get('rust/'+path);
  if(!source)throw new TypeError('Unsealed declarative standard source or unregistered module path');
  return originalTopLevelMacroInvocations(source);
}

function sourceDefinition(proof,source,path,name,owner) {
  const definition=compileDeclarativeMacro(source,{name,owner});
  definitionOrigins.set(definition,{proof,evidence:freezeMacroTree({source:path,sourceSha256:hash(source),definitionDigest:definition.digest,definitionSpan:definition.definitionSpan,definitionHeader:declarativeDefinitionHeader(definition),dependencyDigest:proof.digest,sourceVerified:true,callOwnerResolved:false})});
  return definition;
}
export function declarativeDefinitionSource(proof,definition) {
  const origin=definitionOrigins.get(definition);
  if(!proofs.has(proof)||!origin||origin.proof!==proof)throw new TypeError('Declarative definition does not belong to this sealed source profile');
  return origin.evidence;
}

export function tokioConfigurationSourceDefinition(proof,name) {
  const sources=proofs.get(proof);if(!sources||typeof name!=='string'||!/^cfg_[A-Za-z_][A-Za-z0-9_]*$/u.test(name))throw new TypeError('Configuration transcriber requires a sealed source profile and source name');
  return sourceDefinition(proof,sources.get('tokio/src/macros/cfg.rs'),'tokio/src/macros/cfg.rs',name,['tokio']);
}
export function declarativeSourceInvocations(proof,path) {
  const sources=proofs.get(proof),source=sources?.get(path);
  if(!source)throw new TypeError('Unsealed declarative source or unregistered module path');
  return originalTopLevelMacroInvocations(source);
}
