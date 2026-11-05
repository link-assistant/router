import {lowerOrderedScalarHelperStatements20261103 as previousOrderedRule} from './ordered-scalar-helper-statements-20261103.mjs';
function needsEarlyScalarFlow(fn){
 const pending=[{value:fn,depth:0}],seen=new Set();let cells=0;
 while(pending.length){const {value,depth}=pending.pop();if(++cells>100000||depth>160)throw TypeError('Ordered scalar helper: original complete expanded helper work bound');if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
  if(Array.isArray(value)){for(let at=0;at<value.length;at++){const row=value[at];if(row?.kind==='if'&&(at!==value.length-1||!row.then?.length||!row.else?.length))return true;pending.push({value:row,depth:depth+1});}continue;}
  for(const key of ['params','body','value','cond','then','else','left','right','args','helper'])if(value[key]&&typeof value[key]==='object')pending.push({value:value[key],depth:depth+1});
 }return false;
}
// Ordered scalar helper expansion DATA. Actual private native declarations,
// complete source/type/body and import checks are required before this rule.
// It emits existing let/if/return IR, never executable permission or new opcodes.
import {createRulePipeline} from './rule-pipeline.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {ownedPrimitiveOperatorCallMetadata} from './js-to-rust/owned-primitive-operator-emission.mjs';
import {narrowOwnedNumericLiteral} from './js-to-rust/owned-numeric-literals.mjs';
const fail=message=>{throw TypeError('Ordered scalar helper: '+message);};
const scalar=type=>type==='bool'||primitiveBitwiseType(type)!==null;
const primitives=new Set(['primitive-arithmetic-call','primitive-method-call','primitive-not-call','primitive-cast-call','primitive-shift-call','primitive-bitwise-call']);
export function lowerOrderedScalarEarlyReturnStatements20261104(fn,charge){
 if(!needsEarlyScalarFlow(fn))return previousOrderedRule(fn,charge);
 let cells=0,next=0;const used=new Set(),helperUses=[],roots=new Set();
 const tick=depth=>{if(++cells>100000||depth>160)fail('original complete expanded helper work bound');charge(depth);};
 function name(value){if(typeof value!=='string'||!value.length)fail('actual scalar identifier required');used.add(value);return value;}
 // Reserve every original binding before allocation. Source text and receipt
 // objects are not traversed; no source metadata supplies compiler permission.
 function reserve(){
  const pending=[{value:fn,depth:0}],seen=new Set();
  while(pending.length){const {value,depth}=pending.pop();tick(depth);if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
   if(Array.isArray(value)){for(const child of value)pending.push({value:child,depth:depth+1});continue;}
   if(typeof value.name==='string')name(value.name);if(Array.isArray(value.params)&&Array.isArray(value.body))roots.add(value.body);
   for(const key of ['params','body','value','cond','then','else','left','right','args','helper'])if(value[key]&&typeof value[key]==='object')pending.push({value:value[key],depth:depth+1});
  }
 }
 const fresh=()=>{let value;do{tick(0);value='router_inline_'+next++;}while(used.has(value));used.add(value);return value;};
 const variable=(name,type)=>({kind:'variable',name,type,root:null});
 const literal=value=>({kind:'bool',value,type:'bool',root:null});
 function checkScalar(row){if(!row||row.root!==null||!scalar(row.type))fail('actual root-free Boolean/native integer required');}
 // Lazy links avoid recursive continuation execution and quadratic array
 // concatenation for long flat statement/argument lists.
 function link(statement,next=null){return {kind:'link',statement,next};}
 function fork(cond,yes,no){return {kind:'fork',cond,yes,no};}
 function bind(value,continuation,depth){tick(depth);const local=fresh();return link({kind:'let',name:local,value},()=>continuation(variable(local,value.type)));}
 function operands(rows,scope,continuation,depth,active,at=0,values=null){
  tick(depth);if(!Array.isArray(rows))fail('complete eager argument array required');
  if(at===rows.length){const result=[];for(let item=values;item;item=item.previous){tick(depth);result.push(item.value);}result.reverse();return continuation(result);}
  return expression(rows[at],scope,value=>bind(value,bound=>operands(rows,scope,continuation,depth,active,at+1,{value:bound,previous:values}),depth+1),depth+1,active);
 }
 function expression(row,scope,continuation,depth,active){
  tick(depth);checkScalar(row);
  if(row.kind==='variable'){const value=scope.get(row.name);if(!value||value.type!==row.type)fail('capture, moved, unbound or differently typed scalar');return continuation({...value});}
  if(row.kind==='bool'){if(row.type!=='bool'||typeof row.value!=='boolean')fail('actual Boolean literal required');return continuation({...row});}
  if(row.kind==='integer'){if(!primitiveBitwiseType(row.type))fail('actual fixed native integer domain required');const value={...row};narrowOwnedNumericLiteral(value,row.type);if(BigInt(value.value).toString()!==value.value)fail('canonical native integer required');return continuation(value);}
  if(row.kind==='not')return expression(row.value,scope,value=>{if(row.type!=='bool'||value.type!=='bool')fail('Boolean negation domain differs');return bind({...row,value},continuation,depth+1);},depth+1,active);
  if(row.kind==='choose')return expression(row.cond,scope,cond=>{
   if(cond.type!=='bool')fail('actual Boolean choice condition required');
   const branch=value=>{if(value.type!==row.type)fail('actual choice result differs');return continuation(value);};
   return fork(cond,()=>expression(row.then,new Map(scope),branch,depth+1,active),()=>expression(row.else,new Map(scope),branch,depth+1,active));
  },depth+1,active);
  if(row.kind==='binary'){
   if(row.type!=='bool')fail('actual logical/comparison Boolean result required');
   if(row.op==='&&'||row.op==='||')return expression(row.left,scope,left=>{
    if(left.type!=='bool')fail('actual Boolean left operand required');const right=()=>expression(row.right,new Map(scope),value=>{if(value.type!=='bool')fail('actual Boolean right operand required');return continuation(value);},depth+1,active);
    return fork(left,()=>row.op==='&&'?right():continuation(literal(true)),()=>row.op==='&&'?continuation(literal(false)):right());
   },depth+1,active);
   if(!['===','!==','<','<=','>','>='].includes(row.op))fail('unregistered direct scalar operator');
   return operands([row.left,row.right],scope,args=>{if(args[0].type!==args[1].type||['<','<=','>','>='].includes(row.op)&&!primitiveBitwiseType(args[0].type))fail('actual comparison domains differ');return bind({...row,left:args[0],right:args[1]},continuation,depth+1);},depth+1,active);
  }
  if(primitives.has(row.kind))return operands(row.args,scope,args=>{
   const value={...row,args};
   if(row.kind==='primitive-bitwise-call'){
    const domain=primitiveBitwiseType(row.type);if(row.name!=='primitiveBitwise'||!['&','|','^'].includes(row.operation)||args.length!==2||args.some(arg=>arg.type!==row.type)||(domain?row.bits!==domain.bits||row.signed!==domain.signed:row.type!=='bool'||row.bits!==undefined||row.signed!==undefined))fail('actual eager bitwise metadata differs');
   }else ownedPrimitiveOperatorCallMetadata(value);
   // Keep even unused potentially failing operations in an eager let.
   return bind(value,continuation,depth+1);
  },depth+1,active);
  if(row.kind==='ordered-scalar-helper-call'){
   const helper=row.helper;if(!helper||!Array.isArray(helper.params)||!scalar(helper.returns)||helper.returns!==row.type||!Array.isArray(row.args)||row.args.length!==helper.params.length||helper.params.some(param=>!scalar(param.type)))fail('complete actual scalar helper signature/arity required');
   return operands(row.args,scope,args=>{
    if(active.has(helper))fail('recursive helpers need their separate call-graph rule');const entered=new Set(active);entered.add(helper);const bindings=new Map();
    for(let at=0;at<helper.params.length;at++){const param=helper.params[at];if(bindings.has(param.name)||args[at].type!==param.type)fail('unique actual helper parameter/domain required');bindings.set(param.name,args[at]);}
    helperUses.push(helper);
    return statements(helper.body,bindings,helper.returns,continuation,depth+1,entered);
   },depth+1,active);
  }
  fail('ownership, unknown effects or unsupported expression requires a separate rule');
 }
 // Invocation-local syntax metadata only, never source/owner/body permission.
 // Flat initializers keep one scope Map; a branching initializer gets a
 // separate copy for every continuation, avoiding cross-branch capture.
 const forks=new WeakMap();
 function mayFork(root){
  if(forks.has(root))return forks.get(root);const pending=[{value:root,depth:0}],seen=new Set();
  while(pending.length){const {value,depth}=pending.pop();tick(depth);if(!value||typeof value!=='object'||seen.has(value))continue;if(forks.has(value)){if(forks.get(value)){forks.set(root,true);return true;}continue;}seen.add(value);
   if(value.kind==='if'||value.kind==='choose'||value.kind==='binary'&&['&&','||'].includes(value.op)){forks.set(root,true);return true;}
   if(Array.isArray(value)){for(const child of value)pending.push({value:child,depth:depth+1});continue;}
   for(const key of ['body','value','cond','then','else','left','right','args','helper'])if(value[key]&&typeof value[key]==='object')pending.push({value:value[key],depth:depth+1});
  }for(const item of seen)forks.set(item,false);return false;
 }
 function validateFlow(){
  const complete=new Map(),active=new Set();
  for(const root of roots){const pending=[{body:root,depth:0,finish:false}];
   while(pending.length){const job=pending.pop();tick(job.depth);if(complete.has(job.body))continue;if(!Array.isArray(job.body))fail('complete native branch arrays required');
    if(!job.finish){if(active.has(job.body))fail('cyclic scalar statement structure');active.add(job.body);pending.push({...job,finish:true});for(const statement of job.body)if(statement.kind==='if'){pending.push({body:statement.else,depth:job.depth+1,finish:false},{body:statement.then,depth:job.depth+1,finish:false});}continue;}
    let terminated=false;for(const statement of job.body){tick(job.depth);if(terminated)fail('statements follow a terminating return tree');if(statement.kind==='return')terminated=true;else if(statement.kind==='if')terminated=complete.get(statement.then)===true&&complete.get(statement.else)===true;else if(statement.kind!=='let')fail('assignment, loop or unsupported scalar statement');}
    active.delete(job.body);complete.set(job.body,terminated);
   }if(complete.get(root)!==true)fail('complete caller/helper return on every path required');
  }
 }
 function statements(body,parent,returns,continuation,depth,active,at=0,fallthrough=null){
  tick(depth);if(!Array.isArray(body))fail('complete scalar statement array required');if(at>=body.length){if(fallthrough)return fallthrough();fail('complete terminating scalar block required');}const scope=at===0?new Map(parent):parent,statement=body[at];
  if(statement.kind==='let'){
   if(typeof statement.name!=='string'||scope.has(statement.name))fail('duplicate/shadowed scalar binding');const branched=mayFork(statement.value);
   return expression(statement.value,scope,value=>{const local=fresh(),after=branched?new Map(scope):scope;after.set(statement.name,variable(local,value.type));return link({kind:'let',name:local,value},()=>statements(body,after,returns,continuation,depth,active,at+1,fallthrough));},depth+1,active);
  }
  if(statement.kind==='return'){if(at!==body.length-1)fail('statements follow a terminating return tree');return expression(statement.value,scope,value=>{if(value.type!==returns)fail('actual complete helper/caller return domain differs');return continuation(value);},depth+1,active);}
  if(statement.kind==='if')return expression(statement.cond,scope,cond=>{
   if(cond.type!=='bool')fail('actual branch Boolean condition required');
   // Branch locals stay in that branch. Each fallthrough starts from a fresh
   // copy of the enclosing scope, never another arm's later declarations.
   const tail=()=>statements(body,new Map(scope),returns,continuation,depth,active,at+1,fallthrough);
   return fork(cond,()=>statements(statement.then,new Map(scope),returns,continuation,depth+1,active,0,tail),()=>statements(statement.else,new Map(scope),returns,continuation,depth+1,active,0,tail));
  },depth+1,active);
  fail('assignment, loop or unsupported scalar statement');
 }
 function materialize(initial){
  const body=[],pending=[{plan:initial,output:body,depth:0}];
  while(pending.length){const current=pending.pop();let plan=current.plan();tick(current.depth);
   while(plan?.kind==='link'){tick(current.depth);current.output.push(plan.statement);if(plan.next===null){if(plan.statement.kind!=='return')fail('expanded block lost its complete return');plan=null;break;}plan=plan.next();}
   if(plan===null)continue;if(plan?.kind!=='fork')fail('unknown ordered continuation plan');
   const branch={kind:'if',cond:plan.cond,then:[],else:[]};current.output.push(branch);pending.push({plan:plan.no,output:branch.else,depth:current.depth+1},{plan:plan.yes,output:branch.then,depth:current.depth+1});
  }return body;
 }
 return createRulePipeline([
  {phase:'language',rules:[{id:'language:reserve-original-bindings-and-keep-eager-call-return-order',apply:()=>{
   if(!fn||!Array.isArray(fn.params)||!scalar(fn.returns))fail('complete original scalar caller required');reserve();validateFlow();const scope=new Map();for(const param of fn.params){if(!scalar(param.type)||scope.has(param.name))fail('unique actual scalar caller parameters required');scope.set(name(param.name),variable(param.name,param.type));}
   return materialize(()=>statements(fn.body,scope,fn.returns,value=>link({kind:'return',value}),0,new Set()));
  }}]},
  {phase:'repository',rules:[{id:'repository:emit-existing-immutable-let-if-return-IR-with-fresh-names',apply:body=>({body,helperUses,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'})}]},
 ]).run(null).value;
}
