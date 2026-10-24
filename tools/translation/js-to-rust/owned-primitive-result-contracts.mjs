// Finite domain equations over actual, freshly checked native/runtime sources.
import {PRIMITIVE_RESULT_CONTRACTS,primitiveResultContract} from '../primitive-result-contracts.mjs';
import {ownedResultSourceOperation} from './owned-result-source-contracts.mjs';
import {ownedHttpProtocolOperation} from './owned-http-protocol-contracts.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE,PRIMITIVE_RESULT_RUNTIME_SOURCE,PRIMITIVE_RESULT_DECLARATIONS_SOURCE} from '../primitive-result-native-source.mjs';
import {requireOwnedTextSources} from './owned-text-contracts.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
export const ownedPrimitiveResultOperation=name=>primitiveResultContract(name)??ownedResultSourceOperation(name)??ownedHttpProtocolOperation(name);
const payloads=Object.freeze({'bool-text-result':'bool','u64-text-result':'u64','i64-text-result':'i64','str-text-result':'str','text-text-result':'text-owned'});
export const ownedPrimitiveResultPayload=type=>Object.hasOwn(payloads,type)?payloads[type]:null;
export const ownedPrimitiveResultType=type=>ownedPrimitiveResultPayload(type)!==null;
export const ownedPrimitiveResultAbsent=value=>value?.type==='str-text-result'&&(value.kind==='primitive-result-err'||value.kind==='primitive-result-call'&&ownedPrimitiveResultOperation(value.name)?.method==='err'||value.kind==='variable'&&value.definitelyAbsent===true);
export const ownedPrimitiveResultRustTypes=Object.freeze(Object.fromEntries(Object.entries(payloads).map(([type,payload])=>[type,'::std::result::Result<'+(payload==='str'?"&'a str":payload==='text-owned'?'::std::string::String':payload)+',::std::string::String>'])));
export function ownedPrimitiveResultStaticLoan(value,{stringLoan}={}){
 if(value?.type!=='str-text-result'||value.root!==null)return false;
 if(value.kind==='primitive-result-err')return true;
 if(value.kind==='primitive-result-ok')return stringLoan(value.value)?.root===null;
 if(value.kind==='primitive-result-call'){const row=ownedPrimitiveResultOperation(value.name);if(row?.method==='err')return true;if(row?.method==='ok')return stringLoan(value.args[0])?.root===null;}
 if(value.kind==='choose')return ownedPrimitiveResultStaticLoan(value.then,{stringLoan})&&ownedPrimitiveResultStaticLoan(value.else,{stringLoan});
 return ['variable','local-call','primitive-result-call'].includes(value.kind)&&Object.hasOwn(value,'staticResultBorrow')&&value.staticResultBorrow===true;
}
export function requireOwnedPrimitiveResultSources(files,configuration){
 const records=requireOwnedTextSources(files,configuration),root=files.get('src/lib.rs'),source=files.get('src/translation_primitive_results_core.rs');if(source!==PRIMITIVE_RESULT_NATIVE_SOURCE||files.get(configuration.runtimeRoot+'/primitive-result-runtime.mjs')!==PRIMITIVE_RESULT_RUNTIME_SOURCE||files.get(configuration.declarationRoot+'/primitive-result-runtime.d.mts')!==PRIMITIVE_RESULT_DECLARATIONS_SOURCE)throw new TypeError('Complete actual primitive Result native/runtime sources required');
 for(const [path,text]of [['src/lib.rs',root],['src/translation_primitive_results_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text)throw new TypeError('Complete native Result CST differs');const capture=captureSourceModuleViews({source:text,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){const edges=items.filter(item=>item.term==='mod'&&item.name==='translation_primitive_results_core');if(edges.length!==1||text.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_primitive_results_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_primitive_results_core')))throw new TypeError('Actual unique Result core module edge required');}
  else{const functions=items.filter(item=>item.term==='fn'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='fn')).some(token=>token.text==='pub'));if(functions.length!==PRIMITIVE_RESULT_CONTRACTS.length||functions.some(item=>!primitiveResultContract(item.name)))throw new TypeError('Complete actual public Result census differs');}
  records.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }return records;
}
