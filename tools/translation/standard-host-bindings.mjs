// Namespace descriptions from the existing registered source profiles only.
// This data-only layer imports no parser/checker/Host class. Tables stay partial.
import {externalModuleBindings} from './registered-bindings.mjs';
import {EFFECT_DATA,EFFECT_CONTRACTS} from './extensions/effects-contracts.mjs';
import {JSON_DATA,JSON_CONTRACTS} from './extensions/json-contracts.mjs';
import {TIME_DATA,TIME_CONTRACTS} from './extensions/time-contracts.mjs';
import {INTEGER_DATA,INTEGER_ERROR_CONTRACTS} from './extensions/integer-contracts.mjs';
import {FLOAT_CONTRACTS} from './extensions/primitive-float-contracts.mjs';
import {COPY_NAMESPACE_BINDINGS} from './copy-trait-owners.mjs';
import {STANDARD_NAMESPACE_BINDINGS} from './namespace-standard.mjs';
const sourceTypes=[['std','option','Option'],['std','result','Result'],['std','time','Duration'],['serde_json','Value'],['serde_json','Number'],['serde_json','Error'],['serde_json','error','Category'],['std','io','Error'],['std','env','VarError'],['std','ffi','OsString'],['std','num','ParseIntError'],['std','num','IntErrorKind'],['std','time','TryFromFloatSecsError']];
function profileData(){
  const result=[];
  const merge=(target,items,path=[])=>{for(const item of items){const existing=target.find(entry=>entry.name===item.name&&entry.k===item.k);if(item.k==='module'){const module=existing??{...item,items:[]};if(!existing)target.push(module);merge(module.items,item.items,[...path,item.name]);}else if(!existing)target.push({...item,hostTypePath:[...path,item.name],generated:item.generated??'router-host-contract'});}};
  for(const items of [EFFECT_DATA,JSON_DATA,TIME_DATA,INTEGER_DATA])merge(result,items);return result;
}
export function registeredStandardHostBindings(extraBindings=[]) {
  return externalModuleBindings({data:profileData(),contracts:[...FLOAT_CONTRACTS,...JSON_CONTRACTS,...TIME_CONTRACTS,...INTEGER_ERROR_CONTRACTS,...EFFECT_CONTRACTS],extraBindings:[
    ...sourceTypes.map(target=>({name:target.at(-1),namespace:'type',target,kind:['Option','Result','Value','Category','VarError','IntErrorKind'].includes(target.at(-1))?'enum':'struct'})),
    ...['Some','None','Ok','Err'].flatMap(name=>['type','value'].map(namespace=>({name,namespace,target:name==='Some'||name==='None'?['std','option','Option',name]:['std','result','Result',name],kind:'constructor'}))),
    ...COPY_NAMESPACE_BINDINGS,...STANDARD_NAMESPACE_BINDINGS,{name:'FromStr',namespace:'type',target:['std','str','FromStr'],kind:'trait'},...extraBindings,
  ]});
}
