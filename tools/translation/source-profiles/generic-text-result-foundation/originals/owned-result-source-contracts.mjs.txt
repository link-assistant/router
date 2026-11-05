// Complete copied-library observations only; real caller/type issuers stay private.
import {OWNED_RESULT_CONTRACTS,ownedResultContract} from '../owned-result-contracts.mjs';
import {OWNED_RESULT_NATIVE_SOURCE,OWNED_RESULT_RUNTIME_SOURCE,OWNED_RESULT_DECLARATIONS_SOURCE} from '../owned-result-native-source.mjs';
import {requireOwnedTextSources} from './owned-text-contracts.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedResultSourceOperation=ownedResultContract;
export function requireOwnedResultSources(files,configuration){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_owned_results_core.rs');if(source!==OWNED_RESULT_NATIVE_SOURCE||files.get(configuration.runtimeRoot+'/owned-result-runtime.mjs')!==OWNED_RESULT_RUNTIME_SOURCE||files.get(configuration.declarationRoot+'/owned-result-runtime.d.mts')!==OWNED_RESULT_DECLARATIONS_SOURCE)throw new TypeError('Complete actual copied owned Result native/runtime sources required');const records=requireOwnedTextSources(files,configuration);
 for(const [path,text]of [['src/lib.rs',root],['src/translation_owned_results_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete owned Result native CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_owned_results_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_owned_results_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_owned_results_core')))throw new TypeError('Actual unique copied Result core module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==OWNED_RESULT_CONTRACTS.length||functions.some(item=>!ownedResultContract(item.name)))throw new TypeError('Complete actual copied public Result census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
