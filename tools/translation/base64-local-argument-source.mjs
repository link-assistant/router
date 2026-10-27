// One function's chronological source-selection DATA. No owner/type permit.
import {readConcreteBase64Argument} from './base64-argument-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
const fail=message=>{throw new TypeError('Base64 local argument source: '+message);};
export function createBase64LocalArgumentSource(rows,parameters){
 if(!rows.some(row=>row.text==='let'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 return createChronologicalLocalSource(rows,parameters,{readOperand:readConcreteBase64Argument,initializerSizes:[1,5],aliasKind:'complete-immutable-operand-alias',resultKind:'complete-selected-native-encode-alias',acceptResult:event=>event.method==='encode'&&/^base64_(standard|standard_no_pad|url_no_pad)_encode_(text|bytes|owned_bytes|owned_text|array32)$/u.test(event.operation)?'owned-text':null});
}
