// Complete pinned prelude member names are source data, not trait execution.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from '../rust-structure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../source-profiles/shared-f64-prelude/',import.meta.url);
const manifestBytes=readFileSync(new URL('manifest.json',root));
if(hash(manifestBytes)!=='6703f2320c87a6604bcb730bcabd9a5db075234e64084468b8f1455eba121eab')throw new TypeError('Original f64 method prelude profile differs');
const manifest=JSON.parse(manifestBytes),inputs=new Map();
for(const row of manifest.files){
 const encoded=readFileSync(new URL(row.archive,root)),raw=gunzipSync(encoded,{maxOutputLength:300000});
 if(hash(encoded)!==row.archiveSha256||raw.length!==row.bytes||hash(raw)!==row.sha256)throw new TypeError('Complete original prelude input differs: '+row.path);
 inputs.set(row.path,{...row,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});
}
const core={
 'marker.rs':['Copy','Send','Sized','Sync','Unpin','MetaSized','PointeeSized'],
 'ops/drop.rs':['Drop'],'ops/function.rs':['Fn','FnMut','FnOnce'],
 'ops/async_function.rs':['AsyncFn','AsyncFnMut','AsyncFnOnce'],
 'convert/mod.rs':['AsMut','AsRef','From','Into','TryFrom','TryInto'],
 'iter/traits/iterator.rs':['Iterator'],'iter/traits/double_ended.rs':['DoubleEndedIterator'],
 'iter/traits/exact_size.rs':['ExactSizeIterator'],'iter/traits/collect.rs':['Extend','IntoIterator','FromIterator'],
 'clone.rs':['Clone'],'cmp.rs':['Eq','Ord','PartialEq','PartialOrd'],'default.rs':['Default'],
 'future/into_future.rs':['IntoFuture'],'future/future.rs':['Future'],
};
const selected=[...Object.entries(core).map(([path,names])=>['library/core/src/'+path,names]),
 ['library/alloc/src/borrow.rs',['ToOwned']],['library/alloc/src/string.rs',['ToString']]];
let originalMembers;
function members(){
 if(originalMembers)return originalMembers;
 const result=[];
 for(const [path,names]of selected){
  const input=inputs.get(path),items=sourceItems(input.source);
  for(const name of names){
   const own=items.filter(item=>item.term==='trait'&&item.name===name);
   if(own.length!==1)throw new TypeError('Original prelude trait is absent or ambiguous: '+name);
   const item=own[0],tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{');
   if(open<0||tokens.at(-1).text!=='}')throw new TypeError('Original prelude trait body is incomplete: '+name);
   const declarations=sourceItems(input.source.slice(tokens[open].end,tokens.at(-1).start)).filter(row=>!row.comment);
   if(declarations.some(row=>!['fn','const','type'].includes(row.term)))throw new TypeError('Original prelude trait has an unproved namespace producer: '+name);
   result.push(Object.freeze({name,source:path,sourceSha256:input.sha256,span:Object.freeze({start:item.start,end:item.end}),
    originalMembers:Object.freeze(declarations.map(row=>Object.freeze({kind:row.term,name:row.name})))}));
  }
 }
 originalMembers=Object.freeze(result);return originalMembers;
}
export function originalF64MethodPreludeAbsence(method){
 if(!['is_nan','is_finite','floor'].includes(method))throw new TypeError('No original shared f64 method prelude profile');
 const traits=members();
 if(traits.some(trait=>trait.originalMembers.some(member=>['fn','const'].includes(member.kind)&&member.name===method)))throw new TypeError('Original common prelude has a competing shared f64 method');
 return Object.freeze({profile:'original-rust-1.89-prelude-f64-method-absence-v1',manifestSha256:hash(manifestBytes),method,traits,
  preludeSources:Object.freeze(manifest.files.filter(row=>row.path.includes('/prelude/')).map(row=>Object.freeze({...row}))),
  explicitCommonPreludeOnly:true,traitDispatchAuthority:false,wholeTraitTranslated:false});
}
