// Actual original annotation obligations over fresh checked semantic meta.
// A copied normalization record or return value issues no consumer capability.
import {httpResourceNativeDomain} from './http-resource-native-domains.mjs';
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceResult} from './http-resource-caller-contracts.mjs';
const fail=message=>{throw new TypeError('Original native local type: '+message);};
export function requireHttpResourceNativeLocalTypes(meta,normalization){
 const annotations=normalization?.annotations??[];if(!Array.isArray(annotations)||annotations.length>100000)fail('complete bounded actual annotation selections required');if(!annotations.length)return;
 const data=JSON.parse(meta);if(!Array.isArray(data.functions)||data.functions.length>4096)fail('complete fresh checked function module required');let cells=0;const functions=new Map();
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete fresh local type obligation walk bound');};
 for(const fn of data.functions){
  tick(0);if(functions.has(fn.name))fail('one actual original function owner required');const locals=new Map();functions.set(fn.name,{fn,locals});
  function visit(node,depth=0){
   tick(depth);if(!node||typeof node!=='object')return;
   if(node.kind==='let'){if(!locals.has(node.name))locals.set(node.name,[]);const stored=node.value?.type,type=node.guarded===true?(httpResourceOption(stored)??httpResourceResult(stored))?.value:stored;locals.get(node.name).push(type);}
   for(const [key,value]of Object.entries(node)){if(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors','captures'].includes(key))continue;if(Array.isArray(value))for(const row of value)visit(row,depth+1);else if(value&&typeof value==='object')visit(value,depth+1);}
  }visit(fn.flow);
 }
 for(const annotation of annotations){
  tick(0);const owner=functions.get(annotation.function);if(!owner)fail('one actual original function owner required');const {fn,locals}=owner,found=locals.get(annotation.target)??[];
  const generic=fn.genericIdentity,signature=generic?httpResourceGenericSignature(generic.carrier??null,generic.typeParameter):null,expected=signature&&annotation.type===signature.sourceType?signature.type:httpResourceNativeDomain(annotation.type);
  if(found.length!==1||found[0]!==expected)fail('written native type must match one independently checked original local value');
 }
}

import {httpResourceGenericSignature} from './http-resource-generic-carriers.mjs';
