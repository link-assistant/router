// Byte-pinned source facts only. A package checksum does not resolve a caller
// macro, its generated trait methods, or Cargo's transitive feature selection.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {compileDeclarativeMacro} from './declarative-macros.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const root=new URL('./source-profiles/json-macro/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const profileBytes=readFileSync(new URL('manifest.json',root));
if(hash(profileBytes)!=='3e43c5a0bdcbc899c196e65286a3de01c525d34d3999f13b866c3b5bb2d07bbf')throw new TypeError('JSON macro source profile changed');
export const JSON_MACRO_SOURCE_PROFILE=freezeMacroTree(JSON.parse(profileBytes));
const proofs=new WeakMap(),definitions=new WeakMap();

function archiveMembers(bytes) {
  const tar=gunzipSync(bytes,{maxOutputLength:8*1024*1024}),members=new Map();let longName=null;
  const field=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
  for(let at=0;at+512<=tar.length;) {
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const octal=field(header,124,12).trim();if(!/^[0-7]+$/u.test(octal))throw new TypeError('JSON macro archive has an unproved member size');
    const size=parseInt(octal,8);
    if(size>2*1024*1024||at+512+size>tar.length)throw new TypeError('JSON macro source member exceeds its budget');
    const checksum=parseInt(field(header,148,8).trim(),8),actual=header.reduce((sum,byte,index)=>sum+(index>=148&&index<156?32:byte),0);
    if(checksum!==actual)throw new TypeError('JSON macro archive header checksum mismatch');
    const kind=field(header,156,1),body=tar.subarray(at+512,at+512+size);
    let name=field(header,0,100),prefix=field(header,345,155);if(prefix)name=prefix+'/'+name;
    if(kind==='L'){if(size>4096)throw new TypeError('JSON macro source path budget exceeded');longName=body.toString('utf8').split('\0')[0];}
    else {
      if(longName){name=longName;longName=null;}
      if(name.startsWith('/')||name.split('/').includes('..'))throw new TypeError('JSON macro source path escapes its archive');
      if(kind==='0'||kind==='') {if(members.has(name))throw new TypeError('Duplicate JSON macro archive member');members.set(name,body);}
      else if(!['5','x','g'].includes(kind))throw new TypeError('JSON macro archive has an unsupported member kind');
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(longName)throw new TypeError('Unconsumed JSON macro archive path');
  return members;
}

export function createJsonMacroSourceProof({manifest,lock,archives}={}) {
  const profile=JSON_MACRO_SOURCE_PROFILE;
  if(typeof manifest!=='string'||typeof lock!=='string'||hash(manifest)!==profile.manifestSha256||hash(lock)!==profile.lockSha256)throw new TypeError('JSON macro dependencies differ from the original audited manifest/lock');
  if(!(archives instanceof Map))throw new TypeError('JSON macro source proof requires original archive bytes');
  const sources=new Map(),packages=[];
  for(const entry of profile.packages) {
    const sections=lock.split('[[package]]').filter(section=>section.includes('name = "'+entry.name+'"\nversion = "'+entry.version+'"'));
    if(sections.length!==1||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"')||!sections[0].includes('checksum = "'+entry.sha256+'"'))throw new TypeError('JSON macro archive lacks its exact locked registry owner');
    const bytes=archives.get(entry.name+'@'+entry.version);
    if(!Buffer.isBuffer(bytes)||bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new TypeError('JSON macro dependency checksum mismatch');
    const members=archiveMembers(bytes);
    for(const pin of entry.members) {
      const original=members.get(entry.name+'-'+entry.version+'/'+pin.path);
      if(!original||original.length!==pin.bytes||hash(original)!==pin.sha256)throw new TypeError('JSON macro original source member checksum mismatch');
      sources.set(entry.name+'/'+pin.path,freezeMacroTree({...pin,package:entry.name,version:entry.version,source:original.toString('utf8'),archiveSha256:entry.sha256}));
    }
    packages.push({name:entry.name,version:entry.version,archiveSha256:entry.sha256});
  }
  const evidence={schema:profile.schema,manifestSha256:hash(manifest),lockSha256:hash(lock),profileSha256:hash(profileBytes),packages,sourceInputsVerified:true,directDependency:profile.directDependency,sourceFeatureExpansion:profile.sourceFeatureExpansion,unifiedFeatureClosureVerified:false,callOwnerResolved:false,namespaceAuthority:false,expansionAuthority:false,runtimeParity:false,generatedTraitBehavior:false,rustExecution:false,outstandingOwnerObligations:profile.outstandingOwnerObligations};
  const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,sources);return proof;
}
export function loadJsonMacroSourceProof({manifest,lock}) {
  return createJsonMacroSourceProof({manifest,lock,archives:new Map(JSON_MACRO_SOURCE_PROFILE.packages.map(entry=>[entry.name+'@'+entry.version,readFileSync(new URL(entry.archive,root))]))});
}
export function isJsonMacroSourceProof(proof){return !!proof&&proofs.has(proof);}
export function jsonMacroOriginalSource(proof,packageName,path) {
  const source=proofs.get(proof)?.get(packageName+'/'+path);
  if(!source)throw new TypeError('Unsealed or unregistered JSON macro source');return source;
}
export function jsonMacroSourceDefinition(proof,name='json') {
  if(!['json','json_internal','json_unexpected','json_expect_expr_comma'].includes(name))throw new TypeError('Unregistered JSON macro definition');
  const source=jsonMacroOriginalSource(proof,'serde_json','src/macros.rs');
  const definition=compileDeclarativeMacro(source.source,{name,owner:['serde_json']});
  definitions.set(definition,freezeMacroTree({dependencyDigest:proof.digest,sourceSha256:source.sha256,originalDefinitionSpan:definition.definitionSpan,sourceInputsVerified:true,callOwnerResolved:false,expansionAuthority:false}));return definition;
}
export function jsonMacroDefinitionSource(definition) {
  const evidence=definitions.get(definition);if(!evidence)throw new TypeError('Unsealed JSON macro definition');return evidence;
}
export function jsonMacroDependencyProfile({manifest,lock}) {
  if(typeof manifest!=='string'||typeof lock!=='string'||hash(manifest)!==JSON_MACRO_SOURCE_PROFILE.manifestSha256||hash(lock)!==JSON_MACRO_SOURCE_PROFILE.lockSha256)return {proof:null,diagnostics:[{kind:'unsupported-profile',message:'JSON macro owner and features remain unresolved outside the audited manifest/lock'}]};
  return {proof:loadJsonMacroSourceProof({manifest,lock}),diagnostics:[]};
}
