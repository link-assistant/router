// Internal storage eligibility only; no source, owner or execution authority.
import {types} from 'node:util';
import {originalPrivateParserIngressUnchanged,originalBatchedDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';

const typeOwner=types;
const initial=originalPrivateParserIngressUnchanged()&&originalBatchedDataFreezeIntrinsicsUnchanged();
const root=initial?globalThis:null,get=initial?Object.getOwnPropertyDescriptor:null,has=initial?Object.hasOwn:null;
const data=field=>field&&has(field,'value')?field.value:null;
const numberField=root?get(root,'Number'):null,number=data(numberField);
const numeric=number&&originalCapturedFunctionSource(number)==='function Number() { [native code] }';
const finite=numeric?get(number,'isFinite'):null,integer=numeric?get(number,'isInteger'):null;
const qualified=!!(finite&&integer&&originalCapturedFunctionSource(data(finite))==='function isFinite() { [native code] }'&&originalCapturedFunctionSource(data(integer))==='function isInteger() { [native code] }');
const same=(actual,expected)=>!!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);

export function builtinSourceMetaStringKeysReady(){
  // Reject rebinding before reflecting on an imported or mutable global owner.
  // The captured ingress checks the real root's globalThis field without
  // evaluating a replacement getter or reflecting on its replacement value.
  if(!qualified||types!==typeOwner||!originalPrivateParserIngressUnchanged())return false;
  if(!same(get(root,'Number'),numberField)||!same(get(number,'isFinite'),finite)||!same(get(number,'isInteger'),integer))return false;
  return originalBatchedDataFreezeIntrinsicsUnchanged();
}
