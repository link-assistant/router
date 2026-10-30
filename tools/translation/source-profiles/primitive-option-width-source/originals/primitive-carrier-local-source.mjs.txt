// One function's chronological source-selection DATA. No owner/type permit.
import {readPrimitiveAliasOperand} from './primitive-local-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules,readLocalAliasInitializer} from './local-alias-written-source.mjs';
import {censusLocalAliasBindings} from './local-alias-binding-source.mjs';
const fail=message=>{throw new TypeError('Primitive carrier local source: '+message);};
export function createPrimitiveCarrierLocalSource(rows,parameters,allParameters,{readWrittenRole}){
 if(!rows.some(row=>row.text==='let'||row.text==='for'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(!carrierLocalCensus(rows,allParameters))return null;const initial=new Map([...parameters].flatMap(([name,role])=>{const domain=encodeCarrierRole(role);return domain?[[name,domain]]:[];}));
 const source=createChronologicalLocalSource(rows,initial,{...createWrittenLocalAliasRules({readWrittenDomain:operand=>encodeCarrierRole(readWrittenRole(operand)),readOperand:(operand,bindings,declared)=>{const value=readCarrierAliasOperand(operand,bindings,decodeCarrierRole(declared));return value?{kind:encodeCarrierRole(value),binding:value.binding??null}:null;},acceptResult:event=>encodeCarrierRole(event.resultRole)}),initializerSizes:[1,2,3,4,5,6,7,8,9,10,11,12],aliasKind:'complete-immutable-carrier-alias',resultKind:'complete-selected-carrier-result-alias'});let current=null;
 const visible={has(name){return decodeCarrierRole(current.get(name))!==null;},get(name){return decodeCarrierRole(current.get(name))??undefined;},*[Symbol.iterator](){for(const [name,domain]of current){const role=decodeCarrierRole(domain);if(role)yield [name,role];}}};
 return {at(position){current=source.at(position);return visible;},evidence:name=>source.evidence(name),selectedCall:event=>source.selectedCall(event)};
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const carrierDomain=/^(?:payload:(?:bool|u64|i64|str|text-owned|owned-str)|option:(?:bool|u64|i64|str|text-owned)|result:(?:bool|u64|i64|str|text)|json:json)$/u;
export function encodeCarrierRole(role){const value=role&&role.kind+':'+role.domain;return typeof value==='string'&&carrierDomain.test(value)?value:null;}
export function decodeCarrierRole(value){if(typeof value!=='string'||!carrierDomain.test(value))return null;const [kind,domain]=value.split(':');return {kind,domain};}
function carrierLocalCensus(rows,parameters){
 return censusLocalAliasBindings(rows,parameters,{protectedNames:['std','core','crate','self','Self','translation_core','translation_primitive_option_core','translation_primitive_option_callbacks_core','translation_primitive_results_core','translation_owned_results_core','Option','Some','None','Result','Ok','Err','String','str','u64','i64','bool']}).reason===null;
}
function scalarOperand(rows,bindings,wanted){
 if(rows.length===1){const row=rows[0],known=ident(row)&&decodeCarrierRole(bindings.get(row.text));if(known)return {...known,binding:row.text};if(['true','false'].includes(row.text))return {kind:'payload',domain:'bool'};if(row.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text))return {kind:'payload',domain:'str'};}
 const literal=readPrimitiveAliasOperand(rows,new Map(),wanted?.kind==='payload'&&['u64','i64'].includes(wanted.domain)?wanted.domain:null);if(literal&&['u64','i64'].includes(literal.kind))return {kind:'payload',domain:literal.kind};
 if(rows.length===5&&rows[1].text==='.'&&['to_owned','to_string'].includes(rows[2].text)&&rows[3].text==='('&&rows[4].text===')'){const value=scalarOperand(rows.slice(0,1),bindings,null);if(value?.kind==='payload'&&value.domain==='str')return {kind:'payload',domain:'text-owned'};}return null;
}
export function readCarrierAliasOperand(rows,bindings,wanted=null){
 if(!rows.length||rows.length>12)return null;const scalar=scalarOperand(rows,bindings,wanted);if(scalar)return scalar;
 if(rows.length===5&&ident(rows[0])&&decodeCarrierRole(bindings.get(rows[0].text))?.kind==='json'&&rows[1].text==='.'&&rows[3].text==='('&&rows[4].text===')'){const domain={as_bool:'bool',as_u64:'u64',as_i64:'i64',as_str:'str'}[rows[2].text];if(domain)return {kind:'option',domain};}
 const text=rows.map(row=>row.text).join('');if(/^(?:(?:::)?(?:std|core)::option::Option::|Option::)?None$/u.test(text))return wanted?.kind==='option'?wanted:null;
 const open=rows.findIndex(row=>row.text==='(');if(open<1||rows.at(-1).text!==')')return null;const path=rows.slice(0,open).map(row=>row.text).join(''),constructor=/^(?:(?:::)?(?:std|core)::option::Option::|Option::)?Some$/u.test(path)?'Some':/^(?:(?:::)?(?:std|core)::result::Result::|Result::)?(Ok|Err)$/u.exec(path)?.[1];if(!constructor)return null;
 const value=scalarOperand(rows.slice(open+1,-1),bindings,constructor==='Err'?null:wanted&&{kind:'payload',domain:wanted.domain});if(constructor==='Err')return wanted?.kind==='result'&&value?.kind==='payload'&&value.domain==='text-owned'?wanted:null;
 return value?.kind==='payload'&&['bool','u64','i64','str','text-owned'].includes(value.domain)?{kind:constructor==='Some'?'option':'result',domain:constructor==='Ok'&&value.domain==='text-owned'?'text':value.domain}:null;
}

// A bounded source initializer projection, not a type or executable permit.
export function readCarrierLocalInitializer(rows,at,readWrittenRole){const selected=readLocalAliasInitializer(rows,at,part=>encodeCarrierRole(readWrittenRole(part)));return selected?{start:selected.start,written:decodeCarrierRole(selected.domain)}:null;}
