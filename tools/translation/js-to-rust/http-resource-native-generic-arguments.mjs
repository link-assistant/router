// Original explicit type arguments remain obligations over freshly checked meta.
// This DATA checker grants no source, generic-body or namespace capability.
import {rustTokens} from '../rust-structure.mjs';
import {httpResourceNativeDomain} from './http-resource-native-domains.mjs';
import {httpResourceCallerRustType,httpResourceResult} from './http-resource-caller-contracts.mjs';
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceGenericCarrierPayload} from './http-resource-generic-carriers.mjs';
const fail=message=>{throw new TypeError('Original native generic argument: '+message);};
const summaries=new Set(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors','captures']);
function writtenDomain(text,slot,depth=0){
 if(typeof text!=='string'||text.length>4096||depth>8)fail('complete bounded original type argument required');
 if(slot&&text===slot)return 'generic:'+slot;
 if(text.startsWith('Option<')&&text.endsWith('>')){const inner=writtenDomain(text.slice(7,-1),slot,depth+1);return inner==='text-owned'?'option-text':'optional:'+inner;}
 if(text.startsWith('Result<')&&text.endsWith('>')){
  const inner=text.slice(7,-1);let nesting=0,separator=-1;
  for(let index=0;index<inner.length;index++){if(['<','(','['].includes(inner[index]))nesting++;else if(['>',')',']'].includes(inner[index]))nesting--;else if(inner[index]===','&&nesting===0){if(separator!==-1)fail('one actual Result value and error required');separator=index;}if(nesting<0)fail('complete actual type delimiters required');}
  if(separator<0||nesting!==0)fail('complete original Result argument required');const value=writtenDomain(inner.slice(0,separator),slot,depth+1),error=inner.slice(separator+1),prefix={String:'http-result:','::std::io::Error':'io-result:','crate::translation_async_control_core::ControlError':'result:'}[error];if(!prefix)fail('actual original error domain needs its own rule');return prefix+value;
 }
 return httpResourceNativeDomain(text);
}
function nativeDomain(type,slot,depth=0){
 if(typeof type!=='string'||depth>8)fail('complete bounded checked argument domain required');
 if(type.startsWith('generic:')){if(!slot||type!=='generic:'+slot)fail('actual caller lexical generic slot required');return slot;}
 const option=httpResourceOption(type);if(option)return 'Option<'+nativeDomain(option.value,slot,depth+1)+'>';
 const result=httpResourceResult(type);if(result)return 'Result<'+nativeDomain(result.value,slot,depth+1)+', '+(result.error==='text'?'String':result.error==='io'?'::std::io::Error':'crate::translation_async_control_core::ControlError')+'>';
 return httpResourceCallerRustType(type);
}
function tokenCells(tokens){
 if(!Array.isArray(tokens)||!tokens.length||tokens.length>4096)fail('complete bounded original argument tokens required');const cells=[];
 for(const token of tokens){if(!token||typeof token.text!=='string'||typeof token.type!=='string'||token.type==='comment')fail('actual significant original type token required');const pieces=token.type==='punct'&&token.text==='>>'?['>','>']:[token.text];for(const text of pieces)cells.push([token.type,text,token.rawIdentifier===true]);}
 return cells;
}
export function requireHttpResourceNativeGenericArguments(meta,normalization){
 const selections=normalization?.genericCalls??[];if(!Array.isArray(selections)||selections.length>100000)fail('complete bounded original generic selections required');if(!selections.length)return;
 if(typeof meta!=='string'||meta.length>16777216)fail('complete bounded fresh checked meta required');const data=JSON.parse(meta);if(!Array.isArray(data.functions)||data.functions.length>4096)fail('complete fresh checked function module required');const genericLibraries=indexHttpResourceGenericLibraryOperations(httpResourceCallerOperationNames().map(httpResourceCallerContract)),functions=new Map(),calls=new Map();let cells=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete original generic obligation walk bound');};
 for(const fn of data.functions){tick(0);if(typeof fn.name!=='string'||functions.has(fn.name))fail('one actual original function owner required');functions.set(fn.name,fn);}
 for(const fn of data.functions){
  const operations=new Map();calls.set(fn.name,operations);
  function visit(node,depth=0){
   tick(depth);if(!node||typeof node!=='object')return;
   if(node.kind==='http-resource-call'){const library=node.local===false&&node.sourceGenericLibrary===true?httpResourceGenericLibraryOperation(httpResourceCallerContract(node.operation)):null,key=node.local===true&&functions.get(node.operation)?.genericIdentity?node.operation:library?.rustPath;if(key){if(!operations.has(key))operations.set(key,[]);operations.get(key).push(node);}}
   for(const [key,value]of Object.entries(node)){if(summaries.has(key))continue;if(Array.isArray(value))for(const row of value)visit(row,depth+1);else if(value&&typeof value==='object')visit(value,depth+1);}
  }visit(fn.flow);
 }
 const consumed=new Map();
 for(const selection of selections){
  tick(0);const caller=functions.get(selection.function),local=functions.get(selection.operation),library=genericLibraries.get(selection.operation),callee=local?.genericIdentity??library,matches=calls.get(selection.function)?.get(selection.operation),ordinal=selection.ordinal;
  if(!caller||!callee||!Number.isSafeInteger(ordinal)||ordinal<0||!matches||ordinal>=matches.length)fail('one actual original local generic call required');
  if(!consumed.has(selection.function))consumed.set(selection.function,new Map());const owner=consumed.get(selection.function);if(!owner.has(selection.operation))owner.set(selection.operation,new Set());const positions=owner.get(selection.operation);if(positions.has(ordinal))fail('each original generic argument selection must join once');positions.add(ordinal);
  const call=matches[ordinal];if(call.genericIdentity!==true||!Array.isArray(call.args)||call.args.length!==1||call.type!==call.args[0]?.type)fail('complete freshly checked unchanged-value call required');
  const carrier=callee.carrier??callee.genericCarrier??null,expected=carrier?httpResourceGenericCarrierPayload(carrier,call.args[0].type)?.value:call.args[0].type;if(typeof expected!=='string')fail('actual full carrier must satisfy the genuine callee');
  if(!Array.isArray(selection.typeArguments)||selection.typeArguments.length!==1)fail('one actual original generic argument required');const tokens=selection.typeArguments[0],actual=tokenCells(tokens);if(actual.length===1&&actual[0][0]==='ident'&&actual[0][1]==='_'&&!actual[0][2])continue;
  const slot=caller.genericIdentity?.typeParameter??null,written=writtenDomain(tokens.map(token=>token.text).join(''),slot),canonical=tokenCells(rustTokens(nativeDomain(written,slot)).filter(token=>token.type!=='comment'));
  if(JSON.stringify(actual)!==JSON.stringify(canonical)||written!==expected)fail('original written type must exactly match the independently checked actual argument');
 }
}

import {httpResourceCallerContract,httpResourceCallerOperationNames} from './http-resource-caller-contracts.mjs';
import {httpResourceGenericLibraryOperation,indexHttpResourceGenericLibraryOperations} from './http-resource-generic-library-calls.mjs';
