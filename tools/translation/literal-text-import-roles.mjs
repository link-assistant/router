// Declaration-role candidates for explicit owned-API adoption only. These facts
// cannot issue checker ownership, trait-dispatch, layout or runtime authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {posix} from 'node:path';
import {JSON_MACRO_SOURCE_PROFILE,jsonMacroDependencyProfile,jsonMacroOriginalSource} from './json-macro-inputs.mjs';
import {jsonMacroSourceDefinition,jsonMacroDefinitionSource} from './json-macro-sources.mjs';
import {sourceItems} from './rust-structure.mjs';
import {inspectConditionalAttribute} from './conditional-attributes.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveModuleBindings,originalUseDeclarationLeaves,originalDeclarationHeader} from './module-bindings.mjs';
import {stablePublicTypeCandidates,stablePublicReexportCandidates,originalPublicModuleCandidate} from './namespace-census.mjs';
import {originalNonTraitImportRole} from './extensions/primitive-import-roles.mjs';
import {originalCorePreludeRootSource} from './extensions/core-prelude-source.mjs';
import {itemConfiguration,evaluateConfiguration} from './cfg-profile.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((name,at)=>name===b[at]);
const nonTraits=new Set(['struct','enum','union','fn','const','static','mod']);
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
const pins=[
  {path:'std-time-1.89.0.rs.gz',bytes:28002,sha256:'0615fb015967bf283267650a92c706cbd9825d3d1dd6a5b0f36956716eb31d9a',archiveSha256:'88d78e0ee1925df76f879f0c75dde3445f5ab8d12ae988cacc2a077e3b69bec3'},
  {path:'core-time-1.89.0.rs.gz',bytes:62437,sha256:'66088e332e93cdda1517f313b63eacc673d5a5042ba2a734ee2b31c707ee2173',archiveSha256:'24f03ae41ec30ccf8d63a3c3661a364eba23417a2df42ec58760d9aad02be3a9'},
];
function original(pin,directory='literal-import-roles'){
  const encoded=readFileSync(new URL('./source-profiles/'+directory+'/'+pin.path,import.meta.url));
  if(hash(encoded)!==pin.archiveSha256)throw new TypeError('Literal import original archive differs');
  const raw=gunzipSync(encoded,{maxOutputLength:200000});
  if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)throw new TypeError('Literal import complete original differs');
  return {source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),sourceSha256:pin.sha256,path:pin.path};
}
const stdRoot=original({path:'rust-std-lib-1.89.0.rs.gz',bytes:28184,sha256:'d070a5abc5138536e274e483181db929cc56d7a4b7a1947a11149f92b2cdc1ea',archiveSha256:'d0216701dd8c129fb80a7c32ddd025de22d1420090a9fc7219384f06eecce065'},'namespace-standard');
const [stdTime,coreTime]=pins.map(pin=>original(pin)),coreRoot=originalCorePreludeRootSource();
const roots={std:originalPublicModuleCandidate(stdRoot.source,'time'),core:originalPublicModuleCandidate(coreRoot.source,'time')};
if(!roots.std||!roots.core)throw new TypeError('Literal import original time module routes differ');
function standardTypes(pin){
  const originals=sourceItems(pin.source),masked=[],annotations=[];
  for(const item of originals){const attributes=itemConfiguration(item.tokens,null).attributes;
    for(const attribute of attributes.filter(row=>row.name==='cfg_attr')){
      const tokens=item.tokens.filter(token=>token.type!=='comment'&&token.start>=attribute.span.start&&token.end<=attribute.span.end);
      let parsed;try{parsed=inspectConditionalAttribute(tokens.slice(2,-1));}catch{continue;}
      if(evaluateConfiguration(parsed.predicate,null).diagnostics.length||!parsed.attributes.length||!parsed.attributes.every(row=>row.tokens.length===3&&row.tokens[0]==='rustc_diagnostic_item'&&row.tokens[1]==='='))continue;
      const original=pin.source.slice(attribute.span.start,attribute.span.end),replacement=original.replace(/[^\r\n]/g,' ');
      if(replacement.length!==original.length)throw new TypeError('Conditional annotation source coordinates changed');
      masked.push({span:attribute.span,original,replacement});annotations.push({span:attribute.span,original,predicate:parsed.predicate.map(token=>token.text),payloads:parsed.attributes,alternatives:['annotation absent; same declaration kind','diagnostic-name annotation present; same declaration kind'],predicateSelected:false,attributeOwnerResolved:false});
    }
  }
  let source=pin.source;for(const edit of [...masked].sort((a,b)=>b.span.start-a.span.start))source=source.slice(0,edit.span.start)+edit.replacement+source.slice(edit.span.end);
  let restored=source;for(const edit of [...masked].sort((a,b)=>b.span.start-a.span.start)){if(restored.slice(edit.span.start,edit.span.end)!==edit.replacement)throw new TypeError('Conditional annotation inverse differs');restored=restored.slice(0,edit.span.start)+edit.original+restored.slice(edit.span.end);}if(restored!==pin.source)throw new TypeError('Complete conditional annotation inverse differs');
  return stablePublicTypeCandidates(source).map(candidate=>{
    const items=originals.filter(item=>item.end===candidate.span.end&&originalDeclarationHeader(item)?.name===candidate.name&&item.term===candidate.kind);if(items.length!==1)throw new TypeError('Conditional declaration has no exact original item');const item=items[0];
    return {...candidate,sourceSha256:pin.sourceSha256,itemSha256:hash(pin.source.slice(item.start,item.end)),span:{start:item.start,end:item.end},attributes:itemConfiguration(item.tokens,null).attributes,conditionalAnnotations:annotations.filter(row=>row.span.start>=item.start&&row.span.end<=item.end),normalizedCensusSourceSha256:hash(source),originalDeclarationRetained:true};
  });
}
const stdTypes=standardTypes(stdTime),coreTypes=standardTypes(coreTime);
function standardRole(segments){
  if(!['std','core'].includes(segments[0])||segments[1]!=='time'||segments.length<2||segments.length>3)return null;
  const owner=segments[0],root=owner==='std'?stdRoot:{...coreRoot,sourceSha256:coreRoot.sha256};
  const route=[{sourceSha256:root.sourceSha256,...roots[owner]}];
  if(segments.length===2)return {kind:'mod',route};
  const name=segments[2],direct=(owner==='std'?stdTypes:coreTypes).filter(row=>row.name===name&&nonTraits.has(row.kind));
  if(direct.length===1)return {kind:direct[0].kind,route:[...route,{...direct[0],file:owner==='std'?stdTime.path:coreTime.path}]};
  if(owner!=='std')return null;
  const exports=stablePublicReexportCandidates(stdTime.source).filter(row=>row.name===name&&row.path.length===3&&same(row.path.slice(0,2),['core','time']));
  if(exports.length!==1)return null;
  const declared=coreTypes.filter(row=>row.name===exports[0].path[2]&&nonTraits.has(row.kind));
  return declared.length===1?{kind:declared[0].kind,route:[...route,{...exports[0],file:stdTime.path},{...declared[0],file:coreTime.path}]}:null;
}
function closedDeclarations(module,profile){
  return originalSourceModuleItems(module).every(item=>{
    if(item.comment)return true;const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive')return true;
    if(condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name)))return false;
    if(item.term==='opaque')return false;
    if(item.term==='use')try{return originalUseDeclarationLeaves(item,module.path).every(leaf=>!leaf.glob);}catch{return false;}
    return !!originalDeclarationHeader(item,module.path)||item.term==='impl';
  });
}
// Optional Cargo inputs are ordinary source data, never a caller-issued binding
// table. A mismatched audited profile leaves external imports unclassified.
const roleChecks=new WeakMap();
function dependencySnapshot(input){
  if(input===undefined)return {value:undefined,verify(){}};
  if(!input||typeof input!=='object'||types.isProxy(input)||![null,Object.prototype].includes(Object.getPrototypeOf(input)))throw new TypeError('Literal import dependency inputs require own data');
  const prototype=Object.getPrototypeOf(input),keys=Reflect.ownKeys(input);if(keys.length!==2||!keys.includes('manifest')||!keys.includes('lock'))throw new TypeError('Literal import dependency fields differ');
  const fields=keys.map(key=>[key,Object.getOwnPropertyDescriptor(input,key)]),value=Object.create(null);
  for(const [key,d]of fields){if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||d.value.length>2_000_000)throw new TypeError('Literal import dependency source must be bounded primitive own data');value[key]=d.value;}
  return {value,verify(){const now=Reflect.ownKeys(input);if(Object.getPrototypeOf(input)!==prototype||!same(now,keys))throw new TypeError('Literal import dependency source keys changed');for(const [key,before]of fields){const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value')||d.value!==before.value||d.writable!==before.writable||d.enumerable!==before.enumerable||d.configurable!==before.configurable)throw new TypeError('Literal import dependency source changed');}}};
}
export function verifyLiteralTextImportRoles(roleFor){const check=roleChecks.get(roleFor);if(!check)throw new TypeError('Literal import role context required');check();}
const publicHead=item=>{const h=originalDeclarationHeader(item);if(!h)return null;const rows=item.tokens.filter(row=>row.type!=='comment'),at=rows.findIndex(row=>row.start===h.keywordSpan.start);return at>0&&rows[at-1].text==='pub'?h:null;};
const packageAttributes=new Set(['doc','derive','allow','warn','deny','forbid','must_use','inline','cold','deprecated','track_caller']);
function packageItem(item){const c=itemConfiguration(item.tokens,null);return c.status==='active'&&c.attributes.every(a=>packageAttributes.has(a.name));}
function externalRoles(inputs){
  if(!inputs)return null;const proof=jsonMacroDependencyProfile(inputs).proof;if(!proof)return null;
  const direct=JSON_MACRO_SOURCE_PROFILE.directDependency,entry=JSON_MACRO_SOURCE_PROFILE.packages.find(row=>row.name===direct.name),pins=new Map(),items=new Map();
  if(!entry)return null;
  const pin=path=>{if(!entry.members.some(row=>row.path===path))return null;if(!pins.has(path))pins.set(path,jsonMacroOriginalSource(proof,entry.name,path));return pins.get(path);};
  const rows=path=>{const source=pin(path);if(!source)return null;if(!items.has(path))items.set(path,sourceItems(source.source));return items.get(path);};
  const cargo=pin('Cargo.toml'),section=cargo?.source.match(/^\[lib\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1],paths=section?[...section.matchAll(/^path\s*=\s*"([^"\n]+)"\s*$/gm)]:[],names=section?[...section.matchAll(/^name\s*=\s*"([A-Za-z_][A-Za-z_0-9]*)"\s*$/gm)]:[];
  if(paths.length!==1||names.length!==1||names[0][1]!==entry.name.replaceAll('-','_')||!/^src\/(?:[A-Za-z_][A-Za-z_0-9]*\/)*[A-Za-z_][A-Za-z_0-9]*\.rs$/.test(paths[0][1]))return null;
  const root=paths[0][1],rootRows=rows(root);if(!rootRows)return null;
  const evidence=(path,item)=>({package:entry.name,version:entry.version,file:path,sourceSha256:pin(path).sha256,span:[item.start,item.end],original:pin(path).source.slice(item.start,item.end),attributes:itemConfiguration(item.tokens,null).attributes});
  const normalize=(segments,owner)=>{if(segments[0]==='crate')return segments.slice(1);let base=[...owner],at=segments[0]==='self'?1:0;while(segments[at]==='super'){if(!base.length)return null;base.pop();at++;}return [...base,...segments.slice(at)];};
  function module(owner,requirePublic=false){let file=root,route=[];
    for(let at=0;at<owner.length;at++){const matches=rows(file)?.filter(item=>item.term==='mod'&&item.name===owner[at])??[];if(matches.length!==1||requirePublic&&!publicHead(matches[0]))return null;const condition=itemConfiguration(matches[0].tokens,null);if(condition.status!=='active'||condition.attributes.some(a=>!packageAttributes.has(a.name)&&!(a.name==='macro_use'&&a.tokens.join('')==='#[macro_use]')))return null;const item=matches[0],tokens=item.tokens.filter(row=>row.type!=='comment');if(tokens.at(-1)?.text!==';')return null;
      const parent=at===0?posix.dirname(root):posix.dirname(file)+(posix.basename(file)==='mod.rs'?'':'/'+posix.basename(file,'.rs')),base=parent+'/'+owner[at],files=[base+'.rs',base+'/mod.rs'].filter(path=>pin(path));if(files.length!==1)return null;route.push(evidence(file,item));file=files[0];}
    return {file,route};
  }
  function declaration(path,seen=new Set(),requirePublic=true){
    const key=path.join('::');if(!path.length||path.length>16||seen.has(key)||seen.size>=32)return null;seen.add(key);
    const owner=path.slice(0,-1),selected=module(owner,requirePublic);if(!selected)return null;const all=rows(selected.file),name=path.at(-1),own=all.filter(item=>originalDeclarationHeader(item)?.name===name),exports=[];
    for(const item of all.filter(item=>item.term==='use'&&publicHead(item))){let leaves;try{leaves=originalUseDeclarationLeaves(item,owner);}catch{return null;}if(leaves.some(leaf=>leaf.glob))return null;for(const leaf of leaves.filter(leaf=>leaf.name===name)){if(!packageItem(item))return null;const next=normalize(leaf.segments,owner);if(!next)return null;exports.push({item,next});}}
    if(own.length+exports.length!==1)return null;
    if(own.length){const item=own[0],head=publicHead(item);if(!head||!nonTraits.has(head.kind)||!packageItem(item))return null;return {kind:head.kind,route:[...selected.route,evidence(selected.file,item)]};}
    const next=declaration(exports[0].next,new Set(seen),false);return next?{kind:next.kind,route:[...selected.route,evidence(selected.file,exports[0].item),...next.route]}:null;
  }
  function macro(name){
    // A complete pinned macro_export declaration is a bang namespace candidate.
    // No macro body is expanded and no invocation receives executable authority.
    for(const item of rootRows){const head=originalDeclarationHeader(item);if(head?.name===name)return null;if(item.term==='use'&&publicHead(item)){let leaves;try{leaves=originalUseDeclarationLeaves(item,[]);}catch{return null;}if(leaves.some(leaf=>leaf.glob||leaf.name===name))return null;}}
    const candidates=[];
    for(const edge of rootRows.filter(item=>item.term==='mod')){const c=itemConfiguration(edge.tokens,null),tokens=edge.tokens.filter(row=>row.type!=='comment');if(c.status!=='active'||tokens.at(-1)?.text!==';'||!c.attributes.some(a=>a.name==='macro_use')||c.attributes.some(a=>!packageAttributes.has(a.name)&&!(a.name==='macro_use'&&a.tokens.join('')==='#[macro_use]')))continue;
      const owner=module([edge.name]);if(!owner)continue;
      for(const item of rows(owner.file).filter(item=>item.name===name&&item.term==='macro_rules!')){const condition=itemConfiguration(item.tokens,null);if(condition.status!=='active'||!condition.attributes.some(a=>a.name==='macro_export'&&a.tokens.join('')==='#[macro_export]')||condition.attributes.some(a=>!packageAttributes.has(a.name)&&a.name!=='macro_export'))return null;
        let definition,source;try{definition=jsonMacroSourceDefinition(proof,name);source=jsonMacroDefinitionSource(definition);}catch{return null;}if(source.sourceSha256!==pin(owner.file).sha256||source.originalDefinitionSpan.start<item.start||source.originalDefinitionSpan.end>item.end)return null;candidates.push({kind:'macro',namespace:'macro',macroKind:'bang',route:[evidence(root,edge),evidence(owner.file,item)],definitionSource:source,expansionAuthority:false});}
    }
    return candidates.length===1?candidates[0]:null;
  }
  return segments=>{if(segments[0]!==names[0][1]||segments.length<2)return null;const role=declaration(segments.slice(1))??(segments.length===2?macro(segments[1]):null);return role?{...role,dependency:{manifestSha256:proof.manifestSha256,lockSha256:proof.lockSha256,profileSha256:proof.profileSha256,archiveSha256:entry.sha256,package:entry.name,version:entry.version},cargo:{file:'Cargo.toml',sourceSha256:cargo.sha256,crateRoot:root},namespaceComplete:false,originalDispatchProved:false,executableAdmission:false}:null;};
}
export function createLiteralTextImportRoles(modules,profile,dependencyInputs=undefined){
  // Resolver tables are created here from genuine complete graph views. No
  // caller-supplied bindings, public flags or copied candidate is accepted.
  const captured=dependencySnapshot(dependencyInputs),external=externalRoles(captured.value),evidence=resolveModuleBindings({modules,compilationProfile:profile}),facts={modules,evidence};captured.verify();
  const roleFor=(module,item,leaf)=>{
    if(leaf.glob||leaf.name==='_')return null;
    const exact=originalSourceModuleItems(module).find(row=>row===item||row.start===item.start&&row.end===item.end&&row.term==='use');
    if(!exact||!originalUseDeclarationLeaves(exact,module.path).some(row=>row.name===leaf.name&&same(row.segments,leaf.segments)))return null;
    const ancestors=modules.filter(owner=>owner.path.every((name,at)=>module.path[at]===name));
    const root=leaf.segments[0],shadowed=ancestors.some(owner=>originalSourceModuleItems(owner).some(row=>{
      if(row.comment||itemConfiguration(row.tokens,profile).status==='inactive')return false;
      const header=originalDeclarationHeader(row,owner.path);if(header?.name===root)return true;
      const words=row.tokens.filter(token=>token.type!=='comment').map(token=>token.text);if(words[0]==='extern'&&words[1]==='crate'&&(words[3]==='as'?words[4]:words[2])===root)return true;
      return row.term==='use'&&originalUseDeclarationLeaves(row,owner.path).some(imported=>imported.glob||imported.name===root);
    }));
    let role=!shadowed?(standardRole(leaf.segments)??external?.(leaf.segments)):null;
    const scope=evidence.scopes.find(row=>row.file===module.file&&same(row.path,module.path));
    const bindings=scope?.bindings.filter(row=>row.name===leaf.name&&row.span?.start===item.start&&row.span?.end===item.end&&row.status==='resolved')??[];
    if(!role&&bindings.length&&bindings.every(binding=>nonTraits.has(binding.kind))){
      const originalBindings=bindings.map(binding=>{
        const declaration=binding.declaration;if(!declaration)return null;
        const candidates=modules.flatMap(owner=>owner.file===declaration.source&&closedDeclarations(owner,profile)?originalSourceModuleItems(owner).filter(row=>row.start===declaration.span.start&&row.end===declaration.span.end&&nonTraits.has(row.term)&&row.term===binding.kind).map(row=>({owner,row})):[]);
        return candidates.length===1?originalNonTraitImportRole(facts,module,binding):null;
      });
      if(originalBindings.every(Boolean))role={kind:'original-graph-nontrait-candidate',originalBindings};
    }
    captured.verify();return role?{schema:'owned-literal-import-role-candidate-v1',name:leaf.name,segments:[...leaf.segments],import:{file:module.file,sourceSha256:hash(module.source),span:[item.start,item.end]},role,namespaceComplete:false,originalDispatchProved:false,executableAdmission:false}:null;
  };
  roleChecks.set(roleFor,captured.verify);return roleFor;
}
