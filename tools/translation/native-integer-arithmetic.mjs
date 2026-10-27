// Native checked arithmetic interface DATA; every current source/type guard remains.
export const NATIVE_INTEGER_ARITHMETIC=Object.freeze([{"name":"add","operator":"+","checked":"checked_add"},{"name":"sub","operator":"-","checked":"checked_sub"},{"name":"mul","operator":"*","checked":"checked_mul"},{"name":"div","operator":"/","checked":"checked_div"},{"name":"rem","operator":"%","checked":"checked_rem"}].map(row=>Object.freeze(row)));
export const nativeIntegerArithmetic=name=>typeof name==='string'?NATIVE_INTEGER_ARITHMETIC.find(row=>row.name===name)??null:null;
