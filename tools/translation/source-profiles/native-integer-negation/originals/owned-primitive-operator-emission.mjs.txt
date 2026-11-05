// Presentation/evaluation of freshly reissued carrier DATA. No source permit.
import {primitiveBitwiseType,primitiveBitwiseCompatible} from '../primitive-bitwise-types.mjs';
const fail=()=>{throw new TypeError('Owned primitive operator carrier differs');};
export function ownedPrimitiveOperatorCallMetadata(value){
 const target=primitiveBitwiseType(value.type);if(!target||value.bits!==target.bits||value.signed!==target.signed||value.root!==null||!Array.isArray(value.args))fail();
 if(value.kind==='primitive-arithmetic-call'){const operation=nativeIntegerArithmetic(value.operation);if(value.name!=='integerArithmetic'||!operation||value.args.length!==2||value.args.some(argument=>!primitiveBitwiseCompatible(argument.type,target.name)))fail();return {target,operation,after:[target.bits,target.signed,operation.name]};}
 if(value.kind==='primitive-method-call'){const method=nativeIntegerMethod(value.operation);if(value.name!=='primitiveIntegerMethod'||!method||value.args.length!==method.arity||value.args.some(argument=>!primitiveBitwiseCompatible(argument.type,target.name)))fail();return {target,method,after:[...(method.arity===2?[null]:[]),target.bits,target.signed,method.name]};}
 if(value.kind==='primitive-not-call'){if(value.name!=='primitiveNot'||value.args.length!==1||!primitiveBitwiseCompatible(value.args[0].type,target.name))fail();return {target,after:[target.bits,target.signed]};}
 if(value.kind==='primitive-cast-call'){
  const input=primitiveBitwiseType(value.inputType);if(value.name!=='integerCast'||!input||value.inputBits!==input.bits||value.inputSigned!==input.signed||value.args.length!==1||!primitiveBitwiseCompatible(value.args[0].type,input.name))fail();return {target,input,after:[input.bits,input.signed,target.bits,target.signed]};
 }
 const count=primitiveBitwiseType(value.countType);if(value.kind!=='primitive-shift-call'||value.name!=='integerShift'||!count||value.countBits!==count.bits||value.countSigned!==count.signed||value.args.length!==2||!primitiveBitwiseCompatible(value.args[0].type,target.name)||!primitiveBitwiseCompatible(value.args[1].type,count.name)||!['<<','>>'].includes(value.operation))fail();return {target,count,after:[target.bits,target.signed,count.bits,count.signed,value.operation]};
}
export function emitOwnedPrimitiveOperatorCall(value,{rust,expression,argumentName}){
 const metadata=ownedPrimitiveOperatorCallMetadata(value),expressions=value.args.map(expression);
 if(!rust)return '__ro_'+value.name+'('+expressions.concat(metadata.after.map(value=>JSON.stringify(value))).join(', ')+')';
 const names=value.args.map(argumentName);if(names.some(name=>typeof name!=='string'||!/^__ro_arg_[0-9]+$/u.test(name))||new Set(names).size!==names.length)fail();const bindings=expressions.map((text,index)=>'let '+names[index]+' = '+text+';').join(' ');
 if(value.kind==='primitive-arithmetic-call'){const guard=['div','rem'].includes(metadata.operation.name)?' assert!('+names[1]+' != 0_'+metadata.target.name+', '+JSON.stringify(zeroDivisorMessage(metadata.operation.name,{kind:'fixed'}))+');':'';return '{ '+bindings+guard+' ::core::option::Option::expect('+metadata.target.rust+'::'+metadata.operation.checked+'('+names.join(', ')+'), '+JSON.stringify(overflowMessage(metadata.operation.name))+') }';}
 if(value.kind==='primitive-method-call'){const callee=metadata.method.ordered?'::core::cmp::Ord::'+metadata.method.name:metadata.target.rust+'::'+metadata.method.name;return '{ '+bindings+' '+callee+'('+names.join(', ')+') }';}
 if(value.kind==='primitive-not-call')return '{ '+bindings+' (!'+names[0]+') }';
 if(value.kind==='primitive-cast-call')return '{ '+bindings+' '+(metadata.input.name===metadata.target.name?names[0]:'('+names[0]+' as '+metadata.target.rust+')')+' }';
 // Cast the already evaluated scalar count to u128. Every negative signed
 // count becomes too large; all unsigned and i128 positive counts stay exact.
 // This avoids narrowing the width literal to an i8 count domain at width 128.
 const count=metadata.count.name==='u128'?names[1]:'('+names[1]+' as ::core::primitive::u128)';return '{ '+bindings+' assert!('+count+' < '+metadata.target.bits+'_u128, "Rust integer shift count overflow"); ('+names[0]+' '+value.operation+' '+names[1]+') }';
}
export function evaluateOwnedPrimitiveOperatorCall(value,scope,get,module){
 const metadata=ownedPrimitiveOperatorCallMetadata(value);if(!module||typeof module[value.name]!=='function')fail();const args=value.args.map(argument=>get(argument,scope));return Reflect.apply(module[value.name],undefined,args.concat(metadata.after));
}

import {nativeIntegerMethod} from '../native-integer-methods.mjs';

import {nativeIntegerArithmetic} from '../native-integer-arithmetic.mjs';
import {overflowMessage,zeroDivisorMessage} from '../vendor/meta-language/translation/aborts.js';
