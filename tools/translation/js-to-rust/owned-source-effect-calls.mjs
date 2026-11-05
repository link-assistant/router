// Complete source-call copy with unit results. DATA only; actual complete callees remain mandatory.
// Exact existing predicate inverse operation DATA; no semantic authority.
const PREDICATE_INVERSE_OPERATIONS=Object.freeze([
 Object.freeze({op:'eq',kind:'equality',target:'===',rust:'=='}),Object.freeze({op:'ne',kind:'equality',target:'!==',rust:'!='}),
 Object.freeze({op:'lt',kind:'comparison',target:'<',rust:'<'}),Object.freeze({op:'le',kind:'comparison',target:'<=',rust:'<='}),Object.freeze({op:'gt',kind:'comparison',target:'>',rust:'>'}),Object.freeze({op:'ge',kind:'comparison',target:'>=',rust:'>='}),
 Object.freeze({op:'and',kind:'logic',target:'&&',rust:'&&'}),Object.freeze({op:'or',kind:'logic',target:'||',rust:'||'}),
]);
export function jsonScalarComparisonOperation(op,{native=false}={}){return PREDICATE_INVERSE_OPERATIONS.find(row=>row.kind!=='logic'&&(native?row.op===op:row.target===op))??null;}
export function jsonScalarComparisonDomain(type,{native=false}={}){
 if(!native)return type==='usize'?'u64':['bool','str'].includes(type)?type:primitiveBitwiseType(type)?.name??null;
 if(!type||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal)return null;
 if(type.kind==='bool'&&!type.rustOwnership)return 'bool';
 if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'str';
 const row=primitiveBitwiseType(type.rustPrimitiveName);if(type.kind==='fixed'&&!type.rustOwnership&&row&&type.bits===row.bits&&type.signed===row.signed)return row.name;
 return null;
}

// Inert graph summaries only. Every consumer first reissues the complete source
// items; these functions issue no namespace, semantic or execution authority.
const callFail=message=>{throw new TypeError('Owned scalar source calls: '+message);};
export const scalarSourceCallKey=callee=>JSON.stringify([callee.path,callee.javascript]);
export const hasScalarSourceCalls=program=>program.some(item=>types.isProxy(item)||Object.getOwnPropertyDescriptor(item,'sourceCalls')!==undefined);
export function scalarSourceCallSummary(item){
 const calls=[];let cells=0,vectorValues=false;
 function visit(value,depth){
  if(++cells>100000||depth>160)callFail('bounded complete source-call tree required');if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const child of value)visit(child,depth+1);return;}
  if(primitiveVectorResultRole(value.type))vectorValues=true;
  if(value.kind==='source-scalar-call'){
   const callee=value.callee,keys=['path','javascript','rust','localRust','parameters','returns','span'];if(!callee||Object.keys(callee).length!==keys.length||keys.some(key=>!Object.hasOwn(callee,key))||callee.path!==item.source.path||typeof callee.javascript!=='string'||typeof callee.rust!=='string'||typeof callee.localRust!=='string'||!Array.isArray(callee.parameters)||callee.parameters.length>32||callee.parameters.some(type=>!['bool','str'].includes(type)&&!primitiveBitwiseType(type))||callee.returns!=='unit'&&callee.returns!=='bool'&&!primitiveBitwiseType(callee.returns)&&!((item.vectorOrigin?.kind==='primitive-expression-vector'||item.vectorOrigin?.vectorLocals===true||!item.vectorOrigin&&(primitiveVectorResultRole(item.returns)||vectorValues))&&primitiveVectorResultRole(callee.returns))||!Array.isArray(callee.span)||callee.span.length!==2||!callee.span.every(Number.isSafeInteger)||!Array.isArray(value.args)||value.args.length!==callee.parameters.length||value.type!==callee.returns||value.root!==null||calls.length>=16384)callFail('complete exact primitive source-call descriptor required');calls.push(callee);
  }
  for(const [key,child]of Object.entries(value))if(key!=='callee')visit(child,depth+1);
 }
 visit(item.body,0);const recorded=item.sourceCalls??[];if(!Array.isArray(recorded)||JSON.stringify(recorded.map(value=>JSON.stringify(value)).sort())!==JSON.stringify(calls.map(value=>JSON.stringify(value)).sort()))callFail('actual complete source-call census differs');return {path:item.source.path,javascript:item.javascript,name:item.name,span:[...item.source.span],kind:item.vectorOrigin?.kind??(primitiveVectorResultRole(item.returns)?'primitive-vector-definition':'primitive-definition'),rust:item.vectorOrigin?.original?.qualifiedName??item.name,parameters:item.params.map(param=>param.type),returns:item.returns,calls,cells,...(item.vectorOrigin?.vectorLocals===true||!primitiveVectorResultRole(item.returns)&&vectorValues?{vectorLocals:true}:{})};
}
export function assertScalarSourceCallSummaries(summaries){
 if(!Array.isArray(summaries)||summaries.length>4096)callFail('bounded whole program summaries required');const index=new Map(),active=new Set(),costs=new Map();let edges=0;
 function cost(row,depth){const key=scalarSourceCallKey(row);if(depth>32||active.has(key))callFail('bounded acyclic source helper closure required');if(costs.has(key)){const prior=costs.get(key);if(depth+prior.height>32)callFail('source helper depth bound');return prior;}active.add(key);let value=row.cells,height=0;try{for(const callee of row.calls){if(++edges>16384)callFail('source call edge bound');const target=index.get(scalarSourceCallKey(callee));if(!target||(target.kind!=='primitive-scalar'&&!(row.vectorLocals===true&&((row.kind==='primitive-scalar'&&target.kind==='primitive-expression-vector')||(row.kind==='primitive-definition'&&target.kind==='primitive-vector-definition'))&&primitiveVectorResultRole(target.returns))&&!((['primitive-expression-vector','primitive-vector-definition'].includes(row.kind)&&target.kind===row.kind)&&primitiveVectorResultRole(target.returns))&&(target.kind!=='primitive-definition'||!['primitive-definition','primitive-vector-definition'].includes(row.kind)))||target.rust!==callee.rust||target.name!==callee.localRust||target.returns!==callee.returns||JSON.stringify(target.parameters)!==JSON.stringify(callee.parameters)||JSON.stringify(target.span)!==JSON.stringify(callee.span))callFail('complete freshly checked callee source/ABI required');const child=cost(target,depth+1);value+=child.cells;height=Math.max(height,child.height+1);if(value>100000||depth+height>32)callFail('complete expanded pure helper work bound');}const result={cells:value,height};costs.set(key,result);return result;}finally{active.delete(key);}}
 try{for(const row of summaries){const key=scalarSourceCallKey(row);if(index.has(key))callFail('ambiguous source function in complete program');index.set(key,row);}for(const row of summaries)cost(row,0);return summaries;}finally{index.clear();active.clear();costs.clear();}
}
export function assertScalarSourceCallClosure(program){if(hasScalarSourceCalls(program))assertScalarSourceCallSummaries(program.map(scalarSourceCallSummary));return program;}
export function nativeScalarSourceCallIndex(item){
 const index=new Map();if(!item.sourceCalls?.length)return index;const flatten=name=>'rp_'+Buffer.from(name).toString('hex');try{for(const callee of scalarSourceCallSummary(item).calls)for(const key of [callee.rust,flatten(callee.rust)]){const previous=index.get(key);if(previous&&JSON.stringify(previous)!==JSON.stringify(callee))callFail('conflicting actual source-call target');index.set(key,callee);}return index;}catch(error){index.clear();throw error;}
}
export function nativeScalarSourceCallTarget(node,index,lowered){
 const callee=index.get(node.fn);if(!callee)return null;const flatten=name=>'rp_'+Buffer.from(name).toString('hex'),program=lowered?.program;if(!(program?.declarations instanceof Map))callFail('fresh complete lowered source declarations required');const key=program.declarations.has(node.fn)?node.fn:flatten(node.fn),target=program.declarations.get(key);
 if(node.k!=='call'||target?.k!=='fn'||target.async||target.params?.length!==callee.parameters.length||node.args?.length!==callee.parameters.length||nativeSourceValueResultDomain(node.type)!==callee.returns||nativeSourceValueResultDomain(target.ret)!==callee.returns||callee.parameters.some((type,index)=>jsonScalarComparisonDomain(node.args[index].type,{native:true})!==type||jsonScalarComparisonDomain(target.params[index].type,{native:true})!==type))callFail('actual resolved native source callee/argument/return ABI differs');return callee;
}
import {types} from 'node:util';

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';

// Result-domain DATA only; complete actual original/native call checks above
// still join the callee's genuine source, function type and every input domain.
export const primitiveVectorResultRole=role=>typeof role==='string'&&role.startsWith('vec:')&&(role.slice(4)==='bool'||!!primitiveBitwiseType(role.slice(4)));
export function nativeSourceValueResultDomain(type){
 if(type?.kind==='unit')return !type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved?'unit':null;
 if(type?.kind!=='array')return jsonScalarComparisonDomain(type,{native:true});
 if(type.rustReference||type.rustFixedArray||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.rustOwnership?.kind!=='owned'||type.rustOwnership.source!=='Vec'||type.patternOwnershipRefusal&&type.patternOwnershipRefusal!=='ownership-bearing Vec type')return null;
 const element=jsonScalarComparisonDomain(type.element,{native:true}),role='vec:'+element;return primitiveVectorResultRole(role)?role:null;
}
