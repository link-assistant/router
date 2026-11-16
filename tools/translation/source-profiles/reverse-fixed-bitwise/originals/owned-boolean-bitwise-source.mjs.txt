// Fixed checked-carrier ABI DATA only. Original contexts and symbols issue IR.
export const ownedBooleanBitwiseOperation=name=>name==='primitiveBitwise';
export const ownedBooleanBitwiseOperator=value=>typeof value==='string'&&['&','|','^'].includes(value);
export function ownedBooleanBitwiseRustCall(operation,names){if(!ownedBooleanBitwiseOperator(operation)||!Array.isArray(names)||names.length!==2||names.some(name=>typeof name!=='string'||!/^__ro_arg_[0-9]+$/u.test(name)))throw new TypeError('Bound eager boolean bitwise operands required');return '('+names[0]+' '+operation+' '+names[1]+')';}
