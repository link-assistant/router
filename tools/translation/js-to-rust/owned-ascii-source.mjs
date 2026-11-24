// Finite string ABI equations. Native source/import/loan checks remain private.
const operations=Object.freeze([
 Object.freeze({name:'router_core_ascii_chars_in',args:Object.freeze(['str','str']),ret:'bool',rust:'ascii_chars_in'}),
 Object.freeze({name:'router_core_unicode_scalar_count',args:Object.freeze(['str']),ret:'usize',rust:'unicode_scalar_count'}),
]);
// Keep the existing ASCII API and its exact fixed-operation refusal contract.
export const ownedAsciiOperation=name=>operations.find(operation=>name===operation.name)??null;
export function ownedAsciiRustCall(name,args){
 const operation=ownedAsciiOperation(name);
 if(!operation||!Array.isArray(args)||args.length!==operation.args.length||args.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))throw TypeError('Owned reverse ASCII: fixed operation and two bound operands required');
 const call='crate::translation_core::'+operation.rust+'('+args.join(', ')+')';
 // The checked JavaScript usize domain uses u64. A scalar count cannot exceed
 // its borrowed string's byte length, hence usize -> u64 is lossless here.
 return operation.ret==='usize'?'('+call+' as u64)':call;
}
