// Operation DATA and fresh whole-source joins; the original checker issues IR.
import {INTEGER_CONTRACTS,integerContract} from '../integer-contracts.mjs';
import {INTEGER_NATIVE_SOURCE,INTEGER_RUNTIME_SOURCE,INTEGER_DECLARATIONS_SOURCE} from '../integer-native-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedIntegerOperation=name=>{const row=integerContract(name);return row?{...row,args:row.parameters,ret:row.returns}:null;};
export function requireOwnedIntegerSources(files,{runtimeRoot,declarationRoot}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_integer_core.rs');
 if(typeof root!=='string'||source!==INTEGER_NATIVE_SOURCE||files.get(runtimeRoot+'/integer-runtime.mjs')!==INTEGER_RUNTIME_SOURCE||files.get(declarationRoot+'/integer-runtime.d.mts')!==INTEGER_DECLARATIONS_SOURCE)throw new TypeError('Complete actual integer native/runtime sources required');
 const records=[];for(const [path,text]of [['src/lib.rs',root],['src/translation_integer_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),reparsed=transportConcreteSyntaxMeta(concrete.meta);if(reparsed.source!==text)throw new TypeError('Complete integer Rust CST roundtrip differs');const capture=captureSourceModuleViews({source:reparsed.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_integer_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_integer_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_integer_core')))throw new TypeError('Actual unique integer module edge required');}
  else{const functions=items.filter(item=>item.term==='fn');if(functions.length!==INTEGER_CONTRACTS.length||functions.some(item=>!integerContract(item.name)))throw new TypeError('Actual complete integer function census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
