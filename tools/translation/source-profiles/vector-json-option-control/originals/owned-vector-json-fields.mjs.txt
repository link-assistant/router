import {crateModuleSourcePath} from '../repository-layout.mjs';
// Reserved explicit owned interface selection, not global namespace closure.
// Both callers supply their freshly reconstructed genuine original source scope.
import {originalSourceModuleItems,isSourceModuleView} from '../source-module-views.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../module-bindings.mjs';
import {compilationProfile} from '../cfg-profile.mjs';
import {JSON_FIELDS_NATIVE_SOURCE as VECTOR_JSON_FIELDS_SOURCE} from '../json-fields-native-source.mjs';
const fail=()=>{throw new TypeError('Router canonical JSON fields requires its actual owned facade and qualified source binding');};
export function selectOriginalVectorJsonFields({modules,sourceScopes,compilationProfile:inputProfile=null}){
  // These are the original forward comparisons, in their original order.
  const roots=modules.filter(module=>module.path.length===0),cores=modules.filter(module=>module.path.length===1&&module.path[0]==='translation_json_fields_core');
  if(roots.length!==1||cores.length!==1)fail();
  const root=roots[0],core=cores[0];
  // The actual tracked edge must select this complete external source. No alias,
  // cfg, attribute macro, caller flag or copied source-view can supply the API.
  const declarations=originalSourceModuleItems(root).filter(item=>item.term==='mod'&&item.name==='translation_json_fields_core');
  if(declarations.length!==1||root.source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_json_fields_core;'||core.file!==crateModuleSourcePath(modules,'src/translation_json_fields_core.rs')||core.source!==VECTOR_JSON_FIELDS_SOURCE||core.configurationCondition!=='active')fail();
  const scope=sourceScopes.find(scope=>scope.file===root.file&&scope.path.length===0),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='translation_json_fields_core');
  if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='mod'||bindings[0].via!=='declaration'||bindings[0].source!==root.file||bindings[0].target?.join('::')!=='crate::translation_json_fields_core'||bindings[0].span.start!==declarations[0].start||bindings[0].span.end!==declarations[0].end)fail();
  if(originalSourceModuleItems(root).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_json_fields_core')))fail();
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

// The full fixed native source and actual root edge are mandatory on use.
import {JSON_FIELD_CONTRACTS,jsonFieldContract} from '../json-field-contracts.mjs';
import {JSON_FIELDS_NATIVE_SOURCE,JSON_FIELDS_RUNTIME_SOURCE,JSON_FIELDS_DECLARATIONS_SOURCE} from '../json-fields-native-source.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedJsonFieldOperation=jsonFieldContract;
export function requireOwnedJsonFieldSources(files,{runtimeRoot,declarationRoot}={}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_json_fields_core.rs');if(typeof root!=='string'||source!==JSON_FIELDS_NATIVE_SOURCE)throw new TypeError('Complete actual owned JSON field native source required');
 const records=[];if(runtimeRoot!==undefined&&(files.get(runtimeRoot+'/json-fields-runtime.mjs')!==JSON_FIELDS_RUNTIME_SOURCE||files.get(declarationRoot+'/json-fields-runtime.d.mts')!==JSON_FIELDS_DECLARATIONS_SOURCE))throw new TypeError('Complete actual JSON field runtime/declaration source differs');
 for(const [path,text]of [['src/lib.rs',root],['src/translation_json_fields_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),capture=captureSourceModuleViews({source:concrete.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){
   const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_json_fields_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_json_fields_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_json_fields_core')))throw new TypeError('One actual unambiguous JSON fields module edge required');
  }else{const functions=items.filter(item=>item.term==='fn');if(functions.length!==JSON_FIELD_CONTRACTS.length||functions.some(item=>!jsonFieldContract(item.name)))throw new TypeError('Complete JSON field native operation census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return records;
}
export function emitOwnedJsonFieldCall(value,{rust,expr,imports,sequence}){
 const row=jsonFieldContract(value.name);if(!row||row.ret!==value.type||value.args.length!==row.args.length)throw new TypeError('Complete actual checked JSON field operation differs');imports.add(value.name);
 if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
 const names=value.args.map(()=> '__ro_field_'+sequence()),bindings=value.args.map((argument,index)=>'let '+names[index]+' = '+(index===0&&argument.type==='json'||index>0&&row.args[index]==='str'&&argument.type==='text-owned'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument))+';');
 return '{ '+bindings.join(' ')+' '+row.rustPath+'('+names.join(', ')+') }';
}
export function evaluateOwnedJsonFieldCall(value,{state,scope,get}){const row=jsonFieldContract(value.name);if(!row||!state.modules.fields)throw new TypeError('Unissued JSON field runtime');return Reflect.apply(state.modules.fields[value.name],undefined,value.args.map(argument=>get(argument,scope)));}

// These rows are ABI DATA. The complete actual fixed field module, receiving
// runtime/declarations and private original vector source still have to join.
export const ownedVectorJsonFieldOperation=name=>{const row=jsonFieldContract(name);return row&&['json','json-ref','str','bool','u64','i64'].includes(row.ret)?row:null;};
export function requireOwnedVectorJsonFieldSources(files,options={}){
 const records=requireOwnedJsonFieldSources(files,options),modules=records.map(row=>{const capture=captureSourceModuleViews({source:row.source,sourcePath:row.path}),sourceView=capture.views[0];if(transportConcreteSyntaxMeta(row.concreteSyntax).source!==row.source)throw new TypeError('Full JSON field source CST inverse differs');return {file:row.path,path:row.path==='src/lib.rs'?[]:['translation_json_fields_core'],source:row.source,sourceView,configurationCondition:sourceView.configurationCondition};});
 const evidence=resolveModuleBindings({modules});selectOriginalVectorJsonFields({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});return records;
}
export function emitOwnedVectorJsonFieldCall(value,{rust,expr,imports,sequence}){
 const row=ownedVectorJsonFieldOperation(value.name);if(!row||row.ret!==value.type||row.args.length!==value.args.length)throw new TypeError('Actual supported field/default operation required');imports.add(value.name);if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
 const args=[],bindings=[];for(let index=0;index<value.args.length;index++){
  const argument=value.args[index];if(index===0&&argument.kind==='variable'){args.push(expr(argument,true));continue;}
  const name='__ro_field_'+sequence();bindings.push('let '+name+' = '+expr(argument)+';');args.push(index===0&&argument.type==='json'?'&'+name:name);
 }
 return '{ '+bindings.join(' ')+' '+row.rustPath+'('+args.join(', ')+') }';
}
import {resolveModuleBindings} from '../module-bindings.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
