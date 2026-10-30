// One function's chronological source-selection DATA. No owner/type permit.
import {simpleBase64LocalBindings} from './base64-argument-source.mjs';
import {readTextAliasOperand,readTextWrittenAliasDomain} from './text-local-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
import {localAliasDeclaration} from './local-alias-binding-source.mjs';
const fail=message=>{throw new TypeError('JSON field local source: '+message);};
export function createJsonFieldLocalSource(rows,parameters,allParameters,{jsonNames=null}={}){
 if(!rows.some(row=>row.text==='let'||row.text==='for'||row.text==='match'))return {at(){return parameters;},evidence(){return null;},selectedCall(){},names:new Set()};const reserved=['translation_json_fields_core','Option','Some','None','Result','Ok','Err','Value','Json','Maybe','Outcome','serde_json','crate','self','Self'],census=new Map([...allParameters,...reserved].map(name=>[name,null]));if(simpleBase64LocalBindings(rows,census).reason)return null;
 const names=new Set();for(let at=0;at<rows.length;at++)if(rows[at].text==='let')names.add(localAliasDeclaration(rows,at).name);const source=createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:operand=>readJsonFieldWrittenAliasDomain(operand,jsonNames),readOperand:(operand,bindings,declared)=>{const receiver=readJsonReceiverAliasSource(operand,bindings,{declared,jsonNames});if(receiver)return receiver;return readTextAliasOperand(operand,bindings,declared);},acceptResult:event=>event.returnsKind==='json'?'json-owned':event.returnsKind==='json-ref'?'json-reference':null}),initializerSizes:[1,5],initializerEnd:primitiveLocalInitializerEnd,aliasKind:'complete-immutable-json-field-alias',resultKind:'unissued-json-field-result'});
 return {at:position=>source.at(position),evidence:name=>source.evidence(name),selectedCall:event=>source.selectedCall(event),names};
}

function readJsonFieldWrittenAliasDomain(rows,jsonNames=null){return readJsonReceiverWrittenSourceRole(rows,{jsonNames})??readTextWrittenAliasDomain(rows);}

import {readJsonReceiverAliasSource,readJsonReceiverWrittenSourceRole} from './json-receiver-source.mjs';
import {primitiveLocalInitializerEnd} from './primitive-local-expression-source.mjs';
