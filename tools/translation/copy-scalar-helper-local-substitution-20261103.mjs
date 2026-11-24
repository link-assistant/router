// Pure local-binding normalization DATA. The original private whole helper,
// source, namespace and type checks remain prerequisites at every use.
import {createRulePipeline} from './rule-pipeline.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {substituteCopyScalarHelperExpression20261103} from './copy-scalar-helper-substitution-20261103.mjs';
import {narrowOwnedNumericLiteral} from './js-to-rust/owned-numeric-literals.mjs';
const fail=message=>{throw TypeError('Scalar helper locals: '+message);};
const scalar=type=>type==='bool'||primitiveBitwiseType(type)!==null;
function containsLocal(body){
 const pending=[{body,depth:0}];let cells=0;
 while(pending.length){const current=pending.pop();if(current.depth>160||!Array.isArray(current.body))fail('bounded original helper blocks required');for(const statement of current.body){if(++cells>100000)fail('original complete helper work bound');if(statement.kind==='let')return true;if(statement.kind==='if')pending.push({body:statement.then,depth:current.depth+1},{body:statement.else,depth:current.depth+1});}}
 return false;
}
export function substituteCopyScalarHelperLocalExpression20261103(helper,args,charge){
 // Preserve every previously accepted return-tree path and its original work,
 // errors and ordering. The new sequence is selected only for a local binding.
 if(!containsLocal(helper.body))return substituteCopyScalarHelperExpression20261103(helper,args,charge);
 if(!scalar(helper.returns)||helper.params.some(row=>!scalar(row.type))||helper.hostCalls.length||helper.sourceCalls?.length)fail('complete pure Copy helper required');
 let cells=0;const tick=depth=>{if(++cells>100000||depth>160)fail('original complete expanded helper work bound');charge(depth);};
 const parameters=new Map();for(const param of helper.params){if(parameters.has(param.name))fail('duplicate original parameter');parameters.set(param.name,{kind:'variable',name:param.name,type:param.type,root:null});}
 // Stored expressions contain helper parameter names only. Cloning an already
 // resolved term never treats a caller/parameter name as a new local lookup.
 function expression(row,scope,depth=0,resolved=false){
  tick(depth);if(!row||row.root!==null||!scalar(row.type))fail('actual root-free scalar local initializer required');
  if(row.kind==='variable'){
   if(resolved){if(parameters.get(row.name)?.type!==row.type)fail('resolved term contains a nonparameter capture');return {...row};}
   const value=scope.get(row.name);if(!value||value.type!==row.type)fail('unresolved, forward, shadowed or differently typed local');
   if(value.kind==='variable')return {...value};return expression(value,scope,depth+1,true);
  }
  if(row.kind==='bool'){if(row.type!=='bool'||typeof row.value!=='boolean')fail('actual Boolean literal required');return {...row};}
  if(row.kind==='integer'){if(!primitiveBitwiseType(row.type))fail('actual native literal domain required');const value={...row};narrowOwnedNumericLiteral(value,row.type);if(BigInt(value.value).toString()!==value.value)fail('canonical native integer required');return value;}
  if(row.kind==='not'){const value=expression(row.value,scope,depth+1,resolved);if(row.type!=='bool'||value.type!=='bool')fail('actual Boolean negation required');return {...row,value};}
  if(row.kind==='binary'){
   const left=expression(row.left,scope,depth+1,resolved),right=expression(row.right,scope,depth+1,resolved);
   if(row.type!=='bool'||left.type!==right.type)fail('actual comparison/logical domains differ');
   if(['&&','||'].includes(row.op)){if(left.type!=='bool')fail('actual Boolean operands required');}
   else if(['<','<=','>','>='].includes(row.op)){if(!primitiveBitwiseType(left.type))fail('actual native ordered operands required');}
   else if(!['===','!=='].includes(row.op))fail('unsupported local operator');return {...row,left,right};
  }
  if(row.kind==='choose'){
   const cond=expression(row.cond,scope,depth+1,resolved),yes=expression(row.then,scope,depth+1,resolved),no=expression(row.else,scope,depth+1,resolved);
   if(cond.type!=='bool'||yes.type!==row.type||no.type!==row.type)fail('actual local choice domains differ');return {...row,cond,then:yes,else:no};
  }
  fail('effects, arithmetic, ownership and unsupported local operations require separate rules');
 }
 function block(body,parent,depth=0){
  tick(depth);if(!Array.isArray(body)||!body.length)fail('complete returning helper block required');const scope=new Map(parent);
  for(let at=0;at<body.length;at++){
   tick(depth+1);const statement=body[at];
   if(statement.kind==='let'){
    if(typeof statement.name!=='string'||scope.has(statement.name))fail('duplicate or shadowed original local');
    const value=expression(statement.value,scope,depth+1);scope.set(statement.name,value);continue;
   }
   if(at!==body.length-1)fail('statements after a terminating return tree');
   if(statement.kind==='return')return expression(statement.value,scope,depth+1);
   if(statement.kind==='if'){
    const cond=expression(statement.cond,scope,depth+1),yes=block(statement.then,scope,depth+1),no=block(statement.else,scope,depth+1);
    if(cond.type!=='bool'||yes.type!==helper.returns||no.type!==helper.returns)fail('whole local return-tree domains differ');return {kind:'choose',cond,then:yes,else:no,type:helper.returns,root:null};
   }
   fail('assignment, partial return or unsupported helper statement');
  }
  fail('helper locals have no complete return');
 }
 return createRulePipeline([
  {phase:'language',rules:[
   {id:'language:resolve-ordered-scalar-locals-with-separate-branch-environments',apply:()=>{const value=block(helper.body,parameters);if(value.type!==helper.returns)fail('actual local helper return differs');return {...helper,body:[{kind:'return',value}]};}},
   {id:'language:substitute-original-checked-scalar-helper-operands',apply:normalized=>substituteCopyScalarHelperExpression20261103(normalized,args,tick)},
  ]},
  {phase:'repository',rules:[{id:'repository:retain-caller-binding-hygiene-and-original-expression-IR',apply:value=>value}]},
 ]).run(null).value;
}
