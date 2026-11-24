// Finite library interface DATA. Only the original complete checker issues IR.
import {PRIMITIVE_OPTION_CONTRACTS,primitiveOptionContract} from '../primitive-option-contracts.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE,PRIMITIVE_OPTION_RUNTIME_SOURCE,PRIMITIVE_OPTION_DECLARATIONS_SOURCE} from '../primitive-option-native-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedPrimitiveOptionOperation=name=>{const row=primitiveOptionContract(name);return row?{...row,args:row.parameters,ret:row.returns}:null;};
export const ownedPrimitiveOptionAbsent=value=>value?.kind==='primitive-option-call'&&ownedPrimitiveOptionOperation(value.name)?.method==='none'||value?.kind==='variable'&&value.definitelyAbsent===true;
export function requireOwnedPrimitiveOptionSources(files,{runtimeRoot,declarationRoot}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_primitive_option_core.rs');if(typeof root!=='string'||source!==PRIMITIVE_OPTION_NATIVE_SOURCE||files.get(runtimeRoot+'/primitive-option-runtime.mjs')!==PRIMITIVE_OPTION_RUNTIME_SOURCE||files.get(declarationRoot+'/primitive-option-runtime.d.mts')!==PRIMITIVE_OPTION_DECLARATIONS_SOURCE)throw new TypeError('Complete actual primitive Option native/runtime sources required');
 const records=[];for(const [path,text]of [['src/lib.rs',root],['src/translation_primitive_option_core.rs',source]]){const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete primitive Option native CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_primitive_option_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_primitive_option_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_primitive_option_core')))throw new TypeError('Actual unique primitive Option module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==PRIMITIVE_OPTION_CONTRACTS.length||functions.some(item=>!primitiveOptionContract(item.name)))throw new TypeError('Complete primitive Option public function census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
