// Finite ABI equations only. Native source/import/loan checks remain private.
const operation=Object.freeze({name:'router_core_ascii_chars_in',args:Object.freeze(['str','str']),ret:'bool',rust:'ascii_chars_in'});
export const ownedAsciiOperation=name=>name===operation.name?operation:null;
export function ownedAsciiRustCall(name,args){
 if(!ownedAsciiOperation(name)||!Array.isArray(args)||args.length!==2||args.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))throw TypeError('Owned reverse ASCII: fixed operation and two bound operands required');
 return 'crate::translation_core::ascii_chars_in('+args.join(', ')+')';
}
