// Public ABI source equations, never reverse native-symbol/type/body authority.
// The native TypeScript producer still has to resolve the actual import symbol,
// reparse the complete source/CST, interpret checked meta, and issue its private
// whole-body ownership/loan receipt before using these source fragments.
import {orderedTextMapContract} from './ordered-text-map-20261102-contracts.mjs';
const fail=()=>{throw TypeError('Ordered map reverse needs a fixed operation and independently bound operand locals');};
export const ORDERED_MAP_REVERSE_RUST_TYPES=Object.freeze({
 'text-map-input':"&'a crate::translation_ordered_text_map_core::OrderedTextMap",
 'text-map':'crate::translation_ordered_text_map_core::OrderedTextMap',
 'text-map-ref':"&'a crate::translation_ordered_text_map_core::OrderedTextMap",
 'text-pairs-input':"&'a [(::std::string::String, ::std::string::String)]",
 'text-pairs-owned':'::std::vec::Vec<(::std::string::String, ::std::string::String)>',
 'text-list-owned':'::std::vec::Vec<::std::string::String>',
 str:"&'a str",'text-owned':'::std::string::String','str-option-ref':"::std::option::Option<&'a str>",bool:'bool',u64:'u64',
});
export function orderedTextMapReverseOperation(name){
 const row=orderedTextMapContract(name);if(!row||row.javascriptName!==name)return null;
 // JavaScript immutability does not encode Rust by-value ownership. Reverse
 // operands use the borrowed public ABI, with explicit copies only at fixed
 // native call boundaries. No application Clone/Copy/Vec trait is admitted.
 return Object.freeze({name:row.javascriptName,rustPath:row.rustPath,
  parameters:Object.freeze(row.parameters.map(role=>role==='text-map'?'text-map-input':role==='text-pairs-owned'?'text-pairs-input':role==='text-owned'?'str':role)),
  returns:row.returns==='text-list-owned'?'vec:text-owned':row.returns,loanRoot:row.returnedLoan?0:null,sourceAuthority:false,semanticAuthority:false});
}
export function orderedTextMapReverseRustCall(name,arguments_,argumentTypes=null){
 const row=orderedTextMapContract(name),operation=orderedTextMapReverseOperation(name);
 if(!row||!operation||!Array.isArray(arguments_)||arguments_.length!==row.parameters.length||arguments_.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))fail();
 const borrowed=(value,index)=>argumentTypes?.[index]==='text-map'?'&'+value:value;
 const operands=arguments_.map((value,index)=>row.parameters[index]==='text-map'?'crate::translation_ordered_text_map_core::text_map_copy('+borrowed(value,index)+')':row.parameters[index]==='text-map-ref'?borrowed(value,index):row.parameters[index]==='text-pairs-owned'?value+'.to_vec()':row.parameters[index]==='text-owned'?value+'.to_owned()':value);
 // Locals are evaluated by the parent exactly once, left to right, before
 // this call equation. Copying an opaque map keeps its native invariants.
 const checks=arguments_.flatMap((value,index)=>['str','text-owned'].includes(row.parameters[index])?['assert!('+value+'.len() <= 1048576, "ordered text map input byte bound");']:[]);
 const call=operation.rustPath+'('+operands.join(', ')+')';return checks.length?'{ '+checks.join(' ')+' '+call+' }':call;
}
export function orderedTextMapReverseTypeWitness(role){
 const rows={
  'text-map-input':{name:'router_text_map_len',kind:'parameter',index:0},
  'text-map':{name:'router_text_map_new',kind:'return'},
  'text-map-ref':{name:'router_text_map_get',kind:'parameter',index:0},
  'text-pairs-input':{name:'router_text_map_from_pairs',kind:'parameter',index:0},
  'text-pairs-owned':{name:'router_text_map_pairs',kind:'return'},
  'text-list-owned':{name:'router_text_map_keys',kind:'return'},
  'vec:text-owned':{name:'router_text_map_keys',kind:'return'},
  'str-option-ref':{name:'router_text_map_get',kind:'return'},
 };
 const row=rows[role];return row?Object.freeze({...row,sourceAuthority:false,semanticAuthority:false}):null;
}

// Parameter ABI is borrowed; freshly returned maps are owned. Neither domain
// is serde_json::Map, Vec<String>, a public record or an inferred Copy value.
export function orderedTextMapReverseCompatible(actual,wanted){
 return actual===wanted||['text-map-input','text-map-ref'].includes(wanted)&&['text-map-input','text-map-ref','text-map'].includes(actual)||actual==='text-owned'&&wanted==='str';
}
export const ORDERED_MAP_REVERSE_TYPESCRIPT_TYPES=Object.freeze({
 'text-map-input':'Parameters<typeof __ro_router_text_map_len>[0]',
 'text-map-ref':'Parameters<typeof __ro_router_text_map_len>[0]',
 'text-map':'ReturnType<typeof __ro_router_text_map_new>',
 'vec:text-owned':'ReturnType<typeof __ro_router_text_map_keys>',
});
// Header DATA only. The original emitter invokes this after fresh private whole
// source/body checking. Only the actual returned map-loan root gets a binder;
// key and unused map references keep their independent elided lifetimes.
export function orderedTextMapReverseLifetimeHeader(item){
 if(item.returns!=='str-option-ref'||item.resultRoot===null)return null;
 const roots=item.params.filter(parameter=>parameter.name===item.resultRoot);if(roots.length!==1)fail();
 if(roots[0].type!=='text-map-input')return null;
 return Object.freeze({root:roots[0].name,lifetime:"'ro_map ",binder:"<'ro_map>",callerAuthority:false});
}
