// One function's chronological source-selection DATA. No owner/type permit.
import {simpleBase64LocalBindings} from './base64-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
const fail=message=>{throw new TypeError('JSON slice local source: '+message);};
export function createJsonSliceLocalSource(rows,parameters,allParameters){
 if(!rows.some(row=>row.text==='let'))return {at(){return parameters;},evidence(){return null;},names:new Set()};const reserved=['translation_collections_core','Vec','Option','Some','None','Result','Ok','Err','Value','Json','Maybe','Outcome','serde_json','crate','self','Self'],census=new Map([...allParameters,...reserved].map(name=>[name,null]));if(simpleBase64LocalBindings(rows,census).reason)return null;
 const names=new Set();for(let at=0;at<rows.length;at++)if(rows[at].text==='let')names.add(rows[at+1].text);const source=createChronologicalLocalSource(rows,parameters,{initializerSizes:[1,5],aliasKind:'complete-immutable-json-slice-alias',resultKind:'unissued-json-slice-result',acceptResult:()=>null,readOperand:(operand,bindings)=>{
  const name=operand[0]?.text,kind=bindings.get(name);if(operand.length===1&&operand[0].type==='ident'&&['json-slice','json-vector'].includes(kind))return {kind,binding:name};if(operand.length===5&&kind==='json-vector'&&['.','as_slice','(',')'].every((word,at)=>operand[at+1]?.text===word))return {kind:'json-slice',binding:name,bridge:'as_slice'};return null;
 }});return {at:position=>source.at(position),evidence:name=>source.evidence(name),names};
}
