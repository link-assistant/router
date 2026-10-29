// Source-graph observations only. Actual binding, ABI, source and loan admission
// are independently reconstructed from receiving source. SOURCE ONLY; UNRUN.
import {ownedPlainData} from './owned-vector-candidate-source.mjs';
export function selectNativeProjectionClosure(input){
 const units=ownedPlainData(input),index=new Map(),rows=new Map(),active=new Set(),costs=new Map();let edges=0,work=0;
 const fail=message=>{throw new TypeError('Native projection closure: '+message);};
 try{
  if(!Array.isArray(units)||units.length>4096)fail('bounded complete native units required');
  for(const unit of units){
   if(typeof unit.rust!=='string'||!unit.rust||index.has(unit.rust)||typeof unit.name!=='string'||!Array.isArray(unit.parameters)||unit.parameters.length>32)fail('distinct complete native source identities required');index.set(unit.rust,unit);
   const calls=[];let cells=0;
   function visit(value,depth){
    if(++cells>100000||depth>160)fail('bounded complete ordered native tree required');if(!Array.isArray(value))return;
    if(typeof value[0]==='string'&&value[0].startsWith('source-call:')){if(value.length!==2||!Array.isArray(value[1]))fail('complete ordered source helper event required');if(++edges>16384)fail('complete direct helper edge budget exceeded');calls.push({rust:value[0].slice('source-call:'.length),arity:value[1].length});}
    if(value[0]==='source-call'){if(value.length!==3||typeof value[1]!=='string'||!Array.isArray(value[2]))fail('complete source call observation required');if(++edges>16384)fail('complete direct helper edge budget exceeded');calls.push({rust:value[1],arity:value[2].length});}
    for(const child of value)if(Array.isArray(child))visit(child,depth+1);
   }
   visit(unit.tree,0);rows.set(unit.rust,{unit,calls,cells});
  }
  function cost(row,depth){
   const key=row.unit.rust;if(++work>200000)fail('bounded complete helper graph traversal required');if(depth>31||active.has(key))fail('acyclic helper closure depth exceeded');
   if(costs.has(key)){const value=costs.get(key);if(depth+value.height>31)fail('helper subtree height exceeds incoming depth');return value;}
   active.add(key);let cells=row.cells,height=0;
   try{
    for(const call of row.calls){
     const target=rows.get(call.rust);
     if(!target||target.unit.kind!=='primitive-scalar'||target.unit.returns!=='bool'&&!primitiveBitwiseType(target.unit.returns)||target.unit.parameters.length!==call.arity)fail('complete same-module primitive helper source is absent');
     const child=cost(target,depth+1);cells+=child.cells;height=Math.max(height,child.height+1);if(cells>100000||depth+height>31)fail('expanded helper work or depth budget exceeded');
    }
    const result={cells,height};costs.set(key,result);return result;
   }finally{active.delete(key);}
  }
  const admitted=[],refusals=[];
  for(const unit of units){try{cost(rows.get(unit.rust),0);admitted.push(unit.name);}catch(error){if(!(error instanceof TypeError))throw error;refusals.push({name:unit.name,rust:unit.rust,reason:error.message,sourcePreserved:true,executableAdmission:false});}}
  return {admitted,refusals,sourceAuthority:false,semanticAuthority:false,crossInvocationCache:false};
 }finally{index.clear();rows.clear();active.clear();costs.clear();}
}

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';

// Actual checker/source callers alone select this DATA normalization. It does
// not authenticate a pattern, an exhaustiveness claim or a native declaration.
function orderedScalarRows(node){
 const rows=node.branches;if(!Array.isArray(rows)||!rows.length||rows.length>64||!node.type||node.type.rustReference||node.type.rustOwnership||node.type.patternOwnershipRefusal||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved||node.type.kind!=='bool'&&!(node.type.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)))throw new TypeError('Native ordered scalar match requires a bounded exact primitive result');
 for(let index=0;index<rows.length;index++){const row=rows[index],condition=row?.cond,type=condition?.type;if(!row?.body||!type||type.kind!=='bool'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw new TypeError('Native ordered scalar match requires actual bool conditions');const fallback=condition.k==='lit'&&condition.value===true;if(index===rows.length-1?!fallback:fallback)throw new TypeError('Native ordered scalar match needs one final unconditional fallback');}
 return rows;
}
export function observeNativeOrderedScalarBody(node,{guard,names,events,depth,expression,body}){
 const rows=orderedScalarRows(node);
 function branch(index,level){guard.charge(level);if(index===rows.length-1)return body(rows[index].body,new Map(names),[...events],level+1);const before=events.length,condition=expression(rows[index].cond,new Map(names),events,level+1);if(events.length!==before)throw new TypeError('Native pattern conditions require a pure scalar selection');return [[...events],['if',condition,body(rows[index].body,new Map(names),[...events],level+1),branch(index+1,level+1)]];}
 return branch(0,depth);
}
export function observeNativeOrderedScalarExpression(node,{guard,names,events,depth,expression,choose}){
 const rows=orderedScalarRows(node),before=events.length;
 function branch(index,level){guard.charge(level);if(index===rows.length-1)return expression(rows[index].body,new Map(names),events,level+1);const condition=expression(rows[index].cond,new Map(names),events,level+1),yes=expression(rows[index].body,new Map(names),events,level+1),no=branch(index+1,level+1);return choose(condition,yes,no);}
 const value=branch(0,depth);if(events.length!==before)throw new TypeError('Expression-position ordered matches require pure scalar alternatives');return value;
}

import {sameType} from '../checked-types.mjs';

// Additive actual-IR row observation for guarded continuation consumers.
// This DATA row check cannot authenticate patterns, exhaustiveness or owners.
export function guardedNativeOrderedScalarRows(node){
 const rows=node.branches;if(!Array.isArray(rows)||!rows.length||rows.length>64||!node.type||node.type.rustReference||node.type.rustOwnership||node.type.patternOwnershipRefusal||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved||node.type.kind!=='bool'&&!(node.type.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)))throw new TypeError('Native ordered scalar match requires a bounded exact primitive result');
 for(let index=0;index<rows.length;index++){const row=rows[index],condition=row?.cond,type=condition?.type;if(!row?.body||!type||type.kind!=='bool'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw new TypeError('Native ordered scalar match requires actual bool conditions');const fallback=condition.k==='lit'&&condition.value===true;if(index===rows.length-1&&!fallback)throw new TypeError('Native ordered scalar match needs one final unconditional fallback');}
 return rows.map((row,index)=>{
  const bindings=[],names=new Set();let arm=row.body;
  while(arm?.k==='let'){if(arm.mutable||typeof arm.name!=='string'||names.has(arm.name)||bindings.length>=64)throw new TypeError('Guarded ordered scalar rows require bounded distinct immutable original pattern bindings');names.add(arm.name);bindings.push({name:arm.name,value:arm.value});arm=arm.body;}
  if(arm?.k!=='routerOrderedArm'||!sameType(arm.type,node.type)||!sameType(arm.body?.type,node.type))throw new TypeError('Guarded ordered scalar rows require the actual checked arm wrapper and result');
  const guard=arm.guard??null,type=guard?.type;if(guard&&(!type||type.kind!=='bool'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved))throw new TypeError('Guarded ordered scalar rows require an actual by-value Boolean guard');
  if(index===rows.length-1&&guard)throw new TypeError('Guarded ordered scalar rows require one final unguarded fallback');
  return {...row,bindings,guard,body:arm.body};
 });
}
