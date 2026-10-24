// Ordinary operation DATA; only the copied original source checker issues IR.
import {OWNED_OUTCOME_CONTRACTS,ownedOutcomeContract} from '../owned-outcome-contracts.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE,OWNED_OUTCOME_RUNTIME_SOURCE,OWNED_OUTCOME_DECLARATIONS_SOURCE} from '../owned-outcome-native-source.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedOutcomeOperation=name=>{const row=ownedOutcomeContract(name);return row?{...row,args:row.parameters.map(role=>role==='shared-json'?'json-ref':role),ret:row.returns}:null;};
export const ownedOutcomeType=type=>type==='json-text-result';
export const ownedOutcomeCompatible=(actual,wanted)=>wanted==='json-ref'?['json','json-ref'].includes(actual):wanted==='str'?['str','text-owned'].includes(actual):actual===wanted;
export function requireOwnedOutcomeSources(files,{runtimeRoot,declarationRoot}){
 const root=files.get('src/lib.rs'),source=files.get('src/translation_carriers_core.rs');
 if(typeof root!=='string'||source!==OWNED_OUTCOME_NATIVE_SOURCE||files.get(runtimeRoot+'/owned-outcome-runtime.mjs')!==OWNED_OUTCOME_RUNTIME_SOURCE||files.get(declarationRoot+'/owned-outcome-runtime.d.mts')!==OWNED_OUTCOME_DECLARATIONS_SOURCE)throw new TypeError('Complete actual owned carrier native/runtime sources required');
 const records=[];for(const [path,text]of [['src/lib.rs',root],['src/translation_carriers_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),capture=captureSourceModuleViews({source:concrete.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){
   const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_carriers_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_carriers_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_carriers_core')))throw new TypeError('Actual unique owned carrier module edge required');
  }else{const functions=items.filter(item=>item.term==='fn');if(functions.length!==OWNED_OUTCOME_CONTRACTS.length||functions.some(item=>!ownedOutcomeContract(item.name)))throw new TypeError('Actual complete owned carrier function census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
