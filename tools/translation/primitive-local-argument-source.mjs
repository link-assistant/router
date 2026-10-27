// One function's chronological source-selection DATA. No owner/type permit.
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {readFixedIntegerLiteralSource} from './native-integer-literal-source.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
import {primitiveLocalInitializerEnd,readPrimitiveLocalExpression} from './primitive-local-expression-source.mjs';
import {createWrittenLocalAliasRules} from './local-alias-written-source.mjs';
import {censusLocalAliasBindings} from './local-alias-binding-source.mjs';
const fail=message=>{throw new TypeError('Primitive local argument source: '+message);};
export function createPrimitiveLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys()),{opaqueRegions=[]}={}){
 if(!rows.some(row=>row.text==='let'||row.text==='for')||!primitiveLocalCensus(rows,allParameters,opaqueRegions))return null;
 return createChronologicalLocalSource(rows,parameters,{...createWrittenLocalAliasRules({readWrittenDomain:readPrimitiveWrittenAliasDomain,readOperand:(operand,bindings,declared)=>readPrimitiveCoreCallSource(operand,bindings)??readPrimitiveLocalExpression(operand,bindings,{readAtom:readPrimitiveAliasOperand,declared}),acceptResult:event=>primitiveBitwiseType(event.returnsKind)?.name??null}),initializerSizes:[1,2,3],initializerEnd:primitiveLocalInitializerEnd,aliasKind:'complete-immutable-primitive-alias',resultKind:'complete-selected-primitive-result-alias',opaqueRegions});
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function primitiveLocalCensus(rows,parameters,opaqueRegions=[]){
 return censusLocalAliasBindings(rows,parameters,{opaqueRegions,protectedNames:['std','core','crate','self','Self','translation_core','translation_integer_core','Some','None','Option',...['u','i'].flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))]}).reason===null;
}
export function readPrimitiveAliasOperand(rows,bindings,written=null){
 const core=readPrimitiveCoreCallSource(rows,bindings);if(core)return core;
 if(rows.length===1&&ident(rows[0])&&primitiveBitwiseType(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length>=3&&rows.at(-2)?.text==='::'&&['MIN','MAX'].includes(rows.at(-1)?.text)){const kind=readPrimitiveWrittenAliasDomain(rows.slice(0,-2));if(kind)return {kind,binding:null};}
 const literal=readFixedIntegerLiteralSource(rows,written);return literal?{kind:literal.domain,binding:null}:null;
}

export function readPrimitiveWrittenAliasDomain(rows){const match=/^(?:(?:::)?(?:std|core)::primitive::)?([iu](?:8|16|32|64|128))$/u.exec(rows.map(row=>row.text).join(''));return match&&primitiveBitwiseType(match[1])?match[1]:null;}

import {readPrimitiveCoreCallSource} from './primitive-core-call-source.mjs';
