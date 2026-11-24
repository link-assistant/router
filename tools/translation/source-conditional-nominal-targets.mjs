// A lexical family is not an available type, a chosen cfg branch, or a layout.
// Consumers must independently close ancestor transforms and every nested or
// global implementation/macro obligation before excluding an outer impl.
import {createHash} from 'node:crypto';
import {types,isDeepStrictEqual} from 'node:util';
import {assertResolvedSourceScopeOrigin,isResolvedSourceScopeSet,originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {compilationProfile,itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
import {implementationTargetPath} from './project-nominal.mjs';
import {ownData,copyMetadata,metadataDigest} from './extensions/source-links.mjs';

const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
// Serialization digests remain public witnesses, never equality authority.
// Metadata snapshots reject accessors/proxies; structural comparison cannot
// assimilate an inherited toJSON hook or drop distinct own-data fields.
const same=(left,right)=>isDeepStrictEqual(copyMetadata(left),copyMetadata(right));
const fail=message=>{throw new TypeError('Original conditional nominal target: '+message);};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const span=item=>({start:item.start,end:item.end});
const tokens=item=>item.tokens.filter(token=>token.type!=='comment');
function callerOptions(options,withImplementation=false){
 if(!options||typeof options!=='object'||types.isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('plain own-data caller options required');
 const input={module:ownData(options,'module'),modules:ownData(options,'modules'),sourceScopes:ownData(options,'sourceScopes')};
 if(withImplementation)input.implementation=ownData(options,'implementation');
 return input;
}
function dataArray(value){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('plain dense original array required');
 const length=ownData(value,'length');if(!Number.isSafeInteger(length)||length<0||length>20000)fail('original array bound exceeded');
 const result=[];for(let at=0;at<length;at++)result.push(ownData(value,String(at)));return result;
}
function originalModule(module){
 if(types.isProxy(module)||!module||Object.getPrototypeOf(module)!==Object.prototype)fail('plain original module required');
 const file=ownData(module,'file'),source=ownData(module,'source'),path=dataArray(ownData(module,'path')),view=ownData(module,'sourceView');
 if(typeof file!=='string'||typeof source!=='string'||path.some(part=>typeof part!=='string')||!isSourceModuleView(view))fail('private complete source view required');
 // Origin validation below reads these optional fields. Validate descriptors
 // first, including fields that are absent, without invoking inherited getters.
 for(const key of ['compilationProfile','configurationCondition']){
  const property=Object.getOwnPropertyDescriptor(module,key);
  if(!property||!Object.hasOwn(property,'value'))fail('original module profile/condition data required');
 }
 const profile=copyMetadata(ownData(module,'compilationProfile'),{preserveKeyOrder:true});
 const normalizedProfile=compilationProfile(profile);
 if(!same(normalizedProfile,view.compilationProfile))fail('original source view/profile differs');
 const condition=ownData(module,'configurationCondition');if(!['active','inactive','unknown'].includes(condition))fail('original module condition required');
 const items=originalSourceModuleItems(module);return {module,file,source,path,view,condition,profile,normalizedProfile,items};
}
function context(input){
 const modules=dataArray(input.modules),rows=modules.map(originalModule);
 if(!isResolvedSourceScopeSet(input.sourceScopes))fail('private resolved source scopes required');
 const row=rows.find(row=>row.module===input.module);if(!row)fail('selected module is outside original modules');
 assertResolvedSourceScopeOrigin(input.sourceScopes,{modules:input.modules,compilationProfile:ownData(row.module,'compilationProfile')});
 // Keep the existing origin helper's behavior, then independently join the
 // private scope paths/profiles without relying on its serialized comparisons.
 for(const owner of rows){
  const joined=input.sourceScopes.filter(scope=>scope.file===owner.file&&same(scope.path,owner.path));
  if(joined.length!==1||!same(joined[0].compilationProfile,owner.normalizedProfile)||joined[0].configurationCondition!==owner.condition)fail('original scope path/profile/condition differs');
 }
 const scopes=input.sourceScopes.filter(scope=>scope.file===row.file&&same(scope.path,row.path));
 if(scopes.length!==1||row.condition!=='active'||scopes[0].configurationCondition!=='active')fail('target module/ancestor availability remains unresolved');
 const ancestors=input.sourceScopes.filter(scope=>scope.path.every((part,index)=>row.path[index]===part));
 if(ancestors.some(scope=>scope.configurationCondition!=='active'))fail('target module/ancestor availability remains unresolved');
 return {...row,scope:scopes[0],rows};
}
function configuration(item,profile){
 const result=itemConfiguration(item.tokens,profile);
 if(result.diagnostics.length)fail('original cfg grammar remains unresolved');
 // cfg is the existing source-owned three-valued builtin grammar. An unknown
 // cfg_attr is a transform, not another declaration with the same spelling.
 if(result.attributes.some(attribute=>attribute.name!=='cfg'&&!isInertConditionalAttribute(attribute)))fail('original attribute transformation remains unresolved');
 return result;
}
function outerHeader(item){
 const values=tokens(item),open=values.findIndex(token=>token.text==='{');
 if(open<0||values.at(-1)?.text!=='}')fail('complete original impl body required');
 const header=values.slice(0,open);
 if(header[0]?.text!=='impl'||header[1]?.text==='<'||header.some(token=>['#','unsafe','where','default','!'].includes(token.text)))fail('original impl header is outside the bounded target grammar');
 const forAt=header.findIndex(token=>token.text==='for'),target=forAt<0?header.slice(1):header.slice(forAt+1);
 const trait=forAt<0?[]:header.slice(1,forAt);
 if(forAt>=0&&(!trait.length||trait.some((token,index)=>index%2?token.text!=='::':token.type!=='ident')))fail('original trait header is outside the bounded target grammar');
 if(target.length!==1||target[0].type!=='ident')fail('unqualified nongeneric original nominal target required');
 return {header,target:target[0],traitPath:forAt<0?null:trait.filter(token=>token.text!=='::').map(token=>token.text),bodySpan:{start:values[open].start,end:values.at(-1).end},body:values.slice(open+1,-1)};
}
function census(current,target){
 const alternatives=[],uses=[],items=[],profile=current.profile;
 for(const item of current.items){
  const cfg=configuration(item,profile);items.push({span:span(item),term:item.term,configuration:cfg});
  if(cfg.status==='inactive'){
   // Inactive definitions are retained too; they are not selected as layouts.
   const head=originalDeclarationHeader(item,current.path);
   if(head?.name===target&&['struct','enum','union'].includes(head.kind))alternatives.push({item,head,cfg});
   continue;
  }
  const head=originalDeclarationHeader(item,current.path);
  if(!head)fail('module-level output or declaration grammar remains unresolved');
  if(head.kind==='use'){
   const leaves=originalUseDeclarationLeaves(item,current.path);uses.push({span:span(item),leaves,configuration:cfg});
   if(leaves.some(leaf=>leaf.glob||leaf.name===target))fail('possible import/alias target alternative remains unresolved');
  }else if(head.name===target){
   if(!['struct','enum','union'].includes(head.kind))fail('possible nonnominal target alternative remains unresolved');
   const values=tokens(item),name=values.findIndex(token=>token.start===head.nameSpan.start);
   if(values[name+1]?.text==='<')fail('generic nominal alternative remains unresolved');
   alternatives.push({item,head,cfg});
  }
 }
 const possible=alternatives.filter(row=>row.cfg.status!=='inactive');
 if(alternatives.length<2||possible.length===0||!alternatives.some(row=>row.cfg.attributes.some(attribute=>attribute.name==='cfg')))fail('complete conditional nominal alternatives required');
 const bindings=current.scope.bindings.filter(binding=>binding.namespace==='type'&&binding.name===target);
 if(bindings.length!==1)fail('exact original target binding required');
 const binding=bindings[0],expected=possible.map(row=>({source:current.file,span:span(row.item),via:'declaration'}));
 if(binding.via!=='declaration'||!['struct','enum','union'].includes(binding.kind)||!same(binding.evidence,expected))fail('resolver alternatives do not exhaust the original local nominal declarations');
 if(possible.length===1&&binding.status!=='resolved'&&binding.status!=='unresolved'||possible.length>1&&binding.status!=='ambiguous')fail('original conditional binding status differs');
 return {alternatives,uses,items,binding};
}
function inspect(implementation,input){
 const captured=copyMetadata(implementation),current=context(input),matches=current.items.filter(item=>item.term==='impl'&&same(span(item),captured.span));
 if(matches.length!==1||captured.sourcePath!==current.file||!same(captured.modulePath,current.path))fail('implementation requires its exact original source/view/path');
 const item=matches[0],cfg=configuration(item,current.profile);
 if(cfg.status!=='active')fail('outer impl availability remains unresolved');
 const selected=outerHeader(item);
 if(!same(captured.headerSpan,{start:selected.header[0].start,end:selected.header.at(-1).end}))fail('complete original header span differs');
 if(!same(captured.bodySpan,selected.bodySpan)||!same(captured.typePath,[selected.target.text])||!same(captured.traitPath,selected.traitPath)||!same(captured.genericParameters,[])||!same(captured.attributes,[]))fail('original implementation header/body selection differs');
 const path=implementationTargetPath(captured,{items:current.items});
 if(!same(path,[selected.target.text]))fail('source-selected target path differs');
 const lexical=census(current,selected.target.text),family=['crate',...current.path,selected.target.text];
 const alternatives=lexical.alternatives.map(row=>({kind:row.head.kind,nameSpan:row.head.nameSpan,span:span(row.item),sourceSha256:hash(current.source.slice(row.item.start,row.item.end)),configuration:row.cfg}));
 // These are obligations, never a claim that a lexical scan has exhausted
 // expansion effects. Full bodies/tokens stay in authenticated private backing.
 const residuals={ancestorAndGlobalOutputClosureRequired:true,nestedImplementationClosureRequired:true,nestedMacroOutputClosureRequired:true,
  originalBodySpan:captured.bodySpan,originalBodySha256:hash(current.source.slice(captured.bodySpan.start,captured.bodySpan.end)),
  originalBodyMarkers:selected.body.filter(token=>token.text==='#'||token.text==='impl'||token.text==='!'||token.text.endsWith('!')).map(token=>({text:token.text,span:span(token)}))};
 const evidence=freeze({schema:'original-conditional-lexical-nominal-target-v1',family,source:current.file,sourceSha256:hash(current.source),sourceViewDigest:current.view.digest,
  implementationSpan:span(item),headerSpan:captured.headerSpan,targetSpan:span(selected.target),alternatives,bindingSha256:metadataDigest(lexical.binding),
  compilationProfile:current.profile,residuals,layoutSelected:false,availabilityProved:false,copyAuthority:false,noDropAuthority:false,namespaceAuthority:false,runtimeAuthority:false});
 const backing=freeze({source:current.source,sourceView:current.view,path:[...current.path],implementation:captured,originalImpl:item,alternatives:lexical.alternatives.map(row=>({item:row.item,configuration:row.cfg})),
  originalLocalCensus:lexical.items,originalImports:lexical.uses,binding:lexical.binding,ancestorScopes:input.sourceScopes.filter(scope=>scope.path.every((part,index)=>current.path[index]===part))});
 return {evidence,backing,fingerprint:metadataDigest(captured)};
}
export function proveConditionalNominalTarget(implementation,options){
 const input=callerOptions(options),state=inspect(implementation,input),proof=Object.freeze({schema:state.evidence.schema,digest:metadataDigest(state.evidence)});
 issued.set(proof,{...state,implementation,input});return proof;
}
function authentic(proof,options){
 if(types.isProxy(proof))fail('private original target proof required');
 const state=issued.get(proof);if(!state)fail('private original target proof/caller association required');
 const input=callerOptions(options,true),{implementation,module,modules,sourceScopes}=input;
 if(implementation!==state.implementation||module!==state.input.module||modules!==state.input.modules||sourceScopes!==state.input.sourceScopes)fail('private original target proof/caller association required');
 const fresh=inspect(implementation,state.input);
 if(fresh.fingerprint!==state.fingerprint||!same(fresh.backing.implementation,state.backing.implementation)||!same(fresh.evidence,state.evidence))fail('original target proof source, implementation or context changed');
 return state;
}
export function conditionalNominalTargetFacts(proof,input){return authentic(proof,input).evidence;}
export function conditionalNominalTargetOriginals(proof,input){return authentic(proof,input).backing;}
