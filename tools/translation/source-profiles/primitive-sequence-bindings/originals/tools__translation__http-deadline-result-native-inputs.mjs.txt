// Complete source observations only. A private caller checker must independently
// bind every actual operation, domain, loan, effect and full source body.
import {observeHttpDeadlineSources as observeOwnedHttpTransportSources} from './http-deadline-native-inputs.mjs';
import {HTTP_DEADLINE_RESULT_NATIVE_SOURCE,HTTP_DEADLINE_RESULT_RUNTIME_SOURCE,HTTP_DEADLINE_RESULT_DECLARATIONS_SOURCE} from './http-deadline-result-native-source.mjs';
import {HTTP_DEADLINE_RESULT_CONTRACTS} from './http-deadline-result-contracts.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
export function observeHttpDeadlineResultSources(files,configuration){
 const observed=observeOwnedHttpTransportSources(files,configuration),records=[...observed.records],root=files.get('src/lib.rs'),captured=captureSourceModuleViews({source:root,sourcePath:'src/lib.rs'}),items=originalModuleViewItems(captured.views[0],root),edges=items.filter(item=>item.term==='mod'&&item.name==='translation_http_deadline_results_core');
 if(edges.length!==1||root.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_http_deadline_results_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_http_deadline_results_core')))throw new TypeError('Actual unique HTTP deadline native edge required');
 for(const [path,source,language]of [['src/translation_http_deadline_results_core.rs',HTTP_DEADLINE_RESULT_NATIVE_SOURCE,'Rust'],[configuration.runtimeRoot+'/http-deadline-result-runtime.mjs',HTTP_DEADLINE_RESULT_RUNTIME_SOURCE,'JavaScript'],[configuration.declarationRoot+'/http-deadline-result-runtime.d.mts',HTTP_DEADLINE_RESULT_DECLARATIONS_SOURCE,'TypeScript']]){
  if(files.get(path)!==source)throw new TypeError('Complete actual HTTP deadline source differs: '+path);const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete HTTP deadline source CST differs');records.push({path,source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 const native=captureSourceModuleViews({source:HTTP_DEADLINE_RESULT_NATIVE_SOURCE,sourcePath:'src/translation_http_deadline_results_core.rs'}),functions=originalModuleViewItems(native.views[0],HTTP_DEADLINE_RESULT_NATIVE_SOURCE).filter(item=>item.term==='fn'&&/^pub\s/u.test(HTTP_DEADLINE_RESULT_NATIVE_SOURCE.slice(item.start,item.end).trim()));if(functions.length!==HTTP_DEADLINE_RESULT_CONTRACTS.length||functions.some(item=>!HTTP_DEADLINE_RESULT_CONTRACTS.some(row=>row.rustName===item.name)))throw new TypeError('Complete actual HTTP deadline function census differs');
 return {records,sourceAuthority:false,semanticAuthority:false,callerOwnerResolved:false,nativeRustGrammarChecked:false,runtimeParity:false};
}
