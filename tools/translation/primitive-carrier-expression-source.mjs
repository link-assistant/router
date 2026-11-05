// Source role composition shared by callbacks and chronological carrier locals.
import {readPrimitiveLocalExpression} from './primitive-local-expression-source.mjs';
import {readPrimitiveLocalComparisonSource} from './primitive-local-comparison-source.mjs';
import {readPrimitiveAliasOperand} from './primitive-local-argument-source.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
export function readPrimitiveRoleExpressionSource(rows,scope,wanted=null){
 if(!Array.isArray(rows)||!rows.length||rows.length>256)return null;const primitive={get(name){const role=scope.get(name);if(!role)return undefined;if(role.kind==='payload')return role.domain;if(role.kind==='json')return 'json-reference';return role.kind+':'+role.domain;}};
 const declared=wanted?.kind==='payload'&&primitiveBitwiseType(wanted.domain)?wanted.domain:null,value=readPrimitiveLocalExpression(rows,primitive,{readAtom:readPrimitiveAliasOperand,declared})??readPrimitiveLocalComparisonSource(rows,primitive,{readAtom:readPrimitiveAliasOperand});return value?{kind:'payload',domain:value.kind,binding:value.binding??null,bridge:value.bridge??'complete-primitive-carrier-expression-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:readPrimitiveLocalBooleanSource(rows,scope);
}

import {readPrimitiveLocalBooleanSource} from './primitive-local-boolean-source.mjs';
