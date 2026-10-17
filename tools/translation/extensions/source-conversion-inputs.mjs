// Parser-free original selections. Source identity selects members; it never
// grants caller dispatch or implements the uncompiled allocation internals.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {primitiveFromNamespace} from './primitive-from-source.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('../source-profiles/source-conversions/',import.meta.url),bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='72937bc8960cda012d0d26c36d1ffca56ff927ea1561b1dd4fad94b047b46076')throw new TypeError('Original conversion profile differs');
const manifest=JSON.parse(bytes),selections=new WeakSet();let originals,plan;
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text);
const fail=message=>{throw new TypeError('Original source conversion: '+message);};
export const SOURCE_CONVERSION_PROFILE=freeze({...manifest,manifestSha256:hash(bytes),allocatorTranslated:false,unsafeTranslated:false,oomTranslated:false,constTraitCall:false});
export function originalConversionInputs(){
  if(originals)return new Map(originals);originals=new Map();
  for(const row of manifest.sources){const encoded=readFileSync(new URL(row.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128000});if(encoded.length!==row.archiveBytes||hash(encoded)!==row.archiveSha256||raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete licensed input differs: '+row.path);originals.set(row.path,freeze({...row,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)}));}
  // A fresh map cannot modify the private original catalog.
  return new Map(originals);
}
function member(input,header,name,signature,body){
  const owners=sourceItems(input.source).filter(item=>item.term==='impl').filter(item=>{const tokens=item.tokens.filter(t=>t.type!=='comment'),start=tokens.findIndex(t=>t.text==='impl'),open=tokens.findIndex((t,i)=>i>start&&t.text==='{');return words(tokens.slice(start,open)).join('')===header;});
  if(owners.length!==1)fail('actual impl is absent or ambiguous: '+header);
  const owner=owners[0],tokens=owner.tokens.filter(t=>t.type!=='comment'),open=tokens.findIndex(t=>t.text==='{'),offset=tokens[open].end,entries=sourceItems(input.source.slice(offset,tokens.at(-1).start)).filter(item=>!item.comment);
  const implAt=tokens.findIndex(t=>t.text==='impl'),attrs=words(tokens.slice(0,implAt)).join(''),stable='#[stable(feature="rust1",since="1.0.0")]';
  if(attrs!==(header==='implFrom<&str>forString'?'#[cfg(not(no_global_oom_handling))]'+stable:stable))fail('original impl attributes or conditions differ');
  if(entries.length!==1||entries[0].term!=='fn'||entries[0].name!==name)fail('selected impl needs its sole original member');
  const entry=entries[0],mt=entry.tokens.filter(t=>t.type!=='comment'),fn=mt.findIndex(t=>t.text==='fn'),brace=mt.findIndex((t,i)=>i>fn&&t.text==='{');
  const memberAttrs=words(mt.slice(0,fn)).join(''),expectedAttrs=header==='impl<T,U>Into<U>forTwhereU:From<T>,'?'#[inline]#[track_caller]':header==='impl<T>From<T>forT'?'#[inline(always)]':'#[inline]';
  if(memberAttrs!==expectedAttrs)fail('original member attributes differ');
  if(words(mt.slice(fn,brace)).join('')!==signature||words(mt.slice(brace)).join('')!==body||mt[fn-1]?.text==='const')fail('actual nonconst signature or complete body differs');
  const first=mt[fn],begin=mt[brace],last=mt.at(-1),result=freeze({path:input.path,sourceSha256:input.sha256,implOriginalSpan:{start:owner.start,end:owner.end},implOriginalSource:input.source.slice(owner.start,owner.end),memberOriginalSpan:{start:offset+entry.start,end:offset+entry.end},memberOriginalSource:input.source.slice(offset+entry.start,offset+entry.end),parsedMemberSource:input.source.slice(offset+first.start,offset+last.end),bodySource:input.source.slice(offset+begin.start,offset+last.end),bodyOriginalSpan:{start:offset+begin.start,end:offset+last.end},signature,header,constTraitCall:false});selections.add(result);return result;
}
// Inspection validates source structure but cannot issue a private selection.
export function inspectConversionSource(source,{header,name,signature,body}){return {...member({path:'inspection',sha256:hash(source),source},header,name,signature,body),sourceAuthority:false};}
export function originalConversionPlan(){
  if(plan)return plan;const files=originalConversionInputs(),core=files.get('library/core/src/convert/mod.rs'),alloc=files.get('library/alloc/src/string.rs');
  const traits={};for(const [name,signature]of [['Into','fninto(self)->T;'],['From','fnfrom(value:T)->Self;']]){const own=sourceItems(core.source).filter(item=>item.term==='trait'&&item.name===name);if(own.length!==1)fail('original trait is ambiguous');const text=words(own[0].tokens).join('');if(!text.includes('pubtrait'+name+'<T>:Sized{')||!text.includes(signature))fail('actual original trait signature/Sized contract differs');traits[name]={path:core.path,sourceSha256:core.sha256,originalSpan:{start:own[0].start,end:own[0].end},originalDeclaration:core.source.slice(own[0].start,own[0].end)};}
  const into=member(core,'impl<T,U>Into<U>forTwhereU:From<T>,','into','fninto(self)->U','{U::from(self)}'),identity=member(core,'impl<T>From<T>forT','from','fnfrom(t:T)->T','{t}'),string=member(alloc,'implFrom<&str>forString','from','fnfrom(s:&str)->String','{s.to_owned()}');
  if(!string.implOriginalSource.includes('#[cfg(not(no_global_oom_handling))]'))fail('actual allocation feature condition differs');
  plan=freeze({profileSha256:SOURCE_CONVERSION_PROFILE.manifestSha256,rust:manifest.rust,traits,namespace:primitiveFromNamespace(),into,identity,string,originalInputs:manifest.sources,allocationBoundary:{operation:'checked-standard-string-ownership-v1/to_owned',originalAllocationInputsRetained:true,allocatorTranslated:false,unsafeUtf8Translated:false,sliceSpecializationTranslated:false,oomTranslated:false,globalOomCapabilityInferred:false},wholeTraitTranslated:false,wholeAllocTranslated:false,runtimeParity:false});return plan;
}
export function requireOriginalConversionMember(selection){if(!selections.has(selection))fail('copied or unselected original member');return selection;}
