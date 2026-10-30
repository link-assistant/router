// One function's chronological source-selection DATA. No owner/type permit.

import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
import {censusLocalAliasBindings} from './local-alias-binding-source.mjs';
import {readNativeCountLiteralSource} from './native-integer-literal-source.mjs';
const fail=message=>{throw new TypeError('Text local argument source: '+message);};
export function createTextLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys()),{jsonNames=null,opaqueRegions=null}={}){
 if(opaqueRegions===null)opaqueRegions=coreCarrierCallbackSourceRegions(rows);
 if(!rows.some(row=>row.text==='let'||row.text==='for'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(!textLocalCensus(rows,allParameters,opaqueRegions))return null;
 return createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:operand=>readTextWrittenAliasDomain(operand)??readJsonReceiverWrittenSourceRole(operand,{jsonNames}),readOperand:(operand,bindings,declared)=>readTextStageAliasOperand(operand,bindings,declared,jsonNames),acceptResult:event=>['str','text-owned'].includes(event.returnsKind)?event.returnsKind:null}),initializerSizes:[1,5],initializerEnd:primitiveLocalInitializerEnd,aliasKind:'complete-immutable-text-alias',resultKind:'complete-selected-text-result-alias',opaqueRegions});
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const borrowedType=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);

function textLocalCensus(rows,parameters,opaqueRegions=[]){
 return censusLocalAliasBindings(rows,parameters,{opaqueRegions,protectedNames:['std','core','crate','self','Self','translation_core','translation_text_core','translation_json_fields_core','String','str','Str','Text','u64','usize','bool','Some','None','Option']}).reason===null;
}
export function readTextAliasOperand(rows,bindings,written=null){
 if(rows.length===1&&ident(rows[0])&&['str','text-owned','usize-count'].includes(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length===1&&rows[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(rows[0].text))return {kind:'str',binding:null};
 const count=readNativeCountLiteralSource(rows,{suffixes:written==='usize-count'?['','usize']:['usize'],maximum:'4294967295'});if(count)return {kind:'usize-count',binding:null};
 if(rows.length===5&&ident(rows[0])&&['str','text-owned'].includes(bindings.get(rows[0].text))&&['.','len','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'usize-count',binding:rows[0].text,bridge:'len'};
 if(rows.length===5&&ident(rows[0])&&bindings.get(rows[0].text)==='text-owned'&&['.','as_str','(',')'].every((word,at)=>rows[at+1]?.text===word))return {kind:'str',binding:rows[0].text,bridge:'as_str'};return null;
}

export function readTextWrittenAliasDomain(rows){const value=rows.map(row=>row.text).join('');if(borrowedType(value))return 'str';if(/^(?:(?:::)?std::string::)?String$/u.test(value)||value==='crate::translation_core::Text')return 'text-owned';if(/^(?:(?:::)?(?:std|core)::primitive::)?usize$/u.test(value))return 'usize-count';return readJsonReceiverWrittenSourceRole(rows);}

function readTextStageAliasOperand(rows,bindings,written=null,jsonNames=null){
 const core=readTextCoreCallSource(rows,bindings);if(core)return core;
 const original=readTextAliasOperand(rows,bindings,written);if(original)return original;const receiver=readJsonReceiverAliasSource(rows,bindings,{declared:written,jsonNames});if(receiver)return receiver;const field=readJsonFieldCallSource(rows,bindings);return field?.kind==='payload'&&['str','text-owned'].includes(field.domain)?{kind:field.domain,binding:null,bridge:'complete-qualified-json-field-source'}:null;
}
import {readJsonFieldCallSource} from './json-field-call-source.mjs';
import {readJsonReceiverAliasSource,readJsonReceiverWrittenSourceRole} from './json-receiver-source.mjs';
import {primitiveLocalInitializerEnd} from './primitive-local-expression-source.mjs';

import {readTextCoreCallSource} from './text-core-call-source.mjs';
import {coreCarrierCallbackSourceRegions} from './core-carrier-callback-source-regions.mjs';
