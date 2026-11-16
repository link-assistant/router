// Shared operation DATA never issues a checked caller. The copied checker
// still binds complete original sources, actual imports, types and effects.
import {jsonIterationContract,JSON_ITERATION_CONTRACTS} from '../json-iteration-contracts.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {ownedCollectionOperation as originalOperation,requireOwnedCollectionLeaf} from './owned-collections-contracts.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export {ownedCollectionOptionalPayload,ownedCollectionRustTypes,ownedCollectionTypeScriptTypes} from './owned-collections-contracts.mjs';
const domains={'shared-json':'json-ref','owned-json':'json',bool:'bool','owned-json-list':'json-list-owned','owned-json-option':'json-owned-option'};
export function ownedIterationOperation(name){
 const original=originalOperation(name);if(original)return {...original,result:'json-list-owned',parameters:['json-ref'],arity:2,namespace:'crate::translation_core',runtime:'json-collections'};
 const row=jsonIterationContract(name);return row?{name:row.javascriptName,rust:row.rustName,returns:domains[row.callbackReturns],result:domains[row.returns],parameters:row.callbackParameters.map(type=>domains[type]),arity:row.parameters.length,namespace:'crate::translation_collections_core',runtime:'json-iteration'}:null;
}
export const ownedIterationOnlyOperation=name=>{const row=ownedIterationOperation(name);return row?.runtime==='json-iteration'?row:null;};
export function requireOwnedIterationLeaves(files){
 const original=requireOwnedCollectionLeaf(files),source=files.get('src/translation_collections_core.rs'),root=files.get('src/lib.rs');
 if(source!==JSON_ITERATION_NATIVE_SOURCE||typeof root!=='string')throw new TypeError('Complete actual owned JSON iteration native source required');
 const sourceRecords=[];
 for(const [path,text]of [['src/lib.rs',root],['src/translation_collections_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),capture=captureSourceModuleViews({source:concrete.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){
   const modules=items.filter(item=>item.term==='mod'&&item.name==='translation_collections_core');if(modules.length!==1||text.slice(modules[0].start,modules[0].end).trim()!=='pub mod translation_collections_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_collections_core')))throw new TypeError('One actual unambiguous public iteration module edge required');
  }else{
   const functions=items.filter(item=>item.term==='fn');if(functions.length!==JSON_ITERATION_CONTRACTS.length||functions.some(item=>!jsonIterationContract(item.name)))throw new TypeError('Actual complete native iteration operation census differs');
  }
  sourceRecords.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return [...original,...sourceRecords];
}
