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
     if(!target||!['primitive-scalar','primitive-expression-vector'].includes(target.unit.kind)||target.unit.returns!=='bool'&&!primitiveBitwiseType(target.unit.returns)&&!((row.unit.kind==='primitive-expression-vector'||row.unit.kind==='primitive-scalar'&&row.unit.vectorLocals===true)&&target.unit.kind==='primitive-expression-vector'&&primitiveVectorResultRole(target.unit.returns))||target.unit.parameters.length!==call.arity)fail('complete same-module primitive helper source is absent');
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

import {primitiveVectorResultRole} from './owned-source-value-calls.mjs';
