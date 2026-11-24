// Complete original standard Default method selections. The caller's type,
// generated field sink and ordinary body checker remain independent joins.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
const root=new URL('./source-profiles/default-containers/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',root)),profile=JSON.parse(profileBytes);
const hash=value=>createHash('sha256').update(value).digest('hex'),selections=new WeakSet(),cache=new Map();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original container Default: '+message);};
let sources;
function originals(){if(sources)return sources;if(profile.rustVersion!=='1.89'||profile.allocatorInternalsCompiled!==false||profile.wholeTraitTranslated!==false||profile.runtimeParity!==false)fail('original source profile boundary differs');sources=profile.sources.map(row=>{const url=new URL(row.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('archive escapes original source profiles');const packed=readFileSync(url);if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('compressed source differs');const raw=gunzipSync(packed,{maxOutputLength:160000});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete original bytes differ');return freeze({...row,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});});return sources;}
const ref=(origin,start,end)=>({source:origin.path,sourceSha256:origin.sha256,span:{start,end},original:origin.source.slice(start,end)});
export function originalContainerDefaultBody(kind){
  if(typeof kind!=='string'||kind.length>64||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(kind))fail('selection requires a bounded original nominal name');
  if(cache.has(kind))return cache.get(kind);
  const candidates=[];
  for(const origin of originals().filter(row=>row.path.startsWith('library/')))for(const item of sourceItems(origin.source).filter(item=>item.term==='impl')){
    const tokens=item.tokens.filter(token=>token.type!=='comment'),begin=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>begin&&token.text==='{'),header=tokens.slice(begin,open).map(token=>token.text).join('');
    const nongeneric='implDefaultfor'+kind,generic='impl<T>Defaultfor'+kind+'<T>';
    if(header!==nongeneric&&header!==generic)continue;
    const offset=tokens[open].end,end=tokens.at(-1).start,members=sourceItems(origin.source.slice(offset,end)).filter(item=>!item.comment);
    if(members.length!==1||members[0].term!=='fn'||members[0].name!=='default')fail('complete Default associated item set differs');
    const member=members[0],mt=member.tokens.filter(token=>token.type!=='comment'),fn=mt.findIndex(token=>token.text==='fn'),body=mt.findIndex((token,index)=>index>fn&&token.text==='{'),returnType=header===nongeneric?kind:kind+'<T>';
    if(mt.slice(fn,body).map(token=>token.text).join('')!=='fndefault()->'+returnType)fail('original static Default return/signature differs');
    const declaration=sourceItems(origin.source).filter(item=>['struct','enum'].includes(item.term)&&item.name===kind);if(declaration.length!==1)fail('actual nominal declaration absent/ambiguous');
    const definitionSpan={start:offset+mt[fn].start,end:offset+mt.at(-1).end},bodySpan={start:offset+mt[body].start,end:offset+mt.at(-1).end};
    const method={name:'default',ownerHeader:header,parameters:[],definitionSpan,bodySpan,signatureSource:origin.source.slice(definitionSpan.start,bodySpan.start),bodySource:origin.source.slice(bodySpan.start,bodySpan.end),definitionSource:origin.source.slice(definitionSpan.start,definitionSpan.end)};
    candidates.push({method,evidence:{kind:'original-standard-container-trait-method',rustPath:origin.path,sourceSha256:origin.sha256,owner:kind,trait:'core::default::Default',genericParameters:header===nongeneric?[]:['T'],payloadDefaultBound:false,implementation:ref(origin,item.start,item.end),declaration:ref(origin,declaration[0].start,declaration[0].end),sourceInputs:[{url:origin.url,sha256:origin.sha256}],allocatorInternalsCompiled:false,wholeTraitTranslated:false,runtimeParity:false}});
  }
  if(candidates.length!==1)fail('actual selected Default implementation absent/ambiguous: '+kind);
  const value=freeze({schema:'original-container-default-method-source-v1',sourceProfileSha256:hash(profileBytes),...candidates[0],namespaceAuthority:false,runtimeAuthority:false});selections.add(value);cache.set(kind,value);return value;
}
export function assertOriginalContainerDefaultBody(value){if(!selections.has(value))fail('selection is copied or unsealed');return value;}
