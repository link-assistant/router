// One function's chronological source-selection DATA. No owner/type permit.

import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
import {censusLocalAliasBindings} from './local-alias-binding-source.mjs';
import {primitiveBitwiseLiteral} from './primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Text local argument source: '+message);};
export function createTextLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys())){
 if(!rows.some(row=>row.text==='let'||row.text==='for'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(!textLocalCensus(rows,allParameters))return null;
 return createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:readTextWrittenAliasDomain,readOperand:readTextAliasOperand,acceptResult:event=>['str','text-owned'].includes(event.returnsKind)?event.returnsKind:null}),initializerSizes:[1,5],aliasKind:'complete-immutable-text-alias',resultKind:'complete-selected-text-result-alias'});
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const borrowedType=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);

function textLocalCensus(rows,parameters){
 return censusLocalAliasBindings(rows,parameters,{protectedNames:['std','core','crate','self','Self','translation_core','translation_text_core','String','str','Str','Text','u64','usize','bool','Some','None','Option']}).reason===null;
}
export function readTextAliasOperand(rows,bindings,written=null){
 if(rows.length===1&&ident(rows[0])&&['str','text-owned','usize-count'].includes(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length===1&&rows[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(rows[0].text))return {kind:'str',binding:null};
 if(written==='usize-count'&&rows.length===1&&rows[0].type==='number'&&/^[0-9][0-9_]{0,62}$/u.test(rows[0].text)){const digits=rows[0].text.replaceAll('_','');return primitiveBitwiseLiteral(digits+'n',false,'u32')!==null?{kind:'usize-count',binding:null}:null;}
 if(rows.length===1&&rows[0].type==='number'&&rows[0].text.length<=64){const match=/^([0-9][0-9_]{0,62})_?usize$/u.exec(rows[0].text),digits=match?.[1].replaceAll('_','');if(digits&&primitiveBitwiseLiteral(digits+'n',false,'u32')!==null)return {kind:'usize-count',binding:null};}
 if(rows.length===5&&ident(rows[0])&&['str','text-owned'].includes(bindings.get(rows[0].text))&&['.','len','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'usize-count',binding:rows[0].text,bridge:'len'};
 if(rows.length===5&&ident(rows[0])&&bindings.get(rows[0].text)==='text-owned'&&['.','as_str','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'str',binding:rows[0].text,bridge:'as_str'};return null;
}

export function readTextWrittenAliasDomain(rows){const value=rows.map(row=>row.text).join('');if(borrowedType(value))return 'str';if(/^(?:(?:::)?std::string::)?String$/u.test(value)||value==='crate::translation_core::Text')return 'text-owned';if(/^(?:(?:::)?(?:std|core)::primitive::)?usize$/u.test(value))return 'usize-count';return null;}
