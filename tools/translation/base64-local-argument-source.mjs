// One function's chronological source-selection DATA. No owner/type permit.
import {readConcreteBase64Argument,simpleBase64LocalBindings} from './base64-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
const fail=message=>{throw new TypeError('Base64 local argument source: '+message);};
export function createBase64LocalArgumentSource(rows,parameters){
 if(!rows.some(row=>row.text==='let'||row.text==='for'||row.text==='match'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(rows.some(row=>row.text==='match')&&simpleBase64LocalBindings(rows,parameters).reason)return null;
 return createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:readBase64WrittenAliasDomain,readOperand:readConcreteBase64Argument,acceptResult:event=>event.method==='encode'&&/^base64_(standard|standard_no_pad|url_no_pad)_encode_(text|bytes|owned_bytes|owned_text|array32)$/u.test(event.operation)?'owned-text':null}),initializerSizes:[1,5],aliasKind:'complete-immutable-operand-alias',resultKind:'complete-selected-native-encode-alias'});
}

function readBase64WrittenAliasDomain(rows){const value=rows.map(row=>row.text).join('').replace(/^&'[A-Za-z_][A-Za-z0-9_]*/u,'&'),types=new Map([['&str','text'],['&crate::translation_core::Str','text'],['String','owned-text'],['::std::string::String','owned-text'],['crate::translation_core::Text','owned-text'],['&[u8]','bytes'],['Vec<u8>','owned-bytes'],['::std::vec::Vec<u8>','owned-bytes'],['[u8;32]','array32']]);return types.get(value)??null;}
