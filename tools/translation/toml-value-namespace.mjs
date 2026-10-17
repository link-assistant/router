// Identity of the actual locked public function, independently of any runtime
// implementation. Only a genuine current Cargo dependency proof selects it.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalUseDeclarationLeaves} from './module-bindings.mjs';
const root=new URL('./source-profiles/toml-value-namespace/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
let descriptor;
function archiveMembers(bytes){
  const tar=gunzipSync(bytes,{maxOutputLength:2*1024*1024}),sources=new Map();
  const text=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
  for(let at=0;at+512<=tar.length;){const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const written=text(header,124,12).trim();if(!/^[0-7]+$/u.test(written))throw new TypeError('Unproved TOML source archive member size');
    const size=parseInt(written,8),checksum=parseInt(text(header,148,8).trim(),8),sum=header.reduce((total,byte,index)=>total+(index>=148&&index<156?32:byte),0);
    if(checksum!==sum||!Number.isSafeInteger(size)||size>2*1024*1024||at+512+size>tar.length)throw new TypeError('Invalid bounded TOML source archive header');
    const prefix=text(header,345,155),name=(prefix?prefix+'/':'')+text(header,0,100),kind=text(header,156,1);
    if(kind==='0'||kind===''){if(sources.has(name))throw new TypeError('Duplicate TOML source archive member');sources.set(name,tar.subarray(at+512,at+512+size));}
    else if(!['5','x','g'].includes(kind))throw new TypeError('Unsupported TOML source archive member');
    at+=512+Math.ceil(size/512)*512;
  }
  return sources;
}
function sourceDescriptor(){
  if(descriptor)return descriptor;
  const bytes=readFileSync(new URL(profile.archive,root));if(bytes.length!==profile.bytes||hash(bytes)!==profile.sha256)throw new TypeError('TOML namespace archive differs from its actual locked source');
  const members=archiveMembers(bytes),read=path=>{const source=members.get(profile.package+'-'+profile.version+'/'+path);if(!source||hash(source)!==profile.members[path])throw new TypeError('TOML namespace member differs from its pinned source');return source.toString('utf8');};
  const lib=read('src/lib.rs'),item=read('src/item.rs'),declarations=sourceItems(item).filter(entry=>entry.term==='fn'&&entry.name==='value');
  if(declarations.length!==1||declarations[0].tokens.filter(token=>token.type!=='comment').slice(0,3).map(token=>token.text).join(' ')!=='pub fn value')throw new TypeError('TOML value identity requires its actual unconditional public function declaration');
  const modules=sourceItems(lib).filter(entry=>entry.term==='mod'&&entry.name==='item');if(modules.length!==1||modules[0].tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('')!=='moditem;')throw new TypeError('TOML value requires its actual unconditional original module');
  const reexports=sourceItems(lib).filter(entry=>entry.term==='use'&&entry.tokens.filter(token=>token.type!=='comment').slice(0,2).map(token=>token.text).join(' ')==='pub use').flatMap(entry=>originalUseDeclarationLeaves(entry).filter(leaf=>leaf.name==='value'&&leaf.segments.join('::')==='crate::item::value').map(leaf=>({entry,leaf})));
  if(reexports.length!==1)throw new TypeError('TOML value requires its actual original public root reexport');
  const declaration=declarations[0],reexport=reexports[0].entry;
  descriptor=Object.freeze({name:'value',namespace:'value',target:Object.freeze(['toml_edit','value']),kind:'fn',source:'locked-original-toml-value-function',sourceEvidence:Object.freeze({package:profile.package,version:profile.version,archiveSha256:profile.sha256,declarationSha256:hash(item.slice(declaration.start,declaration.end)),declarationSpan:Object.freeze({start:declaration.start,end:declaration.end}),reexportSha256:hash(lib.slice(reexport.start,reexport.end)),reexportSpan:Object.freeze({start:reexport.start,end:reexport.end}),callAuthority:false,layoutAuthority:false,namespaceComplete:false,runtimeAuthority:false})});return descriptor;
}
export function lockedTomlValueNamespaceBindings(dependencies){
  if(!isDeriveDependencyProof(dependencies)||dependencies.manifestSha256!==profile.cargoManifestSha256||dependencies.lockSha256!==profile.cargoLockSha256)return [];
  return [sourceDescriptor()];
}
