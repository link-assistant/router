// Bounded continuation observations of already independently checked scalar
// source. Synthetic variables are private model substitutions only; neither
// these reconstructed nodes nor their public result enter a semantic issuer.
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Guarded primitive failure observation: '+message);};
function engine(native,read,guard,sourceCall=()=>true){
 let work=0,leaves=0;const effects=new WeakMap(),guarded=new WeakMap(),seen=new WeakSet();
 const charge=depth=>{guard.charge(depth);if(++work>100000||depth>64)fail('bounded complete scalar continuation required');};
 const key=node=>native?node?.k:node?.kind;
 function children(node){
  const kind=key(node);
  if(kind==='binary'||native&&kind==='routerPrimitiveScalarBitwise')return [['left',node.left],['right',node.right]];
  if(native&&kind==='unary')return [['arg',node.arg]];
  if(!native&&kind==='not')return [['value',node.value]];
  if(native&&['routerPrimitiveIntegerNot','routerPrimitiveIntegerCast','routerPrimitiveDereference'].includes(kind))return [['value',node.value]];
  if(native&&kind==='cast')return [['arg',node.arg]];
  if(native&&['routerHostCall','call'].includes(kind)||!native&&['primitive-arithmetic-call','primitive-method-call','primitive-bitwise-call','primitive-not-call','primitive-cast-call','source-scalar-call','text-scalar-call'].includes(kind))return node.args.map((value,index)=>[['args',index],value]);
  if(kind===(native?'if':'choose'))return [['cond',node.cond],['then',node.then],['else',node.else]];
  if(native&&kind==='let')return [['value',node.value],['body',node.body]];
  return [];
 }
 function effect(node,depth=0){
  charge(depth);if(!node||typeof node!=='object')return false;if(effects.has(node))return effects.get(node);
  if(seen.has(node))fail('acyclic original scalar observation required');seen.add(node);
  const kind=key(node),own=native?kind==='call'&&sourceCall(node)||kind==='binary'&&['add','sub','mul'].includes(node.op)||kind==='routerHostCall'&&(node.contract?.rustPath?.at(-1)==='clamp'||node.id==='router_core_unicode_scalar_count'||node.id==='router_core_ascii_chars_in'):kind==='primitive-arithmetic-call'||kind==='primitive-method-call'&&node.operation==='clamp'||kind==='source-scalar-call'||kind==='text-scalar-call';
  let result=own;for(const [,child]of children(node))if(effect(child,depth+1))result=true;seen.delete(node);effects.set(node,result);return result;
 }
 function needs(node,depth=0){
  charge(depth);if(!node||typeof node!=='object')return false;if(guarded.has(node))return guarded.get(node);
  if(seen.has(node))fail('acyclic original guarded observation required');seen.add(node);
  const kind=key(node),conditional=kind===(native?'if':'choose'),logic=kind==='binary'&&(native?['and','or']:['&&','||']).includes(node.op);
  let result=conditional&&(effect(node.then,depth+1)||effect(node.else,depth+1))||logic&&effect(node.right,depth+1);
  for(const [,child]of children(node))if(needs(child,depth+1))result=true;seen.delete(node);guarded.set(node,result);return result;
 }
 function branch(condition,names,events,yes,no,depth){
  charge(depth);if(++leaves>64)fail('bounded expanded guarded scalar branches required');const left=yes(new Map(names),[...events],depth+1),right=no(new Map(names),[...events],depth+1);return [[...events],['if',condition,left,right]];
 }
 const boolean=value=>['bool',value];
 function evaluate(node,names,events,next,depth=0){
  charge(depth);if(!node||typeof node!=='object')fail('complete original scalar expression required');
  const kind=key(node),conditional=kind===(native?'if':'choose'),logic=kind==='binary'&&(native?['and','or']:['&&','||']).includes(node.op);
  if(conditional&&(effect(node.then,depth+1)||effect(node.else,depth+1)))return evaluate(node.cond,names,events,(condition,scope,prefix,level)=>branch(condition,scope,prefix,(local,effects,at)=>evaluate(node.then,local,effects,next,at),(local,effects,at)=>evaluate(node.else,local,effects,next,at),level),depth+1);
  if(logic&&effect(node.right,depth+1))return evaluate(node.left,names,events,(condition,scope,prefix,level)=>{
   const right=(local,effects,at)=>evaluate(node.right,local,effects,next,at),constant=value=>(local,effects,at)=>next(boolean(value),local,effects,at);
   return node.op==='&&'||node.op==='and'?branch(condition,scope,prefix,right,constant(false),level):branch(condition,scope,prefix,constant(true),right,level);
  },depth+1);
  if(native&&kind==='let'){
   if(node.mutable||names.has(node.name))fail('distinct immutable original scalar local required');
   return evaluate(node.value,names,events,(value,scope,prefix,level)=>{const local=new Map(scope);local.set(node.name,value);return evaluate(node.body,local,prefix,(result,inner,current,at)=>next(result,scope,current,at),level+1);},depth+1);
  }
  const parts=children(node);
  function operands(index,scope,prefix,values,level){
   charge(level);if(index<parts.length)return evaluate(parts[index][1],scope,prefix,(value,local,effects,at)=>operands(index+1,local,effects,[...values,value],level),level+1);
   const local=new Map(scope),copy={...node};if(parts.some(([slot])=>Array.isArray(slot)))copy.args=[...node.args];
   for(let at=0;at<parts.length;at++){
    const [slot,original]=parts[at],name=Symbol('guarded-scalar-model');local.set(name,values[at]);const variable=native?{k:'var',name,type:original.type}:{kind:'variable',name,type:original.type,root:null};
    if(Array.isArray(slot))copy[slot[0]][slot[1]]=variable;else copy[slot]=variable;
   }
   const value=read(parts.length?copy:node,local,prefix,level+1);return next(value,scope,prefix,level+1);
  }
  return operands(0,names,events,[],depth+1);
 }
 const terminal=(value,names,events,depth)=>{charge(depth);guard.leaf();return [[...events],value];};
 function receiving(rows,names,events,depth=0){
  charge(depth);if(!Array.isArray(rows)||!rows.length)fail('complete terminating receiving scalar body required');
  const [node,...tail]=rows;if(node.kind==='let'){if(names.has(node.name))fail('distinct immutable receiving scalar local required');return evaluate(node.value,names,events,(value,scope,prefix,at)=>{const local=new Map(scope);local.set(node.name,value);return receiving(tail,local,prefix,depth);},depth+1);}
  if(tail.length)fail('scalar terminator must close its original body');
  if(node.kind==='return')return evaluate(node.value,names,events,terminal,depth+1);
  if(node.kind==='if')return evaluate(node.cond,names,events,(condition,scope,prefix,at)=>branch(condition,scope,prefix,(local,effects,level)=>receiving(node.then,local,effects,level),(local,effects,level)=>receiving(node.else,local,effects,level),at),depth+1);
  fail('unsupported receiving guarded scalar statement');
 }
 function receivingNeeds(rows,depth=0){charge(depth);if(!Array.isArray(rows))return false;return rows.some(node=>needs(node.kind==='if'?node.cond:node.value,depth+1)||node.kind==='if'&&(receivingNeeds(node.then,depth+1)||receivingNeeds(node.else,depth+1)));}
 return {needs,receivingNeeds,evaluate,receiving,terminal};
}
function eligible(item){return item.vectorOrigin?.kind==='primitive-scalar'&&item.params.every(param=>['bool','str'].includes(param.type)||primitiveBitwiseType(param.type));}
export function observeRequestedGuardedPrimitiveBody(item,{read,guard,names,events}){
 if(!eligible(item))return null;const operation=engine(false,read,guard);if(!operation.receivingNeeds(item.body))return null;
 return operation.receiving(item.body,new Map(names),[...events]);
}
export function observeActualGuardedPrimitiveBody(own,item,{read,guard,names,events=[],sourceCall}){
 if(!eligible(item))return null;const operation=engine(true,read,guard,sourceCall);if(!operation.needs(own.body))return null;
 return operation.evaluate(own.body,new Map(names),[...events],operation.terminal);
}
