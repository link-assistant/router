// Register only source-derived named type facts, through the original explicit
// std -> alloc -> core reexports. Every external table remains incomplete.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {COPY_TRAIT_OWNER_PROFILE,COPY_NAMESPACE_BINDINGS} from './copy-trait-owners.mjs';
import {stablePublicTypeCandidates,stablePublicReexportCandidates,originalPublicModuleCandidate,originalExternAliasCandidate} from './namespace-census.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakSet();
function verifiedSource(entry,directory){
  const archive=readFileSync(new URL(`./source-profiles/${directory}/${entry.archive}`,import.meta.url));
  if(hash(archive)!==entry.archiveSha256)throw new TypeError('Standard namespace source archive checksum mismatch');
  const source=gunzipSync(archive,{maxOutputLength:200000});
  if(source.length!==entry.bytes||hash(source)!==entry.sha256)throw new TypeError('Standard namespace original source checksum mismatch');
  return source.toString('utf8');
}
export const STANDARD_NAMESPACE_PROFILE=freeze({rust:'1.89.0',id:'original-stable-fmt-type-namespace',sources:[
  {
    "url": "https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/lib.rs",
    "archive": "rust-std-lib-1.89.0.rs.gz",
    "bytes": 28184,
    "sha256": "d070a5abc5138536e274e483181db929cc56d7a4b7a1947a11149f92b2cdc1ea",
    "archiveSha256": "d0216701dd8c129fb80a7c32ddd025de22d1420090a9fc7219384f06eecce065"
  },
  {
    "url": "https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/alloc/src/lib.rs",
    "archive": "rust-alloc-lib-1.89.0.rs.gz",
    "bytes": 7849,
    "sha256": "1db66400d82c953ea5300568e5fe7734edee3e60e633a42758a4ed5497b0e4c9",
    "archiveSha256": "1919fc3dae67328239368b55a46c44e232ad6d3741bc6801b14529bd085587c2"
  },
  {
    "url": "https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/alloc/src/fmt.rs",
    "archive": "rust-alloc-fmt-1.89.0.rs.gz",
    "bytes": 26962,
    "sha256": "57dcacb88971f404249b3479623548b1baea51a71d7b2ffc0960b66871a7b879",
    "archiveSha256": "6c1e69c9c777ab5de83e6f2e2469c8165fce242c167113f55778eabc7f5b4bdf"
  }
]});
const [std,alloc,allocFmt]=STANDARD_NAMESPACE_PROFILE.sources.map(entry=>verifiedSource(entry,'namespace-standard'));
const coreEntry=COPY_TRAIT_OWNER_PROFILE.sources.find(entry=>entry.url.endsWith('/core/src/fmt/mod.rs'));
if(!coreEntry)throw new TypeError('Standard namespace lacks its original core declaration input');
const coreFmt=verifiedSource(coreEntry,'copy-standard');
const alias=originalExternAliasCandidate(std,'alloc','alloc_crate');
const exportedModule=stablePublicReexportCandidates(std).filter(entry=>entry.name==='fmt'&&JSON.stringify(entry.path)==='["alloc_crate","fmt"]');
const declaredModule=originalPublicModuleCandidate(alloc,'fmt');
if(!alias||exportedModule.length!==1||!declaredModule)throw new TypeError('Standard namespace original module reexport chain is not closed');
const actualTypes=new Map(stablePublicTypeCandidates(coreFmt).map(entry=>[entry.name,entry]));
const facts=[];
for(const reexport of stablePublicReexportCandidates(allocFmt)){
  if(reexport.path.length!==3||reexport.path[0]!=='core'||reexport.path[1]!=='fmt')continue;
  const declaration=actualTypes.get(reexport.path[2]);if(!declaration)continue;
  const evidence={schema:'original-standard-type-namespace-v1',profile:STANDARD_NAMESPACE_PROFILE,
    coreSource:coreEntry,sourceInputsVerified:true,name:reexport.name,kind:declaration.kind,
    target:['std','fmt',reexport.name],declaration,reexports:[alias,exportedModule[0],declaredModule,reexport],
    namespace:'type',namespaceComplete:false,layoutAuthority:false,constructorAuthority:false,globAuthority:false,runtimeAuthority:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.add(proof);facts.push(proof);
}
if(new Set(facts.map(fact=>fact.name)).size!==facts.length)throw new TypeError('Standard namespace original exports have conflicting candidate owners');
export const STANDARD_NAMESPACE_EVIDENCE=freeze({schema:'original-standard-namespace-census-v1',profile:STANDARD_NAMESPACE_PROFILE,
  sourcesVerified:true,facts,namespaceComplete:false,runtimeAuthority:false});
export const isStandardNamespaceEvidence=proof=>!!proof&&proofs.has(proof);
const existing=new Set(COPY_NAMESPACE_BINDINGS.map(binding=>JSON.stringify(binding.target)));
export const STANDARD_NAMESPACE_BINDINGS=freeze(facts.filter(fact=>!existing.has(JSON.stringify(fact.target))).map(fact=>({
  name:fact.name,namespace:'type',kind:fact.kind,target:fact.target,
  source:'rust-1.89-original-standard-namespace',originalNamespaceDigest:fact.digest,
})));
