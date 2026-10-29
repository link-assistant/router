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

// Continuation substitutions for already genuinely checked source DATA only.
// Reconstructed nodes never enter a native semantic issuer as original syntax.
export function observeNativeFunctionControl(declaration){
 const fail=message=>{throw new TypeError('Native function control: '+message);};
 if(declaration?.k!=='fn'||declaration.async||!Array.isArray(declaration.params))fail('actual synchronous complete function observation required');
 const names=new Set(declaration.params.map(row=>row.name)),seen=new WeakSet();let census=0,work=0,serial=0;
 function collect(node,depth=0){
  if(!node||typeof node!=='object'||seen.has(node))return;if(++census>100000||depth>160)fail('bounded original function binding census required');seen.add(node);
  if(['let','var'].includes(node.k)&&typeof node.name==='string')names.add(node.name);
  for(const key of ['value','arg','left','right','cond','then','else','body','object','items','args','branches']){const value=node[key];if(Array.isArray(value))for(const child of value)collect(child,depth+1);else collect(value,depth+1);}
 }
 const charge=depth=>{if(++work>4096||depth>64)fail('bounded complete native function continuation required');};
 const unit=node=>node?.k==='unit'&&node.type?.kind==='unit'&&!node.type.rustReference&&!node.type.rustOwnership&&!node.type.patternOwnershipRefusal&&!node.type.rustGenericIdentityUnresolved&&!node.type.rustBorrowingUnresolved;
 const validation=node=>node?.k==='routerHostCall'&&node.id==='router_vector_json_validate'&&node.type?.kind==='unit';
 function terminal(node,depth=0){charge(depth);if(node?.k==='routerReturn')return unit(node.body);if(['let','routerDiscard'].includes(node?.k))return terminal(node.body,depth+1);if(node?.k==='if')return terminal(node.then,depth+1)&&terminal(node.else,depth+1);if(node?.k==='routerIf')return terminal(node.then,depth+1)&&terminal(node.else,depth+1)||terminal(node.body,depth+1);return false;}
 function discarded(value,body){if(!validation(value))fail('discarded native effects require a qualified validation rule');let name;do{name='__ro_native_discard_'+serial++;}while(names.has(name));names.add(name);return {k:'let',name,value,body,mutable:false,type:body.type};}
 function conditional(node,yes,no){if(node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustOwnership||!sameType(yes.type,no.type))fail('actual bool condition and identical continuation result required');return {k:'if',cond:node.cond,then:yes,else:no,type:yes.type,span:node.span};}
 function lower(node,next=null,depth=0){
  charge(depth);if(!node||typeof node!=='object')fail('complete original native control node required');
  if(node.k==='routerReturn'){if(!unit(node.body)||!sameType(node.value?.type,declaration.ret))fail('explicit function return requires the actual result and neutral unreachable tail');return node.value;}
  if(node.k==='routerIf'){
   const yesTerminal=terminal(node.then,depth+1),noTerminal=terminal(node.else,depth+1);if(!yesTerminal&&!noTerminal)fail('statement if requires a genuine terminating branch');
   if(yesTerminal&&noTerminal){if(!unit(node.body))fail('both returning branches require a neutral unreachable continuation');return conditional(node,lower(node.then,null,depth+1),lower(node.else,null,depth+1));}
   const continuation=lower(node.body,next,depth+1);return conditional(node,lower(node.then,continuation,depth+1),lower(node.else,continuation,depth+1));
  }
  if(node.k==='let'){const body=lower(node.body,next,depth+1);return body===node.body?node:{...node,body,type:body.type};}
  if(node.k==='routerDiscard'){if(node.value?.type?.kind!=='unit')fail('discarded nonunit native values need their own effect rule');return discarded(node.value,lower(node.body,next,depth+1));}
  if(node.k==='if')return conditional(node,lower(node.then,next,depth+1),lower(node.else,next,depth+1));
  if(next!==null){if(unit(node))return next;if(validation(node))return discarded(node,next);fail('statement branch continuation requires neutral unit or qualified validation');}
  return node;
 }
 try{collect(declaration.body);const body=lower(declaration.body);return body===declaration.body?declaration:{...declaration,body};}finally{names.clear();}
}
import {sameType} from '../checked-types.mjs';
