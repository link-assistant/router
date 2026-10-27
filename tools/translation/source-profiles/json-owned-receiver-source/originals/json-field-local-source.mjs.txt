// One function's chronological source-selection DATA. No owner/type permit.
import {simpleBase64LocalBindings} from './base64-argument-source.mjs';
import {readTextAliasOperand,readTextWrittenAliasDomain} from './text-local-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
import {localAliasDeclaration} from './local-alias-binding-source.mjs';
const fail=message=>{throw new TypeError('JSON field local source: '+message);};
export function createJsonFieldLocalSource(rows,parameters,allParameters){
 if(!rows.some(row=>row.text==='let'||row.text==='for'))return {at(){return parameters;},evidence(){return null;},names:new Set()};const reserved=['translation_json_fields_core','Option','Some','None','Result','Ok','Err','Value','Json','Maybe','Outcome','serde_json','crate','self','Self'],census=new Map([...allParameters,...reserved].map(name=>[name,null]));if(simpleBase64LocalBindings(rows,census).reason)return null;
 const names=new Set();for(let at=0;at<rows.length;at++)if(rows[at].text==='let')names.add(localAliasDeclaration(rows,at).name);const source=createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:readJsonFieldWrittenAliasDomain,readOperand:(operand,bindings,declared)=>{if(operand.length===1&&operand[0].type==='ident'&&bindings.get(operand[0].text)==='json-reference')return {kind:'json-reference',binding:operand[0].text};return readTextAliasOperand(operand,bindings,declared);},acceptResult:()=>null}),initializerSizes:[1,5],aliasKind:'complete-immutable-json-field-alias',resultKind:'unissued-json-field-result'});
 return {at:position=>source.at(position),evidence:name=>source.evidence(name),names};
}

function readJsonFieldWrittenAliasDomain(rows){const value=rows.map(row=>row.text).join('');return /^&(?:'[A-Za-z_][A-Za-z0-9_]*)?crate::translation_core::Json$/u.test(value)?'json-reference':readTextWrittenAliasDomain(rows);}
