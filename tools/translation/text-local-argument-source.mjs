// One function's chronological source-selection DATA. No owner/type permit.

import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {primitiveBitwiseLiteral} from './primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Text local argument source: '+message);};
export function createTextLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys())){
 if(!rows.some(row=>row.text==='let'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(!textLocalCensus(rows,allParameters))return null;
 const borrowedAnnotations=new Set();return createChronologicalLocalSource(rows,parameters,{readOperand:(operand,bindings)=>{const value=readTextAliasOperand(operand,bindings);return value&&(!borrowedAnnotations.has(operand[0]?.start)||value.kind==='str')?value:null;},initializerSizes:[1,5],initializerStart:(at,original)=>{const start=textInitializerStart(at,original);if(start!==null&&original[at+2]?.text===':')borrowedAnnotations.add(original[start]?.start);return start;},aliasKind:'complete-immutable-text-alias',resultKind:'complete-selected-text-result-alias',acceptResult:event=>['str','text-owned'].includes(event.returnsKind)&&(!borrowedAnnotations.has(event.span[0])||event.returnsKind==='str')?event.returnsKind:null});
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const borrowedType=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);
function textInitializerStart(at,rows){
 if(rows[at+2]?.text==='=')return at+3;if(rows[at+2]?.text!==':')return null;let end=at+3;while(end<rows.length&&end-at<=67&&!['=',';','{','}'].includes(rows[end].text))end++;if(end-at>67||rows[end]?.text!=='='||!borrowedType(rows.slice(at+3,end).map(row=>row.text).join('')))return null;return end+1;
}
function textLocalCensus(rows,parameters){
 if(rows.length>200000||rows.some(row=>['for','match'].includes(row.text)))return false;const names=new Set(parameters),protectedNames=new Set(['std','core','crate','self','Self','translation_core','translation_text_core','String','str','Str','Text','u64','usize','bool','Some','None','Option']);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){const name=rows[at+1];if(!ident(name)||['mut','ref','_'].includes(name.text)||!['=',':'].includes(rows[at+2]?.text)||names.has(name.text)||protectedNames.has(name.text)||++count>4096)return false;names.add(name.text);}return true;
}
export function readTextAliasOperand(rows,bindings){
 if(rows.length===1&&ident(rows[0])&&['str','text-owned','usize-count'].includes(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length===1&&rows[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(rows[0].text))return {kind:'str',binding:null};
 if(rows.length===1&&rows[0].type==='number'&&rows[0].text.length<=64){const match=/^([0-9][0-9_]{0,62})_?usize$/u.exec(rows[0].text),digits=match?.[1].replaceAll('_','');if(digits&&primitiveBitwiseLiteral(digits+'n',false,'u32')!==null)return {kind:'usize-count',binding:null};}
 if(rows.length===5&&ident(rows[0])&&['str','text-owned'].includes(bindings.get(rows[0].text))&&['.','len','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'usize-count',binding:rows[0].text,bridge:'len'};
 if(rows.length===5&&ident(rows[0])&&bindings.get(rows[0].text)==='text-owned'&&['.','as_str','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'str',binding:rows[0].text,bridge:'as_str'};return null;
}
