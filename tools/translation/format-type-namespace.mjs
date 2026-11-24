// Source type-name joins for imported fmt paths. Partial external tables never
// establish globs, executable trait methods or caller-wide namespace closure.
import {matchesParserFacts} from './matches-macro-context.mjs';
import {moduleScopeKey,originalSourceModuleItems} from './source-module-views.mjs';
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {copyMetadata,metadataDigest,ownData} from './extensions/source-links.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {originalMethodMember} from './impl-resolver.mjs';
const contexts=new WeakMap(),proofs=new WeakMap(),same=(a,b)=>metadataDigest(a)===metadataDigest(b),fail=message=>{throw new TypeError('original fmt type namespace: '+message);};
export function captureOriginalFmtTypeNamespace(parser){
 const state=matchesParserFacts(parser),evidence=freezeMacroTree({schema:'original-fmt-type-namespace-context-v1',originalContextDigest:metadataDigest(state.context),source:state.module.file,module:state.module.path,sourceViewDigest:state.module.sourceView.digest,namespaceComplete:false,runtimeAuthority:false});contexts.set(evidence,{parser,state});return evidence;
}
function originalContext(context){const issued=contexts.get(context);if(!issued||matchesParserFacts(issued.parser)!==issued.state)fail('copied, stale or foreign original parser context');return issued.state;}
function originalModule(state,carrier){
 const file=ownData(carrier,'file'),path=copyMetadata(ownData(carrier,'path')),module=state.facts.modules.find(module=>module.file===file&&same(module.path,path));
 if(!module||ownData(carrier,'source')!==module.source||ownData(carrier,'sourceView')!==module.sourceView)fail('module differs from its complete original source/view/path');originalSourceModuleItems(module);return module;
}
function scopeFor(state,module){
 const ancestors=state.facts.evidence.scopes.filter(scope=>scope.path.every((part,index)=>module.path[index]===part)),scope=ancestors.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module));
 if(!scope||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedAttributeMacroScope!==false))fail('original type owner has unresolved condition/attribute scope');
 if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&['std','core'].includes(binding.name))))fail('original standard root is shadowed/imported');
 return {scope,ancestors};
}
export function resolveOriginalFmtTypePath(context,carrier,written,expected){
 const state=originalContext(context),module=originalModule(state,carrier),path=copyMetadata(written);if(!Array.isArray(path)||!path.length||path.some(part=>typeof part!=='string'||!part))fail('complete written type path required');
 const {scope,ancestors}=scopeFor(state,module);let target=path,binding=null;
 if(!['std','core'].includes(path[0])){
  const matches=scope.bindings.filter(binding=>binding.namespace==='type'&&binding.name===path[0]);
  if(matches.length!==1||matches[0].status!=='resolved'||!Array.isArray(matches[0].target)||matches[0].via!=='named-import'||ancestors.some(scope=>scope.unresolvedTypeScope!==false))fail('imported formatting type requires its unique resolved original named type binding');
  binding=matches[0];target=[...binding.target,...path.slice(1)];
  const visible=!binding.visibility||binding.visibility.kind==='public'||binding.visibility.path.every((part,index)=>module.path[index]===part);if(!visible)fail('original imported formatting type is inaccessible');
 }
 if(target.length!==3||!['std','core'].includes(target[0])||target[1]!=='fmt'||target[2]!==expected)fail('actual imported target is a different formatting type owner');
 const facts=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>fact.name===expected&&same(fact.target,['std','fmt',expected]));if(facts.length!==1||!isStandardNamespaceEvidence(facts[0]))fail('original standard formatting type/reexports are unavailable');
 const fact=facts[0];if(fact.declaration.name!==expected||fact.declaration.kind!==fact.kind)fail('original formatting declaration/type category differs');
 const evidence=freezeMacroTree({schema:'original-imported-fmt-type-path-v1',source:module.file,module:module.path,sourceViewDigest:module.sourceView.digest,compilationProfile:state.facts.compilationProfile,written:path,target,binding,scopeDigest:metadataDigest(scope),originalContextDigest:context.originalContextDigest,originalStandardType:fact,namespaceComplete:false,runtimeAuthority:false});proofs.set(evidence,{context,state,module});return evidence;
}
export function originalFmtTypePathFacts(proof,context){const state=proofs.get(proof);if(!state||state.context!==context||originalContext(context)!==state.state)fail('copied or foreign original formatting type join');return state;}
// A failed Display join is not an exclusion. Only a resolved original trait
// declaration, or another pinned original fmt trait, proves a different owner.
export function proveOriginalDisjointDisplayTrait(context,carrier,written){
 const state=originalContext(context),module=originalModule(state,carrier),path=copyMetadata(written),{scope,ancestors}=scopeFor(state,module);
 if(!Array.isArray(path)||!path.length||path.some(part=>typeof part!=='string'||!part)||ancestors.some(scope=>scope.unresolvedTypeScope!==false))fail('unresolved original trait path may overlap Display');
 let owner=scope,target,binding=null,at=0;
 const visible=binding=>binding.visibility?.kind==='public'||binding.visibility?.kind==='restricted'&&binding.visibility.path.every((part,index)=>module.path[index]===part);
 if(['std','core'].includes(path[0])){target=path;at=path.length;}
 else{
  if(path[0]==='crate'){owner=state.facts.evidence.scopes.find(scope=>scope.path.length===0);at++;}
  else if(path[0]==='self')at++;
  else if(path[0]==='super'){const parent=[...module.path];while(path[at]==='super'){if(!parent.length)fail('trait owner has no original parent');parent.pop();at++;}owner=state.facts.evidence.scopes.find(scope=>same(scope.path,parent));}
  for(;at<path.length;at++){
   if(!owner||owner.configurationCondition!=='active'||owner.unresolvedTypeScope!==false||owner.unresolvedAttributeMacroScope!==false)fail('trait owner module remains unresolved');
   const matches=owner.bindings.filter(binding=>binding.namespace==='type'&&binding.name===path[at]);
   if(matches.length!==1||matches[0].status!=='resolved'||!Array.isArray(matches[0].target)||matches[0].via==='glob-import'||!visible(matches[0]))fail('unresolved original trait alias may overlap Display');
   binding=matches[0];target=binding.target;
   if(at+1<path.length){if(binding.kind!=='mod')fail('trait path intermediate owner is not a source module');if(['std','core'].includes(target[0])){target=[...target,...path.slice(at+1)];break;}owner=state.facts.evidence.scopes.find(scope=>same(['crate',...scope.path],target));}
  }
 }
 let originalStandardType=null,originalDeclaration=null;
 if(target?.length===3&&['std','core'].includes(target[0])&&target[1]==='fmt'){
  if(target[2]==='Display')fail('resolved trait is the original Display owner');
  const facts=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>same(fact.target,['std','fmt',target[2]])&&fact.kind==='trait'&&isStandardNamespaceEvidence(fact));if(facts.length!==1)fail('different standard trait declaration is unproved');originalStandardType=facts[0];
 }else{
  if(target?.[0]!=='crate'||binding?.kind!=='trait')fail('different original trait declaration is unproved');
  const declarationOwner=state.facts.evidence.scopes.find(scope=>same(['crate',...scope.path],target.slice(0,-1))),declarationBinding=declarationOwner?.bindings.find(binding=>binding.namespace==='type'&&binding.name===target.at(-1)&&binding.via==='declaration'&&binding.status==='resolved'&&binding.kind==='trait'&&same(binding.target,target)),declarationModule=state.facts.modules.find(module=>module.file===declarationOwner?.file&&same(module.path,declarationOwner.path));
  const item=declarationBinding&&declarationModule&&originalSourceModuleItems(declarationModule).find(item=>item.term==='trait'&&item.name===target.at(-1)&&item.start===declarationBinding.span.start&&item.end===declarationBinding.span.end);if(!item)fail('different trait lacks its actual original declaration');
  const tokens=item.tokens.filter(token=>token.type!=='comment'),traitAt=tokens.findIndex(token=>token.text==='trait'),open=tokens.findIndex(token=>token.type==='punct'&&token.text==='{'),header=tokens.slice(traitAt+2,open);
  if(traitAt<0||tokens[traitAt+1]?.text!==target.at(-1)||open<=traitAt+1||tokens.at(-1)?.text!=='}'||header.some(token=>['=','<','>','>>'].includes(token.text)))fail('trait alias or generic header does not prove a distinct nominal trait declaration');
  originalDeclaration={source:declarationModule.file,module:declarationModule.path,sourceViewDigest:declarationModule.sourceView.digest,span:{start:item.start,end:item.end},original:declarationModule.source.slice(item.start,item.end)};
 }
 const evidence=freezeMacroTree({schema:'original-disjoint-display-trait-owner-v1',source:module.file,module:module.path,sourceViewDigest:module.sourceView.digest,originalContextDigest:context.originalContextDigest,written:path,target,binding,originalStandardType,originalDeclaration,namespaceComplete:false,runtimeAuthority:false});proofs.set(evidence,{context,state,module});return evidence;
}
// This is a schema parse, not string rewriting. Every original type position
// resolves independently, including different aliases for Formatter and Result.
export function resolveOriginalDisplaySignature(context,carrier,method,formatterName){
 const state=originalContext(context),module=originalModule(state,carrier),origin=originalMethodMember(method);
 if(origin.source!==module.source||origin.sourcePath!==module.file||origin.sourceView!==module.sourceView||!same(origin.modulePath,module.path)||!same(origin.compilationProfile,state.facts.compilationProfile))fail('Display signature differs from its private original method/module/context');
 const tokens=copyMetadata(method.signatureTokens).map(token=>token.text);let at=0;const take=text=>{if(tokens[at++]!==text)fail('complete original shared Display signature differs');};
 for(const token of ['fn','fmt','(','&','self',',',formatterName,':','&','mut'])take(token);
 const typePath=stop=>{const path=[];for(;;){const token=tokens[at++];if(typeof token!=='string'||!/^(?:r#)?[A-Za-z_][A-Za-z0-9_]*$/u.test(token))fail('original formatting type path identifier is unsupported');path.push(token);if(tokens[at]==='::'){at++;continue;}if(tokens[at]!==stop)fail('complete original formatting type path boundary differs');return path;}};
 const formatter=resolveOriginalFmtTypePath(context,carrier,typePath('<'),'Formatter');for(const token of ['<',"'_",'>',')','->'])take(token);
 const result=resolveOriginalFmtTypePath(context,carrier,typePath(undefined),'Result');if(at!==tokens.length)fail('extra original Display signature syntax');return freezeMacroTree({schema:'original-display-format-signature-type-joins-v1',source:module.file,module:module.path,sourceViewDigest:module.sourceView.digest,methodDigest:origin.methodDigest,implementationSpan:origin.implementationSpan,signatureSpan:method.signatureSpan,originalSignature:module.source.slice(method.signatureSpan.start,method.signatureSpan.end),formatter,result,namespaceComplete:false,runtimeAuthority:false});
}
