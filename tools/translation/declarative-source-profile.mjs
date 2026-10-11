// Source provenance for the initial audited package. This registry is not
// macro-call resolution, platform selection or namespace-completeness proof.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro} from './declarative-macros.mjs';
const directory=new URL('./source-profiles/declarative/',import.meta.url);
const manifestBytes=readFileSync(new URL('manifest.json',directory));
export const DECLARATIVE_SOURCE_PROFILE=freezeMacroTree(JSON.parse(manifestBytes));
const hash=value=>createHash('sha256').update(value).digest('hex'),proofs=new WeakMap();
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

export function createDeclarativeSourceProof({manifest,lock,tokioArchive,standardArchives}={}) {
  const profile=DECLARATIVE_SOURCE_PROFILE;
  if(typeof manifest!=='string'||typeof lock!=='string'||hash(manifest)!==profile.manifestSha256||hash(lock)!==profile.lockSha256)throw new TypeError('Declarative source dependencies differ from the audited manifest/lock');
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
  const evidence={schema:profile.schema,manifestSha256:hash(manifest),lockSha256:hash(lock),sourceProfileSha256:hash(manifestBytes),tokio:entry,standard:profile.standard,rust:profile.rust,ownerVerified:false,namespaceComplete:false,generatedBehavior:false,outstandingClosure:profile.outstandingClosure};
  const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,sources);return proof;
}
export function loadDeclarativeSourceProof({manifest,lock}) {
  const profile=DECLARATIVE_SOURCE_PROFILE;
  return createDeclarativeSourceProof({manifest,lock,tokioArchive:readFileSync(new URL(profile.tokio.archive,directory)),standardArchives:new Map(profile.standard.map(member=>[member.path,readFileSync(new URL(member.archive,directory))]))});
}
export function taskLocalSourceDefinitions(proof) {
  const sources=proofs.get(proof);if(!sources)throw new TypeError('Unsealed declarative dependency source proof');
  const source=sources.get('tokio/src/task/task_local.rs');
  return new Map(['task_local','__task_local_inner'].map(name=>[name,compileDeclarativeMacro(source,{name,owner:['tokio']})]));
}
export function isDeclarativeSourceProof(value){return !!value&&proofs.has(value);}
