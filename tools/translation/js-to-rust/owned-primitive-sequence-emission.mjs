// Text/evaluation adapters only. Parent APIs freshly reissue the entire item.
import {primitiveSequenceOperationShape} from '../primitive-sequence-call-shape.mjs';
const fail=()=>{throw new TypeError('Actual checked primitive sequence call required');};
function shape(value){const row=primitiveSequenceOperationShape(value.name);if(value.kind!=='primitive-sequence-call'||!row||row.returns!==value.type||value.root!==null||!Array.isArray(value.args)||value.args.length!==row.parameters.length||value.args.some((arg,index)=>arg.type!==row.parameters[index]&&!(row.parameters[index]==='u64'&&arg.type==='usize')))fail();return row;}
export function emitOwnedPrimitiveSequenceCall(value,{rust,expr,imports}){const row=shape(value);imports.add(row.javascriptName);return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+value.args.map(argument=>expr(argument)).join(', ')+')';}
export function evaluateOwnedPrimitiveSequenceCall(value,{state,scope,get}){const row=shape(value),runtime=state.modules.primitiveSequence;if(typeof runtime?.[row.javascriptName]!=='function')fail();return Reflect.apply(runtime[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));}
