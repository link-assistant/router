// Complete guarded continuation copy with independently checked unit-helper effects.
import {guardedNativeOrderedScalarRows} from './owned-native-ordered-scalars.mjs';
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
  if(kind===(native?'array':'primitive-vector-literal'))return node.items.map((value,index)=>[['items',index],value]);
  if(kind==='binary'||native&&kind==='routerPrimitiveScalarBitwise')return [['left',node.left],['right',node.right]];
  if(native&&kind==='unary')return [['arg',node.arg]];
  if(!native&&kind==='not')return [['value',node.value]];
  if(native&&['routerPrimitiveIntegerNot','routerPrimitiveIntegerCast','routerPrimitiveDereference'].includes(kind))return [['value',node.value]];
  if(native&&kind==='cast')return [['arg',node.arg]];
  if(native&&['routerHostCall','call'].includes(kind)||!native&&['primitive-arithmetic-call','primitive-method-call','primitive-bitwise-call','primitive-not-call','primitive-cast-call','source-scalar-call','text-scalar-call'].includes(kind))return node.args.map((value,index)=>[['args',index],value]);
  if(kind===(native?'if':'choose'))return [['cond',node.cond],['then',node.then],['else',node.else]];
  if(native&&kind==='let')return [['value',node.value],['body',node.body]];
  if(native&&kind==='routerOrderedMatchArms')return guardedNativeOrderedScalarRows(node).flatMap((row,index)=>[[['branches',index,'cond'],row.cond],...row.bindings.map((binding,at)=>[['bindings',index,at],binding.value]),...(row.guard?[[['branches',index,'guard'],row.guard]]:[]),[['branches',index,'body'],row.body]]);
  return [];
 }
 function effect(node,depth=0){
  charge(depth);if(!node||typeof node!=='object')return false;if(effects.has(node))return effects.get(node);
  if(seen.has(node))fail('acyclic original scalar observation required');seen.add(node);
  const kind=key(node),own=native?kind==='unary'&&node.op==='neg'||kind==='call'&&sourceCall(node)||kind==='binary'&&['add','sub','mul','div','rem'].includes(node.op)||kind==='routerHostCall'&&(node.contract?.rustPath?.at(-1)==='clamp'||node.id==='router_core_unicode_scalar_count'||node.id==='router_core_ascii_chars_in'):kind==='primitive-arithmetic-call'||kind==='primitive-method-call'&&node.operation==='clamp'||kind==='source-scalar-call'||kind==='text-scalar-call';
  let result=own;for(const [,child]of children(node))if(effect(child,depth+1))result=true;seen.delete(node);effects.set(node,result);return result;
 }
 function needs(node,depth=0){
  charge(depth);if(!node||typeof node!=='object')return false;if(guarded.has(node))return guarded.get(node);
  if(seen.has(node))fail('acyclic original guarded observation required');seen.add(node);
  const kind=key(node),conditional=kind===(native?'if':'choose'),logic=kind==='binary'&&(native?['and','or']:['&&','||']).includes(node.op);
  let result=native&&kind==='routerOrderedMatchArms'||conditional&&(effect(node.then,depth+1)||effect(node.else,depth+1))||logic&&effect(node.right,depth+1);
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
  if(native&&kind==='routerOrderedMatchArms'){
   const rows=guardedNativeOrderedScalarRows(node);
   if(!rows.some(row=>effect(row.cond,depth+1)||row.bindings.some(binding=>effect(binding.value,depth+1))||row.guard&&effect(row.guard,depth+1)||effect(row.body,depth+1))){
    const start=events.length,records=[];
    function row(index,level){
     charge(level);if(index===rows.length){let value=records.at(-1).body;for(let at=records.length-2;at>=0;at--){const current=records[at],selected=current.guard?['choose',current.guard,current.body,value]:current.body;value=['choose',current.cond,selected,value];}return next(value,names,events,depth+1);}
     const current=rows[index];return evaluate(current.cond,new Map(names),events,(condition,scope,prefix,at)=>{
      function bind(position,local,effects,level){
       charge(level);if(position<current.bindings.length){const binding=current.bindings[position];if(local.has(binding.name))fail('pure ordered match binding shadows its original model scope');return evaluate(binding.value,local,effects,(value,scope,events,at)=>{const bound=new Map(scope);bound.set(binding.name,value);return bind(position+1,bound,events,at+1);},level+1);}
       const finish=(guard,scope,prefix,level)=>evaluate(current.body,scope,prefix,(body,scope,prefix,at)=>{if(prefix.length!==start)fail('pure ordered match produced an ordered event');records.push({cond:condition,guard,body});return row(index+1,depth+1);},level+1);
       return current.guard?evaluate(current.guard,local,effects,finish,level+1):finish(null,local,effects,level+1);
      }return bind(0,new Map(scope),prefix,at+1);
     },level+1);
    }return row(0,depth+1);
   }
   function attempt(index,scope,prefix,level){
    const row=rows[index];function bind(at,local,events,depth){
     charge(depth);if(at<row.bindings.length){const binding=row.bindings[at];if(local.has(binding.name))fail('ordered match binding shadows its original model scope');return evaluate(binding.value,local,events,(value,current,effects,level)=>{const names=new Map(current);names.set(binding.name,value);return bind(at+1,names,effects,level+1);},depth+1);}
     if(!row.guard)return evaluate(row.body,local,events,next,depth+1);
     if(index===rows.length-1)fail('final ordered fallback cannot have a guard');
     return evaluate(row.guard,local,events,(condition,current,effects,level)=>branch(condition,current,effects,(names,prefix,at)=>evaluate(row.body,names,prefix,next,at),(names,prefix,at)=>select(index+1,new Map(scope),prefix,at),level),depth+1);
    }return bind(0,new Map(scope),prefix,level+1);
   }
   function select(index,scope,prefix,level){
    charge(level);if(index===rows.length-1)return attempt(index,scope,prefix,level+1);
    return evaluate(rows[index].cond,scope,prefix,(condition,current,events,at)=>branch(condition,current,events,(local,effects,depth)=>attempt(index,local,effects,depth),(local,effects,depth)=>select(index+1,local,effects,depth),at),level+1);
   }
   return select(0,names,events,depth+1);
  }
  if(native&&kind==='let'){
   if(node.mutable||names.has(node.name))fail('distinct immutable original scalar local required');
   return evaluate(node.value,names,events,(value,scope,prefix,level)=>{const local=new Map(scope);local.set(node.name,value);return evaluate(node.body,local,prefix,(result,inner,current,at)=>next(result,scope,current,at),level+1);},depth+1);
  }
  const parts=children(node);
  function operands(index,scope,prefix,values,level){
   charge(level);if(index<parts.length)return evaluate(parts[index][1],scope,prefix,(value,local,effects,at)=>operands(index+1,local,effects,[...values,value],level),level+1);
   const local=new Map(scope),copy={...node};for(const [slot]of parts)if(Array.isArray(slot)&&copy[slot[0]]===node[slot[0]])copy[slot[0]]=[...node[slot[0]]];
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
  const [node,...tail]=rows;if(node.kind==='effect'){if(node.value?.kind!=='source-scalar-call'||node.value.type!=='unit')fail('only complete source unit calls may be discarded');return evaluate(node.value,names,events,(value,scope,prefix,at)=>receiving(tail,scope,prefix,depth),depth+1);}if(node.kind==='let'){if(names.has(node.name))fail('distinct immutable receiving scalar local required');return evaluate(node.value,names,events,(value,scope,prefix,at)=>{const local=new Map(scope);local.set(node.name,value);return receiving(tail,local,prefix,depth);},depth+1);}
  if(tail.length)fail('scalar terminator must close its original body');
  if(node.kind==='return')return evaluate(node.value,names,events,terminal,depth+1);
  if(node.kind==='if')return evaluate(node.cond,names,events,(condition,scope,prefix,at)=>branch(condition,scope,prefix,(local,effects,level)=>receiving(node.then,local,effects,level),(local,effects,level)=>receiving(node.else,local,effects,level),at),depth+1);
  fail('unsupported receiving guarded scalar statement');
 }
 function receivingNeeds(rows,depth=0){charge(depth);if(!Array.isArray(rows))return false;return rows.some(node=>needs(node.kind==='if'?node.cond:node.value,depth+1)||node.kind==='if'&&(receivingNeeds(node.then,depth+1)||receivingNeeds(node.else,depth+1)));}
 return {needs,receivingNeeds,evaluate,receiving,terminal};
}
function eligible(item){return ['primitive-scalar','primitive-expression-vector'].includes(item.vectorOrigin?.kind)&&item.params.every(param=>['bool','str'].includes(param.type)||primitiveBitwiseType(param.type));}
export function observeRequestedGuardedPrimitiveBody(item,{read,guard,names,events}){
 if(!eligible(item))return null;const operation=engine(false,read,guard);if(!operation.receivingNeeds(item.body))return null;
 return operation.receiving(item.body,new Map(names),[...events]);
}
export function observeActualGuardedPrimitiveBody(own,item,{read,guard,names,events=[],sourceCall}){
 if(!eligible(item))return null;const operation=engine(true,read,guard,sourceCall);if(!operation.needs(own.body))return null;
 return operation.evaluate(own.body,new Map(names),[...events],operation.terminal);
}
