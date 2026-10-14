// Complete actual standard Clone source selection. This pure leaf grants no
// caller identity, generic bound, borrowing, no-Drop or executable authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
const root=new URL('./source-profiles/clone-containers/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root)),manifest=JSON.parse(manifestBytes),hash=value=>createHash('sha256').update(value).digest('hex'),selections=new WeakSet();let selection;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original Option Clone: '+message);};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
export function originalOptionCloneBody(){
 if(selection)return selection;
 if(manifest.rustVersion!=='1.89'||manifest.cloneFromCompiled!==false||manifest.wholeTraitTranslated!==false||manifest.runtimeParity!==false)fail('profile boundary differs');
 const originals=manifest.sources.map(row=>{const url=new URL(row.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('archive escapes source profiles');const packed=readFileSync(url);if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('original archive differs');const bytes=gunzipSync(packed,{maxOutputLength:100000});if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete source differs');return {...row,source:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};});
 const origin=originals.find(row=>row.path==='library/core/src/option.rs');if(!origin)fail('complete original Option source absent');
 const items=sourceItems(origin.source),implementations=items.filter(item=>{if(item.term!=='impl')return false;const t=item.tokens.filter(token=>token.type!=='comment'),at=t.findIndex(token=>token.text==='impl'),open=t.findIndex((token,index)=>index>at&&token.text==='{');return words(t.slice(at,open))==='impl<T>CloneforOption<T>whereT:Clone,';});
 if(implementations.length!==1)fail('actual generic Clone implementation absent/ambiguous');
 const implementation=implementations[0],tokens=implementation.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),offset=tokens[open].end,members=sourceItems(origin.source.slice(offset,tokens.at(-1).start)).filter(item=>!item.comment);
 if(members.length!==2||members.some(member=>member.term!=='fn')||words(members.flatMap(member=>[{text:member.name}]))!=='cloneclone_from')fail('complete associated method set differs');
 const member=members[0],mt=member.tokens.filter(token=>token.type!=='comment'),fn=mt.findIndex(token=>token.text==='fn'),body=mt.findIndex((token,index)=>index>fn&&token.text==='{');if(words(mt.slice(fn,body))!=='fnclone(&self)->Self')fail('original shared Clone signature differs');
 const declaration=items.filter(item=>item.term==='enum'&&item.name==='Option');if(declaration.length!==1||!words(declaration[0].tokens).includes('#[derive(Copy,Eq,Debug,Hash)]'))fail('actual generic declaration/Copy derive differs');
 const reference=item=>({source:origin.path,sourceSha256:origin.sha256,span:{start:item.start,end:item.end},original:origin.source.slice(item.start,item.end)}),definitionSpan={start:offset+mt[fn].start,end:offset+mt.at(-1).end},bodySpan={start:offset+mt[body].start,end:offset+mt.at(-1).end};
 const method={name:'clone',ownerHeader:'impl<T>CloneforOption<T>whereT:Clone,',parameters:[{name:'self',receiver:true,reference:'shared',rustTypeSyntax:['&','Self']}],definitionSpan,bodySpan,signatureSource:origin.source.slice(definitionSpan.start,bodySpan.start),definitionSource:origin.source.slice(definitionSpan.start,definitionSpan.end),bodySource:origin.source.slice(bodySpan.start,bodySpan.end)};
 selection=freeze({schema:'original-option-clone-method-source-v1',sourceProfileSha256:hash(manifestBytes),method,evidence:{kind:'original-standard-container-trait-method',owner:'Option',trait:'core::clone::Clone',rustPath:origin.path,sourceSha256:origin.sha256,genericParameter:'T',payloadCloneBound:true,implementation:reference(implementation),declaration:reference(declaration[0]),associatedMethods:members.map(member=>({name:member.name,span:{start:offset+member.start,end:offset+member.end},original:origin.source.slice(offset+member.start,offset+member.end)})),sourceInputs:[{url:origin.url,sha256:origin.sha256}],cloneFromCompiled:false,wholeTraitTranslated:false,runtimeParity:false},namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,runtimeAuthority:false});selections.add(selection);return selection;
}
export function assertOriginalOptionCloneBody(value){if(!selections.has(value))fail('copied or unsealed source selection');return value;}
