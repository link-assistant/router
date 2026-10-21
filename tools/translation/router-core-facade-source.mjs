import {crateModuleSourcePath} from './repository-layout.mjs';
// Reserved explicit owned interface selection, not global namespace closure.
// Both callers supply their freshly reconstructed genuine original source scope.
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-source-data.mjs';
const fail=()=>{throw new TypeError('Router compatibility formatting requires its actual owned facade and qualified source binding');};
export function selectOriginalRouterCoreFacade({modules,sourceScopes,compilationProfile:inputProfile=null}){
  // These are the original forward comparisons, in their original order.
  const roots=modules.filter(module=>module.path.length===0),cores=modules.filter(module=>module.path.length===1&&module.path[0]==='translation_core');
  if(roots.length!==1||cores.length!==1)fail();
  const root=roots[0],core=cores[0];
  // The actual tracked edge must select this complete external source. No alias,
  // cfg, attribute macro, caller flag or copied source-view can supply the API.
  const declarations=originalSourceModuleItems(root).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(declarations.length!==1||root.source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;'||core.file!==crateModuleSourcePath(modules,'src/translation_core.rs')||core.source!==ROUTER_FORMATTING_FACADE_SOURCE||core.configurationCondition!=='active')fail();
  const scope=sourceScopes.find(scope=>scope.file===root.file&&scope.path.length===0),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='translation_core');
  if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='mod'||bindings[0].via!=='declaration'||bindings[0].source!==root.file||bindings[0].target?.join('::')!=='crate::translation_core'||bindings[0].span.start!==declarations[0].start||bindings[0].span.end!==declarations[0].end)fail();
  if(originalSourceModuleItems(root).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail();
  originalSourceModuleItems(core);
  // Additional source/view/profile joins follow the complete old comparison.
  // The result cannot be supplied by copied scope flags or public metadata.
  if(!isResolvedSourceScopeSet(sourceScopes))fail();
  assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile:inputProfile});
  const profile=compilationProfile(inputProfile);
  for(const module of [root,core]){
    if(!Object.hasOwn(module,'sourceView')||!isSourceModuleView(module.sourceView)||module.configurationCondition!=='active'||module.sourceView.configurationCondition!=='active'||JSON.stringify(module.sourceView.compilationProfile)!==JSON.stringify(profile))fail();
    originalSourceModuleItems(module);
  }
  const declaration=bindings[0].declaration;
  if(declaration?.source!==root.file||declaration.span?.start!==declarations[0].start||declaration.span?.end!==declarations[0].end)fail();
  // Detached data only: no parser, live source scope, private issuer or checker.
  // Unrelated unresolved scope diagnostics are intentionally left untouched.
  return Object.freeze({source:core.source,file:core.file,rootFile:root.file,span:Object.freeze([declarations[0].start,declarations[0].end])});
}
