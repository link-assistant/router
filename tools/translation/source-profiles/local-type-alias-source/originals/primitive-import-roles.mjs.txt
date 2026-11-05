// Prove only that a particular original import cannot add a competing trait.
// Conditional availability is retained; no body, layout or callee is admitted.
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves,originalDeclarationHeader} from '../module-bindings.mjs';
import {originalPrimitiveNamespaceSources,PRIMITIVE_NAMESPACE_SOURCE_PROFILE} from './primitive-namespace-sources.mjs';
import {originalCorePreludeRootSource} from './core-prelude-source.mjs';
import {itemConfiguration,isInertConditionalAttribute} from '../cfg-profile.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
const nonTraits=new Set(['struct','union','enum','mod','fn','const','static','macro']);
const publicItem=item=>{const words=significant(item).map(token=>token.text),at=words.indexOf(item.term);return at>0&&words[at-1]==='pub'||item.term==='fn'&&words.slice(Math.max(0,at-3),at).includes('pub')&&!words.slice(Math.max(0,at-3),at).includes('(');};
let architecture;
function architectureCensus(){
  if(architecture)return architecture;
  const names=new Set(),declarations=new Map(),aliases=[],files=[];
  for(const [path,pin]of originalPrimitiveNamespaceSources()){
    if(!path.startsWith('crates/core_arch/src/'))continue;
    const tokens=rustTokens(pin.source).filter(token=>token.type!=='comment');
    const localDeclarations=new Set();declarations.set(path,localDeclarations);
    for(let at=0;at<tokens.length;at++){
      if(tokens[at].text==='trait'){
        const name=tokens[at+1];if(name?.type!=='ident'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name.text))throw new TypeError('Original architecture has a generated or unproved trait name');
        names.add(name.text);
      }
      if(['fn','struct','union','enum','type','macro'].includes(tokens[at].text)&&tokens[at+1]?.type==='ident')localDeclarations.add(tokens[at+1].text);
      if(tokens[at].text==='pub'&&tokens[at+1]?.text==='use'){
        let end=at+2;while(end<tokens.length&&tokens[end].text!==';')end++;
        if(end===tokens.length)throw new TypeError('Original architecture has an unclosed public import');
        const body=tokens.slice(at+2,end),first=body[0]?.text;
        if(first==='core'&&body.map(token=>token.text).join('')!=='core::arch::asm')throw new TypeError('Original architecture has an unproved external public trait import');
        if(['std','alloc'].includes(first))throw new TypeError('Original architecture has an unproved external public trait import');
        for(let index=0;index<body.length;index++)if(body[index].text==='as'){
          if(body[index-1]?.type!=='ident'||body[index+1]?.type!=='ident')throw new TypeError('Original architecture has an unproved public import alias');
          aliases.push([body[index-1].text,body[index+1].text]);
        }
      }
    }
    files.push({path,sha256:pin.sha256});
  }
  let changed=true;while(changed){changed=false;for(const [from,to]of aliases)if(names.has(from)&&!names.has(to)){names.add(to);changed=true;}}
  if(files.length!==135)throw new TypeError('Original architecture trait candidate census is incomplete');
  architecture={names,declarations,evidence:{schema:'original-architecture-trait-candidate-superset-v1',profileSha256:PRIMITIVE_NAMESPACE_SOURCE_PROFILE.manifestSha256,sourceFiles:files.length,sourceDigest:hash(JSON.stringify(files)),traitCandidates:names.size,namespaceComplete:false,runtimeParity:false}};return architecture;
}
const familyRoutes=new Map();
const bodyItems=(pin,item)=>{
  const tokens=significant(item),open=tokens.findIndex(token=>token.text==='{');
  if(open<0||tokens.at(-1)?.text!=='}')throw new TypeError('Original architecture module lacks a complete body');
  return sourceItems(pin.source.slice(tokens[open].end,tokens.at(-1).start));
};
function architectureModule(owner,files,depth=0){
  if(depth>16||!owner.length)return [];
  const base='crates/core_arch/src/'+owner.join('/'),file=files.get(base+'/mod.rs')??files.get(base+'.rs');
  if(file)return [file];
  const result=[];
  // Keep every original conditional inline module. A namespace absence proof
  // uses their union and cannot choose an architecture or enable an intrinsic.
  for(const parent of architectureModule(owner.slice(0,-1),files,depth+1))for(const declaration of sourceItems(parent.source).filter(item=>item.term==='mod'&&item.name===owner.at(-1))){
    const tokens=significant(declaration),open=tokens.findIndex(token=>token.text==='{');if(open<0||tokens.at(-1)?.text!=='}')return [];
    result.push({...parent,source:parent.source.slice(tokens[open].end,tokens.at(-1).start)});
  }
  return result;
}
function architectureRouteFiles(family){
  if(familyRoutes.has(family))return familyRoutes.get(family);
  const files=originalPrimitiveNamespaceSources(),root=files.get('crates/core_arch/src/mod.rs');
  const arch=sourceItems(root.source).filter(item=>item.term==='mod'&&item.name==='arch'&&publicItem(item));if(arch.length!==1)return [];
  const archItems=bodyItems(root,arch[0]),actual=archItems.filter(item=>item.term==='mod'&&item.name===family&&publicItem(item));if(actual.length!==1)return [];
  // Child spans belong to the original module body, so retain that exact slice.
  const rootTokens=significant(arch[0]),start=rootTokens.find(token=>token.text==='{').end;
  const archPin={source:root.source.slice(start,rootTokens.at(-1).start)};
  const pending=[];
  const route=(segments,owner)=>{
    if(same(segments.slice(0,2),['crate','core_arch']))return segments.slice(2);
    if(segments[0]==='self')return [...owner,...segments.slice(1)];
    if(segments[0]==='super')return absolute(segments,owner);
    return [...owner,...segments];
  };
  for(const item of bodyItems(archPin,actual[0]).filter(item=>item.term==='use'&&publicItem(item)))for(const leaf of originalUseDeclarationLeaves(item)){
    if(!leaf.glob||!same(leaf.segments.slice(0,2),['crate','core_arch']))return [];
    pending.push(leaf.segments.slice(2));
  }
  const result=[],seen=new Set();
  while(pending.length){
    const owner=pending.pop(),key=owner.join('/');if(seen.has(key))continue;seen.add(key);if(seen.size>135)throw new TypeError('Original architecture export route exceeds its source bound');
    const modules=architectureModule(owner,files);if(!modules.length)return [];
    for(const pin of modules){
      if(!result.includes(pin.path))result.push(pin.path);
      for(const item of sourceItems(pin.source).filter(item=>item.term==='use'&&publicItem(item)))for(const leaf of originalUseDeclarationLeaves(item,owner))if(leaf.glob){const next=route(leaf.segments,owner);if(!next)return [];pending.push(next);}
    }
  }
  familyRoutes.set(family,result);return result;
}
function coreRole(path,depth=0){
  if(depth>16||path[0]!=='core'||path.length<2)return null;
  const root=originalCorePreludeRootSource(),files=originalPrimitiveNamespaceSources();
  const first=sourceItems(root.source).filter(item=>item.term==='mod'&&item.name===path[1]&&publicItem(item));if(first.length!==1)return null;
  if(path.length===2)return {kind:'mod',source:root.path,sourceSha256:root.sha256,span:{start:first[0].start,end:first[0].end}};
  if(path[1]==='arch'&&path.length===4&&['x86','x86_64','aarch64'].includes(path[2])){
    const bridge=files.get('library/core/src/arch.rs');
    if(!sourceItems(bridge.source).filter(item=>item.term==='use'&&publicItem(item)).some(item=>originalUseDeclarationLeaves(item).some(leaf=>leaf.glob&&same(leaf.segments,['crate','core_arch','arch']))))return null;
    const census=architectureCensus(),routes=architectureRouteFiles(path[2]);if(census.names.has(path[3])||!routes.some(file=>census.declarations.get(file)?.has(path[3])))return null;
    return {kind:'original-architecture-nontrait-candidate',path,originalCoreBridge:{source:bridge.path,sourceSha256:bridge.sha256},originalExportFiles:routes,evidence:census.evidence};
  }
  if(path[1]==='arch'&&path.length===3){
    const pin=files.get('library/core/src/arch.rs'),items=sourceItems(pin.source).filter(item=>item.name===path[2]&&nonTraits.has(item.term)&&publicItem(item));
    if(items.length===1)return {kind:items[0].term,source:pin.path,sourceSha256:pin.sha256,span:{start:items[0].start,end:items[0].end}};
  }
  const target=path.at(-1),owner=path.slice(1,-1),base='library/core/src/'+owner.join('/'),pin=files.get(base+'/mod.rs')??files.get(base+'.rs');
  if(!pin)return null;const items=sourceItems(pin.source);
  const own=items.filter(item=>item.name===target&&nonTraits.has(item.term)&&publicItem(item));
  if(own.length===1)return {kind:own[0].term,source:pin.path,sourceSha256:pin.sha256,span:{start:own[0].start,end:own[0].end}};
  const results=[];
  for(const item of items.filter(item=>item.term==='use'&&publicItem(item))){
    for(const leaf of originalUseDeclarationLeaves(item,owner))if(!leaf.glob&&leaf.name===target){
      let segments=leaf.segments;if(segments[0]==='self')segments=segments.slice(1);
      if(['crate','super','core'].includes(segments[0]))continue;
      const role=coreRole(['core',...owner,...segments],depth+1);if(role)results.push({...role,reexport:{source:pin.path,sourceSha256:pin.sha256,span:{start:item.start,end:item.end}}});
    }
  }
  return results.length===1?results[0]:null;
}
const absolute=(segments,owner)=>{
  if(segments[0]==='crate')return segments.slice(1);
  let result=[...owner],at=segments[0]==='self'?1:0;
  if(segments[0]!=='self'&&segments[0]!=='super')return null;
  while(segments[at]==='super'){if(!result.length)return null;result.pop();at++;}return [...result,...segments.slice(at)];
};
function conditionalModuleNames(facts,owner){
  // The general binder deliberately marks a conditional module unresolved.
  // Inspect only its complete original item namespace, preserving that flag.
  // Arbitrary attribute/bang producers and foreign declarations still refuse.
  return originalSourceModuleItems(owner).every(item=>{
    if(item.comment)return true;
    const head=originalDeclarationHeader(item,owner.path);
    if(!head||head.kind!==item.term)return false;
    const condition=itemConfiguration(item.tokens,facts.evidence.compilationProfile);
    return condition.diagnostics.length===0&&condition.attributes.every(attribute=>isInertConditionalAttribute(attribute)||['cfg','doc','allow','warn','deny','forbid','inline','cold','must_use','deprecated','track_caller'].includes(attribute.name));
  });
}
const coreRootUnshadowed=(facts,owner)=>!facts.evidence.scopes.filter(scope=>scope.path.every((part,index)=>owner.path[index]===part)).some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&binding.name==='core'));
function localRole(facts,module,segments,depth=0){
  if(depth>16)return null;if(segments[0]==='core')return coreRootUnshadowed(facts,module)?coreRole(segments):null;
  const path=absolute(segments,module.path);if(!path)return null;
  const owner=facts.modules.find(candidate=>same(candidate.path,path.slice(0,-1)));if(!owner)return null;
  const scope=facts.evidence.scopes.find(scope=>scope.file===owner.file&&same(scope.path,owner.path));
  if(!scope||!conditionalModuleNames(facts,owner))return null;
  const name=path.at(-1),items=originalSourceModuleItems(owner),heads=new Map(items.filter(item=>!item.comment).map(item=>[item,originalDeclarationHeader(item,owner.path)]));
  const declared=items.filter(item=>heads.get(item)?.name===name&&nonTraits.has(heads.get(item)?.kind));
  const competing=[...heads.values()].some(head=>head?.kind==='trait'&&head.name===name);if(competing)return null;
  const roles=[];if(declared.length===1)roles.push({kind:declared[0].term,source:owner.file,sourceSha256:hash(owner.source),span:{start:declared[0].start,end:declared[0].end}});
  for(const item of items.filter(item=>item.term==='use'&&publicItem(item))){
    for(const leaf of originalUseDeclarationLeaves(item,owner.path)){
      if(leaf.glob&&leaf.segments[0]==='core'&&leaf.segments[1]==='arch'){
        if(!coreRootUnshadowed(facts,owner))return null;
        const role=coreRole([...leaf.segments,name]);if(role)roles.push(role);else return null;
      }else if(!leaf.glob&&leaf.name===name){const role=localRole(facts,owner,leaf.segments,depth+1);if(role)roles.push(role);else return null;}
      else if(leaf.glob)return null;
    }
  }
  return roles.length?{kind:'original-import-nontrait-candidate',originalRoles:roles}:null;
}
export function originalNonTraitImportRole(facts,consumer,binding){
  if(binding.status==='ambiguous'||!binding.span||binding.source!==consumer.file)return null;
  const item=originalSourceModuleItems(consumer).find(item=>item.start===binding.span.start&&item.end===binding.span.end);if(!item)return null;
  const head=originalDeclarationHeader(item,consumer.path);
  if(binding.via==='declaration'&&head?.name===binding.name&&head.kind===item.term&&nonTraits.has(head.kind))return {kind:head.kind,source:consumer.file,sourceSha256:hash(consumer.source),span:{start:item.start,end:item.end}};
  if(item.term!=='use')return null;
  const candidates=originalUseDeclarationLeaves(item,consumer.path).filter(leaf=>!leaf.glob&&leaf.name===binding.name);if(candidates.length!==1)return null;
  const role=localRole(facts,consumer,candidates[0].segments);return role?{...role,originalImport:{source:consumer.file,sourceSha256:hash(consumer.source),span:{start:item.start,end:item.end},segments:candidates[0].segments},conditionalAvailabilityRetained:true,namespaceComplete:false,runtimeParity:false}:null;
}
