// Target/evaluation adapters only. Full original private source reissue is
// mandatory; shape DATA cannot authorize a call, import or owned result.
import {primitiveVectorLiteralOperationShape} from '../primitive-vector-literal-call-shape.mjs';
const fail=()=>{throw new TypeError('Actual privately checked primitive vector literal call required');};
function shape(value){const row=primitiveVectorLiteralOperationShape(value.name,value.args?.length);if(value.kind!=='primitive-vector-literal-call'||!row||value.type!==row.returns||value.root!==null||!Array.isArray(value.args)||value.args.some(argument=>argument.root!==null||argument.type!==row.domain&&!(row.domain==='u64'&&argument.type==='usize')))fail();return row;}
export function emitPrimitiveVectorLiteralCall(value,{rust,expr,imports}){const row=shape(value);imports.add(row.javascriptName);const operands=value.args.map(argument=>expr(argument)).join(', ');return rust?row.rustPath+'(&['+operands+'])':'__ro_'+row.javascriptName+'('+operands+')';}
export function evaluatePrimitiveVectorLiteralCall(value,{state,scope,get}){const row=shape(value),runtime=state.modules.primitiveVectorLiteral;if(typeof runtime?.[row.javascriptName]!=='function')fail();return Reflect.apply(runtime[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));}
