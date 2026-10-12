// Private original module snapshots shared by source macro consumers.
import {captureSourceModuleViews,originalSourceModuleItems,originalModuleViewParent} from './source-module-views.mjs';
import {compilationProfile as normalizeCompilationProfile} from './cfg-profile.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const states=new WeakMap();
export function captureOriginalMacroModules({modules,compilationProfile=null}={}) {
  if(!Array.isArray(modules)||!modules.length||modules.length>512)throw new TypeError('Macro context needs bounded actual original modules');
  const profile=normalizeCompilationProfile(compilationProfile),files=new Map();
  for(const module of modules){if(typeof module?.source!=='string'||typeof module.file!=='string'||!Array.isArray(module.path))throw new TypeError('Macro source module is incomplete');const rows=files.get(module.file)??[];rows.push(module);files.set(module.file,rows);}
  const original=freezeMacroTree(modules.map(module=>{
    if(module.path.length>64||module.path.some(name=>typeof name!=='string'||!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(name)||name.normalize('NFC')!==name))throw new TypeError('Macro source module path is malformed');
    const ownProfile=Object.hasOwn(module,'compilationProfile')?normalizeCompilationProfile(module.compilationProfile):profile;
    if(JSON.stringify(ownProfile)!==JSON.stringify(profile))throw new TypeError('Macro module and context compilation profiles differ');
    if(module.configurationCondition!==undefined&&!['active','inactive','unknown'].includes(module.configurationCondition))throw new TypeError('Macro module configuration condition is invalid');
    if(files.get(module.file).length>1&&!Object.hasOwn(module,'sourceView'))throw new TypeError('Same-file macro modules require genuine original source views');
    const view=Object.hasOwn(module,'sourceView')?module.sourceView:captureSourceModuleViews({source:module.source,sourcePath:module.file,compilationProfile:profile}).views[0];
    const snapshot={file:module.file,path:[...module.path],source:module.source,compilationProfile:ownProfile,sourceView:view,...(module.configurationCondition===undefined?{}:{configurationCondition:module.configurationCondition})};
    originalSourceModuleItems(snapshot); // Validate private view, full bytes, file/path suffix and profile before sealing.
    if(view.configurationCondition==='inactive'&&module.configurationCondition!==undefined&&module.configurationCondition!=='inactive'||view.configurationCondition==='unknown'&&module.configurationCondition==='active')throw new TypeError('Macro module condition contradicts its original source view');
    return snapshot;
  }));
  if(new Set(original.map(module=>JSON.stringify(module.path))).size!==original.length)throw new TypeError('Macro module identities are ambiguous');
  for(const module of original) {
    if(module.path.length&&!original.some(parent=>JSON.stringify(parent.path)===JSON.stringify(module.path.slice(0,-1))))throw new TypeError('Macro source module lacks its actual ancestor context');
    const local=module.sourceView.modulePath,prefix=module.path.slice(0,module.path.length-local.length);
    for(const sibling of original.filter(entry=>entry.file===module.file))if(sibling.source!==module.source||JSON.stringify(sibling.path.slice(0,sibling.path.length-sibling.sourceView.modulePath.length))!==JSON.stringify(prefix))throw new TypeError('Same-file macro view origins disagree with actual module paths/source');
    const parentView=originalModuleViewParent(module.sourceView);
    if(parentView&&!original.some(parent=>parent.file===module.file&&parent.sourceView.digest===parentView.digest&&JSON.stringify(parent.path)===JSON.stringify([...prefix,...parentView.modulePath])))throw new TypeError('Macro inline view lacks its genuine original parent context');
  }
  const certificate=freezeMacroTree({schema:'original-macro-module-snapshots-v1',compilationProfile:profile,views:original.map(module=>({file:module.file,path:module.path,digest:module.sourceView.digest,configurationCondition:module.configurationCondition??module.sourceView.configurationCondition}))});
  states.set(certificate,{modules:original,compilationProfile:profile});return certificate;
}
export function originalMacroModules(certificate){const state=states.get(certificate);if(!state)throw new TypeError('Unsealed original macro module snapshots');return state;}
