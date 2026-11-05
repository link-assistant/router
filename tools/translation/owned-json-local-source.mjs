// One function's chronological source-selection DATA. No owner/type permit.
import {simpleBase64LocalBindings} from './base64-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
const fail=message=>{throw new TypeError('Owned JSON local source: '+message);};
export function createOwnedJsonLocalSource(rows,parameters,allParameters){
 if(!rows.some(row=>row.text==='let'||row.text==='for'||row.text==='match'))return null;const reserved=['translation_carriers_core','Option','Some','None','Result','Ok','Err','Value','Json','Maybe','Outcome','serde_json','crate','self','Self'],census=new Map([...allParameters,...reserved].map(name=>[name,null]));if(simpleBase64LocalBindings(rows,census).reason)return null;
 const initial=new Map([...parameters].flatMap(([name,role])=>{const kind=encodeOwnedJsonRole(role);return kind?[[name,kind]]:[];})),source=createChronologicalLocalSource(rows,initial,{...createWrittenLocalAliasRules({readWrittenDomain:readWrittenOwnedJsonAliasDomain,readOperand:(operand,bindings)=>{
  const borrowed=operand.length===2&&operand[0].text==='&',row=operand[borrowed?1:0];if(operand.length!==(borrowed?2:1)||row?.type!=='ident')return null;const role=decodeOwnedJsonRole(bindings.get(row.text));if(!role)return null;return {kind:encodeOwnedJsonRole({...role,borrowed:borrowed||role.borrowed}),binding:row.text};
 },acceptResult:event=>event.returnsKind==='json'?'json-owned':event.returnsKind==='json-option'?'option-owned':event.returnsKind==='json-text-result'?'result-owned':null}),initializerSizes:[1,2],aliasKind:'complete-immutable-owned-json-alias',resultKind:'complete-selected-owned-json-result-alias'});let current=null;const visible={has(name){return decodeOwnedJsonRole(current.get(name))!==null;},get(name){return decodeOwnedJsonRole(current.get(name))??undefined;}};
 return {at(position){current=source.at(position);return visible;},evidence:name=>source.evidence(name),selectedCall:event=>source.selectedCall(event)};
}

function encodeOwnedJsonRole(role){return role&&['json','option','result'].includes(role.kind)&&typeof role.borrowed==='boolean'?role.kind+'-'+(role.borrowed?'shared':'owned'):null;}
function decodeOwnedJsonRole(source){if(typeof source!=='string')return null;const match=/^(json|option|result)-(owned|shared)$/u.exec(source);return match?{kind:match[1],borrowed:match[2]==='shared'}:null;}

function readWrittenOwnedJsonAliasDomain(rows){let value=rows.map(row=>row.text).join(''),borrowed=value.startsWith('&');if(borrowed)value=value.replace(/^&(?:'[A-Za-z_][A-Za-z0-9_]*)?/u,'');const C='crate::translation_core::',json=C+'Json',types=new Map([[json,'json'],['::std::option::Option<'+json+'>','option'],[C+'Maybe<'+json+'>','option'],['::std::result::Result<'+json+',::std::string::String>','result'],[C+'Outcome<'+json+',::std::string::String>','result']]),kind=types.get(value);return kind?encodeOwnedJsonRole({kind,borrowed}):null;}
