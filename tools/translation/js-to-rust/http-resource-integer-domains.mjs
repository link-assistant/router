// Closed fixed-width DATA shared by source constraints and native projection.
// Actual original guards, imported libraries and whole bodies remain mandatory.
import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType,primitiveBitwiseLiteral} from '../primitive-bitwise-types.mjs';
export const RESOURCE_INTEGER_DOMAINS=Object.freeze(PRIMITIVE_BITWISE_TYPES.map(row=>row.name));
export const resourceInteger=type=>primitiveBitwiseType(type)!==null;
export function resourceIntegerGuard(type){
 const row=primitiveBitwiseType(type);if(!row)throw new TypeError('Closed original resource integer domain required');return {type,minimum:row.signed?'-'+row.minimumAbs:'0',maximum:row.maximum,message:type==='u64'?'Control u64 input outside native range':type==='i64'?'Resource i64 input outside native range':'Resource '+type+' input outside native range'};
}
export function observeResourceIntegerGuardBounds(ts,lower,upper){
 const literal=node=>{let negative=false;if(!node)return null;if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken){negative=true;node=node.operand;}if(!ts.isBigIntLiteral(node)||! /^(?:0|[1-9][0-9]{0,38})n$/u.test(node.text))return null;return (negative?'-':'')+node.text.slice(0,-1);};
 const minimum=literal(lower),maximum=literal(upper),row=RESOURCE_INTEGER_DOMAINS.map(resourceIntegerGuard).find(row=>row.minimum===minimum&&row.maximum===maximum);if(!row)throw new TypeError('Complete original fixed-width integer range bounds required');return row;
}
export function emitResourceIntegerGuard({name,type}){const row=resourceIntegerGuard(type);return 'if (typeof '+name+' !== "bigint" || '+name+' < '+row.minimum+'n || '+name+' > '+row.maximum+'n) { throw new RangeError('+JSON.stringify(row.message)+'); }';}
export function resourceIntegerLiteral(text,negative,type){return primitiveBitwiseLiteral(text,negative,type);}
