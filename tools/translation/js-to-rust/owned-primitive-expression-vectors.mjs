// Complete scalar ABI source copy extended to the real owned Vec signature.
// All observations are DATA. Fresh whole native/receiving issuers remain required.
// SOURCE DRAFT ONLY; all behavioral, ownership and freshness cases UNRUN.
import {sameType} from '../checked-types.mjs';
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {observeNativeFunctionControl} from './owned-native-function-control.mjs';
const fail=message=>{throw new TypeError('Primitive expression vector: '+message);};
const clean=type=>type&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
const ownedVector=type=>type?.kind==='array'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec'&&type.patternOwnershipRefusal==='ownership-bearing Vec type'&&!type.rustReference&&!type.rustFixedArray&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
// Presence selects an additive candidate family only. The private source context
// independently authenticates complete runtime and declaration bytes every time.
export function hasPrimitiveExpressionVectorRuntime(files,data){
 return files.has(data.runtimeRoot+'/primitive-operator-runtime.mjs')&&files.has((data.declarationRoot??data.runtimeRoot)+'/primitive-operator-runtime.d.mts');
}
export function originalPrimitiveExpressionVectorDomain(own,lowered){
 const role=(type,parameter=false)=>{if(!parameter&&type?.kind==='unit')return 'unit';if(type?.kind==='bool')return 'bool';const row=primitiveBitwiseType(type?.rustPrimitiveName);if(type?.kind==='fixed'&&row&&type.bits===row.bits&&type.signed===row.signed)return row.name;if(parameter&&type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'str';return null;};
 const result=role(own?.ret?.element);if(!result||result==='unit'||!Array.isArray(own.params)||own.params.length>32||own.params.some(param=>role(param.type,true)===null))return null;
 if(!ownedVector(own.ret)||!ownedVector(lowered?.own?.ret)||!sameType(own.ret,lowered.own.ret))fail('actual source-owned original/lowered primitive Vec required');
 const program=lowered?.program,actual=lowered?.own;if(!(program?.declarations instanceof Map)||own.k!=='fn'||own.async||actual?.k!=='fn'||actual.params.length!==own.params.length)fail('fresh complete actual primitive source/lowerer required');
 function match(source,target,parameter=false){const value=role(source,parameter);if(!value||value!==role(target,parameter)||!clean(source)||!clean(target)||source.patternOwnershipRefusal||target.patternOwnershipRefusal||value!=='str'&&(source.rustOwnership||target.rustOwnership)||value==='str'&&JSON.stringify(source.rustOwnership)!==JSON.stringify(target.rustOwnership)||!sameType(source,target)||['bits','signed','rustPrimitiveName','rustSourceType'].some(key=>source[key]!==target[key]))fail('actual original/lowered closed primitive ABI differs');return {name:value,kind:value==='bool'?'bool':value==='str'?'borrowed-text':'integer',...(primitiveBitwiseType(value)?{bits:primitiveBitwiseType(value).bits,signed:primitiveBitwiseType(value).signed}:{})};}
 const element=match(own.ret.element,actual.ret.element),parameters=own.params.map((param,index)=>match(param.type,actual.params[index].type,true));return {kind:'primitive-expression-vector',parameters,type:'vec:'+result,element};
}
// Bounded linear container observation on actual native IR. Scalar expression
// semantics are checked separately by the closed operators and complete body
// comparison. This observer grants no ownership/type/source authority.
export function checkedPrimitiveExpressionVectorTail(declaration){
 const own=observeNativeFunctionControl(declaration);let work=0,leaves=0,bindings=0;const arrays=[];
 const tick=depth=>{if(++work>100000||depth>64)fail('bounded complete Vec flow required');};
 const isVector=type=>type?.kind==='array'&&type.rustOwnership?.source==='Vec';
 function scalar(node,scope,depth){
  tick(depth);if(!node||typeof node!=='object')return;
  if(isVector(node.type)||node.k==='array'||node.k==='var'&&scope.has(node.name))fail('owned Vec cannot hide in a scalar expression or borrowed operation');
  for(const [key,value]of Object.entries(node)){
   if(['type','span','contract','compatibilityCore','sourceOwnershipOperation'].includes(key))continue;
   if(Array.isArray(value)){for(const child of value)if(child&&typeof child==='object')scalar(child,scope,depth+1);}
   else if(value&&typeof value==='object')scalar(value,scope,depth+1);
  }
 }
 function consume(node,scope,depth){
  tick(depth);if(!node||!sameType(node.type,own.ret))fail('actual identical owned Vec result required');
  if(node.k==='let'){
   if(node.mutable||typeof node.name!=='string'||scope.has(node.name)||++bindings>64)fail('bounded immutable distinct native Vec locals required');
   if(isVector(node.value?.type)){consume(node.value,scope,depth+1);scope.set(node.name,false);}
   else scalar(node.value,scope,depth+1);
   return consume(node.body,scope,depth+1);
  }
  if(node.k==='if'){
   if(node.cond?.type?.kind!=='bool')fail('actual Boolean Vec branch required');scalar(node.cond,scope,depth+1);
   const yes=new Map(scope),no=new Map(scope);consume(node.then,yes,depth+1);consume(node.else,no,depth+1);
   for(const name of scope.keys())scope.set(name,yes.get(name)||no.get(name));return;
  }
  if(node.k==='var'){if(!scope.has(node.name)||scope.get(node.name))fail('foreign or already moved owned Vec');scope.set(node.name,true);return;}
  if(node.k==='call'){if(++leaves>64)fail('bounded complete Vec helper results required');if(typeof node.fn!=='string'||!node.fn||!Array.isArray(node.args)||node.args.length>32||nativeSourceValueResultDomain(node.type)!=='vec:'+primitiveElement(own.ret.element))fail('actual typed owned primitive Vec helper result required');for(const arg of node.args)scalar(arg,scope,depth+1);arrays.push(node);return;}
  if(node.k!=='array'||node.compatibilityCore?.id!=='router-core-vector-list-v1'||!Array.isArray(node.items)||node.items.length>4096||node.type.rustReference||node.type.rustFixedArray||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved)fail('actual qualified bounded owned Vec constructor required');
  if(++leaves>64)fail('bounded complete Vec constructors required');
  for(const item of node.items){if(!sameType(item.type,own.ret.element))fail('actual exact primitive element domain differs');scalar(item,scope,depth+1);}arrays.push(node);
 }
 consume(own.body,new Map(),0);if(!arrays.length)fail('actual owned Vec construction or actual source helper result required');return arrays[0];
}

import {nativeSourceValueResultDomain,jsonScalarComparisonDomain} from './owned-source-effect-calls.mjs';
const primitiveElement=type=>jsonScalarComparisonDomain(type,{native:true});

// Additive independent local Vec domains; original same-result observer above stays unchanged.
export function checkedPrimitiveExpressionVectorLocals(declaration){
 const own=observeNativeSourceCallControl(declaration);let work=0,leaves=0,bindings=0;const arrays=[];
 const tick=depth=>{if(++work>100000||depth>64)fail('bounded complete Vec flow required');};
 const isVector=type=>type?.kind==='array'&&type.rustOwnership?.source==='Vec';
 function scalar(node,scope,depth){
  tick(depth);if(!node||typeof node!=='object')return;
  if(isVector(node.type)||node.k==='array'||node.k==='var'&&scope.has(node.name))fail('owned Vec cannot hide in a scalar expression or borrowed operation');
  for(const [key,value]of Object.entries(node)){
   if(['type','span','contract','compatibilityCore','sourceOwnershipOperation'].includes(key))continue;
   if(Array.isArray(value)){for(const child of value)if(child&&typeof child==='object')scalar(child,scope,depth+1);}
   else if(value&&typeof value==='object')scalar(value,scope,depth+1);
  }
 }
 function consume(node,scope,depth,expected=own.ret){
  tick(depth);if(!node||!primitiveVectorResultRole(nativeSourceValueResultDomain(node.type))||!sameType(node.type,expected))fail('actual exact owned primitive Vec expression domain required');
  if(node.k==='let'){
   if(node.mutable||typeof node.name!=='string'||scope.has(node.name)||++bindings>64)fail('bounded immutable distinct native Vec locals required');
   if(isVector(node.value?.type)){consume(node.value,scope,depth+1,node.value.type);scope.set(node.name,{type:node.value.type,moved:false});}
   else scalar(node.value,scope,depth+1);
   return consume(node.body,scope,depth+1,expected);
  }
  if(node.k==='if'){
   if(node.cond?.type?.kind!=='bool')fail('actual Boolean Vec branch required');scalar(node.cond,scope,depth+1);
   const clone=()=>new Map([...scope].map(([name,row])=>[name,{...row}])),yes=clone(),no=clone();consume(node.then,yes,depth+1,expected);consume(node.else,no,depth+1,expected);
   for(const [name,row]of scope)row.moved=!!yes.get(name)?.moved||!!no.get(name)?.moved;return;
  }
  if(node.k==='var'){const row=scope.get(node.name);if(!row||row.moved||!sameType(row.type,node.type))fail('foreign mismatched or already moved owned Vec');row.moved=true;return;}
  if(node.k==='call'){if(++leaves>64)fail('bounded complete Vec helper results required');if(typeof node.fn!=='string'||!node.fn||!Array.isArray(node.args)||node.args.length>32||nativeSourceValueResultDomain(node.type)!=='vec:'+primitiveElement(expected.element))fail('actual typed owned primitive Vec helper result required');for(const arg of node.args)scalar(arg,scope,depth+1);arrays.push(node);return;}
  if(node.k!=='array'||node.compatibilityCore?.id!=='router-core-vector-list-v1'||!Array.isArray(node.items)||node.items.length>4096||node.type.rustReference||node.type.rustFixedArray||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved)fail('actual qualified bounded owned Vec constructor required');
  if(++leaves>64)fail('bounded complete Vec constructors required');
  for(const item of node.items){if(!sameType(item.type,expected.element))fail('actual exact primitive element domain differs');scalar(item,scope,depth+1);}arrays.push(node);
 }
 consume(own.body,new Map(),0);if(!arrays.length)fail('actual owned Vec construction or actual source helper result required');return own.body;
}

import {primitiveVectorResultRole} from './owned-source-effect-calls.mjs';

import {observeNativeSourceCallControl} from './owned-native-source-call-control.mjs';
