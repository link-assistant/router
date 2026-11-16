// Only actual original source checking can issue a callback or caller.
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS,primitiveOptionCallbackContract} from '../primitive-option-callback-contracts.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,PRIMITIVE_OPTION_CALLBACK_RUNTIME_SOURCE,PRIMITIVE_OPTION_CALLBACK_DECLARATIONS_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {requireOwnedPrimitiveOptionSources} from './owned-primitive-option-contracts.mjs';
import {requireOwnedTextSources} from './owned-text-contracts.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedPrimitiveOptionCallbackOperation=primitiveOptionCallbackContract;
export function requireOwnedPrimitiveOptionCallbackSources(files,configuration){
 const records=[...requireOwnedPrimitiveOptionSources(files,configuration),...requireOwnedTextSources(files,configuration)],root=files.get('src/lib.rs'),source=files.get('src/translation_primitive_option_callbacks_core.rs');if(source!==PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE||files.get(configuration.runtimeRoot+'/primitive-option-callback-runtime.mjs')!==PRIMITIVE_OPTION_CALLBACK_RUNTIME_SOURCE||files.get(configuration.declarationRoot+'/primitive-option-callback-runtime.d.mts')!==PRIMITIVE_OPTION_CALLBACK_DECLARATIONS_SOURCE)throw new TypeError('Complete actual primitive Option callback native/runtime sources required');
 for(const [path,text]of [['src/lib.rs',root],['src/translation_primitive_option_callbacks_core.rs',source]]){const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete native callback CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_primitive_option_callbacks_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_primitive_option_callbacks_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_primitive_option_callbacks_core')))throw new TypeError('Actual unique callback core module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==PRIMITIVE_OPTION_CALLBACK_CONTRACTS.length||functions.some(item=>!primitiveOptionCallbackContract(item.name)))throw new TypeError('Complete public native callback census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
