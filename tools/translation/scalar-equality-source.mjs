// Native scalar equality source DATA only. No operand or trait is executed.
import {readParenthesizedSourceOperandTokens} from './qualified-source-call-tokens.mjs';
import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';
import {readCoreCallbackCallSource} from './core-callback-call-source.mjs';
export function readScalarEqualitySource(rows,scope){
 if(!Array.isArray(rows)||rows.length<3||rows.length>256)return null;const groups=[],pairs={'(':')','[':']','{':'}'};let operator=-1;
 for(let at=0;at<rows.length;at++){const word=rows[at].text;if(pairs[word]){if(groups.length>=64)return null;groups.push(pairs[word]);}else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;}else if(!groups.length&&['==','!='].includes(word)){if(operator!==-1)return null;operator=at;}}if(groups.length||operator<1||operator===rows.length-1)return null;
 function scalar(part,depth=0){
  if(!part.length||depth>8)return null;const group=readParenthesizedSourceOperandTokens(part);if(group)return scalar(group,depth+1);let role=null;if(part.length===1){const row=part[0];if(row.type==='ident')role=scope.get(row.text);if(!role&&['true','false'].includes(row.text))role={kind:'payload',domain:'bool'};if(!role&&row.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text))role={kind:'payload',domain:'str'};}role??=readCoreCarrierCallSource(part,scope)??readCoreCallbackCallSource(part,scope);return role?.kind==='payload'&&['bool','str','text-owned'].includes(role.domain)?role.domain:null;
 }
 const left=scalar(rows.slice(0,operator)),right=scalar(rows.slice(operator+1));if(!left||!right||(left==='bool')!==(right==='bool'))return null;
 return {kind:'payload',domain:'bool',binding:null,bridge:'complete-native-scalar-equality-source',operator:rows[operator].text,operandsUnevaluated:true,originalPartialEqDispatchProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
