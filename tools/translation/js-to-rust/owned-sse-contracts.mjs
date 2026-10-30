// These are source observations, not public type/loan/checked-body permits.
import {sseContract} from '../sse-contracts.mjs';
import {SSE_NATIVE_SOURCE,SSE_ORIGINAL_FRAMER_SOURCE,SSE_RUNTIME_SOURCE,SSE_DECLARATIONS_SOURCE} from '../sse-native-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {requireSseLockedDependencies} from '../sse-native-dependencies.mjs';
export const ownedSseOperation=name=>{const row=sseContract(name);return row?{...row,args:row.parameters,ret:row.returns}:null;};
export function requireOwnedSseSources(files,{runtimeRoot,declarationRoot}){
 requireSseLockedDependencies(deriveDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof);
 const root=files.get('src/lib.rs');if(typeof root!=='string'||files.get('src/translation_stream_core.rs')!==SSE_NATIVE_SOURCE||files.get('src/sse.rs')!==SSE_ORIGINAL_FRAMER_SOURCE||files.get(runtimeRoot+'/sse-runtime.mjs')!==SSE_RUNTIME_SOURCE||files.get(declarationRoot+'/sse-runtime.d.mts')!==SSE_DECLARATIONS_SOURCE)throw new TypeError('Complete actual SSE wrapper original framer and runtime sources required');
 const records=[];for(const [path,source]of [['src/lib.rs',root],['src/translation_stream_core.rs',SSE_NATIVE_SOURCE],['src/sse.rs',SSE_ORIGINAL_FRAMER_SOURCE]]){
  const concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),text=transportConcreteSyntaxMeta(concrete.meta).source;if(text!==source)throw new TypeError('Complete SSE CST source differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],source);
  if(path==='src/lib.rs')for(const [name,written]of [['translation_stream_core','pub mod translation_stream_core;'],['sse','mod sse;']]){const rows=items.filter(item=>item.term==='mod'&&item.name===name);if(rows.length!==1||source.slice(rows[0].start,rows[0].end).trim()!==written||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text===name)))throw new TypeError('Actual SSE module edge differs');}
  records.push({path,source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
