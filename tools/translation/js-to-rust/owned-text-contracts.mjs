// Finite interface DATA. Only the existing complete source checker issues IR.
import {TEXT_CONTRACTS,textContract} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_RUNTIME_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedTextOperation=name=>{const row=textContract(name);return row?{...row,args:row.parameters,ret:row.returns}:null;};
export function requireOwnedTextSources(files,{runtimeRoot,declarationRoot}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_text_core.rs');if(typeof root!=='string'||source!==TEXT_NATIVE_SOURCE||files.get(runtimeRoot+'/text-runtime.mjs')!==TEXT_RUNTIME_SOURCE||files.get(declarationRoot+'/text-runtime.d.mts')!==TEXT_DECLARATIONS_SOURCE)throw new TypeError('Complete actual text native/runtime sources required');
 const records=[];for(const [path,text]of [['src/lib.rs',root],['src/translation_text_core.rs',source]]){const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete text native CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_text_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_text_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_text_core')))throw new TypeError('Actual unique native text module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==TEXT_CONTRACTS.length||functions.some(item=>!textContract(item.name)))throw new TypeError('Complete native text public function census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
