// Original trait member names and bounded supertrait links only. This does not
// implement trait bodies, prove implementors or authorize arbitrary calls.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {createStaticSourceItemReader} from '../static-source-items.mjs';
import {itemConfiguration,isInertConditionalAttribute,evaluateConfiguration} from '../cfg-profile.mjs';
import {originalUseDeclarationLeaves,originalDeclarationHeader} from '../module-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {COPY_TRAIT_OWNER_PROFILE} from '../copy-trait-owners.mjs';
import {originalPrimitiveNamespaceSources} from './primitive-namespace-sources.mjs';
import {originalCorePreludeRootSource} from './core-prelude-source.mjs';
import {primitiveFromPinnedSource,primitiveFromNamespace} from './primitive-from-source.mjs';
import {inspectConditionalAttribute} from '../conditional-attributes.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
const fail=message=>{throw new TypeError('Original primitive trait closure: '+message);};
let registry,prelude;const coreProofs=new Map(),originalSourceItems=createStaticSourceItemReader();
function originals(){
  if(registry)return registry;const files=originalPrimitiveNamespaceSources();
  for(const suffix of ['marker.rs','fmt/mod.rs']){
    const pin=COPY_TRAIT_OWNER_PROFILE.sources.find(pin=>pin.url.endsWith('/core/src/'+suffix));
    const encoded=readFileSync(new URL('../source-profiles/copy-standard/'+pin.archive,import.meta.url)),raw=gunzipSync(encoded,{maxOutputLength:200000});
    if(hash(encoded)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('original standard trait source differs');
    files.set('library/core/src/'+suffix,{path:'library/core/src/'+suffix,source:raw.toString('utf8'),sha256:pin.sha256});
  }
  const convert=primitiveFromPinnedSource('library/core/src/convert/mod.rs');files.set(convert.path,convert);registry=files;return files;
}
const publicItem=item=>{
  const words=significant(item).map(token=>token.text),at=words.indexOf(item.term);
  let begin=at;while(begin>0&&['unsafe','auto'].includes(words[begin-1]))begin--;
  return begin>0&&words[begin-1]==='pub';
};
const normalize=(segments,owner)=>{
  if(segments[0]==='crate')return ['core',...segments.slice(1)];
  if(segments[0]==='core')return segments;
  if(segments[0]==='std')return ['core',...segments.slice(1)];
  let path=[...owner],at=segments[0]==='self'?1:0;
  while(segments[at]==='super'){if(path.length<=1)fail('standard supertrait import escapes its original root');path.pop();at++;}
  return [...path,...segments.slice(at)];
};
function commonPrelude(){
  if(prelude)return prelude;primitiveFromNamespace();const pin=primitiveFromPinnedSource('library/core/src/prelude/v1.rs'),map=new Map();
  for(const item of originalSourceItems(pin).filter(item=>item.term==='use'&&publicItem(item)))for(const leaf of originalUseDeclarationLeaves(item))if(!leaf.glob&&leaf.name!=='_'){
    if(map.has(leaf.name))fail('common original prelude has an ambiguous trait name');map.set(leaf.name,{path:normalize(leaf.segments,['core']),source:pin.path,sourceSha256:pin.sha256,span:{start:item.start,end:item.end}});
  }
  prelude=map;return map;
}
function coreDeclaration(path,seen=new Set()){
  if(path[0]!=='core'||path.length<3||seen.has(path.join('::'))||seen.size>=32)fail('standard trait route is absent, cyclic or over its bound');seen.add(path.join('::'));
  const root=originalCorePreludeRootSource();if(!originalSourceItems(root).some(item=>item.term==='mod'&&item.name===path[1]&&publicItem(item)))fail('standard trait has no original public core module');
  const owner=path.slice(0,-1),base='library/core/src/'+owner.slice(1).join('/'),pin=originals().get(base+'/mod.rs')??originals().get(base+'.rs');if(!pin)fail('standard trait source is unavailable');
  const items=originalSourceItems(pin),own=items.filter(item=>item.term==='trait'&&item.name===path.at(-1)&&publicItem(item));if(own.length===1)return {pin,item:own[0],owner,route:[]};if(own.length>1)fail('standard trait declaration is ambiguous');
  const candidates=[];
  for(const item of items.filter(item=>item.term==='use'&&publicItem(item)))for(const leaf of originalUseDeclarationLeaves(item,owner))if(!leaf.glob&&leaf.name===path.at(-1))candidates.push({path:normalize(leaf.segments,owner),item});
  if(candidates.length!==1)fail('standard trait requires a unique original named reexport');
  const result=coreDeclaration(candidates[0].path,new Set(seen));return {...result,route:[{source:pin.path,sourceSha256:pin.sha256,span:{start:candidates[0].item.start,end:candidates[0].item.end}},...result.route]};
}
function traitHeader(pin,item,{allowGenerics=false,localProfile=null,local=false,ownerPath=[],conditionalNamespaceAttributes=false}={}){
  const head=originalDeclarationHeader(item,ownerPath),tokens=significant(item),begin=head?tokens.findIndex(token=>token.start===head.keywordSpan.start):-1;
  if(head?.kind!=='trait'||head.name!==item.name||begin<0||tokens[begin+1]?.text!==item.name)fail('original trait header differs');
  let at=begin+2;
  if(tokens[at]?.text==='<'){
    if(!allowGenerics)fail('local generic trait method scope remains unproved');let depth=0;
    do{const word=tokens[at++]?.text;if(word==='<')depth++;else if(word==='>')depth--;else if(word==='>>')depth-=2;if(depth<0||at-begin>1024||['{','}',';'].includes(word))fail('standard generic header grouping is unproved');}while(depth&&at<tokens.length);
    if(depth)fail('standard generic header is unclosed');
  }
  const clauses=[];if(tokens[at]?.text===':'){
    at++;let start=at,depth=0;
    for(;at<tokens.length;at++){
      const word=tokens[at].text;
      if(depth===0&&(word==='+'||word==='{')){if(at===start)fail('supertrait clause is empty');clauses.push(tokens.slice(start,at));start=at+1;if(word==='{')break;}
      if(word==='<')depth++;else if(word==='>')depth--;else if(word==='>>')depth-=2;
      if(depth<0||depth>32||depth>0&&['{','}'].includes(word))fail('supertrait clause grouping is unproved');
    }
  }
  if(tokens[at]?.text!=='{'||tokens.at(-1)?.text!=='}')fail('trait aliases or incomplete trait bodies remain unproved');
  const members=sourceItems(pin.source.slice(tokens[at].end,tokens.at(-1).start));
  const memberHeads=new Map(members.filter(member=>!member.comment).map(member=>[member,originalDeclarationHeader(member)]));
  if([...memberHeads].some(([member,head])=>!head||!['fn','const','type'].includes(head.kind)||member.term!==head.kind))fail('trait contains a member namespace producer or unproved item');
  // Functions and associated constants share Rust's value namespace.
  // A type member has its separate namespace and cannot establish a value.
  if([...memberHeads.values()].some(head=>['fn','const'].includes(head.kind)&&head.name==='from'))fail('alternative trait declares its own from value member');
  const memberConditions=[];
  if(local)for(const member of members.filter(member=>!member.comment)){
    const condition=itemConfiguration(member.tokens,localProfile);
    // Absence of `from` is checked against every original member, including
    // both alternatives of an unresolved cfg. This does not select a target
    // or grant conditional member availability. Attribute producers still fail.
    const union=conditionalNamespaceAttributes&&condition.attributes.some(attribute=>attribute.name==='cfg_attr')&&condition.attributes.every(attribute=>attribute.name==='cfg_attr'?originalConditionalNamespaceAttribute(attribute):!attribute.evaluation?.diagnostics.length);
    if(condition.diagnostics.length&&!union||condition.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&!(union&&attribute.name==='cfg_attr')&&!['cfg','doc','allow','warn','deny','forbid','inline','cold','track_caller','must_use','deprecated'].includes(attribute.name)))fail('local trait member namespace is unproved: '+item.name+'.'+member.name+' ('+condition.status+'/'+condition.attributes.map(attribute=>attribute.name).join(',')+')');
    memberConditions.push({name:memberHeads.get(member).name,status:condition.status,attributes:condition.attributes.map(attribute=>({name:attribute.name,tokens:attribute.tokens})),availabilitySelected:false});
  }
  return {clauses,evidence:{name:item.name,source:pin.path,sourceSha256:pin.sha256,originalSpan:{start:item.start,end:item.end},fromMemberAbsent:true,originalMemberNames:[...memberHeads.values()].map(head=>({kind:head.kind,name:head.name})),memberConditions}};
}
// Original syntax census only. A caller must independently authenticate the
// source, public route, outer namespace and every inherited trait owner.
export const originalTraitMemberShape=(pin,item,options)=>traitHeader(pin,item,options);
// Both conditional alternatives preserve the written member namespace. This
// syntax fact selects neither feature availability nor an attribute owner.
export function originalConditionalNamespaceAttribute(attribute,{allowNoStd=false}={}){
 if(attribute?.name!=='cfg_attr'||!Array.isArray(attribute.tokens))return false;
 try{
  const begin=attribute.tokens.indexOf('cfg_attr');if(begin<0)return false;
  const tokens=attribute.tokens.slice(begin,-1).map(text=>({text})),input=inspectConditionalAttribute(tokens);
  return evaluateConfiguration(input.predicate,null).diagnostics.length===0&&input.attributes.length>0&&input.attributes.every(({tokens})=>
   tokens[0]==='doc'&&tokens.length===3&&tokens[1]==='='||
   ['allow','warn','deny','forbid'].includes(tokens[0])&&tokens[1]==='('&&tokens.at(-1)===')'||
   allowNoStd&&tokens.length===1&&tokens[0]==='no_std');
 }catch{return false;}
}
export function originalCorePreludeTraitClosure(name){
  const route=commonPrelude().get(name);if(!route)fail('trait lacks an original common prelude route');
  return {originalPreludeRoute:route,closure:originalCoreTraitClosure(route.path)};
}
function reference(tokens){
  const open=tokens.findIndex(token=>token.text==='<'),head=open<0?tokens:tokens.slice(0,open),path=[];
  if(!head.length||head.some((token,index)=>index%2===0?token.type!=='ident':token.text!=='::')||head.length%2===0)fail('supertrait path is not its bounded original path');
  for(let index=0;index<head.length;index+=2)path.push(head[index].text);
  return {path,originalArguments:open<0?[]:tokens.slice(open).map(token=>({text:token.text,type:token.type,start:token.start,end:token.end}))};
}
function coreName(owner,name){
  const base='library/core/src/'+owner.slice(1).join('/'),pin=originals().get(base+'/mod.rs')??originals().get(base+'.rs');if(!pin)fail('standard trait owner source is missing');
  const items=originalSourceItems(pin);if(items.some(item=>item.term==='trait'&&item.name===name))return [...owner,name];
  const imports=[];
  for(const item of items.filter(item=>item.term==='use'))for(const leaf of originalUseDeclarationLeaves(item,owner))if(!leaf.glob&&leaf.name===name)imports.push(normalize(leaf.segments,owner));
  if(imports.length===1)return imports[0];if(imports.length>1)fail('standard supertrait import is ambiguous');
  const entry=commonPrelude().get(name);if(!entry)fail('standard supertrait has no original prelude/import route');return entry.path;
}
export function originalCoreTraitClosure(path,seen=new Set()){
  const key=path.join('::');if(seen.has(key)||seen.size>=32)fail('standard supertrait closure is cyclic or over its bound');seen.add(key);if(coreProofs.has(key))return coreProofs.get(key);
  const selected=coreDeclaration(path);
  if(same(selected.owner,['core','convert'])&&selected.item.name==='From')return {sameOriginalFrom:primitiveFromNamespace(),originalSpan:{start:selected.item.start,end:selected.item.end},source:selected.pin.path,sourceSha256:selected.pin.sha256,wholeTraitAuthority:false,runtimeParity:false};
  const shape=traitHeader(selected.pin,selected.item,{allowGenerics:true,ownerPath:selected.owner}),supertraits=shape.clauses.map(tokens=>{
    const ref=reference(tokens),path=ref.path.length===1?coreName(selected.owner,ref.path[0]):normalize(ref.path,selected.owner);
    return {...ref,closure:originalCoreTraitClosure(path,new Set(seen))};
  });
  const proof={...shape.evidence,originalRoute:selected.route,supertraits,wholeTraitAuthority:false,runtimeParity:false};coreProofs.set(key,proof);return proof;
}
const localAbsolute=(segments,owner)=>{
  if(segments[0]==='crate')return segments.slice(1);let path=[...owner],at=segments[0]==='self'?1:0;
  if(!['self','super'].includes(segments[0]))return null;
  while(segments[at]==='super'){if(!path.length)return null;path.pop();at++;}return [...path,...segments.slice(at)];
};
function localReference(facts,owner,path,seen){
  if(['core','std'].includes(path[0])){
    if(path[0]==='std'&&!same(path.slice(1),['convert','From']))fail('standard-library trait reexport lacks its original route source');
    const ancestors=facts.evidence.scopes.filter(scope=>scope.path.every((part,index)=>owner.path[index]===part));
    if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&binding.name===path[0])))fail('standard supertrait root is shadowed in its original owner');
    return originalCoreTraitClosure(['core',...path.slice(1)]);
  }
  if(path.length===1){
    const items=originalSourceModuleItems(owner),own=items.filter(item=>item.term==='trait'&&item.name===path[0]);if(own.length===1)return originalLocalTraitClosure(facts,owner,own[0],seen);if(own.length>1)fail('local supertrait declaration is ambiguous');
    const imports=[];
    for(const item of items.filter(item=>item.term==='use'&&itemConfiguration(item.tokens,facts.evidence.compilationProfile).status==='active'))for(const leaf of originalUseDeclarationLeaves(item,owner.path))if(!leaf.glob&&leaf.name===path[0])imports.push(leaf.segments);
    if(imports.length===1)return localReference(facts,owner,imports[0],seen);if(imports.length>1)fail('local supertrait import is ambiguous');
    const scope=facts.evidence.scopes.find(scope=>scope.file===owner.file&&same(scope.path,owner.path));if(scope?.bindings.some(binding=>binding.namespace==='type'&&binding.name===path[0]))fail('local supertrait shadows its common prelude');
    const entry=commonPrelude().get(path[0]);if(!entry)fail('local supertrait lacks an original import/prelude route');return originalCoreTraitClosure(entry.path);
  }
  let absolute=localAbsolute(path,owner.path);
  if(!absolute){
    const scope=facts.evidence.scopes.find(scope=>scope.file===owner.file&&same(scope.path,owner.path));
    const binding=scope?.bindings.find(binding=>binding.namespace==='type'&&binding.name===path[0]);
    if(binding?.status!=='resolved'||binding.kind!=='mod'||binding.target?.[0]!=='crate')fail('local supertrait alias is unproved: '+path.join('::'));
    absolute=[...binding.target.slice(1),...path.slice(1)];
  }
  const module=facts.modules.find(module=>same(module.path,absolute.slice(0,-1)));if(!module)fail('local supertrait has no complete source module');
  const item=originalSourceModuleItems(module).filter(item=>item.term==='trait'&&item.name===absolute.at(-1));if(item.length!==1)fail('local supertrait declaration is absent or ambiguous');return originalLocalTraitClosure(facts,module,item[0],seen);
}
export function originalLocalTraitClosure(facts,owner,item,seen=new Set()){
  const key=owner.file+':'+item.start;if(seen.has(key)||seen.size>=32)fail('local supertrait closure is cyclic or over its bound');seen.add(key);
  const scope=facts.evidence.scopes.find(scope=>scope.file===owner.file&&same(scope.path,owner.path));
  if(!scope||scope.configurationCondition!=='active'||scope.unresolvedTypeScope||scope.unresolvedAttributeMacroScope||itemConfiguration(item.tokens,facts.evidence.compilationProfile).status!=='active')fail('local trait owner namespace or condition is unproved');
  const ancestors=facts.modules.filter(module=>module.path.every((part,index)=>owner.path[index]===part));
  if(ancestors.some(module=>originalSourceModuleItems(module).some(item=>item.tokens[1]?.text==='!'&&significant(item).some(token=>['no_core','no_implicit_prelude'].includes(token.text)))))fail('local supertrait prelude is disabled');
  const shape=traitHeader({path:owner.file,source:owner.source,sha256:hash(owner.source)},item,{local:true,localProfile:facts.evidence.compilationProfile,ownerPath:owner.path}),supertraits=shape.clauses.map(tokens=>{const ref=reference(tokens);return {...ref,closure:localReference(facts,owner,ref.path,new Set(seen))};});
  return {...shape.evidence,supertraits,wholeTraitAuthority:false,runtimeParity:false};
}
