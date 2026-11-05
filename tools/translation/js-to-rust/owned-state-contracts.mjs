// Fixed owned operation DATA. Only the copied original source checker can
// bind an import/type/caller and issue its complete checked function.
import {jsonStateContract,JSON_STATE_CONTRACTS} from '../json-state-contracts.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {requireOwnedIterationLeaves} from './owned-iteration-contracts.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
const roles={'owned-json':'json','shared-json':'json-ref','shared-json-list':'json-list-ref','owned-json-list':'json-list-owned',str:'str',bool:'bool',u64:'u64'};
export function ownedStateOperation(name){const row=jsonStateContract(name);return row?{...row,args:row.parameters.map(role=>roles[role]),ret:roles[row.returns],rustPath:'crate::translation_state_core::'+row.rustName}:null;}
export function ownedStateCompatible(actual,wanted){
 if(['json','json-ref'].includes(wanted))return ['json','json-ref'].includes(actual);
 if(['json-list-ref','json-list-owned'].includes(wanted))return ['json-list-ref','json-list-owned'].includes(actual);
 if(wanted==='str')return actual==='str'||actual==='text-owned';
 return actual===wanted||wanted==='u64'&&actual==='usize';
}
export function ownedStateWrittenType(ts,type,analysis,resolveImport){
 const fail=()=>{throw new TypeError('Owned state written type must use its actual unshadowed imported operation');};
 function builtin(node,name){if(!ts.isIdentifier(node)||node.text!==name)return false;if(analysis.checker.getSymbolAtLocation(node)?.declarations?.length)fail();return true;}
 const operation=query=>{if(!ts.isTypeQueryNode(query)||!ts.isIdentifier(query.exprName))return null;const binding=resolveImport(query.exprName),row=ownedStateOperation(binding.name);return row&&binding.target===analysis.runtimeRoot+'/json-state-runtime.mjs'?row:null;};
 if(ts.isTypeReferenceNode(type)&&builtin(type.typeName,'ReturnType')&&type.typeArguments?.length===1){const row=operation(type.typeArguments[0]);if(row)return row.ret==='json'?'json-ref':row.ret==='json-list-owned'?'json-list-ref':row.ret;}
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&ts.isTypeReferenceNode(type.objectType)&&builtin(type.objectType.typeName,'Parameters')&&type.objectType.typeArguments?.length===1){
  const row=operation(type.objectType.typeArguments[0]);if(row){const text=type.indexType.literal.text;if(!/^[0-9]+$/u.test(text))fail();const index=Number(text);if(!Number.isSafeInteger(index)||index<0||index>=row.args.length)fail();const wanted=row.args[index];return wanted==='json'?'json-ref':wanted==='json-list-owned'?'json-list-ref':wanted;}
 }
 return null;
}
export function requireOwnedStateSources(files){
 const prior=requireOwnedIterationLeaves(files),source=files.get('src/translation_state_core.rs'),root=files.get('src/lib.rs');
 if(source!==JSON_STATE_NATIVE_SOURCE||typeof root!=='string')throw new TypeError('Complete actual owned JSON state source is required');
 const rows=[];
 for(const [path,text]of [['src/lib.rs',root],['src/translation_state_core.rs',source]]){
  const concrete=transportConcreteSyntaxSource(text,{language:'Rust'}),capture=captureSourceModuleViews({source:concrete.source,sourcePath:path}),items=originalModuleViewItems(capture.views[0],text);
  if(path==='src/lib.rs'){
   const modules=items.filter(item=>item.term==='mod'&&item.name==='translation_state_core');if(modules.length!==1||text.slice(modules[0].start,modules[0].end).trim()!=='pub mod translation_state_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_state_core')))throw new TypeError('One actual unambiguous owned state module edge required');
  }else{const functions=items.filter(item=>item.term==='fn');if(functions.length!==JSON_STATE_CONTRACTS.length||functions.some(item=>!jsonStateContract(item.name)))throw new TypeError('Complete actual state operation census differs');}
  rows.push({path,source:text,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false});
 }
 return [...prior,...rows];
}
