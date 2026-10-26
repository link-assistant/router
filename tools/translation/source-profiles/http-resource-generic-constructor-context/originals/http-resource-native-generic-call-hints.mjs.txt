// Original type arguments propose constructor contexts only. Fresh source/meta
// checks and original argument obligations independently govern every result.
import {readHttpResourceNativeGenericArgumentType} from './http-resource-native-generic-arguments.mjs';
import {httpResourceGenericCarrierDomain} from './http-resource-generic-carriers.mjs';
const fail=message=>{throw new TypeError('Original native generic call context: '+message);};
export function indexHttpResourceNativeGenericCallHints(functions,selections,genericLibraries){
 if(!Array.isArray(functions)||functions.length>4096||!Array.isArray(selections)||selections.length>100000||!(genericLibraries instanceof Map))fail('complete bounded current source proposal inputs required');const declared=new Map(),calls=new Map(),hints=new WeakMap();if(!selections.length)return hints;const selectedFunctions=new Set(selections.map(row=>row.function));let cells=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete original generic proposal walk bound');};
 for(const fn of functions){tick(0);if(typeof fn?.name!=='string'||declared.has(fn.name))fail('unique actual native function owners required');declared.set(fn.name,fn);}
 for(const fn of functions){
  if(!selectedFunctions.has(fn.name))continue;const operations=new Map();calls.set(fn.name,operations);
  function visit(node,depth=0){
   tick(depth);if(!node||typeof node!=='object')return;
   if(node.kind==='call'&&(declared.get(node.path)?.genericParameters||genericLibraries.has(node.path))){if(!operations.has(node.path))operations.set(node.path,[]);operations.get(node.path).push(node);}
   for(const value of Object.values(node)){if(Array.isArray(value))for(const row of value)visit(row,depth+1);else if(value&&typeof value==='object')visit(value,depth+1);}
  }visit(fn.body);
 }
 const consumed=new WeakSet();
 for(const selection of selections){
  tick(0);const fn=declared.get(selection.function),callee=declared.get(selection.operation),library=genericLibraries.get(selection.operation),ordinal=selection.ordinal,call=Number.isSafeInteger(ordinal)&&ordinal>=0?calls.get(selection.function)?.get(selection.operation)?.[ordinal]:null;
  if(!fn||!call||!callee?.genericParameters&&!library||call.args?.length!==1||consumed.has(call)||selection.typeArguments?.length!==1)fail('one actual source-selected generic call required');consumed.add(call);
  // Symbolic generic bodies have their separate complete unchanged-value rule.
  if(fn.genericParameters)continue;const payload=readHttpResourceNativeGenericArgumentType(selection.typeArguments[0]);if(payload===null)continue;
  let carrier=library?.genericCarrier??null;if(callee){const slot=callee.genericParameters?.[0],written=callee.parameters?.[0]?.type;if(written==='Option<'+slot+'>')carrier='option';else if(written==='Result<'+slot+',String>')carrier='text-result';else if(written!==slot)fail('actual original generic carrier signature required');}
  const type=carrier?httpResourceGenericCarrierDomain(carrier,payload):payload;hints.set(call,{type,sourceAuthority:false,semanticAuthority:false});
 }
 return hints;
}
