// Complete locked package sources and original trait member closures only.
// These facts do not implement a trait or authorize a method selection.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {itemConfiguration,isInertConditionalAttribute} from '../cfg-profile.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {deriveDependencyOriginalInputs} from '../derive-dependencies.mjs';
import {originalTraitMemberShape,originalCorePreludeTraitClosure,originalConditionalNamespaceAttribute} from './primitive-trait-closure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original external trait source: '+message);};
const root=new URL('../source-profiles/external-traits/',import.meta.url);
const profileBytes=readFileSync(new URL('manifest.json',root));
if(hash(profileBytes)!=='4714bd0f2e81bed2d1fa07cb50fa3458f953af8f3b9737e2fe3081f98afcfd7a')fail('profile changed');
const profile=JSON.parse(profileBytes),packages=new Map(),packageCaptures=new WeakMap();
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
const publicItem=item=>{
 const head=originalDeclarationHeader(item);if(!head)return false;
 const words=significant(item),at=words.findIndex(token=>token.start===head.keywordSpan.start);
 let begin=at;while(begin>0&&['unsafe','auto'].includes(words[begin-1].text))begin--;
 return begin>0&&words[begin-1].text==='pub';
};
// Same bounded, in-memory TAR decoding used by the pinned JSON source reader;
// every original regular member is authenticated, including notices/licenses.
function members(archive){
 const tar=gunzipSync(archive,{maxOutputLength:8*1024*1024}),result=new Map();let longName=null;
 const field=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
 for(let at=0;at+512<=tar.length;){
  const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
  const octal=field(header,124,12).trim();if(!/^[0-7]+$/u.test(octal))fail('member size is unproved');
  const size=parseInt(octal,8);if(size>2*1024*1024||at+512+size>tar.length)fail('member exceeds original source bound');
  const checksum=parseInt(field(header,148,8).trim(),8),sum=header.reduce((total,byte,index)=>total+(index>=148&&index<156?32:byte),0);
  if(sum!==checksum)fail('archive header checksum differs');
  const kind=field(header,156,1),body=tar.subarray(at+512,at+512+size);let name=field(header,0,100),prefix=field(header,345,155);if(prefix)name=prefix+'/'+name;
  if(kind==='L'){if(size>4096||longName!==null)fail('long original path is unproved');longName=body.toString('utf8').split('\0')[0];}
  else{
   if(longName!==null){name=longName;longName=null;}
   if(name.startsWith('/')||name.split('/').some(part=>part==='..'||part===''))fail('original path escapes package');
   if(kind==='0'||kind===''){if(result.has(name))fail('duplicate original member');result.set(name,body);}
   else if(!['5','x','g'].includes(kind))fail('unsupported original member kind');
  }
  at+=512+Math.ceil(size/512)*512;
 }
 if(longName!==null)fail('unconsumed original path');return result;
}
function pinnedPackage(name){
 if(packages.has(name))return packages.get(name);
 const matches=profile.packages.filter(entry=>entry.name===name);if(matches.length!==1)fail('package has no unique original profile');
 const pin=matches[0],archive=readFileSync(new URL(pin.archive,root));if(archive.length!==pin.bytes||hash(archive)!==pin.sha256)fail('complete archive changed');
 const files=members(archive),sources=new Map();if(files.size!==pin.members.length)fail('complete member census differs');
 for(const member of pin.members){const bytes=files.get(member.path);if(!bytes||bytes.length!==member.bytes||hash(bytes)!==member.sha256)fail('original member differs');
  const prefix=pin.name+'-'+pin.version+'/';if(!member.path.startsWith(prefix))fail('member lacks original package owner');
  const path=member.path.slice(prefix.length),source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('original source is not lossless UTF-8');
  sources.set(path,Object.freeze({path,source,sha256:member.sha256,bytes:member.bytes,package:pin.name,version:pin.version}));
 }
 const value={pin,sources};packages.set(name,value);return value;
}
function lockedPackage(dependencies,name){
 const inputs=deriveDependencyOriginalInputs(dependencies),selected=pinnedPackage(name),pin=selected.pin;
 // The genuine dependency issuer already authenticates both complete Cargo
 // inputs. This route deliberately supports only an unrenamed string entry.
 let dependency=false,found=[];
 for(const line of inputs.manifest.split('\n')){
  if(/^\s*\[/u.test(line)){dependency=/^\s*\[dependencies\]\s*(?:#.*)?$/u.test(line);continue;}
  if(dependency){const field=/^\s*([A-Za-z_][A-Za-z_0-9-]*)\s*=\s*"([^"\n]+)"\s*(?:#.*)?$/u.exec(line);if(field?.[1]===name)found.push(field[2]);}
 }
 if(found.length!==1)fail('direct dependency is absent, renamed or outside its bounded original form');
 const version=pin.version.split('.'),requirement=found[0];
 if(![version.join('.'),'='+version.join('.'),version.slice(0,2).join('.')].includes(requirement))fail('direct dependency requirement has no qualified locked route');
 const sections=inputs.lock.split('[[package]]').filter(section=>new RegExp('^\\s*name = "'+name+'"\\nversion = "'+pin.version.replaceAll('.','\\.')+'"','mu').test(section));
 if(sections.length!==1||!sections[0].includes('checksum = "'+pin.sha256+'"')||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"'))fail('actual lock lacks original registry identity');
 return {...selected,inputProof:{manifestSha256:hash(inputs.manifest),lockSha256:hash(inputs.lock),package:name,version:pin.version,requirement,archiveSha256:pin.sha256,profileSha256:hash(profileBytes)}};
}
const allowed=new Set(['cfg','doc','allow','warn','deny','forbid','inline','cold','track_caller','must_use','deprecated','no_std']);
function originalNamespace(pin){
 const items=sourceItems(pin.source);
 for(const item of items){if(item.comment)continue;
  const tokens=significant(item),inner=tokens[0]?.text==='#'&&tokens[1]?.text==='!';
  const head=originalDeclarationHeader(item),condition=itemConfiguration(item.tokens,null);
  const union=condition.attributes.some(attribute=>attribute.name==='cfg_attr')&&condition.attributes.every(attribute=>attribute.name==='cfg_attr'?originalConditionalNamespaceAttribute(attribute,{allowNoStd:inner}):!attribute.evaluation?.diagnostics.length);
  if(condition.diagnostics.length&&!union||condition.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&!(union&&attribute.name==='cfg_attr')&&!allowed.has(attribute.name)))fail('original outer item has an unproved attribute producer');
  if(inner)continue;
  const external=tokens.findIndex(token=>token.text==='extern'),tail=external<0?[]:tokens.slice(external);
  if(tail[0]?.text==='extern'&&tail[1]?.text==='crate'&&tail[2]?.type==='ident'&&tail[3]?.text===';'&&tail.length===4)continue;
  if(!head||head.kind!==item.term)fail('original namespace retains an unproved item producer: '+pin.path+':'+item.start+' ('+item.term+')');
  // A public glob can introduce another declaration under the selected name.
  if(item.term==='use'&&originalUseDeclarationLeaves(item).some(leaf=>leaf.glob))fail('original namespace has an unclosed import glob');
 }
 return items;
}
function unconditional(item){
 const condition=itemConfiguration(item.tokens,null);
 if(condition.status!=='active'||condition.attributes.some(attribute=>['cfg','cfg_attr'].includes(attribute.name)))fail('selected original route has conditional availability');
}
function normalize(path,owner){
 if(path[0]==='crate')return path.slice(1);let result=[...owner],at=path[0]==='self'?1:0;
 while(path[at]==='super'){if(!result.length)fail('original route escapes package');result.pop();at++;}
 return [...result,...path.slice(at)];
}
function moduleSource(selected,path){
 let pin=selected.sources.get(selected.pin.crateRoot),owner=[];if(!pin)fail('original crate root is absent');
 for(const segment of path){
  const declarations=originalNamespace(pin).filter(item=>item.term==='mod'&&item.name===segment&&publicItem(item));if(declarations.length!==1)fail('original public module is absent or ambiguous');
  unconditional(declarations[0]);const tokens=significant(declarations[0]);if(tokens.at(-1)?.text!==';')fail('inline original module requires its separate source-view rule');
  owner.push(segment);const base='src/'+owner.join('/'),candidates=[selected.sources.get(base+'.rs'),selected.sources.get(base+'/mod.rs')].filter(Boolean);if(candidates.length!==1)fail('original module file is absent or ambiguous');pin=candidates[0];
 }
 return pin;
}
function declaration(selected,path,seen=new Set()){
 const key=path.join('::');if(!path.length||seen.has(key)||seen.size>=32)fail('original export route is cyclic or over its bound');seen.add(key);
 const owner=path.slice(0,-1),pin=moduleSource(selected,owner),items=originalNamespace(pin),name=path.at(-1);
 const own=items.filter(item=>item.name===name&&item.term==='trait'&&publicItem(item)),imports=[];
 for(const item of items.filter(item=>item.term==='use'&&publicItem(item)))for(const leaf of originalUseDeclarationLeaves(item,owner))if(!leaf.glob&&leaf.name===name)imports.push({item,path:normalize(leaf.segments,owner)});
 const other=items.filter(item=>originalDeclarationHeader(item)?.name===name&&item.term!=='trait');
 if(own.length+imports.length!==1||other.length)fail('original trait name is absent or ambiguous');
 if(own.length){unconditional(own[0]);return {pin,item:own[0],owner,route:[]};}
 unconditional(imports[0].item);const next=declaration(selected,imports[0].path,new Set(seen));
 return {...next,route:[{source:pin.path,sourceSha256:pin.sha256,originalSpan:{start:imports[0].item.start,end:imports[0].item.end},path:imports[0].path},...next.route]};
}
function closure(selected,path,seen=new Set()){
 const key=path.join('::');if(seen.has(key)||seen.size>=32)fail('original supertrait closure is cyclic or over its bound');seen.add(key);
 const original=declaration(selected,path),shape=originalTraitMemberShape(original.pin,original.item,{allowGenerics:true,local:true,localProfile:null,ownerPath:original.owner,conditionalNamespaceAttributes:true});
 const supertraits=shape.clauses.map(tokens=>{
  const words=tokens.map(token=>token.text);if(words.some((word,index)=>index%2===0?tokens[index].type!=='ident':word!=='::')||words.length%2!==1)fail('original supertrait arguments need a separate source rule');
  const segments=words.filter((word,index)=>index%2===0);
  if(segments.length===1){
   // Resolve the actual owner imports/declarations before the core prelude.
   const items=originalNamespace(original.pin),imports=items.filter(item=>item.term==='use').flatMap(item=>originalUseDeclarationLeaves(item,original.owner)).filter(leaf=>leaf.name===segments[0]);
   if(imports.length||items.some(item=>originalDeclarationHeader(item)?.name===segments[0]))fail('original supertrait local/import route needs its explicit closure');
   return {path:segments,...originalCorePreludeTraitClosure(segments[0])};
  }
  return {path:segments,closure:closure(selected,normalize(segments,original.owner),new Set(seen))};
 });
 return {...shape.evidence,originalRoute:original.route,supertraits,wholeTraitAuthority:false,runtimeParity:false};
}
export function originalExternalTraitClosure(dependencies,path){
 if(!Array.isArray(path)||path.length<2||path.some(name=>typeof name!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(name)))fail('original external path is unproved');
 const selected=lockedPackage(dependencies,path[0]);
 return {schema:'locked-original-external-trait-member-closure-v1',originalDependency:selected.inputProof,declaration:closure(selected,path.slice(1)),wholeTraitAuthority:false,runtimeParity:false};
}
// A reusable original-source input boundary for the missing conditional
// namespace projection. Capturing bytes does not close that projection.
export function captureOriginalExternalTraitPackage(dependencies,name){
 if(typeof name!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(name))fail('original package name is unproved');
 const selected=lockedPackage(dependencies,name),token=Object.freeze({schema:'private-original-external-trait-package-v1'});
 packageCaptures.set(token,selected);return token;
}
export function originalExternalTraitPackageInputs(token){
 const selected=packageCaptures.get(token);if(!selected)fail('original package inputs require their genuine private capture');
 return Object.freeze({dependency:Object.freeze({...selected.inputProof}),crateRoot:selected.pin.crateRoot,sources:Object.freeze([...selected.sources.values()]),namespaceComplete:false,traitCallAuthority:false,runtimeParity:false});
}
