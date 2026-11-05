// Presentation DATA from already checked native scalar types. This is not a
// native checker, source permit, range validator or runtime brand.
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {actualFixedOperand} from './extensions/primitive-operators.mjs';
export function nativeScalarTypeScriptModule(module){
 if(module===null)return null;
 if(typeof module!=='string'||module.length>2048||!/^\.\.?\//u.test(module)||!module.endsWith('/primitive-operator-runtime.mjs')||/[\\\x00-\x1f\x7f:]/u.test(module))throw new TypeError('Native scalar declarations require a bounded relative primitive runtime module');return module;
}
export function nativeScalarTypeScriptType(type,module){
 nativeScalarTypeScriptModule(module);if(module===null||!type||type.kind!=='fixed')return null;
 const row=primitiveBitwiseType(type.rustPrimitiveName);
 if(!row||row.bits!==type.bits||row.signed!==type.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.rustBorrowLifetime)return null;
 actualFixedOperand(type,type.span);return 'import('+JSON.stringify(module)+').'+row.alias;
}
