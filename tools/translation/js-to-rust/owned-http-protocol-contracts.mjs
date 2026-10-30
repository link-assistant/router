// Complete source observations only; the original whole-body issuer is required.
import {HTTP_PROTOCOL_CONTRACTS,httpProtocolContract} from '../http-protocol-contracts.mjs';
import {HTTP_PROTOCOL_NATIVE_SOURCE,HTTP_PROTOCOL_RUNTIME_SOURCE,HTTP_PROTOCOL_DECLARATIONS_SOURCE} from '../http-protocol-native-source.mjs';
import {requireOwnedResultSources} from './owned-result-source-contracts.mjs';
import {requireOwnedOutcomeSources} from './owned-outcome-contracts.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {requireHttpProtocolLockedDependencies} from '../http-protocol-native-dependencies.mjs';
export const ownedHttpProtocolOperation=name=>{const row=httpProtocolContract(name);return row?{...row,args:row.parameters,ret:row.returns}:null;};
export function requireOwnedHttpProtocolSources(files,configuration){
 requireHttpProtocolLockedDependencies(deriveDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof);const root=files.get('src/lib.rs'),source=files.get('src/translation_http_protocol_core.rs');if(source!==HTTP_PROTOCOL_NATIVE_SOURCE||files.get(configuration.runtimeRoot+'/http-protocol-runtime.mjs')!==HTTP_PROTOCOL_RUNTIME_SOURCE||files.get(configuration.declarationRoot+'/http-protocol-runtime.d.mts')!==HTTP_PROTOCOL_DECLARATIONS_SOURCE)throw new TypeError('Complete actual HTTP protocol native/runtime sources required');const records=[...requireOwnedResultSources(files,configuration),...requireOwnedOutcomeSources(files,configuration)];
 for(const [path,text]of [['src/lib.rs',root],['src/translation_http_protocol_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete native HTTP protocol CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_http_protocol_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_http_protocol_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_http_protocol_core')))throw new TypeError('Actual unique HTTP protocol core module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==HTTP_PROTOCOL_CONTRACTS.length||functions.some(item=>!httpProtocolContract(item.name)))throw new TypeError('Complete native public HTTP protocol census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
