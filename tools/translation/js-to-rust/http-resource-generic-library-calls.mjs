// Operation descriptors are DATA. Only the fresh source consumer may select a
// qualified imported operation; every complete body and meta round trip remains.
import {httpResourceGenericCarrierByFamily} from './http-resource-generic-carriers.mjs';
const fail=message=>{throw new TypeError('Original generic library call: '+message);};
export function httpResourceGenericLibraryOperation(operation){
 const descriptor=httpResourceGenericCarrierByFamily(operation?.family);if(!descriptor)return null;
 if(operation.signatureOnly!==true||operation.javascriptName!==descriptor.operation||operation.rustPath!==descriptor.rustPath||operation.async!==false||operation.release!==null||operation.args?.length!==1||operation.args[0]!==descriptor.argumentRole||operation.ret!==descriptor.argumentRole)fail('complete actual generic ABI operation descriptor required');
 return {...operation,args:['generic-identity'],signatureOnly:false,genericIdentity:true,genericCarrier:descriptor.carrier,local:false,sourceGenericLibrary:true,sourceAuthority:false,semanticAuthority:false};
}
export function requireHttpResourceGenericLibraryOperation(operation,current){
 const actual=httpResourceGenericLibraryOperation(operation);if(!actual||typeof current!=='function')fail('actual current three-language library source join required');current(actual.javascriptName);return actual;
}

// Invocation-local source descriptor index only; no verdict survives a call.
export function indexHttpResourceGenericLibraryOperations(operations){
 if(!Array.isArray(operations)||operations.length>100000)fail('complete bounded actual operation descriptors required');const result=new Map();
 for(const operation of operations){if(!operation?.signatureOnly)continue;const actual=httpResourceGenericLibraryOperation(operation);if(!actual||result.has(actual.rustPath))fail('one actual qualified generic library path required');result.set(actual.rustPath,actual);}
 return result;
}
