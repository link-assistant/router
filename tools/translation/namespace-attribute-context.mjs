// Source-bound inspection only. A literal-doc candidate does not resolve its
// caller's attribute namespace, transform a source view, or admit a producer.
import {types} from 'node:util';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
import {inspectConditionalAttribute,conditionalLiteralDocEvidence,originalConditionalDocumentationInputs} from './conditional-attributes.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
let contexts=null;
const fail=message=>{throw new TypeError('Original namespace attribute inputs: '+message);};
function actual(state,module){
 const row=state.rows.find(row=>row.key===moduleScopeKey(module));
 if(!row||row.module!==module||row.source!==module.source||row.sourceView!==module.sourceView||JSON.stringify(compilationProfile(module.compilationProfile))!==row.profile)fail('complete original module/source/view/profile differs');
 const items=originalSourceModuleItems(module);
 if(JSON.stringify(items)!==row.items)fail('complete original item inventory differs');return items;
}
export function captureOriginalNamespaceAttributeInputs({modules,compilationProfile:input=null}={}){
 if(!Array.isArray(modules)||types.isProxy(modules)||!modules.length||modules.length>512)fail('bounded complete original module inputs required');
 const profile=compilationProfile(input),rows=[],keys=new Set();
 for(const module of modules){
  if(!module||types.isProxy(module)||typeof module.source!=='string'||Buffer.byteLength(module.source)>8_000_000)fail('bounded original source module required');
  const key=moduleScopeKey(module);if(keys.has(key))fail('duplicate original module');keys.add(key);
  const current=compilationProfile(module.compilationProfile);if(JSON.stringify(current)!==JSON.stringify(profile))fail('module profile differs from explicit input');
  rows.push({key,module,source:module.source,sourceView:module.sourceView,profile:JSON.stringify(current),items:JSON.stringify(originalSourceModuleItems(module))});
 }
 const state={rows,profile};for(const row of rows)actual(state,row.module);
 contexts??=new WeakMap();const token=Object.freeze({schema:'private-original-namespace-attribute-inputs-v1'});contexts.set(token,state);return token;
}
export function originalNamespaceAttributeInputs(token,module,item){
 const state=contexts?.get(token);if(!state)fail('genuine private original input capture required');
 const rows=actual(state,module),selected=rows.find(row=>row.start===item?.start&&row.end===item?.end);
 if(!selected||JSON.stringify(selected)!==JSON.stringify(item))fail('complete original selected item differs');
 const candidates=[];
 for(const attribute of itemConfiguration(selected.tokens,state.profile).attributes){
  if(attribute.name!=='cfg_attr')continue;
  const tokens=selected.tokens.filter(token=>token.type!=='comment'&&token.start>=attribute.span.start&&token.end<=attribute.span.end);
  const begin=tokens[1]?.text==='!'?3:2,inspection=inspectConditionalAttribute(tokens.slice(begin,-1)),evidence=conditionalLiteralDocEvidence(inspection);
  if(evidence)candidates.push({attribute:copyMetadata(attribute),inspection:copyMetadata(inspection),evidence});
 }
 actual(state,module);
 return {schema:'original-literal-documentation-namespace-candidates-v1',source:module.file,module:[...module.path],sourceView:module.sourceView,span:{start:selected.start,end:selected.end},original:module.source.slice(selected.start,selected.end),profile:state.profile,candidates,originalDocumentationSources:candidates.length?originalConditionalDocumentationInputs():[],callerOwnerResolved:false,callerScopeComplete:false,itemAvailabilityProved:false,namespaceAuthority:false,runtimeAuthority:false};
}
