// Operation rows and native source observations are DATA. Only the complete
// copied original source checker issues executable caller items.
import {ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {ownedJsonOptionalPayload as originalPayload} from './owned-json-source.mjs';
export const ownedCollectionOperation=name=>name==='router_core_json_map'?{name,rust:'json_map',returns:'json'}:name==='router_core_json_filter_map'?{name,rust:'json_filter_map',returns:'json-owned-option'}:null;
export const ownedCollectionOptionalPayload=type=>type==='json-owned-option'?'json':type==='text-owned-option'?'text-owned':originalPayload(type);
export const ownedCollectionRustTypes=Object.freeze({'text-owned-option':'::std::option::Option<::std::string::String>','json-list-ref':"&'a [crate::translation_core::Json]",'json-list-owned':'::std::vec::Vec<crate::translation_core::Json>','json-owned-option':'::std::option::Option<crate::translation_core::Json>'});
export const ownedCollectionTypeScriptTypes=Object.freeze({'text-owned-option':"Readonly<{$:'None'}>|Readonly<{$:'Some';field0:string}>",'json-list-ref':'readonly JsonValue[]','json-list-owned':'readonly JsonValue[]','json-owned-option':"Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>"});
export function requireOwnedCollectionLeaf(files){
 const facade=files.get('src/translation_core.rs'),source=files.get('src/translation_core/json_collections.rs');
 if(facade!==ROUTER_FORMATTING_FACADE_SOURCE||source!==ROUTER_CORE_JSON_COLLECTIONS_SOURCE)throw new TypeError('Owned collections require complete actual facade and native leaf');
 const originals=[];
 for(const [path,text]of [['src/translation_core.rs',facade],['src/translation_core/json_collections.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(concrete.source!==text)throw new TypeError('Complete collection leaf CST differs');
  const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path.endsWith('translation_core.rs')){
   const modules=items.filter(item=>item.term==='mod'&&item.name==='json_collections'),uses=items.filter(item=>item.term==='use'&&item.tokens.some(token=>token.text==='json_collections'));
   if(modules.length!==1||text.slice(modules[0].start,modules[0].end).trim()!=='mod json_collections;'||uses.length!==1||text.slice(uses[0].start,uses[0].end).trim()!=='pub use self::json_collections::{json_map, json_filter_map};')throw new TypeError('Actual collection facade edges differ');
  }else{
   const functions=items.filter(item=>item.term==='fn');if(functions.length!==2||functions.some(item=>!['json_map','json_filter_map'].includes(item.name)))throw new TypeError('Complete native collection function census differs');
  }
  originals.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return originals;
}
