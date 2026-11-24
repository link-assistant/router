// Whole original standard forwarding bodies, not a String-name coercion.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {originalImplMemberItems} from '../rust-member-boundaries.mjs';
const issued=new WeakMap(),cached=new Map(),inputs=new Map();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original String Pattern forwarding: '+message);};
const descriptors=[
 {path:'library/alloc/src/string.rs',archive:'utf16-fixed-f64/alloc-string.rs.gz',bytes:111988,sha256:'46dadb69bbe909b50146366020dc23d4fa88f53b93435b7e0f70c6692d0ba629',archiveSha256:'3f9bb719280924aa34b9f3693879b5a65e45eecc78f4fa8dea84219bf1105523'},
 {path:'library/core/src/str/mod.rs',archive:'utf16-fixed-f64/core-str-mod.rs.gz',bytes:109322,sha256:'c4d2f7564389d6007eb62f287a0efdda865a7133ec0a7d47d66be581794ac416',archiveSha256:'5c41e64ff9a819e50600e8db67f4738c0f5ef805eae3946cfdfa3aa139deb6f0'},
 {path:'library/core/src/str/traits.rs',archive:'slice-membership/rust-str-traits-1.89.0.rs.gz',bytes:31972,sha256:'8373e9a829477d832cde6818f9e5a3c5887d22918a15d3144c933b93681fe6db',archiveSha256:'662360e0d06803201230d9c00abc7e6ab2c378305bdb108a295843802cab3ad6'},
];
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const spelling=tokens=>significant(tokens).map(token=>token.text).join('');
function input(path){
 if(inputs.has(path))return inputs.get(path);
 const descriptor=descriptors.find(row=>row.path===path);if(!descriptor)fail('unknown complete source');
 const archive=readFileSync(new URL('../source-profiles/'+descriptor.archive,import.meta.url));if(hash(archive)!==descriptor.archiveSha256)fail('complete source archive changed');
 const bytes=gunzipSync(archive,{maxOutputLength:120000});if(bytes.length!==descriptor.bytes||hash(bytes)!==descriptor.sha256)fail('complete decoded source changed');
 const value=freeze({descriptor,source:bytes.toString('utf8')});inputs.set(path,value);return value;
}
function ownerHeader(owner){const tokens=significant(owner.tokens),at=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>at&&token.text==='{');return spelling(tokens.slice(at,open));}
function owner(origin,header){const rows=sourceItems(origin.source).filter(item=>item.term==='impl'&&ownerHeader(item)===header);if(rows.length!==1)fail('complete original impl absent or ambiguous');return rows[0];}
function member(origin,container,name){
 const tokens=significant(container.tokens),open=tokens.find(token=>token.text==='{'),last=tokens.at(-1);if(!open||last?.text!=='}')fail('original impl boundary incomplete');
 const rows=originalImplMemberItems(origin.source,{start:open.end,end:last.start}).filter(item=>item.term==='fn'&&item.name===name);if(rows.length!==1)fail('complete original member absent or ambiguous');
 const row=rows[0],offset=0,all=significant(row.tokens),fn=all.findIndex(token=>token.text==='fn'),body=all.findIndex((token,index)=>index>fn&&token.text==='{'),end=all.at(-1);if(fn<0||body<0||end?.text!=='}')fail('original method body incomplete');
 const span={start:offset+row.start,end:offset+row.end},bodySpan={start:offset+all[body].start,end:offset+end.end};
 return freeze({path:origin.descriptor.path,sourceSha256:origin.descriptor.sha256,ownerSpan:{start:container.start,end:container.end},ownerHeader:ownerHeader(container),ownerOriginal:origin.source.slice(container.start,container.end),name,span,original:origin.source.slice(span.start,span.end),signature:spelling(all.slice(fn,body)),bodySpan,bodySource:origin.source.slice(bodySpan.start,bodySpan.end)});
}
const word=node=>node?.kind==='token'?node.text:null;
// A reusable complete single-expression forwarding grammar. Unsupported
// statements, branches, operators, generic calls and partial slices refuse.
function forwarding(selection){
 const trees=originalMacroTrees(selection.bodySource);if(trees.length!==1||trees[0].kind!=='group'||trees[0].delimiter!=='{')fail('complete original body group required');let cells=0;
 function expression(nodes,depth=0){
  if(depth>32)fail('forwarding depth bound');let at=0;
  const parse=()=>{
   if(++cells>4096)fail('forwarding cell bound');const first=nodes[at++];if(first?.kind!=='token'||first.type!=='ident')fail('original forwarding value required');
   let value={kind:'parameter',name:first.text};
   while(at<nodes.length){
    const node=nodes[at];
    if(node.kind==='group'&&node.delimiter==='['){if(node.children.map(word).join('')!=='..')fail('only complete original RangeFull indexing is proved');at++;value={kind:'range-full-index',object:value};}
    else if(word(node)==='.'){
     at++;const method=nodes[at++],arguments_=nodes[at++];if(method?.kind!=='token'||method.type!=='ident'||arguments_?.kind!=='group'||arguments_.delimiter!=='(')fail('complete original method call required');
     const rows=[];let begin=0;for(let index=0;index<=arguments_.children.length;index++)if(index===arguments_.children.length||word(arguments_.children[index])===','){if(index>begin)rows.push(expression(arguments_.children.slice(begin,index),depth+1));else if(index<arguments_.children.length)fail('empty forwarding argument');begin=index+1;}
     value={kind:'method-call',receiver:value,method:method.text,args:rows};
    }else fail('unproved original forwarding operation');
   }
   return value;
  };
  const result=parse();if(at!==nodes.length)fail('forwarding left original tokens');return result;
 }
 return freeze({ir:expression(trees[0].children),trees,spanDomain:'body-local original token spans with exact complete bodySpan association'});
}
function originalUse(origin,expected){const rows=sourceItems(origin.source).filter(item=>item.term==='use'&&spelling(item.tokens)===expected);if(rows.length!==1)fail('canonical original import route absent or ambiguous');const row=rows[0];return {path:origin.descriptor.path,sourceSha256:origin.descriptor.sha256,span:{start:row.start,end:row.end},original:origin.source.slice(row.start,row.end)};}
export function originalStringPatternForwarding(operation){
 if(!['contains','starts_with'].includes(operation))fail('only original nonescaping bool operations are selected');if(cached.has(operation))return cached.get(operation);
 const alloc=input(descriptors[0].path),core=input(descriptors[1].path),traits=input(descriptors[2].path),entry=member(core,owner(core,'implstr'),operation),outer=forwarding(entry);
 if(entry.signature!==`fn${operation}<P:Pattern>(&self,pat:P)->bool`||outer.ir.kind!=='method-call'||!isDeepStrictEqual(outer.ir.receiver,{kind:'parameter',name:'pat'})||!isDeepStrictEqual(outer.ir.args,[{kind:'parameter',name:'self'}]))fail('original str dispatch is not its complete Pattern bool forwarding');
 const implementation=member(alloc,owner(alloc,"impl<'b>Patternfor&'bString"),outer.ir.method),pattern=forwarding(implementation);
 const expected={kind:'method-call',receiver:{kind:'range-full-index',object:{kind:'parameter',name:'self'}},method:outer.ir.method,args:[{kind:'parameter',name:'haystack'}]};
 if(implementation.signature!==`fn${outer.ir.method}(self,haystack:&str)->bool`||!isDeepStrictEqual(pattern.ir,expected))fail('original shared String Pattern body does not preserve its complete receiver and argument');
 const index=member(alloc,owner(alloc,'impl<I>ops::Index<I>forStringwhereI:slice::SliceIndex<str>,'),'index'),indexFlow=forwarding(index);
 if(index.signature!=='fnindex(&self,index:I)->&I::Output'||!isDeepStrictEqual(indexFlow.ir,{kind:'method-call',receiver:{kind:'parameter',name:'index'},method:'index',args:[{kind:'method-call',receiver:{kind:'parameter',name:'self'},method:'as_str',args:[]}]}))fail('original String Index forwarding differs');
 const full=member(traits,owner(traits,'implSliceIndex<str>forops::RangeFull'),'index'),fullFlow=forwarding(full);
 if(full.signature!=='fnindex(self,slice:&str)->&Self::Output'||!isDeepStrictEqual(fullFlow.ir,{kind:'parameter',name:'slice'}))fail('original RangeFull indexing is not its complete identity view');
 const deref=member(alloc,owner(alloc,'implops::DerefforString'),'deref'),derefFlow=forwarding(deref),asStr=member(alloc,owner(alloc,'implString'),'as_str');
 if(!isDeepStrictEqual(derefFlow.ir,{kind:'method-call',receiver:{kind:'parameter',name:'self'},method:'as_str',args:[]})||asStr.signature!=='fnas_str(&self)->&str'||spelling(rustTokens(asStr.bodySource))!=='{unsafe{str::from_utf8_unchecked(self.vec.as_slice())}}')fail('original String view kernel differs');
 const routes=[originalUse(alloc,'usecore::str::pattern::{Pattern,Utf8Pattern};'),originalUse(alloc,'usecore::ops::{self,Range,RangeBounds};'),originalUse(traits,'usecrate::slice::SliceIndex;'),originalUse(traits,'usecrate::{ops,ptr,range};'),originalUse(core,'useself::pattern::{DoubleEndedSearcher,Pattern,ReverseSearcher,Searcher};')];
 const selected={entry,implementation,index,full,deref,asStr},publicSelections=Object.fromEntries(Object.entries(selected).map(([name,{ownerOriginal,...selection}])=>[name,selection]));
 const facts=freeze({schema:'original-standard-string-pattern-forwarding-v1',operation,sourceInputs:descriptors,selections:publicSelections,flows:{outer,pattern,indexFlow,fullFlow,derefFlow},routes,selectedTrait:['core','str','pattern','Pattern'],selectedArgument:['shared','alloc','string','String'],forwardedArgument:['shared','str'],stringViewKernel:{profile:'checked-standard-string-ownership-v1',utf8Validity:'existing checked String ABI',allocatorExecuted:false,unsafeExecuted:false,storageLayoutTranslated:false},borrowResult:'only the enclosing source boolean operation may consume this view',wholePatternTraitExecuted:false,namespaceAuthority:false,copyAuthority:false,runtimeParity:false});
 const token=Object.freeze({schema:'private-original-string-pattern-forwarding-v1'});issued.set(token,{facts,selections:selected,inputs:[alloc,core,traits]});cached.set(operation,token);return token;
}
export function requireOriginalStringPatternForwarding(token,operation){const state=issued.get(token);if(!state||state.facts.operation!==operation)fail('copied foreign or unissued original forwarding proof');return state.facts;}
