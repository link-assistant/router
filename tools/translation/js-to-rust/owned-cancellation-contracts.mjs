// Synchronous opaque cancellation interface data. Actual callers are reissued afresh.
import {ASYNC_CONTROL_CONTRACTS} from '../async-control-contracts.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE,ASYNC_CONTROL_RUNTIME_SOURCE,ASYNC_CONTROL_DECLARATIONS_SOURCE} from '../async-control-native-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
const SELECTED=new Set(['cancel_new','cancel_clone','cancel_set','cancel_is_set']);
export const CANCELLATION_OWNED='cancellation-owned',CANCELLATION_SHARED='cancellation-ref';
export const ownedCancellationOperation=name=>{
 const rows=ASYNC_CONTROL_CONTRACTS.filter(row=>SELECTED.has(row.rustName)&&!row.async&&(row.rustName===name||row.javascriptName===name));if(rows.length!==1)return null;const row=rows[0];return {...row,args:row.parameters.map(role=>role==='shared-cancellation'?CANCELLATION_SHARED:role),ret:row.returns==='cancellation'?CANCELLATION_OWNED:row.returns};
};
export const ownedCancellationOwned=type=>type===CANCELLATION_OWNED;
export const ownedCancellationType=type=>type===CANCELLATION_OWNED||type===CANCELLATION_SHARED;
export function requireOwnedCancellationSources(files,{runtimeRoot,declarationRoot}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_async_control_core.rs');
 if(typeof root!=='string'||source!==ASYNC_CONTROL_NATIVE_SOURCE||files.get(runtimeRoot+'/async-control-runtime.mjs')!==ASYNC_CONTROL_RUNTIME_SOURCE||files.get(declarationRoot+'/async-control-runtime.d.mts')!==ASYNC_CONTROL_DECLARATIONS_SOURCE)throw new TypeError('Complete actual native/runtime/declaration cancellation sources required');
 const records=[];
 for(const [path,text]of [['src/lib.rs',root],['src/translation_async_control_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete cancellation native CST inverse differs');const captured=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(captured.views[0],text);
  if(path==='src/lib.rs'){
   const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_async_control_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_async_control_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_async_control_core')))throw new TypeError('Actual unique cancellation native module edge required');
  }else{
   const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));
   if(functions.length!==ASYNC_CONTROL_CONTRACTS.length||functions.some(item=>!ASYNC_CONTROL_CONTRACTS.some(row=>row.rustName===item.name)))throw new TypeError('Complete actual cancellation public operation census differs');
   const handles=items.filter(item=>item.term==='struct'&&item.name==='Cancellation');if(handles.length!==1)throw new TypeError('Actual unique opaque native cancellation declaration required');
  }
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return records;
}
export function ownedCancellationWrittenType(ts,type,analysis,resolveImport){
 const call=query=>{if(!ts.isTypeQueryNode(query)||!ts.isIdentifier(query.exprName))return null;const declarations=analysis.checker.getSymbolAtLocation(query.exprName)?.declarations;if(declarations?.length!==1||!ts.isImportSpecifier(declarations[0]))return null;const binding=resolveImport(query.exprName),operation=ownedCancellationOperation(binding.name);return binding.target===analysis.runtimeRoot+'/async-control-runtime.mjs'?operation:null;};
 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text==='ReturnType'&&type.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.typeName)?.declarations?.length)return null;return call(type.typeArguments[0])?.ret??null;
 }
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&type.indexType.literal.text==='0'&&ts.isTypeReferenceNode(type.objectType)&&ts.isIdentifier(type.objectType.typeName)&&type.objectType.typeName.text==='Parameters'&&type.objectType.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.objectType.typeName)?.declarations?.length)return null;return call(type.objectType.typeArguments[0])?.args[0]??null;
 }
 return null;
}
