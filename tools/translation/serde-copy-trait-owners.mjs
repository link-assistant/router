import {freezeMacroTree} from './macro-token-trees.mjs';
// A manual non-Drop trait implementation can leave a separately proved Copy
// layout intact. Its methods remain uncompiled, including generic Deserialize.
import {createHash} from 'node:crypto';
import {originalSerdeCopyTraitInputs,isOriginalSerdeCopyTraitInputs} from './serde-copy-trait-inputs.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveModuleBindings,isResolvedSourceScopeSet} from './module-bindings.mjs';
import {externalModuleBindings} from './registered-bindings.mjs';
import {implementationTargetPath} from './project-nominal.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),owners=new WeakMap();
const fingerprint=value=>hash(JSON.stringify({trait:value.traitPath,type:value.typePath,generics:value.genericParameters,source:value.sourcePath,module:value.modulePath,span:value.span,header:value.headerSpan,attributes:value.attributes,diagnostics:value.diagnostics,resolvedType:value.resolvedType,resolvedNominalTarget:value.resolvedNominalTarget}));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function originalHeader(implementation,module){
 const item=originalSourceModuleItems(module).find(item=>item.term==='impl'&&item.start===implementation.span.start&&item.end===implementation.span.end);if(!item)return null;
 const written=item.tokens.filter(token=>token.type!=='comment'),open=written.findIndex(token=>token.text==='{'),head=written.slice(0,open),begin=head.findIndex(token=>token.text==='impl');
 if(begin<0||open<0||head.slice(0,begin).some(token=>['cfg','cfg_attr','unsafe','default','derive'].includes(token.text)))return null;
 // Nested implementations and unresolved item/attribute macro output cannot
 // hide an additional Drop/Copy impl behind the source-owned outer header.
 if(written.slice(open+1,-1).some(token=>token.text==='#'||['impl','macro_rules','unsafe','extern','mod','trait','struct','enum'].includes(token.text))||written.slice(open+1,-1).some((token,index,list)=>(token.text==='!'||token.type==='ident'&&token.text.endsWith('!'))&&['(','{','['].includes(list[index+1]?.text)))return null;
 let at=begin+1;
 if(head[at++]?.text!=='<'||!/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(head[at]?.text??''))return null;
 const lifetime=head[at++].text;if(lifetime==="'static"||head[at++]?.text!=='>')return null;
 const path=[];while(head[at]?.type==='ident'){path.push(head[at++].text);if(head[at]?.text==='::'){at++;continue;}break;}
 if(!path.length||path.includes('Drop')||head[at++]?.text!=='<'||head[at++]?.text!==lifetime||head[at++]?.text!=='>'||head[at++]?.text!=='for')return null;
 const target=[];while(head[at]?.type==='ident'){target.push(head[at++].text);if(head[at]?.text==='::'){at++;continue;}break;}
 if(!target.length||at!==head.length||!equal(implementation.genericParameters,[lifetime])||!equal(target,implementationTargetPath(implementation,module))||!equal(target,implementation.typePath)||implementation.resolvedType?.kind!=='data'||implementation.resolvedType.rustReference||implementation.resolvedType.rustStandardGeneric)return null;
 return {path,lifetime,target,item};
}
export function bindOriginalSerdeCopyTraitOwner(implementation,module,scopes,dependencies){
 if(!dependencies?.deriveDependencies||!dependencies?.jsonMacroDependencies||!isResolvedSourceScopeSet(dependencies.sourceScopes)||!(scopes instanceof Map)||scopes.size!==dependencies.sourceScopes.length||[...scopes.values()].some(scope=>!dependencies.sourceScopes.includes(scope))||implementation.sourcePath!==module.file||!equal(implementation.modulePath,module.path))return implementation;
 const header=originalHeader(implementation,module);if(!header)return implementation;
 const ancestors=[...scopes.values()].filter(scope=>scope.path.every((part,index)=>module.path[index]===part));
 if(!ancestors.some(scope=>scope.file===module.file&&equal(scope.path,module.path))||ancestors.some(scope=>scope.unresolvedTypeScope!==false||scope.configurationCondition!=='active'||scope.bindings.some(binding=>binding.namespace==='type'&&(['serde','Deserialize','Drop'].includes(binding.name)&&binding.via==='declaration'||binding.name==='serde'&&(binding.status!=='resolved'||binding.kind!=='mod'||!equal(binding.target,['serde']))))))return implementation;
 let sourceProof;try{sourceProof=originalSerdeCopyTraitInputs(dependencies);}catch(error){if(error instanceof TypeError)return implementation;throw error;}
 const descriptors=[{name:'Deserialize',namespace:'type',kind:'trait',target:['serde','Deserialize'],source:sourceProof.profile}],externalModules=externalModuleBindings({extraBindings:descriptors});
 const resolved=resolveModuleBindings({modules:[module],externalModules,compilationProfile:module.compilationProfile??null}),scope=resolved.scopes.find(scope=>scope.file===module.file&&equal(scope.path,module.path));if(!scope)return implementation;
 let trait=[...header.path],importEvidence=null;
 if(!equal(trait,['serde','Deserialize'])){
  const candidates=scope.bindings.filter(binding=>binding.namespace==='type'&&binding.name===trait[0]),binding=candidates[0];
  if(candidates.length!==1||binding.status!=='resolved'||binding.via!=='named-import'||!['trait','mod'].includes(binding.kind)||!Array.isArray(binding.target))return implementation;
  trait=[...binding.target,...trait.slice(1)];importEvidence={name:binding.name,target:binding.target,span:binding.span,source:module.source.slice(binding.span.start,binding.span.end)};
 }
 if(!equal(trait,['serde','Deserialize']))return implementation;
 const evidence=freezeMacroTree({profile:'source-lifetime-only-non-drop-serde-trait-owner-v1',trait:Object.freeze(trait),sourceProof,lifetime:header.lifetime,source:module.file,sourceSha256:hash(module.source),headerSpan:Object.freeze({...implementation.headerSpan}),headerSource:module.source.slice(implementation.headerSpan.start,implementation.headerSpan.end),importEvidence,executionAuthority:false,payloadCopyAuthority:false});
 owners.set(implementation,{fingerprint:fingerprint(implementation),evidence,module,source:module.source,modulePath:JSON.stringify(module.path),scopes,sourceScopes:dependencies.sourceScopes});return implementation;
}
export function originalSerdeCopyTraitOwner(implementation){const state=owners.get(implementation);return state&&isOriginalSerdeCopyTraitInputs(state.evidence.sourceProof)&&state.module.source===state.source&&JSON.stringify(state.module.path)===state.modulePath&&state.scopes.size===state.sourceScopes.length&&[...state.scopes.values()].every(scope=>state.sourceScopes.includes(scope))&&state.fingerprint===fingerprint(implementation)?state.evidence:null;}
